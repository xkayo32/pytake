//! Database error types and utilities

use thiserror::Error;

/// Database operation result type
pub type Result<T> = std::result::Result<T, DatabaseError>;

/// Database-specific error types
#[derive(Error, Debug)]
pub enum DatabaseError {
    #[error("Database connection error: {0}")]
    ConnectionError(String),

    #[error("Migration error: {0}")]
    MigrationError(String),

    #[error("Query error: {0}")]
    QueryError(String),

    #[error("Transaction error: {0}")]
    TransactionError(String),

    #[error("Transaction error: {0}")]
    Transaction(String),

    #[error("Entity not found: {0}")]
    NotFound(String),

    #[error("Validation error: {0}")]
    ValidationError(String),

    #[error("Constraint violation: {0}")]
    ConstraintViolation(String),

    #[error("Configuration error: {0}")]
    ConfigurationError(String),

    #[error("Serialization error: {0}")]
    SerializationError(String),

    #[error("Internal database error: {0}")]
    Internal(String),
}

impl From<sea_orm::DbErr> for DatabaseError {
    fn from(err: sea_orm::DbErr) -> Self {
        match err {
            sea_orm::DbErr::ConnectionAcquire => {
                DatabaseError::ConnectionError("Failed to acquire database connection".to_string())
            }
            sea_orm::DbErr::RecordNotFound(msg) => {
                DatabaseError::NotFound(msg)
            }
            sea_orm::DbErr::Query(query_err) => {
                DatabaseError::QueryError(query_err.to_string())
            }
            sea_orm::DbErr::Exec(exec_err) => {
                DatabaseError::QueryError(exec_err.to_string())
            }
            sea_orm::DbErr::Conn(conn_err) => {
                DatabaseError::ConnectionError(conn_err.to_string())
            }
            sea_orm::DbErr::Migration(msg) => {
                DatabaseError::MigrationError(msg)
            }
            _ => DatabaseError::Internal(err.to_string()),
        }
    }
}

impl From<serde_json::Error> for DatabaseError {
    fn from(err: serde_json::Error) -> Self {
        DatabaseError::SerializationError(err.to_string())
    }
}

impl From<uuid::Error> for DatabaseError {
    fn from(err: uuid::Error) -> Self {
        DatabaseError::ValidationError(format!("Invalid UUID: {}", err))
    }
}

impl From<pytake_core::errors::CoreError> for DatabaseError {
    fn from(err: pytake_core::errors::CoreError) -> Self {
        match err {
            pytake_core::errors::CoreError::ValidationError(msg) => {
                DatabaseError::ValidationError(msg)
            }
            pytake_core::errors::CoreError::NotFound { entity_type, id } => {
                DatabaseError::NotFound(format!("{} with id {}", entity_type, id))
            }
            _ => DatabaseError::Internal(err.to_string()),
        }
    }
}

/// Extension trait for converting database results
pub trait DatabaseResultExt<T> {
    /// Convert a not found error to None
    fn optional(self) -> Result<Option<T>>;
    
    /// Add context to database errors
    fn with_context<F>(self, f: F) -> Result<T>
    where
        F: FnOnce() -> String;
}

impl<T> DatabaseResultExt<T> for Result<T> {
    fn optional(self) -> Result<Option<T>> {
        match self {
            Ok(value) => Ok(Some(value)),
            Err(DatabaseError::NotFound(_)) => Ok(None),
            Err(e) => Err(e),
        }
    }

    fn with_context<F>(self, f: F) -> Result<T>
    where
        F: FnOnce() -> String,
    {
        self.map_err(|e| match e {
            DatabaseError::Internal(msg) => DatabaseError::Internal(format!("{}: {}", f(), msg)),
            DatabaseError::QueryError(msg) => DatabaseError::QueryError(format!("{}: {}", f(), msg)),
            DatabaseError::ConnectionError(msg) => DatabaseError::ConnectionError(format!("{}: {}", f(), msg)),
            other => other,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_database_error_conversion() {
        let core_error = pytake_core::errors::CoreError::ValidationError("test".to_string());
        let db_error: DatabaseError = core_error.into();
        
        match db_error {
            DatabaseError::ValidationError(msg) => assert_eq!(msg, "test"),
            _ => panic!("Expected ValidationError"),
        }
    }

    #[test]
    fn test_result_extension_optional() {
        let not_found: Result<String> = Err(DatabaseError::NotFound("test".to_string()));
        let result = not_found.optional();
        
        assert!(result.is_ok());
        assert!(result.unwrap().is_none());
    }

    #[test]
    fn test_result_extension_with_context() {
        let error: Result<String> = Err(DatabaseError::QueryError("original".to_string()));
        let result = error.with_context(|| "context".to_string());
        
        match result.unwrap_err() {
            DatabaseError::QueryError(msg) => assert!(msg.contains("context: original")),
            _ => panic!("Expected QueryError"),
        }
    }
}