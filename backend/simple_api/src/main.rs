use actix_web::{web, App, HttpServer, HttpResponse, Result, middleware::Logger};
use actix_cors::Cors;
use serde_json::json;
use tracing::info;
use std::sync::Arc;

mod auth;
mod auth_db;
mod database;
mod websocket_improved;
mod whatsapp_evolution;
mod whatsapp_handlers;
mod whatsapp_config;
mod agent_conversations;
mod dashboard;

use auth::AuthService;
use auth_db::AuthServiceDb;
use database::establish_connection;
use websocket_improved::ConnectionManager;
use whatsapp_handlers::WhatsAppManager;

// Simple health check
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
            }
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
    
    // Create WhatsApp config storage
    let config_storage = Arc::new(whatsapp_config::ConfigStorage::new());
    info!("✅ WhatsApp config storage initialized");
    
    // Create conversation storage
    let conversation_storage = Arc::new(agent_conversations::ConversationStorage::new());
    info!("✅ Conversation storage initialized");
    
    HttpServer::new(move || {
        let cors = Cors::permissive();
            
        App::new()
            .app_data(web::Data::new(auth_service.clone()))
            .app_data(web::Data::new(auth_service_db.clone()))
            .app_data(web::Data::new(db.clone()))
            .app_data(web::Data::new(ws_manager.clone()))
            .app_data(web::Data::new(whatsapp_manager.clone()))
            .app_data(web::Data::new(config_storage.clone()))
            .app_data(web::Data::new(conversation_storage.clone()))
            .wrap(Logger::default())
            .wrap(cors)
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
                    )
                    // WhatsApp configuration routes
                    .configure(whatsapp_config::configure_routes)
                    // Agent conversation routes
                    .configure(agent_conversations::configure_routes)
                    // Dashboard routes
                    .configure(dashboard::configure_routes)
            )
            // WebSocket connection endpoint
            .route("/ws", web::get().to(websocket_improved::websocket_handler))
    })
    .bind("0.0.0.0:8080")?
    .run()
    .await
}
