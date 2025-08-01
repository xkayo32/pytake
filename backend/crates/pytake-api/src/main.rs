use actix_web::{
    middleware::{Logger, DefaultHeaders},
    web, App, HttpServer, Result as ActixResult,
};
use tracing::{info, error, warn};
use tracing_subscriber::{EnvFilter, fmt, prelude::*};

mod config;
mod state;
mod routes;
mod handlers;
mod logging;
mod middleware;
mod services;
mod workers;

use config::ApiConfig;
use state::AppState;
use middleware::{RequestId, ErrorHandler};

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // Initialize configuration
    let config = match ApiConfig::from_env() {
        Ok(config) => {
            // Validate configuration
            if let Err(e) = config.validate() {
                eprintln!("Configuration validation failed: {}", e);
                std::process::exit(1);
            }
            config
        }
        Err(e) => {
            eprintln!("Failed to load configuration: {}", e);
            std::process::exit(1);
        }
    };

    // Initialize logging
    if let Err(e) = logging::init_logging(&config) {
        eprintln!("Failed to initialize logging: {}", e);
        std::process::exit(1);
    }

    info!(
        "Starting PyTake API server v{} on {}",
        env!("CARGO_PKG_VERSION"),
        config.server_address()
    );

    // Initialize application state
    let app_state = match AppState::new(config.clone()).await {
        Ok(state) => {
            info!("Application state initialized successfully");
            state
        }
        Err(e) => {
            error!("Failed to initialize application state: {}", e);
            std::process::exit(1);
        }
    };

    // Start background workers if queue is configured
    if let Some(queue) = app_state.queue() {
        info!("Starting background workers...");
        
        // Create worker with dependencies if available
        let worker = if let Some(whatsapp_client) = app_state.whatsapp_client() {
            workers::WhatsAppWorker::with_dependencies(
                queue.clone(),
                app_state.db.clone(),
                whatsapp_client.clone(),
            )
        } else {
            workers::WhatsAppWorker::new(queue.clone())
        };
        
        if let Err(e) = worker.start().await {
            error!("Failed to start WhatsApp worker: {}", e);
        } else {
            info!("WhatsApp worker started successfully");
        }
    } else {
        info!("Queue not configured, skipping background workers");
    }

    // Configure the HTTP server
    let server = HttpServer::new(move || {
        App::new()
            // Add application state
            .app_data(web::Data::new(app_state.clone()))
            // Add request ID middleware (must be first to generate ID for other middleware)
            .wrap(RequestId)
            // Add error handling middleware
            .wrap(ErrorHandler)
            // Add CORS middleware
            .wrap(middleware::setup_cors(&config.cors))
            // Add request logging middleware
            .wrap(middleware::logging_middleware())
            // Add security headers middleware
            .wrap(
                DefaultHeaders::new()
                    .add(("X-Content-Type-Options", "nosniff"))
                    .add(("X-Frame-Options", "DENY"))
                    .add(("X-XSS-Protection", "1; mode=block"))
                    .add(("Referrer-Policy", "strict-origin-when-cross-origin"))
                    .add(("Content-Security-Policy", "default-src 'self'"))
            )
            // Configure routes
            .configure(routes::configure_routes)
            // Configure development routes in debug builds
            .configure(|cfg| {
                #[cfg(debug_assertions)]
                routes::configure_dev_routes(cfg);
            })
    });

    // Configure server settings
    let server = if let Some(workers) = config.server.workers {
        info!("Setting worker threads to: {}", workers);
        server.workers(workers)
    } else {
        server
    };

    // Start the server
    info!(
        "PyTake API server starting on http://{}",
        config.server_address()
    );

    // Log application startup event
    info!(
        "Starting {} v{}",
        "PyTake API",
        env!("CARGO_PKG_VERSION")
    );

    let server = server.bind(&config.server_address())?;
    let server_handle = server.handle();

    // Spawn the server
    let server_task = tokio::spawn(server.run());

    // Log that the app is ready
    info!("PyTake API ready and listening on {}", &config.server_address());

    // Wait for shutdown signal
    shutdown_signal().await;

    // Log shutdown event
    info!("PyTake API shutting down");

    // Gracefully shutdown the server
    server_handle.stop(true).await;

    // Wait for the server to finish
    match server_task.await {
        Ok(Ok(())) => info!("Server shut down successfully"),
        Ok(Err(e)) => error!("Server error during shutdown: {}", e),
        Err(e) => error!("Failed to shut down server task: {}", e),
    }

    Ok(())
}

/// Graceful shutdown handler
async fn shutdown_signal() {
    let ctrl_c = async {
        tokio::signal::ctrl_c()
            .await
            .expect("failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("failed to install signal handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }

    info!("Shutdown signal received");
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::env;

    #[test]
    fn test_main_module_compiles() {
        // This test ensures the main module compiles without errors
        // More comprehensive tests would require integration testing
        assert_eq!(env!("CARGO_PKG_NAME"), "pytake-api");
    }

    #[tokio::test]
    async fn test_config_loading() {
        // Set required environment variable for testing
        env::set_var("DATABASE_URL", "sqlite://test.db");
        
        let config = ApiConfig::from_env();
        assert!(config.is_ok());
        
        let config = config.unwrap();
        assert!(config.validate().is_ok());
        
        // Cleanup
        env::remove_var("DATABASE_URL");
    }

    #[test]
    fn test_log_level_default() {
        let config = ApiConfig::default();
        
        // Test default log level
        assert_eq!(config.log_level, "info");
    }

    #[tokio::test]
    async fn test_graceful_shutdown_compiles() {
        // This test ensures the shutdown function compiles
        // We can't easily test the actual signal handling without more complex setup
        tokio::select! {
            _ = tokio::time::sleep(tokio::time::Duration::from_millis(1)) => {},
            _ = shutdown_signal() => {},
        }
    }
}