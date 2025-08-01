//! WebSocket integration service for real-time updates

use pytake_core::websocket::{WebSocketManager, MessageData, NotificationLevel};
use pytake_core::errors::CoreResult;
use pytake_db::entities::message;
use std::sync::Arc;
use uuid::Uuid;
use tracing::{info, error};

/// WebSocket integration service
#[derive(Clone)]
pub struct WebSocketIntegrationService {
    websocket_manager: Arc<WebSocketManager>,
}

impl WebSocketIntegrationService {
    /// Create new WebSocket integration service
    pub fn new(websocket_manager: Arc<WebSocketManager>) -> Self {
        Self {
            websocket_manager,
        }
    }
    
    /// Broadcast new message to conversation subscribers
    pub async fn broadcast_new_message(
        &self,
        conversation_id: Uuid,
        message: &message::Model,
    ) -> CoreResult<()> {
        let message_data = MessageData {
            id: message.id,
            whatsapp_message_id: message.whatsapp_message_id.clone(),
            conversation_id: message.conversation_id,
            direction: message.direction.clone(),
            from_phone_number: message.from_phone_number.clone(),
            to_phone_number: message.to_phone_number.clone(),
            message_type: message.message_type.clone(),
            content: message.content.clone(),
            status: message.status.clone().unwrap_or_else(|| "pending".to_string()),
            sent_at: message.sent_at,
            delivered_at: message.delivered_at,
            read_at: message.read_at,
            created_at: message.created_at,
        };
        
        self.websocket_manager
            .broadcast_message_update(conversation_id, message_data)
            .await?;
            
        info!("Broadcasted new message {} to conversation {}", message.id, conversation_id);
        Ok(())
    }
    
    /// Broadcast message status update
    pub async fn broadcast_status_update(
        &self,
        conversation_id: Uuid,
        message_id: Uuid,
        status: String,
        timestamp: chrono::DateTime<chrono::Utc>,
    ) -> CoreResult<()> {
        self.websocket_manager
            .broadcast_status_update(conversation_id, message_id, status.clone(), timestamp)
            .await?;
            
        info!(
            "Broadcasted status update for message {} in conversation {}: {}",
            message_id, conversation_id, status
        );
        Ok(())
    }
    
    /// Send notification to user
    pub async fn send_user_notification(
        &self,
        user_id: Uuid,
        title: String,
        message: String,
        level: NotificationLevel,
    ) -> CoreResult<()> {
        self.websocket_manager
            .send_notification_to_user(user_id, title, message, level)
            .await?;
            
        info!("Sent notification to user {}", user_id);
        Ok(())
    }
    
    /// Broadcast typing indicator
    pub async fn broadcast_typing_indicator(
        &self,
        conversation_id: Uuid,
        user_id: Option<Uuid>,
        is_typing: bool,
    ) -> CoreResult<()> {
        use pytake_core::websocket::WebSocketMessage;
        
        let typing_message = WebSocketMessage::typing(conversation_id, user_id, is_typing);
        
        self.websocket_manager
            .connection_manager()
            .broadcast_to_conversation(conversation_id, typing_message, None)
            .await?;
            
        Ok(())
    }
    
    /// Get WebSocket statistics
    pub async fn get_websocket_stats(&self) -> pytake_core::websocket::WebSocketStats {
        self.websocket_manager.get_stats().await
    }
}

/// WebSocket integration for message status updates
pub async fn integrate_status_tracking_with_websocket(
    websocket_service: Arc<WebSocketIntegrationService>,
    conversation_id: Uuid,
    message_id: Uuid,
    old_status: Option<String>,
    new_status: String,
) -> CoreResult<()> {
    // Only broadcast if status actually changed
    if let Some(old) = &old_status {
        if old == &new_status {
            return Ok(());
        }
    }
    
    let timestamp = chrono::Utc::now();
    
    websocket_service
        .broadcast_status_update(conversation_id, message_id, new_status, timestamp)
        .await?;
        
    Ok(())
}

/// WebSocket integration for new messages
pub async fn integrate_new_message_with_websocket(
    websocket_service: Arc<WebSocketIntegrationService>,
    message: &message::Model,
) -> CoreResult<()> {
    websocket_service
        .broadcast_new_message(message.conversation_id, message)
        .await?;
        
    Ok(())
}