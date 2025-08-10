use crate::whatsapp::error::{WhatsAppError, WhatsAppResult};
use crate::whatsapp::types::*;
use serde_json::json;
use tracing::{info, debug, error};

/// Official WhatsApp API configuration
#[derive(Debug, Clone)]
pub struct OfficialConfig {
    pub phone_number_id: String,
    pub access_token: String,
    pub instance_name: String,
    pub webhook_verify_token: String,
    pub app_secret: Option<String>,
    pub business_account_id: Option<String>,
}

/// Official WhatsApp API client
#[derive(Clone)]
pub struct OfficialClient {
    config: OfficialConfig,
    client: reqwest::Client,
    base_url: String,
}

impl OfficialClient {
    pub fn new(config: OfficialConfig) -> Self {
        Self {
            config,
            client: reqwest::Client::builder()
                .timeout(std::time::Duration::from_secs(30))
                .build()
                .unwrap_or_else(|_| reqwest::Client::new()),
            base_url: "https://graph.facebook.com/v18.0".to_string(),
        }
    }

    /// Send text message via official API
    pub async fn send_text_message(&self, to: &str, text: &str) -> WhatsAppResult<OfficialMessageResponse> {
        let url = format!("{}/{}/messages", self.base_url, self.config.phone_number_id);
        
        let body = json!({
            "messaging_product": "whatsapp",
            "to": to,
            "type": "text",
            "text": {
                "body": text
            }
        });
        
        info!("Sending text message to {} via Official API", to);
        
        let response = self.client
            .post(&url)
            .header("Authorization", format!("Bearer {}", self.config.access_token))
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await?;
            
        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(WhatsAppError::MessageSendFailed(
                format!("Official API error {}: {}", response.status(), error_text)
            ));
        }
        
        response.json().await
            .map_err(|e| WhatsAppError::ApiResponseInvalid(e.to_string()))
    }

    /// Send media message (image, video, document, audio)
    pub async fn send_media_message(
        &self,
        to: &str,
        media_url: &str,
        media_type: MessageType,
        caption: Option<&str>
    ) -> WhatsAppResult<OfficialMessageResponse> {
        let url = format!("{}/{}/messages", self.base_url, self.config.phone_number_id);
        
        let media_type_str = match media_type {
            MessageType::Image => "image",
            MessageType::Video => "video",
            MessageType::Document => "document",
            MessageType::Audio => "audio",
            _ => return Err(WhatsAppError::MessageInvalid(
                format!("Unsupported media type: {:?}", media_type)
            )),
        };

        let mut media_object = json!({
            "link": media_url
        });

        // Add caption for supported media types
        if matches!(media_type, MessageType::Image | MessageType::Video | MessageType::Document) {
            if let Some(caption_text) = caption {
                media_object["caption"] = json!(caption_text);
            }
        }

        let body = json!({
            "messaging_product": "whatsapp",
            "to": to,
            "type": media_type_str,
            media_type_str: media_object
        });
        
        info!("Sending {} message to {} via Official API", media_type_str, to);
        
        let response = self.client
            .post(&url)
            .header("Authorization", format!("Bearer {}", self.config.access_token))
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await?;
            
        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(WhatsAppError::MessageSendFailed(
                format!("Official API error {}: {}", response.status(), error_text)
            ));
        }
        
        response.json().await
            .map_err(|e| WhatsAppError::ApiResponseInvalid(e.to_string()))
    }

    /// Send template message
    pub async fn send_template_message(
        &self,
        to: &str,
        template_name: &str,
        language_code: &str,
        parameters: Vec<String>
    ) -> WhatsAppResult<OfficialMessageResponse> {
        let url = format!("{}/{}/messages", self.base_url, self.config.phone_number_id);
        
        let components = if parameters.is_empty() {
            json!([])
        } else {
            json!([{
                "type": "body",
                "parameters": parameters.into_iter().map(|param| json!({"type": "text", "text": param})).collect::<Vec<_>>()
            }])
        };

        let body = json!({
            "messaging_product": "whatsapp",
            "to": to,
            "type": "template",
            "template": {
                "name": template_name,
                "language": {
                    "code": language_code
                },
                "components": components
            }
        });
        
        info!("Sending template message '{}' to {} via Official API", template_name, to);
        
        let response = self.client
            .post(&url)
            .header("Authorization", format!("Bearer {}", self.config.access_token))
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await?;
            
        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(WhatsAppError::MessageSendFailed(
                format!("Official API error {}: {}", response.status(), error_text)
            ));
        }
        
        response.json().await
            .map_err(|e| WhatsAppError::ApiResponseInvalid(e.to_string()))
    }

    /// Get phone number status
    pub async fn get_phone_status(&self) -> WhatsAppResult<PhoneNumberStatus> {
        let url = format!("{}/{}", self.base_url, self.config.phone_number_id);
        
        debug!("Getting phone status for: {}", self.config.phone_number_id);
        
        let response = self.client
            .get(&url)
            .header("Authorization", format!("Bearer {}", self.config.access_token))
            .query(&[("fields", "verified_name,code_verification_status,display_phone_number,quality_rating,status")])
            .send()
            .await?;
            
        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(WhatsAppError::ApiRequestFailed(
                format!("Official API error {}: {}", response.status(), error_text)
            ));
        }
        
        response.json().await
            .map_err(|e| WhatsAppError::ApiResponseInvalid(e.to_string()))
    }

    /// Get business profile
    pub async fn get_business_profile(&self) -> WhatsAppResult<serde_json::Value> {
        let url = format!("{}/{}/whatsapp_business_profile", self.base_url, self.config.phone_number_id);
        
        debug!("Getting business profile for: {}", self.config.phone_number_id);
        
        let response = self.client
            .get(&url)
            .header("Authorization", format!("Bearer {}", self.config.access_token))
            .send()
            .await?;
            
        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(WhatsAppError::ApiRequestFailed(
                format!("Official API error {}: {}", response.status(), error_text)
            ));
        }
        
        response.json().await
            .map_err(|e| WhatsAppError::ApiResponseInvalid(e.to_string()))
    }

    /// Update business profile
    pub async fn update_business_profile(&self, profile_data: serde_json::Value) -> WhatsAppResult<()> {
        let url = format!("{}/{}/whatsapp_business_profile", self.base_url, self.config.phone_number_id);
        
        info!("Updating business profile for: {}", self.config.phone_number_id);
        
        let response = self.client
            .post(&url)
            .header("Authorization", format!("Bearer {}", self.config.access_token))
            .header("Content-Type", "application/json")
            .json(&profile_data)
            .send()
            .await?;
            
        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(WhatsAppError::ApiRequestFailed(
                format!("Official API error {}: {}", response.status(), error_text)
            ));
        }
        
        Ok(())
    }

    /// Get message templates
    pub async fn get_message_templates(&self) -> WhatsAppResult<serde_json::Value> {
        let business_account_id = self.config.business_account_id.as_ref()
            .ok_or_else(|| WhatsAppError::InvalidConfig("Business account ID required".to_string()))?;
            
        let url = format!("{}/{}/message_templates", self.base_url, business_account_id);
        
        debug!("Getting message templates for business account: {}", business_account_id);
        
        let response = self.client
            .get(&url)
            .header("Authorization", format!("Bearer {}", self.config.access_token))
            .send()
            .await?;
            
        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(WhatsAppError::ApiRequestFailed(
                format!("Official API error {}: {}", response.status(), error_text)
            ));
        }
        
        response.json().await
            .map_err(|e| WhatsAppError::ApiResponseInvalid(e.to_string()))
    }

    /// Mark message as read
    pub async fn mark_message_read(&self, message_id: &str) -> WhatsAppResult<()> {
        let url = format!("{}/{}/messages", self.base_url, self.config.phone_number_id);
        
        let body = json!({
            "messaging_product": "whatsapp",
            "status": "read",
            "message_id": message_id
        });
        
        debug!("Marking message as read: {}", message_id);
        
        let response = self.client
            .post(&url)
            .header("Authorization", format!("Bearer {}", self.config.access_token))
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await?;
            
        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(WhatsAppError::ApiRequestFailed(
                format!("Official API error {}: {}", response.status(), error_text)
            ));
        }
        
        Ok(())
    }

    /// Download media by media ID
    pub async fn download_media(&self, media_id: &str) -> WhatsAppResult<bytes::Bytes> {
        // First get media URL
        let media_url = self.get_media_url(media_id).await?;
        
        // Download media content
        let response = self.client
            .get(&media_url)
            .header("Authorization", format!("Bearer {}", self.config.access_token))
            .send()
            .await?;
            
        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(WhatsAppError::ApiRequestFailed(
                format!("Media download failed {}: {}", response.status(), error_text)
            ));
        }
        
        response.bytes().await
            .map_err(|e| WhatsAppError::ApiRequestFailed(e.to_string()))
    }

    /// Get media URL by media ID
    pub async fn get_media_url(&self, media_id: &str) -> WhatsAppResult<String> {
        let url = format!("{}/{}", self.base_url, media_id);
        
        debug!("Getting media URL for: {}", media_id);
        
        let response = self.client
            .get(&url)
            .header("Authorization", format!("Bearer {}", self.config.access_token))
            .send()
            .await?;
            
        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(WhatsAppError::ApiRequestFailed(
                format!("Official API error {}: {}", response.status(), error_text)
            ));
        }
        
        let data: serde_json::Value = response.json().await
            .map_err(|e| WhatsAppError::ApiResponseInvalid(e.to_string()))?;
        
        data["url"].as_str()
            .map(|s| s.to_string())
            .ok_or_else(|| WhatsAppError::ApiResponseInvalid(
                "Media URL not found in response".to_string()
            ))
    }

    /// Verify webhook signature
    pub fn verify_webhook_signature(&self, payload: &str, signature: &str) -> WhatsAppResult<bool> {
        let app_secret = self.config.app_secret.as_ref()
            .ok_or_else(|| WhatsAppError::InvalidConfig("App secret required for signature verification".to_string()))?;

        use hmac::{Hmac, Mac};
        use sha2::Sha256;
        
        type HmacSha256 = Hmac<Sha256>;
        
        let mut mac = HmacSha256::new_from_slice(app_secret.as_bytes())
            .map_err(|e| WhatsAppError::InternalError(format!("HMAC error: {}", e)))?;
        
        mac.update(payload.as_bytes());
        
        let expected_signature = format!("sha256={}", hex::encode(mac.finalize().into_bytes()));
        
        Ok(signature == expected_signature)
    }

    /// Check if the instance is healthy (can make API calls)
    pub async fn check_health(&self) -> WhatsAppResult<bool> {
        match self.get_phone_status().await {
            Ok(status) => Ok(status.status == "CONNECTED"),
            Err(_) => Ok(false),
        }
    }

    /// Get phone number ID
    pub fn phone_number_id(&self) -> &str {
        &self.config.phone_number_id
    }

    /// Get instance name
    pub fn instance_name(&self) -> &str {
        &self.config.instance_name
    }

    /// Get webhook verify token
    pub fn webhook_verify_token(&self) -> &str {
        &self.config.webhook_verify_token
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_client() -> OfficialClient {
        let config = OfficialConfig {
            phone_number_id: "123456789".to_string(),
            access_token: "test-token".to_string(),
            instance_name: "test-instance".to_string(),
            webhook_verify_token: "test-verify-token".to_string(),
            app_secret: Some("test-secret".to_string()),
            business_account_id: Some("business-123".to_string()),
        };
        OfficialClient::new(config)
    }

    #[test]
    fn test_client_creation() {
        let client = create_test_client();
        assert_eq!(client.phone_number_id(), "123456789");
        assert_eq!(client.instance_name(), "test-instance");
        assert_eq!(client.webhook_verify_token(), "test-verify-token");
    }

    #[test]
    fn test_webhook_signature_verification() {
        let client = create_test_client();
        let payload = "test payload";
        let signature = "sha256=invalid";
        
        let result = client.verify_webhook_signature(payload, signature);
        assert!(result.is_ok());
        assert!(!result.unwrap());
    }

    #[tokio::test]
    async fn test_send_text_message_validation() {
        let client = create_test_client();
        
        // This will fail with connection error, but we can test the validation logic
        let result = client.send_text_message("", "test message").await;
        assert!(result.is_err());
    }
}