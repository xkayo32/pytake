use actix_web::{web, HttpResponse, Scope};
use tracing::info;

use crate::handlers::{
    auth::{register, login, refresh_token, logout, get_current_user},
    health::{health_check, detailed_health_check, readiness_check, liveness_check},
    status::{api_status, system_info, api_version},
    protected::configure_protected_routes,
    whatsapp,
    conversation,
    contact,
    message_status,
    websocket,
    notification,
    metrics,
    orchestration,
};

/// Configure all application routes
pub fn configure_routes(cfg: &mut web::ServiceConfig) {
    cfg
        // Health check routes (no versioning, used by load balancers)
        .service(health_routes())
        // API routes with versioning
        .service(api_v1_routes())
        // Root route
        .route("/", web::get().to(root_handler));
}

/// Configure health check routes
fn health_routes() -> Scope {
    web::scope("/health")
        .route("", web::get().to(health_check))
        .route("/", web::get().to(health_check))
        .route("/detailed", web::get().to(detailed_health_check))
        .route("/ready", web::get().to(readiness_check))
        .route("/live", web::get().to(liveness_check))
}

/// Configure API v1 routes
fn api_v1_routes() -> Scope {
    web::scope("/api/v1")
        .route("/status", web::get().to(api_status))
        .route("/info", web::get().to(system_info))
        .route("/version", web::get().to(api_version))
        // Authentication routes
        .service(configure_auth_routes())
        // Placeholder for future API endpoints
        .service(configure_user_routes())
        .service(configure_flow_routes())
        .service(configure_whatsapp_routes())
        .service(configure_conversation_routes())
        .service(configure_contact_routes())
        .service(configure_message_status_routes())
        .service(configure_websocket_routes())
        .service(configure_notification_routes())
        .service(configure_metrics_routes())
        .service(configure_orchestration_routes())
        // Protected routes examples
        .service(configure_protected_routes())
}

/// Configure authentication routes
fn configure_auth_routes() -> Scope {
    web::scope("/auth")
        .route("/register", web::post().to(register))
        .route("/login", web::post().to(login))
        .route("/refresh", web::post().to(refresh_token))
        .route("/logout", web::post().to(logout))
        .route("/me", web::get().to(get_current_user))
}

/// Configure user-related routes (placeholder)
fn configure_user_routes() -> Scope {
    web::scope("/users")
        // TODO: Add user routes
        .route("", web::get().to(placeholder_handler))
}

/// Configure flow-related routes (placeholder)
fn configure_flow_routes() -> Scope {
    web::scope("/flows")
        // TODO: Add flow routes
        .route("", web::get().to(placeholder_handler))
}

/// Configure WhatsApp-related routes
fn configure_whatsapp_routes() -> Scope {
    web::scope("/whatsapp")
        .route("/webhook", web::get().to(whatsapp::verify_webhook))
        .route("/webhook", web::post().to(whatsapp::process_webhook))
        .route("/send", web::post().to(whatsapp::send_message))
        .route("/media", web::post().to(whatsapp::upload_media))
}

/// Configure conversation routes
fn configure_conversation_routes() -> Scope {
    web::scope("/conversations")
        // List conversations
        .route("", web::get().to(conversation::get_conversations))
        // Get conversation statistics
        .route("/stats", web::get().to(conversation::get_conversation_stats))
        // Get single conversation
        .route("/{id}", web::get().to(conversation::get_conversation))
        // Update conversation
        .route("/{id}", web::patch().to(conversation::update_conversation))
        // Assign conversation
        .route("/{id}/assign", web::post().to(conversation::assign_conversation))
        // Unassign conversation
        .route("/{id}/unassign", web::post().to(conversation::unassign_conversation))
        // Archive conversation
        .route("/{id}/archive", web::post().to(conversation::archive_conversation))
        // Get conversation messages
        .route("/{id}/messages", web::get().to(conversation::get_conversation_messages))
        // Send message in conversation
        .route("/{id}/messages", web::post().to(conversation::send_message))
}

/// Configure contact routes
fn configure_contact_routes() -> Scope {
    web::scope("/contacts")
        // List contacts
        .route("", web::get().to(contact::list_contacts))
        // Sync contacts
        .route("/sync", web::post().to(contact::sync_contacts))
        // Sync stale contacts
        .route("/sync/stale", web::post().to(contact::sync_stale_contacts))
        // Get sync statistics
        .route("/sync/stats", web::get().to(contact::get_sync_stats))
        // Get single contact
        .route("/{id}", web::get().to(contact::get_contact))
        // Update contact
        .route("/{id}", web::patch().to(contact::update_contact))
}

/// Configure message status routes
fn configure_message_status_routes() -> Scope {
    web::scope("/messages")
        // Get message status
        .route("/{id}/status", web::get().to(message_status::get_message_status))
        // Get conversation message statuses
        .route("/conversation/{id}/statuses", web::get().to(message_status::get_conversation_statuses))
        // Retry failed messages
        .route("/retry", web::post().to(message_status::retry_failed_messages))
        // Get delivery metrics
        .route("/metrics", web::get().to(message_status::get_delivery_metrics))
        // Get failed messages
        .route("/failed", web::get().to(message_status::get_failed_messages))
}

/// Configure WebSocket routes
fn configure_websocket_routes() -> Scope {
    web::scope("/ws")
        .route("", web::get().to(websocket::ws_handler))
        .route("/", web::get().to(websocket::ws_handler))
        .route("/stats", web::get().to(websocket::ws_stats))
}

/// Configure notification routes
fn configure_notification_routes() -> Scope {
    web::scope("/notifications")
        // Create notification
        .route("", web::post().to(notification::create_notification))
        // Get user notifications
        .route("", web::get().to(notification::get_notifications))
        // Create from template
        .route("/template", web::post().to(notification::create_from_template))
        // Get templates
        .route("/templates", web::get().to(notification::get_templates))
        // Get unread count
        .route("/unread/count", web::get().to(notification::get_unread_count))
        // Mark as read
        .route("/read", web::patch().to(notification::mark_as_read))
        // Test notification (debug only)
        .configure(|cfg| {
            #[cfg(debug_assertions)]
            cfg.route("/test", web::post().to(notification::send_test_notification));
        })
}

/// Root handler - returns basic API information
async fn root_handler() -> HttpResponse {
    info!("Root endpoint accessed");
    
    let response = serde_json::json!({
        "service": "PyTake API",
        "version": env!("CARGO_PKG_VERSION"),
        "description": "REST API server for PyTake application",
        "api_version": "v1",
        "endpoints": {
            "health": "/health",
            "detailed_health": "/health/detailed",
            "readiness": "/health/ready",
            "liveness": "/health/live",
            "api_status": "/api/v1/status",
            "system_info": "/api/v1/info",
            "version": "/api/v1/version"
        },
        "documentation": {
            "openapi": "/api/v1/docs/openapi.json",
            "swagger_ui": "/api/v1/docs/swagger-ui/"
        },
        "timestamp": chrono::Utc::now()
    });

    HttpResponse::Ok().json(response)
}

/// Placeholder handler for routes not yet implemented
async fn placeholder_handler() -> HttpResponse {
    let response = serde_json::json!({
        "message": "This endpoint is not yet implemented",
        "status": "placeholder",
        "timestamp": chrono::Utc::now()
    });

    HttpResponse::NotImplemented().json(response)
}

/// Configure development-specific routes (only available in debug builds)
#[cfg(debug_assertions)]
pub fn configure_dev_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/dev")
            .route("/ping", web::get().to(dev_ping_handler))
            .route("/echo", web::post().to(dev_echo_handler))
            .route("/error", web::get().to(dev_error_handler))
    );
}

#[cfg(debug_assertions)]
async fn dev_ping_handler() -> HttpResponse {
    HttpResponse::Ok().json(serde_json::json!({
        "message": "pong",
        "timestamp": chrono::Utc::now()
    }))
}

#[cfg(debug_assertions)]
async fn dev_echo_handler(body: web::Json<serde_json::Value>) -> HttpResponse {
    HttpResponse::Ok().json(serde_json::json!({
        "echo": body.into_inner(),
        "timestamp": chrono::Utc::now()
    }))
}

#[cfg(debug_assertions)]
async fn dev_error_handler() -> Result<HttpResponse, crate::middleware::error_handler::ApiError> {
    Err(crate::middleware::error_handler::ApiError::Internal(
        "This is a test error for development purposes".to_string()
    ))
}

/// Route information for documentation or introspection
#[derive(serde::Serialize, serde::Deserialize)]
pub struct RouteInfo {
    pub path: String,
    pub method: String,
    pub description: String,
    pub version: String,
}

/// Get all available routes for documentation purposes
pub fn get_route_info() -> Vec<RouteInfo> {
    vec![
        RouteInfo {
            path: "/".to_string(),
            method: "GET".to_string(),
            description: "Root endpoint with API information".to_string(),
            version: "v1".to_string(),
        },
        RouteInfo {
            path: "/health".to_string(),
            method: "GET".to_string(),
            description: "Basic health check".to_string(),
            version: "v1".to_string(),
        },
        RouteInfo {
            path: "/health/detailed".to_string(),
            method: "GET".to_string(),
            description: "Detailed health check with system status".to_string(),
            version: "v1".to_string(),
        },
        RouteInfo {
            path: "/health/ready".to_string(),
            method: "GET".to_string(),
            description: "Readiness check for Kubernetes".to_string(),
            version: "v1".to_string(),
        },
        RouteInfo {
            path: "/health/live".to_string(),
            method: "GET".to_string(),
            description: "Liveness check for Kubernetes".to_string(),
            version: "v1".to_string(),
        },
        RouteInfo {
            path: "/api/v1/status".to_string(),
            method: "GET".to_string(),
            description: "API status and version information".to_string(),
            version: "v1".to_string(),
        },
        RouteInfo {
            path: "/api/v1/info".to_string(),
            method: "GET".to_string(),
            description: "Detailed system information".to_string(),
            version: "v1".to_string(),
        },
        RouteInfo {
            path: "/api/v1/version".to_string(),
            method: "GET".to_string(),
            description: "API version information".to_string(),
            version: "v1".to_string(),
        },
        RouteInfo {
            path: "/api/v1/auth/register".to_string(),
            method: "POST".to_string(),
            description: "Register a new user account".to_string(),
            version: "v1".to_string(),
        },
        RouteInfo {
            path: "/api/v1/auth/login".to_string(),
            method: "POST".to_string(),
            description: "Authenticate user with email and password".to_string(),
            version: "v1".to_string(),
        },
        RouteInfo {
            path: "/api/v1/auth/refresh".to_string(),
            method: "POST".to_string(),
            description: "Refresh access token using refresh token".to_string(),
            version: "v1".to_string(),
        },
        RouteInfo {
            path: "/api/v1/auth/logout".to_string(),
            method: "POST".to_string(),
            description: "Logout user and revoke session".to_string(),
            version: "v1".to_string(),
        },
        RouteInfo {
            path: "/api/v1/auth/me".to_string(),
            method: "GET".to_string(),
            description: "Get current user information".to_string(),
            version: "v1".to_string(),
        },
    ]
}

/// Configure metrics routes
fn configure_metrics_routes() -> Scope {
    web::scope("/metrics")
        .route("/dashboard", web::get().to(metrics::get_dashboard_metrics))
        .route("/messaging", web::get().to(metrics::get_messaging_metrics))
        .route("/contacts", web::get().to(metrics::get_contact_metrics))
        .route("/system", web::get().to(metrics::get_system_metrics))
        .route("/business", web::get().to(metrics::get_business_metrics))
        .route("/time-series", web::get().to(metrics::get_time_series))
        .route("/summary/{metric_name}", web::get().to(metrics::get_metric_summary))
        .route("/record", web::post().to(metrics::record_metric))
        .route("/alerts", web::get().to(metrics::get_alerts))
        .route("/alerts/{id}/acknowledge", web::post().to(metrics::acknowledge_alert))
        .route("/available", web::get().to(metrics::get_available_metrics))
        .route("/summary", web::get().to(metrics::get_dashboard_summary))
        .route("/realtime", web::get().to(metrics::get_realtime_metrics))
}

/// Configure orchestration routes
fn configure_orchestration_routes() -> Scope {
    web::scope("/system")
        // System health and stats
        .route("/health", web::get().to(orchestration::get_health_status))
        .route("/stats", web::get().to(orchestration::get_system_stats))
        
        // Message handling
        .route("/messages/incoming", web::post().to(orchestration::handle_incoming_message))
        .route("/messages/send", web::post().to(orchestration::send_customer_message))
        .route("/messages/bulk", web::post().to(orchestration::process_bulk_messages))
        
        // Webhook handling
        .route("/webhooks/event", web::post().to(orchestration::handle_webhook_event))
        
        // System management (admin only)
        .route("/initialize", web::post().to(orchestration::initialize_system))
        .route("/shutdown", web::post().to(orchestration::shutdown_system))
}

#[cfg(test)]
mod tests {
    use super::*;
    use actix_web::{test, App};

    #[actix_web::test]
    async fn test_root_handler() {
        let app = test::init_service(
            App::new().route("/", web::get().to(root_handler))
        ).await;

        let req = test::TestRequest::get().uri("/").to_request();
        let resp = test::call_service(&app, req).await;
        
        assert!(resp.status().is_success());
        
        let body: serde_json::Value = test::read_body_json(resp).await;
        assert_eq!(body["service"], "PyTake API");
        assert_eq!(body["api_version"], "v1");
    }

    #[actix_web::test]
    async fn test_placeholder_handler() {
        let app = test::init_service(
            App::new().route("/placeholder", web::get().to(placeholder_handler))
        ).await;

        let req = test::TestRequest::get().uri("/placeholder").to_request();
        let resp = test::call_service(&app, req).await;
        
        assert_eq!(resp.status(), actix_web::http::StatusCode::NOT_IMPLEMENTED);
        
        let body: serde_json::Value = test::read_body_json(resp).await;
        assert_eq!(body["status"], "placeholder");
    }

    #[test]
    fn test_get_route_info() {
        let routes = get_route_info();
        assert!(!routes.is_empty());
        
        let root_route = routes.iter().find(|r| r.path == "/").unwrap();
        assert_eq!(root_route.method, "GET");
        assert_eq!(root_route.version, "v1");
    }

    #[cfg(debug_assertions)]
    #[actix_web::test]
    async fn test_dev_ping_handler() {
        let app = test::init_service(
            App::new().route("/ping", web::get().to(dev_ping_handler))
        ).await;

        let req = test::TestRequest::get().uri("/ping").to_request();
        let resp = test::call_service(&app, req).await;
        
        assert!(resp.status().is_success());
        
        let body: serde_json::Value = test::read_body_json(resp).await;
        assert_eq!(body["message"], "pong");
    }

    #[cfg(debug_assertions)]
    #[actix_web::test]
    async fn test_dev_echo_handler() {
        let app = test::init_service(
            App::new().route("/echo", web::post().to(dev_echo_handler))
        ).await;

        let test_data = serde_json::json!({"test": "data"});
        let req = test::TestRequest::post()
            .uri("/echo")
            .set_json(&test_data)
            .to_request();
        let resp = test::call_service(&app, req).await;
        
        assert!(resp.status().is_success());
        
        let body: serde_json::Value = test::read_body_json(resp).await;
        assert_eq!(body["echo"]["test"], "data");
    }
}