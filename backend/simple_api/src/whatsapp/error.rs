use actix_web::{HttpResponse, ResponseError};
use serde::{Deserialize, Serialize};
use std::fmt;

/// Common error types for WhatsApp module
#[derive(Debug, Clone, PartialEq)]
pub enum WhatsAppError {
    /// Configuration errors
    ConfigNotFound(String),
    InvalidConfig(String),
    ConfigValidationFailed(String),
    
    /// API communication errors
    ApiRequestFailed(String),
    ApiResponseInvalid(String),
    AuthenticationFailed(String),
    
    /// Database errors
    DatabaseError(String),
    DatabaseConnectionFailed(String),
    
    /// Instance management errors
    InstanceNotFound(String),
    InstanceCreationFailed(String),
    InstanceConnectionFailed(String),
    
    /// Message errors
    MessageSendFailed(String),
    MessageInvalid(String),
    
    /// Internal errors
    InternalError(String),
    SerializationError(String),
}

impl fmt::Display for WhatsAppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            WhatsAppError::ConfigNotFound(msg) => write!(f, "Configuration not found: {}", msg),
            WhatsAppError::InvalidConfig(msg) => write!(f, "Invalid configuration: {}", msg),
            WhatsAppError::ConfigValidationFailed(msg) => write!(f, "Configuration validation failed: {}", msg),
            WhatsAppError::ApiRequestFailed(msg) => write!(f, "API request failed: {}", msg),
            WhatsAppError::ApiResponseInvalid(msg) => write!(f, "Invalid API response: {}", msg),
            WhatsAppError::AuthenticationFailed(msg) => write!(f, "Authentication failed: {}", msg),
            WhatsAppError::DatabaseError(msg) => write!(f, "Database error: {}", msg),
            WhatsAppError::DatabaseConnectionFailed(msg) => write!(f, "Database connection failed: {}", msg),
            WhatsAppError::InstanceNotFound(msg) => write!(f, "Instance not found: {}", msg),
            WhatsAppError::InstanceCreationFailed(msg) => write!(f, "Instance creation failed: {}", msg),
            WhatsAppError::InstanceConnectionFailed(msg) => write!(f, "Instance connection failed: {}", msg),
            WhatsAppError::MessageSendFailed(msg) => write!(f, "Message send failed: {}", msg),
            WhatsAppError::MessageInvalid(msg) => write!(f, "Invalid message: {}", msg),
            WhatsAppError::InternalError(msg) => write!(f, "Internal error: {}", msg),
            WhatsAppError::SerializationError(msg) => write!(f, "Serialization error: {}", msg),
        }
    }
}

impl std::error::Error for WhatsAppError {}

impl ResponseError for WhatsAppError {
    fn error_response(&self) -> HttpResponse {
        let error_response = WhatsAppErrorResponse {
            error: true,
            error_type: self.error_type(),
            message: self.to_string(),
            details: self.details(),
        };

        match self {
            WhatsAppError::ConfigNotFound(_) | WhatsAppError::InstanceNotFound(_) => {
                HttpResponse::NotFound().json(error_response)
            }
            WhatsAppError::InvalidConfig(_) | WhatsAppError::ConfigValidationFailed(_) | WhatsAppError::MessageInvalid(_) => {
                HttpResponse::BadRequest().json(error_response)
            }
            WhatsAppError::AuthenticationFailed(_) => {
                HttpResponse::Unauthorized().json(error_response)
            }
            _ => {
                HttpResponse::InternalServerError().json(error_response)
            }
        }
    }
}

impl WhatsAppError {
    fn error_type(&self) -> &'static str {
        match self {
            WhatsAppError::ConfigNotFound(_) => "config_not_found",
            WhatsAppError::InvalidConfig(_) => "invalid_config",
            WhatsAppError::ConfigValidationFailed(_) => "config_validation_failed",
            WhatsAppError::ApiRequestFailed(_) => "api_request_failed",
            WhatsAppError::ApiResponseInvalid(_) => "api_response_invalid",
            WhatsAppError::AuthenticationFailed(_) => "authentication_failed",
            WhatsAppError::DatabaseError(_) => "database_error",
            WhatsAppError::DatabaseConnectionFailed(_) => "database_connection_failed",
            WhatsAppError::InstanceNotFound(_) => "instance_not_found",
            WhatsAppError::InstanceCreationFailed(_) => "instance_creation_failed",
            WhatsAppError::InstanceConnectionFailed(_) => "instance_connection_failed",
            WhatsAppError::MessageSendFailed(_) => "message_send_failed",
            WhatsAppError::MessageInvalid(_) => "message_invalid",
            WhatsAppError::InternalError(_) => "internal_error",
            WhatsAppError::SerializationError(_) => "serialization_error",
        }
    }

    fn details(&self) -> Option<String> {
        match self {
            WhatsAppError::ConfigValidationFailed(_) => {
                Some("Check that all required fields are provided for the selected provider".to_string())
            }
            WhatsAppError::AuthenticationFailed(_) => {
                Some("Verify your access tokens and credentials are correct".to_string())
            }
            WhatsAppError::DatabaseConnectionFailed(_) => {
                Some("Check database connection and ensure migrations are run".to_string())
            }
            _ => None,
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WhatsAppErrorResponse {
    pub error: bool,
    pub error_type: &'static str,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<String>,
}

/// Result type alias for WhatsApp operations
pub type WhatsAppResult<T> = Result<T, WhatsAppError>;

/// Conversion helpers
impl From<serde_json::Error> for WhatsAppError {
    fn from(err: serde_json::Error) -> Self {
        WhatsAppError::SerializationError(err.to_string())
    }
}

impl From<reqwest::Error> for WhatsAppError {
    fn from(err: reqwest::Error) -> Self {
        WhatsAppError::ApiRequestFailed(err.to_string())
    }
}

impl From<sea_orm::DbErr> for WhatsAppError {
    fn from(err: sea_orm::DbErr) -> Self {
        WhatsAppError::DatabaseError(err.to_string())
    }
}

impl From<uuid::Error> for WhatsAppError {
    fn from(err: uuid::Error) -> Self {
        WhatsAppError::InvalidConfig(format!("Invalid UUID: {}", err))
    }
}

/// Helper macros for common error patterns
#[macro_export]
macro_rules! whatsapp_error {
    (config_not_found, $msg:expr) => {
        WhatsAppError::ConfigNotFound($msg.to_string())
    };
    (invalid_config, $msg:expr) => {
        WhatsAppError::InvalidConfig($msg.to_string())
    };
    (api_failed, $msg:expr) => {
        WhatsAppError::ApiRequestFailed($msg.to_string())
    };
    (internal, $msg:expr) => {
        WhatsAppError::InternalError($msg.to_string())
    };
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_display() {
        let error = WhatsAppError::ConfigNotFound("test config".to_string());
        assert_eq!(error.to_string(), "Configuration not found: test config");
    }

    #[test]
    fn test_error_type() {
        let error = WhatsAppError::InvalidConfig("test".to_string());
        assert_eq!(error.error_type(), "invalid_config");
    }

    #[test]
    fn test_error_response() {
        let error = WhatsAppError::AuthenticationFailed("invalid token".to_string());
        let response = error.error_response();
        assert_eq!(response.status(), 401);
    }
}