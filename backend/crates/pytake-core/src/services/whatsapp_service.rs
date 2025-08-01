//! WhatsApp business logic and domain services

use crate::entities::whatsapp::{
    WhatsAppMessage, WhatsAppWebhookEvent, MessageContent, MessageStatus, 
    WebhookEventType
};
use crate::entities::common::EntityId;
use crate::entities::Validatable;
use crate::errors::{CoreError, CoreResult};
use crate::services::{DomainService, ValidatingService};
use async_trait::async_trait;

/// WhatsApp domain service
#[derive(Debug, Default)]
pub struct WhatsAppService;

impl WhatsAppService {
    /// Create a new WhatsApp service instance
    pub fn new() -> Self {
        Self
    }

    /// Create a new outbound message with validation
    pub async fn create_outbound_message(
        &self,
        user_id: EntityId,
        from: String,
        to: String,
        content: MessageContent,
        flow_id: Option<EntityId>,
    ) -> CoreResult<WhatsAppMessage> {
        let message = WhatsAppMessage::new_outbound(user_id, from, to, content, flow_id);
        
        // Validate the message
        self.validate(&message).await?;
        
        Ok(message)
    }

    /// Create a new inbound message with validation
    pub async fn create_inbound_message(
        &self,
        user_id: EntityId,
        from: String,
        to: String,
        content: MessageContent,
    ) -> CoreResult<WhatsAppMessage> {
        let message = WhatsAppMessage::new_inbound(user_id, from, to, content);
        
        // Validate the message
        self.validate(&message).await?;
        
        Ok(message)
    }

    /// Update message status with validation
    pub async fn update_message_status(
        &self,
        mut message: WhatsAppMessage,
        status: MessageStatus,
    ) -> CoreResult<WhatsAppMessage> {
        // Business rule: Only outbound messages can have their status updated
        if message.is_inbound() {
            return Err(CoreError::business_rule(
                "Cannot update status of inbound messages"
            ));
        }
        
        // Business rule: Status transitions must be valid
        self.validate_status_transition(&message.status, &status)?;
        
        message.update_status(status);
        
        Ok(message)
    }

    /// Process a webhook event
    pub async fn process_webhook_event(
        &self,
        event_type: WebhookEventType,
        phone_number: String,
        payload: serde_json::Value,
        message_id: Option<EntityId>,
    ) -> CoreResult<WhatsAppWebhookEvent> {
        // Validate phone number
        self.validate_phone_number(&phone_number)?;
        
        // Validate payload based on event type
        self.validate_webhook_payload(&event_type, &payload)?;
        
        let event = WhatsAppWebhookEvent::new(event_type, phone_number, payload, message_id);
        
        Ok(event)
    }

    /// Check if a phone number is valid for messaging
    pub fn validate_phone_number(&self, phone_number: &str) -> CoreResult<()> {
        if phone_number.is_empty() {
            return Err(CoreError::validation("Phone number cannot be empty"));
        }
        
        // Must start with +
        if !phone_number.starts_with('+') {
            return Err(CoreError::validation("Phone number must start with +"));
        }
        
        // Must be at least 8 characters (+ followed by at least 7 digits)
        if phone_number.len() < 8 {
            return Err(CoreError::validation("Phone number is too short"));
        }
        
        // Must not exceed 15 characters (international standard)
        if phone_number.len() > 16 {  // +15 digits max
            return Err(CoreError::validation("Phone number is too long"));
        }
        
        // Must contain only digits after the +
        let digits = &phone_number[1..];
        if !digits.chars().all(|c| c.is_ascii_digit()) {
            return Err(CoreError::validation("Phone number must contain only digits after +"));
        }
        
        Ok(())
    }

    /// Validate message content based on type
    pub fn validate_message_content(&self, content: &MessageContent) -> CoreResult<()> {
        match content {
            MessageContent::Text { body } => {
                if body.is_empty() {
                    return Err(CoreError::validation("Text message body cannot be empty"));
                }
                
                // WhatsApp text message limit
                if body.len() > 4096 {
                    return Err(CoreError::validation("Text message exceeds 4096 character limit"));
                }
                
                Ok(())
            },
            MessageContent::Image { url, caption } => {
                self.validate_media_url(url)?;
                
                if let Some(caption) = caption {
                    if caption.len() > 1024 {
                        return Err(CoreError::validation("Image caption exceeds 1024 character limit"));
                    }
                }
                
                Ok(())
            },
            MessageContent::Document { url, filename, mime_type } => {
                self.validate_media_url(url)?;
                
                if filename.is_empty() {
                    return Err(CoreError::validation("Document filename cannot be empty"));
                }
                
                if mime_type.is_empty() {
                    return Err(CoreError::validation("Document MIME type cannot be empty"));
                }
                
                // Check for allowed document types
                let allowed_types = vec![
                    "application/pdf", "application/msword", "application/vnd.ms-excel",
                    "text/plain", "text/csv", "application/json"
                ];
                
                if !allowed_types.contains(&mime_type.as_str()) {
                    return Err(CoreError::validation("Unsupported document type"));
                }
                
                Ok(())
            },
            MessageContent::Audio { url, duration } => {
                self.validate_media_url(url)?;
                
                if let Some(duration) = duration {
                    // WhatsApp audio limit: 16MB, roughly 30 minutes
                    if *duration > 1800 {  // 30 minutes in seconds
                        return Err(CoreError::validation("Audio duration exceeds limit"));
                    }
                }
                
                Ok(())
            },
            MessageContent::Video { url, caption, duration } => {
                self.validate_media_url(url)?;
                
                if let Some(caption) = caption {
                    if caption.len() > 1024 {
                        return Err(CoreError::validation("Video caption exceeds 1024 character limit"));
                    }
                }
                
                if let Some(duration) = duration {
                    // WhatsApp video limit: 16MB, roughly 5 minutes
                    if *duration > 300 {  // 5 minutes in seconds
                        return Err(CoreError::validation("Video duration exceeds limit"));
                    }
                }
                
                Ok(())
            },
            MessageContent::Location { latitude, longitude, .. } => {
                // Valid latitude range: -90 to 90
                if *latitude < -90.0 || *latitude > 90.0 {
                    return Err(CoreError::validation("Invalid latitude value"));
                }
                
                // Valid longitude range: -180 to 180
                if *longitude < -180.0 || *longitude > 180.0 {
                    return Err(CoreError::validation("Invalid longitude value"));
                }
                
                Ok(())
            },
            MessageContent::Contact { name, phone, email } => {
                if name.is_empty() {
                    return Err(CoreError::validation("Contact name cannot be empty"));
                }
                
                self.validate_phone_number(phone)?;
                
                if let Some(email) = email {
                    if !email.contains('@') {
                        return Err(CoreError::validation("Invalid email format"));
                    }
                }
                
                Ok(())
            },
            MessageContent::Template { name, language, parameters } => {
                if name.is_empty() {
                    return Err(CoreError::validation("Template name cannot be empty"));
                }
                
                if language.is_empty() {
                    return Err(CoreError::validation("Template language cannot be empty"));
                }
                
                // Validate language code format (e.g., "en", "es", "pt_BR")
                if !language.chars().all(|c| c.is_ascii_lowercase() || c == '_') {
                    return Err(CoreError::validation("Invalid language code format"));
                }
                
                // Limit number of template parameters
                if parameters.len() > 10 {
                    return Err(CoreError::validation("Too many template parameters"));
                }
                
                Ok(())
            },
        }
    }

    /// Validate media URL
    fn validate_media_url(&self, url: &str) -> CoreResult<()> {
        if url.is_empty() {
            return Err(CoreError::validation("Media URL cannot be empty"));
        }
        
        if !url.starts_with("http://") && !url.starts_with("https://") {
            return Err(CoreError::validation("Media URL must be a valid HTTP/HTTPS URL"));
        }
        
        Ok(())
    }

    /// Validate status transition
    fn validate_status_transition(&self, current: &MessageStatus, new: &MessageStatus) -> CoreResult<()> {
        use MessageStatus::*;
        
        let valid_transition = match (current, new) {
            // From Pending
            (Pending, Sent) => true,
            (Pending, Failed) => true,
            
            // From Sent
            (Sent, Delivered) => true,
            (Sent, Failed) => true,
            
            // From Delivered
            (Delivered, Read) => true,
            
            // No other transitions are allowed
            _ => false,
        };
        
        if !valid_transition {
            return Err(CoreError::business_rule(
                format!("Invalid status transition from {:?} to {:?}", current, new)
            ));
        }
        
        Ok(())
    }

    /// Validate webhook payload based on event type
    fn validate_webhook_payload(&self, event_type: &WebhookEventType, payload: &serde_json::Value) -> CoreResult<()> {
        if !payload.is_object() {
            return Err(CoreError::validation("Webhook payload must be a JSON object"));
        }
        
        match event_type {
            WebhookEventType::MessageReceived => {
                // Should contain message data
                if payload.get("message").is_none() {
                    return Err(CoreError::validation("MessageReceived payload must contain 'message' field"));
                }
            },
            WebhookEventType::MessageStatus => {
                // Should contain status information
                if payload.get("status").is_none() {
                    return Err(CoreError::validation("MessageStatus payload must contain 'status' field"));
                }
            },
            WebhookEventType::AccountUpdate => {
                // Should contain account information
                if payload.get("account").is_none() {
                    return Err(CoreError::validation("AccountUpdate payload must contain 'account' field"));
                }
            },
            WebhookEventType::Error => {
                // Should contain error information
                if payload.get("error").is_none() {
                    return Err(CoreError::validation("Error payload must contain 'error' field"));
                }
            },
        }
        
        Ok(())
    }

    /// Check if a message can be replied to
    pub fn can_reply_to_message(&self, message: &WhatsAppMessage) -> bool {
        // Can only reply to inbound messages that were delivered successfully
        message.is_inbound() && message.is_delivered()
    }

    /// Generate a reply message
    pub async fn create_reply_message(
        &self,
        original_message: &WhatsAppMessage,
        reply_content: MessageContent,
        flow_id: Option<EntityId>,
    ) -> CoreResult<WhatsAppMessage> {
        if !self.can_reply_to_message(original_message) {
            return Err(CoreError::business_rule("Cannot reply to this message"));
        }
        
        // Swap from/to for reply
        self.create_outbound_message(
            original_message.user_id,
            original_message.to.clone(),    // Reply from the original 'to'
            original_message.from.clone(),  // Reply to the original 'from'
            reply_content,
            flow_id,
        ).await
    }
}

impl DomainService for WhatsAppService {
    fn service_name(&self) -> &'static str {
        "WhatsAppService"
    }
}

#[async_trait]
impl ValidatingService for WhatsAppService {
    type Entity = WhatsAppMessage;
    type Error = CoreError;
    
    async fn validate(&self, message: &Self::Entity) -> Result<(), Self::Error> {
        // First run the entity's built-in validation
        message.validate()?;
        
        // Then run business-specific validation rules
        self.validate_phone_number(&message.from)?;
        self.validate_phone_number(&message.to)?;
        self.validate_message_content(&message.content)?;
        
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_create_outbound_message() {
        let service = WhatsAppService::new();
        let user_id = EntityId::new();
        let content = MessageContent::Text { 
            body: "Hello, World!".to_string() 
        };
        
        let result = service.create_outbound_message(
            user_id,
            "+1234567890".to_string(),
            "+0987654321".to_string(),
            content,
            None,
        ).await;
        
        assert!(result.is_ok());
        let message = result.unwrap();
        assert!(message.is_outbound());
        assert_eq!(message.status, MessageStatus::Pending);
    }

    #[tokio::test]
    async fn test_phone_number_validation() {
        let service = WhatsAppService::new();
        
        // Valid phone numbers
        assert!(service.validate_phone_number("+1234567890").is_ok());
        assert!(service.validate_phone_number("+5511999887766").is_ok());
        
        // Invalid phone numbers
        assert!(service.validate_phone_number("").is_err());
        assert!(service.validate_phone_number("1234567890").is_err());  // No +
        assert!(service.validate_phone_number("+123").is_err());        // Too short
        assert!(service.validate_phone_number("+12345678901234567").is_err()); // Too long
        assert!(service.validate_phone_number("+123abc789").is_err());  // Non-digits
    }

    #[tokio::test]
    async fn test_message_content_validation() {
        let service = WhatsAppService::new();
        
        // Valid text content
        let text_content = MessageContent::Text { 
            body: "Hello".to_string() 
        };
        assert!(service.validate_message_content(&text_content).is_ok());
        
        // Invalid text content (empty)
        let empty_text = MessageContent::Text { 
            body: "".to_string() 
        };
        assert!(service.validate_message_content(&empty_text).is_err());
        
        // Valid image content
        let image_content = MessageContent::Image {
            url: "https://example.com/image.jpg".to_string(),
            caption: Some("Test image".to_string()),
        };
        assert!(service.validate_message_content(&image_content).is_ok());
        
        // Invalid location content
        let invalid_location = MessageContent::Location {
            latitude: 100.0,  // Invalid latitude
            longitude: 0.0,
            name: None,
            address: None,
        };
        assert!(service.validate_message_content(&invalid_location).is_err());
    }

    #[tokio::test]
    async fn test_status_transitions() {
        let service = WhatsAppService::new();
        let user_id = EntityId::new();
        let content = MessageContent::Text { 
            body: "Test".to_string() 
        };
        
        let message = service.create_outbound_message(
            user_id,
            "+1234567890".to_string(),
            "+0987654321".to_string(),
            content,
            None,
        ).await.unwrap();
        
        // Valid transition: Pending -> Sent
        let result = service.update_message_status(
            message.clone(), 
            MessageStatus::Sent
        ).await;
        assert!(result.is_ok());
        
        // Invalid transition: Pending -> Read (skipping Sent/Delivered)
        let result = service.update_message_status(
            message, 
            MessageStatus::Read
        ).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_reply_message() {
        let service = WhatsAppService::new();
        let user_id = EntityId::new();
        let content = MessageContent::Text { 
            body: "Hello".to_string() 
        };
        
        // Create inbound message
        let inbound_message = service.create_inbound_message(
            user_id,
            "+0987654321".to_string(),
            "+1234567890".to_string(),
            content.clone(),
        ).await.unwrap();
        
        // Should be able to reply
        assert!(service.can_reply_to_message(&inbound_message));
        
        let reply_content = MessageContent::Text { 
            body: "Hi there!".to_string() 
        };
        
        let reply = service.create_reply_message(
            &inbound_message,
            reply_content,
            None,
        ).await.unwrap();
        
        // Reply should have swapped from/to
        assert_eq!(reply.from, inbound_message.to);
        assert_eq!(reply.to, inbound_message.from);
        assert!(reply.is_outbound());
    }

    #[tokio::test]
    async fn test_webhook_event_processing() {
        let service = WhatsAppService::new();
        
        let payload = serde_json::json!({
            "message": {
                "id": "message123",
                "body": "Hello"
            }
        });
        
        let result = service.process_webhook_event(
            WebhookEventType::MessageReceived,
            "+1234567890".to_string(),
            payload,
            None,
        ).await;
        
        assert!(result.is_ok());
        let event = result.unwrap();
        assert_eq!(event.event_type, WebhookEventType::MessageReceived);
        assert!(!event.processed);
    }
}