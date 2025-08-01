//! Traits and common types for multi-platform messaging

use crate::errors::CoreResult;
use crate::messaging::Platform;
use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;

/// Universal message content that works across all platforms
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum MessageContent {
    /// Plain text message
    Text { 
        text: String 
    },
    
    /// Media message (image, video, audio, document)
    Media { 
        media_type: MediaType,
        url: String,
        caption: Option<String>,
        filename: Option<String>,
        mime_type: String,
        size_bytes: Option<u64>,
    },
    
    /// Location sharing
    Location { 
        latitude: f64,
        longitude: f64,
        address: Option<String>,
        name: Option<String>,
    },
    
    /// Contact sharing
    Contact { 
        contacts: Vec<ContactInfo> 
    },
    
    /// Interactive message (buttons, lists, etc.)
    Interactive { 
        body: String,
        interaction_type: InteractionType,
    },
    
    /// Template message (for marketing/notifications)
    Template { 
        template_name: String,
        language_code: String,
        parameters: Vec<TemplateParameter>,
    },
    
    /// System message (delivered, read, etc.)
    System { 
        message: String,
        system_type: SystemMessageType,
    },
}

/// Media types supported across platforms
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum MediaType {
    Image,
    Video,
    Audio,
    Document,
    Sticker,
    Voice,  // Voice note
    File,   // Generic file
}

/// Interactive message types
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum InteractionType {
    /// Button selection
    Buttons { 
        buttons: Vec<MessageButton> 
    },
    
    /// List selection
    List { 
        button_text: String,
        sections: Vec<ListSection>,
    },
    
    /// Quick reply
    QuickReplies { 
        replies: Vec<QuickReply> 
    },
}

/// Message button
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessageButton {
    pub id: String,
    pub title: String,
    pub button_type: ButtonType,
}

/// Button types
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ButtonType {
    Reply,
    Url { url: String },
    PhoneNumber { phone: String },
}

/// List section for list messages
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ListSection {
    pub title: Option<String>,
    pub rows: Vec<ListRow>,
}

/// List row
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ListRow {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
}

/// Quick reply option
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuickReply {
    pub id: String,
    pub title: String,
}

/// Template parameter
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TemplateParameter {
    pub parameter_type: ParameterType,
    pub value: String,
}

/// Template parameter types
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ParameterType {
    Text,
    Currency { currency_code: String },
    DateTime { format: String },
    Image { url: String },
    Video { url: String },
    Document { url: String },
}

/// System message types
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SystemMessageType {
    Delivered,
    Read,
    Failed,
    Sent,
    UserJoined,
    UserLeft,
    GroupCreated,
    GroupUpdated,
}

/// Contact information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContactInfo {
    pub name: ContactName,
    pub phones: Vec<ContactPhone>,
    pub emails: Vec<ContactEmail>,
    pub urls: Vec<ContactUrl>,
    pub addresses: Vec<ContactAddress>,
    pub organization: Option<ContactOrganization>,
    pub birthday: Option<String>,
}

/// Contact name
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContactName {
    pub formatted_name: String,
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub middle_name: Option<String>,
    pub suffix: Option<String>,
    pub prefix: Option<String>,
}

/// Contact phone
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContactPhone {
    pub phone: String,
    pub phone_type: Option<String>, // HOME, WORK, etc.
    pub wa_id: Option<String>,      // WhatsApp ID if available
}

/// Contact email
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContactEmail {
    pub email: String,
    pub email_type: Option<String>, // HOME, WORK, etc.
}

/// Contact URL
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContactUrl {
    pub url: String,
    pub url_type: Option<String>, // HOME, WORK, etc.
}

/// Contact address
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContactAddress {
    pub street: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub zip: Option<String>,
    pub country: Option<String>,
    pub country_code: Option<String>,
    pub address_type: Option<String>, // HOME, WORK, etc.
}

/// Contact organization
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContactOrganization {
    pub company: Option<String>,
    pub department: Option<String>,
    pub title: Option<String>,
}

/// Media content for sending
#[derive(Debug, Clone)]
pub struct MediaContent {
    pub media_type: MediaType,
    pub data: MediaData,
    pub caption: Option<String>,
    pub filename: Option<String>,
}

/// Media data variants
#[derive(Debug, Clone)]
pub enum MediaData {
    /// URL to media file
    Url(String),
    /// Raw bytes
    Bytes(Vec<u8>),
    /// File path
    FilePath(String),
}

/// Message delivery status
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DeliveryStatus {
    Pending,
    Sent,
    Delivered,
    Read,
    Failed { reason: String },
}

/// Platform capabilities
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlatformCapabilities {
    pub supports_media: bool,
    pub supports_location: bool,
    pub supports_contacts: bool,
    pub supports_interactive: bool,
    pub supports_templates: bool,
    pub supports_read_receipts: bool,
    pub supports_typing_indicators: bool,
    pub max_message_length: Option<usize>,
    pub supported_media_types: Vec<MediaType>,
}

/// Webhook event from any platform
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlatformWebhookEvent {
    pub platform: Platform,
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub event_type: WebhookEventType,
    pub event_data: serde_json::Value,
}

/// Webhook event types
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum WebhookEventType {
    MessageReceived,
    MessageDelivered,
    MessageRead,
    MessageFailed,
    UserTyping,
    UserOnline,
    UserOffline,
    AccountUpdated,
    Other(String),
}

/// Main trait for messaging platform implementations
#[async_trait]
pub trait MessagingPlatform: Send + Sync {
    /// Get platform identifier
    fn platform(&self) -> Platform;
    
    /// Get platform capabilities
    fn capabilities(&self) -> PlatformCapabilities;
    
    /// Send a message
    async fn send_message(
        &self,
        to: &str,
        content: MessageContent,
        context: Option<MessageContext>,
    ) -> CoreResult<PlatformMessageResult>;
    
    /// Send typing indicator
    async fn send_typing_indicator(&self, to: &str) -> CoreResult<()>;
    
    /// Mark message as read
    async fn mark_as_read(&self, message_id: &str) -> CoreResult<()>;
    
    /// Get message status
    async fn get_message_status(&self, message_id: &str) -> CoreResult<DeliveryStatus>;
    
    /// Setup webhook for receiving messages
    async fn setup_webhook(&self, webhook_url: &str) -> CoreResult<()>;
    
    /// Verify webhook signature (if supported)
    fn verify_webhook_signature(
        &self,
        body: &str,
        signature: &str,
        timestamp: Option<&str>,
    ) -> CoreResult<bool>;
    
    /// Parse incoming webhook event
    fn parse_webhook_event(&self, body: &str) -> CoreResult<Vec<PlatformWebhookEvent>>;
    
    /// Download media from platform
    async fn download_media(&self, media_id: &str) -> CoreResult<Vec<u8>>;
    
    /// Upload media to platform  
    async fn upload_media(&self, media: MediaContent) -> CoreResult<String>;
    
    /// Get user profile information
    async fn get_user_profile(&self, user_id: &str) -> CoreResult<Option<ContactInfo>>;
    
    /// Validate phone number or user identifier
    async fn validate_user_identifier(&self, identifier: &str) -> CoreResult<bool>;
}

/// Additional context for sending messages
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessageContext {
    /// Reply to message ID
    pub reply_to: Option<String>,
    /// Conversation/thread ID
    pub conversation_id: Option<Uuid>,
    /// Custom metadata
    pub metadata: HashMap<String, serde_json::Value>,
    /// Priority level
    pub priority: MessagePriority,
    /// Scheduled send time
    pub scheduled_for: Option<chrono::DateTime<chrono::Utc>>,
}

/// Message priority levels
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum MessagePriority {
    Low,
    Normal,
    High,
    Urgent,
}

/// Result of sending a message
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlatformMessageResult {
    /// Platform-specific message ID
    pub message_id: String,
    /// Initial delivery status
    pub status: DeliveryStatus,
    /// Platform identifier
    pub platform: Platform,
    /// Timestamp when sent
    pub sent_at: chrono::DateTime<chrono::Utc>,
    /// Any additional platform-specific data
    pub metadata: HashMap<String, serde_json::Value>,
}

impl Default for MessagePriority {
    fn default() -> Self {
        MessagePriority::Normal
    }
}

impl Default for MessageContext {
    fn default() -> Self {
        Self {
            reply_to: None,
            conversation_id: None,
            metadata: HashMap::new(),
            priority: MessagePriority::Normal,
            scheduled_for: None,
        }
    }
}

/// Helper trait for platform-specific message conversion
pub trait MessageConverter {
    /// Convert universal message content to platform-specific format
    fn to_platform_message(&self, content: &MessageContent) -> CoreResult<serde_json::Value>;
    
    /// Convert platform-specific message to universal format
    fn from_platform_message(&self, data: &serde_json::Value) -> CoreResult<MessageContent>;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_message_content_serialization() {
        let content = MessageContent::Text {
            text: "Hello, world!".to_string(),
        };
        
        let json = serde_json::to_string(&content).unwrap();
        let deserialized: MessageContent = serde_json::from_str(&json).unwrap();
        
        match deserialized {
            MessageContent::Text { text } => assert_eq!(text, "Hello, world!"),
            _ => panic!("Wrong message type"),
        }
    }

    #[test]
    fn test_platform_capabilities() {
        let caps = PlatformCapabilities {
            supports_media: true,
            supports_location: true,
            supports_contacts: true,
            supports_interactive: true,
            supports_templates: true,
            supports_read_receipts: true,
            supports_typing_indicators: true,
            max_message_length: Some(4096),
            supported_media_types: vec![MediaType::Image, MediaType::Video],
        };
        
        assert!(caps.supports_media);
        assert_eq!(caps.max_message_length, Some(4096));
    }

    #[test]
    fn test_message_priority_default() {
        let context = MessageContext::default();
        assert!(matches!(context.priority, MessagePriority::Normal));
    }
}