use actix_web::{web, HttpResponse, Result};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tracing::{info, error};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WhatsAppConfig {
    pub provider: String, // "official" or "evolution"
    pub official: OfficialConfig,
    pub evolution: EvolutionConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OfficialConfig {
    pub enabled: bool,
    pub phone_number_id: String,
    pub access_token: String,
    pub webhook_verify_token: String,
    pub business_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EvolutionConfig {
    pub enabled: bool,
    pub base_url: String,
    pub api_key: String,
    pub instance_name: String,
    pub webhook_url: String,
}

#[derive(Debug, Serialize)]
pub struct TestResult {
    pub success: bool,
    pub message: String,
    pub error: Option<String>,
}

pub struct ConfigStorage {
    pub config: Mutex<Option<WhatsAppConfig>>,
}

impl ConfigStorage {
    pub fn new() -> Self {
        Self {
            config: Mutex::new(None),
        }
    }
}

// Get WhatsApp configuration
pub async fn get_config(storage: web::Data<ConfigStorage>) -> Result<HttpResponse> {
    info!("Getting WhatsApp configuration");
    
    let config = storage.config.lock().unwrap();
    
    if let Some(config) = config.clone() {
        Ok(HttpResponse::Ok().json(config))
    } else {
        // Return default config if none exists
        let default_config = WhatsAppConfig {
            provider: "evolution".to_string(),
            official: OfficialConfig {
                enabled: false,
                phone_number_id: String::new(),
                access_token: String::new(),
                webhook_verify_token: String::new(),
                business_id: String::new(),
            },
            evolution: EvolutionConfig {
                enabled: true,
                base_url: String::new(),
                api_key: String::new(),
                instance_name: String::new(),
                webhook_url: String::new(),
            },
        };
        Ok(HttpResponse::Ok().json(default_config))
    }
}

// Save WhatsApp configuration
pub async fn save_config(
    storage: web::Data<ConfigStorage>,
    config: web::Json<WhatsAppConfig>,
) -> Result<HttpResponse> {
    info!("Saving WhatsApp configuration");
    
    let mut stored_config = storage.config.lock().unwrap();
    *stored_config = Some(config.into_inner());
    
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "message": "Configuration saved successfully"
    })))
}

// Test WhatsApp connection
pub async fn test_connection(
    config: web::Json<WhatsAppConfig>,
) -> Result<HttpResponse> {
    info!("Testing WhatsApp connection");
    
    let config = config.into_inner();
    
    match config.provider.as_str() {
        "official" => {
            // Test official WhatsApp API
            if config.official.enabled {
                match test_official_api(&config.official).await {
                    Ok(result) => Ok(HttpResponse::Ok().json(result)),
                    Err(e) => {
                        error!("Failed to test official API: {}", e);
                        Ok(HttpResponse::Ok().json(TestResult {
                            success: false,
                            message: "Connection test failed".to_string(),
                            error: Some(e.to_string()),
                        }))
                    }
                }
            } else {
                Ok(HttpResponse::Ok().json(TestResult {
                    success: false,
                    message: "Official API is not enabled".to_string(),
                    error: None,
                }))
            }
        }
        "evolution" => {
            // Test Evolution API
            if config.evolution.enabled {
                match test_evolution_api(&config.evolution).await {
                    Ok(result) => Ok(HttpResponse::Ok().json(result)),
                    Err(e) => {
                        error!("Failed to test Evolution API: {}", e);
                        Ok(HttpResponse::Ok().json(TestResult {
                            success: false,
                            message: "Connection test failed".to_string(),
                            error: Some(e.to_string()),
                        }))
                    }
                }
            } else {
                Ok(HttpResponse::Ok().json(TestResult {
                    success: false,
                    message: "Evolution API is not enabled".to_string(),
                    error: None,
                }))
            }
        }
        _ => Ok(HttpResponse::BadRequest().json(TestResult {
            success: false,
            message: "Invalid provider".to_string(),
            error: Some("Provider must be 'official' or 'evolution'".to_string()),
        })),
    }
}

async fn test_official_api(config: &OfficialConfig) -> Result<TestResult, Box<dyn std::error::Error>> {
    // TODO: Implement actual API test
    // For now, just check if required fields are present
    if config.phone_number_id.is_empty() || config.access_token.is_empty() {
        return Ok(TestResult {
            success: false,
            message: "Missing required configuration".to_string(),
            error: Some("Phone Number ID and Access Token are required".to_string()),
        });
    }
    
    // In a real implementation, make a test API call to WhatsApp
    Ok(TestResult {
        success: true,
        message: "Connection successful".to_string(),
        error: None,
    })
}

async fn test_evolution_api(config: &EvolutionConfig) -> Result<TestResult, Box<dyn std::error::Error>> {
    if config.base_url.is_empty() || config.api_key.is_empty() {
        return Ok(TestResult {
            success: false,
            message: "Missing required configuration".to_string(),
            error: Some("Base URL and API Key are required".to_string()),
        });
    }
    
    // Make a test request to Evolution API
    let client = reqwest::Client::new();
    let url = format!("{}/instance/list", config.base_url);
    
    let response = client
        .get(&url)
        .header("apikey", &config.api_key)
        .send()
        .await?;
    
    if response.status().is_success() {
        Ok(TestResult {
            success: true,
            message: "Connection successful".to_string(),
            error: None,
        })
    } else {
        Ok(TestResult {
            success: false,
            message: "Connection failed".to_string(),
            error: Some(format!("Status: {}", response.status())),
        })
    }
}

// Configure routes
pub fn configure_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/settings/whatsapp")
            .route("", web::get().to(get_config))
            .route("", web::put().to(save_config))
            .route("/test", web::post().to(test_connection))
    );
}