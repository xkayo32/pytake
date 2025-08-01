//! WhatsApp-related domain entities

use super::common::{EntityId, Timestamp};
use super::{Entity, Timestamped, Validatable};
use crate::errors::CoreError;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use validator::Validate;

/// WhatsApp message entity
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Validate)]
pub struct WhatsAppMessage {
    pub id: EntityId,
    pub user_id: EntityId,
    pub flow_id: Option<EntityId>,
    
    #[validate(length(min = 1, message = "Phone number is required"))]
    pub from: String,
    
    #[validate(length(min = 1, message = "Phone number is required"))]
    pub to: String,
    
    pub message_type: MessageType,
    pub content: MessageContent,
    pub status: MessageStatus,
    pub direction: MessageDirection,
    pub metadata: HashMap<String, serde_json::Value>,
    pub created_at: Timestamp,
    pub updated_at: Timestamp,
}

/// Types of WhatsApp messages
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum MessageType {
    Text,
    Image,
    Document,
    Audio,
    Video,
    Location,
    Contact,
    Template,
}

/// Message content based on type
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum MessageContent {
    Text { 
        body: String 
    },
    Image { 
        url: String, 
        caption: Option<String> 
    },
    Document { 
        url: String, 
        filename: String, 
        mime_type: String 
    },
    Audio { 
        url: String, 
        duration: Option<u32> 
    },
    Video { 
        url: String, 
        caption: Option<String>, 
        duration: Option<u32> 
    },
    Location { 
        latitude: f64, 
        longitude: f64, 
        name: Option<String>, 
        address: Option<String> 
    },
    Contact { 
        name: String, 
        phone: String, 
        email: Option<String> 
    },
    Template { 
        name: String, 
        language: String, 
        parameters: Vec<String> 
    },
}

/// Message delivery status
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum MessageStatus {
    Pending,
    Sent,
    Delivered,
    Read,
    Failed,
}

/// Message direction
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum MessageDirection {
    Inbound,
    Outbound,
}

/// WhatsApp webhook event
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct WhatsAppWebhookEvent {
    pub id: EntityId,
    pub event_type: WebhookEventType,
    pub message_id: Option<EntityId>,
    pub phone_number: String,
    pub payload: serde_json::Value,
    pub processed: bool,
    pub created_at: Timestamp,
}

/// Types of webhook events
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum WebhookEventType {
    MessageReceived,
    MessageStatus,
    AccountUpdate,
    Error,
}

impl WhatsAppMessage {
    /// Create a new outbound message
    pub fn new_outbound(
        user_id: EntityId,
        from: String,
        to: String,
        content: MessageContent,
        flow_id: Option<EntityId>,
    ) -> Self {
        let now = Timestamp::now();
        let message_type = content.message_type();
        
        Self {
            id: EntityId::new(),
            user_id,
            flow_id,
            from,
            to,
            message_type,
            content,
            status: MessageStatus::Pending,
            direction: MessageDirection::Outbound,
            metadata: HashMap::new(),
            created_at: now,
            updated_at: now,
        }
    }

    /// Create a new inbound message
    pub fn new_inbound(
        user_id: EntityId,
        from: String,
        to: String,
        content: MessageContent,
    ) -> Self {
        let now = Timestamp::now();
        let message_type = content.message_type();
        
        Self {
            id: EntityId::new(),
            user_id,
            flow_id: None,
            from,
            to,
            message_type,
            content,
            status: MessageStatus::Delivered,
            direction: MessageDirection::Inbound,
            metadata: HashMap::new(),
            created_at: now,
            updated_at: now,
        }
    }

    /// Update message status
    pub fn update_status(&mut self, status: MessageStatus) {
        self.status = status;
        self.updated_at = Timestamp::now();
    }

    /// Check if message is outbound
    pub fn is_outbound(&self) -> bool {
        self.direction == MessageDirection::Outbound
    }

    /// Check if message is inbound
    pub fn is_inbound(&self) -> bool {
        self.direction == MessageDirection::Inbound
    }

    /// Check if message was delivered successfully
    pub fn is_delivered(&self) -> bool {
        matches!(self.status, MessageStatus::Delivered | MessageStatus::Read)
    }

    /// Get text content if this is a text message
    pub fn text_content(&self) -> Option<&str> {
        match &self.content {
            MessageContent::Text { body } => Some(body),
            _ => None,
        }
    }
}

impl MessageContent {
    /// Get the message type for this content
    pub fn message_type(&self) -> MessageType {
        match self {
            MessageContent::Text { .. } => MessageType::Text,
            MessageContent::Image { .. } => MessageType::Image,
            MessageContent::Document { .. } => MessageType::Document,
            MessageContent::Audio { .. } => MessageType::Audio,
            MessageContent::Video { .. } => MessageType::Video,
            MessageContent::Location { .. } => MessageType::Location,
            MessageContent::Contact { .. } => MessageType::Contact,
            MessageContent::Template { .. } => MessageType::Template,
        }
    }
}

impl WhatsAppWebhookEvent {
    /// Create a new webhook event
    pub fn new(
        event_type: WebhookEventType,
        phone_number: String,
        payload: serde_json::Value,
        message_id: Option<EntityId>,
    ) -> Self {
        Self {
            id: EntityId::new(),
            event_type,
            message_id,
            phone_number,
            payload,
            processed: false,
            created_at: Timestamp::now(),
        }
    }

    /// Mark event as processed
    pub fn mark_processed(&mut self) {
        self.processed = true;
    }
}

impl Entity for WhatsAppMessage {
    type Id = EntityId;
    
    fn id(&self) -> &Self::Id {
        &self.id
    }
}

impl Timestamped for WhatsAppMessage {
    fn created_at(&self) -> &Timestamp {
        &self.created_at
    }
    
    fn updated_at(&self) -> &Timestamp {
        &self.updated_at
    }
}

impl Validatable for WhatsAppMessage {
    type Error = CoreError;
    
    fn validate(&self) -> Result<(), Self::Error> {
        use validator::Validate;
        Validate::validate(self)
            .map_err(|e| CoreError::ValidationError(format!("WhatsApp message validation failed: {}", e)))?;
        
        // Additional business rules validation
        if self.from == self.to {
            return Err(CoreError::ValidationError(
                "Message cannot be sent to the same number".to_string()
            ));
        }
        
        Ok(())
    }
}

impl Entity for WhatsAppWebhookEvent {
    type Id = EntityId;
    
    fn id(&self) -> &Self::Id {
        &self.id
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_outbound_message_creation() {
        let user_id = EntityId::new();
        let content = MessageContent::Text { 
            body: "Hello, World!".to_string() 
        };
        
        let message = WhatsAppMessage::new_outbound(
            user_id,
            "+1234567890".to_string(),
            "+0987654321".to_string(),
            content,
            None,
        );
        
        assert_eq!(message.user_id, user_id);
        assert!(message.is_outbound());
        assert_eq!(message.status, MessageStatus::Pending);
        assert_eq!(message.message_type, MessageType::Text);
        assert_eq!(message.text_content(), Some("Hello, World!"));
    }

    #[test]
    fn test_inbound_message_creation() {
        let user_id = EntityId::new();
        let content = MessageContent::Text { 
            body: "Hi there!".to_string() 
        };
        
        let message = WhatsAppMessage::new_inbound(
            user_id,
            "+0987654321".to_string(),
            "+1234567890".to_string(),
            content,
        );
        
        assert!(message.is_inbound());
        assert_eq!(message.status, MessageStatus::Delivered);
        assert!(message.is_delivered());
    }

    #[test]
    fn test_message_status_update() {
        let user_id = EntityId::new();
        let content = MessageContent::Text { 
            body: "Test".to_string() 
        };
        
        let mut message = WhatsAppMessage::new_outbound(
            user_id,
            "+1234567890".to_string(),
            "+0987654321".to_string(),
            content,
            None,
        );
        
        let original_updated_at = message.updated_at;
        std::thread::sleep(std::time::Duration::from_millis(1));
        
        message.update_status(MessageStatus::Sent);
        
        assert_eq!(message.status, MessageStatus::Sent);
        assert!(message.updated_at.as_datetime() > original_updated_at.as_datetime());
    }

    #[test]
    fn test_webhook_event_creation() {
        let payload = serde_json::json!({"test": "data"});
        let event = WhatsAppWebhookEvent::new(
            WebhookEventType::MessageReceived,
            "+1234567890".to_string(),
            payload,
            None,
        );
        
        assert_eq!(event.event_type, WebhookEventType::MessageReceived);
        assert!(!event.processed);
    }
}