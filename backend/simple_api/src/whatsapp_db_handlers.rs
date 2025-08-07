use actix_web::{web, HttpResponse, Result, HttpRequest};
use serde_json::json;
use std::sync::Arc;
use crate::whatsapp_db_service::WhatsAppDbService;
use crate::whatsapp_management::{CreateWhatsAppConfigRequest, UpdateWhatsAppConfigRequest};
use crate::entities::whatsapp_config::{WhatsAppProvider, HealthStatus};

pub async fn list_configs(
    db_service: web::Data<Arc<WhatsAppDbService>>,
) -> Result<HttpResponse> {
    match db_service.get_all_configs().await {
        Ok(configs) => {
            let response: Vec<_> = configs
                .into_iter()
                .map(|config| config.to_response())
                .collect();

            Ok(HttpResponse::Ok().json(json!({
                "configs": response,
                "total": response.len()
            })))
        }
        Err(e) => {
            Ok(HttpResponse::InternalServerError().json(json!({
                "error": "Failed to fetch configurations",
                "message": e
            })))
        }
    }
}

pub async fn get_config(
    path: web::Path<String>,
    db_service: web::Data<Arc<WhatsAppDbService>>,
) -> Result<HttpResponse> {
    let config_id = path.into_inner();
    
    match db_service.get_config_by_id(&config_id).await {
        Ok(Some(config)) => {
            let response = config.to_response();
            Ok(HttpResponse::Ok().json(response))
        }
        Ok(None) => {
            Ok(HttpResponse::NotFound().json(json!({
                "error": "Configuration not found",
                "config_id": config_id
            })))
        }
        Err(e) => {
            Ok(HttpResponse::InternalServerError().json(json!({
                "error": "Database error",
                "message": e
            })))
        }
    }
}

pub async fn create_config(
    request: web::Json<CreateWhatsAppConfigRequest>,
    db_service: web::Data<Arc<WhatsAppDbService>>,
    req: HttpRequest,
) -> Result<HttpResponse> {
    let request = request.into_inner();
    
    // Get user from JWT (simplified - get from request headers)
    let created_by = req
        .headers()
        .get("x-user-email")
        .and_then(|h| h.to_str().ok())
        .unwrap_or("admin@pytake.com");

    match db_service.create_config(request, created_by).await {
        Ok(config) => {
            let response = config.to_response();
            Ok(HttpResponse::Created().json(response))
        }
        Err(e) => {
            Ok(HttpResponse::BadRequest().json(json!({
                "error": "Failed to create configuration",
                "message": e
            })))
        }
    }
}

pub async fn update_config(
    path: web::Path<String>,
    request: web::Json<UpdateWhatsAppConfigRequest>,
    db_service: web::Data<Arc<WhatsAppDbService>>,
) -> Result<HttpResponse> {
    let config_id = path.into_inner();
    let updates = request.into_inner();

    match db_service.update_config(&config_id, updates).await {
        Ok(config) => {
            let response = config.to_response();
            Ok(HttpResponse::Ok().json(response))
        }
        Err(e) => {
            if e.contains("not found") {
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
    db_service: web::Data<Arc<WhatsAppDbService>>,
) -> Result<HttpResponse> {
    let config_id = path.into_inner();

    match db_service.delete_config(&config_id).await {
        Ok(_) => {
            Ok(HttpResponse::Ok().json(json!({
                "message": "Configuration deleted successfully",
                "config_id": config_id
            })))
        }
        Err(e) => {
            if e.contains("not found") {
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
    db_service: web::Data<Arc<WhatsAppDbService>>,
) -> Result<HttpResponse> {
    let config_id = path.into_inner();

    let config = match db_service.get_config_by_id(&config_id).await {
        Ok(Some(config)) => config,
        Ok(None) => {
            return Ok(HttpResponse::NotFound().json(json!({
                "error": "Configuration not found",
                "config_id": config_id
            })))
        }
        Err(e) => {
            return Ok(HttpResponse::InternalServerError().json(json!({
                "error": "Database error",
                "message": e
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
    let _ = db_service.update_health_status(&config_id, health_status, error_message).await;

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
    db_service: web::Data<Arc<WhatsAppDbService>>,
) -> Result<HttpResponse> {
    match db_service.get_default_config().await {
        Ok(Some(config)) => {
            let response = config.to_response();
            Ok(HttpResponse::Ok().json(response))
        }
        Ok(None) => {
            Ok(HttpResponse::NotFound().json(json!({
                "error": "No default configuration found"
            })))
        }
        Err(e) => {
            Ok(HttpResponse::InternalServerError().json(json!({
                "error": "Database error",
                "message": e
            })))
        }
    }
}

pub async fn set_default_config(
    path: web::Path<String>,
    db_service: web::Data<Arc<WhatsAppDbService>>,
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

    match db_service.update_config(&config_id, updates).await {
        Ok(config) => {
            let response = config.to_response();
            Ok(HttpResponse::Ok().json(json!({
                "message": "Default configuration updated successfully",
                "config": response
            })))
        }
        Err(e) => {
            if e.contains("not found") {
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
async fn test_official_api(config: &crate::entities::whatsapp_config::Model) -> Result<serde_json::Value, String> {
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

async fn test_evolution_api(config: &crate::entities::whatsapp_config::Model) -> Result<serde_json::Value, String> {
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