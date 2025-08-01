//! WhatsApp implementation of the MessagingPlatform trait

use crate::errors::{CoreError, CoreResult};
use crate::messaging::{
    Platform, MessagingPlatform, MessageContent, MediaContent, ContactInfo, MessageContext,
    PlatformMessageResult, DeliveryStatus, PlatformCapabilities, MediaType, WebhookEventType,
    PlatformWebhookEvent, MessageConverter, ContactName, ContactPhone,
};
use async_trait::async_trait;
use chrono::Utc;
use serde_json::Value;
use std::collections::HashMap;
use tracing::{debug, error, info};

/// WhatsApp platform implementation (simplified for multi-platform architecture)
pub struct WhatsAppPlatform {
    access_token: String,
    phone_number_id: String,
    webhook_verify_token: Option<String>,
}

impl WhatsAppPlatform {
    /// Create new WhatsApp platform instance
    pub fn new(access_token: String, phone_number_id: String) -> Self {
        Self { 
            access_token,
            phone_number_id,
            webhook_verify_token: None,
        }
    }

    /// Set webhook verify token
    pub fn with_webhook_verify_token(mut self, token: String) -> Self {
        self.webhook_verify_token = Some(token);
        self
    }

    /// Get access token
    pub fn access_token(&self) -> &str {
        &self.access_token
    }

    /// Get phone number ID
    pub fn phone_number_id(&self) -> &str {
        &self.phone_number_id
    }
}

#[async_trait]
impl MessagingPlatform for WhatsAppPlatform {
    fn platform(&self) -> Platform {
        Platform::WhatsApp
    }

    fn capabilities(&self) -> PlatformCapabilities {
        PlatformCapabilities {
            supports_media: true,
            supports_location: true,
            supports_contacts: true,
            supports_interactive: true,
            supports_templates: true,
            supports_read_receipts: true,
            supports_typing_indicators: true,
            max_message_length: Some(4096),
            supported_media_types: vec![
                MediaType::Image,
                MediaType::Video,
                MediaType::Audio,
                MediaType::Document,
                MediaType::Sticker,
                MediaType::Voice,
            ],
        }
    }

    async fn send_message(
        &self,
        to: &str,
        content: MessageContent,
        _context: Option<MessageContext>,
    ) -> CoreResult<PlatformMessageResult> {
        debug!("Sending WhatsApp message to: {} (simulated)", to);

        // TODO: Implement actual WhatsApp API calls
        // For now, return a simulated success response
        let message_id = format!("wa_msg_{}", uuid::Uuid::new_v4());
        
        Ok(PlatformMessageResult {
            message_id,
            status: DeliveryStatus::Sent,
            platform: Platform::WhatsApp,
            sent_at: Utc::now(),
            metadata: HashMap::new(),
        })
    }

    async fn send_typing_indicator(&self, to: &str) -> CoreResult<()> {
        debug!("Sending typing indicator to: {}", to);
        // WhatsApp doesn't have a direct typing indicator API in Cloud API
        // This would be implemented if/when available
        Ok(())
    }

    async fn mark_as_read(&self, message_id: &str) -> CoreResult<()> {
        debug!("Marking message as read: {} (simulated)", message_id);
        // TODO: Implement actual WhatsApp API call
        Ok(())
    }

    async fn get_message_status(&self, message_id: &str) -> CoreResult<DeliveryStatus> {
        debug!("Getting message status: {} (simulated)", message_id);
        // TODO: Implement actual WhatsApp API call
        Ok(DeliveryStatus::Delivered)
    }

    async fn setup_webhook(&self, webhook_url: &str) -> CoreResult<()> {
        info!("Setting up WhatsApp webhook: {} (simulated)", webhook_url);
        // TODO: Implement actual WhatsApp API call
        Ok(())
    }

    fn verify_webhook_signature(
        &self,
        _body: &str,
        _signature: &str,
        _timestamp: Option<&str>,
    ) -> CoreResult<bool> {
        debug!("Verifying WhatsApp webhook signature (simulated)");
        // TODO: Implement actual signature verification
        Ok(true)
    }

    fn parse_webhook_event(&self, body: &str) -> CoreResult<Vec<PlatformWebhookEvent>> {
        debug!("Parsing WhatsApp webhook event (simulated)");
        
        let _webhook_data: Value = serde_json::from_str(body)
            .map_err(|e| CoreError::validation(&format!("Invalid webhook JSON: {}", e)))?;

        // TODO: Implement actual WhatsApp webhook parsing
        // For now, return a simulated event
        let events = vec![PlatformWebhookEvent {
            platform: Platform::WhatsApp,
            timestamp: Utc::now(),
            event_type: WebhookEventType::MessageReceived,
            event_data: serde_json::json!({"simulated": true}),
        }];

        Ok(events)
    }

    async fn download_media(&self, media_id: &str) -> CoreResult<Vec<u8>> {
        debug!("Downloading WhatsApp media: {} (simulated)", media_id);
        // TODO: Implement actual WhatsApp media download
        Ok(vec![0u8; 1024]) // Simulated media bytes
    }

    async fn upload_media(&self, media: MediaContent) -> CoreResult<String> {
        debug!("Uploading media to WhatsApp (simulated)");
        // TODO: Implement actual WhatsApp media upload
        Ok(format!("wa_media_{}", uuid::Uuid::new_v4()))
    }

    async fn get_user_profile(&self, user_id: &str) -> CoreResult<Option<ContactInfo>> {
        debug!("Getting WhatsApp user profile: {} (simulated)", user_id);
        
        // TODO: Implement actual WhatsApp profile fetch
        // Return a simulated profile
        let contact = ContactInfo {
            name: ContactName {
                formatted_name: format!("User {}", user_id),
                first_name: None,
                last_name: None,
                middle_name: None,
                suffix: None,
                prefix: None,
            },
            phones: vec![ContactPhone {
                phone: user_id.to_string(),
                phone_type: Some("MAIN".to_string()),
                wa_id: Some(user_id.to_string()),
            }],
            emails: Vec::new(),
            urls: Vec::new(),
            addresses: Vec::new(),
            organization: None,
            birthday: None,
        };
        Ok(Some(contact))
    }

    async fn validate_user_identifier(&self, identifier: &str) -> CoreResult<bool> {
        debug!("Validating WhatsApp identifier: {}", identifier);
        
        // Basic phone number validation for WhatsApp
        let cleaned = identifier.replace(&['+', '-', ' ', '(', ')'][..], "");
        let is_valid = cleaned.len() >= 10 && cleaned.len() <= 15 && cleaned.chars().all(|c| c.is_ascii_digit());
        
        Ok(is_valid)
    }
}

impl MessageConverter for WhatsAppPlatform {
    fn to_platform_message(&self, content: &MessageContent) -> CoreResult<Value> {
        let json_content = match content {
            MessageContent::Text { text } => {
                serde_json::json!({
                    "type": "text",
                    "text": { "body": text }
                })
            }
            MessageContent::Media { media_type, url, caption, filename, mime_type, .. } => {
                let media_type_str = match media_type {
                    MediaType::Image => "image",
                    MediaType::Video => "video", 
                    MediaType::Audio => "audio",
                    MediaType::Document => "document",
                    MediaType::Sticker => "sticker",
                    MediaType::Voice => "audio", // Voice notes are audio in WhatsApp
                    MediaType::File => "document",
                };
                
                let mut media_obj = serde_json::json!({
                    "link": url,
                });
                
                if let Some(caption) = caption {
                    media_obj["caption"] = serde_json::Value::String(caption.clone());
                }
                
                if let Some(filename) = filename {
                    media_obj["filename"] = serde_json::Value::String(filename.clone());
                }

                serde_json::json!({
                    "type": media_type_str,
                    media_type_str: media_obj
                })
            }
            MessageContent::Location { latitude, longitude, address, name } => {
                let mut location_obj = serde_json::json!({
                    "latitude": latitude,
                    "longitude": longitude
                });
                
                if let Some(address) = address {
                    location_obj["address"] = serde_json::Value::String(address.clone());
                }
                
                if let Some(name) = name {
                    location_obj["name"] = serde_json::Value::String(name.clone());
                }

                serde_json::json!({
                    "type": "location",
                    "location": location_obj
                })
            }
            _ => {
                return Err(CoreError::validation("Message type not supported for WhatsApp conversion"));
            }
        };

        Ok(json_content)
    }

    fn from_platform_message(&self, data: &Value) -> CoreResult<MessageContent> {
        let message_type = data.get("type")
            .and_then(|t| t.as_str())
            .ok_or_else(|| CoreError::validation("Missing message type in WhatsApp data"))?;

        let content = match message_type {
            "text" => {
                let text = data.get("text")
                    .and_then(|t| t.get("body"))
                    .and_then(|b| b.as_str())
                    .ok_or_else(|| CoreError::validation("Missing text body in WhatsApp message"))?;
                
                MessageContent::Text {
                    text: text.to_string(),
                }
            }
            "image" | "video" | "audio" | "document" | "sticker" => {
                let media_obj = data.get(message_type)
                    .ok_or_else(|| CoreError::validation(&format!("Missing {} object in WhatsApp message", message_type)))?;
                
                let url = media_obj.get("link").or_else(|| media_obj.get("id"))
                    .and_then(|u| u.as_str())
                    .ok_or_else(|| CoreError::validation("Missing media URL/ID in WhatsApp message"))?;
                
                let media_type = match message_type {
                    "image" => MediaType::Image,
                    "video" => MediaType::Video,
                    "audio" => MediaType::Audio,
                    "document" => MediaType::Document,
                    "sticker" => MediaType::Sticker,
                    _ => MediaType::File,
                };
                
                MessageContent::Media {
                    media_type,
                    url: url.to_string(),
                    caption: media_obj.get("caption").and_then(|c| c.as_str()).map(|s| s.to_string()),
                    filename: media_obj.get("filename").and_then(|f| f.as_str()).map(|s| s.to_string()),
                    mime_type: media_obj.get("mime_type").and_then(|m| m.as_str()).unwrap_or("application/octet-stream").to_string(),
                    size_bytes: None,
                }
            }
            "location" => {
                let location_obj = data.get("location")
                    .ok_or_else(|| CoreError::validation("Missing location object in WhatsApp message"))?;
                
                let latitude = location_obj.get("latitude")
                    .and_then(|lat| lat.as_f64())
                    .ok_or_else(|| CoreError::validation("Missing latitude in WhatsApp location message"))?;
                
                let longitude = location_obj.get("longitude")
                    .and_then(|lng| lng.as_f64())
                    .ok_or_else(|| CoreError::validation("Missing longitude in WhatsApp location message"))?;
                
                MessageContent::Location {
                    latitude,
                    longitude,
                    address: location_obj.get("address").and_then(|a| a.as_str()).map(|s| s.to_string()),
                    name: location_obj.get("name").and_then(|n| n.as_str()).map(|s| s.to_string()),
                }
            }
            _ => {
                return Err(CoreError::validation(&format!("Unsupported WhatsApp message type: {}", message_type)));
            }
        };

        Ok(content)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_platform_capabilities() {
        let platform = WhatsAppPlatform::new("test_token".to_string(), "test_phone".to_string());
        let caps = platform.capabilities();
        
        assert_eq!(caps.supports_media, true);
        assert_eq!(caps.supports_interactive, true);
        assert_eq!(caps.max_message_length, Some(4096));
    }

    #[test]
    fn test_message_conversion() {
        let platform = WhatsAppPlatform::new("test_token".to_string(), "test_phone".to_string());
        
        let content = MessageContent::Text {
            text: "Hello, World!".to_string(),
        };
        
        let platform_msg = platform.to_platform_message(&content).unwrap();
        assert_eq!(platform_msg["type"], "text");
        assert_eq!(platform_msg["text"]["body"], "Hello, World!");
    }

    #[tokio::test]
    async fn test_validate_user_identifier() {
        let platform = WhatsAppPlatform::new("test_token".to_string(), "test_phone".to_string());
        
        assert!(platform.validate_user_identifier("5511999999999").await.unwrap());
        assert!(platform.validate_user_identifier("+55 11 99999-9999").await.unwrap());
        assert!(!platform.validate_user_identifier("invalid").await.unwrap());
        assert!(!platform.validate_user_identifier("123").await.unwrap()); // Too short
    }
}