use crate::types::{Contact, Media, MessageStatus};
use hmac::{Hmac, Mac};
use serde::{Deserialize, Serialize};
use sha2::Sha256;
use std::collections::HashMap;

type HmacSha256 = Hmac<Sha256>;

/// Webhook verification challenge
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebhookChallenge {
    #[serde(rename = "hub.mode")]
    pub mode: String,
    #[serde(rename = "hub.verify_token")]
    pub verify_token: String,
    #[serde(rename = "hub.challenge")]
    pub challenge: String,
}

/// Webhook entry containing changes
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebhookEntry {
    pub id: String,
    pub changes: Vec<WebhookChange>,
}

/// Webhook change data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebhookChange {
    pub value: WebhookValue,
    pub field: String,
}

/// Webhook value containing messages or statuses
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebhookValue {
    pub messaging_product: String,
    pub metadata: WebhookMetadata,
    pub contacts: Option<Vec<Contact>>,
    pub messages: Option<Vec<InboundMessage>>,
    pub statuses: Option<Vec<MessageStatusUpdate>>,
    pub errors: Option<Vec<WebhookError>>,
}

/// Webhook metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebhookMetadata {
    pub display_phone_number: String,
    pub phone_number_id: String,
}

/// Inbound message from webhook
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InboundMessage {
    pub id: String,
    pub from: String,
    pub timestamp: String,
    #[serde(rename = "type")]
    pub message_type: String,
    pub context: Option<InboundMessageContext>,
    pub text: Option<InboundTextMessage>,
    pub image: Option<Media>,
    pub document: Option<Media>,
    pub audio: Option<Media>,
    pub video: Option<Media>,
    pub location: Option<InboundLocationMessage>,
    pub contacts: Option<Vec<InboundContactMessage>>,
    pub button: Option<InboundButtonMessage>,
    pub interactive: Option<InboundInteractiveMessage>,
}

/// Inbound message context
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InboundMessageContext {
    pub from: String,
    pub id: String,
    pub mentions: Option<Vec<String>>,
}

/// Inbound text message
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InboundTextMessage {
    pub body: String,
}

/// Inbound location message
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InboundLocationMessage {
    pub longitude: f64,
    pub latitude: f64,
    pub name: Option<String>,
    pub address: Option<String>,
}

/// Inbound contact message
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InboundContactMessage {
    pub addresses: Option<Vec<ContactAddress>>,
    pub birthday: Option<String>,
    pub emails: Option<Vec<ContactEmail>>,
    pub name: ContactName,
    pub org: Option<ContactOrg>,
    pub phones: Option<Vec<ContactPhone>>,
    pub urls: Option<Vec<ContactUrl>>,
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
    #[serde(rename = "type")]
    pub address_type: Option<String>,
}

/// Contact email
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContactEmail {
    pub email: String,
    #[serde(rename = "type")]
    pub email_type: Option<String>,
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

/// Contact organization
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContactOrg {
    pub company: Option<String>,
    pub department: Option<String>,
    pub title: Option<String>,
}

/// Contact phone
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContactPhone {
    pub phone: String,
    pub wa_id: Option<String>,
    #[serde(rename = "type")]
    pub phone_type: Option<String>,
}

/// Contact URL
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContactUrl {
    pub url: String,
    #[serde(rename = "type")]
    pub url_type: Option<String>,
}

/// Inbound button message
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InboundButtonMessage {
    pub payload: String,
    pub text: String,
}

/// Inbound interactive message
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InboundInteractiveMessage {
    #[serde(rename = "type")]
    pub interactive_type: String,
    pub button_reply: Option<InboundButtonReply>,
    pub list_reply: Option<InboundListReply>,
}

/// Inbound button reply
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InboundButtonReply {
    pub id: String,
    pub title: String,
}

/// Inbound list reply
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InboundListReply {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
}

/// Message status update from webhook
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessageStatusUpdate {
    pub id: String,
    pub status: MessageStatus,
    pub timestamp: String,
    pub recipient_id: String,
    pub conversation: Option<ConversationInfo>,
    pub pricing: Option<PricingInfo>,
    pub errors: Option<Vec<WebhookError>>,
}

/// Conversation information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConversationInfo {
    pub id: String,
    pub expiration_timestamp: Option<String>,
    pub origin: ConversationOrigin,
}

/// Conversation origin
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConversationOrigin {
    #[serde(rename = "type")]
    pub origin_type: String,
}

/// Pricing information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PricingInfo {
    pub billable: bool,
    pub pricing_model: String,
    pub category: String,
}

/// Webhook error
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebhookError {
    pub code: i32,
    pub title: String,
    pub message: String,
    pub error_data: Option<HashMap<String, serde_json::Value>>,
}

/// Complete webhook payload
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebhookPayload {
    pub object: String,
    pub entry: Vec<WebhookEntry>,
}

/// Webhook verification and processing utilities
pub struct WebhookProcessor {
    app_secret: String,
    verify_token: String,
}

impl WebhookProcessor {
    /// Create a new webhook processor
    pub fn new<S: Into<String>>(app_secret: S, verify_token: S) -> Self {
        Self {
            app_secret: app_secret.into(),
            verify_token: verify_token.into(),
        }
    }

    /// Verify webhook challenge
    pub fn verify_challenge(
        &self,
        challenge: &WebhookChallenge,
    ) -> Result<String, WebhookVerificationError> {
        if challenge.mode != "subscribe" {
            return Err(WebhookVerificationError::InvalidMode);
        }

        if challenge.verify_token != self.verify_token {
            return Err(WebhookVerificationError::InvalidToken);
        }

        Ok(challenge.challenge.clone())
    }

    /// Verify webhook signature
    pub fn verify_signature(
        &self,
        body: &str,
        signature: &str,
    ) -> Result<(), WebhookVerificationError> {
        // Remove 'sha256=' prefix if present
        let signature = signature.strip_prefix("sha256=").unwrap_or(signature);
        
        // Decode hex signature
        let expected_signature = hex::decode(signature)
            .map_err(|_| WebhookVerificationError::InvalidSignature)?;

        // Calculate HMAC
        let mut mac = HmacSha256::new_from_slice(self.app_secret.as_bytes())
            .map_err(|_| WebhookVerificationError::InvalidSecret)?;
        mac.update(body.as_bytes());
        
        // Verify signature
        mac.verify_slice(&expected_signature)
            .map_err(|_| WebhookVerificationError::SignatureMismatch)?;

        Ok(())
    }

    /// Process webhook payload
    pub fn process_payload(
        &self,
        body: &str,
        signature: Option<&str>,
    ) -> Result<WebhookPayload, WebhookProcessingError> {
        // Verify signature if provided
        if let Some(sig) = signature {
            self.verify_signature(body, sig)
                .map_err(WebhookProcessingError::Verification)?;
        }

        // Parse JSON payload
        let payload: WebhookPayload = serde_json::from_str(body)
            .map_err(WebhookProcessingError::InvalidJson)?;

        Ok(payload)
    }

    /// Extract messages from webhook payload
    pub fn extract_messages<'a>(&self, payload: &'a WebhookPayload) -> Vec<&'a InboundMessage> {
        payload
            .entry
            .iter()
            .flat_map(|entry| &entry.changes)
            .flat_map(|change| &change.value.messages)
            .flatten()
            .collect()
    }

    /// Extract status updates from webhook payload
    pub fn extract_status_updates<'a>(&self, payload: &'a WebhookPayload) -> Vec<&'a MessageStatusUpdate> {
        payload
            .entry
            .iter()
            .flat_map(|entry| &entry.changes)
            .flat_map(|change| &change.value.statuses)
            .flatten()
            .collect()
    }
}

/// Webhook verification errors
#[derive(Debug, thiserror::Error)]
pub enum WebhookVerificationError {
    #[error("Invalid webhook mode")]
    InvalidMode,
    #[error("Invalid verify token")]
    InvalidToken,
    #[error("Invalid signature format")]
    InvalidSignature,
    #[error("Invalid app secret")]
    InvalidSecret,
    #[error("Signature verification failed")]
    SignatureMismatch,
}

/// Webhook processing errors
#[derive(Debug, thiserror::Error)]
pub enum WebhookProcessingError {
    #[error("Webhook verification failed: {0}")]
    Verification(WebhookVerificationError),
    #[error("Invalid JSON payload: {0}")]
    InvalidJson(serde_json::Error),
}

impl InboundMessage {
    /// Check if this is a text message
    pub fn is_text(&self) -> bool {
        self.message_type == "text"
    }

    /// Check if this is an image message
    pub fn is_image(&self) -> bool {
        self.message_type == "image"
    }

    /// Check if this is a document message
    pub fn is_document(&self) -> bool {
        self.message_type == "document"
    }

    /// Check if this is an audio message
    pub fn is_audio(&self) -> bool {
        self.message_type == "audio"
    }

    /// Check if this is a video message
    pub fn is_video(&self) -> bool {
        self.message_type == "video"
    }

    /// Check if this is a location message
    pub fn is_location(&self) -> bool {
        self.message_type == "location"
    }

    /// Check if this is a contact message
    pub fn is_contact(&self) -> bool {
        self.message_type == "contacts"
    }

    /// Check if this is a button message
    pub fn is_button(&self) -> bool {
        self.message_type == "button"
    }

    /// Check if this is an interactive message
    pub fn is_interactive(&self) -> bool {
        self.message_type == "interactive"
    }

    /// Get text content if this is a text message
    pub fn get_text(&self) -> Option<&str> {
        self.text.as_ref().map(|t| t.body.as_str())
    }

    /// Check if this message is a reply to another message
    pub fn is_reply(&self) -> bool {
        self.context.is_some()
    }

    /// Get the ID of the message this is replying to
    pub fn reply_to(&self) -> Option<&str> {
        self.context.as_ref().map(|c| c.id.as_str())
    }
}