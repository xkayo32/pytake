//! Orchestration API handlers

use actix_web::{web, HttpResponse, Result};
use pytake_core::services::orchestration::{
    PyTakeOrchestratorTrait, SystemHealthStatus, SystemStats, BulkOperationResult,
};
use pytake_core::services::conversation_integration::{IncomingMessage, OutgoingMessageRequest};
use pytake_core::messaging::Platform;
use crate::state::AppState;
use serde::{Deserialize, Serialize};
use tracing::{info, warn, error};
use uuid::Uuid;

/// Request to send a customer message
#[derive(Debug, Deserialize)]
pub struct SendMessageRequest {
    pub platform: Platform,
    pub conversation_id: Uuid,
    pub to: String,
    pub content: MessageContentRequest,
    pub template_id: Option<Uuid>,
    pub agent_id: Option<Uuid>,
}

/// Message content for API requests
#[derive(Debug, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum MessageContentRequest {
    Text { text: String },
    Media { 
        url: String, 
        caption: Option<String>,
        filename: Option<String>,
        mime_type: String,
    },
    Location { 
        latitude: f64, 
        longitude: f64, 
        address: Option<String>,
        name: Option<String>,
    },
}

/// Bulk message request
#[derive(Debug, Deserialize)]
pub struct BulkMessageRequest {
    pub messages: Vec<SendMessageRequest>,
}

/// Webhook event request
#[derive(Debug, Deserialize)]
pub struct WebhookEventRequest {
    pub platform: Platform,
    pub event_type: String,
    pub payload: serde_json::Value,
}

/// API response for message sending
#[derive(Debug, Serialize)]
pub struct MessageResponse {
    pub success: bool,
    pub message_id: Option<String>,
    pub conversation_id: Option<String>,
    pub error: Option<String>,
}

/// API response for system health
#[derive(Debug, Serialize)]
pub struct HealthResponse {
    pub status: SystemHealthStatus,
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

/// API response for system stats
#[derive(Debug, Serialize)]
pub struct StatsResponse {
    pub stats: SystemStats,
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

/// Handle incoming message webhook
pub async fn handle_incoming_message(
    message: web::Json<IncomingMessage>,
    app_state: web::Data<AppState>,
) -> Result<HttpResponse> {
    info!("Received incoming message from platform: {:?}", message.platform);
    
    // Get orchestrator from app state
    if let Some(orchestrator) = app_state.orchestrator() {
        match orchestrator.handle_incoming_message(message.into_inner()).await {
            Ok(conversation_id) => {
                let response = MessageResponse {
                    success: true,
                    message_id: Some("msg_123".to_string()), // TODO: Get actual message ID
                    conversation_id: Some(conversation_id),
                    error: None,
                };
                Ok(HttpResponse::Ok().json(response))
            },
            Err(e) => {
                error!("Failed to handle incoming message: {}", e);
                let response = MessageResponse {
                    success: false,
                    message_id: None,
                    conversation_id: None,
                    error: Some(e.to_string()),
                };
                Ok(HttpResponse::InternalServerError().json(response))
            }
        }
    } else {
        warn!("Orchestrator not available");
        let response = MessageResponse {
            success: false,
            message_id: None,
            conversation_id: None,
            error: Some("Orchestrator not initialized".to_string()),
        };
        Ok(HttpResponse::ServiceUnavailable().json(response))
    }
}

/// Send customer message
pub async fn send_customer_message(
    request: web::Json<SendMessageRequest>,
    app_state: web::Data<AppState>,
) -> Result<HttpResponse> {
    info!("Sending customer message via platform: {:?}", request.platform);
    
    // Convert request to internal format
    let content = match &request.content {
        MessageContentRequest::Text { text } => {
            pytake_core::messaging::MessageContent::Text { text: text.clone() }
        }
        MessageContentRequest::Media { url, caption, filename, mime_type } => {
            pytake_core::messaging::MessageContent::Media {
                media_type: pytake_core::messaging::MediaType::File, // Default
                url: url.clone(),
                caption: caption.clone(),
                filename: filename.clone(),
                mime_type: mime_type.clone(),
                size_bytes: None,
            }
        }
        MessageContentRequest::Location { latitude, longitude, address, name } => {
            pytake_core::messaging::MessageContent::Location {
                latitude: *latitude,
                longitude: *longitude,
                address: address.clone(),
                name: name.clone(),
            }
        }
    };
    
    let outgoing_request = OutgoingMessageRequest {
        platform: request.platform,
        conversation_id: request.conversation_id,
        to: request.to.clone(),
        content,
        template_id: request.template_id,
        template_context: None, // TODO: Support template context
        agent_id: request.agent_id,
        priority: None,
    };
    
    // Send through orchestrator
    if let Some(orchestrator) = app_state.orchestrator() {
        match orchestrator.send_customer_message(outgoing_request).await {
            Ok(message_id) => {
                let response = MessageResponse {
                    success: true,
                    message_id: Some(message_id),
                    conversation_id: Some(request.conversation_id.to_string()),
                    error: None,
                };
                Ok(HttpResponse::Ok().json(response))
            },
            Err(e) => {
                error!("Failed to send customer message: {}", e);
                let response = MessageResponse {
                    success: false,
                    message_id: None,
                    conversation_id: Some(request.conversation_id.to_string()),
                    error: Some(e.to_string()),
                };
                Ok(HttpResponse::InternalServerError().json(response))
            }
        }
    } else {
        warn!("Orchestrator not available");
        let response = MessageResponse {
            success: false,
            message_id: None,
            conversation_id: Some(request.conversation_id.to_string()),
            error: Some("Orchestrator not initialized".to_string()),
        };
        Ok(HttpResponse::ServiceUnavailable().json(response))
    }
}

/// Handle webhook events
pub async fn handle_webhook_event(
    request: web::Json<WebhookEventRequest>,
    app_state: web::Data<AppState>,
) -> Result<HttpResponse> {
    info!("Received webhook event: {} from {:?}", request.event_type, request.platform);
    
    // Handle through orchestrator
    if let Some(orchestrator) = app_state.orchestrator() {
        match orchestrator.handle_webhook_event(
            request.platform,
            request.event_type.clone(),
            request.payload.clone()
        ).await {
            Ok(_) => {
                Ok(HttpResponse::Ok().json(serde_json::json!({
                    "success": true,
                    "message": "Webhook event processed"
                })))
            },
            Err(e) => {
                error!("Failed to handle webhook event: {}", e);
                Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                    "success": false,
                    "error": e.to_string()
                })))
            }
        }
    } else {
        warn!("Orchestrator not available");
        Ok(HttpResponse::ServiceUnavailable().json(serde_json::json!({
            "success": false,
            "error": "Orchestrator not initialized"
        })))
    }
}

/// Get system health status
pub async fn get_health_status(
    app_state: web::Data<AppState>,
) -> Result<HttpResponse> {
    info!("Getting system health status");
    
    // Get from orchestrator
    if let Some(orchestrator) = app_state.orchestrator() {
        match orchestrator.get_health_status().await {
            Ok(status) => {
                let response = HealthResponse {
                    status,
                    timestamp: chrono::Utc::now(),
                };
                Ok(HttpResponse::Ok().json(response))
            },
            Err(e) => {
                error!("Failed to get health status: {}", e);
                Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                    "error": e.to_string()
                })))
            }
        }
    } else {
        warn!("Orchestrator not available");
        // Return basic health status without orchestrator
        use pytake_core::services::orchestration::{HealthStatus, ServiceHealth};
        use std::collections::HashMap;
        
        let mut services = HashMap::new();
        services.insert("orchestrator".to_string(), ServiceHealth {
            status: HealthStatus::Unhealthy,
            last_check: chrono::Utc::now(),
            response_time_ms: None,
            error_message: Some("Orchestrator not initialized".to_string()),
        });
        
        let status = SystemHealthStatus {
            overall_status: HealthStatus::Degraded,
            services,
            platforms: HashMap::new(),
            last_check: chrono::Utc::now(),
        };
        
        let response = HealthResponse {
            status,
            timestamp: chrono::Utc::now(),
        };
        
        Ok(HttpResponse::Ok().json(response))
    }
}

/// Get system statistics
pub async fn get_system_stats(
    app_state: web::Data<AppState>,
) -> Result<HttpResponse> {
    info!("Getting system statistics");
    
    // Get from orchestrator
    if let Some(orchestrator) = app_state.orchestrator() {
        match orchestrator.get_system_stats().await {
            Ok(stats) => {
                let response = StatsResponse {
                    stats,
                    timestamp: chrono::Utc::now(),
                };
                Ok(HttpResponse::Ok().json(response))
            },
            Err(e) => {
                error!("Failed to get system stats: {}", e);
                Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                    "error": e.to_string()
                })))
            }
        }
    } else {
        warn!("Orchestrator not available");
        // Return basic stats without orchestrator
        use pytake_core::services::orchestration::{SystemStats, PerformanceMetrics};
        use std::collections::HashMap;
        
        let stats = SystemStats {
            total_conversations: 0,
            active_conversations: 0,
            total_messages: 0,
            messages_today: 0,
            online_agents: 0,
            platform_stats: HashMap::new(),
            performance_metrics: PerformanceMetrics {
                average_conversation_resolution_time_hours: 0.0,
                agent_utilization_rate: 0.0,
                customer_satisfaction_score: None,
                first_response_time_minutes: 0.0,
            },
        };
        
        let response = StatsResponse {
            stats,
            timestamp: chrono::Utc::now(),
        };
        
        Ok(HttpResponse::Ok().json(response))
    }
}

/// Process bulk messages
pub async fn process_bulk_messages(
    request: web::Json<BulkMessageRequest>,
    app_state: web::Data<AppState>,
) -> Result<HttpResponse> {
    info!("Processing {} bulk messages", request.messages.len());
    
    if request.messages.is_empty() {
        return Ok(HttpResponse::BadRequest().json(serde_json::json!({
            "error": "No messages provided"
        })));
    }
    
    if request.messages.len() > 1000 {
        return Ok(HttpResponse::BadRequest().json(serde_json::json!({
            "error": "Too many messages (max 1000)"
        })));
    }
    
    // Convert requests
    let mut outgoing_requests = Vec::new();
    for msg_request in &request.messages {
        let content = match &msg_request.content {
            MessageContentRequest::Text { text } => {
                pytake_core::messaging::MessageContent::Text { text: text.clone() }
            }
            MessageContentRequest::Media { url, caption, filename, mime_type } => {
                pytake_core::messaging::MessageContent::Media {
                    media_type: pytake_core::messaging::MediaType::File,
                    url: url.clone(),
                    caption: caption.clone(),
                    filename: filename.clone(),
                    mime_type: mime_type.clone(),
                    size_bytes: None,
                }
            }
            MessageContentRequest::Location { latitude, longitude, address, name } => {
                pytake_core::messaging::MessageContent::Location {
                    latitude: *latitude,
                    longitude: *longitude,
                    address: address.clone(),
                    name: name.clone(),
                }
            }
        };
        
        outgoing_requests.push(OutgoingMessageRequest {
            platform: msg_request.platform,
            conversation_id: msg_request.conversation_id,
            to: msg_request.to.clone(),
            content,
            template_id: msg_request.template_id,
            template_context: None,
            agent_id: msg_request.agent_id,
            priority: None,
        });
    }
    
    // Process through orchestrator
    if let Some(orchestrator) = app_state.orchestrator() {
        match orchestrator.process_bulk_messages(outgoing_requests).await {
            Ok(result) => {
                Ok(HttpResponse::Ok().json(result))
            },
            Err(e) => {
                error!("Failed to process bulk messages: {}", e);
                Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                    "error": e.to_string()
                })))
            }
        }
    } else {
        warn!("Orchestrator not available");
        Ok(HttpResponse::ServiceUnavailable().json(serde_json::json!({
            "error": "Orchestrator not initialized"
        })))
    }
}

/// Initialize orchestrator (admin endpoint)
pub async fn initialize_system(
    app_state: web::Data<AppState>,
) -> Result<HttpResponse> {
    info!("Initializing PyTake system");
    
    // Initialize through orchestrator
    if let Some(orchestrator) = app_state.orchestrator() {
        match orchestrator.initialize().await {
            Ok(_) => {
                Ok(HttpResponse::Ok().json(serde_json::json!({
                    "success": true,
                    "message": "System initialized successfully",
                    "timestamp": chrono::Utc::now()
                })))
            },
            Err(e) => {
                error!("Failed to initialize system: {}", e);
                Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                    "success": false,
                    "error": e.to_string(),
                    "timestamp": chrono::Utc::now()
                })))
            }
        }
    } else {
        warn!("Orchestrator not available");
        Ok(HttpResponse::ServiceUnavailable().json(serde_json::json!({
            "success": false,
            "error": "Orchestrator not initialized",
            "timestamp": chrono::Utc::now()
        })))
    }
}

/// Shutdown orchestrator (admin endpoint)
pub async fn shutdown_system(
    app_state: web::Data<AppState>,
) -> Result<HttpResponse> {
    warn!("Shutting down PyTake system");
    
    // Shutdown through orchestrator
    if let Some(orchestrator) = app_state.orchestrator() {
        match orchestrator.shutdown().await {
            Ok(_) => {
                Ok(HttpResponse::Ok().json(serde_json::json!({
                    "success": true,
                    "message": "System shutdown initiated",
                    "timestamp": chrono::Utc::now()
                })))
            },
            Err(e) => {
                error!("Failed to shutdown system: {}", e);
                Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                    "success": false,
                    "error": e.to_string(),
                    "timestamp": chrono::Utc::now()
                })))
            }
        }
    } else {
        warn!("Orchestrator not available");
        Ok(HttpResponse::ServiceUnavailable().json(serde_json::json!({
            "success": false,
            "error": "Orchestrator not initialized",
            "timestamp": chrono::Utc::now()
        })))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use actix_web::{test, App};

    #[tokio::test]
    async fn test_get_health_status() {
        let app = test::init_service(
            App::new().route("/health", web::get().to(get_health_status))
        ).await;
        
        let req = test::TestRequest::get().uri("/health").to_request();
        let resp = test::call_service(&app, req).await;
        
        assert!(resp.status().is_success());
    }
    
    #[tokio::test]
    async fn test_get_system_stats() {
        let app = test::init_service(
            App::new().route("/stats", web::get().to(get_system_stats))
        ).await;
        
        let req = test::TestRequest::get().uri("/stats").to_request();
        let resp = test::call_service(&app, req).await;
        
        assert!(resp.status().is_success());
    }
}