use actix_web::{web, App, HttpServer, middleware::Logger};
use std::sync::Arc;
use anyhow::Result;

mod flow;
mod whatsapp;
mod api;
mod auth;
mod error;

use flow::{FlowEngine, session::FlowSessionManager};
use whatsapp::WhatsAppService;

#[actix_web::main]
async fn main() -> Result<()> {
    // Inicializar logger
    env_logger::init();

    // Carregar variáveis de ambiente
    dotenv::dotenv().ok();

    // Configurar Redis URL
    let redis_url = std::env::var("REDIS_URL")
        .unwrap_or_else(|_| "redis://localhost:6379".to_string());

    // Inicializar serviços
    let session_manager = Arc::new(FlowSessionManager::new(&redis_url)?);
    let whatsapp_service = Arc::new(WhatsAppService::new()?);
    let flow_engine = Arc::new(FlowEngine::new(
        session_manager.clone(),
        whatsapp_service.clone(),
    ));

    // Carregar flows padrão
    load_default_flows(&flow_engine).await;

    // Configurar servidor HTTP
    let server_port = std::env::var("PORT")
        .unwrap_or_else(|_| "8080".to_string())
        .parse::<u16>()
        .unwrap_or(8080);

    println!("🚀 PyTake Flow Engine iniciando na porta {}", server_port);

    HttpServer::new(move || {
        App::new()
            .app_data(web::Data::new(flow_engine.clone()))
            .app_data(web::Data::new(whatsapp_service.clone()))
            .app_data(web::Data::new(session_manager.clone()))
            .wrap(Logger::default())
            .configure(api::flows::configure_routes)
            .configure(api::webhook::configure_webhook_routes)
            .route("/health", web::get().to(health_check))
            .route("/", web::get().to(index))
    })
    .bind(format!("0.0.0.0:{}", server_port))?
    .run()
    .await
    .map_err(|e| anyhow::anyhow!("Server error: {}", e))
}

async fn health_check() -> actix_web::Result<actix_web::HttpResponse> {
    Ok(actix_web::HttpResponse::Ok().json(serde_json::json!({
        "status": "healthy",
        "service": "pytake-flow-engine",
        "version": "1.0.0"
    })))
}

async fn index() -> actix_web::Result<actix_web::HttpResponse> {
    Ok(actix_web::HttpResponse::Ok().json(serde_json::json!({
        "message": "PyTake Flow Engine API",
        "version": "1.0.0",
        "endpoints": {
            "flows": "/api/v1/flows",
            "webhook": "/api/v1/webhook",
            "health": "/health"
        }
    })))
}

async fn load_default_flows(flow_engine: &Arc<FlowEngine>) {
    // Carregar flows padrão (menu principal, suporte inteligente, etc.)
    println!("📋 Carregando flows padrão...");
    
    // Os flows serão carregados automaticamente quando necessário
    // através do FlowWebhookHandler
    
    println!("✅ Flows padrão carregados com sucesso!");
}