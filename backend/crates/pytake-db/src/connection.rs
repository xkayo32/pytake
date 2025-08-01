//! Database connection management

use crate::config::{DatabaseConfig, SqlLoggingLevel};
use crate::error::{DatabaseError, Result};
use sea_orm::{Database, DatabaseConnection as SeaOrmConnection, ConnectOptions};
use std::time::Duration;
use log::LevelFilter;

/// Type alias for database connection
pub type DatabaseConnection = SeaOrmConnection;

/// Establish a database connection with the given configuration
pub async fn establish_connection(config: &DatabaseConfig) -> Result<DatabaseConnection> {
    let mut connect_options = ConnectOptions::new(config.database_url().as_str());
    
    // Configure connection pool
    connect_options
        .max_connections(config.max_connections)
        .min_connections(config.min_connections)
        .connect_timeout(Duration::from_secs(config.connect_timeout))
        .acquire_timeout(Duration::from_secs(config.connect_timeout))
        .idle_timeout(Duration::from_secs(config.idle_timeout));

    // Configure SQL logging
    match config.sql_logging {
        SqlLoggingLevel::Off => {
            connect_options.sqlx_logging(false);
        }
        SqlLoggingLevel::Error => {
            connect_options
                .sqlx_logging(true)
                .sqlx_logging_level(LevelFilter::Error);
        }
        SqlLoggingLevel::Warn => {
            connect_options
                .sqlx_logging(true)
                .sqlx_logging_level(LevelFilter::Warn);
        }
        SqlLoggingLevel::Info => {
            connect_options
                .sqlx_logging(true)
                .sqlx_logging_level(LevelFilter::Info);
        }
        SqlLoggingLevel::Debug => {
            connect_options
                .sqlx_logging(true)
                .sqlx_logging_level(LevelFilter::Debug);
        }
        SqlLoggingLevel::Trace => {
            connect_options
                .sqlx_logging(true)
                .sqlx_logging_level(LevelFilter::Trace);
        }
    }

    tracing::info!(
        "Establishing database connection to {}",
        config.database_url()
    );

    let connection = Database::connect(connect_options).await?;

    tracing::info!("Database connection established successfully");
    Ok(connection)
}

/// Create a connection pool with the given configuration
pub async fn create_connection_pool(config: &DatabaseConfig) -> Result<DatabaseConnection> {
    establish_connection(config).await
}

/// Test database connection
pub async fn test_connection(connection: &DatabaseConnection) -> Result<()> {
    connection.ping().await?;
    tracing::info!("Database connection test successful");
    Ok(())
}

/// Close database connection gracefully
pub async fn close_connection(connection: DatabaseConnection) -> Result<()> {
    connection.close().await?;
    tracing::info!("Database connection closed successfully");
    Ok(())
}

/// Connection health information
#[derive(Debug, Clone)]
pub struct ConnectionHealth {
    pub is_connected: bool,
    pub response_time_ms: Option<u64>,
    pub error_message: Option<String>,
}

/// Check connection health with metrics
pub async fn check_connection_health(connection: &DatabaseConnection) -> ConnectionHealth {
    let start = std::time::Instant::now();
    
    match connection.ping().await {
        Ok(_) => {
            let response_time = start.elapsed().as_millis() as u64;
            ConnectionHealth {
                is_connected: true,
                response_time_ms: Some(response_time),
                error_message: None,
            }
        }
        Err(e) => {
            ConnectionHealth {
                is_connected: false,
                response_time_ms: None,
                error_message: Some(e.to_string()),
            }
        }
    }
}

/// Connection pool statistics
#[derive(Debug, Clone)]
pub struct PoolStatistics {
    pub active_connections: u32,
    pub idle_connections: u32,
    pub max_connections: u32,
}

/// Database transaction utilities
pub mod transaction {
    use super::*;
    use sea_orm::{TransactionTrait, TransactionError};

    /// Execute a function within a database transaction
    pub async fn with_transaction<F, R, E>(
        connection: &DatabaseConnection,
        f: F,
    ) -> Result<R>
    where
        F: for<'c> FnOnce(&'c sea_orm::DatabaseTransaction) -> std::pin::Pin<Box<dyn std::future::Future<Output = std::result::Result<R, E>> + Send + 'c>>,
        E: std::error::Error + Send + Sync + 'static,
    {
        let txn = connection.begin().await?;
        
        match f(&txn).await {
            Ok(result) => {
                txn.commit().await?;
                Ok(result)
            }
            Err(e) => {
                txn.rollback().await?;
                Err(DatabaseError::TransactionError(e.to_string()))
            }
        }
    }

    /// Execute multiple operations in a transaction with automatic rollback on error
    pub async fn execute_in_transaction<F, Fut, R>(
        connection: &DatabaseConnection,
        operations: F,
    ) -> Result<R>
    where
        F: FnOnce(&sea_orm::DatabaseTransaction) -> Fut,
        Fut: std::future::Future<Output = Result<R>>,
    {
        let txn = connection.begin().await?;
        
        match operations(&txn).await {
            Ok(result) => {
                txn.commit().await?;
                Ok(result)
            }
            Err(e) => {
                if let Err(rollback_err) = txn.rollback().await {
                    tracing::error!("Failed to rollback transaction: {}", rollback_err);
                }
                Err(e)
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::DatabaseUrl;

    #[tokio::test]
    async fn test_connection_options_configuration() {
        let database_url = DatabaseUrl::new("sqlite://memory:".to_string()).unwrap();
        let config = DatabaseConfig::new(database_url);
        
        // This test mainly verifies that connection options are configured without errors
        // Actual connection testing would require a test database
        let mut connect_options = ConnectOptions::new(config.database_url().as_str());
        connect_options
            .max_connections(config.max_connections)
            .min_connections(config.min_connections);
        
        // If we reach here without panicking, configuration works
        assert_eq!(config.max_connections, 20); // Default value
    }

    #[test]
    fn test_connection_health_structure() {
        let health = ConnectionHealth {
            is_connected: true,
            response_time_ms: Some(50),
            error_message: None,
        };
        
        assert!(health.is_connected);
        assert_eq!(health.response_time_ms, Some(50));
        assert!(health.error_message.is_none());
    }

    #[test]
    fn test_pool_statistics_structure() {
        let stats = PoolStatistics {
            active_connections: 5,
            idle_connections: 10,
            max_connections: 20,
        };
        
        assert_eq!(stats.active_connections, 5);
        assert_eq!(stats.idle_connections, 10);
        assert_eq!(stats.max_connections, 20);
    }
}