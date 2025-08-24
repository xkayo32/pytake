use actix_web::{web, App, HttpServer, middleware::Logger, HttpResponse};
use std::sync::Arc;
use anyhow::Result;

mod database_simple;
mod error_simple;
mod api {
    pub mod flows_simple;
}

use database_simple::create_connection_pool;

#[actix_web::main]
async fn main() -> Result<()> {
    // Inicializar logger
    env_logger::init();

    // Carregar variáveis de ambiente
    dotenv::dotenv().ok();

    // Inicializar conexão com PostgreSQL
    let db_pool: Arc<database_simple::DatabasePool> = Arc::new(create_connection_pool().await?);

    // Configurar servidor HTTP
    let server_port = std::env::var("PORT")
        .unwrap_or_else(|_| "8080".to_string())
        .parse::<u16>()
        .unwrap_or(8080);

    println!("🚀 PyTake Backend API iniciando na porta {}", server_port);

    HttpServer::new(move || {
        App::new()
            .app_data(web::Data::new(db_pool.clone()))
            .wrap(Logger::default())
            .configure(api::flows_simple::configure_routes)
            .route("/health", web::get().to(health_check))
            .route("/", web::get().to(index))
    })
    .bind(format!("0.0.0.0:{}", server_port))?
    .run()
    .await
    .map_err(|e| anyhow::anyhow!("Server error: {}", e))
}

async fn health_check() -> actix_web::Result<HttpResponse> {
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "status": "healthy",
        "service": "pytake-backend-api",
        "version": "1.0.0"
    })))
}

async fn index() -> actix_web::Result<HttpResponse> {
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "message": "PyTake Backend API",
        "version": "1.0.0",
        "endpoints": {
            "flows": "/api/v1/flows",
            "health": "/health"
        }
    })))
}