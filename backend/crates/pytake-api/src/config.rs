use dotenvy::dotenv;
use serde::{Deserialize, Serialize};
use std::env;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum ConfigError {
    #[error("Environment variable {0} is missing")]
    MissingVariable(String),
    #[error("Failed to parse environment variable {variable}: {source}")]
    ParseError {
        variable: String,
        #[source]
        source: std::num::ParseIntError,
    },
    #[error("Invalid configuration: {0}")]
    InvalidConfig(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiConfig {
    pub server: ServerConfig,
    pub database: DatabaseConfig,
    pub cors: CorsConfig,
    pub logging: LoggingConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerConfig {
    pub host: String,
    pub port: u16,
    pub workers: Option<usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabaseConfig {
    pub url: String,
    pub max_connections: u32,
    pub min_connections: u32,
    pub acquire_timeout: u64,
    pub idle_timeout: u64,
    pub max_lifetime: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CorsConfig {
    pub allowed_origins: Vec<String>,
    pub allowed_methods: Vec<String>,
    pub allowed_headers: Vec<String>,
    pub expose_headers: Vec<String>,
    pub max_age: Option<usize>,
    pub supports_credentials: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoggingConfig {
    pub level: String,
    pub format: LogFormat,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum LogFormat {
    Json,
    Pretty,
    Compact,
}

impl ApiConfig {
    pub fn from_env() -> Result<Self, ConfigError> {
        // Load .env file if it exists
        let _ = dotenv();

        let server = ServerConfig {
            host: env::var("SERVER_HOST").unwrap_or_else(|_| "127.0.0.1".to_string()),
            port: env::var("SERVER_PORT")
                .unwrap_or_else(|_| "8080".to_string())
                .parse()
                .map_err(|e| ConfigError::ParseError {
                    variable: "SERVER_PORT".to_string(),
                    source: e,
                })?,
            workers: env::var("SERVER_WORKERS")
                .ok()
                .map(|v| {
                    v.parse().map_err(|e| ConfigError::ParseError {
                        variable: "SERVER_WORKERS".to_string(),
                        source: e,
                    })
                })
                .transpose()?,
        };

        let database = DatabaseConfig {
            url: env::var("DATABASE_URL")
                .map_err(|_| ConfigError::MissingVariable("DATABASE_URL".to_string()))?,
            max_connections: env::var("DATABASE_MAX_CONNECTIONS")
                .unwrap_or_else(|_| "10".to_string())
                .parse()
                .map_err(|e| ConfigError::ParseError {
                    variable: "DATABASE_MAX_CONNECTIONS".to_string(),
                    source: e,
                })?,
            min_connections: env::var("DATABASE_MIN_CONNECTIONS")
                .unwrap_or_else(|_| "1".to_string())
                .parse()
                .map_err(|e| ConfigError::ParseError {
                    variable: "DATABASE_MIN_CONNECTIONS".to_string(),
                    source: e,
                })?,
            acquire_timeout: env::var("DATABASE_ACQUIRE_TIMEOUT")
                .unwrap_or_else(|_| "30".to_string())
                .parse()
                .map_err(|e| ConfigError::ParseError {
                    variable: "DATABASE_ACQUIRE_TIMEOUT".to_string(),
                    source: e,
                })?,
            idle_timeout: env::var("DATABASE_IDLE_TIMEOUT")
                .unwrap_or_else(|_| "600".to_string())
                .parse()
                .map_err(|e| ConfigError::ParseError {
                    variable: "DATABASE_IDLE_TIMEOUT".to_string(),
                    source: e,
                })?,
            max_lifetime: env::var("DATABASE_MAX_LIFETIME")
                .unwrap_or_else(|_| "1800".to_string())
                .parse()
                .map_err(|e| ConfigError::ParseError {
                    variable: "DATABASE_MAX_LIFETIME".to_string(),
                    source: e,
                })?,
        };

        let cors = CorsConfig {
            allowed_origins: env::var("CORS_ALLOWED_ORIGINS")
                .unwrap_or_else(|_| "http://localhost:3000".to_string())
                .split(',')
                .map(|s| s.trim().to_string())
                .collect(),
            allowed_methods: env::var("CORS_ALLOWED_METHODS")
                .unwrap_or_else(|_| "GET,POST,PUT,DELETE,OPTIONS".to_string())
                .split(',')
                .map(|s| s.trim().to_string())
                .collect(),
            allowed_headers: env::var("CORS_ALLOWED_HEADERS")
                .unwrap_or_else(|_| "Content-Type,Authorization,X-Requested-With".to_string())
                .split(',')
                .map(|s| s.trim().to_string())
                .collect(),
            expose_headers: env::var("CORS_EXPOSE_HEADERS")
                .unwrap_or_else(|_| "X-Total-Count".to_string())
                .split(',')
                .map(|s| s.trim().to_string())
                .collect(),
            max_age: env::var("CORS_MAX_AGE")
                .ok()
                .map(|v| {
                    v.parse().map_err(|e| ConfigError::ParseError {
                        variable: "CORS_MAX_AGE".to_string(),
                        source: e,
                    })
                })
                .transpose()?,
            supports_credentials: env::var("CORS_SUPPORTS_CREDENTIALS")
                .unwrap_or_else(|_| "true".to_string())
                .parse()
                .unwrap_or(true),
        };

        let logging = LoggingConfig {
            level: env::var("LOG_LEVEL").unwrap_or_else(|_| "info".to_string()),
            format: match env::var("LOG_FORMAT")
                .unwrap_or_else(|_| "pretty".to_string())
                .to_lowercase()
                .as_str()
            {
                "json" => LogFormat::Json,
                "compact" => LogFormat::Compact,
                _ => LogFormat::Pretty,
            },
        };

        Ok(ApiConfig {
            server,
            database,
            cors,
            logging,
        })
    }

    pub fn validate(&self) -> Result<(), ConfigError> {
        if self.server.port == 0 {
            return Err(ConfigError::InvalidConfig(
                "Server port cannot be 0".to_string(),
            ));
        }

        if self.database.url.is_empty() {
            return Err(ConfigError::InvalidConfig(
                "Database URL cannot be empty".to_string(),
            ));
        }

        if self.cors.allowed_origins.is_empty() {
            return Err(ConfigError::InvalidConfig(
                "At least one CORS origin must be specified".to_string(),
            ));
        }

        Ok(())
    }

    pub fn server_address(&self) -> String {
        format!("{}:{}", self.server.host, self.server.port)
    }
}

impl Default for ApiConfig {
    fn default() -> Self {
        Self {
            server: ServerConfig {
                host: "127.0.0.1".to_string(),
                port: 8080,
                workers: None,
            },
            database: DatabaseConfig {
                url: "sqlite://pytake.db".to_string(),
                max_connections: 10,
                min_connections: 1,
                acquire_timeout: 30,
                idle_timeout: 600,
                max_lifetime: 1800,
            },
            cors: CorsConfig {
                allowed_origins: vec!["http://localhost:3000".to_string()],
                allowed_methods: vec![
                    "GET".to_string(),
                    "POST".to_string(),
                    "PUT".to_string(),
                    "DELETE".to_string(),
                    "OPTIONS".to_string(),
                ],
                allowed_headers: vec![
                    "Content-Type".to_string(),
                    "Authorization".to_string(),
                    "X-Requested-With".to_string(),
                ],
                expose_headers: vec!["X-Total-Count".to_string()],
                max_age: Some(3600),
                supports_credentials: true,
            },
            logging: LoggingConfig {
                level: "info".to_string(),
                format: LogFormat::Pretty,
            },
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::env;

    #[test]
    fn test_config_from_env_with_defaults() {
        // Clear environment variables for testing
        let vars_to_clear = [
            "SERVER_HOST",
            "SERVER_PORT",
            "DATABASE_URL",
            "CORS_ALLOWED_ORIGINS",
            "LOG_LEVEL",
        ];

        for var in &vars_to_clear {
            env::remove_var(var);
        }

        // Set required DATABASE_URL
        env::set_var("DATABASE_URL", "sqlite://test.db");

        let config = ApiConfig::from_env().expect("Should create config with defaults");

        assert_eq!(config.server.host, "127.0.0.1");
        assert_eq!(config.server.port, 8080);
        assert_eq!(config.database.url, "sqlite://test.db");
        assert_eq!(config.cors.allowed_origins, vec!["http://localhost:3000"]);
        assert_eq!(config.logging.level, "info");

        // Cleanup
        env::remove_var("DATABASE_URL");
    }

    #[test]
    fn test_config_validation() {
        let mut config = ApiConfig::default();
        assert!(config.validate().is_ok());

        config.server.port = 0;
        assert!(config.validate().is_err());

        config = ApiConfig::default();
        config.database.url = String::new();
        assert!(config.validate().is_err());

        config = ApiConfig::default();
        config.cors.allowed_origins = vec![];
        assert!(config.validate().is_err());
    }

    #[test]
    fn test_server_address() {
        let config = ApiConfig::default();
        assert_eq!(config.server_address(), "127.0.0.1:8080");
    }
}