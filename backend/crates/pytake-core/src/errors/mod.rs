//! Error types and error handling utilities
//!
//! This module defines the core error types used throughout PyTake.
//! All errors are designed to be informative and actionable.

use serde::{Deserialize, Serialize};
use std::fmt;
use thiserror::Error;

/// Core result type used throughout the application
pub type CoreResult<T> = Result<T, CoreError>;

/// Core error types for PyTake
#[derive(Debug, Error, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "details", rename_all = "snake_case")]
pub enum CoreError {
    /// Validation errors
    #[error("Validation error: {0}")]
    ValidationError(String),

    /// Entity not found errors
    #[error("Entity not found: {entity_type} with id {id}")]
    NotFound { entity_type: String, id: String },

    /// Permission denied errors
    #[error("Permission denied: {0}")]
    PermissionDenied(String),

    /// Business logic errors
    #[error("Business rule violation: {0}")]
    BusinessRuleViolation(String),

    /// External service errors
    #[error("External service error: {service} - {message}")]
    ExternalServiceError { service: String, message: String },

    /// Configuration errors
    #[error("Configuration error: {0}")]
    ConfigurationError(String),

    /// Serialization/Deserialization errors
    #[error("Serialization error: {0}")]
    SerializationError(String),

    /// Network communication errors
    #[error("Network error: {0}")]
    NetworkError(String),

    /// Rate limiting errors
    #[error("Rate limit exceeded: {0}")]
    RateLimitExceeded(String),

    /// Generic internal errors
    #[error("Internal error: {0}")]
    InternalError(String),
    
    /// Serialization errors
    #[error("Serialization error: {0}")]
    Serialization(String),
    
    /// Deserialization errors
    #[error("Deserialization error: {0}")]
    Deserialization(String),
    
    /// External system errors
    #[error("External error: {0}")]
    External(String),
}

impl CoreError {
    /// Create a validation error
    pub fn validation<S: Into<String>>(message: S) -> Self {
        CoreError::ValidationError(message.into())
    }

    /// Create a not found error
    pub fn not_found<S: Into<String>>(entity_type: S, id: S) -> Self {
        CoreError::NotFound {
            entity_type: entity_type.into(),
            id: id.into(),
        }
    }

    /// Create a permission denied error
    pub fn permission_denied<S: Into<String>>(message: S) -> Self {
        CoreError::PermissionDenied(message.into())
    }

    /// Create a business rule violation error
    pub fn business_rule<S: Into<String>>(message: S) -> Self {
        CoreError::BusinessRuleViolation(message.into())
    }

    /// Create an external service error
    pub fn external_service<S: Into<String>>(service: S, message: S) -> Self {
        CoreError::ExternalServiceError {
            service: service.into(),
            message: message.into(),
        }
    }

    /// Create a configuration error
    pub fn configuration<S: Into<String>>(message: S) -> Self {
        CoreError::ConfigurationError(message.into())
    }

    /// Create a serialization error
    pub fn serialization<S: Into<String>>(message: S) -> Self {
        CoreError::SerializationError(message.into())
    }

    /// Create a network error
    pub fn network<S: Into<String>>(message: S) -> Self {
        CoreError::NetworkError(message.into())
    }

    /// Create a rate limit error
    pub fn rate_limit<S: Into<String>>(message: S) -> Self {
        CoreError::RateLimitExceeded(message.into())
    }

    /// Create an internal error
    pub fn internal<S: Into<String>>(message: S) -> Self {
        CoreError::InternalError(message.into())
    }

    /// Get the error category for logging and metrics
    pub fn category(&self) -> ErrorCategory {
        match self {
            CoreError::ValidationError(_) => ErrorCategory::Validation,
            CoreError::NotFound { .. } => ErrorCategory::NotFound,
            CoreError::PermissionDenied(_) => ErrorCategory::Permission,
            CoreError::BusinessRuleViolation(_) => ErrorCategory::BusinessRule,
            CoreError::ExternalServiceError { .. } => ErrorCategory::ExternalService,
            CoreError::ConfigurationError(_) => ErrorCategory::Configuration,
            CoreError::SerializationError(_) => ErrorCategory::Serialization,
            CoreError::NetworkError(_) => ErrorCategory::Network,
            CoreError::RateLimitExceeded(_) => ErrorCategory::RateLimit,
            CoreError::InternalError(_) => ErrorCategory::Internal,
            CoreError::Serialization(_) => ErrorCategory::Serialization,
            CoreError::Deserialization(_) => ErrorCategory::Serialization,
            CoreError::External(_) => ErrorCategory::ExternalService,
        }
    }

    /// Check if the error is retryable
    pub fn is_retryable(&self) -> bool {
        matches!(
            self,
            CoreError::NetworkError(_) | 
            CoreError::ExternalServiceError { .. } |
            CoreError::RateLimitExceeded(_)
        )
    }

    /// Check if the error should be logged at error level
    pub fn is_critical(&self) -> bool {
        matches!(
            self,
            CoreError::InternalError(_) | 
            CoreError::ConfigurationError(_)
        )
    }
}

/// Error categories for classification
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ErrorCategory {
    Validation,
    NotFound,
    Permission,
    BusinessRule,
    ExternalService,
    Configuration,
    Serialization,
    Network,
    RateLimit,
    Internal,
}

impl fmt::Display for ErrorCategory {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ErrorCategory::Validation => write!(f, "validation"),
            ErrorCategory::NotFound => write!(f, "not_found"),
            ErrorCategory::Permission => write!(f, "permission"),
            ErrorCategory::BusinessRule => write!(f, "business_rule"),
            ErrorCategory::ExternalService => write!(f, "external_service"),
            ErrorCategory::Configuration => write!(f, "configuration"),
            ErrorCategory::Serialization => write!(f, "serialization"),
            ErrorCategory::Network => write!(f, "network"),
            ErrorCategory::RateLimit => write!(f, "rate_limit"),
            ErrorCategory::Internal => write!(f, "internal"),
        }
    }
}

/// Convert from validator::ValidationErrors
impl From<validator::ValidationErrors> for CoreError {
    fn from(err: validator::ValidationErrors) -> Self {
        CoreError::ValidationError(err.to_string())
    }
}

/// Convert from serde_json::Error
impl From<serde_json::Error> for CoreError {
    fn from(err: serde_json::Error) -> Self {
        CoreError::SerializationError(err.to_string())
    }
}

/// Convert from anyhow::Error for internal errors
impl From<anyhow::Error> for CoreError {
    fn from(err: anyhow::Error) -> Self {
        CoreError::InternalError(err.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_creation() {
        let error = CoreError::validation("Invalid input");
        assert_eq!(error.category(), ErrorCategory::Validation);
        assert!(!error.is_retryable());
        assert!(!error.is_critical());
    }

    #[test]
    fn test_not_found_error() {
        let error = CoreError::not_found("User", "123");
        assert_eq!(error.category(), ErrorCategory::NotFound);
        
        match error {
            CoreError::NotFound { entity_type, id } => {
                assert_eq!(entity_type, "User");
                assert_eq!(id, "123");
            }
            _ => panic!("Expected NotFound error"),
        }
    }

    #[test]
    fn test_retryable_errors() {
        assert!(CoreError::network("Connection failed").is_retryable());
        assert!(CoreError::rate_limit("Too many requests").is_retryable());
        assert!(!CoreError::validation("Invalid data").is_retryable());
    }

    #[test]
    fn test_critical_errors() {
        assert!(CoreError::internal("Database corruption").is_critical());
        assert!(CoreError::configuration("Missing API key").is_critical());
        assert!(!CoreError::validation("Invalid email").is_critical());
    }

    #[test]
    fn test_error_serialization() {
        let error = CoreError::validation("Test error");
        let json = serde_json::to_string(&error).unwrap();
        let deserialized: CoreError = serde_json::from_str(&json).unwrap();
        
        assert_eq!(error.to_string(), deserialized.to_string());
    }
}