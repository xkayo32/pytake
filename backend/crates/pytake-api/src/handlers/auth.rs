//! Authentication handlers for the PyTake API
//!
//! This module provides HTTP handlers for authentication endpoints including
//! user registration, login, token refresh, logout, and current user info.

use crate::{
    middleware::error_handler::{ApiError, ApiResult},
    services::AuthService,
    state::AppState,
};
use actix_web::{web, HttpRequest, HttpResponse};
use pytake_core::{
    auth::AuthResult,
    entities::{User, UserRole, UserStatus},
};
use serde::{Deserialize, Serialize};
use tracing::info;
use validator::Validate;

// Request DTOs

/// User registration request
#[derive(Debug, Deserialize, Validate)]
pub struct RegisterRequest {
    #[validate(email(message = "Invalid email format"))]
    pub email: String,
    
    #[validate(length(min = 8, message = "Password must be at least 8 characters long"))]
    pub password: String,
    
    #[validate(length(min = 1, max = 100, message = "Name must be between 1 and 100 characters"))]
    pub name: String,
}

/// User login request
#[derive(Debug, Deserialize, Validate)]
pub struct LoginRequest {
    #[validate(email(message = "Invalid email format"))]
    pub email: String,
    
    #[validate(length(min = 1, message = "Password is required"))]
    pub password: String,
}

/// Token refresh request
#[derive(Debug, Deserialize, Validate)]
pub struct RefreshTokenRequest {
    #[validate(length(min = 1, message = "Refresh token is required"))]
    pub refresh_token: String,
}

/// Logout request
#[derive(Debug, Deserialize, Validate)]
pub struct LogoutRequest {
    #[validate(length(min = 1, message = "Access token is required"))]
    pub access_token: String,
}

// Response DTOs

/// Authentication response
#[derive(Debug, Serialize)]
pub struct AuthResponse {
    pub user_id: String,
    pub access_token: String,
    pub refresh_token: String,
    pub expires_in: i64,
    pub token_type: String,
    pub user: UserResponse,
}

/// User information response
#[derive(Debug, Serialize)]
pub struct UserResponse {
    pub id: String,
    pub email: String,
    pub name: String,
    pub role: UserRole,
    pub status: UserStatus,
    pub created_at: String,
    pub updated_at: String,
}

impl From<User> for UserResponse {
    fn from(user: User) -> Self {
        Self {
            id: user.id.to_string(),
            email: user.email,
            name: user.name,
            role: user.role,
            status: user.status,
            created_at: user.created_at.to_rfc3339(),
            updated_at: user.updated_at.to_rfc3339(),
        }
    }
}

/// Success response for operations that don't return data
#[derive(Debug, Serialize)]
pub struct SuccessResponse {
    pub message: String,
    pub timestamp: String,
}

impl SuccessResponse {
    pub fn new(message: impl Into<String>) -> Self {
        Self {
            message: message.into(),
            timestamp: chrono::Utc::now().to_rfc3339(),
        }
    }
}

// Handler functions

/// POST /api/v1/auth/register
/// Register a new user account
pub async fn register(
    data: web::Data<AppState>,
    request: web::Json<RegisterRequest>,
) -> ApiResult<HttpResponse> {
    info!("Registration request received for email: {}", request.email);

    // Validate request
    request.validate()?;

    // Get auth service from app state
    let auth_service = data.auth_service();

    // Register user
    let auth_result = auth_service
        .register(
            request.email.clone(),
            request.password.clone(),
            request.name.clone(),
        )
        .await?;

    // Get user info for response
    let user = auth_service
        .get_current_user(auth_result.access_token.clone())
        .await?;

    let response = AuthResponse {
        user_id: auth_result.user_id,
        access_token: auth_result.access_token,
        refresh_token: auth_result.refresh_token,
        expires_in: auth_result.expires_in,
        token_type: auth_result.token_type,
        user: user.into(),
    };

    info!("User registration successful");
    Ok(HttpResponse::Created().json(response))
}

/// POST /api/v1/auth/login
/// Authenticate user with email and password
pub async fn login(
    data: web::Data<AppState>,
    request: web::Json<LoginRequest>,
    http_request: HttpRequest,
) -> ApiResult<HttpResponse> {
    info!("Login request received");

    // Validate request
    request.validate()?;

    // Extract client info from request
    let ip_address = extract_ip_address(&http_request);
    let user_agent = extract_user_agent(&http_request);

    // Get auth service from app state
    let auth_service = data.auth_service();

    // Authenticate user
    let auth_result = auth_service
        .login(
            request.email.clone(),
            request.password.clone(),
            ip_address,
            user_agent,
        )
        .await?;

    // Get user info for response
    let user = auth_service
        .get_current_user(auth_result.access_token.clone())
        .await?;

    let response = AuthResponse {
        user_id: auth_result.user_id,
        access_token: auth_result.access_token,
        refresh_token: auth_result.refresh_token,
        expires_in: auth_result.expires_in,
        token_type: auth_result.token_type,
        user: user.into(),
    };

    info!("User login successful");
    Ok(HttpResponse::Ok().json(response))
}

/// POST /api/v1/auth/refresh
/// Refresh access token using refresh token
pub async fn refresh_token(
    data: web::Data<AppState>,
    request: web::Json<RefreshTokenRequest>,
) -> ApiResult<HttpResponse> {
    info!("Token refresh request received");

    // Validate request
    request.validate()?;

    // Get auth service from app state
    let auth_service = data.auth_service();

    // Refresh token
    let auth_result = auth_service
        .refresh_token(request.refresh_token.clone())
        .await?;

    // Get user info for response
    let user = auth_service
        .get_current_user(auth_result.access_token.clone())
        .await?;

    let response = AuthResponse {
        user_id: auth_result.user_id,
        access_token: auth_result.access_token,
        refresh_token: auth_result.refresh_token,
        expires_in: auth_result.expires_in,
        token_type: auth_result.token_type,
        user: user.into(),
    };

    info!("Token refresh successful");
    Ok(HttpResponse::Ok().json(response))
}

/// POST /api/v1/auth/logout
/// Logout user and revoke session
pub async fn logout(
    data: web::Data<AppState>,
    request: web::Json<LogoutRequest>,
) -> ApiResult<HttpResponse> {
    info!("Logout request received");

    // Validate request
    request.validate()?;

    // Get auth service from app state
    let auth_service = data.auth_service();

    // Logout user
    auth_service
        .logout(request.access_token.clone())
        .await?;

    let response = SuccessResponse::new("Successfully logged out");

    info!("User logout successful");
    Ok(HttpResponse::Ok().json(response))
}

/// GET /api/v1/auth/me
/// Get current user information
pub async fn get_current_user(
    data: web::Data<AppState>,
    http_request: HttpRequest,
) -> ApiResult<HttpResponse> {
    info!("Get current user request received");

    // Extract bearer token from Authorization header
    let access_token = extract_bearer_token(&http_request)?;

    // Get auth service from app state
    let auth_service = data.auth_service();

    // Get current user
    let user = auth_service
        .get_current_user(access_token)
        .await?;

    let response = UserResponse::from(user);

    info!("Get current user successful");
    Ok(HttpResponse::Ok().json(response))
}

// Helper functions

/// Extract IP address from HTTP request
fn extract_ip_address(request: &HttpRequest) -> Option<String> {
    // Check for X-Forwarded-For header first (for load balancers/proxies)
    if let Some(forwarded_for) = request.headers().get("X-Forwarded-For") {
        if let Ok(header_value) = forwarded_for.to_str() {
            // Take the first IP address from the comma-separated list
            if let Some(ip) = header_value.split(',').next() {
                return Some(ip.trim().to_string());
            }
        }
    }

    // Check for X-Real-IP header (used by some proxies)
    if let Some(real_ip) = request.headers().get("X-Real-IP") {
        if let Ok(header_value) = real_ip.to_str() {
            return Some(header_value.to_string());
        }
    }

    // Fall back to connection info
    request.connection_info().realip_remote_addr()
        .map(|ip| ip.to_string())
}

/// Extract User-Agent from HTTP request
fn extract_user_agent(request: &HttpRequest) -> Option<String> {
    request.headers()
        .get("User-Agent")
        .and_then(|value| value.to_str().ok())
        .map(|s| s.to_string())
}

/// Extract Bearer token from Authorization header
fn extract_bearer_token(request: &HttpRequest) -> ApiResult<String> {
    let auth_header = request.headers()
        .get("Authorization")
        .ok_or_else(|| ApiError::Unauthorized)?;

    let auth_value = auth_header.to_str()
        .map_err(|_| ApiError::BadRequest("Invalid Authorization header".to_string()))?;

    if !auth_value.starts_with("Bearer ") {
        return Err(ApiError::BadRequest("Authorization header must use Bearer scheme".to_string()));
    }

    let token = auth_value[7..].trim(); // Remove "Bearer " prefix
    if token.is_empty() {
        return Err(ApiError::BadRequest("Authorization token is required".to_string()));
    }

    Ok(token.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use actix_web::{test, http::header::HeaderValue};

    #[test]
    fn test_register_request_validation() {
        let valid_request = RegisterRequest {
            email: "test@example.com".to_string(),
            password: "password123".to_string(),
            name: "Test User".to_string(),
        };
        assert!(valid_request.validate().is_ok());

        let invalid_email = RegisterRequest {
            email: "invalid-email".to_string(),
            password: "password123".to_string(),
            name: "Test User".to_string(),
        };
        assert!(invalid_email.validate().is_err());

        let short_password = RegisterRequest {
            email: "test@example.com".to_string(),
            password: "short".to_string(),
            name: "Test User".to_string(),
        };
        assert!(short_password.validate().is_err());
    }

    #[test]
    fn test_extract_bearer_token() {
        let mut req = test::TestRequest::get().to_http_request();
        
        // No Authorization header
        assert!(extract_bearer_token(&req).is_err());

        // Valid Bearer token
        let req = test::TestRequest::get()
            .insert_header(("Authorization", "Bearer test-token-123"))
            .to_http_request();
        let token = extract_bearer_token(&req).unwrap();
        assert_eq!(token, "test-token-123");

        // Invalid scheme
        let req = test::TestRequest::get()
            .insert_header(("Authorization", "Basic dGVzdDp0ZXN0"))
            .to_http_request();
        assert!(extract_bearer_token(&req).is_err());

        // Empty token
        let req = test::TestRequest::get()
            .insert_header(("Authorization", "Bearer "))
            .to_http_request();
        assert!(extract_bearer_token(&req).is_err());
    }

    #[test]
    fn test_user_response_from_user() {
        let user = User::new("test@example.com".to_string(), "Test User".to_string());
        let response = UserResponse::from(user.clone());
        
        assert_eq!(response.id, user.id.to_string());
        assert_eq!(response.email, user.email);
        assert_eq!(response.name, user.name);
        assert_eq!(response.role, user.role);
        assert_eq!(response.status, user.status);
    }
}