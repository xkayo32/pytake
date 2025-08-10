use actix_web::{web, HttpResponse, Result};
use serde_json::json;
use std::sync::Arc;
use crate::redis_service::RedisService;
use sea_orm::DatabaseConnection;
use tracing::info;

/// Performance monitoring endpoint
pub async fn get_performance_metrics(
    db: web::Data<DatabaseConnection>,
) -> Result<HttpResponse> {
    let mut metrics = json!({
        "timestamp": chrono::Utc::now(),
        "service": "pytake-api",
        "version": "0.1.0"
    });
    
    // Database connection pool metrics
    let db_metrics = get_database_metrics(&db).await;
    metrics["database"] = db_metrics;
    
    // Redis connection metrics
    let redis_metrics = get_redis_metrics().await;
    metrics["redis"] = redis_metrics;
    
    // Memory usage (basic system info)
    let system_metrics = get_system_metrics();
    metrics["system"] = system_metrics;
    
    Ok(HttpResponse::Ok().json(metrics))
}

async fn get_database_metrics(db: &DatabaseConnection) -> serde_json::Value {
    // Basic database health check
    match db.ping().await {
        Ok(_) => json!({
            "status": "healthy",
            "connection_pool": {
                "status": "active",
                "max_connections": 100,
                "min_connections": 5,
                "idle_timeout": "300s",
                "max_lifetime": "1800s"
            }
        }),
        Err(e) => json!({
            "status": "unhealthy",
            "error": e.to_string()
        })
    }
}

async fn get_redis_metrics() -> serde_json::Value {
    match RedisService::new() {
        Ok(redis) => {
            if redis.health_check().await {
                json!({
                    "status": "healthy",
                    "caching": {
                        "enabled": true,
                        "ttl_whatsapp_config": "300s"
                    }
                })
            } else {
                json!({
                    "status": "unhealthy",
                    "caching": {
                        "enabled": false,
                        "fallback": "direct_database_access"
                    }
                })
            }
        }
        Err(e) => json!({
            "status": "disabled",
            "error": e.to_string(),
            "caching": {
                "enabled": false,
                "fallback": "direct_database_access"
            }
        })
    }
}

fn get_system_metrics() -> serde_json::Value {
    json!({
        "rate_limiting": {
            "enabled": true,
            "endpoints": {
                "auth": "5 requests/minute",
                "whatsapp_send": "100 requests/minute", 
                "config_update": "30 requests/minute"
            }
        },
        "pagination": {
            "enabled": true,
            "default_page_size": 20,
            "max_page_size": 100
        },
        "optimizations": {
            "redis_caching": true,
            "connection_pooling": true,
            "graceful_shutdown": true,
            "query_pagination": true
        }
    })
}

/// Cache statistics endpoint
pub async fn get_cache_statistics() -> Result<HttpResponse> {
    match RedisService::new() {
        Ok(redis) => {
            if redis.health_check().await {
                Ok(HttpResponse::Ok().json(json!({
                    "cache_status": "healthy",
                    "redis_connected": true,
                    "supported_operations": [
                        "whatsapp_config_caching",
                        "rate_limiting", 
                        "session_storage"
                    ],
                    "cache_keys": {
                        "whatsapp_config": "300s TTL",
                        "whatsapp_default_config": "300s TTL", 
                        "whatsapp_configs_list": "300s TTL",
                        "whatsapp_active_configs": "300s TTL"
                    }
                })))
            } else {
                Ok(HttpResponse::ServiceUnavailable().json(json!({
                    "cache_status": "unhealthy",
                    "redis_connected": false,
                    "fallback_mode": "database_direct_access"
                })))
            }
        }
        Err(e) => {
            Ok(HttpResponse::ServiceUnavailable().json(json!({
                "cache_status": "disabled",
                "redis_connected": false,
                "error": e.to_string(),
                "fallback_mode": "database_direct_access"
            })))
        }
    }
}

/// Database performance endpoint  
pub async fn get_database_performance(
    db: web::Data<DatabaseConnection>,
) -> Result<HttpResponse> {
    let start_time = std::time::Instant::now();
    
    // Simple performance test
    match db.ping().await {
        Ok(_) => {
            let response_time = start_time.elapsed();
            
            Ok(HttpResponse::Ok().json(json!({
                "database_status": "healthy",
                "ping_response_time_ms": response_time.as_millis(),
                "connection_pool": {
                    "max_connections": 100,
                    "min_connections": 5,
                    "connect_timeout": "30s",
                    "acquire_timeout": "30s", 
                    "idle_timeout": "300s",
                    "max_lifetime": "1800s"
                },
                "optimizations": {
                    "connection_pooling": true,
                    "query_logging": true,
                    "prepared_statements": true
                }
            })))
        }
        Err(e) => {
            Ok(HttpResponse::ServiceUnavailable().json(json!({
                "database_status": "unhealthy",
                "error": e.to_string(),
                "response_time_ms": start_time.elapsed().as_millis()
            })))
        }
    }
}

pub fn configure_performance_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/performance")
            .route("/metrics", web::get().to(get_performance_metrics))
            .route("/cache", web::get().to(get_cache_statistics))
            .route("/database", web::get().to(get_database_performance))
    );
}