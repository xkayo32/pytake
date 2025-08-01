//! Metrics and dashboard handlers for API endpoints

use actix_web::{web, HttpResponse, Result as ActixResult};
use pytake_core::services::metrics::{
    MetricsService, TimeRange, AggregationType, MetricThreshold, ThresholdType, AlertSeverity,
};
use pytake_db::repositories::user::UserId;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;
use tracing::{info, error};

/// Get dashboard metrics query parameters
#[derive(Debug, Deserialize)]
pub struct DashboardQuery {
    pub time_range: Option<String>,
    pub start: Option<chrono::DateTime<chrono::Utc>>,
    pub end: Option<chrono::DateTime<chrono::Utc>>,
}

/// Time series query parameters
#[derive(Debug, Deserialize)]
pub struct TimeSeriesQuery {
    pub metric_name: String,
    pub time_range: Option<String>,
    pub start: Option<chrono::DateTime<chrono::Utc>>,
    pub end: Option<chrono::DateTime<chrono::Utc>>,
    pub aggregation: Option<String>,
    pub interval_minutes: Option<u32>,
}

/// Record metric request
#[derive(Debug, Deserialize)]
pub struct RecordMetricRequest {
    pub metric_name: String,
    pub value: f64,
    pub metadata: Option<HashMap<String, serde_json::Value>>,
}

/// Create threshold request
#[derive(Debug, Deserialize)]
pub struct CreateThresholdRequest {
    pub metric_name: String,
    pub threshold_type: String,
    pub value: f64,
    pub severity: String,
    pub enabled: Option<bool>,
}

/// Get comprehensive dashboard metrics
pub async fn get_dashboard_metrics(
    metrics_service: web::Data<MetricsService>,
    query: web::Query<DashboardQuery>,
    _user_id: UserId,
) -> ActixResult<HttpResponse> {
    info!("Getting dashboard metrics");
    
    let time_range = parse_time_range(&query)?;
    
    let dashboard_metrics = match metrics_service.get_dashboard_metrics(time_range).await {
        Ok(metrics) => metrics,
        Err(e) => {
            error!("Failed to get dashboard metrics: {}", e);
            return Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to get dashboard metrics",
                "details": e.to_string()
            })));
        }
    };
    
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "dashboard": dashboard_metrics,
        "success": true
    })))
}

/// Get messaging metrics only
pub async fn get_messaging_metrics(
    metrics_service: web::Data<MetricsService>,
    query: web::Query<DashboardQuery>,
    _user_id: UserId,
) -> ActixResult<HttpResponse> {
    info!("Getting messaging metrics");
    
    let time_range = parse_time_range(&query)?;
    
    let messaging_metrics = match metrics_service.get_messaging_metrics(&time_range).await {
        Ok(metrics) => metrics,
        Err(e) => {
            error!("Failed to get messaging metrics: {}", e);
            return Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to get messaging metrics",
                "details": e.to_string()
            })));
        }
    };
    
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "messaging_metrics": messaging_metrics,
        "success": true
    })))
}

/// Get contact metrics only
pub async fn get_contact_metrics(
    metrics_service: web::Data<MetricsService>,
    query: web::Query<DashboardQuery>,
    _user_id: UserId,
) -> ActixResult<HttpResponse> {
    info!("Getting contact metrics");
    
    let time_range = parse_time_range(&query)?;
    
    let contact_metrics = match metrics_service.get_contact_metrics(&time_range).await {
        Ok(metrics) => metrics,
        Err(e) => {
            error!("Failed to get contact metrics: {}", e);
            return Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to get contact metrics",
                "details": e.to_string()
            })));
        }
    };
    
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "contact_metrics": contact_metrics,
        "success": true
    })))
}

/// Get system metrics only
pub async fn get_system_metrics(
    metrics_service: web::Data<MetricsService>,
    _user_id: UserId,
) -> ActixResult<HttpResponse> {
    info!("Getting system metrics");
    
    let system_metrics = match metrics_service.get_system_metrics().await {
        Ok(metrics) => metrics,
        Err(e) => {
            error!("Failed to get system metrics: {}", e);
            return Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to get system metrics",
                "details": e.to_string()
            })));
        }
    };
    
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "system_metrics": system_metrics,
        "success": true
    })))
}

/// Get business metrics only
pub async fn get_business_metrics(
    metrics_service: web::Data<MetricsService>,
    query: web::Query<DashboardQuery>,
    _user_id: UserId,
) -> ActixResult<HttpResponse> {
    info!("Getting business metrics");
    
    let time_range = parse_time_range(&query)?;
    
    let business_metrics = match metrics_service.get_business_metrics(&time_range).await {
        Ok(metrics) => metrics,
        Err(e) => {
            error!("Failed to get business metrics: {}", e);
            return Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to get business metrics",
                "details": e.to_string()
            })));
        }
    };
    
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "business_metrics": business_metrics,
        "success": true
    })))
}

/// Get time series data for charts
pub async fn get_time_series(
    metrics_service: web::Data<MetricsService>,
    query: web::Query<TimeSeriesQuery>,
    _user_id: UserId,
) -> ActixResult<HttpResponse> {
    let query = query.into_inner();
    info!("Getting time series for metric: {}", query.metric_name);
    
    let time_range = if let (Some(start), Some(end)) = (query.start, query.end) {
        TimeRange::Custom { start, end }
    } else {
        match query.time_range.as_deref() {
            Some("1h") => TimeRange::LastHour,
            Some("24h") => TimeRange::Last24Hours,
            Some("7d") => TimeRange::Last7Days,
            Some("30d") => TimeRange::Last30Days,
            Some("1y") => TimeRange::LastYear,
            _ => TimeRange::Last24Hours,
        }
    };
    
    let aggregation = match query.aggregation.as_deref() {
        Some("sum") => AggregationType::Sum,
        Some("count") => AggregationType::Count,
        Some("min") => AggregationType::Min,
        Some("max") => AggregationType::Max,
        Some(p) if p.starts_with("p") => {
            if let Ok(percentile) = p[1..].parse::<f64>() {
                AggregationType::Percentile(percentile)
            } else {
                AggregationType::Average
            }
        }
        _ => AggregationType::Average,
    };
    
    let interval_minutes = query.interval_minutes.unwrap_or(15);
    
    let time_series = match metrics_service.get_time_series(
        &query.metric_name,
        time_range,
        aggregation,
        interval_minutes,
    ).await {
        Ok(series) => series,
        Err(e) => {
            error!("Failed to get time series: {}", e);
            return Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to get time series",
                "details": e.to_string()
            })));
        }
    };
    
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "time_series": time_series,
        "success": true
    })))
}

/// Get metric summary statistics
pub async fn get_metric_summary(
    metrics_service: web::Data<MetricsService>,
    path: web::Path<String>,
    query: web::Query<DashboardQuery>,
    _user_id: UserId,
) -> ActixResult<HttpResponse> {
    let metric_name = path.into_inner();
    info!("Getting metric summary for: {}", metric_name);
    
    let time_range = parse_time_range(&query)?;
    
    let summary = match metrics_service.get_metric_summary(&metric_name, time_range).await {
        Ok(summary) => summary,
        Err(e) => {
            error!("Failed to get metric summary: {}", e);
            return Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to get metric summary",
                "details": e.to_string()
            })));
        }
    };
    
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "summary": summary,
        "success": true
    })))
}

/// Record a custom metric
pub async fn record_metric(
    metrics_service: web::Data<MetricsService>,
    payload: web::Json<RecordMetricRequest>,
    _user_id: UserId,
) -> ActixResult<HttpResponse> {
    let request = payload.into_inner();
    info!("Recording metric: {} = {}", request.metric_name, request.value);
    
    match metrics_service.record_metric(
        &request.metric_name,
        request.value,
        request.metadata,
    ).await {
        Ok(()) => {
            Ok(HttpResponse::Created().json(serde_json::json!({
                "message": "Metric recorded successfully",
                "metric_name": request.metric_name,
                "value": request.value,
                "success": true
            })))
        }
        Err(e) => {
            error!("Failed to record metric: {}", e);
            Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to record metric",
                "details": e.to_string()
            })))
        }
    }
}

/// Get active alerts
pub async fn get_alerts(
    metrics_service: web::Data<MetricsService>,
    _user_id: UserId,
) -> ActixResult<HttpResponse> {
    info!("Getting active alerts");
    
    let alerts = match metrics_service.get_active_alerts().await {
        Ok(alerts) => alerts,
        Err(e) => {
            error!("Failed to get alerts: {}", e);
            return Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to get alerts",
                "details": e.to_string()
            })));
        }
    };
    
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "alerts": alerts,
        "count": alerts.len(),
        "success": true
    })))
}

/// Acknowledge an alert
pub async fn acknowledge_alert(
    metrics_service: web::Data<MetricsService>,
    path: web::Path<Uuid>,
    _user_id: UserId,
) -> ActixResult<HttpResponse> {
    let alert_id = path.into_inner();
    info!("Acknowledging alert: {}", alert_id);
    
    match metrics_service.acknowledge_alert(alert_id).await {
        Ok(()) => {
            Ok(HttpResponse::Ok().json(serde_json::json!({
                "message": "Alert acknowledged successfully",
                "alert_id": alert_id,
                "success": true
            })))
        }
        Err(e) => {
            error!("Failed to acknowledge alert: {}", e);
            Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to acknowledge alert",
                "details": e.to_string()
            })))
        }
    }
}

/// Get available metrics list
pub async fn get_available_metrics(
    _user_id: UserId,
) -> ActixResult<HttpResponse> {
    let metrics = vec![
        serde_json::json!({
            "name": "messages_per_hour",
            "description": "Number of messages processed per hour",
            "unit": "count",
            "category": "messaging"
        }),
        serde_json::json!({
            "name": "response_time_ms",
            "description": "Average API response time",
            "unit": "milliseconds",
            "category": "system"
        }),
        serde_json::json!({
            "name": "error_rate",
            "description": "API error rate",
            "unit": "percentage",
            "category": "system"
        }),
        serde_json::json!({
            "name": "active_users",
            "description": "Number of active users",
            "unit": "count",
            "category": "business"
        }),
        serde_json::json!({
            "name": "delivery_rate",
            "description": "Message delivery success rate",
            "unit": "percentage",
            "category": "messaging"
        }),
        serde_json::json!({
            "name": "contact_sync_rate",
            "description": "Contact synchronization success rate",
            "unit": "percentage",
            "category": "contacts"
        }),
    ];
    
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "metrics": metrics,
        "count": metrics.len(),
        "success": true
    })))
}

/// Get metrics dashboard summary (lightweight endpoint for widgets)
pub async fn get_dashboard_summary(
    metrics_service: web::Data<MetricsService>,
    _user_id: UserId,
) -> ActixResult<HttpResponse> {
    info!("Getting dashboard summary");
    
    // Get quick metrics for dashboard widgets
    let messaging = match metrics_service.get_messaging_metrics(&TimeRange::Last24Hours).await {
        Ok(m) => m,
        Err(_) => return Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": "Failed to get messaging metrics"
        })))
    };
    
    let system = match metrics_service.get_system_metrics().await {
        Ok(s) => s,
        Err(_) => return Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": "Failed to get system metrics"
        })))
    };
    
    let alerts = match metrics_service.get_active_alerts().await {
        Ok(a) => a,
        Err(_) => return Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": "Failed to get alerts"
        })))
    };
    
    let summary = serde_json::json!({
        "total_messages_24h": messaging.total_messages,
        "delivery_rate": messaging.delivery_rate,
        "active_conversations": messaging.active_conversations,
        "api_response_time_ms": system.average_response_time_ms,
        "error_rate": system.error_rate,
        "active_websocket_connections": system.active_websocket_connections,
        "active_alerts": alerts.len(),
        "critical_alerts": alerts.iter().filter(|a| matches!(a.threshold.severity, AlertSeverity::Critical)).count(),
        "last_updated": chrono::Utc::now()
    });
    
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "summary": summary,
        "success": true
    })))
}

/// Helper function to parse time range from query parameters
fn parse_time_range(query: &DashboardQuery) -> ActixResult<TimeRange> {
    if let (Some(start), Some(end)) = (query.start, query.end) {
        return Ok(TimeRange::Custom { start, end });
    }
    
    let time_range = match query.time_range.as_deref() {
        Some("1h") => TimeRange::LastHour,
        Some("24h") => TimeRange::Last24Hours,
        Some("7d") => TimeRange::Last7Days,
        Some("30d") => TimeRange::Last30Days,
        Some("1y") => TimeRange::LastYear,
        None => TimeRange::Last24Hours,
        Some(invalid) => {
            return Err(actix_web::error::ErrorBadRequest(format!(
                "Invalid time range: {}. Valid options: 1h, 24h, 7d, 30d, 1y",
                invalid
            )));
        }
    };
    
    Ok(time_range)
}

/// Real-time metrics endpoint (for dashboard live updates)
pub async fn get_realtime_metrics(
    metrics_service: web::Data<MetricsService>,
    _user_id: UserId,
) -> ActixResult<HttpResponse> {
    info!("Getting real-time metrics");
    
    // Get current system metrics
    let system = match metrics_service.get_system_metrics().await {
        Ok(s) => s,
        Err(e) => {
            error!("Failed to get real-time metrics: {}", e);
            return Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to get real-time metrics"
            })));
        }
    };
    
    let realtime = serde_json::json!({
        "timestamp": chrono::Utc::now(),
        "api_requests_per_minute": system.api_requests_per_minute,
        "average_response_time_ms": system.average_response_time_ms,
        "error_rate": system.error_rate,
        "active_websocket_connections": system.active_websocket_connections,
        "queue_sizes": system.queue_size,
        "memory_usage_mb": system.memory_usage_mb,
        "cpu_usage_percent": system.cpu_usage_percent
    });
    
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "realtime": realtime,
        "success": true
    })))
}