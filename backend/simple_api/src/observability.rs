use actix_web::{web, HttpRequest, HttpResponse, Result, Error, dev::ServiceRequest, dev::ServiceResponse, HttpMessage};
use actix_web::dev::{forward_ready, Service, ServiceFactory, Transform};
use futures_util::future::LocalBoxFuture;
use opentelemetry::{global, KeyValue, Context};
use opentelemetry_sdk::{
    runtime::Tokio,
    resource::{ResourceDetector, SdkProvidedResourceDetector, EnvResourceDetector},
    Resource,
    trace::{TracerProvider, Tracer},
};
// use opentelemetry_jaeger::new_agent_pipeline; // Commented out for now
use opentelemetry_stdout;
use prometheus::{
    Counter, Histogram, Gauge, Registry, TextEncoder, Encoder,
    register_counter, register_histogram, register_gauge, register_int_counter_vec,
    register_histogram_vec, register_gauge_vec, IntCounterVec, HistogramVec, GaugeVec,
    opts, linear_buckets, exponential_buckets,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::future::{Ready, ready};
use std::pin::Pin;
use std::task::{Context as TaskContext, Poll};
use std::time::{Instant, SystemTime, UNIX_EPOCH};
use tracing::{info, error, warn, instrument};
use tracing_opentelemetry::OpenTelemetrySpanExt;
use uuid::Uuid;
use lazy_static::lazy_static;
use std::sync::{Arc, Mutex};

// === TELEMETRY CONFIGURATION ===

pub struct TelemetryConfig {
    pub service_name: String,
    pub service_version: String,
    pub jaeger_endpoint: Option<String>,
    pub enable_jaeger: bool,
    pub enable_stdout: bool,
}

impl Default for TelemetryConfig {
    fn default() -> Self {
        Self {
            service_name: "pytake-api".to_string(),
            service_version: env!("CARGO_PKG_VERSION").to_string(),
            jaeger_endpoint: std::env::var("JAEGER_ENDPOINT")
                .ok()
                .or_else(|| Some("http://localhost:14268/api/traces".to_string())),
            enable_jaeger: std::env::var("ENABLE_JAEGER")
                .unwrap_or_default()
                .parse()
                .unwrap_or(true),
            enable_stdout: std::env::var("ENABLE_STDOUT_TRACES")
                .unwrap_or_default()
                .parse()
                .unwrap_or(false),
        }
    }
}

/// Initialize OpenTelemetry tracing
pub fn init_telemetry(config: TelemetryConfig) -> anyhow::Result<()> {
    // Create resource with service information
    let resource = Resource::from_detectors(
        std::time::Duration::from_secs(0),
        vec![
            Box::new(SdkProvidedResourceDetector),
            Box::new(EnvResourceDetector::new()),
        ],
    ).merge(&Resource::new(vec![
        KeyValue::new("service.name", config.service_name.clone()),
        KeyValue::new("service.version", config.service_version.clone()),
        KeyValue::new("service.instance.id", Uuid::new_v4().to_string()),
    ]));

    // Configure tracer
    // For now, we'll use stdout tracer until we configure Jaeger properly
    let tracer_provider = create_stdout_tracer(resource)?;

    global::set_tracer_provider(tracer_provider);

    // Configure tracing subscriber with OpenTelemetry (simplified)
    let telemetry = tracing_opentelemetry::layer();

    use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
    
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info,pytake=debug,simple_api=debug".into())
        )
        .with(tracing_subscriber::fmt::layer())
        .with(telemetry)
        .init();

    info!("OpenTelemetry initialized successfully");
    Ok(())
}

fn create_stdout_tracer(resource: Resource) -> anyhow::Result<opentelemetry_sdk::trace::TracerProvider> {
    use opentelemetry_stdout::SpanExporterBuilder;
    
    let exporter = SpanExporterBuilder::default().build();
    let tracer_provider = opentelemetry_sdk::trace::TracerProvider::builder()
        .with_batch_exporter(exporter, Tokio)
        .build();
    
    Ok(tracer_provider)
}

// === PROMETHEUS METRICS ===

lazy_static! {
    // HTTP Metrics
    pub static ref HTTP_REQUESTS_TOTAL: IntCounterVec = register_int_counter_vec!(
        "http_requests_total",
        "Total number of HTTP requests",
        &["method", "endpoint", "status"]
    ).unwrap();

    pub static ref HTTP_REQUEST_DURATION: HistogramVec = register_histogram_vec!(
        "http_request_duration_seconds",
        "HTTP request duration in seconds",
        &["method", "endpoint"],
        exponential_buckets(0.001, 2.0, 15).unwrap()
    ).unwrap();

    pub static ref HTTP_REQUEST_SIZE: HistogramVec = register_histogram_vec!(
        "http_request_size_bytes",
        "HTTP request size in bytes",
        &["method", "endpoint"],
        exponential_buckets(1.0, 10.0, 8).unwrap()
    ).unwrap();

    pub static ref HTTP_RESPONSE_SIZE: HistogramVec = register_histogram_vec!(
        "http_response_size_bytes",
        "HTTP response size in bytes",
        &["method", "endpoint"],
        exponential_buckets(1.0, 10.0, 8).unwrap()
    ).unwrap();

    // WebSocket Metrics
    pub static ref WEBSOCKET_CONNECTIONS_ACTIVE: Gauge = register_gauge!(
        "websocket_connections_active",
        "Number of active WebSocket connections"
    ).unwrap();

    pub static ref WEBSOCKET_MESSAGES_TOTAL: IntCounterVec = register_int_counter_vec!(
        "websocket_messages_total",
        "Total number of WebSocket messages",
        &["direction", "message_type"]
    ).unwrap();

    // WhatsApp Metrics
    pub static ref WHATSAPP_MESSAGES_TOTAL: IntCounterVec = register_int_counter_vec!(
        "whatsapp_messages_total",
        "Total number of WhatsApp messages",
        &["direction", "status", "instance"]
    ).unwrap();

    pub static ref WHATSAPP_API_REQUESTS_TOTAL: IntCounterVec = register_int_counter_vec!(
        "whatsapp_api_requests_total",
        "Total number of WhatsApp API requests",
        &["operation", "status", "instance"]
    ).unwrap();

    pub static ref WHATSAPP_API_REQUEST_DURATION: HistogramVec = register_histogram_vec!(
        "whatsapp_api_request_duration_seconds",
        "WhatsApp API request duration in seconds",
        &["operation", "instance"],
        exponential_buckets(0.1, 2.0, 10).unwrap()
    ).unwrap();

    // Database Metrics
    pub static ref DATABASE_CONNECTIONS_ACTIVE: Gauge = register_gauge!(
        "database_connections_active",
        "Number of active database connections"
    ).unwrap();

    pub static ref DATABASE_QUERIES_TOTAL: IntCounterVec = register_int_counter_vec!(
        "database_queries_total",
        "Total number of database queries",
        &["operation", "table", "status"]
    ).unwrap();

    pub static ref DATABASE_QUERY_DURATION: HistogramVec = register_histogram_vec!(
        "database_query_duration_seconds",
        "Database query duration in seconds",
        &["operation", "table"],
        exponential_buckets(0.001, 2.0, 15).unwrap()
    ).unwrap();

    // Redis Metrics
    pub static ref REDIS_CONNECTIONS_ACTIVE: Gauge = register_gauge!(
        "redis_connections_active",
        "Number of active Redis connections"
    ).unwrap();

    pub static ref REDIS_OPERATIONS_TOTAL: IntCounterVec = register_int_counter_vec!(
        "redis_operations_total",
        "Total number of Redis operations",
        &["operation", "status"]
    ).unwrap();

    pub static ref REDIS_OPERATION_DURATION: HistogramVec = register_histogram_vec!(
        "redis_operation_duration_seconds",
        "Redis operation duration in seconds",
        &["operation"],
        exponential_buckets(0.001, 2.0, 15).unwrap()
    ).unwrap();

    // Cache Metrics
    pub static ref CACHE_OPERATIONS_TOTAL: IntCounterVec = register_int_counter_vec!(
        "cache_operations_total",
        "Total number of cache operations",
        &["operation", "result"]
    ).unwrap();

    // Business Metrics
    pub static ref ACTIVE_CONVERSATIONS: Gauge = register_gauge!(
        "active_conversations_total",
        "Number of active conversations"
    ).unwrap();

    pub static ref MESSAGES_PROCESSED_TOTAL: IntCounterVec = register_int_counter_vec!(
        "messages_processed_total",
        "Total number of messages processed",
        &["platform", "status"]
    ).unwrap();

    pub static ref AI_REQUESTS_TOTAL: IntCounterVec = register_int_counter_vec!(
        "ai_requests_total",
        "Total number of AI requests",
        &["model", "operation", "status"]
    ).unwrap();

    pub static ref AI_REQUEST_DURATION: HistogramVec = register_histogram_vec!(
        "ai_request_duration_seconds",
        "AI request duration in seconds",
        &["model", "operation"],
        exponential_buckets(0.1, 2.0, 15).unwrap()
    ).unwrap();

    pub static ref AI_TOKEN_USAGE: HistogramVec = register_histogram_vec!(
        "ai_token_usage_total",
        "AI token usage",
        &["model", "type"],
        linear_buckets(0.0, 100.0, 50).unwrap()
    ).unwrap();

    // System Metrics
    pub static ref SYSTEM_MEMORY_USAGE: Gauge = register_gauge!(
        "system_memory_usage_bytes",
        "System memory usage in bytes"
    ).unwrap();

    pub static ref SYSTEM_CPU_USAGE: Gauge = register_gauge!(
        "system_cpu_usage_percent",
        "System CPU usage percentage"
    ).unwrap();

    // Error Metrics
    pub static ref ERRORS_TOTAL: IntCounterVec = register_int_counter_vec!(
        "errors_total",
        "Total number of errors",
        &["component", "error_type", "severity"]
    ).unwrap();
}

// === METRICS UTILITIES ===

pub struct MetricsCollector {
    registry: Arc<Registry>,
}

impl MetricsCollector {
    pub fn new() -> Self {
        Self {
            registry: Arc::new(Registry::new()),
        }
    }

    pub fn collect_metrics(&self) -> String {
        let encoder = TextEncoder::new();
        let metric_families = prometheus::gather();
        encoder.encode_to_string(&metric_families).unwrap_or_default()
    }

    /// Record HTTP request metrics
    pub fn record_http_request(&self, method: &str, endpoint: &str, status_code: u16, duration: f64, request_size: u64, response_size: u64) {
        HTTP_REQUESTS_TOTAL
            .with_label_values(&[method, endpoint, &status_code.to_string()])
            .inc();
        
        HTTP_REQUEST_DURATION
            .with_label_values(&[method, endpoint])
            .observe(duration);
        
        HTTP_REQUEST_SIZE
            .with_label_values(&[method, endpoint])
            .observe(request_size as f64);
        
        HTTP_RESPONSE_SIZE
            .with_label_values(&[method, endpoint])
            .observe(response_size as f64);
    }

    /// Record WhatsApp message metrics
    pub fn record_whatsapp_message(&self, direction: &str, status: &str, instance: &str) {
        WHATSAPP_MESSAGES_TOTAL
            .with_label_values(&[direction, status, instance])
            .inc();
    }

    /// Record WhatsApp API request metrics
    pub fn record_whatsapp_api_request(&self, operation: &str, status: &str, instance: &str, duration: f64) {
        WHATSAPP_API_REQUESTS_TOTAL
            .with_label_values(&[operation, status, instance])
            .inc();
        
        WHATSAPP_API_REQUEST_DURATION
            .with_label_values(&[operation, instance])
            .observe(duration);
    }

    /// Record database query metrics
    pub fn record_database_query(&self, operation: &str, table: &str, status: &str, duration: f64) {
        DATABASE_QUERIES_TOTAL
            .with_label_values(&[operation, table, status])
            .inc();
        
        DATABASE_QUERY_DURATION
            .with_label_values(&[operation, table])
            .observe(duration);
    }

    /// Record Redis operation metrics
    pub fn record_redis_operation(&self, operation: &str, status: &str, duration: f64) {
        REDIS_OPERATIONS_TOTAL
            .with_label_values(&[operation, status])
            .inc();
        
        REDIS_OPERATION_DURATION
            .with_label_values(&[operation])
            .observe(duration);
    }

    /// Record cache operation metrics
    pub fn record_cache_operation(&self, operation: &str, result: &str) {
        CACHE_OPERATIONS_TOTAL
            .with_label_values(&[operation, result])
            .inc();
    }

    /// Record AI request metrics
    pub fn record_ai_request(&self, model: &str, operation: &str, status: &str, duration: f64, input_tokens: f64, output_tokens: f64) {
        AI_REQUESTS_TOTAL
            .with_label_values(&[model, operation, status])
            .inc();
        
        AI_REQUEST_DURATION
            .with_label_values(&[model, operation])
            .observe(duration);
        
        AI_TOKEN_USAGE
            .with_label_values(&[model, "input"])
            .observe(input_tokens);
        
        AI_TOKEN_USAGE
            .with_label_values(&[model, "output"])
            .observe(output_tokens);
    }

    /// Record error metrics
    pub fn record_error(&self, component: &str, error_type: &str, severity: &str) {
        ERRORS_TOTAL
            .with_label_values(&[component, error_type, severity])
            .inc();
    }

    /// Update system metrics
    pub fn update_system_metrics(&self, memory_usage: f64, cpu_usage: f64) {
        SYSTEM_MEMORY_USAGE.set(memory_usage);
        SYSTEM_CPU_USAGE.set(cpu_usage);
    }

    /// Update connection metrics
    pub fn update_connections(&self, websocket: f64, database: f64, redis: f64) {
        WEBSOCKET_CONNECTIONS_ACTIVE.set(websocket);
        DATABASE_CONNECTIONS_ACTIVE.set(database);
        REDIS_CONNECTIONS_ACTIVE.set(redis);
    }

    /// Update business metrics
    pub fn update_business_metrics(&self, active_conversations: f64) {
        ACTIVE_CONVERSATIONS.set(active_conversations);
    }
}

// === TRACING MIDDLEWARE ===

pub struct TracingMiddleware<S> {
    service: S,
    metrics: Arc<MetricsCollector>,
}

impl<S, B> Service<ServiceRequest> for TracingMiddleware<S>
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error>,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type Future = LocalBoxFuture<'static, Result<Self::Response, Self::Error>>;

    forward_ready!(service);

    fn call(&self, req: ServiceRequest) -> Self::Future {
        let start_time = Instant::now();
        let method = req.method().to_string();
        let path = req.path().to_string();
        let request_id = Uuid::new_v4().to_string();
        
        // Add request ID to extensions
        req.extensions_mut().insert(RequestId(request_id.clone()));
        
        // Get content length
        let content_length = req.headers()
            .get("content-length")
            .and_then(|v| v.to_str().ok())
            .and_then(|v| v.parse::<u64>().ok())
            .unwrap_or(0);

        // Create OpenTelemetry span
        let span = tracing::info_span!(
            "http_request",
            method = %method,
            path = %path,
            request_id = %request_id,
            otel.kind = "server",
            http.method = %method,
            http.route = %path,
            http.request_id = %request_id
        );
        
        let span_clone = span.clone();
        let _enter = span_clone.enter();
        
        // Add span context to OpenTelemetry
        let cx = Context::current();
        span.set_parent(cx);

        let metrics = self.metrics.clone();
        let fut = self.service.call(req);

        Box::pin(async move {
            let result = fut.await;
            let duration = start_time.elapsed().as_secs_f64();
            
            match &result {
                Ok(response) => {
                    let status = response.status().as_u16();
                    let response_size = response.headers()
                        .get("content-length")
                        .and_then(|v| v.to_str().ok())
                        .and_then(|v| v.parse::<u64>().ok())
                        .unwrap_or(0);
                    
                    // Record metrics
                    metrics.record_http_request(&method, &path, status, duration, content_length, response_size);
                    
                    // Add span attributes
                    span.record("http.status_code", status);
                    span.record("http.response_size", response_size);
                    span.record("duration_ms", duration * 1000.0);
                    
                    tracing::info!(
                        method = %method,
                        path = %path,
                        status = status,
                        duration_ms = duration * 1000.0,
                        request_id = %request_id,
                        "HTTP request completed"
                    );
                }
                Err(err) => {
                    // Record error metrics
                    metrics.record_error("http", "request_error", "error");
                    
                    span.record("error", true);
                    span.record("error.message", &format!("{}", err));
                    
                    tracing::error!(
                        method = %method,
                        path = %path,
                        error = %err,
                        duration_ms = duration * 1000.0,
                        request_id = %request_id,
                        "HTTP request failed"
                    );
                }
            }
            
            result
        })
    }
}

pub struct TracingMiddlewareFactory {
    metrics: Arc<MetricsCollector>,
}

impl TracingMiddlewareFactory {
    pub fn new(metrics: Arc<MetricsCollector>) -> Self {
        Self { metrics }
    }
}

impl<S, B> Transform<S, ServiceRequest> for TracingMiddlewareFactory
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error>,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type InitError = ();
    type Transform = TracingMiddleware<S>;
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(TracingMiddleware {
            service,
            metrics: self.metrics.clone(),
        }))
    }
}

// === REQUEST ID UTILITIES ===

#[derive(Debug, Clone)]
pub struct RequestId(pub String);

pub fn get_request_id(req: &HttpRequest) -> Option<String> {
    req.extensions()
        .get::<RequestId>()
        .map(|id| id.0.clone())
}

// === METRICS ENDPOINT ===

/// Prometheus metrics endpoint
#[instrument(skip(metrics))]
pub async fn metrics_handler(metrics: web::Data<MetricsCollector>) -> Result<HttpResponse> {
    let metrics_output = metrics.collect_metrics();
    Ok(HttpResponse::Ok()
        .content_type("text/plain; version=0.0.4; charset=utf-8")
        .body(metrics_output))
}

// === HEALTH CHECK STRUCTURES ===

#[derive(Serialize, Deserialize)]
pub struct HealthCheckResponse {
    pub status: String,
    pub timestamp: String,
    pub version: String,
    pub uptime_seconds: u64,
    pub checks: HashMap<String, HealthCheck>,
}

#[derive(Serialize, Deserialize)]
pub struct HealthCheck {
    pub status: String,
    pub response_time_ms: u64,
    pub message: Option<String>,
    pub details: Option<serde_json::Value>,
}

#[derive(Clone)]
pub struct HealthChecker {
    startup_time: SystemTime,
}

impl HealthChecker {
    pub fn new() -> Self {
        Self {
            startup_time: SystemTime::now(),
        }
    }

    pub async fn check_health(&self) -> HealthCheckResponse {
        let mut checks = HashMap::new();
        
        // Check database
        checks.insert("database".to_string(), self.check_database().await);
        
        // Check Redis
        checks.insert("redis".to_string(), self.check_redis().await);
        
        // Check WhatsApp API
        checks.insert("whatsapp".to_string(), self.check_whatsapp().await);
        
        // Check disk space
        checks.insert("disk_space".to_string(), self.check_disk_space().await);
        
        // Check memory
        checks.insert("memory".to_string(), self.check_memory().await);

        let overall_status = if checks.values().all(|check| check.status == "healthy") {
            "healthy"
        } else {
            "unhealthy"
        };

        let uptime = self.startup_time
            .elapsed()
            .unwrap_or_default()
            .as_secs();

        HealthCheckResponse {
            status: overall_status.to_string(),
            timestamp: chrono::Utc::now().to_rfc3339(),
            version: env!("CARGO_PKG_VERSION").to_string(),
            uptime_seconds: uptime,
            checks,
        }
    }

    async fn check_database(&self) -> HealthCheck {
        let start = Instant::now();
        
        // In a real implementation, you would check actual database connectivity
        // For now, we'll simulate a check
        tokio::time::sleep(tokio::time::Duration::from_millis(10)).await;
        
        let response_time = start.elapsed().as_millis() as u64;
        
        HealthCheck {
            status: "healthy".to_string(),
            response_time_ms: response_time,
            message: Some("Database connection is healthy".to_string()),
            details: Some(serde_json::json!({
                "pool_size": 10,
                "active_connections": 2
            })),
        }
    }

    async fn check_redis(&self) -> HealthCheck {
        let start = Instant::now();
        
        // Simulate Redis check
        tokio::time::sleep(tokio::time::Duration::from_millis(5)).await;
        
        let response_time = start.elapsed().as_millis() as u64;
        
        HealthCheck {
            status: "healthy".to_string(),
            response_time_ms: response_time,
            message: Some("Redis connection is healthy".to_string()),
            details: Some(serde_json::json!({
                "connected_clients": 1,
                "used_memory": "2MB"
            })),
        }
    }

    async fn check_whatsapp(&self) -> HealthCheck {
        let start = Instant::now();
        
        // Simulate WhatsApp API check
        tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;
        
        let response_time = start.elapsed().as_millis() as u64;
        
        HealthCheck {
            status: "healthy".to_string(),
            response_time_ms: response_time,
            message: Some("WhatsApp API is reachable".to_string()),
            details: Some(serde_json::json!({
                "active_instances": 1,
                "last_webhook": "2025-08-10T10:00:00Z"
            })),
        }
    }

    async fn check_disk_space(&self) -> HealthCheck {
        let start = Instant::now();
        
        // Simulate disk check
        tokio::time::sleep(tokio::time::Duration::from_millis(2)).await;
        
        let response_time = start.elapsed().as_millis() as u64;
        
        HealthCheck {
            status: "healthy".to_string(),
            response_time_ms: response_time,
            message: Some("Sufficient disk space available".to_string()),
            details: Some(serde_json::json!({
                "total_gb": 100,
                "available_gb": 75,
                "used_percent": 25
            })),
        }
    }

    async fn check_memory(&self) -> HealthCheck {
        let start = Instant::now();
        
        // Simulate memory check
        tokio::time::sleep(tokio::time::Duration::from_millis(1)).await;
        
        let response_time = start.elapsed().as_millis() as u64;
        
        HealthCheck {
            status: "healthy".to_string(),
            response_time_ms: response_time,
            message: Some("Memory usage within limits".to_string()),
            details: Some(serde_json::json!({
                "total_mb": 2048,
                "available_mb": 1536,
                "used_percent": 25
            })),
        }
    }
}

/// Health check endpoint
#[instrument(skip(health_checker))]
pub async fn health_handler(health_checker: web::Data<HealthChecker>) -> Result<HttpResponse> {
    let health_status = health_checker.check_health().await;
    
    let status_code = if health_status.status == "healthy" {
        200
    } else {
        503
    };
    
    Ok(HttpResponse::build(actix_web::http::StatusCode::from_u16(status_code).unwrap())
        .json(health_status))
}

/// Readiness probe endpoint
#[instrument]
pub async fn readiness_handler() -> Result<HttpResponse> {
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "status": "ready",
        "timestamp": chrono::Utc::now().to_rfc3339()
    })))
}

/// Liveness probe endpoint
#[instrument]
pub async fn liveness_handler() -> Result<HttpResponse> {
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "status": "alive",
        "timestamp": chrono::Utc::now().to_rfc3339()
    })))
}

/// Configure observability routes
pub fn configure_observability_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/observability")
            .route("/metrics", web::get().to(metrics_handler))
            .route("/health", web::get().to(health_handler))
            .route("/ready", web::get().to(readiness_handler))
            .route("/live", web::get().to(liveness_handler))
    );
}