//! Socket.IO handler for real-time communication compatible with frontend
//! This provides Socket.IO compatibility layer over our existing WebSocket infrastructure

use actix_web::{web, HttpRequest, HttpResponse, Result as ActixResult};
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use socketioxide::{
    extract::{AckSender, Bin, Data, SocketRef, State},
    SocketIo,
};
use std::sync::Arc;
use tracing::{info, warn, error, debug};
use uuid::Uuid;

use crate::state::AppState;
use pytake_core::{
    websocket::{WebSocketManager, WebSocketMessage},
    auth::token::TokenValidator,
    errors::CoreResult,
};

/// Socket.IO events that match frontend expectations
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum SocketIoEvent {
    /// Authentication with JWT token
    Auth { token: String },
    
    /// Join conversation room
    ConversationJoin { conversationId: String },
    
    /// Leave conversation room
    ConversationLeave { conversationId: String },
    
    /// Send new message
    MessageSend {
        conversationId: String,
        content: String,
        #[serde(rename = "type")]
        message_type: String,
    },
    
    /// Mark message as read
    MessageRead { messageId: String },
    
    /// User typing indicator
    UserTyping {
        conversationId: String,
        isTyping: bool,
    },
}

/// Socket.IO server events sent to frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum SocketIoServerEvent {
    /// New message received
    MessageNew {
        id: String,
        conversationId: String,
        content: String,
        #[serde(rename = "type")]
        message_type: String,
        sender: String, // 'user' or 'contact'
        timestamp: chrono::DateTime<chrono::Utc>,
        status: String, // 'sent', 'delivered', 'read'
    },
    
    /// Message status update
    MessageStatus {
        messageId: String,
        conversationId: String,
        status: String,
    },
    
    /// Contact typing indicator
    ContactTyping {
        conversationId: String,
        contactName: String,
        isTyping: bool,
    },
    
    /// New conversation created
    ConversationNew {
        conversationId: String,
        contact: ContactInfo,
        platform: String,
        initialMessage: MessageInfo,
    },
    
    /// Connection status update
    ConnectionStatus { status: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContactInfo {
    pub name: String,
    pub phone: String,
    pub avatar: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessageInfo {
    pub id: String,
    pub content: String,
    #[serde(rename = "type")]
    pub message_type: String,
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

/// Initialize Socket.IO server with our WebSocket manager
pub fn create_socketio_layer(app_state: Arc<AppState>) -> SocketIo {
    let (io, _) = SocketIo::new_layer();
    
    // Authentication namespace
    let auth_ns = io.ns("/", move |socket: SocketRef| {
        let app_state = app_state.clone();
        
        // Handle authentication
        socket.on("auth", {
            let app_state = app_state.clone();
            move |socket: SocketRef, Data::<JsonValue>(data), ack: AckSender| {
                let app_state = app_state.clone();
                async move {
                    handle_auth(socket, data, ack, app_state).await;
                }
            }
        });
        
        // Handle conversation join
        socket.on("conversation:join", {
            let app_state = app_state.clone();
            move |socket: SocketRef, Data::<JsonValue>(data)| {
                let app_state = app_state.clone();
                async move {
                    handle_conversation_join(socket, data, app_state).await;
                }
            }
        });
        
        // Handle conversation leave
        socket.on("conversation:leave", {
            let app_state = app_state.clone();
            move |socket: SocketRef, Data::<JsonValue>(data)| {
                let app_state = app_state.clone();
                async move {
                    handle_conversation_leave(socket, data, app_state).await;
                }
            }
        });
        
        // Handle message send
        socket.on("message:send", {
            let app_state = app_state.clone();
            move |socket: SocketRef, Data::<JsonValue>(data)| {
                let app_state = app_state.clone();
                async move {
                    handle_message_send(socket, data, app_state).await;
                }
            }
        });
        
        // Handle user typing
        socket.on("user:typing", {
            let app_state = app_state.clone();
            move |socket: SocketRef, Data::<JsonValue>(data)| {
                let app_state = app_state.clone();
                async move {
                    handle_user_typing(socket, data, app_state).await;
                }
            }
        });
        
        // Handle message status update
        socket.on("message:status", {
            let app_state = app_state.clone();
            move |socket: SocketRef, Data::<JsonValue>(data)| {
                let app_state = app_state.clone();
                async move {
                    handle_message_status(socket, data, app_state).await;
                }
            }
        });
        
        // Handle disconnect
        socket.on_disconnect({
            move |socket: SocketRef| {
                async move {
                    info!("Socket.IO client disconnected: {}", socket.id);
                }
            }
        });
        
        info!("Socket.IO client connected: {}", socket.id);
    });
    
    io
}

/// Handle authentication
async fn handle_auth(
    socket: SocketRef,
    data: JsonValue,
    ack: AckSender,
    app_state: Arc<AppState>,
) {
    match data.get("token").and_then(|t| t.as_str()) {
        Some(token) => {
            // Validate token using auth service
            match app_state.auth_service().validate_token(token).await {
                Ok(user) => {
                    // Store user ID in socket data
                    socket.req_parts().extensions.insert(user.id);
                    
                    // Send success acknowledgment
                    let _ = ack.send(serde_json::json!({
                        "success": true,
                        "user": {
                            "id": user.id,
                            "email": user.email,
                            "name": user.name
                        }
                    }));
                    
                    // Emit connection status
                    let _ = socket.emit("connection:status", serde_json::json!({
                        "status": "connected"
                    }));
                    
                    info!("User {} authenticated via Socket.IO", user.id);
                }
                Err(e) => {
                    warn!("Socket.IO authentication failed: {}", e);
                    let _ = ack.send(serde_json::json!({
                        "success": false,
                        "error": "Authentication failed"
                    }));
                }
            }
        }
        None => {
            warn!("Socket.IO auth message missing token");
            let _ = ack.send(serde_json::json!({
                "success": false,
                "error": "Token required"
            }));
        }
    }
}

/// Handle conversation join
async fn handle_conversation_join(
    socket: SocketRef,
    data: JsonValue,
    _app_state: Arc<AppState>,
) {
    if let Some(conversation_id) = data.get("conversationId").and_then(|id| id.as_str()) {
        // Join the conversation room
        if let Err(e) = socket.join(conversation_id) {
            error!("Failed to join conversation room {}: {}", conversation_id, e);
            return;
        }
        
        info!("Socket {} joined conversation {}", socket.id, conversation_id);
        
        // Send acknowledgment
        let _ = socket.emit("conversation:joined", serde_json::json!({
            "conversationId": conversation_id
        }));
    } else {
        warn!("Invalid conversation join request from socket {}", socket.id);
    }
}

/// Handle conversation leave
async fn handle_conversation_leave(
    socket: SocketRef,
    data: JsonValue,
    _app_state: Arc<AppState>,
) {
    if let Some(conversation_id) = data.get("conversationId").and_then(|id| id.as_str()) {
        // Leave the conversation room
        socket.leave(conversation_id);
        
        info!("Socket {} left conversation {}", socket.id, conversation_id);
        
        // Send acknowledgment
        let _ = socket.emit("conversation:left", serde_json::json!({
            "conversationId": conversation_id
        }));
    } else {
        warn!("Invalid conversation leave request from socket {}", socket.id);
    }
}

/// Handle message send
async fn handle_message_send(
    socket: SocketRef,
    data: JsonValue,
    app_state: Arc<AppState>,
) {
    let conversation_id = match data.get("conversationId").and_then(|id| id.as_str()) {
        Some(id) => id,
        None => {
            warn!("Message send missing conversationId from socket {}", socket.id);
            return;
        }
    };
    
    let content = match data.get("content").and_then(|c| c.as_str()) {
        Some(content) => content,
        None => {
            warn!("Message send missing content from socket {}", socket.id);
            return;
        }
    };
    
    let message_type = data.get("type")
        .and_then(|t| t.as_str())
        .unwrap_or("text");
    
    // Get user ID from socket
    let user_id = socket.req_parts().extensions.get::<Uuid>().copied();
    
    // Create message via orchestrator if available
    if let Some(orchestrator) = app_state.orchestrator() {
        // TODO: Implement message creation through orchestrator
        info!("Creating message via orchestrator: {} -> {}", user_id.unwrap_or_default(), conversation_id);
    }
    
    // For now, broadcast the message to the conversation room
    let message_id = Uuid::new_v4().to_string();
    let timestamp = chrono::Utc::now();
    
    let message_event = serde_json::json!({
        "id": message_id,
        "conversationId": conversation_id,
        "content": content,
        "type": message_type,
        "sender": "user",
        "timestamp": timestamp,
        "status": "sent"
    });
    
    // Broadcast to conversation room (excluding sender)
    socket.to(conversation_id).emit("message:new", &message_event);
    
    // Send acknowledgment to sender
    let _ = socket.emit("message:sent", serde_json::json!({
        "messageId": message_id,
        "status": "sent"
    }));
    
    info!("Message sent to conversation {}: {}", conversation_id, content);
}

/// Handle user typing indicator
async fn handle_user_typing(
    socket: SocketRef,
    data: JsonValue,
    _app_state: Arc<AppState>,
) {
    let conversation_id = match data.get("conversationId").and_then(|id| id.as_str()) {
        Some(id) => id,
        None => return,
    };
    
    let is_typing = data.get("isTyping").and_then(|t| t.as_bool()).unwrap_or(false);
    
    // Broadcast typing indicator to conversation room (excluding sender)
    socket.to(conversation_id).emit("user:typing", serde_json::json!({
        "conversationId": conversation_id,
        "isTyping": is_typing
    }));
}

/// Handle message status update
async fn handle_message_status(
    socket: SocketRef,
    data: JsonValue,
    _app_state: Arc<AppState>,
) {
    let message_id = match data.get("messageId").and_then(|id| id.as_str()) {
        Some(id) => id,
        None => return,
    };
    
    let status = match data.get("status").and_then(|s| s.as_str()) {
        Some(status) => status,
        None => return,
    };
    
    info!("Message {} status updated to: {}", message_id, status);
    
    // TODO: Update message status in database
    // TODO: Broadcast status update to relevant clients
}

/// Broadcast new message to conversation subscribers
pub async fn broadcast_message_to_conversation(
    io: &SocketIo,
    conversation_id: &str,
    message: SocketIoServerEvent,
) -> CoreResult<()> {
    let json_message = serde_json::to_value(&message)
        .map_err(|e| pytake_core::errors::CoreError::internal(format!("Serialization error: {}", e)))?;
    
    io.to(conversation_id).emit("message:new", json_message);
    
    Ok(())
}

/// Broadcast typing indicator to conversation
pub async fn broadcast_typing_to_conversation(
    io: &SocketIo,
    conversation_id: &str,
    contact_name: &str,
    is_typing: bool,
) -> CoreResult<()> {
    let typing_event = serde_json::json!({
        "conversationId": conversation_id,
        "contactName": contact_name,
        "isTyping": is_typing
    });
    
    io.to(conversation_id).emit("contact:typing", typing_event);
    
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_socketio_event_serialization() {
        let event = SocketIoEvent::MessageSend {
            conversationId: "123".to_string(),
            content: "Hello".to_string(),
            message_type: "text".to_string(),
        };
        
        let json = serde_json::to_string(&event).unwrap();
        assert!(json.contains("message_send"));
        assert!(json.contains("Hello"));
    }
    
    #[test]
    fn test_server_event_serialization() {
        let event = SocketIoServerEvent::MessageNew {
            id: "msg123".to_string(),
            conversationId: "conv123".to_string(),
            content: "Hello".to_string(),
            message_type: "text".to_string(),
            sender: "user".to_string(),
            timestamp: chrono::Utc::now(),
            status: "sent".to_string(),
        };
        
        let json = serde_json::to_string(&event).unwrap();
        assert!(json.contains("message_new"));
        assert!(json.contains("Hello"));
    }
}