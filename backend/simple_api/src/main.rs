use actix_web::{web, App, HttpServer, HttpResponse, Result, middleware::Logger};
use actix_cors::Cors;
use serde_json::json;
use tracing::info;
use std::sync::Arc;
// OpenAPI imports removed as they're not used in main.rs

mod auth;
mod auth_db;
mod database;
mod websocket_improved;
mod whatsapp_evolution;
mod whatsapp_handlers;
mod whatsapp_config;
mod whatsapp_management;
mod whatsapp_db_service;
mod whatsapp_db_handlers;
mod entities;
mod agent_conversations;
mod dashboard;
mod flows;
mod api_docs;
mod whatsapp_metrics;
mod message_queue;
mod auto_responder;
mod webhook_manager;
mod ai_assistant;
mod campaign_manager;

use auth::AuthService;
use auth_db::AuthServiceDb;
use database::establish_connection;
use websocket_improved::ConnectionManager;
use whatsapp_handlers::WhatsAppManager;

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
        "message": "PyTake API - Test Server with PostgreSQL Authentication",
        "version": "0.1.0",
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
            }
        },
        "documentation": {
            "swagger_ui": "/docs",
            "redoc": "/redoc",
            "rapidoc": "/rapidoc",
            "openapi_json": "/api-docs/openapi.json",
            "readme": "https://github.com/xkayo32/pytake-backend/blob/master/backend/simple_api/README.md",
            "api_reference": "https://github.com/xkayo32/pytake-backend/blob/master/backend/API-REFERENCE.md"
        },
        "demo_users": {
            "memory": {
                "email": "admin@pytake.com",
                "password": "admin123"
            },
            "database": {
                "email": "admin@pytake.com", 
                "password": "admin123",
                "note": "Pre-created admin user in PostgreSQL"
            }
        },
        "cors_enabled": true,
        "frontend_url": "http://localhost:3000"
    })))
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // Load environment variables
    dotenvy::dotenv().ok();
    
    // Initialize logging
    tracing_subscriber::fmt()
        .with_env_filter("info")
        .init();
    
    info!("🚀 Starting PyTake API Test Server with PostgreSQL Authentication...");
    info!("📍 Server will be available at: http://localhost:8080");
    info!("🌐 CORS enabled for: http://localhost:3000, http://localhost:3001");
    info!("🔐 Authentication endpoints available at: /api/v1/auth/*");
    
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
    
    // Create WhatsApp manager
    let whatsapp_manager = WhatsAppManager::new();
    info!("✅ WhatsApp manager initialized");
    
    // Create WhatsApp database service
    let whatsapp_db_service = Arc::new(whatsapp_db_service::WhatsAppDbService::new(db.clone()));
    info!("✅ WhatsApp database service initialized");
    
    // Run WhatsApp configuration migration
    if let Err(e) = whatsapp_db_service.migrate().await {
        info!("⚠️ Migration already exists or completed: {}", e);
    } else {
        info!("✅ WhatsApp configuration migration completed");
    }
    
    // Create conversation storage
    let conversation_storage = Arc::new(agent_conversations::ConversationStorage::new());
    info!("✅ Conversation storage initialized");
    
    // Create message queue
    let message_queue = Arc::new(message_queue::MessageQueue::new());
    info!("✅ Message queue initialized");
    
    // Queue processor will be started separately if needed
    
    // Create auto responder
    let auto_responder = Arc::new(auto_responder::AutoResponder::new());
    info!("✅ Auto responder initialized");
    
    // Create webhook manager
    let webhook_manager = Arc::new(webhook_manager::WebhookManager::new());
    info!("✅ Webhook manager initialized");
    
    // Create AI assistant service
    let ai_service = Arc::new(ai_assistant::AIService::new());
    info!("✅ AI assistant service initialized");
    
    // Create campaign manager
    let campaign_manager = Arc::new(campaign_manager::CampaignManager::new(db.clone()));
    info!("✅ Campaign manager initialized");
    
    // Run campaign manager migration
    if let Err(e) = campaign_manager.migrate().await {
        info!("⚠️ Campaign migration already exists or completed: {}", e);
    } else {
        info!("✅ Campaign management migration completed");
    }
    
    // Webhook worker will be started internally if needed
    
    HttpServer::new(move || {
        let cors = Cors::permissive();
            
        App::new()
            .app_data(web::Data::new(auth_service.clone()))
            .app_data(web::Data::new(auth_service_db.clone()))
            .app_data(web::Data::new(db.clone()))
            .app_data(web::Data::new(ws_manager.clone()))
            .app_data(web::Data::new(whatsapp_manager.clone()))
            .app_data(web::Data::new(whatsapp_db_service.clone()))
            .app_data(web::Data::new(conversation_storage.clone()))
            .app_data(web::Data::new(message_queue.clone()))
            .app_data(web::Data::new(auto_responder.clone()))
            .app_data(web::Data::new(webhook_manager.clone()))
            .app_data(web::Data::new(ai_service.clone()))
            .app_data(web::Data::new(campaign_manager.clone()))
            .wrap(Logger::default())
            .wrap(cors)
            // Documentation endpoints
            .configure(api_docs::configure_docs)
            .route("/api-docs/openapi.json", web::get().to(|| async { 
                HttpResponse::Ok()
                    .content_type("application/json")
                    .body(api_docs::get_openapi_json())
            }))
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
                    .service(
                        web::scope("/whatsapp")
                            // WhatsApp endpoints
                            .route("/instance/create", web::post().to(whatsapp_handlers::create_instance))
                            .route("/instance/{name}/status", web::get().to(whatsapp_handlers::get_instance_status))
                            .route("/instance/{name}/qrcode", web::get().to(whatsapp_handlers::get_qr_code))
                            .route("/send", web::post().to(whatsapp_handlers::send_message))
                            .route("/instances", web::get().to(whatsapp_handlers::list_instances))
                            .route("/instance/{name}", web::delete().to(whatsapp_handlers::delete_instance))
                            .route("/webhook", web::get().to(whatsapp_handlers::webhook_handler))
                            .route("/webhook", web::post().to(whatsapp_handlers::webhook_handler))
                            // WhatsApp metrics endpoints
                            .route("/health", web::get().to(whatsapp_metrics::get_phone_health))
                            .route("/analytics", web::get().to(whatsapp_metrics::get_message_analytics))
                            .route("/quality", web::get().to(whatsapp_metrics::get_quality_metrics))
                            .route("/limits", web::get().to(whatsapp_metrics::get_messaging_limits))
                            .route("/dashboard", web::get().to(whatsapp_metrics::get_metrics_dashboard))
                    )
                    // WhatsApp configuration routes (database-backed)
                    .service(
                        web::scope("/whatsapp-configs")
                            .route("", web::get().to(whatsapp_db_handlers::list_configs))
                            .route("", web::post().to(whatsapp_db_handlers::create_config))
                            .route("/default", web::get().to(whatsapp_db_handlers::get_default_config))
                            .route("/{id}", web::get().to(whatsapp_db_handlers::get_config))
                            .route("/{id}", web::put().to(whatsapp_db_handlers::update_config))
                            .route("/{id}", web::delete().to(whatsapp_db_handlers::delete_config))
                            .route("/{id}/test", web::post().to(whatsapp_db_handlers::test_config))
                            .route("/{id}/set-default", web::post().to(whatsapp_db_handlers::set_default_config))
                    )
                    // Agent conversation routes
                    .configure(agent_conversations::configure_routes)
                    // Dashboard routes
                    .configure(dashboard::configure_routes)
                    // Flow builder routes
                    .configure(flows::configure_routes)
                    // Message queue routes
                    .service(
                        web::scope("/queue")
                            .route("/send", web::post().to(message_queue::enqueue_message))
                            .route("/stats", web::get().to(message_queue::get_queue_statistics))
                            .route("/message/{id}", web::get().to(message_queue::get_message_info))
                            .route("/message/{id}/cancel", web::post().to(message_queue::cancel_queued_message))
                    )
                    // Auto responder routes
                    .service(
                        web::scope("/auto-responder")
                            .route("/process", web::post().to(auto_responder::process_incoming_message))
                            .route("/rules", web::get().to(auto_responder::list_auto_responses))
                            .route("/rules", web::post().to(auto_responder::create_auto_response))
                            .route("/rules/{id}", web::put().to(auto_responder::update_auto_response))
                            .route("/rules/{id}", web::delete().to(auto_responder::delete_auto_response))
                            .route("/rules/{id}/toggle", web::post().to(auto_responder::toggle_auto_response))
                    )
                    // Webhook manager routes
                    .service(
                        web::scope("/webhooks")
                            .route("/configure", web::post().to(webhook_manager::configure_webhook))
                            .route("/send", web::post().to(webhook_manager::send_webhook))
                            .route("/configs", web::get().to(webhook_manager::list_webhook_configs))
                            .route("/config/{id}", web::delete().to(webhook_manager::remove_webhook_config))
                            .route("/metrics/{id}", web::get().to(webhook_manager::get_webhook_metrics))
                            .route("/dead-letter", web::get().to(webhook_manager::list_dead_letter_events))
                            .route("/retry/{id}", web::post().to(webhook_manager::retry_dead_letter_event))
                    )
                    // Webhook routes
                    .service(
                        web::scope("/webhooks")
                            .route("/configure", web::post().to(webhook_manager::configure_webhook))
                            .route("/send", web::post().to(webhook_manager::send_webhook))
                            .route("/configs", web::get().to(webhook_manager::list_webhook_configs))
                            .route("/metrics/{tenant_id}", web::get().to(webhook_manager::get_webhook_metrics))
                            .route("/dead-letter", web::get().to(webhook_manager::list_dead_letter_events))
                            .route("/retry/{event_id}", web::post().to(webhook_manager::retry_dead_letter_event))
                            .route("/config/{tenant_id}", web::delete().to(webhook_manager::remove_webhook_config))
                            .route("/receive", web::post().to(webhook_manager::receive_webhook))
                    )
                    // AI Assistant routes
                    .configure(ai_assistant::configure_routes)
                    // Campaign management routes
                    .configure(campaign_manager::configure_routes)
            )
            // WebSocket connection endpoint
            .route("/ws", web::get().to(websocket_improved::websocket_handler))
    })
    .bind("0.0.0.0:8080")?
    .run()
    .await
}
