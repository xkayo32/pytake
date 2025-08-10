use crate::whatsapp::error::{WhatsAppError, WhatsAppResult};
use crate::whatsapp::types::*;
use crate::whatsapp::config::ConfigService;
use crate::whatsapp::service::WhatsAppService;
use crate::whatsapp_metrics;
use actix_web::{web, HttpResponse, HttpRequest, Result};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::sync::Arc;
use tracing::{info, debug, error, warn};
use std::collections::HashMap;

/// Query parameters for listing configurations
#[derive(Deserialize)]
pub struct ListConfigsQuery {
    pub page: Option<u64>,
    pub page_size: Option<u64>,
    pub paginated: Option<bool>,
}

// =============================================================================
// Configuration Management Handlers
// =============================================================================

/// List all WhatsApp configurations
pub async fn list_configs(
    query: web::Query<ListConfigsQuery>,
    config_service: web::Data<Arc<ConfigService>>,
) -> Result<HttpResponse, WhatsAppError> {
    info!("Listing WhatsApp configurations");
    
    let pagination = if query.paginated.unwrap_or(false) || query.page.is_some() || query.page_size.is_some() {
        Some(PaginationParams {
            page: query.page,
            page_size: query.page_size,
        })
    } else {
        None
    };

    let result = config_service.get_all_configs(pagination).await?;
    
    if result.pagination.total_pages == 1 && !query.paginated.unwrap_or(false) {
        // Legacy response format for non-paginated requests
        Ok(HttpResponse::Ok().json(json!({
            "configs": result.data,
            "total": result.pagination.total_items
        })))
    } else {
        // Paginated response format
        Ok(HttpResponse::Ok().json(json!({
            "data": result.data,
            "pagination": result.pagination
        })))
    }
}

/// Get a specific WhatsApp configuration by ID
pub async fn get_config(
    path: web::Path<String>,
    config_service: web::Data<Arc<ConfigService>>,
) -> Result<HttpResponse, WhatsAppError> {
    let config_id = path.into_inner();
    info!("Getting WhatsApp configuration: {}", config_id);
    
    match config_service.get_config_by_id(&config_id).await? {
        Some(config) => Ok(HttpResponse::Ok().json(config)),
        None => Err(WhatsAppError::ConfigNotFound(format!("Configuration with ID {} not found", config_id))),
    }
}

/// Create a new WhatsApp configuration
pub async fn create_config(
    request: web::Json<CreateWhatsAppConfigRequest>,
    config_service: web::Data<Arc<ConfigService>>,
    req: HttpRequest,
) -> Result<HttpResponse, WhatsAppError> {
    let request = request.into_inner();
    info!("Creating WhatsApp configuration: {}", request.name);
    
    // Get user from JWT (simplified - get from request headers)
    let created_by = req
        .headers()
        .get("x-user-email")
        .and_then(|h| h.to_str().ok())
        .unwrap_or("admin@pytake.com");

    let config = config_service.create_config(request, created_by).await?;
    Ok(HttpResponse::Created().json(config))
}

/// Update an existing WhatsApp configuration
pub async fn update_config(
    path: web::Path<String>,
    request: web::Json<UpdateWhatsAppConfigRequest>,
    config_service: web::Data<Arc<ConfigService>>,
) -> Result<HttpResponse, WhatsAppError> {
    let config_id = path.into_inner();
    let updates = request.into_inner();
    info!("Updating WhatsApp configuration: {}", config_id);

    let config = config_service.update_config(&config_id, updates).await?;
    Ok(HttpResponse::Ok().json(config))
}

/// Delete a WhatsApp configuration
pub async fn delete_config(
    path: web::Path<String>,
    config_service: web::Data<Arc<ConfigService>>,
) -> Result<HttpResponse, WhatsAppError> {
    let config_id = path.into_inner();
    info!("Deleting WhatsApp configuration: {}", config_id);

    config_service.delete_config(&config_id).await?;
    Ok(HttpResponse::Ok().json(json!({
        "message": "Configuration deleted successfully",
        "config_id": config_id
    })))
}

/// Test a WhatsApp configuration
pub async fn test_config(
    path: web::Path<String>,
    config_service: web::Data<Arc<ConfigService>>,
) -> Result<HttpResponse, WhatsAppError> {
    let config_id = path.into_inner();
    info!("Testing WhatsApp configuration: {}", config_id);

    let test_result = config_service.test_config(&config_id).await?;
    Ok(HttpResponse::Ok().json(test_result))
}

/// Get the default WhatsApp configuration
pub async fn get_default_config(
    config_service: web::Data<Arc<ConfigService>>,
) -> Result<HttpResponse, WhatsAppError> {
    info!("Getting default WhatsApp configuration");

    match config_service.get_default_config().await? {
        Some(config) => Ok(HttpResponse::Ok().json(config)),
        None => Err(WhatsAppError::ConfigNotFound("No default configuration found".to_string())),
    }
}

/// Set a configuration as the default
pub async fn set_default_config(
    path: web::Path<String>,
    config_service: web::Data<Arc<ConfigService>>,
) -> Result<HttpResponse, WhatsAppError> {
    let config_id = path.into_inner();
    info!("Setting default WhatsApp configuration: {}", config_id);

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

    let config = config_service.update_config(&config_id, updates).await?;
    Ok(HttpResponse::Ok().json(json!({
        "message": "Default configuration updated successfully",
        "config": config
    })))
}

// =============================================================================
// Instance Management Handlers
// =============================================================================

/// Create a new WhatsApp instance
pub async fn create_instance(
    request: web::Json<CreateInstanceRequest>,
    whatsapp_service: web::Data<Arc<WhatsAppService>>,
) -> Result<HttpResponse, WhatsAppError> {
    let request = request.into_inner();
    info!("Creating WhatsApp instance: {}", request.instance_name);

    let instance = whatsapp_service.create_instance(request).await?;
    Ok(HttpResponse::Created().json(instance))
}

/// Get instance status
pub async fn get_instance_status(
    path: web::Path<String>,
    whatsapp_service: web::Data<Arc<WhatsAppService>>,
) -> Result<HttpResponse, WhatsAppError> {
    let instance_name = path.into_inner();
    info!("Getting instance status: {}", instance_name);

    let status = whatsapp_service.get_instance_status(&instance_name).await?;
    Ok(HttpResponse::Ok().json(status))
}

/// Get QR code for instance connection
pub async fn get_qr_code(
    path: web::Path<String>,
    whatsapp_service: web::Data<Arc<WhatsAppService>>,
) -> Result<HttpResponse, WhatsAppError> {
    let instance_name = path.into_inner();
    info!("Getting QR code for instance: {}", instance_name);

    let qr_code = whatsapp_service.get_qr_code(&instance_name).await?;
    Ok(HttpResponse::Ok().json(json!({
        "instance_name": instance_name,
        "qr_code": qr_code,
        "message": "Scan this QR code with WhatsApp"
    })))
}

/// List all instances
pub async fn list_instances(
    whatsapp_service: web::Data<Arc<WhatsAppService>>,
) -> Result<HttpResponse, WhatsAppError> {
    info!("Listing WhatsApp instances");

    let instances = whatsapp_service.list_instances().await?;
    Ok(HttpResponse::Ok().json(json!({
        "instances": instances,
        "count": instances.len()
    })))
}

/// Delete an instance
pub async fn delete_instance(
    path: web::Path<String>,
    whatsapp_service: web::Data<Arc<WhatsAppService>>,
) -> Result<HttpResponse, WhatsAppError> {
    let instance_name = path.into_inner();
    info!("Deleting instance: {}", instance_name);

    whatsapp_service.delete_instance(&instance_name).await?;
    Ok(HttpResponse::Ok().json(json!({
        "message": "Instance deleted successfully",
        "instance_name": instance_name
    })))
}

// =============================================================================
// Message Handlers
// =============================================================================

/// Send a WhatsApp message
pub async fn send_message(
    request: web::Json<SendMessageRequest>,
    whatsapp_service: web::Data<Arc<WhatsAppService>>,
) -> Result<HttpResponse, WhatsAppError> {
    let request = request.into_inner();
    info!("Sending WhatsApp message to: {}", request.to);

    let response = whatsapp_service.send_message(request).await?;
    Ok(HttpResponse::Ok().json(response))
}

// =============================================================================
// Webhook Handlers
// =============================================================================

/// Handle webhook verification and incoming messages
pub async fn webhook_handler(
    req: HttpRequest,
    body: web::Bytes,
    whatsapp_service: web::Data<Arc<WhatsAppService>>,
) -> Result<HttpResponse, WhatsAppError> {
    // Handle WhatsApp verification challenge (GET request)
    if req.method() == "GET" {
        return webhook_verification(req).await;
    }
    
    let body_str = std::str::from_utf8(&body)
        .map_err(|e| WhatsAppError::InternalError(format!("Invalid UTF-8 in webhook body: {}", e)))?;
    
    info!("Received webhook payload");
    debug!("Webhook payload: {}", body_str);
    
    // Parse webhook payload
    let payload: serde_json::Value = serde_json::from_str(body_str)
        .map_err(|e| WhatsAppError::SerializationError(format!("Failed to parse webhook payload: {}", e)))?;
    
    // Process webhook event
    whatsapp_service.process_webhook(payload).await?;
    
    Ok(HttpResponse::Ok().json(json!({
        "status": "received"
    })))
}

/// Handle WhatsApp webhook verification
async fn webhook_verification(req: HttpRequest) -> Result<HttpResponse, WhatsAppError> {
    let query = web::Query::<HashMap<String, String>>::from_query(req.query_string())
        .map_err(|e| WhatsAppError::InternalError(format!("Failed to parse query parameters: {}", e)))?;
    
    let hub_mode = query.get("hub.mode");
    let hub_challenge = query.get("hub.challenge");
    let hub_verify_token = query.get("hub.verify_token");
    
    info!("Webhook verification request: mode={:?}, challenge={:?}", hub_mode, hub_challenge);
    
    // Check if this is a subscription verification
    if hub_mode == Some(&"subscribe".to_string()) {
        // Get webhook verify token from environment, fallback to hardcoded
        let expected_verify_token = std::env::var("WHATSAPP_WEBHOOK_VERIFY_TOKEN")
            .unwrap_or_else(|_| "verify_token_123".to_string());
        
        if let Some(token) = hub_verify_token {
            if token == &expected_verify_token {
                if let Some(challenge) = hub_challenge {
                    info!("Webhook verification successful, returning challenge: {}", challenge);
                    return Ok(HttpResponse::Ok()
                        .content_type("text/plain")
                        .body(challenge.clone()));
                }
            } else {
                error!("Invalid webhook verify token: expected '{}', got '{}'", expected_verify_token, token);
            }
        }
    }
    
    Ok(HttpResponse::Forbidden().json(json!({
        "error": "Forbidden"
    })))
}

// =============================================================================
// Metrics and Health Handlers
// =============================================================================

/// Get WhatsApp phone health metrics
pub async fn get_phone_health() -> HttpResponse {
    whatsapp_metrics::get_phone_health().await
}

/// Get message analytics
pub async fn get_message_analytics(
    query: web::Query<HashMap<String, String>>,
) -> HttpResponse {
    whatsapp_metrics::get_message_analytics(query).await
}

/// Get quality metrics
pub async fn get_quality_metrics() -> HttpResponse {
    whatsapp_metrics::get_quality_metrics().await
}

/// Get messaging limits
pub async fn get_messaging_limits() -> HttpResponse {
    whatsapp_metrics::get_messaging_limits().await
}

/// Get metrics dashboard data
pub async fn get_metrics_dashboard() -> HttpResponse {
    whatsapp_metrics::get_metrics_dashboard().await
}

// =============================================================================
// Route Configuration
// =============================================================================

/// Configure all WhatsApp routes
pub fn configure_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/api/v1/whatsapp")
            // Configuration management routes
            .service(
                web::scope("/configs")
                    .route("", web::get().to(list_configs))
                    .route("", web::post().to(create_config))
                    .route("/default", web::get().to(get_default_config))
                    .route("/{id}", web::get().to(get_config))
                    .route("/{id}", web::put().to(update_config))
                    .route("/{id}", web::delete().to(delete_config))
                    .route("/{id}/test", web::post().to(test_config))
                    .route("/{id}/set-default", web::post().to(set_default_config))
            )
            // Instance management routes
            .service(
                web::scope("/instances")
                    .route("", web::get().to(list_instances))
                    .route("", web::post().to(create_instance))
                    .route("/{name}/status", web::get().to(get_instance_status))
                    .route("/{name}/qrcode", web::get().to(get_qr_code))
                    .route("/{name}", web::delete().to(delete_instance))
            )
            // Messaging routes
            .service(
                web::scope("/messages")
                    .route("/send", web::post().to(send_message))
            )
            // Webhook routes
            .route("/webhook", web::get().to(webhook_handler))
            .route("/webhook", web::post().to(webhook_handler))
            // Metrics routes
            .service(
                web::scope("/metrics")
                    .route("/health", web::get().to(get_phone_health))
                    .route("/analytics", web::get().to(get_message_analytics))
                    .route("/quality", web::get().to(get_quality_metrics))
                    .route("/limits", web::get().to(get_messaging_limits))
                    .route("/dashboard", web::get().to(get_metrics_dashboard))
            )
    );
}

// Legacy route configuration for backward compatibility
pub fn configure_legacy_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/api/v1")
            // Legacy WhatsApp instance routes (for backward compatibility)
            .service(
                web::scope("/whatsapp")
                    .route("/instance/create", web::post().to(create_instance))
                    .route("/instance/{name}/status", web::get().to(get_instance_status))
                    .route("/instance/{name}/qrcode", web::get().to(get_qr_code))
                    .route("/send", web::post().to(send_message))
                    .route("/instances", web::get().to(list_instances))
                    .route("/instance/{name}", web::delete().to(delete_instance))
                    .route("/webhook", web::get().to(webhook_handler))
                    .route("/webhook", web::post().to(webhook_handler))
                    .route("/health", web::get().to(get_phone_health))
                    .route("/analytics", web::get().to(get_message_analytics))
                    .route("/quality", web::get().to(get_quality_metrics))
                    .route("/limits", web::get().to(get_messaging_limits))
                    .route("/dashboard", web::get().to(get_metrics_dashboard))
            )
            // Legacy WhatsApp configuration routes
            .service(
                web::scope("/whatsapp-configs")
                    .route("", web::get().to(list_configs))
                    .route("", web::post().to(create_config))
                    .route("/default", web::get().to(get_default_config))
                    .route("/{id}", web::get().to(get_config))
                    .route("/{id}", web::put().to(update_config))
                    .route("/{id}", web::delete().to(delete_config))
                    .route("/{id}/test", web::post().to(test_config))
                    .route("/{id}/set-default", web::post().to(set_default_config))
            )
    );
}

#[cfg(test)]
mod tests {
    use super::*;
    use actix_web::{test, web, App};

    #[actix_web::test]
    async fn test_webhook_verification() {
        let req = test::TestRequest::get()
            .uri("/webhook?hub.mode=subscribe&hub.challenge=test123&hub.verify_token=verify_token_123")
            .to_http_request();

        let result = webhook_verification(req).await;
        assert!(result.is_ok());
    }

    #[test]
    fn test_list_configs_query_parsing() {
        let query = ListConfigsQuery {
            page: Some(1),
            page_size: Some(20),
            paginated: Some(true),
        };

        assert_eq!(query.page, Some(1));
        assert_eq!(query.page_size, Some(20));
        assert_eq!(query.paginated, Some(true));
    }
}