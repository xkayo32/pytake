use actix_web::{web, HttpResponse, Result};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use uuid::Uuid;
use chrono::{DateTime, Utc};

// Database model for WhatsApp configurations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WhatsAppConfig {
    pub id: String,
    pub name: String,
    pub provider: WhatsAppProvider,
    pub phone_number_id: Option<String>,
    pub access_token: Option<String>,
    pub webhook_verify_token: String,
    pub webhook_url: Option<String>,
    pub app_secret: Option<String>,
    pub business_account_id: Option<String>,
    // Evolution API fields
    pub evolution_url: Option<String>,
    pub evolution_api_key: Option<String>,
    pub instance_name: Option<String>,
    // Management fields
    pub is_active: bool,
    pub is_default: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub created_by: String,
    // Status tracking
    pub last_health_check: Option<DateTime<Utc>>,
    pub health_status: HealthStatus,
    pub error_message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum WhatsAppProvider {
    Official,
    Evolution,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum HealthStatus {
    Healthy,
    Unhealthy,
    Unknown,
    Inactive,
}

// Request/Response DTOs
#[derive(Debug, Deserialize)]
pub struct CreateWhatsAppConfigRequest {
    pub name: String,
    pub provider: WhatsAppProvider,
    // Official API fields
    pub phone_number_id: Option<String>,
    pub access_token: Option<String>,
    pub webhook_verify_token: String,
    pub app_secret: Option<String>,
    pub business_account_id: Option<String>,
    // Evolution API fields
    pub evolution_url: Option<String>,
    pub evolution_api_key: Option<String>,
    pub instance_name: Option<String>,
    // Settings
    pub is_active: Option<bool>,
    pub is_default: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateWhatsAppConfigRequest {
    pub name: Option<String>,
    pub phone_number_id: Option<String>,
    pub access_token: Option<String>,
    pub webhook_verify_token: Option<String>,
    pub app_secret: Option<String>,
    pub business_account_id: Option<String>,
    pub evolution_url: Option<String>,
    pub evolution_api_key: Option<String>,
    pub instance_name: Option<String>,
    pub is_active: Option<bool>,
    pub is_default: Option<bool>,
}

#[derive(Debug, Serialize)]
pub struct WhatsAppConfigResponse {
    pub id: String,
    pub name: String,
    pub provider: WhatsAppProvider,
    pub phone_number_id: Option<String>,
    pub webhook_verify_token: String,
    pub webhook_url: Option<String>,
    pub business_account_id: Option<String>,
    pub evolution_url: Option<String>,
    pub instance_name: Option<String>,
    pub is_active: bool,
    pub is_default: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub created_by: String,
    pub health_status: HealthStatus,
    pub last_health_check: Option<DateTime<Utc>>,
    pub error_message: Option<String>,
    // Note: Sensitive fields like access_token, api_key, app_secret are not included
}

impl From<WhatsAppConfig> for WhatsAppConfigResponse {
    fn from(config: WhatsAppConfig) -> Self {
        Self {
            id: config.id,
            name: config.name,
            provider: config.provider,
            phone_number_id: config.phone_number_id,
            webhook_verify_token: config.webhook_verify_token,
            webhook_url: config.webhook_url,
            business_account_id: config.business_account_id,
            evolution_url: config.evolution_url,
            instance_name: config.instance_name,
            is_active: config.is_active,
            is_default: config.is_default,
            created_at: config.created_at,
            updated_at: config.updated_at,
            created_by: config.created_by,
            health_status: config.health_status,
            last_health_check: config.last_health_check,
            error_message: config.error_message,
        }
    }
}

// Storage layer (will be replaced with database)
#[derive(Debug)]
pub struct WhatsAppConfigStorage {
    configs: Arc<RwLock<HashMap<String, WhatsAppConfig>>>,
}

impl WhatsAppConfigStorage {
    pub fn new() -> Self {
        Self {
            configs: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub async fn create(&self, mut config: WhatsAppConfig) -> Result<WhatsAppConfig, String> {
        let mut configs = self.configs.write().await;
        
        // If this is set as default, unset other defaults
        if config.is_default {
            for (_, existing_config) in configs.iter_mut() {
                existing_config.is_default = false;
            }
        }

        config.id = Uuid::new_v4().to_string();
        config.created_at = Utc::now();
        config.updated_at = Utc::now();
        
        configs.insert(config.id.clone(), config.clone());
        Ok(config)
    }

    pub async fn get_by_id(&self, id: &str) -> Option<WhatsAppConfig> {
        let configs = self.configs.read().await;
        configs.get(id).cloned()
    }

    pub async fn get_all(&self) -> Vec<WhatsAppConfig> {
        let configs = self.configs.read().await;
        configs.values().cloned().collect()
    }

    pub async fn get_active_configs(&self) -> Vec<WhatsAppConfig> {
        let configs = self.configs.read().await;
        configs.values()
            .filter(|config| config.is_active)
            .cloned()
            .collect()
    }

    pub async fn get_default_config(&self) -> Option<WhatsAppConfig> {
        let configs = self.configs.read().await;
        configs.values()
            .find(|config| config.is_default && config.is_active)
            .cloned()
    }

    pub async fn update(&self, id: &str, updates: UpdateWhatsAppConfigRequest) -> Result<WhatsAppConfig, String> {
        let mut configs = self.configs.write().await;
        
        // Check if config exists first
        if !configs.contains_key(id) {
            return Err("Configuration not found".to_string());
        }
        
        // Handle is_default field first (requires iteration over all configs)
        if let Some(is_default) = updates.is_default {
            if is_default {
                // Unset other defaults
                for (other_id, other_config) in configs.iter_mut() {
                    if other_id != id {
                        other_config.is_default = false;
                    }
                }
            }
        }
        
        // Now update the specific config
        let config = configs.get_mut(id).ok_or("Configuration not found")?;

        // Update fields
        if let Some(name) = updates.name {
            config.name = name;
        }
        if let Some(phone_number_id) = updates.phone_number_id {
            config.phone_number_id = Some(phone_number_id);
        }
        if let Some(access_token) = updates.access_token {
            config.access_token = Some(access_token);
        }
        if let Some(webhook_verify_token) = updates.webhook_verify_token {
            config.webhook_verify_token = webhook_verify_token;
        }
        if let Some(app_secret) = updates.app_secret {
            config.app_secret = Some(app_secret);
        }
        if let Some(business_account_id) = updates.business_account_id {
            config.business_account_id = Some(business_account_id);
        }
        if let Some(evolution_url) = updates.evolution_url {
            config.evolution_url = Some(evolution_url);
        }
        if let Some(evolution_api_key) = updates.evolution_api_key {
            config.evolution_api_key = Some(evolution_api_key);
        }
        if let Some(instance_name) = updates.instance_name {
            config.instance_name = Some(instance_name);
        }
        if let Some(is_active) = updates.is_active {
            config.is_active = is_active;
        }
        if let Some(is_default) = updates.is_default {
            config.is_default = is_default;
        }

        config.updated_at = Utc::now();
        Ok(config.clone())
    }

    pub async fn delete(&self, id: &str) -> Result<(), String> {
        let mut configs = self.configs.write().await;
        configs.remove(id).ok_or("Configuration not found")?;
        Ok(())
    }

    pub async fn update_health_status(&self, id: &str, status: HealthStatus, error: Option<String>) -> Result<(), String> {
        let mut configs = self.configs.write().await;
        let config = configs.get_mut(id).ok_or("Configuration not found")?;
        
        config.health_status = status;
        config.last_health_check = Some(Utc::now());
        config.error_message = error;
        
        Ok(())
    }

    pub async fn get_config_by_phone_id(&self, phone_id: &str) -> Option<WhatsAppConfig> {
        let configs = self.configs.read().await;
        configs.values()
            .find(|config| {
                config.is_active && 
                config.phone_number_id.as_ref() == Some(&phone_id.to_string())
            })
            .cloned()
    }

    pub async fn get_config_by_instance(&self, instance_name: &str) -> Option<WhatsAppConfig> {
        let configs = self.configs.read().await;
        configs.values()
            .find(|config| {
                config.is_active && 
                config.instance_name.as_ref() == Some(&instance_name.to_string())
            })
            .cloned()
    }
}

// API Handlers
pub async fn list_configs(
    storage: web::Data<Arc<WhatsAppConfigStorage>>,
) -> Result<HttpResponse> {
    let configs = storage.get_all().await;
    let response: Vec<WhatsAppConfigResponse> = configs
        .into_iter()
        .map(WhatsAppConfigResponse::from)
        .collect();

    Ok(HttpResponse::Ok().json(json!({
        "configs": response,
        "total": response.len()
    })))
}

pub async fn get_config(
    path: web::Path<String>,
    storage: web::Data<Arc<WhatsAppConfigStorage>>,
) -> Result<HttpResponse> {
    let config_id = path.into_inner();
    
    match storage.get_by_id(&config_id).await {
        Some(config) => {
            let response = WhatsAppConfigResponse::from(config);
            Ok(HttpResponse::Ok().json(response))
        }
        None => {
            Ok(HttpResponse::NotFound().json(json!({
                "error": "Configuration not found",
                "config_id": config_id
            })))
        }
    }
}

pub async fn create_config(
    request: web::Json<CreateWhatsAppConfigRequest>,
    storage: web::Data<Arc<WhatsAppConfigStorage>>,
) -> Result<HttpResponse> {
    let req = request.into_inner();

    // Validate required fields based on provider
    match req.provider {
        WhatsAppProvider::Official => {
            if req.phone_number_id.is_none() || req.access_token.is_none() {
                return Ok(HttpResponse::BadRequest().json(json!({
                    "error": "phone_number_id and access_token are required for Official provider"
                })));
            }
        }
        WhatsAppProvider::Evolution => {
            if req.evolution_url.is_none() || req.evolution_api_key.is_none() {
                return Ok(HttpResponse::BadRequest().json(json!({
                    "error": "evolution_url and evolution_api_key are required for Evolution provider"
                })));
            }
        }
    }

    let config = WhatsAppConfig {
        id: String::new(), // Will be set by storage
        name: req.name,
        provider: req.provider,
        phone_number_id: req.phone_number_id,
        access_token: req.access_token,
        webhook_verify_token: req.webhook_verify_token,
        webhook_url: None, // Will be set automatically
        app_secret: req.app_secret,
        business_account_id: req.business_account_id,
        evolution_url: req.evolution_url,
        evolution_api_key: req.evolution_api_key,
        instance_name: req.instance_name,
        is_active: req.is_active.unwrap_or(true),
        is_default: req.is_default.unwrap_or(false),
        created_at: Utc::now(),
        updated_at: Utc::now(),
        created_by: "admin@pytake.com".to_string(), // TODO: Get from JWT
        last_health_check: None,
        health_status: HealthStatus::Unknown,
        error_message: None,
    };

    match storage.create(config).await {
        Ok(created_config) => {
            let response = WhatsAppConfigResponse::from(created_config);
            Ok(HttpResponse::Created().json(response))
        }
        Err(e) => {
            Ok(HttpResponse::InternalServerError().json(json!({
                "error": "Failed to create configuration",
                "message": e
            })))
        }
    }
}

pub async fn update_config(
    path: web::Path<String>,
    request: web::Json<UpdateWhatsAppConfigRequest>,
    storage: web::Data<Arc<WhatsAppConfigStorage>>,
) -> Result<HttpResponse> {
    let config_id = path.into_inner();
    let updates = request.into_inner();

    match storage.update(&config_id, updates).await {
        Ok(updated_config) => {
            let response = WhatsAppConfigResponse::from(updated_config);
            Ok(HttpResponse::Ok().json(response))
        }
        Err(e) => {
            if e == "Configuration not found" {
                Ok(HttpResponse::NotFound().json(json!({
                    "error": e,
                    "config_id": config_id
                })))
            } else {
                Ok(HttpResponse::InternalServerError().json(json!({
                    "error": "Failed to update configuration",
                    "message": e
                })))
            }
        }
    }
}

pub async fn delete_config(
    path: web::Path<String>,
    storage: web::Data<Arc<WhatsAppConfigStorage>>,
) -> Result<HttpResponse> {
    let config_id = path.into_inner();

    match storage.delete(&config_id).await {
        Ok(_) => {
            Ok(HttpResponse::Ok().json(json!({
                "message": "Configuration deleted successfully",
                "config_id": config_id
            })))
        }
        Err(e) => {
            if e == "Configuration not found" {
                Ok(HttpResponse::NotFound().json(json!({
                    "error": e,
                    "config_id": config_id
                })))
            } else {
                Ok(HttpResponse::InternalServerError().json(json!({
                    "error": "Failed to delete configuration",
                    "message": e
                })))
            }
        }
    }
}

pub async fn test_config(
    path: web::Path<String>,
    storage: web::Data<Arc<WhatsAppConfigStorage>>,
) -> Result<HttpResponse> {
    let config_id = path.into_inner();

    let config = match storage.get_by_id(&config_id).await {
        Some(config) => config,
        None => {
            return Ok(HttpResponse::NotFound().json(json!({
                "error": "Configuration not found",
                "config_id": config_id
            })))
        }
    };

    // Test the configuration based on provider
    let test_result = match config.provider {
        WhatsAppProvider::Official => test_official_api(&config).await,
        WhatsAppProvider::Evolution => test_evolution_api(&config).await,
    };

    // Update health status
    let health_status = if test_result.is_ok() {
        HealthStatus::Healthy
    } else {
        HealthStatus::Unhealthy
    };

    let error_message = test_result.as_ref().err().cloned();
    let _ = storage.update_health_status(&config_id, health_status, error_message).await;

    match test_result {
        Ok(details) => {
            Ok(HttpResponse::Ok().json(json!({
                "success": true,
                "message": "Configuration test successful",
                "config_id": config_id,
                "provider": config.provider,
                "details": details
            })))
        }
        Err(e) => {
            Ok(HttpResponse::BadRequest().json(json!({
                "success": false,
                "error": "Configuration test failed",
                "message": e,
                "config_id": config_id
            })))
        }
    }
}

pub async fn get_default_config(
    storage: web::Data<Arc<WhatsAppConfigStorage>>,
) -> Result<HttpResponse> {
    match storage.get_default_config().await {
        Some(config) => {
            let response = WhatsAppConfigResponse::from(config);
            Ok(HttpResponse::Ok().json(response))
        }
        None => {
            Ok(HttpResponse::NotFound().json(json!({
                "error": "No default configuration found"
            })))
        }
    }
}

pub async fn set_default_config(
    path: web::Path<String>,
    storage: web::Data<Arc<WhatsAppConfigStorage>>,
) -> Result<HttpResponse> {
    let config_id = path.into_inner();

    let updates = UpdateWhatsAppConfigRequest {
        name: None,
        phone_number_id: None,
        access_token: None,
        webhook_verify_token: None,
        app_secret: None,
        business_account_id: None,
        evolution_url: None,
        evolution_api_key: None,
        instance_name: None,
        is_active: None,
        is_default: Some(true),
    };

    match storage.update(&config_id, updates).await {
        Ok(updated_config) => {
            let response = WhatsAppConfigResponse::from(updated_config);
            Ok(HttpResponse::Ok().json(json!({
                "message": "Default configuration updated successfully",
                "config": response
            })))
        }
        Err(e) => {
            if e == "Configuration not found" {
                Ok(HttpResponse::NotFound().json(json!({
                    "error": e,
                    "config_id": config_id
                })))
            } else {
                Ok(HttpResponse::InternalServerError().json(json!({
                    "error": "Failed to set default configuration",
                    "message": e
                })))
            }
        }
    }
}

// Test functions for different providers
async fn test_official_api(config: &WhatsAppConfig) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::new();
    let url = format!(
        "https://graph.facebook.com/v18.0/{}",
        config.phone_number_id.as_ref().ok_or("Missing phone_number_id")?
    );

    let response = client
        .get(&url)
        .bearer_auth(config.access_token.as_ref().ok_or("Missing access_token")?)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if response.status().is_success() {
        let data: serde_json::Value = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse response: {}", e))?;
        
        Ok(json!({
            "provider": "official",
            "phone_number_id": config.phone_number_id,
            "verified_name": data.get("verified_name"),
            "status": "connected"
        }))
    } else {
        Err(format!("API returned status: {}", response.status()))
    }
}

async fn test_evolution_api(config: &WhatsAppConfig) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::new();
    let url = format!(
        "{}/instance/connectionState/{}",
        config.evolution_url.as_ref().ok_or("Missing evolution_url")?,
        config.instance_name.as_ref().ok_or("Missing instance_name")?
    );

    let response = client
        .get(&url)
        .header("apikey", config.evolution_api_key.as_ref().ok_or("Missing evolution_api_key")?)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if response.status().is_success() {
        let data: serde_json::Value = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse response: {}", e))?;
        
        Ok(json!({
            "provider": "evolution",
            "instance_name": config.instance_name,
            "connection_state": data.get("instance"),
            "status": "connected"
        }))
    } else {
        Err(format!("API returned status: {}", response.status()))
    }
}

// Route configuration
pub fn configure_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/whatsapp-configs")
            .route("", web::get().to(list_configs))
            .route("", web::post().to(create_config))
            .route("/default", web::get().to(get_default_config))
            .route("/{id}", web::get().to(get_config))
            .route("/{id}", web::put().to(update_config))
            .route("/{id}", web::delete().to(delete_config))
            .route("/{id}/test", web::post().to(test_config))
            .route("/{id}/set-default", web::post().to(set_default_config))
    );
}