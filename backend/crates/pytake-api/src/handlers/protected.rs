//! Protected endpoints example
//!
//! This module demonstrates how to use authentication middleware
//! to protect endpoints and require specific permissions or roles.

use crate::{
    middleware::AuthUser,
    middleware::error_handler::{ApiError, ApiResult},
};
use actix_web::{web, HttpResponse};
use serde::{Deserialize, Serialize};
use pytake_core::auth::{Permission, Role};

#[derive(Debug, Serialize)]
pub struct ProtectedResponse {
    pub message: String,
    pub user_id: String,
    pub email: String,
    pub roles: Vec<String>,
}

/// Example protected endpoint that requires authentication
pub async fn protected_endpoint(user: AuthUser) -> ApiResult<HttpResponse> {
    let auth_context = &user.0;
    
    Ok(HttpResponse::Ok().json(ProtectedResponse {
        message: "This is a protected endpoint".to_string(),
        user_id: auth_context.user_id.clone(),
        email: auth_context.email.clone(),
        roles: auth_context.roles.iter().map(|r| r.to_string()).collect(),
    }))
}

/// Admin-only endpoint
pub async fn admin_endpoint(user: AuthUser) -> ApiResult<HttpResponse> {
    let auth_context = &user.0;
    
    // This check is redundant if using RequireRole middleware, but shown for example
    if !auth_context.has_role(&Role::Admin) && !auth_context.has_role(&Role::SuperAdmin) {
        return Err(ApiError::forbidden("Admin access required"));
    }
    
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "message": "Admin endpoint accessed",
        "user_id": auth_context.user_id,
        "is_admin": true
    })))
}

/// Endpoint requiring specific permission
pub async fn user_management_endpoint(user: AuthUser) -> ApiResult<HttpResponse> {
    let auth_context = &user.0;
    
    // This check is redundant if using RequirePermission middleware, but shown for example
    if !auth_context.has_permission(&Permission::UserWrite) {
        return Err(ApiError::forbidden("User write permission required"));
    }
    
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "message": "User management endpoint accessed",
        "user_id": auth_context.user_id,
        "can_manage_users": true
    })))
}

/// Example of updating user profile (requires authentication)
#[derive(Debug, Deserialize, Serialize)]
pub struct UpdateProfileRequest {
    pub name: Option<String>,
    pub phone: Option<String>,
}

pub async fn update_profile(
    user: AuthUser,
    data: web::Json<UpdateProfileRequest>,
) -> ApiResult<HttpResponse> {
    let auth_context = &user.0;
    
    // In a real implementation, this would update the user in the database
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "message": "Profile updated successfully",
        "user_id": auth_context.user_id,
        "updates": data.into_inner()
    })))
}

/// Configure protected routes
pub fn configure_protected_routes(cfg: &mut web::ServiceConfig) {
    use crate::middleware::{auth_middleware, require_role, require_permission};
    
    cfg.service(
        web::scope("/api/v1/protected")
            // All routes in this scope require authentication
            .wrap(auth_middleware())
            
            // Basic protected endpoint
            .route("", web::get().to(protected_endpoint))
            
            // Admin-only endpoint
            .service(
                web::resource("/admin")
                    .wrap(require_role(Role::Admin))
                    .route(web::get().to(admin_endpoint))
            )
            
            // Endpoint requiring specific permission
            .service(
                web::resource("/users/manage")
                    .wrap(require_permission(Permission::UserWrite))
                    .route(web::get().to(user_management_endpoint))
            )
            
            // Profile management
            .route("/profile", web::put().to(update_profile))
    );
}