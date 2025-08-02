use actix_web::{web, App, HttpServer, HttpResponse, Result};
use actix_cors::Cors;
use serde_json::json;

// Simple health check
async fn health() -> Result<HttpResponse> {
    Ok(HttpResponse::Ok().json(json!({
        "status": "healthy",
        "timestamp": chrono::Utc::now(),
        "service": "pytake-api"
    })))
}

// Simple status endpoint
async fn status() -> Result<HttpResponse> {
    Ok(HttpResponse::Ok().json(json!({
        "status": "running",
        "version": "0.1.0",
        "service": "pytake-api-minimal"
    })))
}

// Root endpoint
async fn root() -> Result<HttpResponse> {
    Ok(HttpResponse::Ok().json(json!({
        "message": "PyTake API - Minimal Server",
        "version": "0.1.0",
        "endpoints": [
            "/health",
            "/api/v1/status"
        ]
    })))
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // Initialize logging
    env_logger::init_from_env(env_logger::Env::new().default_filter_or("info"));
    
    println!("🚀 Starting PyTake API Minimal Server...");
    println!("📍 Server will be available at: http://localhost:8080");
    
    HttpServer::new(|| {
        let cors = Cors::default()
            .allowed_origin("http://localhost:3000")
            .allowed_methods(vec!["GET", "POST", "PUT", "DELETE", "OPTIONS"])
            .allowed_headers(vec!["Content-Type", "Authorization"])
            .supports_credentials();
            
        App::new()
            .wrap(cors)
            .route("/", web::get().to(root))
            .route("/health", web::get().to(health))
            .service(
                web::scope("/api/v1")
                    .route("/status", web::get().to(status))
            )
    })
    .bind("127.0.0.1:8080")?
    .run()
    .await
}