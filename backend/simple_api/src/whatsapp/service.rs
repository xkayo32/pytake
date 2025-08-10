use crate::whatsapp::error::{WhatsAppError, WhatsAppResult};
use crate::whatsapp::types::*;
use crate::whatsapp::config::ConfigService;
use crate::whatsapp::evolution_api::EvolutionClient;
use crate::whatsapp::official_api::OfficialClient;
use serde_json::json;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use tracing::{info, debug, error, warn};
use chrono::Utc;

/// Main WhatsApp service that manages instances and message sending
pub struct WhatsAppService {
    config_service: Arc<ConfigService>,
    evolution_instances: Arc<RwLock<HashMap<String, Arc<EvolutionClient>>>>,
    official_instances: Arc<RwLock<HashMap<String, Arc<OfficialClient>>>>,
}

impl WhatsAppService {
    pub fn new(config_service: Arc<ConfigService>) -> Self {
        Self {
            config_service,
            evolution_instances: Arc::new(RwLock::new(HashMap::new())),
            official_instances: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Create a new WhatsApp instance
    pub async fn create_instance(&self, request: CreateInstanceRequest) -> WhatsAppResult<InstanceStatusResponse> {
        info!("Creating instance: {} with provider: {:?}", request.instance_name, request.provider);

        match request.provider {
            WhatsAppProvider::Evolution => {
                self.create_evolution_instance(request).await
            }
            WhatsAppProvider::Official => {
                self.create_official_instance(request).await
            }
        }
    }

    /// Get status of a specific instance
    pub async fn get_instance_status(&self, instance_name: &str) -> WhatsAppResult<InstanceStatusResponse> {
        debug!("Getting status for instance: {}", instance_name);

        // Try Evolution instances first
        let evolution_instances = self.evolution_instances.read().await;
        if let Some(client) = evolution_instances.get(instance_name) {
            let connected = client.check_connection().await.unwrap_or(false);
            return Ok(InstanceStatusResponse {
                instance_name: instance_name.to_string(),
                provider: WhatsAppProvider::Evolution,
                connected,
                qr_code: None,
                phone_number: None,
                last_seen: if connected { Some(Utc::now()) } else { None },
            });
        }

        // Try Official instances
        let official_instances = self.official_instances.read().await;
        if let Some(client) = official_instances.get(instance_name) {
            let connected = client.check_health().await.unwrap_or(false);
            let phone_number = Some(client.phone_number_id().to_string());
            return Ok(InstanceStatusResponse {
                instance_name: instance_name.to_string(),
                provider: WhatsAppProvider::Official,
                connected,
                qr_code: None,
                phone_number,
                last_seen: if connected { Some(Utc::now()) } else { None },
            });
        }

        Err(WhatsAppError::InstanceNotFound(format!("Instance '{}' not found", instance_name)))
    }

    /// Get QR code for Evolution API instances
    pub async fn get_qr_code(&self, instance_name: &str) -> WhatsAppResult<String> {
        let evolution_instances = self.evolution_instances.read().await;
        
        match evolution_instances.get(instance_name) {
            Some(client) => {
                client.connect_instance().await
            }
            None => {
                Err(WhatsAppError::InstanceNotFound(format!("Evolution instance '{}' not found", instance_name)))
            }
        }
    }

    /// List all active instances
    pub async fn list_instances(&self) -> WhatsAppResult<Vec<String>> {
        let mut instances = Vec::new();

        let evolution_instances = self.evolution_instances.read().await;
        instances.extend(evolution_instances.keys().cloned());

        let official_instances = self.official_instances.read().await;
        instances.extend(official_instances.keys().cloned());

        Ok(instances)
    }

    /// Delete an instance
    pub async fn delete_instance(&self, instance_name: &str) -> WhatsAppResult<()> {
        info!("Deleting instance: {}", instance_name);

        // Try to remove from Evolution instances
        let mut evolution_instances = self.evolution_instances.write().await;
        if let Some(client) = evolution_instances.remove(instance_name) {
            // Try to delete the instance remotely
            if let Err(e) = client.delete_instance().await {
                warn!("Failed to delete Evolution instance remotely: {}", e);
            }
            return Ok(());
        }

        // Try to remove from Official instances
        let mut official_instances = self.official_instances.write().await;
        if official_instances.remove(instance_name).is_some() {
            return Ok(());
        }

        Err(WhatsAppError::InstanceNotFound(format!("Instance '{}' not found", instance_name)))
    }

    /// Send a WhatsApp message
    pub async fn send_message(&self, request: SendMessageRequest) -> WhatsAppResult<MessageResponse> {
        info!("Sending message to: {}", request.to);

        // Determine which instance to use
        let instance_name = if let Some(name) = request.instance_name {
            name
        } else if let Some(config_id) = request.config_id {
            // Get config and use its instance name or create a temporary one
            let config = self.config_service.get_config_by_id(&config_id).await?
                .ok_or_else(|| WhatsAppError::ConfigNotFound(format!("Configuration {} not found", config_id)))?;
            config.instance_name.unwrap_or(config.id)
        } else {
            // Use default configuration
            let config = self.config_service.get_default_config().await?
                .ok_or_else(|| WhatsAppError::ConfigNotFound("No default configuration found".to_string()))?;
            config.instance_name.unwrap_or(config.id)
        };

        match request.message_type {
            MessageType::Text => {
                let text = request.text
                    .ok_or_else(|| WhatsAppError::MessageInvalid("Text message requires text field".to_string()))?;
                self.send_text_message(&instance_name, &request.to, &text).await
            }
            MessageType::Template => {
                let template_name = request.template_name
                    .ok_or_else(|| WhatsAppError::MessageInvalid("Template message requires template_name field".to_string()))?;
                let params = request.template_params.unwrap_or_default();
                self.send_template_message(&instance_name, &request.to, &template_name, params).await
            }
            media_type => {
                let media_url = request.media_url
                    .ok_or_else(|| WhatsAppError::MessageInvalid("Media message requires media_url field".to_string()))?;
                self.send_media_message(&instance_name, &request.to, &media_url, media_type, request.caption.as_deref()).await
            }
        }
    }

    /// Process incoming webhook data
    pub async fn process_webhook(&self, payload: serde_json::Value) -> WhatsAppResult<()> {
        debug!("Processing webhook payload");

        if let Some(entry) = payload["entry"].as_array() {
            for entry_item in entry {
                if let Some(changes) = entry_item["changes"].as_array() {
                    for change in changes {
                        if let Some(value) = change["value"].as_object() {
                            self.handle_webhook_event(value).await?;
                        }
                    }
                }
            }
        }

        Ok(())
    }

    /// Get phone health metrics
    pub async fn get_phone_health(&self) -> WhatsAppResult<serde_json::Value> {
        // TODO: Implement actual health checking logic
        Ok(json!({
            "status": "healthy",
            "total_instances": self.list_instances().await?.len(),
            "evolution_instances": self.evolution_instances.read().await.len(),
            "official_instances": self.official_instances.read().await.len(),
            "last_check": Utc::now(),
        }))
    }

    /// Get message analytics
    pub async fn get_message_analytics(&self, _params: HashMap<String, String>) -> WhatsAppResult<serde_json::Value> {
        // TODO: Implement actual analytics logic
        Ok(json!({
            "total_sent": 0,
            "total_received": 0,
            "delivery_rate": 0.0,
            "read_rate": 0.0,
        }))
    }

    /// Get quality metrics
    pub async fn get_quality_metrics(&self) -> WhatsAppResult<serde_json::Value> {
        // TODO: Implement actual quality metrics logic
        Ok(json!({
            "quality_rating": "HIGH",
            "messaging_limit": 1000,
            "messages_sent_today": 0,
        }))
    }

    /// Get messaging limits
    pub async fn get_messaging_limits(&self) -> WhatsAppResult<serde_json::Value> {
        // TODO: Implement actual limits checking logic
        Ok(json!({
            "tier": "TIER_1000",
            "current_limit": 1000,
            "messages_sent": 0,
            "reset_time": Utc::now().timestamp() + 86400,
        }))
    }

    /// Get metrics dashboard
    pub async fn get_metrics_dashboard(&self) -> WhatsAppResult<serde_json::Value> {
        let instances = self.list_instances().await?;
        
        Ok(json!({
            "summary": {
                "total_instances": instances.len(),
                "active_instances": instances.len(), // TODO: Check actual status
                "total_configs": 0, // TODO: Get from config service
            },
            "instances": instances,
            "recent_activity": [],
            "alerts": [],
        }))
    }

    // Private helper methods

    async fn create_evolution_instance(&self, request: CreateInstanceRequest) -> WhatsAppResult<InstanceStatusResponse> {
        let evolution_config = if let Some(config_id) = request.config_id {
            // Use stored configuration
            let config = self.config_service.get_config_model_by_id(&config_id).await?
                .ok_or_else(|| WhatsAppError::ConfigNotFound(format!("Configuration {} not found", config_id)))?;
            
            if config.provider != WhatsAppProvider::Evolution {
                return Err(WhatsAppError::InvalidConfig("Configuration is not for Evolution provider".to_string()));
            }

            self.config_service.create_evolution_client(&config)?
        } else if let Some(config) = request.evolution_config {
            // Use inline configuration
            EvolutionClient::new(crate::whatsapp::evolution_api::EvolutionConfig {
                base_url: config.base_url,
                api_key: config.api_key,
                instance_name: request.instance_name.clone(),
            })
        } else {
            return Err(WhatsAppError::InvalidConfig("Evolution configuration required".to_string()));
        };

        // Create instance remotely
        let instance_info = evolution_config.create_instance().await?;
        
        // Store client for future use
        let mut evolution_instances = self.evolution_instances.write().await;
        evolution_instances.insert(request.instance_name.clone(), Arc::new(evolution_config));

        Ok(InstanceStatusResponse {
            instance_name: request.instance_name,
            provider: WhatsAppProvider::Evolution,
            connected: instance_info.connected,
            qr_code: instance_info.qrcode,
            phone_number: instance_info.number,
            last_seen: Some(Utc::now()),
        })
    }

    async fn create_official_instance(&self, request: CreateInstanceRequest) -> WhatsAppResult<InstanceStatusResponse> {
        let official_client = if let Some(config_id) = request.config_id {
            // Use stored configuration
            let config = self.config_service.get_config_model_by_id(&config_id).await?
                .ok_or_else(|| WhatsAppError::ConfigNotFound(format!("Configuration {} not found", config_id)))?;
            
            if config.provider != WhatsAppProvider::Official {
                return Err(WhatsAppError::InvalidConfig("Configuration is not for Official provider".to_string()));
            }

            self.config_service.create_official_client(&config)?
        } else if let Some(config) = request.official_config {
            // Use inline configuration
            OfficialClient::new(crate::whatsapp::official_api::OfficialConfig {
                phone_number_id: config.phone_number_id,
                access_token: config.access_token,
                instance_name: request.instance_name.clone(),
                webhook_verify_token: config.webhook_verify_token,
                app_secret: None,
                business_account_id: None,
            })
        } else {
            return Err(WhatsAppError::InvalidConfig("Official configuration required".to_string()));
        };

        // Test the connection
        let phone_status = official_client.get_phone_status().await?;
        
        // Store client for future use
        let mut official_instances = self.official_instances.write().await;
        official_instances.insert(request.instance_name.clone(), Arc::new(official_client));

        Ok(InstanceStatusResponse {
            instance_name: request.instance_name,
            provider: WhatsAppProvider::Official,
            connected: phone_status.status == "CONNECTED",
            qr_code: None,
            phone_number: Some(phone_status.display_phone_number),
            last_seen: Some(Utc::now()),
        })
    }

    async fn send_text_message(&self, instance_name: &str, to: &str, text: &str) -> WhatsAppResult<MessageResponse> {
        // Try Evolution first
        let evolution_instances = self.evolution_instances.read().await;
        if let Some(client) = evolution_instances.get(instance_name) {
            let response = client.send_text_message(to, text).await?;
            return Ok(MessageResponse {
                success: true,
                message_id: response.key.id,
                to: to.to_string(),
                instance_name: Some(instance_name.to_string()),
                provider: WhatsAppProvider::Evolution,
                timestamp: Utc::now(),
            });
        }

        // Try Official
        let official_instances = self.official_instances.read().await;
        if let Some(client) = official_instances.get(instance_name) {
            let response = client.send_text_message(to, text).await?;
            let message_id = response.messages.first()
                .map(|m| m.id.clone())
                .unwrap_or_default();
            return Ok(MessageResponse {
                success: true,
                message_id,
                to: to.to_string(),
                instance_name: Some(instance_name.to_string()),
                provider: WhatsAppProvider::Official,
                timestamp: Utc::now(),
            });
        }

        Err(WhatsAppError::InstanceNotFound(format!("Instance '{}' not found", instance_name)))
    }

    async fn send_media_message(
        &self,
        instance_name: &str,
        to: &str,
        media_url: &str,
        media_type: MessageType,
        caption: Option<&str>
    ) -> WhatsAppResult<MessageResponse> {
        // Try Evolution first
        let evolution_instances = self.evolution_instances.read().await;
        if let Some(client) = evolution_instances.get(instance_name) {
            let response = client.send_media_message(to, media_url, media_type.clone(), caption).await?;
            return Ok(MessageResponse {
                success: true,
                message_id: response.key.id,
                to: to.to_string(),
                instance_name: Some(instance_name.to_string()),
                provider: WhatsAppProvider::Evolution,
                timestamp: Utc::now(),
            });
        }

        // Try Official
        let official_instances = self.official_instances.read().await;
        if let Some(client) = official_instances.get(instance_name) {
            let response = client.send_media_message(to, media_url, media_type, caption).await?;
            let message_id = response.messages.first()
                .map(|m| m.id.clone())
                .unwrap_or_default();
            return Ok(MessageResponse {
                success: true,
                message_id,
                to: to.to_string(),
                instance_name: Some(instance_name.to_string()),
                provider: WhatsAppProvider::Official,
                timestamp: Utc::now(),
            });
        }

        Err(WhatsAppError::InstanceNotFound(format!("Instance '{}' not found", instance_name)))
    }

    async fn send_template_message(
        &self,
        instance_name: &str,
        to: &str,
        template_name: &str,
        parameters: Vec<String>
    ) -> WhatsAppResult<MessageResponse> {
        // Only Official API supports templates
        let official_instances = self.official_instances.read().await;
        if let Some(client) = official_instances.get(instance_name) {
            let response = client.send_template_message(to, template_name, "en", parameters).await?;
            let message_id = response.messages.first()
                .map(|m| m.id.clone())
                .unwrap_or_default();
            return Ok(MessageResponse {
                success: true,
                message_id,
                to: to.to_string(),
                instance_name: Some(instance_name.to_string()),
                provider: WhatsAppProvider::Official,
                timestamp: Utc::now(),
            });
        }

        Err(WhatsAppError::InstanceNotFound(format!("Official instance '{}' not found for template message", instance_name)))
    }

    async fn handle_webhook_event(&self, value: &serde_json::Map<String, serde_json::Value>) -> WhatsAppResult<()> {
        if let Some(messaging_product) = value.get("messaging_product") {
            if messaging_product == "whatsapp" {
                // Handle WhatsApp messages
                if let Some(messages) = value.get("messages").and_then(|v| v.as_array()) {
                    for message in messages {
                        self.handle_incoming_message(message).await?;
                    }
                }
                
                // Handle message status updates
                if let Some(statuses) = value.get("statuses").and_then(|v| v.as_array()) {
                    for status in statuses {
                        self.handle_message_status(status).await?;
                    }
                }
            }
        }

        Ok(())
    }

    async fn handle_incoming_message(&self, message: &serde_json::Value) -> WhatsAppResult<()> {
        let from = message["from"].as_str().unwrap_or("unknown");
        let msg_id = message["id"].as_str().unwrap_or("unknown");
        let timestamp = message["timestamp"].as_str().unwrap_or("unknown");
        
        info!("Received message from {}: ID={}, Time={}", from, msg_id, timestamp);
        
        // TODO: Process message (store in database, trigger flows, etc.)
        
        Ok(())
    }

    async fn handle_message_status(&self, status: &serde_json::Value) -> WhatsAppResult<()> {
        let recipient_id = status["recipient_id"].as_str().unwrap_or("unknown");
        let msg_status = status["status"].as_str().unwrap_or("unknown");
        let timestamp = status["timestamp"].as_str().unwrap_or("unknown");
        
        info!("Message status update: {} -> {} (Time: {})", recipient_id, msg_status, timestamp);
        
        // TODO: Update message status in database
        
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Arc;

    #[test]
    fn test_service_creation() {
        let config_service = Arc::new(ConfigService::new(
            sea_orm::DatabaseConnection::Disconnected
        ));
        let whatsapp_service = WhatsAppService::new(config_service);
        
        // Service should be created successfully
        assert_eq!(whatsapp_service.evolution_instances.try_read().unwrap().len(), 0);
        assert_eq!(whatsapp_service.official_instances.try_read().unwrap().len(), 0);
    }

    #[tokio::test]
    async fn test_list_instances_empty() {
        let config_service = Arc::new(ConfigService::new(
            sea_orm::DatabaseConnection::Disconnected
        ));
        let whatsapp_service = WhatsAppService::new(config_service);
        
        let instances = whatsapp_service.list_instances().await.unwrap();
        assert_eq!(instances.len(), 0);
    }
}