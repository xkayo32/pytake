//! WhatsApp integration service for PyTake
//! 
//! This service handles the integration between WhatsApp Business API and the PyTake system,
//! including message processing, conversation management, and real-time notifications.

use crate::state::AppState;
use pytake_core::{
    errors::{CoreError, CoreResult},
    websocket::{WebSocketMessage, MessageData},
};
use pytake_whatsapp::{
    WhatsAppClient, InboundMessage, MessageStatusUpdate, WebhookPayload, WebhookProcessor,
    WhatsAppError, MessageResponse,
};
use pytake_db::entities::{
    conversation::{self as conversation_entity, Model as Conversation},
    whatsapp_message::{self as message_entity, Model as WhatsAppMessage},
    contact::{self as contact_entity, Model as Contact},
};
use sea_orm::{ActiveModelTrait, EntityTrait, Set, ColumnTrait, QueryFilter};
use serde_json::Value as JsonValue;
use std::sync::Arc;
use tracing::{info, error, warn, debug};
use uuid::Uuid;
use chrono::Utc;

/// WhatsApp integration service
pub struct WhatsAppIntegrationService {
    app_state: Arc<AppState>,
    whatsapp_client: Arc<WhatsAppClient>,
    webhook_processor: WebhookProcessor,
}

/// Processed message result
#[derive(Debug, Clone)]
pub struct ProcessedMessage {
    pub conversation_id: Uuid,
    pub message_id: Uuid,
    pub contact_phone: String,
    pub content: String,
    pub message_type: String,
    pub is_new_conversation: bool,
}

impl WhatsAppIntegrationService {
    /// Create a new WhatsApp integration service
    pub fn new(app_state: Arc<AppState>, whatsapp_client: Arc<WhatsAppClient>) -> CoreResult<Self> {
        // Extract webhook verification details from config
        let webhook_verify_token = app_state.config().whatsapp
            .as_ref()
            .and_then(|w| w.webhook_verify_token.as_ref())
            .ok_or_else(|| CoreError::configuration("WhatsApp webhook verify token not configured"))?;
        
        let app_secret = app_state.config().whatsapp
            .as_ref()
            .and_then(|w| w.app_secret.as_ref())
            .ok_or_else(|| CoreError::configuration("WhatsApp app secret not configured"))?;

        let webhook_processor = WebhookProcessor::new(app_secret, webhook_verify_token);

        Ok(Self {
            app_state,
            whatsapp_client,
            webhook_processor,
        })
    }

    /// Process incoming webhook payload
    pub async fn process_webhook_payload(
        &self,
        payload: &str,
        signature: Option<&str>,
    ) -> CoreResult<Vec<ProcessedMessage>> {
        // Verify webhook signature
        let webhook_payload = self.webhook_processor
            .process_payload(payload, signature)
            .map_err(|e| CoreError::validation(format!("Webhook verification failed: {}", e)))?;

        let mut processed_messages = Vec::new();

        // Extract and process messages
        for message in self.webhook_processor.extract_messages(&webhook_payload) {
            match self.process_incoming_message(message).await {
                Ok(processed) => {
                    processed_messages.push(processed);
                }
                Err(e) => {
                    error!("Failed to process incoming message: {}", e);
                    // Continue processing other messages
                }
            }
        }

        // Extract and process status updates
        for status_update in self.webhook_processor.extract_status_updates(&webhook_payload) {
            if let Err(e) = self.process_status_update(status_update).await {
                error!("Failed to process status update: {}", e);
            }
        }

        Ok(processed_messages)
    }

    /// Process a single incoming message
    async fn process_incoming_message(
        &self,
        message: &InboundMessage,
    ) -> CoreResult<ProcessedMessage> {
        debug!("Processing incoming message from {}: {}", message.from, message.id);

        // Find or create contact
        let contact = self.find_or_create_contact(&message.from).await?;
        
        // Find or create conversation
        let (conversation, is_new) = self.find_or_create_conversation(&contact).await?;

        // Extract message content
        let (content, message_type) = self.extract_message_content(message)?;

        // Save message to database
        let saved_message = self.save_message_to_db(
            &conversation,
            &message.id,
            &message.from,
            &content,
            &message_type,
            "inbound",
        ).await?;

        // Send real-time notification via WebSocket
        self.notify_new_message(&conversation, &saved_message, &contact).await?;

        Ok(ProcessedMessage {
            conversation_id: conversation.id,
            message_id: saved_message.id,
            contact_phone: message.from.clone(),
            content,
            message_type,
            is_new_conversation: is_new,
        })
    }

    /// Process message status update
    async fn process_status_update(&self, status_update: &MessageStatusUpdate) -> CoreResult<()> {
        debug!("Processing status update for message {}: {}", 
               status_update.id, status_update.status);

        // Find message in database
        let message = message_entity::Entity::find()
            .filter(message_entity::Column::WhatsappMessageId.eq(&status_update.id))
            .one(&*self.app_state.db)
            .await
            .map_err(|e| CoreError::database(format!("Failed to find message: {}", e)))?;

        if let Some(message) = message {
            // Update message status
            let mut active_message: message_entity::ActiveModel = message.into();
            active_message.status = Set(status_update.status.to_string());
            
            // Set timestamp fields based on status
            match status_update.status.as_str() {
                "delivered" => {
                    active_message.delivered_at = Set(Some(Utc::now()));
                }
                "read" => {
                    active_message.read_at = Set(Some(Utc::now()));
                }
                "failed" => {
                    // Could add error details here
                }
                _ => {}
            }

            let updated_message = active_message.update(&*self.app_state.db).await
                .map_err(|e| CoreError::database(format!("Failed to update message status: {}", e)))?;

            // Notify via WebSocket
            self.notify_status_update(&updated_message).await?;
        }

        Ok(())
    }

    /// Find or create contact by phone number
    async fn find_or_create_contact(&self, phone: &str) -> CoreResult<Contact> {
        // Try to find existing contact
        if let Some(contact) = contact_entity::Entity::find()
            .filter(contact_entity::Column::PhoneNumber.eq(phone))
            .one(&*self.app_state.db)
            .await
            .map_err(|e| CoreError::database(format!("Failed to query contact: {}", e)))?
        {
            return Ok(contact);
        }

        // Create new contact
        let new_contact = contact_entity::ActiveModel {
            id: Set(Uuid::new_v4()),
            phone_number: Set(phone.to_string()),
            name: Set(None), // Will be updated later if available
            profile_picture_url: Set(None),
            last_seen: Set(Some(Utc::now())),
            is_active: Set(true),
            metadata: Set(Some(serde_json::json!({
                "source": "whatsapp",
                "created_at": Utc::now()
            }))),
            created_at: Set(Utc::now()),
            updated_at: Set(Utc::now()),
        };

        let contact = new_contact.insert(&*self.app_state.db).await
            .map_err(|e| CoreError::database(format!("Failed to create contact: {}", e)))?;

        info!("Created new contact for phone: {}", phone);
        Ok(contact)
    }

    /// Find or create conversation for contact
    async fn find_or_create_conversation(&self, contact: &Contact) -> CoreResult<(Conversation, bool)> {
        // Try to find existing active conversation
        if let Some(conversation) = conversation_entity::Entity::find()
            .filter(conversation_entity::Column::ContactId.eq(contact.id))
            .filter(conversation_entity::Column::Platform.eq("whatsapp"))
            .filter(conversation_entity::Column::Status.eq("active"))
            .one(&*self.app_state.db)
            .await
            .map_err(|e| CoreError::database(format!("Failed to query conversation: {}", e)))?
        {
            return Ok((conversation, false));
        }

        // Create new conversation
        let new_conversation = conversation_entity::ActiveModel {
            id: Set(Uuid::new_v4()),
            contact_id: Set(contact.id),
            platform: Set("whatsapp".to_string()),
            platform_conversation_id: Set(contact.phone_number.clone()),
            status: Set("active".to_string()),
            unread_count: Set(1), // First message
            last_message_at: Set(Some(Utc::now())),
            assigned_user_id: Set(None),
            priority: Set("normal".to_string()),
            tags: Set(Vec::new()),
            metadata: Set(Some(serde_json::json!({
                "created_from": "whatsapp_inbound",
                "auto_created": true
            }))),
            created_at: Set(Utc::now()),
            updated_at: Set(Utc::now()),
        };

        let conversation = new_conversation.insert(&*self.app_state.db).await
            .map_err(|e| CoreError::database(format!("Failed to create conversation: {}", e)))?;

        info!("Created new conversation for contact: {}", contact.phone_number);
        Ok((conversation, true))
    }

    /// Extract message content and type from inbound message
    fn extract_message_content(&self, message: &InboundMessage) -> CoreResult<(String, String)> {
        match message.message_type.as_str() {
            "text" => {
                if let Some(text) = &message.text {
                    Ok((text.body.clone(), "text".to_string()))
                } else {
                    Err(CoreError::validation("Text message missing body"))
                }
            }
            "image" => {
                let caption = message.image.as_ref()
                    .and_then(|img| img.caption.clone())
                    .unwrap_or_default();
                Ok((caption, "image".to_string()))
            }
            "document" => {
                let caption = message.document.as_ref()
                    .and_then(|doc| doc.caption.clone())
                    .unwrap_or_default();
                Ok((caption, "document".to_string()))
            }
            "audio" => {
                Ok(("🎵 Audio message".to_string(), "audio".to_string()))
            }
            "video" => {
                let caption = message.video.as_ref()
                    .and_then(|vid| vid.caption.clone())
                    .unwrap_or_default();
                Ok((caption, "video".to_string()))
            }
            "location" => {
                if let Some(location) = &message.location {
                    let content = format!("📍 Location: {}, {} {}", 
                        location.latitude, 
                        location.longitude,
                        location.name.as_ref().map(|n| format!("({})", n)).unwrap_or_default()
                    );
                    Ok((content, "location".to_string()))
                } else {
                    Err(CoreError::validation("Location message missing coordinates"))
                }
            }
            _ => {
                warn!("Unsupported message type: {}", message.message_type);
                Ok((format!("Unsupported message type: {}", message.message_type), "unknown".to_string()))
            }
        }
    }

    /// Save message to database
    async fn save_message_to_db(
        &self,
        conversation: &Conversation,
        whatsapp_message_id: &str,
        from_phone: &str,
        content: &str,
        message_type: &str,
        direction: &str,
    ) -> CoreResult<WhatsAppMessage> {
        let new_message = message_entity::ActiveModel {
            id: Set(Uuid::new_v4()),
            whatsapp_message_id: Set(Some(whatsapp_message_id.to_string())),
            conversation_id: Set(conversation.id),
            direction: Set(direction.to_string()),
            from_phone_number: Set(from_phone.to_string()),
            to_phone_number: Set(conversation.platform_conversation_id.clone()),
            message_type: Set(message_type.to_string()),
            content: Set(serde_json::json!({
                "body": content,
                "type": message_type
            })),
            status: Set("received".to_string()),
            sent_at: Set(Some(Utc::now())),
            delivered_at: Set(None),
            read_at: Set(None),
            created_at: Set(Utc::now()),
        };

        let message = new_message.insert(&*self.app_state.db).await
            .map_err(|e| CoreError::database(format!("Failed to save message: {}", e)))?;

        Ok(message)
    }

    /// Send real-time notification via WebSocket
    async fn notify_new_message(
        &self,
        conversation: &Conversation,
        message: &WhatsAppMessage,
        contact: &Contact,
    ) -> CoreResult<()> {
        // Create WebSocket message data
        let message_data = MessageData {
            id: message.id,
            whatsapp_message_id: message.whatsapp_message_id.clone(),
            conversation_id: message.conversation_id,
            direction: message.direction.clone(),
            from_phone_number: message.from_phone_number.clone(),
            to_phone_number: message.to_phone_number.clone(),
            message_type: message.message_type.clone(),
            content: message.content.clone(),
            status: message.status.clone(),
            sent_at: message.sent_at,
            delivered_at: message.delivered_at,
            read_at: message.read_at,
            created_at: message.created_at,
        };

        let ws_message = WebSocketMessage::message_update(conversation.id, message_data);

        // Broadcast to all connections subscribed to this conversation
        self.app_state.connection_manager()
            .broadcast_to_conversation(conversation.id, ws_message, None)
            .await?;

        info!("Notified new message via WebSocket: {} from {}", 
              message.id, contact.phone_number);

        Ok(())
    }

    /// Send status update notification via WebSocket  
    async fn notify_status_update(&self, message: &WhatsAppMessage) -> CoreResult<()> {
        let ws_message = WebSocketMessage::status_update(
            message.conversation_id,
            message.id,
            message.status.clone(),
            Utc::now(),
        );

        self.app_state.connection_manager()
            .broadcast_to_conversation(message.conversation_id, ws_message, None)
            .await?;

        Ok(())
    }

    /// Send outbound message via WhatsApp
    pub async fn send_message(
        &self,
        conversation_id: Uuid,
        content: &str,
        message_type: &str,
    ) -> CoreResult<MessageResponse> {
        // Get conversation details
        let conversation = conversation_entity::Entity::find_by_id(conversation_id)
            .one(&*self.app_state.db)
            .await
            .map_err(|e| CoreError::database(format!("Failed to find conversation: {}", e)))?
            .ok_or_else(|| CoreError::not_found("conversation", conversation_id.to_string()))?;

        // Send via WhatsApp API
        let response = match message_type {
            "text" => {
                self.whatsapp_client
                    .send_text_message(&conversation.platform_conversation_id, content)
                    .await
                    .map_err(|e| CoreError::external(format!("WhatsApp API error: {}", e)))?
            }
            _ => {
                return Err(CoreError::validation(format!("Unsupported outbound message type: {}", message_type)));
            }
        };

        // Save outbound message to database
        let phone_number_id = self.app_state.config().whatsapp
            .as_ref()
            .and_then(|w| Some(&w.phone_number_id))
            .ok_or_else(|| CoreError::configuration("WhatsApp phone number ID not configured"))?;

        let saved_message = self.save_message_to_db(
            &conversation,
            &response.messages[0].id,
            phone_number_id,
            content,
            message_type,
            "outbound",
        ).await?;

        // Notify via WebSocket
        let contact = contact_entity::Entity::find_by_id(conversation.contact_id)
            .one(&*self.app_state.db)
            .await
            .map_err(|e| CoreError::database(format!("Failed to find contact: {}", e)))?
            .ok_or_else(|| CoreError::not_found("contact", conversation.contact_id.to_string()))?;

        self.notify_new_message(&conversation, &saved_message, &contact).await?;

        Ok(response)
    }

    /// Verify webhook challenge
    pub fn verify_webhook_challenge(
        &self,
        mode: &str,
        token: &str,
        challenge: &str,
    ) -> CoreResult<String> {
        self.webhook_processor
            .verify_challenge(mode, token, challenge)
            .map_err(|e| CoreError::validation(format!("Webhook verification failed: {}", e)))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_message_content_text() {
        // This would require setting up proper test infrastructure
        // For now, this is a placeholder test
        assert!(true);
    }
}