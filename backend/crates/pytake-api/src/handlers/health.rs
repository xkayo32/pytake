use actix_web::{web, HttpResponse, Result};
use serde::{Deserialize, Serialize};
use tracing::info;

use crate::state::AppState;
use crate::middleware::error_handler::{ApiError, ApiResult};

/// Simple health check response
#[derive(Debug, Serialize, Deserialize)]
pub struct HealthResponse {
    pub status: String,
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

/// Detailed health check response
#[derive(Debug, Serialize, Deserialize)]
pub struct DetailedHealthResponse {
    pub status: String,
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub version: String,
    pub uptime: i64,
    pub checks: Vec<HealthCheckItem>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct HealthCheckItem {
    pub name: String,
    pub status: String,
    pub message: String,
    pub last_checked: chrono::DateTime<chrono::Utc>,
}

/// Basic health check endpoint - GET /health
/// 
/// This endpoint provides a simple health check that returns immediately
/// without performing any external dependency checks. It's suitable for
/// load balancer health checks.
pub async fn health_check() -> Result<HttpResponse, ApiError> {
    info!("Health check requested");
    
    let response = HealthResponse {
        status: "healthy".to_string(),
        timestamp: chrono::Utc::now(),
    };

    Ok(HttpResponse::Ok().json(response))
}

/// Detailed health check endpoint - GET /health/detailed
/// 
/// This endpoint performs comprehensive health checks including database
/// connectivity and other system dependencies. It's more suitable for
/// monitoring and debugging purposes.
pub async fn detailed_health_check(data: web::Data<AppState>) -> Result<HttpResponse, ApiError> {
    info!("Detailed health check requested");
    
    let health_result = data.health_check().await;
    
    let response = DetailedHealthResponse {
        status: if health_result.healthy { "healthy" } else { "unhealthy" },
        timestamp: chrono::Utc::now(),
        version: health_result.version,
        uptime: health_result.uptime,
        checks: health_result.checks.into_iter().map(|check| {
            HealthCheckItem {
                name: check.name,
                status: match check.status {
                    crate::state::HealthStatus::Healthy => "healthy".to_string(),
                    crate::state::HealthStatus::Unhealthy => "unhealthy".to_string(),
                    crate::state::HealthStatus::Degraded => "degraded".to_string(),
                },
                message: check.message,
                last_checked: check.last_checked,
            }
        }).collect(),
    };

    let status_code = if health_result.healthy {
        actix_web::http::StatusCode::OK
    } else {
        actix_web::http::StatusCode::SERVICE_UNAVAILABLE
    };

    Ok(HttpResponse::build(status_code).json(response))
}

/// Readiness check endpoint - GET /health/ready
/// 
/// This endpoint checks if the application is ready to serve traffic.
/// It performs checks on critical dependencies like the database.
pub async fn readiness_check(data: web::Data<AppState>) -> Result<HttpResponse, ApiError> {
    info!("Readiness check requested");
    
    let health_result = data.health_check().await;
    
    if health_result.healthy {
        let response = HealthResponse {
            status: "ready".to_string(),
            timestamp: chrono::Utc::now(),
        };
        Ok(HttpResponse::Ok().json(response))
    } else {
        let response = HealthResponse {
            status: "not_ready".to_string(),
            timestamp: chrono::Utc::now(),
        };
        Ok(HttpResponse::ServiceUnavailable().json(response))
    }
}

/// Liveness check endpoint - GET /health/live
/// 
/// This endpoint checks if the application is alive and responsive.
/// It should return quickly without performing expensive operations.
pub async fn liveness_check() -> Result<HttpResponse, ApiError> {
    info!("Liveness check requested");
    
    let response = HealthResponse {
        status: "alive".to_string(),
        timestamp: chrono::Utc::now(),
    };

    Ok(HttpResponse::Ok().json(response))
}

#[cfg(test)]
mod tests {
    use super::*;
    use actix_web::{test, web, App};

    #[actix_web::test]
    async fn test_health_check() {
        let app = test::init_service(
            App::new().route("/health", web::get().to(health_check))
        ).await;

        let req = test::TestRequest::get().uri("/health").to_request();
        let resp = test::call_service(&app, req).await;
        
        assert!(resp.status().is_success());
        
        let body: HealthResponse = test::read_body_json(resp).await;
        assert_eq!(body.status, "healthy");
    }

    #[actix_web::test]
    async fn test_liveness_check() {
        let app = test::init_service(
            App::new().route("/health/live", web::get().to(liveness_check))
        ).await;

        let req = test::TestRequest::get().uri("/health/live").to_request();
        let resp = test::call_service(&app, req).await;
        
        assert!(resp.status().is_success());
        
        let body: HealthResponse = test::read_body_json(resp).await;
        assert_eq!(body.status, "alive");
    }

    #[test]
    fn test_health_response_serialization() {
        let response = HealthResponse {
            status: "healthy".to_string(),
            timestamp: chrono::Utc::now(),
        };

        let json = serde_json::to_string(&response).unwrap();
        assert!(json.contains("healthy"));
        assert!(json.contains("timestamp"));
    }

    #[test]
    fn test_detailed_health_response_serialization() {
        let response = DetailedHealthResponse {
            status: "healthy".to_string(),
            timestamp: chrono::Utc::now(),
            version: "1.0.0".to_string(),
            uptime: 3600,
            checks: vec![
                HealthCheckItem {
                    name: "database".to_string(),
                    status: "healthy".to_string(),
                    message: "Connected".to_string(),
                    last_checked: chrono::Utc::now(),
                }
            ],
        };

        let json = serde_json::to_string(&response).unwrap();
        assert!(json.contains("healthy"));
        assert!(json.contains("database"));
        assert!(json.contains("1.0.0"));
    }
}