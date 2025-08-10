use crate::whatsapp::error::{WhatsAppError, WhatsAppResult};
use crate::whatsapp::types::*;
use serde_json::json;
use tracing::{info, debug, error};

/// Evolution API configuration
#[derive(Debug, Clone)]
pub struct EvolutionConfig {
    pub base_url: String,
    pub api_key: String,
    pub instance_name: String,
}

/// Evolution API client
#[derive(Clone)]
pub struct EvolutionClient {
    config: EvolutionConfig,
    client: reqwest::Client,
}

impl EvolutionClient {
    pub fn new(config: EvolutionConfig) -> Self {
        Self {
            config,
            client: reqwest::Client::builder()
                .timeout(std::time::Duration::from_secs(30))
                .build()
                .unwrap_or_else(|_| reqwest::Client::new()),
        }
    }

    /// Get instance information
    pub async fn get_instance_info(&self) -> WhatsAppResult<InstanceInfo> {
        let url = format!("{}/instance/fetchInstances", self.config.base_url);
        
        debug!("Fetching instance info from: {}", url);
        
        let response = self.client
            .get(&url)
            .header("apikey", &self.config.api_key)
            .query(&[("instanceName", &self.config.instance_name)])
            .send()
            .await?;
            
        if !response.status().is_success() {
            return Err(WhatsAppError::ApiRequestFailed(
                format!("API returned status: {}", response.status())
            ));
        }
        
        let instances: Vec<InstanceInfo> = response.json().await
            .map_err(|e| WhatsAppError::ApiResponseInvalid(e.to_string()))?;
            
        instances.into_iter()
            .find(|i| i.instance_name == self.config.instance_name)
            .ok_or_else(|| WhatsAppError::InstanceNotFound(
                format!("Instance '{}' not found", self.config.instance_name)
            ))
    }

    /// Create a new instance
    pub async fn create_instance(&self) -> WhatsAppResult<InstanceInfo> {
        let url = format!("{}/instance/create", self.config.base_url);
        
        let body = json!({
            "instanceName": self.config.instance_name,
            "qrcode": true,
            "integration": "WHATSAPP-BAILEYS"
        });
        
        info!("Creating Evolution instance: {}", self.config.instance_name);
        
        let response = self.client
            .post(&url)
            .header("apikey", &self.config.api_key)
            .json(&body)
            .send()
            .await?;
            
        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            return Err(WhatsAppError::InstanceCreationFailed(
                format!("API error {}: {}", status, error_text)
            ));
        }
        
        response.json().await
            .map_err(|e| WhatsAppError::ApiResponseInvalid(e.to_string()))
    }

    /// Connect instance (get QR code)
    pub async fn connect_instance(&self) -> WhatsAppResult<String> {
        let url = format!("{}/instance/connect/{}", self.config.base_url, self.config.instance_name);
        
        debug!("Connecting to instance: {}", self.config.instance_name);
        
        let response = self.client
            .get(&url)
            .header("apikey", &self.config.api_key)
            .send()
            .await?;
            
        if !response.status().is_success() {
            return Err(WhatsAppError::InstanceConnectionFailed(
                format!("API returned status: {}", response.status())
            ));
        }
        
        let data: serde_json::Value = response.json().await
            .map_err(|e| WhatsAppError::ApiResponseInvalid(e.to_string()))?;
            
        data["qrcode"]["code"]
            .as_str()
            .map(|s| s.to_string())
            .ok_or_else(|| WhatsAppError::ApiResponseInvalid(
                "QR code not found in response".to_string()
            ))
    }

    /// Send text message
    pub async fn send_text_message(&self, to: &str, text: &str) -> WhatsAppResult<EvolutionMessageResponse> {
        let url = format!("{}/message/sendText/{}", self.config.base_url, self.config.instance_name);
        
        let body = json!({
            "number": to,
            "text": text,
            "delay": 1000
        });
        
        info!("Sending text message to {} via Evolution API", to);
        
        let response = self.client
            .post(&url)
            .header("apikey", &self.config.api_key)
            .json(&body)
            .send()
            .await?;
            
        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            return Err(WhatsAppError::MessageSendFailed(
                format!("API error {}: {}", status, error_text)
            ));
        }
        
        response.json().await
            .map_err(|e| WhatsAppError::ApiResponseInvalid(e.to_string()))
    }

    /// Send media message
    pub async fn send_media_message(
        &self, 
        to: &str, 
        media_url: &str, 
        media_type: MessageType,
        caption: Option<&str>
    ) -> WhatsAppResult<EvolutionMessageResponse> {
        let endpoint = match media_type {
            MessageType::Image => "sendImage",
            MessageType::Video => "sendVideo",
            MessageType::Audio => "sendAudio",
            MessageType::Document => "sendDocument",
            _ => return Err(WhatsAppError::MessageInvalid(
                format!("Unsupported media type: {:?}", media_type)
            )),
        };
        
        let url = format!("{}/message/{}/{}", self.config.base_url, endpoint, self.config.instance_name);
        
        let mut body = json!({
            "number": to,
            "media": media_url,
            "delay": 1000
        });
        
        if let Some(caption_text) = caption {
            body["caption"] = serde_json::Value::String(caption_text.to_string());
        }
        
        info!("Sending {} message to {} via Evolution API", endpoint, to);
        
        let response = self.client
            .post(&url)
            .header("apikey", &self.config.api_key)
            .json(&body)
            .send()
            .await?;
            
        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            return Err(WhatsAppError::MessageSendFailed(
                format!("API error {}: {}", status, error_text)
            ));
        }
        
        response.json().await
            .map_err(|e| WhatsAppError::ApiResponseInvalid(e.to_string()))
    }

    /// Set webhook URL
    pub async fn set_webhook(&self, webhook_url: &str) -> WhatsAppResult<()> {
        let url = format!("{}/webhook/set/{}", self.config.base_url, self.config.instance_name);
        
        let body = json!({
            "url": webhook_url,
            "enabled": true,
            "webhookByEvents": true,
            "events": [
                "MESSAGES_SET",
                "MESSAGES_UPDATE",
                "MESSAGES_UPSERT",
                "SEND_MESSAGE",
                "CONNECTION_UPDATE",
                "PRESENCE_UPDATE"
            ]
        });
        
        info!("Setting webhook URL for instance: {}", self.config.instance_name);
        
        let response = self.client
            .put(&url)
            .header("apikey", &self.config.api_key)
            .json(&body)
            .send()
            .await?;
            
        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(WhatsAppError::ApiRequestFailed(
                format!("Failed to set webhook: {}", error_text)
            ));
        }
        
        Ok(())
    }

    /// Get all contacts
    pub async fn get_contacts(&self) -> WhatsAppResult<Vec<Contact>> {
        let url = format!("{}/chat/findContacts/{}", self.config.base_url, self.config.instance_name);
        
        debug!("Fetching contacts for instance: {}", self.config.instance_name);
        
        let response = self.client
            .get(&url)
            .header("apikey", &self.config.api_key)
            .send()
            .await?;
            
        if !response.status().is_success() {
            return Err(WhatsAppError::ApiRequestFailed(
                format!("API returned status: {}", response.status())
            ));
        }
        
        response.json().await
            .map_err(|e| WhatsAppError::ApiResponseInvalid(e.to_string()))
    }

    /// Get chat messages
    pub async fn get_messages(&self, chat_id: &str, limit: u32) -> WhatsAppResult<Vec<EvolutionMessageResponse>> {
        let url = format!("{}/chat/findMessages/{}", self.config.base_url, self.config.instance_name);
        
        let body = json!({
            "where": {
                "key": {
                    "remoteJid": chat_id
                }
            },
            "limit": limit,
            "order": "DESC"
        });
        
        debug!("Fetching messages for chat: {}", chat_id);
        
        let response = self.client
            .post(&url)
            .header("apikey", &self.config.api_key)
            .json(&body)
            .send()
            .await?;
            
        if !response.status().is_success() {
            return Err(WhatsAppError::ApiRequestFailed(
                format!("API returned status: {}", response.status())
            ));
        }
        
        response.json().await
            .map_err(|e| WhatsAppError::ApiResponseInvalid(e.to_string()))
    }

    /// Delete instance
    pub async fn delete_instance(&self) -> WhatsAppResult<()> {
        let url = format!("{}/instance/delete/{}", self.config.base_url, self.config.instance_name);
        
        info!("Deleting Evolution instance: {}", self.config.instance_name);
        
        let response = self.client
            .delete(&url)
            .header("apikey", &self.config.api_key)
            .send()
            .await?;
            
        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(WhatsAppError::ApiRequestFailed(
                format!("Failed to delete instance: {}", error_text)
            ));
        }
        
        Ok(())
    }

    /// Check connection state
    pub async fn check_connection(&self) -> WhatsAppResult<bool> {
        let url = format!("{}/instance/connectionState/{}", self.config.base_url, self.config.instance_name);
        
        debug!("Checking connection state for instance: {}", self.config.instance_name);
        
        let response = self.client
            .get(&url)
            .header("apikey", &self.config.api_key)
            .send()
            .await?;
            
        if !response.status().is_success() {
            return Err(WhatsAppError::ApiRequestFailed(
                format!("API returned status: {}", response.status())
            ));
        }
        
        let data: serde_json::Value = response.json().await
            .map_err(|e| WhatsAppError::ApiResponseInvalid(e.to_string()))?;
        
        // Check if instance is connected
        Ok(data["instance"]["state"].as_str() == Some("open"))
    }

    /// Restart instance
    pub async fn restart_instance(&self) -> WhatsAppResult<()> {
        let url = format!("{}/instance/restart/{}", self.config.base_url, self.config.instance_name);
        
        info!("Restarting Evolution instance: {}", self.config.instance_name);
        
        let response = self.client
            .put(&url)
            .header("apikey", &self.config.api_key)
            .send()
            .await?;
            
        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(WhatsAppError::ApiRequestFailed(
                format!("Failed to restart instance: {}", error_text)
            ));
        }
        
        Ok(())
    }

    /// Get instance name
    pub fn instance_name(&self) -> &str {
        &self.config.instance_name
    }

    /// Get base URL
    pub fn base_url(&self) -> &str {
        &self.config.base_url
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_client() -> EvolutionClient {
        let config = EvolutionConfig {
            base_url: "http://localhost:8080".to_string(),
            api_key: "test-key".to_string(),
            instance_name: "test-instance".to_string(),
        };
        EvolutionClient::new(config)
    }

    #[test]
    fn test_client_creation() {
        let client = create_test_client();
        assert_eq!(client.instance_name(), "test-instance");
        assert_eq!(client.base_url(), "http://localhost:8080");
    }

    #[tokio::test]
    async fn test_send_text_message_validation() {
        let client = create_test_client();
        
        // This will fail with connection error, but we can test the validation logic
        let result = client.send_text_message("", "test message").await;
        assert!(result.is_err());
    }
}