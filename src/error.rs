use actix_web::{HttpResponse, ResponseError};
use serde_json::json;
use std::fmt;

#[derive(Debug)]
pub enum AppError {
    InternalServerError(String),
    BadRequest(String),
    NotFound(String),
    Unauthorized(String),
    Forbidden(String),
    ValidationError(String),
    DatabaseError(String),
    WhatsAppError(String),
    FlowExecutionError(String),
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            AppError::InternalServerError(msg) => write!(f, "Internal server error: {}", msg),
            AppError::BadRequest(msg) => write!(f, "Bad request: {}", msg),
            AppError::NotFound(msg) => write!(f, "Not found: {}", msg),
            AppError::Unauthorized(msg) => write!(f, "Unauthorized: {}", msg),
            AppError::Forbidden(msg) => write!(f, "Forbidden: {}", msg),
            AppError::ValidationError(msg) => write!(f, "Validation error: {}", msg),
            AppError::DatabaseError(msg) => write!(f, "Database error: {}", msg),
            AppError::WhatsAppError(msg) => write!(f, "WhatsApp error: {}", msg),
            AppError::FlowExecutionError(msg) => write!(f, "Flow execution error: {}", msg),
        }
    }
}

impl std::error::Error for AppError {}

impl ResponseError for AppError {
    fn error_response(&self) -> HttpResponse {
        match self {
            AppError::InternalServerError(msg) => {
                HttpResponse::InternalServerError().json(json!({
                    "error": "internal_server_error",
                    "message": msg
                }))
            }
            AppError::BadRequest(msg) => {
                HttpResponse::BadRequest().json(json!({
                    "error": "bad_request",
                    "message": msg
                }))
            }
            AppError::NotFound(msg) => {
                HttpResponse::NotFound().json(json!({
                    "error": "not_found",
                    "message": msg
                }))
            }
            AppError::Unauthorized(msg) => {
                HttpResponse::Unauthorized().json(json!({
                    "error": "unauthorized",
                    "message": msg
                }))
            }
            AppError::Forbidden(msg) => {
                HttpResponse::Forbidden().json(json!({
                    "error": "forbidden",
                    "message": msg
                }))
            }
            AppError::ValidationError(msg) => {
                HttpResponse::UnprocessableEntity().json(json!({
                    "error": "validation_error",
                    "message": msg
                }))
            }
            AppError::DatabaseError(msg) => {
                HttpResponse::InternalServerError().json(json!({
                    "error": "database_error",
                    "message": msg
                }))
            }
            AppError::WhatsAppError(msg) => {
                HttpResponse::BadGateway().json(json!({
                    "error": "whatsapp_error",
                    "message": msg
                }))
            }
            AppError::FlowExecutionError(msg) => {
                HttpResponse::InternalServerError().json(json!({
                    "error": "flow_execution_error",
                    "message": msg
                }))
            }
        }
    }
}

// Implementar conversões de erros comuns
impl From<anyhow::Error> for AppError {
    fn from(err: anyhow::Error) -> Self {
        AppError::InternalServerError(err.to_string())
    }
}

impl From<redis::RedisError> for AppError {
    fn from(err: redis::RedisError) -> Self {
        AppError::DatabaseError(format!("Redis error: {}", err))
    }
}

impl From<serde_json::Error> for AppError {
    fn from(err: serde_json::Error) -> Self {
        AppError::ValidationError(format!("JSON error: {}", err))
    }
}

impl From<reqwest::Error> for AppError {
    fn from(err: reqwest::Error) -> Self {
        AppError::WhatsAppError(format!("HTTP request error: {}", err))
    }
}

impl From<std::env::VarError> for AppError {
    fn from(err: std::env::VarError) -> Self {
        AppError::InternalServerError(format!("Environment variable error: {}", err))
    }
}

impl From<sqlx::Error> for AppError {
    fn from(err: sqlx::Error) -> Self {
        match err {
            sqlx::Error::RowNotFound => AppError::NotFound("Resource not found".to_string()),
            _ => AppError::DatabaseError(format!("Database error: {}", err)),
        }
    }
}