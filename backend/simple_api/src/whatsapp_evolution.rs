use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

/// WhatsApp provider types
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum WhatsAppProvider {
    Official,   // WhatsApp Business API (Meta)
    Evolution,  // Evolution API
}

/// Evolution API configuration
#[derive(Debug, Clone)]
pub struct EvolutionConfig {
    pub base_url: String,
    pub api_key: String,
    pub instance_name: String,
}

/// Official WhatsApp API configuration
#[derive(Debug, Clone)]
pub struct OfficialConfig {
    pub phone_number_id: String,
    pub access_token: String,
    pub instance_name: String,
    pub webhook_verify_token: String,
}

/// Evolution API client
#[derive(Clone)]
pub struct EvolutionClient {
    config: EvolutionConfig,
    client: reqwest::Client,
}

/// Instance information
#[derive(Debug, Serialize, Deserialize)]
pub struct InstanceInfo {
    pub instance_name: String,
    pub status: String,
    pub state: String,
    pub qrcode: Option<String>,
    pub connected: bool,
    pub number: Option<String>,
}

/// Message types
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum MessageType {
    Text,
    Image,
    Audio,
    Video,
    Document,
    Location,
    Sticker,
}

/// Send message request
#[derive(Debug, Serialize)]
pub struct SendMessageRequest {
    pub number: String,
    pub text: Option<String>,
    pub media_url: Option<String>,
    pub media_type: Option<MessageType>,
    pub caption: Option<String>,
}

/// Message response
#[derive(Debug, Deserialize)]
pub struct MessageResponse {
    pub key: MessageKey,
    pub message: MessageContent,
    pub message_timestamp: String,
    pub status: String,
}

#[derive(Debug, Deserialize)]
pub struct MessageKey {
    pub remote_jid: String,
    pub from_me: bool,
    pub id: String,
}

#[derive(Debug, Deserialize)]
pub struct MessageContent {
    pub conversation: Option<String>,
    pub image_message: Option<MediaMessage>,
    pub video_message: Option<MediaMessage>,
    pub audio_message: Option<AudioMessage>,
    pub document_message: Option<MediaMessage>,
}

#[derive(Debug, Deserialize)]
pub struct MediaMessage {
    pub url: Option<String>,
    pub mimetype: Option<String>,
    pub caption: Option<String>,
    pub file_sha256: Option<String>,
    pub file_length: Option<u64>,
}

#[derive(Debug, Deserialize)]
pub struct AudioMessage {
    pub url: Option<String>,
    pub mimetype: Option<String>,
    pub file_sha256: Option<String>,
    pub file_length: Option<u64>,
    pub ptt: Option<bool>, // Push to talk (voice message)
}

/// Webhook event
#[derive(Debug, Deserialize)]
pub struct WebhookEvent {
    pub event: String,
    pub instance: String,
    pub data: serde_json::Value,
}

impl EvolutionClient {
    pub fn new(config: EvolutionConfig) -> Self {
        Self {
            config,
            client: reqwest::Client::new(),
        }
    }
    
    /// Get instance information
    pub async fn get_instance_info(&self) -> Result<InstanceInfo, String> {
        let url = format!("{}/instance/fetchInstances", self.config.base_url);
        
        let response = self.client
            .get(&url)
            .header("apikey", &self.config.api_key)
            .query(&[("instanceName", &self.config.instance_name)])
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;
            
        if !response.status().is_success() {
            return Err(format!("API error: {}", response.status()));
        }
        
        let instances: Vec<InstanceInfo> = response.json()
            .await
            .map_err(|e| format!("Failed to parse response: {}", e))?;
            
        instances.into_iter()
            .find(|i| i.instance_name == self.config.instance_name)
            .ok_or_else(|| "Instance not found".to_string())
    }
    
    /// Create a new instance
    pub async fn create_instance(&self) -> Result<InstanceInfo, String> {
        let url = format!("{}/instance/create", self.config.base_url);
        
        let body = serde_json::json!({
            "instanceName": self.config.instance_name,
            "qrcode": true,
            "integration": "WHATSAPP-BAILEYS"
        });
        
        let response = self.client
            .post(&url)
            .header("apikey", &self.config.api_key)
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;
            
        if !response.status().is_success() {
            return Err(format!("API error: {}", response.status()));
        }
        
        response.json()
            .await
            .map_err(|e| format!("Failed to parse response: {}", e))
    }
    
    /// Connect instance (get QR code)
    pub async fn connect_instance(&self) -> Result<String, String> {
        let url = format!("{}/instance/connect/{}", self.config.base_url, self.config.instance_name);
        
        let response = self.client
            .get(&url)
            .header("apikey", &self.config.api_key)
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;
            
        if !response.status().is_success() {
            return Err(format!("API error: {}", response.status()));
        }
        
        let data: serde_json::Value = response.json()
            .await
            .map_err(|e| format!("Failed to parse response: {}", e))?;
            
        data["qrcode"]["code"]
            .as_str()
            .map(|s| s.to_string())
            .ok_or_else(|| "QR code not found in response".to_string())
    }
    
    /// Send text message
    pub async fn send_text_message(&self, to: &str, text: &str) -> Result<MessageResponse, String> {
        let url = format!("{}/message/sendText/{}", self.config.base_url, self.config.instance_name);
        
        let body = serde_json::json!({
            "number": to,
            "text": text,
            "delay": 1000
        });
        
        let response = self.client
            .post(&url)
            .header("apikey", &self.config.api_key)
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;
            
        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(format!("API error: {}", error_text));
        }
        
        response.json()
            .await
            .map_err(|e| format!("Failed to parse response: {}", e))
    }
    
    /// Send media message
    pub async fn send_media_message(
        &self, 
        to: &str, 
        media_url: &str, 
        media_type: MessageType,
        caption: Option<&str>
    ) -> Result<MessageResponse, String> {
        let endpoint = match media_type {
            MessageType::Image => "sendImage",
            MessageType::Video => "sendVideo",
            MessageType::Audio => "sendAudio",
            MessageType::Document => "sendDocument",
            _ => return Err("Unsupported media type".to_string()),
        };
        
        let url = format!("{}/message/{}/{}", self.config.base_url, endpoint, self.config.instance_name);
        
        let mut body = serde_json::json!({
            "number": to,
            "media": media_url,
            "delay": 1000
        });
        
        if let Some(caption_text) = caption {
            body["caption"] = serde_json::Value::String(caption_text.to_string());
        }
        
        let response = self.client
            .post(&url)
            .header("apikey", &self.config.api_key)
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;
            
        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(format!("API error: {}", error_text));
        }
        
        response.json()
            .await
            .map_err(|e| format!("Failed to parse response: {}", e))
    }
    
    /// Set webhook URL
    pub async fn set_webhook(&self, webhook_url: &str) -> Result<(), String> {
        let url = format!("{}/webhook/set/{}", self.config.base_url, self.config.instance_name);
        
        let body = serde_json::json!({
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
        
        let response = self.client
            .put(&url)
            .header("apikey", &self.config.api_key)
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;
            
        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(format!("API error: {}", error_text));
        }
        
        Ok(())
    }
    
    /// Get all contacts
    pub async fn get_contacts(&self) -> Result<Vec<Contact>, String> {
        let url = format!("{}/chat/findContacts/{}", self.config.base_url, self.config.instance_name);
        
        let response = self.client
            .get(&url)
            .header("apikey", &self.config.api_key)
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;
            
        if !response.status().is_success() {
            return Err(format!("API error: {}", response.status()));
        }
        
        response.json()
            .await
            .map_err(|e| format!("Failed to parse response: {}", e))
    }
    
    /// Get chat messages
    pub async fn get_messages(&self, chat_id: &str, limit: u32) -> Result<Vec<MessageResponse>, String> {
        let url = format!("{}/chat/findMessages/{}", self.config.base_url, self.config.instance_name);
        
        let body = serde_json::json!({
            "where": {
                "key": {
                    "remoteJid": chat_id
                }
            },
            "limit": limit,
            "order": "DESC"
        });
        
        let response = self.client
            .post(&url)
            .header("apikey", &self.config.api_key)
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;
            
        if !response.status().is_success() {
            return Err(format!("API error: {}", response.status()));
        }
        
        response.json()
            .await
            .map_err(|e| format!("Failed to parse response: {}", e))
    }
}

/// Contact information
#[derive(Debug, Serialize, Deserialize)]
pub struct Contact {
    pub id: String,
    pub name: Option<String>,
    pub number: String,
    pub is_business: bool,
    pub is_group: bool,
    pub profile_pic_url: Option<String>,
}

/// Official WhatsApp API client
#[derive(Clone)]
pub struct OfficialClient {
    config: OfficialConfig,
    client: reqwest::Client,
}

impl OfficialClient {
    pub fn new(config: OfficialConfig) -> Self {
        Self {
            config,
            client: reqwest::Client::new(),
        }
    }
    
    /// Send text message via official API
    pub async fn send_text_message(&self, to: &str, text: &str) -> Result<OfficialMessageResponse, String> {
        let url = format!(
            "https://graph.facebook.com/v18.0/{}/messages",
            self.config.phone_number_id
        );
        
        let body = serde_json::json!({
            "messaging_product": "whatsapp",
            "to": to,
            "type": "text",
            "text": {
                "body": text
            }
        });
        
        let response = self.client
            .post(&url)
            .header("Authorization", format!("Bearer {}", self.config.access_token))
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;
            
        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(format!("API error: {}", error_text));
        }
        
        response.json()
            .await
            .map_err(|e| format!("Failed to parse response: {}", e))
    }
    
    /// Get phone number status
    pub async fn get_phone_status(&self) -> Result<PhoneNumberStatus, String> {
        let url = format!(
            "https://graph.facebook.com/v18.0/{}",
            self.config.phone_number_id
        );
        
        let response = self.client
            .get(&url)
            .header("Authorization", format!("Bearer {}", self.config.access_token))
            .query(&[("fields", "verified_name,code_verification_status,display_phone_number,quality_rating,status")])
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;
            
        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(format!("API error: {}", error_text));
        }
        
        response.json()
            .await
            .map_err(|e| format!("Failed to parse response: {}", e))
    }
}

/// Official API message response
#[derive(Debug, Deserialize)]
pub struct OfficialMessageResponse {
    pub messaging_product: String,
    pub contacts: Vec<OfficialContact>,
    pub messages: Vec<OfficialMessage>,
}

#[derive(Debug, Deserialize)]
pub struct OfficialContact {
    pub input: String,
    pub wa_id: String,
}

#[derive(Debug, Deserialize)]
pub struct OfficialMessage {
    pub id: String,
}

/// Phone number status from official API
#[derive(Debug, Deserialize)]
pub struct PhoneNumberStatus {
    pub verified_name: String,
    pub code_verification_status: String,
    pub display_phone_number: String,
    pub quality_rating: String,
    pub status: String,
}

/// WhatsApp service that supports multiple providers
pub struct WhatsAppService {
    provider: WhatsAppProvider,
    evolution_client: Option<EvolutionClient>,
    official_client: Option<OfficialClient>,
}

impl WhatsAppService {
    pub fn new_evolution(config: EvolutionConfig) -> Self {
        Self {
            provider: WhatsAppProvider::Evolution,
            evolution_client: Some(EvolutionClient::new(config)),
            official_client: None,
        }
    }
    
    pub fn new_official(config: OfficialConfig) -> Self {
        Self {
            provider: WhatsAppProvider::Official,
            evolution_client: None,
            official_client: Some(OfficialClient::new(config)),
        }
    }
    
    pub async fn send_message(&self, to: &str, text: &str) -> Result<String, String> {
        match self.provider {
            WhatsAppProvider::Evolution => {
                let client = self.evolution_client.as_ref()
                    .ok_or("Evolution client not initialized")?;
                    
                let response = client.send_text_message(to, text).await?;
                Ok(response.key.id)
            }
            WhatsAppProvider::Official => {
                let client = self.official_client.as_ref()
                    .ok_or("Official client not initialized")?;
                    
                let response = client.send_text_message(to, text).await?;
                Ok(response.messages.first()
                    .ok_or("No message ID returned")?
                    .id.clone())
            }
        }
    }
    
    pub async fn get_instance_status(&self) -> Result<bool, String> {
        match self.provider {
            WhatsAppProvider::Evolution => {
                let client = self.evolution_client.as_ref()
                    .ok_or("Evolution client not initialized")?;
                    
                let info = client.get_instance_info().await?;
                Ok(info.connected)
            }
            WhatsAppProvider::Official => {
                let client = self.official_client.as_ref()
                    .ok_or("Official client not initialized")?;
                    
                // For official API, we check if we can get phone status
                match client.get_phone_status().await {
                    Ok(status) => Ok(status.status == "CONNECTED"),
                    Err(_) => Ok(false),
                }
            }
        }
    }
    
    pub fn get_provider(&self) -> WhatsAppProvider {
        self.provider.clone()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_evolution_config() {
        let config = EvolutionConfig {
            base_url: "http://localhost:8080".to_string(),
            api_key: "test-key".to_string(),
            instance_name: "test-instance".to_string(),
        };
        
        assert_eq!(config.base_url, "http://localhost:8080");
        assert_eq!(config.api_key, "test-key");
        assert_eq!(config.instance_name, "test-instance");
    }
}