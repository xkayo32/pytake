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
mod middleware;

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
    setup_logging(&config)?;

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
            .wrap(Logger::default())
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

    server
        .bind(&config.server_address())?
        .run()
        .await
}

/// Setup logging based on configuration
fn setup_logging(config: &ApiConfig) -> std::io::Result<()> {
    // Parse log level
    let log_level = match config.logging.level.to_lowercase().as_str() {
        "trace" => tracing::Level::TRACE,
        "debug" => tracing::Level::DEBUG,
        "info" => tracing::Level::INFO,
        "warn" => tracing::Level::WARN,
        "error" => tracing::Level::ERROR,
        _ => {
            warn!(
                "Invalid log level '{}', defaulting to 'info'",
                config.logging.level
            );
            tracing::Level::INFO
        }
    };

    // Create environment filter
    let env_filter = EnvFilter::builder()
        .with_default_directive(log_level.into())
        .with_env_var("RUST_LOG")
        .from_env_lossy()
        // Filter out noisy crates
        .add_directive("hyper=warn".parse().unwrap())
        .add_directive("tokio_util=warn".parse().unwrap())
        .add_directive("want=warn".parse().unwrap())
        .add_directive("mio=warn".parse().unwrap());

    // Configure formatter based on format setting
    let subscriber = match config.logging.format {
        config::LogFormat::Json => {
            tracing_subscriber::registry()
                .with(env_filter)
                .with(fmt::layer().json())
        }
        config::LogFormat::Pretty => {
            tracing_subscriber::registry()
                .with(env_filter)
                .with(fmt::layer().pretty())
        }
        config::LogFormat::Compact => {
            tracing_subscriber::registry()
                .with(env_filter)
                .with(fmt::layer().compact())
        }
    };

    // Initialize the global subscriber
    if let Err(e) = tracing::subscriber::set_global_default(subscriber) {
        eprintln!("Failed to initialize logging: {}", e);
        std::process::exit(1);
    }

    info!("Logging initialized with level: {}", config.logging.level);
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
    fn test_log_level_parsing() {
        let config = ApiConfig::default();
        
        // Test that setup_logging doesn't panic with default config
        // Note: We can't easily test the actual logging setup without more complex mocking
        assert_eq!(config.logging.level, "info");
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