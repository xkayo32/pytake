use actix_web::{web, HttpResponse, Scope};
use tracing::info;

use crate::handlers::{
    health::{health_check, detailed_health_check, readiness_check, liveness_check},
    status::{api_status, system_info, api_version},
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
        // Placeholder for future API endpoints
        .service(configure_user_routes())
        .service(configure_flow_routes())
        .service(configure_whatsapp_routes())
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

/// Configure WhatsApp-related routes (placeholder)
fn configure_whatsapp_routes() -> Scope {
    web::scope("/whatsapp")
        // TODO: Add WhatsApp routes
        .route("", web::get().to(placeholder_handler))
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
    ]
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