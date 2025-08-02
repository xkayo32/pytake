use actix_web::{web, HttpRequest, HttpResponse, Result, Error};
use actix_ws::{MessageStream, Session};
use futures_util::{sink::SinkExt, stream::StreamExt};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
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
        message_type: String, // "text", "image", etc.
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
        action: String, // "joined" or "left"
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

/// Connection manager to track active WebSocket connections
#[derive(Clone)]
pub struct ConnectionManager {
    connections: Arc<Mutex<HashMap<String, ConnectionInfo>>>,
    rooms: Arc<Mutex<HashMap<String, Vec<String>>>>, // conversation_id -> connection_ids
}

#[derive(Debug, Clone)]
struct ConnectionInfo {
    user: Option<UserInfo>,
    connected_at: DateTime<Utc>,
    current_rooms: Vec<String>,
}

impl ConnectionManager {
    pub fn new() -> Self {
        Self {
            connections: Arc::new(Mutex::new(HashMap::new())),
            rooms: Arc::new(Mutex::new(HashMap::new())),
        }
    }
    
    pub fn add_connection(&self, connection_id: String) {
        let mut connections = self.connections.lock().unwrap();
        connections.insert(connection_id.clone(), ConnectionInfo {
            user: None,
            connected_at: Utc::now(),
            current_rooms: Vec::new(),
        });
        info!("Connection {} added", connection_id);
    }
    
    pub fn remove_connection(&self, connection_id: &str) {
        let mut connections = self.connections.lock().unwrap();
        if let Some(conn_info) = connections.remove(connection_id) {
            // Remove from all rooms
            let mut rooms = self.rooms.lock().unwrap();
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
    
    pub fn authenticate_connection(&self, connection_id: &str, user: UserInfo) {
        let mut connections = self.connections.lock().unwrap();
        if let Some(conn_info) = connections.get_mut(connection_id) {
            conn_info.user = Some(user.clone());
            info!("Connection {} authenticated as user {}", connection_id, user.name);
        }
    }
    
    pub fn join_room(&self, connection_id: &str, room_id: &str) -> bool {
        let mut connections = self.connections.lock().unwrap();
        let mut rooms = self.rooms.lock().unwrap();
        
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
    
    pub fn leave_room(&self, connection_id: &str, room_id: &str) -> bool {
        let mut connections = self.connections.lock().unwrap();
        let mut rooms = self.rooms.lock().unwrap();
        
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
    
    pub fn get_room_connections(&self, room_id: &str) -> Vec<String> {
        let rooms = self.rooms.lock().unwrap();
        rooms.get(room_id).cloned().unwrap_or_default()
    }
    
    pub fn get_connection_user(&self, connection_id: &str) -> Option<UserInfo> {
        let connections = self.connections.lock().unwrap();
        connections.get(connection_id)?.user.clone()
    }
    
    pub fn get_stats(&self) -> (usize, usize) {
        let connections = self.connections.lock().unwrap();
        let rooms = self.rooms.lock().unwrap();
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
    
    // Add connection to manager
    manager.add_connection(connection_id.clone());
    
    // Spawn task to handle this connection
    let manager_clone = manager.get_ref().clone();
    actix_web::rt::spawn(handle_connection(
        connection_id.clone(),
        session,
        msg_stream,
        manager_clone,
    ));
    
    info!("WebSocket connection established: {}", connection_id);
    Ok(response)
}

async fn handle_connection(
    connection_id: String,
    mut session: Session,
    mut msg_stream: MessageStream,
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
    
    // Main message loop
    while let Some(msg) = msg_stream.next().await {
        match msg {
            Ok(actix_ws::Message::Text(text)) => {
                match serde_json::from_str::<WSMessage>(&text) {
                    Ok(ws_message) => {
                        if let Err(e) = handle_ws_message(
                            &connection_id,
                            ws_message,
                            &mut session,
                            &manager,
                        ).await {
                            error!("Error handling WebSocket message: {}", e);
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
            Ok(actix_ws::Message::Close(reason)) => {
                info!("WebSocket connection closed: {} - {:?}", connection_id, reason);
                break;
            }
            Ok(actix_ws::Message::Ping(bytes)) => {
                info!("Received ping from {}", connection_id);
                if let Err(e) = session.pong(&bytes).await {
                    error!("Failed to send pong: {}", e);
                    break;
                }
            }
            Ok(actix_ws::Message::Pong(_)) => {
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
    
    // Cleanup connection
    manager.remove_connection(&connection_id);
    info!("WebSocket connection handler finished: {}", connection_id);
}

async fn handle_ws_message(
    connection_id: &str,
    message: WSMessage,
    session: &mut Session,
    manager: &ConnectionManager,
) -> Result<(), Box<dyn std::error::Error>> {
    match message {
        WSMessage::Auth { token } => {
            // In a real implementation, validate the JWT token here
            // For demo, we'll extract user info from the token
            info!("Authentication attempt for connection: {}", connection_id);
            
            // Mock user info (in real implementation, decode JWT)
            let user = UserInfo {
                id: "demo_user_123".to_string(),
                name: "Demo User".to_string(),
                email: "demo@pytake.com".to_string(),
                role: "agent".to_string(),
            };
            
            manager.authenticate_connection(connection_id, user.clone());
            
            let ack = WSMessage::Ack {
                request_id: None,
                message: format!("Authenticated as {}", user.name),
            };
            send_message(session, &ack).await?;
        }
        
        WSMessage::JoinRoom { conversation_id } => {
            info!("Connection {} joining room {}", connection_id, conversation_id);
            
            if manager.join_room(connection_id, &conversation_id) {
                let user = manager.get_connection_user(connection_id);
                
                // Notify room about new user
                if let Some(user_info) = user {
                    let presence_msg = WSMessage::UserPresence {
                        conversation_id: conversation_id.clone(),
                        user: user_info,
                        action: "joined".to_string(),
                    };
                    broadcast_to_room(manager, &conversation_id, &presence_msg, Some(connection_id)).await?;
                }
                
                let ack = WSMessage::Ack {
                    request_id: None,
                    message: format!("Joined room {}", conversation_id),
                };
                send_message(session, &ack).await?;
            }
        }
        
        WSMessage::LeaveRoom { conversation_id } => {
            info!("Connection {} leaving room {}", connection_id, conversation_id);
            
            let user = manager.get_connection_user(connection_id);
            
            if manager.leave_room(connection_id, &conversation_id) {
                // Notify room about user leaving
                if let Some(user_info) = user {
                    let presence_msg = WSMessage::UserPresence {
                        conversation_id: conversation_id.clone(),
                        user: user_info,
                        action: "left".to_string(),
                    };
                    broadcast_to_room(manager, &conversation_id, &presence_msg, Some(connection_id)).await?;
                }
                
                let ack = WSMessage::Ack {
                    request_id: None,
                    message: format!("Left room {}", conversation_id),
                };
                send_message(session, &ack).await?;
            }
        }
        
        WSMessage::SendMessage { conversation_id, content, message_type } => {
            info!("Message from connection {} to room {}: {}", connection_id, conversation_id, content);
            
            if let Some(user) = manager.get_connection_user(connection_id) {
                let new_message = WSMessage::NewMessage {
                    id: Uuid::new_v4().to_string(),
                    conversation_id: conversation_id.clone(),
                    sender: user,
                    content,
                    message_type,
                    timestamp: Utc::now(),
                };
                
                // Broadcast to all connections in the room
                broadcast_to_room(manager, &conversation_id, &new_message, None).await?;
            } else {
                let error_msg = WSMessage::Error {
                    message: "Must authenticate before sending messages".to_string(),
                    code: Some("UNAUTHENTICATED".to_string()),
                };
                send_message(session, &error_msg).await?;
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
            broadcast_to_room(manager, &conversation_id, &typing_msg, Some(connection_id)).await?;
        }
        
        WSMessage::Ping { .. } => {
            let pong = WSMessage::Pong {
                timestamp: Utc::now(),
            };
            send_message(session, &pong).await?;
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

async fn broadcast_to_room(
    manager: &ConnectionManager,
    room_id: &str,
    message: &WSMessage,
    exclude_connection: Option<&str>,
) -> Result<(), Box<dyn std::error::Error>> {
    let connections = manager.get_room_connections(room_id);
    let json = serde_json::to_string(message)?;
    
    info!("Broadcasting to room {} ({} connections)", room_id, connections.len());
    
    // Note: In a real implementation, we'd need to store session references
    // to actually send messages to other connections. For now, this is the structure.
    
    Ok(())
}

/// WebSocket stats endpoint
pub async fn websocket_stats(
    manager: web::Data<ConnectionManager>,
) -> Result<HttpResponse> {
    let (connections, rooms) = manager.get_stats();
    
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "active_connections": connections,
        "active_rooms": rooms,
        "timestamp": Utc::now(),
    })))
}