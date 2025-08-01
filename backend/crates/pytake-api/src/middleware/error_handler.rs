use actix_web::{
    dev::{forward_ready, Service, ServiceRequest, ServiceResponse, Transform},
    Error, HttpResponse, ResponseError,
};
use futures_util::future::LocalBoxFuture;
use serde_json::json;
use std::{
    future::{ready, Ready},
    rc::Rc,
};
use tracing::error;

/// Custom error response structure
#[derive(serde::Serialize, serde::Deserialize, Debug)]
pub struct ErrorResponse {
    pub error: String,
    pub message: String,
    pub code: String,
    pub request_id: Option<String>,
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

impl ErrorResponse {
    pub fn new(error: String, message: String, code: String, request_id: Option<String>) -> Self {
        Self {
            error,
            message,
            code,
            request_id,
            timestamp: chrono::Utc::now(),
        }
    }

    pub fn internal_server_error(request_id: Option<String>) -> Self {
        Self::new(
            "Internal Server Error".to_string(),
            "An unexpected error occurred".to_string(),
            "INTERNAL_ERROR".to_string(),
            request_id,
        )
    }

    pub fn bad_request(message: String, request_id: Option<String>) -> Self {
        Self::new(
            "Bad Request".to_string(),
            message,
            "BAD_REQUEST".to_string(),
            request_id,
        )
    }

    pub fn not_found(message: String, request_id: Option<String>) -> Self {
        Self::new(
            "Not Found".to_string(),
            message,
            "NOT_FOUND".to_string(),
            request_id,
        )
    }

    pub fn unauthorized(request_id: Option<String>) -> Self {
        Self::new(
            "Unauthorized".to_string(),
            "Authentication required".to_string(),
            "UNAUTHORIZED".to_string(),
            request_id,
        )
    }

    pub fn forbidden(request_id: Option<String>) -> Self {
        Self::new(
            "Forbidden".to_string(),
            "Access denied".to_string(),
            "FORBIDDEN".to_string(),
            request_id,
        )
    }
}

/// Global error handler middleware
pub struct ErrorHandler;

impl<S, B> Transform<S, ServiceRequest> for ErrorHandler
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type InitError = ();
    type Transform = ErrorHandlerMiddleware<S>;
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(ErrorHandlerMiddleware {
            service: Rc::new(service),
        }))
    }
}

pub struct ErrorHandlerMiddleware<S> {
    service: Rc<S>,
}

impl<S, B> Service<ServiceRequest> for ErrorHandlerMiddleware<S>
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type Future = LocalBoxFuture<'static, Result<Self::Response, Self::Error>>;

    forward_ready!(service);

    fn call(&self, req: ServiceRequest) -> Self::Future {
        let service = self.service.clone();

        Box::pin(async move {
            let request_id = crate::middleware::request_id::get_request_id(&req);
            
            match service.call(req).await {
                Ok(res) => Ok(res),
                Err(err) => {
                    // Log the error with request ID for debugging
                    error!(
                        request_id = ?request_id,
                        error = %err,
                        "Request failed with error"
                    );

                    // Convert the error to our custom error response
                    Err(err)
                }
            }
        })
    }
}

/// Application-specific errors that can be converted to HTTP responses
#[derive(Debug, thiserror::Error)]
pub enum ApiError {
    #[error("Database error: {0}")]
    Database(#[from] pytake_db::error::DatabaseError),
    
    #[error("Validation error: {0}")]
    Validation(String),
    
    #[error("Not found: {0}")]
    NotFound(String),
    
    #[error("Unauthorized")]
    Unauthorized,
    
    #[error("Forbidden")]
    Forbidden,
    
    #[error("Internal server error: {0}")]
    Internal(String),
    
    #[error("Bad request: {0}")]
    BadRequest(String),
    
    #[error("Conflict: {0}")]
    Conflict(String),
}

impl ResponseError for ApiError {
    fn status_code(&self) -> actix_web::http::StatusCode {
        use actix_web::http::StatusCode;
        
        match self {
            ApiError::Database(_) => StatusCode::INTERNAL_SERVER_ERROR,
            ApiError::Validation(_) => StatusCode::BAD_REQUEST,
            ApiError::NotFound(_) => StatusCode::NOT_FOUND,
            ApiError::Unauthorized => StatusCode::UNAUTHORIZED,
            ApiError::Forbidden => StatusCode::FORBIDDEN,
            ApiError::Internal(_) => StatusCode::INTERNAL_SERVER_ERROR,
            ApiError::BadRequest(_) => StatusCode::BAD_REQUEST,
            ApiError::Conflict(_) => StatusCode::CONFLICT,
        }
    }

    fn error_response(&self) -> HttpResponse {
        let request_id = None; // TODO: Extract from request context if available
        
        let error_response = match self {
            ApiError::Database(_) => ErrorResponse::internal_server_error(request_id),
            ApiError::Validation(msg) => ErrorResponse::bad_request(msg.clone(), request_id),
            ApiError::NotFound(msg) => ErrorResponse::not_found(msg.clone(), request_id),
            ApiError::Unauthorized => ErrorResponse::unauthorized(request_id),
            ApiError::Forbidden => ErrorResponse::forbidden(request_id),
            ApiError::Internal(msg) => ErrorResponse::new(
                "Internal Server Error".to_string(),
                msg.clone(),
                "INTERNAL_ERROR".to_string(),
                request_id,
            ),
            ApiError::BadRequest(msg) => ErrorResponse::bad_request(msg.clone(), request_id),
            ApiError::Conflict(msg) => ErrorResponse::new(
                "Conflict".to_string(),
                msg.clone(),
                "CONFLICT".to_string(),
                request_id,
            ),
        };

        HttpResponse::build(self.status_code()).json(error_response)
    }
}

/// Convert validation errors to API errors
impl From<validator::ValidationErrors> for ApiError {
    fn from(errors: validator::ValidationErrors) -> Self {
        let mut messages = Vec::new();
        for (field, field_errors) in errors.field_errors() {
            for error in field_errors {
                let message = error.message
                    .as_ref()
                    .map(|m| m.to_string())
                    .unwrap_or_else(|| format!("Invalid value for field '{}'", field));
                messages.push(message);
            }
        }
        ApiError::Validation(messages.join(", "))
    }
}

/// Result type alias for API operations
pub type ApiResult<T> = Result<T, ApiError>;

#[cfg(test)]
mod tests {
    use super::*;
    use actix_web::http::StatusCode;

    #[test]
    fn test_error_response_creation() {
        let error = ErrorResponse::internal_server_error(Some("req-123".to_string()));
        assert_eq!(error.error, "Internal Server Error");
        assert_eq!(error.code, "INTERNAL_ERROR");
        assert_eq!(error.request_id, Some("req-123".to_string()));
    }

    #[test]
    fn test_api_error_status_codes() {
        assert_eq!(ApiError::NotFound("test".to_string()).status_code(), StatusCode::NOT_FOUND);
        assert_eq!(ApiError::Unauthorized.status_code(), StatusCode::UNAUTHORIZED);
        assert_eq!(ApiError::Forbidden.status_code(), StatusCode::FORBIDDEN);
        assert_eq!(ApiError::BadRequest("test".to_string()).status_code(), StatusCode::BAD_REQUEST);
        assert_eq!(ApiError::Internal("test".to_string()).status_code(), StatusCode::INTERNAL_SERVER_ERROR);
    }

    #[test]
    fn test_validation_error_conversion() {
        use validator::{Validate, ValidationError};
        
        #[derive(Validate)]
        struct TestStruct {
            #[validate(length(min = 1))]
            name: String,
        }

        let test_struct = TestStruct { name: String::new() };
        let validation_errors = test_struct.validate().unwrap_err();
        let api_error: ApiError = validation_errors.into();
        
        match api_error {
            ApiError::Validation(_) => (),
            _ => panic!("Expected validation error"),
        }
    }
}