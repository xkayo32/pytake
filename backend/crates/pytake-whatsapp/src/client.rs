use crate::types::{ErrorResponse, Media, Message, MessageResponse, TemplateMessage, ContactInfo, ContactVerifyResponse, BusinessProfile};
use reqwest::{multipart, Client as HttpClient, Response};
use serde::{Deserialize, Serialize};
use std::path::Path;
use tokio::fs::File;
use tokio::io::AsyncReadExt;
use tracing::{debug, error, info};
use url::Url;

/// WhatsApp Cloud API configuration
#[derive(Debug, Clone)]
pub struct WhatsAppConfig {
    /// Access token for WhatsApp Business API
    pub access_token: String,
    /// Phone number ID for sending messages
    pub phone_number_id: String,
    /// Base URL for WhatsApp Cloud API (default: https://graph.facebook.com/v18.0)
    pub base_url: String,
    /// Webhook verify token
    pub webhook_verify_token: String,
    /// App secret for webhook signature verification
    pub app_secret: String,
}

impl Default for WhatsAppConfig {
    fn default() -> Self {
        Self {
            access_token: String::new(),
            phone_number_id: String::new(),
            base_url: "https://graph.facebook.com/v18.0".to_string(),
            webhook_verify_token: String::new(),
            app_secret: String::new(),
        }
    }
}

/// WhatsApp Cloud API client
#[derive(Debug)]
pub struct WhatsAppClient {
    config: WhatsAppConfig,
    http_client: HttpClient,
}

/// Media upload response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MediaUploadResponse {
    pub id: String,
}

/// Media info response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MediaInfoResponse {
    pub url: String,
    pub mime_type: String,
    pub sha256: String,
    pub file_size: u64,
    pub id: String,
    pub messaging_product: String,
}

impl WhatsAppClient {
    /// Create a new WhatsApp client
    pub fn new(config: WhatsAppConfig) -> Result<Self, WhatsAppError> {
        let http_client = HttpClient::builder()
            .user_agent("pytake-whatsapp/0.1.0")
            .timeout(std::time::Duration::from_secs(30))
            .build()
            .map_err(|e| WhatsAppError::HttpClient(e.to_string()))?;

        Ok(Self {
            config,
            http_client,
        })
    }

    /// Send a text message
    pub async fn send_text_message<S: Into<String>>(
        &self,
        to: S,
        text: S,
    ) -> Result<MessageResponse, WhatsAppError> {
        let message = Message::text(to, text);
        self.send_message(message).await
    }

    /// Send an image message from URL
    pub async fn send_image_url<S: Into<String>>(
        &self,
        to: S,
        image_url: S,
        caption: Option<S>,
    ) -> Result<MessageResponse, WhatsAppError> {
        let mut media = Media::from_url(image_url);
        if let Some(cap) = caption {
            media = media.with_caption(cap);
        }
        let message = Message::image(to, media);
        self.send_message(message).await
    }

    /// Send an image message from uploaded media ID
    pub async fn send_image_id<S: Into<String>>(
        &self,
        to: S,
        media_id: S,
        caption: Option<S>,
    ) -> Result<MessageResponse, WhatsAppError> {
        let mut media = Media::from_id(media_id);
        if let Some(cap) = caption {
            media = media.with_caption(cap);
        }
        let message = Message::image(to, media);
        self.send_message(message).await
    }

    /// Send a document message from URL
    pub async fn send_document_url<S: Into<String>>(
        &self,
        to: S,
        document_url: S,
        filename: Option<S>,
        caption: Option<S>,
    ) -> Result<MessageResponse, WhatsAppError> {
        let mut media = Media::from_url(document_url);
        if let Some(name) = filename {
            media = media.with_filename(name);
        }
        if let Some(cap) = caption {
            media = media.with_caption(cap);
        }
        let message = Message::document(to, media);
        self.send_message(message).await
    }

    /// Send a document message from uploaded media ID
    pub async fn send_document_id<S: Into<String>>(
        &self,
        to: S,
        media_id: S,
        filename: Option<S>,
        caption: Option<S>,
    ) -> Result<MessageResponse, WhatsAppError> {
        let mut media = Media::from_id(media_id);
        if let Some(name) = filename {
            media = media.with_filename(name);
        }
        if let Some(cap) = caption {
            media = media.with_caption(cap);
        }
        let message = Message::document(to, media);
        self.send_message(message).await
    }

    /// Send a template message
    pub async fn send_template_message<S: Into<String>>(
        &self,
        to: S,
        template: TemplateMessage,
    ) -> Result<MessageResponse, WhatsAppError> {
        let message = Message::template(to, template);
        self.send_message(message).await
    }

    /// Send a generic message
    pub async fn send_message(&self, message: Message) -> Result<MessageResponse, WhatsAppError> {
        let url = format!(
            "{}/{}/messages",
            self.config.base_url, self.config.phone_number_id
        );

        debug!("Sending message to: {}", message.to);
        debug!("Message content: {:?}", message.content);

        let response = self
            .http_client
            .post(&url)
            .header("Authorization", format!("Bearer {}", self.config.access_token))
            .header("Content-Type", "application/json")
            .json(&message)
            .send()
            .await
            .map_err(|e| WhatsAppError::HttpClient(e.to_string()))?;

        self.handle_response(response).await
    }

    /// Upload media file
    pub async fn upload_media<P: AsRef<Path>>(
        &self,
        file_path: P,
        mime_type: &str,
    ) -> Result<MediaUploadResponse, WhatsAppError> {
        let path = file_path.as_ref();
        let filename = path
            .file_name()
            .and_then(|n| n.to_str())
            .ok_or_else(|| WhatsAppError::InvalidFile("Invalid filename".to_string()))?;

        // Read file content
        let mut file = File::open(path)
            .await
            .map_err(|e| WhatsAppError::FileRead(e.to_string()))?;
        let mut buffer = Vec::new();
        file.read_to_end(&mut buffer)
            .await
            .map_err(|e| WhatsAppError::FileRead(e.to_string()))?;

        // Create multipart form
        let file_part = multipart::Part::bytes(buffer)
            .file_name(filename.to_string())
            .mime_str(mime_type)
            .map_err(|e| WhatsAppError::InvalidFile(e.to_string()))?;

        let form = multipart::Form::new()
            .part("file", file_part)
            .text("type", mime_type.to_string())
            .text("messaging_product", "whatsapp");

        let url = format!("{}/{}/media", self.config.base_url, self.config.phone_number_id);

        debug!("Uploading media file: {}", filename);

        let response = self
            .http_client
            .post(&url)
            .header("Authorization", format!("Bearer {}", self.config.access_token))
            .multipart(form)
            .send()
            .await
            .map_err(|e| WhatsAppError::HttpClient(e.to_string()))?;

        self.handle_response(response).await
    }

    /// Upload media from bytes
    pub async fn upload_media_bytes(
        &self,
        data: Vec<u8>,
        filename: &str,
        mime_type: &str,
    ) -> Result<MediaUploadResponse, WhatsAppError> {
        let file_part = multipart::Part::bytes(data)
            .file_name(filename.to_string())
            .mime_str(mime_type)
            .map_err(|e| WhatsAppError::InvalidFile(e.to_string()))?;

        let form = multipart::Form::new()
            .part("file", file_part)
            .text("type", mime_type.to_string())
            .text("messaging_product", "whatsapp");

        let url = format!("{}/{}/media", self.config.base_url, self.config.phone_number_id);

        debug!("Uploading media bytes: {}", filename);

        let response = self
            .http_client
            .post(&url)
            .header("Authorization", format!("Bearer {}", self.config.access_token))
            .multipart(form)
            .send()
            .await
            .map_err(|e| WhatsAppError::HttpClient(e.to_string()))?;

        self.handle_response(response).await
    }

    /// Get media info by ID
    pub async fn get_media_info(&self, media_id: &str) -> Result<MediaInfoResponse, WhatsAppError> {
        let url = format!("{}/{}", self.config.base_url, media_id);

        debug!("Getting media info for ID: {}", media_id);

        let response = self
            .http_client
            .get(&url)
            .header("Authorization", format!("Bearer {}", self.config.access_token))
            .send()
            .await
            .map_err(|e| WhatsAppError::HttpClient(e.to_string()))?;

        self.handle_response(response).await
    }

    /// Download media by URL
    pub async fn download_media(&self, media_url: &str) -> Result<Vec<u8>, WhatsAppError> {
        debug!("Downloading media from URL: {}", media_url);

        let response = self
            .http_client
            .get(media_url)
            .header("Authorization", format!("Bearer {}", self.config.access_token))
            .send()
            .await
            .map_err(|e| WhatsAppError::HttpClient(e.to_string()))?;

        if !response.status().is_success() {
            error!("Failed to download media: {}", response.status());
            return Err(WhatsAppError::ApiError(format!(
                "Failed to download media: {}",
                response.status()
            )));
        }

        let bytes = response
            .bytes()
            .await
            .map_err(|e| WhatsAppError::HttpClient(e.to_string()))?;

        Ok(bytes.to_vec())
    }

    /// Mark message as read
    pub async fn mark_message_read(&self, message_id: &str) -> Result<(), WhatsAppError> {
        let url = format!(
            "{}/{}/messages",
            self.config.base_url, self.config.phone_number_id
        );

        let body = serde_json::json!({
            "messaging_product": "whatsapp",
            "status": "read",
            "message_id": message_id
        });

        debug!("Marking message as read: {}", message_id);

        let response = self
            .http_client
            .post(&url)
            .header("Authorization", format!("Bearer {}", self.config.access_token))
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await
            .map_err(|e| WhatsAppError::HttpClient(e.to_string()))?;

        if response.status().is_success() {
            info!("Message marked as read: {}", message_id);
            Ok(())
        } else {
            let error_text = response.text().await.unwrap_or_default();
            error!("Failed to mark message as read: {}", error_text);
            Err(WhatsAppError::ApiError(error_text))
        }
    }

    /// Handle HTTP response and parse result or error
    async fn handle_response<T>(&self, response: Response) -> Result<T, WhatsAppError>
    where
        T: for<'de> Deserialize<'de>,
    {
        let status = response.status();
        let response_text = response
            .text()
            .await
            .map_err(|e| WhatsAppError::HttpClient(e.to_string()))?;

        debug!("API response status: {}", status);
        debug!("API response body: {}", response_text);

        if status.is_success() {
            serde_json::from_str(&response_text)
                .map_err(|e| WhatsAppError::ParseError(e.to_string()))
        } else {
            // Try to parse as WhatsApp error response
            match serde_json::from_str::<ErrorResponse>(&response_text) {
                Ok(error_response) => {
                    error!("WhatsApp API error: {:?}", error_response.error);
                    Err(WhatsAppError::ApiError(error_response.error.message))
                }
                Err(_) => {
                    error!("HTTP error {}: {}", status, response_text);
                    Err(WhatsAppError::HttpError {
                        status: status.as_u16(),
                        message: response_text,
                    })
                }
            }
        }
    }

    /// Validate phone number format
    pub fn validate_phone_number(phone: &str) -> Result<String, WhatsAppError> {
        let cleaned = phone.chars().filter(|c| c.is_ascii_digit()).collect::<String>();
        
        if cleaned.len() < 10 || cleaned.len() > 15 {
            return Err(WhatsAppError::InvalidPhoneNumber(format!(
                "Invalid phone number length: {}",
                phone
            )));
        }

        // Ensure it starts with country code
        if !cleaned.starts_with('+') && cleaned.len() >= 10 {
            Ok(cleaned)
        } else {
            Ok(cleaned.trim_start_matches('+').to_string())
        }
    }

    /// Validate URL format
    pub fn validate_url(url: &str) -> Result<String, WhatsAppError> {
        match Url::parse(url) {
            Ok(parsed_url) => {
                if parsed_url.scheme() == "http" || parsed_url.scheme() == "https" {
                    Ok(url.to_string())
                } else {
                    Err(WhatsAppError::InvalidUrl(format!(
                        "URL must use HTTP or HTTPS: {}",
                        url
                    )))
                }
            }
            Err(_) => Err(WhatsAppError::InvalidUrl(format!("Invalid URL: {}", url))),
        }
    }

    /// Verify if a phone number has WhatsApp
    pub async fn verify_contact(&self, phone_number: &str) -> Result<ContactInfo, WhatsAppError> {
        let cleaned_phone = Self::validate_phone_number(phone_number)?;
        
        let url = format!(
            "{}/{}/phone_numbers",
            self.config.base_url, self.config.phone_number_id
        );

        let body = serde_json::json!({
            "blocking": "wait",
            "contacts": [cleaned_phone],
            "force_check": true
        });

        debug!("Verifying contact: {}", cleaned_phone);

        let response = self
            .http_client
            .post(&url)
            .header("Authorization", format!("Bearer {}", self.config.access_token))
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await
            .map_err(|e| WhatsAppError::HttpClient(e.to_string()))?;

        let result: ContactVerifyResponse = self.handle_response(response).await?;
        
        if let Some(contact) = result.contacts.into_iter().next() {
            Ok(contact)
        } else {
            Err(WhatsAppError::ApiError("No contact info returned".to_string()))
        }
    }

    /// Batch verify multiple phone numbers
    pub async fn batch_verify_contacts(&self, phone_numbers: Vec<String>) -> Result<Vec<ContactInfo>, WhatsAppError> {
        // WhatsApp API typically limits batch requests to 20 contacts
        const BATCH_SIZE: usize = 20;
        
        if phone_numbers.is_empty() {
            return Ok(vec![]);
        }

        let mut all_results = Vec::new();
        
        // Process in batches
        for chunk in phone_numbers.chunks(BATCH_SIZE) {
            let cleaned_phones: Result<Vec<String>, _> = chunk
                .iter()
                .map(|p| Self::validate_phone_number(p))
                .collect();
            
            let cleaned_phones = cleaned_phones?;
            
            let url = format!(
                "{}/{}/phone_numbers",
                self.config.base_url, self.config.phone_number_id
            );

            let body = serde_json::json!({
                "blocking": "wait",
                "contacts": cleaned_phones,
                "force_check": true
            });

            debug!("Batch verifying {} contacts", cleaned_phones.len());

            let response = self
                .http_client
                .post(&url)
                .header("Authorization", format!("Bearer {}", self.config.access_token))
                .header("Content-Type", "application/json")
                .json(&body)
                .send()
                .await
                .map_err(|e| WhatsAppError::HttpClient(e.to_string()))?;

            let result: ContactVerifyResponse = self.handle_response(response).await?;
            all_results.extend(result.contacts);
            
            // Add a small delay between batches to avoid rate limiting
            if chunk.len() == BATCH_SIZE {
                tokio::time::sleep(std::time::Duration::from_millis(100)).await;
            }
        }
        
        Ok(all_results)
    }

    /// Get business profile information
    pub async fn get_business_profile(&self, phone_number_id: Option<&str>) -> Result<BusinessProfile, WhatsAppError> {
        let phone_id = phone_number_id.unwrap_or(&self.config.phone_number_id);
        
        let url = format!(
            "{}/{}/whatsapp_business_profile",
            self.config.base_url, phone_id
        );

        debug!("Getting business profile for: {}", phone_id);

        let response = self
            .http_client
            .get(&url)
            .header("Authorization", format!("Bearer {}", self.config.access_token))
            .query(&[("fields", "about,address,description,email,profile_picture_url,websites,vertical")])
            .send()
            .await
            .map_err(|e| WhatsAppError::HttpClient(e.to_string()))?;

        self.handle_response(response).await
    }
}

/// WhatsApp API errors
#[derive(Debug, thiserror::Error)]
pub enum WhatsAppError {
    #[error("HTTP client error: {0}")]
    HttpClient(String),
    #[error("HTTP error {status}: {message}")]
    HttpError { status: u16, message: String },
    #[error("API error: {0}")]
    ApiError(String),
    #[error("Parse error: {0}")]
    ParseError(String),
    #[error("File read error: {0}")]
    FileRead(String),
    #[error("Invalid file: {0}")]
    InvalidFile(String),
    #[error("Invalid phone number: {0}")]
    InvalidPhoneNumber(String),
    #[error("Invalid URL: {0}")]
    InvalidUrl(String),
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_phone_number() {
        assert!(WhatsAppClient::validate_phone_number("1234567890").is_ok());
        assert!(WhatsAppClient::validate_phone_number("+1234567890").is_ok());
        assert!(WhatsAppClient::validate_phone_number("123-456-7890").is_ok());
        assert!(WhatsAppClient::validate_phone_number("123").is_err());
        assert!(WhatsAppClient::validate_phone_number("12345678901234567890").is_err());
    }

    #[test]
    fn test_validate_url() {
        assert!(WhatsAppClient::validate_url("https://example.com/image.jpg").is_ok());
        assert!(WhatsAppClient::validate_url("http://example.com/doc.pdf").is_ok());
        assert!(WhatsAppClient::validate_url("ftp://example.com/file.txt").is_err());
        assert!(WhatsAppClient::validate_url("invalid-url").is_err());
    }
}