use actix_web::{web, HttpRequest, HttpResponse, Result, Error};
use actix_ws::{MessageStream, Session, Message};
use futures_util::stream::StreamExt;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{RwLock, mpsc};
use tracing::{info, warn, error};
use uuid::Uuid;
use chrono::{DateTime, Utc};

/// WebSocket message types for real-time chat
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum WSMessage {
    /// Client authentication
    Auth {
        token: String,
    },
    
    /// Join a conversation room
    JoinRoom {
        conversation_id: String,
    },
    
    /// Leave a conversation room
    LeaveRoom {
        conversation_id: String,
    },
    
    /// Send a chat message
    SendMessage {
        conversation_id: String,
        content: String,
        message_type: String,
    },
    
    /// New message received
    NewMessage {
        id: String,
        conversation_id: String,
        sender: UserInfo,
        content: String,
        message_type: String,
        timestamp: DateTime<Utc>,
    },
    
    /// User typing indicator
    Typing {
        conversation_id: String,
        user_id: String,
        is_typing: bool,
    },
    
    /// User joined/left room
    UserPresence {
        conversation_id: String,
        user: UserInfo,
        action: String,
    },
    
    /// Error message
    Error {
        message: String,
        code: Option<String>,
    },
    
    /// Success acknowledgment
    Ack {
        request_id: Option<String>,
        message: String,
    },
    
    /// Ping/Pong for heartbeat
    Ping {
        timestamp: DateTime<Utc>,
    },
    
    Pong {
        timestamp: DateTime<Utc>,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserInfo {
    pub id: String,
    pub name: String,
    pub email: String,
    pub role: String,
}

/// Commands to send to connections
#[derive(Debug, Clone)]
pub enum WSCommand {
    SendMessage {
        message: WSMessage,
    },
    Close,
}

/// Connection info with sender channel
#[derive(Debug, Clone)]
struct ConnectionInfo {
    user: Option<UserInfo>,
    connected_at: DateTime<Utc>,
    current_rooms: Vec<String>,
    sender: mpsc::UnboundedSender<WSCommand>,
}

/// Improved connection manager with message broadcasting
#[derive(Clone)]
pub struct ConnectionManager {
    connections: Arc<RwLock<HashMap<String, ConnectionInfo>>>,
    rooms: Arc<RwLock<HashMap<String, Vec<String>>>>, // conversation_id -> connection_ids
}

impl ConnectionManager {
    pub fn new() -> Self {
        Self {
            connections: Arc::new(RwLock::new(HashMap::new())),
            rooms: Arc::new(RwLock::new(HashMap::new())),
        }
    }
    
    pub async fn add_connection(&self, connection_id: String, sender: mpsc::UnboundedSender<WSCommand>) {
        let mut connections = self.connections.write().await;
        connections.insert(connection_id.clone(), ConnectionInfo {
            user: None,
            connected_at: Utc::now(),
            current_rooms: Vec::new(),
            sender,
        });
        info!("Connection {} added", connection_id);
    }
    
    pub async fn remove_connection(&self, connection_id: &str) {
        let mut connections = self.connections.write().await;
        if let Some(conn_info) = connections.remove(connection_id) {
            // Remove from all rooms
            let mut rooms = self.rooms.write().await;
            for room_id in &conn_info.current_rooms {
                if let Some(room_connections) = rooms.get_mut(room_id) {
                    room_connections.retain(|id| id != connection_id);
                    if room_connections.is_empty() {
                        rooms.remove(room_id);
                    }
                }
            }
            info!("Connection {} removed", connection_id);
        }
    }
    
    pub async fn authenticate_connection(&self, connection_id: &str, user: UserInfo) {
        let mut connections = self.connections.write().await;
        if let Some(conn_info) = connections.get_mut(connection_id) {
            conn_info.user = Some(user.clone());
            info!("Connection {} authenticated as user {}", connection_id, user.name);
        }
    }
    
    pub async fn join_room(&self, connection_id: &str, room_id: &str) -> bool {
        let mut connections = self.connections.write().await;
        let mut rooms = self.rooms.write().await;
        
        if let Some(conn_info) = connections.get_mut(connection_id) {
            if !conn_info.current_rooms.contains(&room_id.to_string()) {
                conn_info.current_rooms.push(room_id.to_string());
                
                rooms.entry(room_id.to_string())
                    .or_insert_with(Vec::new)
                    .push(connection_id.to_string());
                
                info!("Connection {} joined room {}", connection_id, room_id);
                return true;
            }
        }
        false
    }
    
    pub async fn leave_room(&self, connection_id: &str, room_id: &str) -> bool {
        let mut connections = self.connections.write().await;
        let mut rooms = self.rooms.write().await;
        
        if let Some(conn_info) = connections.get_mut(connection_id) {
            conn_info.current_rooms.retain(|id| id != room_id);
            
            if let Some(room_connections) = rooms.get_mut(room_id) {
                room_connections.retain(|id| id != connection_id);
                if room_connections.is_empty() {
                    rooms.remove(room_id);
                }
                info!("Connection {} left room {}", connection_id, room_id);
                return true;
            }
        }
        false
    }
    
    pub async fn get_connection_user(&self, connection_id: &str) -> Option<UserInfo> {
        let connections = self.connections.read().await;
        connections.get(connection_id)?.user.clone()
    }
    
    pub async fn broadcast_to_room(&self, room_id: &str, message: WSMessage, exclude_connection: Option<&str>) {
        let rooms = self.rooms.read().await;
        let connections = self.connections.read().await;
        
        if let Some(room_connections) = rooms.get(room_id) {
            info!("Broadcasting to room {} ({} connections)", room_id, room_connections.len());
            
            for conn_id in room_connections {
                if Some(conn_id.as_str()) == exclude_connection {
                    continue;
                }
                
                if let Some(conn_info) = connections.get(conn_id) {
                    let cmd = WSCommand::SendMessage {
                        message: message.clone(),
                    };
                    
                    if let Err(e) = conn_info.sender.send(cmd) {
                        error!("Failed to send message to connection {}: {}", conn_id, e);
                    }
                }
            }
        }
    }
    
    pub async fn send_to_connection(&self, connection_id: &str, message: WSMessage) {
        let connections = self.connections.read().await;
        
        if let Some(conn_info) = connections.get(connection_id) {
            let cmd = WSCommand::SendMessage { message };
            
            if let Err(e) = conn_info.sender.send(cmd) {
                error!("Failed to send message to connection {}: {}", connection_id, e);
            }
        }
    }
    
    pub async fn get_stats(&self) -> (usize, usize) {
        let connections = self.connections.read().await;
        let rooms = self.rooms.read().await;
        (connections.len(), rooms.len())
    }
}

/// WebSocket handler
pub async fn websocket_handler(
    req: HttpRequest,
    stream: web::Payload,
    manager: web::Data<ConnectionManager>,
) -> Result<HttpResponse, Error> {
    let connection_id = Uuid::new_v4().to_string();
    
    info!("New WebSocket connection attempt: {}", connection_id);
    
    let (response, session, msg_stream) = actix_ws::handle(&req, stream)?;
    
    // Create channel for sending messages to this connection
    let (tx, mut rx) = mpsc::unbounded_channel::<WSCommand>();
    
    // Add connection to manager
    manager.add_connection(connection_id.clone(), tx).await;
    
    // Spawn task to handle this connection
    let manager_clone = manager.get_ref().clone();
    actix_web::rt::spawn(handle_connection(
        connection_id.clone(),
        session,
        msg_stream,
        rx,
        manager_clone,
    ));
    
    info!("WebSocket connection established: {}", connection_id);
    Ok(response)
}

async fn handle_connection(
    connection_id: String,
    mut session: Session,
    mut msg_stream: MessageStream,
    mut command_rx: mpsc::UnboundedReceiver<WSCommand>,
    manager: ConnectionManager,
) {
    info!("Starting WebSocket handler for connection: {}", connection_id);
    
    // Send welcome message
    let welcome = WSMessage::Ack {
        request_id: None,
        message: format!("Connected successfully. Connection ID: {}", connection_id),
    };
    
    if let Err(e) = send_message(&mut session, &welcome).await {
        error!("Failed to send welcome message: {}", e);
        return;
    }
    
    // Main event loop
    loop {
        tokio::select! {
            // Handle incoming WebSocket messages
            Some(msg) = msg_stream.next() => {
                match msg {
                    Ok(Message::Text(text)) => {
                        match serde_json::from_str::<WSMessage>(&text) {
                            Ok(ws_message) => {
                                if let Err(e) = handle_ws_message(
                                    &connection_id,
                                    ws_message,
                                    &manager,
                                ).await {
                                    error!("Error handling WebSocket message: {}", e);
                                    let error_msg = WSMessage::Error {
                                        message: format!("Error processing message: {}", e),
                                        code: Some("PROCESSING_ERROR".to_string()),
                                    };
                                    manager.send_to_connection(&connection_id, error_msg).await;
                                }
                            }
                            Err(e) => {
                                warn!("Failed to parse WebSocket message: {} - {}", e, text);
                                let error_msg = WSMessage::Error {
                                    message: "Invalid message format".to_string(),
                                    code: Some("INVALID_JSON".to_string()),
                                };
                                let _ = send_message(&mut session, &error_msg).await;
                            }
                        }
                    }
                    Ok(Message::Close(reason)) => {
                        info!("WebSocket connection closed: {} - {:?}", connection_id, reason);
                        break;
                    }
                    Ok(Message::Ping(bytes)) => {
                        info!("Received ping from {}", connection_id);
                        if let Err(e) = session.pong(&bytes).await {
                            error!("Failed to send pong: {}", e);
                            break;
                        }
                    }
                    Ok(Message::Pong(_)) => {
                        info!("Received pong from {}", connection_id);
                    }
                    Err(e) => {
                        error!("WebSocket error for connection {}: {}", connection_id, e);
                        break;
                    }
                    _ => {
                        warn!("Unhandled WebSocket message type for connection: {}", connection_id);
                    }
                }
            }
            
            // Handle commands from the manager
            Some(cmd) = command_rx.recv() => {
                match cmd {
                    WSCommand::SendMessage { message } => {
                        if let Err(e) = send_message(&mut session, &message).await {
                            error!("Failed to send message to {}: {}", connection_id, e);
                            break;
                        }
                    }
                    WSCommand::Close => {
                        info!("Closing connection {} by command", connection_id);
                        break;
                    }
                }
            }
            
            // Both channels closed
            else => {
                info!("Connection {} channels closed", connection_id);
                break;
            }
        }
    }
    
    // Cleanup connection
    manager.remove_connection(&connection_id).await;
    info!("WebSocket connection handler finished: {}", connection_id);
}

async fn handle_ws_message(
    connection_id: &str,
    message: WSMessage,
    manager: &ConnectionManager,
) -> Result<(), Box<dyn std::error::Error>> {
    match message {
        WSMessage::Auth { token: _ } => {
            info!("Authentication attempt for connection: {}", connection_id);
            
            // Mock user info (in real implementation, decode JWT)
            let user = UserInfo {
                id: format!("user_{}", Uuid::new_v4()),
                name: format!("User {}", &connection_id[..8]),
                email: format!("user_{}@pytake.com", &connection_id[..8]),
                role: "agent".to_string(),
            };
            
            manager.authenticate_connection(connection_id, user.clone()).await;
            
            let ack = WSMessage::Ack {
                request_id: None,
                message: format!("Authenticated as {}", user.name),
            };
            manager.send_to_connection(connection_id, ack).await;
        }
        
        WSMessage::JoinRoom { conversation_id } => {
            info!("Connection {} joining room {}", connection_id, conversation_id);
            
            if manager.join_room(connection_id, &conversation_id).await {
                let user = manager.get_connection_user(connection_id).await;
                
                // Notify room about new user
                if let Some(user_info) = user {
                    let presence_msg = WSMessage::UserPresence {
                        conversation_id: conversation_id.clone(),
                        user: user_info,
                        action: "joined".to_string(),
                    };
                    manager.broadcast_to_room(&conversation_id, presence_msg, Some(connection_id)).await;
                }
                
                let ack = WSMessage::Ack {
                    request_id: None,
                    message: format!("Joined room {}", conversation_id),
                };
                manager.send_to_connection(connection_id, ack).await;
            }
        }
        
        WSMessage::LeaveRoom { conversation_id } => {
            info!("Connection {} leaving room {}", connection_id, conversation_id);
            
            let user = manager.get_connection_user(connection_id).await;
            
            if manager.leave_room(connection_id, &conversation_id).await {
                // Notify room about user leaving
                if let Some(user_info) = user {
                    let presence_msg = WSMessage::UserPresence {
                        conversation_id: conversation_id.clone(),
                        user: user_info,
                        action: "left".to_string(),
                    };
                    manager.broadcast_to_room(&conversation_id, presence_msg, Some(connection_id)).await;
                }
                
                let ack = WSMessage::Ack {
                    request_id: None,
                    message: format!("Left room {}", conversation_id),
                };
                manager.send_to_connection(connection_id, ack).await;
            }
        }
        
        WSMessage::SendMessage { conversation_id, content, message_type } => {
            info!("Message from connection {} to room {}: {}", connection_id, conversation_id, content);
            
            if let Some(user) = manager.get_connection_user(connection_id).await {
                let new_message = WSMessage::NewMessage {
                    id: Uuid::new_v4().to_string(),
                    conversation_id: conversation_id.clone(),
                    sender: user,
                    content,
                    message_type,
                    timestamp: Utc::now(),
                };
                
                // Broadcast to all connections in the room (including sender)
                manager.broadcast_to_room(&conversation_id, new_message, None).await;
            } else {
                let error_msg = WSMessage::Error {
                    message: "Must authenticate before sending messages".to_string(),
                    code: Some("UNAUTHENTICATED".to_string()),
                };
                manager.send_to_connection(connection_id, error_msg).await;
            }
        }
        
        WSMessage::Typing { conversation_id, user_id, is_typing } => {
            info!("Typing indicator from {}: {} in room {}", user_id, is_typing, conversation_id);
            
            let typing_msg = WSMessage::Typing {
                conversation_id: conversation_id.clone(),
                user_id,
                is_typing,
            };
            
            // Broadcast typing indicator to room (excluding sender)
            manager.broadcast_to_room(&conversation_id, typing_msg, Some(connection_id)).await;
        }
        
        WSMessage::Ping { .. } => {
            let pong = WSMessage::Pong {
                timestamp: Utc::now(),
            };
            manager.send_to_connection(connection_id, pong).await;
        }
        
        _ => {
            warn!("Unhandled WebSocket message type from connection: {}", connection_id);
        }
    }
    
    Ok(())
}

async fn send_message(
    session: &mut Session,
    message: &WSMessage,
) -> Result<(), Box<dyn std::error::Error>> {
    let json = serde_json::to_string(message)?;
    session.text(json).await?;
    Ok(())
}

/// WebSocket stats endpoint
pub async fn websocket_stats(
    manager: web::Data<ConnectionManager>,
) -> Result<HttpResponse> {
    let (connections, rooms) = manager.get_stats().await;
    
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "active_connections": connections,
        "active_rooms": rooms,
        "timestamp": Utc::now(),
    })))
}