//! Database configuration utilities

use crate::error::{DatabaseError, Result};
use serde::{Deserialize, Serialize};
use std::fmt;

/// Database URL wrapper with validation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabaseUrl(String);

impl DatabaseUrl {
    /// Create a new database URL with validation
    pub fn new(url: String) -> Result<Self> {
        if url.is_empty() {
            return Err(DatabaseError::ConfigurationError(
                "Database URL cannot be empty".to_string()
            ));
        }

        // Basic validation for database URLs
        if !url.starts_with("postgres://") && !url.starts_with("postgresql://") && !url.starts_with("sqlite://") && !url.starts_with("sqlite:") {
            return Err(DatabaseError::ConfigurationError(
                "Database URL must start with postgres://, postgresql://, sqlite://, or sqlite:".to_string()
            ));
        }

        Ok(Self(url))
    }

    /// Get the URL as a string slice
    pub fn as_str(&self) -> &str {
        &self.0
    }

    /// Convert to string
    pub fn to_string(&self) -> String {
        self.0.clone()
    }
}

impl fmt::Display for DatabaseUrl {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        // Mask sensitive information in display
        if let Some(at_pos) = self.0.find('@') {
            if let Some(colon_pos) = self.0[..at_pos].rfind(':') {
                let masked = format!(
                    "{}:***@{}",
                    &self.0[..colon_pos],
                    &self.0[at_pos + 1..]
                );
                write!(f, "{}", masked)
            } else {
                write!(f, "{}", self.0)
            }
        } else {
            write!(f, "{}", self.0)
        }
    }
}

/// Database configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabaseConfig {
    /// Database connection URL
    database_url: DatabaseUrl,
    
    /// Maximum number of connections in the pool
    pub max_connections: u32,
    
    /// Minimum number of connections in the pool
    pub min_connections: u32,
    
    /// Connection timeout in seconds
    pub connect_timeout: u64,
    
    /// Query timeout in seconds
    pub query_timeout: u64,
    
    /// Connection idle timeout in seconds
    pub idle_timeout: u64,
    
    /// Whether to run migrations on startup
    pub auto_migrate: bool,
    
    /// SQL logging level
    pub sql_logging: SqlLoggingLevel,
}

/// SQL logging levels
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SqlLoggingLevel {
    Off,
    Error,
    Warn,
    Info,
    Debug,
    Trace,
}

impl Default for SqlLoggingLevel {
    fn default() -> Self {
        SqlLoggingLevel::Info
    }
}

impl DatabaseConfig {
    /// Create a new database configuration
    pub fn new(database_url: DatabaseUrl) -> Self {
        Self {
            database_url,
            max_connections: 20,
            min_connections: 5,
            connect_timeout: 30,
            query_timeout: 30,
            idle_timeout: 600,
            auto_migrate: true,
            sql_logging: SqlLoggingLevel::default(),
        }
    }

    /// Create configuration from environment variables
    pub fn from_env() -> Result<Self> {
        dotenvy::dotenv().ok(); // Load .env file if present

        let database_url = std::env::var("DATABASE_URL")
            .map_err(|_| DatabaseError::ConfigurationError(
                "DATABASE_URL environment variable is required".to_string()
            ))?;

        let database_url = DatabaseUrl::new(database_url)?;
        let mut config = Self::new(database_url);

        // Override defaults with environment variables
        if let Ok(max_conn) = std::env::var("DB_MAX_CONNECTIONS") {
            config.max_connections = max_conn.parse()
                .map_err(|_| DatabaseError::ConfigurationError(
                    "Invalid DB_MAX_CONNECTIONS value".to_string()
                ))?;
        }

        if let Ok(min_conn) = std::env::var("DB_MIN_CONNECTIONS") {
            config.min_connections = min_conn.parse()
                .map_err(|_| DatabaseError::ConfigurationError(
                    "Invalid DB_MIN_CONNECTIONS value".to_string()
                ))?;
        }

        if let Ok(timeout) = std::env::var("DB_CONNECT_TIMEOUT") {
            config.connect_timeout = timeout.parse()
                .map_err(|_| DatabaseError::ConfigurationError(
                    "Invalid DB_CONNECT_TIMEOUT value".to_string()
                ))?;
        }

        if let Ok(timeout) = std::env::var("DB_QUERY_TIMEOUT") {
            config.query_timeout = timeout.parse()
                .map_err(|_| DatabaseError::ConfigurationError(
                    "Invalid DB_QUERY_TIMEOUT value".to_string()
                ))?;
        }

        if let Ok(timeout) = std::env::var("DB_IDLE_TIMEOUT") {
            config.idle_timeout = timeout.parse()
                .map_err(|_| DatabaseError::ConfigurationError(
                    "Invalid DB_IDLE_TIMEOUT value".to_string()
                ))?;
        }

        if let Ok(auto_migrate) = std::env::var("DB_AUTO_MIGRATE") {
            config.auto_migrate = auto_migrate.parse()
                .map_err(|_| DatabaseError::ConfigurationError(
                    "Invalid DB_AUTO_MIGRATE value".to_string()
                ))?;
        }

        if let Ok(log_level) = std::env::var("DB_SQL_LOGGING") {
            config.sql_logging = match log_level.to_lowercase().as_str() {
                "off" => SqlLoggingLevel::Off,
                "error" => SqlLoggingLevel::Error,
                "warn" => SqlLoggingLevel::Warn,
                "info" => SqlLoggingLevel::Info,
                "debug" => SqlLoggingLevel::Debug,
                "trace" => SqlLoggingLevel::Trace,
                _ => return Err(DatabaseError::ConfigurationError(
                    "Invalid DB_SQL_LOGGING value. Must be one of: off, error, warn, info, debug, trace".to_string()
                )),
            };
        }

        config.validate()?;
        Ok(config)
    }

    /// Get the database URL
    pub fn database_url(&self) -> &DatabaseUrl {
        &self.database_url
    }

    /// Validate the configuration
    pub fn validate(&self) -> Result<()> {
        if self.max_connections == 0 {
            return Err(DatabaseError::ConfigurationError(
                "max_connections must be greater than 0".to_string()
            ));
        }

        if self.min_connections > self.max_connections {
            return Err(DatabaseError::ConfigurationError(
                "min_connections cannot be greater than max_connections".to_string()
            ));
        }

        if self.connect_timeout == 0 {
            return Err(DatabaseError::ConfigurationError(
                "connect_timeout must be greater than 0".to_string()
            ));
        }

        if self.query_timeout == 0 {
            return Err(DatabaseError::ConfigurationError(
                "query_timeout must be greater than 0".to_string()
            ));
        }

        Ok(())
    }
}

impl Default for DatabaseConfig {
    fn default() -> Self {
        let database_url = DatabaseUrl::new(
            "postgresql://postgres:password@localhost:5432/pytake_dev".to_string()
        ).expect("Default database URL should be valid");
        
        Self::new(database_url)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_database_url_validation() {
        // Valid URLs
        assert!(DatabaseUrl::new("postgresql://user:pass@localhost:5432/db".to_string()).is_ok());
        assert!(DatabaseUrl::new("postgres://user:pass@localhost:5432/db".to_string()).is_ok());
        assert!(DatabaseUrl::new("sqlite://./test.db".to_string()).is_ok());

        // Invalid URLs
        assert!(DatabaseUrl::new("".to_string()).is_err());
        assert!(DatabaseUrl::new("mysql://user:pass@localhost:3306/db".to_string()).is_err());
    }

    #[test]
    fn test_database_url_display() {
        let url = DatabaseUrl::new("postgresql://user:password@localhost:5432/db".to_string()).unwrap();
        let display = format!("{}", url);
        
        assert!(display.contains("user:***@localhost:5432/db"));
        assert!(!display.contains("password"));
    }

    #[test]
    fn test_database_config_validation() {
        let mut config = DatabaseConfig::default();
        
        // Valid configuration
        assert!(config.validate().is_ok());
        
        // Invalid configurations
        config.max_connections = 0;
        assert!(config.validate().is_err());
        
        config.max_connections = 10;
        config.min_connections = 15; // min > max
        assert!(config.validate().is_err());
    }

    #[test]
    fn test_sql_logging_level_serialization() {
        let level = SqlLoggingLevel::Info;
        let serialized = serde_json::to_string(&level).unwrap();
        assert_eq!(serialized, "\"info\"");
        
        let deserialized: SqlLoggingLevel = serde_json::from_str(&serialized).unwrap();
        assert!(matches!(deserialized, SqlLoggingLevel::Info));
    }
}