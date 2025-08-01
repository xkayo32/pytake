use crate::services::AuthService;
use pytake_core::auth::{
    session::InMemorySessionManager, 
    token::TokenConfig,
};
use pytake_core::queue::MessageQueue;
use pytake_core::services::orchestration::{PyTakeOrchestrator, PyTakeOrchestratorBuilder, WhatsAppConfig, PyTakeOrchestratorTrait};
use pytake_db::connection::DatabaseConnection;
use sea_orm::DatabaseConnection as SeaOrmConnection;
use std::sync::Arc;
use tokio::sync::RwLock;
use chrono::Duration;

/// Application state that will be shared across all request handlers
#[derive(Clone)]
pub struct AppState {
    /// Database connection pool
    pub db: Arc<SeaOrmConnection>,
    /// Application configuration
    pub config: Arc<crate::config::ApiConfig>,
    /// Health check state
    pub health: Arc<RwLock<HealthState>>,
    /// Authentication service
    pub auth_service: AuthService,
    /// Message queue (optional)
    pub queue: Option<Arc<dyn MessageQueue>>,
    /// WhatsApp client (optional)
    pub whatsapp_client: Option<Arc<pytake_whatsapp::WhatsAppClient>>,
    /// PyTake orchestrator (optional)
    pub orchestrator: Option<Arc<dyn PyTakeOrchestratorTrait>>,
}

/// Health state tracking
#[derive(Debug, Clone)]
pub struct HealthState {
    pub database_healthy: bool,
    pub last_check: chrono::DateTime<chrono::Utc>,
    pub startup_time: chrono::DateTime<chrono::Utc>,
    pub version: String,
}

impl AppState {
    /// Create a new application state instance
    pub async fn new(config: crate::config::ApiConfig) -> Result<Self, AppStateError> {
        // Initialize database connection
        let db_conn = DatabaseConnection::new(&config.database.url)
            .await
            .map_err(AppStateError::DatabaseConnection)?;

        let db_arc = Arc::new(db_conn);

        let health_state = HealthState {
            database_healthy: true,
            last_check: chrono::Utc::now(),
            startup_time: chrono::Utc::now(),
            version: env!("CARGO_PKG_VERSION").to_string(),
        };

        // Initialize authentication service
        let token_config = TokenConfig::default(); // TODO: Load from config
        let session_manager = Arc::new(InMemorySessionManager::new(Duration::hours(24)));
        let auth_service = AuthService::new(db_arc.clone(), token_config, session_manager);

        // Initialize WhatsApp client if configured
        let whatsapp_client = if let Some(whatsapp_config) = &config.whatsapp {
            let client_config = pytake_whatsapp::WhatsAppConfig {
                access_token: whatsapp_config.access_token.clone(),
                phone_number_id: whatsapp_config.phone_number_id.clone(),
                base_url: whatsapp_config.base_url.clone().unwrap_or_else(|| "https://graph.facebook.com/v18.0".to_string()),
                webhook_verify_token: whatsapp_config.webhook_verify_token.clone().unwrap_or_default(),
                app_secret: whatsapp_config.app_secret.clone().unwrap_or_default(),
            };
            
            match pytake_whatsapp::WhatsAppClient::new(client_config) {
                Ok(client) => Some(Arc::new(client)),
                Err(e) => {
                    tracing::warn!("Failed to initialize WhatsApp client: {}", e);
                    None
                }
            }
        } else {
            None
        };

        // Initialize Redis queue if configured
        let queue = if let Some(redis_config) = &config.redis {
            match pytake_core::queue::RedisQueue::new(&redis_config.url, Some("pytake:queue:".to_string())).await {
                Ok(redis_queue) => Some(Arc::new(redis_queue) as Arc<dyn MessageQueue>),
                Err(e) => {
                    tracing::warn!("Failed to initialize Redis queue: {}", e);
                    None
                }
            }
        } else {
            None
        };

        // Initialize orchestrator if we have both Redis and WhatsApp configured
        let orchestrator = if let (Some(redis_config), Some(whatsapp_config)) = (&config.redis, &config.whatsapp) {
            match redis::Client::open(redis_config.url.as_str()) {
                Ok(redis_client) => {
                    let orchestrator_whatsapp_config = WhatsAppConfig {
                        access_token: whatsapp_config.access_token.clone(),
                        phone_number_id: whatsapp_config.phone_number_id.clone(),
                        webhook_verify_token: whatsapp_config.webhook_verify_token.clone(),
                    };
                    
                    match PyTakeOrchestratorBuilder::new()
                        .with_redis(redis_client)
                        .with_whatsapp(orchestrator_whatsapp_config)
                        .build()
                        .await
                    {
                        Ok(orchestrator) => {
                            tracing::info!("PyTake orchestrator initialized successfully");
                            Some(Arc::new(orchestrator) as Arc<dyn PyTakeOrchestratorTrait>)
                        },
                        Err(e) => {
                            tracing::warn!("Failed to initialize PyTake orchestrator: {}", e);
                            None
                        }
                    }
                },
                Err(e) => {
                    tracing::warn!("Failed to create Redis client for orchestrator: {}", e);
                    None
                }
            }
        } else {
            tracing::info!("Orchestrator not initialized - Redis and/or WhatsApp configuration missing");
            None
        };

        Ok(Self {
            db: db_arc,
            config: Arc::new(config),
            health: Arc::new(RwLock::new(health_state)),
            auth_service,
            queue,
            whatsapp_client,
            orchestrator,
        })
    }

    /// Check the health of all system components
    pub async fn health_check(&self) -> HealthCheckResult {
        let mut health = self.health.write().await;
        
        // Check database connectivity
        let db_healthy = self.check_database_health().await;
        health.database_healthy = db_healthy;
        health.last_check = chrono::Utc::now();

        let current_health = health.clone();
        drop(health);

        HealthCheckResult {
            healthy: db_healthy,
            checks: vec![
                HealthCheck {
                    name: "database".to_string(),
                    status: if db_healthy {
                        HealthStatus::Healthy
                    } else {
                        HealthStatus::Unhealthy
                    },
                    message: if db_healthy {
                        "Database connection is healthy".to_string()
                    } else {
                        "Database connection failed".to_string()
                    },
                    last_checked: current_health.last_check,
                },
            ],
            uptime: chrono::Utc::now()
                .signed_duration_since(current_health.startup_time)
                .num_seconds(),
            version: current_health.version,
        }
    }

    /// Check database health by executing a simple query
    async fn check_database_health(&self) -> bool {
        use sea_orm::{ConnectionTrait, Statement};

        match self.db.execute(Statement::from_string(
            sea_orm::DatabaseBackend::Postgres,
            "SELECT 1".to_string(),
        )).await {
            Ok(_) => true,
            Err(e) => {
                tracing::error!("Database health check failed: {}", e);
                false
            }
        }
    }

    /// Get the current application version
    pub fn version(&self) -> &str {
        env!("CARGO_PKG_VERSION")
    }

    /// Get uptime in seconds
    pub async fn uptime(&self) -> i64 {
        let health = self.health.read().await;
        chrono::Utc::now()
            .signed_duration_since(health.startup_time)
            .num_seconds()
    }

    /// Get authentication service
    pub fn auth_service(&self) -> &AuthService {
        &self.auth_service
    }

    /// Get configuration
    pub fn config(&self) -> &crate::config::ApiConfig {
        &self.config
    }

    /// Get message queue
    pub fn queue(&self) -> Option<&Arc<dyn MessageQueue>> {
        self.queue.as_ref()
    }

    /// Get WhatsApp client
    pub fn whatsapp_client(&self) -> Option<&Arc<pytake_whatsapp::WhatsAppClient>> {
        self.whatsapp_client.as_ref()
    }
    
    /// Get PyTake orchestrator
    pub fn orchestrator(&self) -> Option<&Arc<dyn PyTakeOrchestratorTrait>> {
        self.orchestrator.as_ref()
    }
}

#[derive(Debug, thiserror::Error)]
pub enum AppStateError {
    #[error("Failed to establish database connection: {0}")]
    DatabaseConnection(#[from] pytake_db::error::DatabaseError),
    #[error("Configuration error: {0}")]
    Configuration(String),
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct HealthCheckResult {
    pub healthy: bool,
    pub checks: Vec<HealthCheck>,
    pub uptime: i64,
    pub version: String,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct HealthCheck {
    pub name: String,
    pub status: HealthStatus,
    pub message: String,
    pub last_checked: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub enum HealthStatus {
    #[serde(rename = "healthy")]
    Healthy,
    #[serde(rename = "unhealthy")]
    Unhealthy,
    #[serde(rename = "degraded")]
    Degraded,
}

impl Default for HealthState {
    fn default() -> Self {
        Self {
            database_healthy: false,
            last_check: chrono::Utc::now(),
            startup_time: chrono::Utc::now(),
            version: env!("CARGO_PKG_VERSION").to_string(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_health_state_creation() {
        let health_state = HealthState::default();
        assert_eq!(health_state.version, env!("CARGO_PKG_VERSION"));
        assert!(!health_state.database_healthy);
    }

    #[test]
    fn test_app_state_error_display() {
        let error = AppStateError::Configuration("test error".to_string());
        assert!(error.to_string().contains("Configuration error: test error"));
    }

    #[test]
    fn test_health_status_serialization() {
        let status = HealthStatus::Healthy;
        let serialized = serde_json::to_string(&status).unwrap();
        assert_eq!(serialized, "\"healthy\"");

        let status = HealthStatus::Unhealthy;
        let serialized = serde_json::to_string(&status).unwrap();
        assert_eq!(serialized, "\"unhealthy\"");

        let status = HealthStatus::Degraded;
        let serialized = serde_json::to_string(&status).unwrap();
        assert_eq!(serialized, "\"degraded\"");
    }
}