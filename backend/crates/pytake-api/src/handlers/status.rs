use actix_web::{web, HttpResponse, Result};
use serde::{Deserialize, Serialize};
use tracing::info;

use crate::state::AppState;
use crate::middleware::error_handler::{ApiError, ApiResult};

/// API status response
#[derive(Debug, Serialize, Deserialize)]
pub struct StatusResponse {
    pub status: String,
    pub version: String,
    pub api_version: String,
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub uptime: i64,
    pub environment: String,
    pub features: Vec<String>,
}

/// System information response
#[derive(Debug, Serialize, Deserialize)]
pub struct SystemInfoResponse {
    pub service_name: String,
    pub service_version: String,
    pub api_version: String,
    pub build_info: BuildInfo,
    pub runtime_info: RuntimeInfo,
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BuildInfo {
    pub version: String,
    pub git_commit: Option<String>,
    pub build_date: Option<String>,
    pub rust_version: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RuntimeInfo {
    pub uptime_seconds: i64,
    pub environment: String,
    pub features: Vec<String>,
}

/// API status endpoint - GET /api/v1/status
/// 
/// This endpoint provides information about the API version, status,
/// and basic system information. It's useful for clients to verify
/// API compatibility and service availability.
pub async fn api_status(data: web::Data<AppState>) -> Result<HttpResponse, ApiError> {
    info!("API status requested");
    
    let uptime = data.uptime().await;
    
    let response = StatusResponse {
        status: "operational".to_string(),
        version: data.version().to_string(),
        api_version: "v1".to_string(),
        timestamp: chrono::Utc::now(),
        uptime,
        environment: std::env::var("ENVIRONMENT").unwrap_or_else(|_| "development".to_string()),
        features: get_enabled_features(),
    };

    Ok(HttpResponse::Ok().json(response))
}

/// System information endpoint - GET /api/v1/info
/// 
/// This endpoint provides detailed system information including
/// build details, runtime information, and service metadata.
pub async fn system_info(data: web::Data<AppState>) -> Result<HttpResponse, ApiError> {
    info!("System info requested");
    
    let uptime = data.uptime().await;
    
    let response = SystemInfoResponse {
        service_name: "PyTake API".to_string(),
        service_version: data.version().to_string(),
        api_version: "v1".to_string(),
        build_info: BuildInfo {
            version: env!("CARGO_PKG_VERSION").to_string(),
            git_commit: option_env!("GIT_COMMIT").map(String::from),
            build_date: option_env!("BUILD_DATE").map(String::from),
            rust_version: env!("CARGO_PKG_RUST_VERSION").unwrap_or("unknown").to_string(),
        },
        runtime_info: RuntimeInfo {
            uptime_seconds: uptime,
            environment: std::env::var("ENVIRONMENT").unwrap_or_else(|_| "development".to_string()),
            features: get_enabled_features(),
        },
        timestamp: chrono::Utc::now(),
    };

    Ok(HttpResponse::Ok().json(response))
}

/// API version endpoint - GET /api/v1/version
/// 
/// This endpoint returns just the version information in a simple format.
/// Useful for version checks and compatibility validation.
pub async fn api_version(data: web::Data<AppState>) -> Result<HttpResponse, ApiError> {
    info!("API version requested");
    
    let response = serde_json::json!({
        "version": data.version(),
        "api_version": "v1",
        "timestamp": chrono::Utc::now()
    });

    Ok(HttpResponse::Ok().json(response))
}

/// Get list of enabled features based on compile-time feature flags
fn get_enabled_features() -> Vec<String> {
    let mut features = Vec::new();
    
    // Add features based on cfg flags
    #[cfg(feature = "postgres")]
    features.push("postgres".to_string());
    
    #[cfg(feature = "sqlite")]
    features.push("sqlite".to_string());
    
    #[cfg(feature = "redis")]
    features.push("redis".to_string());
    
    #[cfg(feature = "metrics")]
    features.push("metrics".to_string());
    
    #[cfg(feature = "tracing")]
    features.push("tracing".to_string());
    
    #[cfg(debug_assertions)]
    features.push("debug".to_string());
    
    // Add default features
    features.extend([
        "actix-web".to_string(),
        "json-api".to_string(),
        "cors".to_string(),
        "health-checks".to_string(),
    ]);
    
    features.sort();
    features
}

#[cfg(test)]
mod tests {
    use super::*;
    use actix_web::{test, web, App};

    #[test]
    fn test_get_enabled_features() {
        let features = get_enabled_features();
        assert!(!features.is_empty());
        assert!(features.contains(&"actix-web".to_string()));
        assert!(features.contains(&"json-api".to_string()));
        assert!(features.contains(&"cors".to_string()));
        assert!(features.contains(&"health-checks".to_string()));
    }

    #[test]
    fn test_status_response_serialization() {
        let response = StatusResponse {
            status: "operational".to_string(),
            version: "1.0.0".to_string(),
            api_version: "v1".to_string(),
            timestamp: chrono::Utc::now(),
            uptime: 3600,
            environment: "test".to_string(),
            features: vec!["test-feature".to_string()],
        };

        let json = serde_json::to_string(&response).unwrap();
        assert!(json.contains("operational"));
        assert!(json.contains("1.0.0"));
        assert!(json.contains("v1"));
        assert!(json.contains("test"));
    }

    #[test]
    fn test_system_info_response_serialization() {
        let response = SystemInfoResponse {
            service_name: "PyTake API".to_string(),
            service_version: "1.0.0".to_string(),
            api_version: "v1".to_string(),
            build_info: BuildInfo {
                version: "1.0.0".to_string(),
                git_commit: Some("abc123".to_string()),
                build_date: Some("2024-01-01".to_string()),
                rust_version: "1.70.0".to_string(),
            },
            runtime_info: RuntimeInfo {
                uptime_seconds: 3600,
                environment: "test".to_string(),
                features: vec!["test-feature".to_string()],
            },
            timestamp: chrono::Utc::now(),
        };

        let json = serde_json::to_string(&response).unwrap();
        assert!(json.contains("PyTake API"));
        assert!(json.contains("abc123"));
        assert!(json.contains("1.70.0"));
    }

    #[test]
    fn test_build_info_with_none_values() {
        let build_info = BuildInfo {
            version: "1.0.0".to_string(),
            git_commit: None,
            build_date: None,
            rust_version: "1.70.0".to_string(),
        };

        let json = serde_json::to_string(&build_info).unwrap();
        assert!(json.contains("null"));
        assert!(json.contains("1.0.0"));
        assert!(json.contains("1.70.0"));
    }
}