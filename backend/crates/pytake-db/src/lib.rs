//! PyTake Database Layer
//! 
//! This crate provides database connectivity, entity models, and repository patterns
//! for the PyTake system using SeaORM with PostgreSQL support.

pub mod config;
pub mod connection;
pub mod entities;
pub mod migration;
pub mod repositories;
pub mod error;

// Re-export commonly used types
pub use config::{DatabaseConfig, DatabaseUrl};
pub use connection::{DatabaseConnection, establish_connection, create_connection_pool};
pub use error::{DatabaseError, Result};
pub use entities::*;
pub use repositories::*;

// Re-export SeaORM types for convenience
pub use sea_orm::{
    Database, DatabaseConnection as SeaOrmConnection, EntityTrait, QueryFilter, 
    QuerySelect, QueryOrder, PaginatorTrait, Condition, Set, ActiveModelTrait,
    ConnectionTrait, TransactionTrait, Statement, Value, JsonValue
};

// Re-export migration utilities
pub use sea_orm_migration::MigratorTrait;
pub use migration::Migrator;

use std::sync::Arc;
use tokio::sync::OnceCell;

/// Global database connection pool
static DB_POOL: OnceCell<Arc<SeaOrmConnection>> = OnceCell::const_new();

/// Initialize the global database connection pool
pub async fn initialize_database(config: &DatabaseConfig) -> Result<()> {
    let connection = establish_connection(config).await?;
    let connection_arc = Arc::new(connection);
    
    DB_POOL.set(connection_arc.clone())
        .map_err(|_| DatabaseError::ConnectionError("Failed to initialize database pool".to_string()))?;
    
    Ok(())
}

/// Get a reference to the global database connection
pub fn get_database_connection() -> Result<Arc<SeaOrmConnection>> {
    DB_POOL.get()
        .ok_or_else(|| DatabaseError::ConnectionError(
            "Database not initialized. Call initialize_database first.".to_string()
        ))
        .map(|conn| conn.clone())
}

/// Run database migrations
pub async fn run_migrations(connection: &SeaOrmConnection) -> Result<()> {
    migration::run_migrations(connection).await
}

/// Health check for database connection
pub async fn health_check() -> Result<bool> {
    let db = get_database_connection()?;
    
    match db.ping().await {
        Ok(_) => Ok(true),
        Err(e) => {
            tracing::error!("Database health check failed: {}", e);
            Ok(false)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_database_config_creation() {
        let config = DatabaseConfig::from_env().unwrap_or_default();
        assert!(!config.database_url().as_str().is_empty());
    }
}