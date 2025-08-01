//! # PyTake API
//!
//! This crate provides the REST API server for the PyTake application.
//! It's built using Actix-web and provides endpoints for managing users,
//! flows, and WhatsApp integrations.
//!
//! ## Features
//!
//! - RESTful API endpoints with JSON serialization
//! - Health check endpoints for monitoring and load balancers
//! - Database integration with connection pooling
//! - Comprehensive error handling and logging
//! - CORS support for frontend integration
//! - Request ID tracking for debugging
//! - Production-ready security headers
//!
//! ## Configuration
//!
//! The API server is configured through environment variables.
//! See the [`config`] module for available configuration options.
//!
//! ## Usage
//!
//! ```rust,no_run
//! use pytake_api::config::ApiConfig;
//! use pytake_api::state::AppState;
//!
//! #[tokio::main]
//! async fn main() -> Result<(), Box<dyn std::error::Error>> {
//!     let config = ApiConfig::from_env()?;
//!     let app_state = AppState::new(config).await?;
//!     
//!     // Server setup would go here
//!     Ok(())
//! }
//! ```

pub mod config;
pub mod state;
pub mod routes;
pub mod handlers;
pub mod middleware;

// Re-export commonly used types for convenience
pub use config::{ApiConfig, ConfigError};
pub use state::{AppState, AppStateError, HealthCheckResult, HealthStatus};
pub use middleware::error_handler::{ApiError, ApiResult, ErrorResponse};

/// Version information for the API
pub const VERSION: &str = env!("CARGO_PKG_VERSION");
pub const API_VERSION: &str = "v1";
pub const SERVICE_NAME: &str = "PyTake API";

/// Build information (available at compile time)
pub mod build_info {
    /// The version of this crate
    pub const VERSION: &str = env!("CARGO_PKG_VERSION");
    
    /// Git commit hash if available
    pub const GIT_COMMIT: Option<&str> = option_env!("GIT_COMMIT");
    
    /// Build date if available
    pub const BUILD_DATE: Option<&str> = option_env!("BUILD_DATE");
    
    /// Rust version used to build this crate
    pub const RUST_VERSION: &str = env!("CARGO_PKG_RUST_VERSION");
}

/// Prelude module for common imports
pub mod prelude {
    pub use crate::{
        config::{ApiConfig, ConfigError},
        state::{AppState, AppStateError},
        middleware::error_handler::{ApiError, ApiResult},
        handlers::*,
        VERSION, API_VERSION, SERVICE_NAME,
    };
    
    // Re-export common Actix-web types
    pub use actix_web::{
        web, App, HttpServer, HttpRequest, HttpResponse, Result as ActixResult,
        middleware::{Logger, DefaultHeaders},
    };
    
    // Re-export common async/serialization types
    pub use tokio;
    pub use serde::{Deserialize, Serialize};
    pub use serde_json;
    pub use chrono::{DateTime, Utc};
    pub use uuid::Uuid;
}