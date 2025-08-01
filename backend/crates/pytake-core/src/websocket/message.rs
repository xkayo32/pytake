//! WebSocket message types and handlers

use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};
use std::collections::HashMap;

/// WebSocket message types for real-time communication
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum WebSocketMessage {
    /// Client authentication
    Auth {
        token: String,
    },
    
    /// Subscribe to conversation updates
    Subscribe {
        conversation_id: Uuid,
    },
    
    /// Unsubscribe from conversation updates  
    Unsubscribe {
        conversation_id: Uuid,
    },
    
    /// New message received/sent
    MessageUpdate {
        conversation_id: Uuid,
        message: MessageData,
    },
    
    /// Message status changed
    StatusUpdate {
        conversation_id: Uuid,
        message_id: Uuid,
        status: String,
        timestamp: DateTime<Utc>,
    },
    
    /// User typing indicator
    Typing {
        conversation_id: Uuid,
        user_id: Option<Uuid>,
        is_typing: bool,
    },
    
    /// User online/offline status
    PresenceUpdate {
        user_id: Uuid,
        status: PresenceStatus,
        last_seen: Option<DateTime<Utc>>,
    },
    
    /// Conversation metadata changed
    ConversationUpdate {
        conversation_id: Uuid,
        updates: ConversationUpdates,
    },
    
    /// System notification
    Notification {
        id: Uuid,
        title: String,
        message: String,
        level: NotificationLevel,
        timestamp: DateTime<Utc>,
        metadata: Option<HashMap<String, serde_json::Value>>,
    },
    
    /// Connection acknowledgment
    Ack {
        request_id: Option<String>,
        success: bool,
        error: Option<String>,
    },
    
    /// Heartbeat/ping message
    Ping {
        timestamp: DateTime<Utc>,
    },
    
    /// Pong response
    Pong {
        timestamp: DateTime<Utc>,
    },
}

/// Message data for WebSocket updates
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessageData {
    pub id: Uuid,
    pub whatsapp_message_id: Option<String>,
    pub conversation_id: Uuid,
    pub direction: String,
    pub from_phone_number: String,
    pub to_phone_number: String,
    pub message_type: String,
    pub content: serde_json::Value,
    pub status: String,
    pub sent_at: Option<DateTime<Utc>>,
    pub delivered_at: Option<DateTime<Utc>>,
    pub read_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

/// User presence status
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum PresenceStatus {
    Online,
    Away,
    Busy,
    Offline,
}

/// Conversation update fields
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConversationUpdates {
    pub unread_count: Option<u32>,
    pub last_message_at: Option<DateTime<Utc>>,
    pub is_archived: Option<bool>,
    pub tags: Option<Vec<String>>,
    pub assigned_user_id: Option<Uuid>,
}

/// Notification levels
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum NotificationLevel {
    Info,
    Success,
    Warning,
    Error,
}

/// WebSocket event for internal processing
#[derive(Debug, Clone)]
pub enum WebSocketEvent {
    /// User connected to WebSocket
    Connect {
        connection_id: String,
        user_id: Option<Uuid>,
    },
    
    /// User disconnected
    Disconnect {
        connection_id: String,
        user_id: Option<Uuid>,
    },
    
    /// Message received from client
    MessageReceived {
        connection_id: String,
        message: WebSocketMessage,
    },
    
    /// Broadcast message to subscribers
    Broadcast {
        conversation_id: Uuid,
        message: WebSocketMessage,
        exclude_connection: Option<String>,
    },
    
    /// Send message to specific connection
    SendToConnection {
        connection_id: String,
        message: WebSocketMessage,
    },
    
    /// Send message to specific user
    SendToUser {
        user_id: Uuid,
        message: WebSocketMessage,
    },
}

/// WebSocket connection info
#[derive(Debug, Clone)]
pub struct ConnectionInfo {
    pub connection_id: String,
    pub user_id: Option<Uuid>,
    pub subscriptions: Vec<Uuid>, // conversation IDs
    pub connected_at: DateTime<Utc>,
    pub last_ping: DateTime<Utc>,
}

impl WebSocketMessage {
    /// Create a message update event
    pub fn message_update(conversation_id: Uuid, message: MessageData) -> Self {
        Self::MessageUpdate {
            conversation_id,
            message,
        }
    }
    
    /// Create a status update event
    pub fn status_update(
        conversation_id: Uuid,
        message_id: Uuid,
        status: String,
        timestamp: DateTime<Utc>,
    ) -> Self {
        Self::StatusUpdate {
            conversation_id,
            message_id,
            status,
            timestamp,
        }
    }
    
    /// Create a typing indicator
    pub fn typing(conversation_id: Uuid, user_id: Option<Uuid>, is_typing: bool) -> Self {
        Self::Typing {
            conversation_id,
            user_id,
            is_typing,
        }
    }
    
    /// Create a notification
    pub fn notification(
        title: String,
        message: String,
        level: NotificationLevel,
    ) -> Self {
        Self::Notification {
            id: Uuid::new_v4(),
            title,
            message,
            level,
            timestamp: Utc::now(),
            metadata: None,
        }
    }
    
    /// Create an acknowledgment
    pub fn ack(request_id: Option<String>, success: bool, error: Option<String>) -> Self {
        Self::Ack {
            request_id,
            success,
            error,
        }
    }
    
    /// Create a ping message
    pub fn ping() -> Self {
        Self::Ping {
            timestamp: Utc::now(),
        }
    }
    
    /// Create a pong response
    pub fn pong() -> Self {
        Self::Pong {
            timestamp: Utc::now(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_websocket_message_serialization() {
        let message = WebSocketMessage::message_update(
            Uuid::new_v4(),
            MessageData {
                id: Uuid::new_v4(),
                whatsapp_message_id: Some("wa_123".to_string()),
                conversation_id: Uuid::new_v4(),
                direction: "inbound".to_string(),
                from_phone_number: "1234567890".to_string(),
                to_phone_number: "0987654321".to_string(),
                message_type: "text".to_string(),
                content: serde_json::json!({"body": "Hello"}),
                status: "delivered".to_string(),
                sent_at: Some(Utc::now()),
                delivered_at: Some(Utc::now()),
                read_at: None,
                created_at: Utc::now(),
            },
        );
        
        let json = serde_json::to_string(&message).unwrap();
        let deserialized: WebSocketMessage = serde_json::from_str(&json).unwrap();
        
        match deserialized {
            WebSocketMessage::MessageUpdate { .. } => (),
            _ => panic!("Expected MessageUpdate"),
        }
    }
    
    #[test]
    fn test_notification_creation() {
        let notification = WebSocketMessage::notification(
            "Test".to_string(),
            "Test message".to_string(),
            NotificationLevel::Info,
        );
        
        match notification {
            WebSocketMessage::Notification { level, .. } => {
                assert!(matches!(level, NotificationLevel::Info));
            }
            _ => panic!("Expected Notification"),
        }
    }
}