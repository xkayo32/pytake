use actix_web::{web, App, HttpServer, HttpResponse, Result, middleware::Logger};
use actix_cors::Cors;
use serde_json::json;
use tracing::{info, warn, error};
use std::sync::Arc;
use tokio::signal;
use std::time::Duration;
// OpenAPI imports removed as they're not used in main.rs

// Core modules - working
mod auth;
mod auth_db;
mod database;
mod redis_service;
mod websocket_improved;
mod whatsapp;
mod entities;
mod api_docs;
mod data_privacy;
mod graphql_simple;

// Features with issues - temporarily disabled
// mod rate_limiter;        // Rate limiting - has type issues
// mod performance_monitor; // Performance monitoring
// mod agent_conversations; // Agent features
// mod dashboard;           // Dashboard
// mod flows;               // Flow builder
// mod whatsapp_metrics;    // Metrics
// mod message_queue;       // Message queue
// mod auto_responder;      // Auto responder
// mod webhook_manager;     // Webhook manager  
// mod ai_assistant;        // AI assistant
// mod campaign_manager;    // Campaign manager
// mod multi_tenant;        // Multi-tenancy
// mod erp_connectors;      // ERP connectors
// mod erp_handlers;        // ERP handlers
// mod graphql_simple;      // GraphQL
// mod langchain_ai;        // LangChain AI
// mod flow_builder;        // Flow builder
// mod realtime_dashboard;  // Realtime dashboard
// mod google_integrations; // Google integrations
// mod data_privacy;        // Data privacy
// mod observability;       // Observability
// mod graphql_api;
// mod graphql_minimal;

use auth::AuthService;
use auth_db::AuthServiceDb;
use database::establish_connection;
use websocket_improved::ConnectionManager;
use whatsapp::{ConfigService, WhatsAppService};

/// Health check endpoint
/// 
/// Returns the current health status of the API service
#[utoipa::path(
    get,
    path = "/health",
    tag = "Health",
    responses(
        (status = 200, description = "Service is healthy", body = api_docs::HealthCheckResponse),
        (status = 503, description = "Service is unhealthy")
    )
)]
async fn health() -> Result<HttpResponse> {
    info!("Health check requested");
    Ok(HttpResponse::Ok().json(json!({
        "status": "healthy",
        "timestamp": chrono::Utc::now(),
        "service": "pytake-api"
    })))
}

// Simple status endpoint
async fn status() -> Result<HttpResponse> {
    info!("Status check requested");
    Ok(HttpResponse::Ok().json(json!({
        "status": "running",
        "version": "0.1.0",
        "service": "pytake-api-minimal",
        "features": ["health", "status", "cors", "jwt-auth", "in-memory-storage", "postgresql-database", "websocket-chat", "whatsapp-evolution"]
    })))
}

// Root endpoint
async fn root() -> Result<HttpResponse> {
    info!("Root endpoint accessed");
    Ok(HttpResponse::Ok().json(json!({
        "name": "PyTake API",
        "version": "0.1.0",
        "status": "operational",
        "documentation": "/docs"
    })))
}

// Original root with full info - DISABLED FOR SECURITY
#[allow(dead_code)]
async fn root_debug() -> Result<HttpResponse> {
    Ok(HttpResponse::Ok().json(json!({
        "endpoints": {
            "health": "/health",
            "status": "/api/v1/status",
            "root": "/",
            "auth_memory": {
                "login": "/api/v1/auth/login",
                "register": "/api/v1/auth/register",
                "me": "/api/v1/auth/me",
                "logout": "/api/v1/auth/logout"
            },
            "auth_database": {
                "login": "/api/v1/auth-db/login",
                "register": "/api/v1/auth-db/register",
                "me": "/api/v1/auth-db/me",
                "logout": "/api/v1/auth-db/logout"
            },
            "websocket": {
                "connect": "ws://localhost:8080/ws",
                "stats": "/api/v1/ws/stats"
            },
            "whatsapp": {
                "create_instance": "/api/v1/whatsapp/instance/create",
                "get_status": "/api/v1/whatsapp/instance/{name}/status",
                "get_qr_code": "/api/v1/whatsapp/instance/{name}/qrcode",
                "send_message": "/api/v1/whatsapp/send",
                "list_instances": "/api/v1/whatsapp/instances",
                "delete_instance": "/api/v1/whatsapp/instance/{name}",
                "webhook": "/api/v1/whatsapp/webhook"
            },
            "whatsapp_configs": {
                "list": "/api/v1/whatsapp-configs",
                "create": "/api/v1/whatsapp-configs",
                "get": "/api/v1/whatsapp-configs/{id}",
                "update": "/api/v1/whatsapp-configs/{id}",
                "delete": "/api/v1/whatsapp-configs/{id}",
                "test": "/api/v1/whatsapp-configs/{id}/test",
                "get_default": "/api/v1/whatsapp-configs/default",
                "set_default": "/api/v1/whatsapp-configs/{id}/set-default"
            },
            "webhooks": {
                "configure": "/api/v1/webhooks/configure",
                "send": "/api/v1/webhooks/send",
                "list_configs": "/api/v1/webhooks/configs",
                "metrics": "/api/v1/webhooks/metrics/{tenant_id}",
                "dead_letter": "/api/v1/webhooks/dead-letter",
                "retry_event": "/api/v1/webhooks/retry/{event_id}",
                "remove_config": "/api/v1/webhooks/config/{tenant_id}",
                "receive": "/api/v1/webhooks/receive"
            },
            "ai_assistant": {
                "chat": "/api/v1/ai/chat",
                "analyze": "/api/v1/ai/analyze",
                "classify": "/api/v1/ai/classify",
                "prompts": "/api/v1/ai/prompts",
                "usage": "/api/v1/ai/usage/{user_id}"
            },
            "ai_v2_langchain": {
                "chat": "/api/v1/ai-v2/chat",
                "rag_query": "/api/v1/ai-v2/rag/query",
                "run_agent": "/api/v1/ai-v2/agents/run",
                "upload_knowledge": "/api/v1/ai-v2/knowledge/upload",
                "available_chains": "/api/v1/ai-v2/chains/available",
                "call_function": "/api/v1/ai-v2/functions/call"
            },
            "campaigns": {
                "create": "/api/v1/campaigns",
                "list": "/api/v1/campaigns",
                "start": "/api/v1/campaigns/{id}/start",
                "pause": "/api/v1/campaigns/{id}/pause",
                "analytics": "/api/v1/campaigns/{id}/analytics"
            },
            "contacts": {
                "import": "/api/v1/contacts/import",
                "add_tags": "/api/v1/contacts/tags"
            },
            "tenants": {
                "create": "/api/v1/tenants",
                "get": "/api/v1/tenants/{tenant_id}",
                "update": "/api/v1/tenants/{tenant_id}",
                "add_user": "/api/v1/tenants/{tenant_id}/users",
                "list_users": "/api/v1/tenants/{tenant_id}/users",
                "billing": "/api/v1/tenants/{tenant_id}/billing",
                "upgrade": "/api/v1/tenants/{tenant_id}/upgrade",
                "usage": "/api/v1/tenants/{tenant_id}/usage",
                "api_keys": "/api/v1/tenants/{tenant_id}/api-keys",
                "invoices": "/api/v1/tenants/{tenant_id}/invoices"
            },
            "erp_integration": {
                "connect": "/api/v1/erp/connect/{provider}",
                "get_customer": "/api/v1/erp/{provider}/customers/{cpf_cnpj}",
                "search_customers": "/api/v1/erp/{provider}/customers/search",
                "get_invoices": "/api/v1/erp/{provider}/customers/{customer_id}/invoices",
                "get_service_status": "/api/v1/erp/{provider}/customers/{customer_id}/status",
                "create_ticket": "/api/v1/erp/{provider}/tickets",
                "schedule_visit": "/api/v1/erp/{provider}/customers/{customer_id}/schedule-visit",
                "get_plans": "/api/v1/erp/{provider}/plans",
                "health_check": "/api/v1/erp/{provider}/health",
                "metrics": "/api/v1/erp/metrics",
                "supported_providers": ["hubsoft", "ixcsoft", "mksolutions", "sisgp"]
            },
            "flow_builder": {
                "create_flow": "/api/v1/flows",
                "list_flows": "/api/v1/flows",
                "get_flow": "/api/v1/flows/{id}",
                "update_flow": "/api/v1/flows/{id}",
                "delete_flow": "/api/v1/flows/{id}",
                "validate_flow": "/api/v1/flows/{id}/validate",
                "test_flow": "/api/v1/flows/{id}/test",
                "publish_flow": "/api/v1/flows/{id}/publish",
                "execute_flow": "/api/v1/flows/{id}/execute",
                "get_analytics": "/api/v1/flows/{id}/analytics",
                "get_session": "/api/v1/flows/sessions/{session_id}",
                "send_input": "/api/v1/flows/sessions/{session_id}/input",
                "get_templates": "/api/v1/flows/templates",
                "supported_nodes": ["Start", "Message", "Question", "Condition", "Action", "Wait", "End", "Integration", "Template"],
                "supported_industries": ["ISP", "E-commerce", "Healthcare", "Education", "Delivery", "Financial", "Real Estate", "Automotive", "Retail"]
            },
            "realtime_dashboard": {
                "overview": "/api/v1/dashboard/overview",
                "metrics": "/api/v1/dashboard/metrics",
                "alerts": "/api/v1/dashboard/alerts",
                "widgets": "/api/v1/dashboard/widgets",
                "export": "/api/v1/dashboard/export",
                "websocket": "ws://localhost:8080/ws/dashboard",
                "supported_rooms": ["dashboard", "conversations", "campaigns", "erp", "ai", "alerts", "messages", "tickets", "system"],
                "supported_events": ["MessageSent", "MessageReceived", "ConversationStarted", "TicketCreated", "CampaignUpdate", "AIInteraction", "ERPCall", "SystemAlert"],
                "supported_widgets": ["metrics", "charts", "kpi", "activity_feed", "heat_maps", "geographic", "performance_gauges"],
                "subscription_endpoints": ["ws://localhost:8080/ws/dashboard", "ws://localhost:8080/ws/conversations", "ws://localhost:8080/ws/campaigns", "ws://localhost:8080/ws/erp", "ws://localhost:8080/ws/ai", "ws://localhost:8080/ws/tenant/{id}"]
            },
            "google_workspace": {
                "auth": "/api/v1/google/auth",
                "callback": "/api/v1/google/callback",
                "sheets": {
                    "read": "/api/v1/google/sheets/{user_id}",
                    "update": "/api/v1/google/sheets/{user_id}/update",
                    "export_metrics": "/api/v1/google/sheets/{user_id}/export-metrics",
                    "import_contacts": "/api/v1/google/sheets/{user_id}/import-contacts"
                },
                "calendar": {
                    "create_event": "/api/v1/google/calendar/{user_id}/events",
                    "list_events": "/api/v1/google/calendar/{user_id}/events",
                    "schedule_visit": "/api/v1/google/calendar/{user_id}/schedule-visit",
                    "check_availability": "/api/v1/google/calendar/{user_id}/availability"
                },
                "drive": {
                    "upload": "/api/v1/google/drive/{user_id}/upload",
                    "list_files": "/api/v1/google/drive/{user_id}/files",
                    "share_file": "/api/v1/google/drive/{user_id}/share",
                    "create_folder": "/api/v1/google/drive/{user_id}/folders"
                },
                "automation": {
                    "daily_metrics": "/api/v1/google/automation/daily-metrics",
                    "backup_conversations": "/api/v1/google/automation/backup",
                    "weekly_report": "/api/v1/google/automation/weekly-report"
                },
                "supported_services": ["sheets", "calendar", "drive", "all"],
                "supported_automations": ["daily_metrics_export", "weekly_backup", "automated_scheduling", "document_sharing", "report_generation"]
            },
            "data_privacy": {
                "consent": {
                    "register": "/api/v1/privacy/consent",
                    "withdraw": "/api/v1/privacy/consent/withdraw",
                    "history": "/api/v1/privacy/consent/{user_id}/history"
                },
                "data_subject_rights": {
                    "export": "/api/v1/privacy/data/{user_id}/export",
                    "delete": "/api/v1/privacy/data/{user_id}/delete",
                    "rectify": "/api/v1/privacy/data/{user_id}/rectify",
                    "request": "/api/v1/privacy/request",
                    "status": "/api/v1/privacy/request/{request_id}/status"
                },
                "compliance": {
                    "status": "/api/v1/privacy/compliance/status",
                    "metrics": "/api/v1/privacy/compliance/metrics",
                    "audit": "/api/v1/privacy/audit/{user_id}",
                    "dpia": "/api/v1/privacy/dpia",
                    "breach": "/api/v1/privacy/breach"
                },
                "retention": {
                    "policies": "/api/v1/privacy/retention/policies",
                    "violations": "/api/v1/privacy/retention/violations",
                    "cleanup": "/api/v1/privacy/retention/cleanup"
                },
                "transfers": {
                    "international": "/api/v1/privacy/transfers/international",
                    "adequacy": "/api/v1/privacy/transfers/adequacy"
                },
                "supported_rights": ["access", "rectification", "erasure", "portability", "object", "restrict_processing"],
                "supported_formats": ["json", "csv", "xml", "pdf"],
                "compliance_frameworks": ["LGPD", "GDPR", "CCPA", "PIPEDA"]
            }
        },
        "documentation": {
            "swagger_ui": "/docs",
            "redoc": "/redoc",
            "rapidoc": "/rapidoc",
            "openapi_json": "/api-docs/openapi.json",
            "graphql_playground": "/graphql/playground",
            "readme": "https://github.com/xkayo32/pytake-backend/blob/master/backend/simple_api/README.md",
            "api_reference": "https://github.com/xkayo32/pytake-backend/blob/master/backend/API-REFERENCE.md"
        },
        "graphql": {
            "endpoint": "/graphql",
            "playground": "/graphql/playground",
            "websocket": "/graphql/ws",
            "features": [
                "Enterprise Schema",
                "DataLoader N+1 Query Optimization",
                "Real-time Subscriptions",
                "Multi-tenant Context",
                "ERP Integration Queries",
                "Campaign Analytics",
                "AI Assistant Integration",
                "Flow Builder API",
                "Advanced Metrics & Analytics"
            ]
        },
    })))
}

/// Handle graceful shutdown signals
async fn shutdown_signal() {
    let ctrl_c = async {
        signal::ctrl_c()
            .await
            .expect("Failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        signal::unix::signal(signal::unix::SignalKind::terminate())
            .expect("Failed to install signal handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {
            info!("Received Ctrl+C signal, initiating graceful shutdown...");
        },
        _ = terminate => {
            info!("Received terminate signal, initiating graceful shutdown...");
        }
    }
}

/// Perform cleanup operations before shutdown
async fn cleanup_resources() {
    info!("Starting cleanup operations...");
    
    // Give time for ongoing requests to complete
    tokio::time::sleep(Duration::from_secs(2)).await;
    
    // Here you would typically:
    // - Close database connections (handled automatically by SeaORM)
    // - Close Redis connections (handled automatically)
    // - Finish processing queued messages
    // - Close WebSocket connections gracefully
    // - Flush any pending logs
    
    info!("Cleanup operations completed");
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // Load environment variables
    dotenvy::dotenv().ok();
    
    // Initialize basic logging
    info!("📝 Initializing basic logging...");
    tracing_subscriber::fmt()
        .with_env_filter("info,pytake=debug,simple_api=debug")
        .init();
    
    info!("🚀 Starting PyTake API Test Server with PostgreSQL Authentication...");
    info!("📍 Server will be available at: http://localhost:8080");
    info!("🌐 CORS enabled for: http://localhost:3000, http://localhost:3001");
    info!("🔐 Authentication endpoints available at: /api/v1/auth/*");
    info!("🔗 GraphQL API available at: /graphql (Playground: /graphql/playground)");
    
    // Connect to database
    info!("🗄️ Connecting to PostgreSQL database...");
    let db = establish_connection().await.map_err(|e| {
        std::io::Error::new(std::io::ErrorKind::Other, format!("Database connection failed: {}", e))
    })?;
    info!("✅ Database connected successfully");
    
    // Test database connection
    if let Err(e) = database::test_connection(&db).await {
        return Err(std::io::Error::new(std::io::ErrorKind::Other, format!("Database test failed: {}", e)));
    }
    
    // Create auth services
    let auth_service = AuthService::new();
    let auth_service_db = AuthServiceDb::new();
    info!("✅ Authentication services initialized");
    
    // Create WebSocket connection manager
    let ws_manager = ConnectionManager::new();
    info!("✅ WebSocket connection manager initialized");
    
    // Create WhatsApp configuration service
    let whatsapp_config_service = Arc::new(ConfigService::new(db.clone()));
    info!("✅ WhatsApp configuration service initialized");
    
    // Create WhatsApp service
    let whatsapp_service = Arc::new(WhatsAppService::new(whatsapp_config_service.clone()));
    info!("✅ WhatsApp service initialized");
    
    // Create Data Privacy service
    let privacy_service = Arc::new(data_privacy::DataPrivacyService::new(db.clone()));
    info!("✅ Data Privacy service initialized");

    // Create GraphQL schema (using simple version for now)
    info!("🔗 Initializing GraphQL schema...");
    let graphql_schema = graphql_simple::create_simple_schema().await;
    info!("✅ GraphQL schema initialized (simple version)");
    
    // Webhook worker will be started internally if needed
    
    info!("🔧 Configuring HTTP server...");
    let server = HttpServer::new(move || {
        // Secure CORS configuration based on environment
        let cors = if std::env::var("APP_ENV").unwrap_or_default() == "production" {
            // Production: Restrictive CORS
            Cors::default()
                .allowed_origin("https://app.pytake.com")
                .allowed_origin("https://dashboard.pytake.com") 
                .allowed_methods(vec!["GET", "POST", "PUT", "DELETE", "OPTIONS"])
                .allowed_headers(vec!["content-type", "authorization", "accept"])
                .supports_credentials()
                .max_age(3600)
        } else {
            // Development: Allow localhost origins only
            Cors::default()
                .allowed_origin("http://localhost:3000")
                .allowed_origin("http://localhost:3001")
                .allowed_origin("http://127.0.0.1:3000")
                .allowed_origin("http://127.0.0.1:3001")
                .allowed_methods(vec!["GET", "POST", "PUT", "DELETE", "OPTIONS"])
                .allowed_headers(vec!["content-type", "authorization", "accept", "x-requested-with"])
                .supports_credentials()
                .max_age(86400)
        };
            
        App::new()
            .app_data(web::Data::new(auth_service.clone()))
            .app_data(web::Data::new(auth_service_db.clone()))
            .app_data(web::Data::new(db.clone()))
            .app_data(web::Data::new(ws_manager.clone()))
            .app_data(web::Data::new(whatsapp_config_service.clone()))
            .app_data(web::Data::new(whatsapp_service.clone()))
            .app_data(web::Data::new(privacy_service.clone()))
            .app_data(web::Data::new(graphql_schema.clone()))
            .wrap(Logger::default())
            .wrap(cors)
            // Documentation endpoints
            .configure(api_docs::configure_docs)
            .route("/api-docs/openapi.json", web::get().to(|| async { 
                HttpResponse::Ok()
                    .content_type("application/json")
                    .body(api_docs::get_openapi_json())
            }))
            // GraphQL endpoints  
            .configure(graphql_simple::configure_simple_graphql)
            .route("/", web::get().to(root))
            .route("/health", web::get().to(health))
            .service(
                web::scope("/api/v1")
                    .route("/status", web::get().to(status))
                    .service(
                        web::scope("/auth")
                            // In-memory auth (original)
                            .route("/login", web::post().to(auth::login))
                            .route("/register", web::post().to(auth::register))
                            .route("/me", web::get().to(auth::me))
                            .route("/logout", web::post().to(auth::logout))
                    )
                    .service(
                        web::scope("/auth-db")
                            // PostgreSQL auth (new)
                            .route("/login", web::post().to(auth_db::login_db))
                            .route("/register", web::post().to(auth_db::register_db))
                            .route("/me", web::get().to(auth_db::me_db))
                            .route("/logout", web::post().to(auth_db::logout_db))
                    )
                    .service(
                        web::scope("/ws")
                            // WebSocket endpoints
                            .route("/stats", web::get().to(websocket_improved::websocket_stats))
                    )
                    // WhatsApp routes - new consolidated structure
                    .configure(whatsapp::configure_routes)
                    // WhatsApp legacy routes for backward compatibility
                    .configure(whatsapp::configure_legacy_routes)
            )
            // Data Privacy LGPD/GDPR routes
            .configure(data_privacy::configure_privacy_routes)
            // API Documentation endpoints (commented out - functions not implemented)
            // .service(
            //     web::scope("")
            //         .route("/docs", web::get().to(serve_swagger_ui))
            //         .route("/redoc", web::get().to(serve_redoc))
            //         .route("/rapidoc", web::get().to(serve_rapidoc))
            //         .route("/api-docs/openapi.json", web::get().to(serve_openapi_json))
            //         .route("/api-docs/openapi.yaml", web::get().to(serve_openapi_yaml))
            // )
            // WebSocket connection endpoint
            .route("/ws", web::get().to(websocket_improved::websocket_handler))
    })
    .bind("0.0.0.0:8080")?
    .workers(4) // Configure worker processes
    .keep_alive(Duration::from_secs(75)) // Keep-alive timeout
    .client_request_timeout(Duration::from_millis(5000)) // Client timeout in milliseconds
    .shutdown_timeout(30); // Graceful shutdown timeout in seconds
    
    info!("✅ HTTP server configured successfully");
    info!("🚀 Starting server at http://0.0.0.0:8080");
    info!("📱 Health check available at: http://localhost:8080/health");
    info!("📖 API documentation at: http://localhost:8080/docs");
    
    // Run server with graceful shutdown
    let server_handle = server.run();
    
    tokio::select! {
        result = server_handle => {
            match result {
                Ok(_) => info!("Server stopped successfully"),
                Err(e) => error!("Server stopped with error: {}", e),
            }
        }
        _ = shutdown_signal() => {
            info!("🛑 Shutdown signal received, stopping server...");
            cleanup_resources().await;
            info!("✅ Graceful shutdown completed");
        }
    }
    
    Ok(())
}
