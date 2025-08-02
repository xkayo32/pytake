//! User management handlers

use actix_web::{web, HttpResponse};
use pytake_core::{
    auth::{UserRole, PermissionChecker},
    services::user_management::{
        UserManagementService, CreateUserInput as ServiceCreateUserInput,
        UpdateUserInput as ServiceUpdateUserInput,
    },
};
use serde::{Deserialize, Serialize};
use tracing::{error, info};
use uuid::Uuid;

use crate::{
    middleware::{
        auth::AuthContext,
        error_handler::{ApiError, ApiResult},
    },
    state::AppState,
};

/// User creation request
#[derive(Debug, Deserialize)]
pub struct CreateUserRequest {
    pub email: String,
    pub name: String,
    pub password: String,
    pub role: String,
}

/// User update request
#[derive(Debug, Deserialize)]
pub struct UpdateUserRequest {
    pub name: Option<String>,
    pub role: Option<String>,
    pub is_active: Option<bool>,
}

/// Password change request
#[derive(Debug, Deserialize)]
pub struct ChangePasswordRequest {
    pub old_password: String,
    pub new_password: String,
}

/// Password reset request
#[derive(Debug, Deserialize)]
pub struct ResetPasswordRequest {
    pub new_password: String,
}

/// Query parameters for listing users
#[derive(Debug, Deserialize)]
pub struct ListUsersQuery {
    pub page: Option<u64>,
    pub page_size: Option<u64>,
    pub include_inactive: Option<bool>,
    pub role: Option<String>,
}

/// User response
#[derive(Debug, Serialize)]
pub struct UserResponse {
    pub id: Uuid,
    pub email: String,
    pub name: String,
    pub role: String,
    pub is_active: bool,
    pub organization_id: Uuid,
    pub last_login_at: Option<chrono::DateTime<chrono::Utc>>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

/// Create a new user
pub async fn create_user(
    auth: AuthContext,
    body: web::Json<CreateUserRequest>,
    app_state: web::Data<AppState>,
) -> ApiResult<HttpResponse> {
    info!("Creating new user: {}", body.email);

    let role = UserRole::from_str(&body.role)
        .ok_or_else(|| ApiError::bad_request("Invalid role"))?;

    let permission_checker = auth.permission_checker();
    let user_service = UserManagementService::new(app_state.db.clone());

    let input = ServiceCreateUserInput {
        email: body.email.clone(),
        name: body.name.clone(),
        password: body.password.clone(),
        role,
        organization_id: auth.organization_id,
    };

    let user = user_service
        .create_user(input, &permission_checker)
        .await
        .map_err(|e| {
            error!("Failed to create user: {}", e);
            match e {
                pytake_core::errors::CoreError::Unauthorized(_) => ApiError::forbidden(&e.to_string()),
                pytake_core::errors::CoreError::Validation(_) => ApiError::bad_request(&e.to_string()),
                _ => ApiError::internal(&e.to_string()),
            }
        })?;

    let response = UserResponse {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role.as_str().to_string(),
        is_active: user.is_active,
        organization_id: user.organization_id,
        last_login_at: user.last_login_at,
        created_at: user.created_at,
    };

    Ok(HttpResponse::Created().json(response))
}

/// Update a user
pub async fn update_user(
    auth: AuthContext,
    user_id: web::Path<Uuid>,
    body: web::Json<UpdateUserRequest>,
    app_state: web::Data<AppState>,
) -> ApiResult<HttpResponse> {
    let user_id = user_id.into_inner();
    info!("Updating user: {}", user_id);

    let role = body.role.as_ref()
        .map(|r| UserRole::from_str(r))
        .transpose()
        .ok_or_else(|| ApiError::bad_request("Invalid role"))?;

    let permission_checker = auth.permission_checker();
    let user_service = UserManagementService::new(app_state.db.clone());

    let input = ServiceUpdateUserInput {
        name: body.name.clone(),
        role,
        is_active: body.is_active,
    };

    let user = user_service
        .update_user(user_id, input, &permission_checker)
        .await
        .map_err(|e| {
            error!("Failed to update user: {}", e);
            match e {
                pytake_core::errors::CoreError::NotFound(_) => ApiError::not_found("User not found"),
                pytake_core::errors::CoreError::Unauthorized(_) => ApiError::forbidden(&e.to_string()),
                pytake_core::errors::CoreError::Validation(_) => ApiError::bad_request(&e.to_string()),
                _ => ApiError::internal(&e.to_string()),
            }
        })?;

    let response = UserResponse {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role.as_str().to_string(),
        is_active: user.is_active,
        organization_id: user.organization_id,
        last_login_at: user.last_login_at,
        created_at: user.created_at,
    };

    Ok(HttpResponse::Ok().json(response))
}

/// Delete a user
pub async fn delete_user(
    auth: AuthContext,
    user_id: web::Path<Uuid>,
    app_state: web::Data<AppState>,
) -> ApiResult<HttpResponse> {
    let user_id = user_id.into_inner();
    info!("Deleting user: {}", user_id);

    let permission_checker = auth.permission_checker();
    let user_service = UserManagementService::new(app_state.db.clone());

    user_service
        .delete_user(user_id, &permission_checker)
        .await
        .map_err(|e| {
            error!("Failed to delete user: {}", e);
            match e {
                pytake_core::errors::CoreError::NotFound(_) => ApiError::not_found("User not found"),
                pytake_core::errors::CoreError::Unauthorized(_) => ApiError::forbidden(&e.to_string()),
                pytake_core::errors::CoreError::Validation(_) => ApiError::bad_request(&e.to_string()),
                _ => ApiError::internal(&e.to_string()),
            }
        })?;

    Ok(HttpResponse::NoContent().finish())
}

/// Get a user by ID
pub async fn get_user(
    auth: AuthContext,
    user_id: web::Path<Uuid>,
    app_state: web::Data<AppState>,
) -> ApiResult<HttpResponse> {
    let user_id = user_id.into_inner();
    info!("Getting user: {}", user_id);

    let permission_checker = auth.permission_checker();
    let user_service = UserManagementService::new(app_state.db.clone());

    let user = user_service
        .get_user(user_id, &permission_checker)
        .await
        .map_err(|e| {
            error!("Failed to get user: {}", e);
            match e {
                pytake_core::errors::CoreError::NotFound(_) => ApiError::not_found("User not found"),
                pytake_core::errors::CoreError::Unauthorized(_) => ApiError::forbidden(&e.to_string()),
                _ => ApiError::internal(&e.to_string()),
            }
        })?;

    let response = UserResponse {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role.as_str().to_string(),
        is_active: user.is_active,
        organization_id: user.organization_id,
        last_login_at: user.last_login_at,
        created_at: user.created_at,
    };

    Ok(HttpResponse::Ok().json(response))
}

/// List users
pub async fn list_users(
    auth: AuthContext,
    query: web::Query<ListUsersQuery>,
    app_state: web::Data<AppState>,
) -> ApiResult<HttpResponse> {
    info!("Listing users");

    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(20).min(100);
    let include_inactive = query.include_inactive.unwrap_or(false);

    let permission_checker = auth.permission_checker();
    let user_service = UserManagementService::new(app_state.db.clone());

    // If role filter is specified, list by role
    if let Some(role_str) = &query.role {
        let role = UserRole::from_str(role_str)
            .ok_or_else(|| ApiError::bad_request("Invalid role"))?;

        let users = user_service
            .list_users_by_role(auth.organization_id, role, &permission_checker)
            .await
            .map_err(|e| {
                error!("Failed to list users: {}", e);
                match e {
                    pytake_core::errors::CoreError::Unauthorized(_) => ApiError::forbidden(&e.to_string()),
                    _ => ApiError::internal(&e.to_string()),
                }
            })?;

        let response_users: Vec<UserResponse> = users
            .into_iter()
            .map(|u| UserResponse {
                id: u.id,
                email: u.email,
                name: u.name,
                role: u.role.as_str().to_string(),
                is_active: u.is_active,
                organization_id: u.organization_id,
                last_login_at: u.last_login_at,
                created_at: u.created_at,
            })
            .collect();

        return Ok(HttpResponse::Ok().json(serde_json::json!({
            "users": response_users,
            "pagination": {
                "page": 1,
                "page_size": response_users.len(),
                "total": response_users.len(),
                "total_pages": 1,
            }
        })));
    }

    // Otherwise, list all users with pagination
    let (users, total) = user_service
        .list_users(auth.organization_id, page, page_size, include_inactive, &permission_checker)
        .await
        .map_err(|e| {
            error!("Failed to list users: {}", e);
            match e {
                pytake_core::errors::CoreError::Unauthorized(_) => ApiError::forbidden(&e.to_string()),
                _ => ApiError::internal(&e.to_string()),
            }
        })?;

    let response_users: Vec<UserResponse> = users
        .into_iter()
        .map(|u| UserResponse {
            id: u.id,
            email: u.email,
            name: u.name,
            role: u.role.as_str().to_string(),
            is_active: u.is_active,
            organization_id: u.organization_id,
            last_login_at: u.last_login_at,
            created_at: u.created_at,
        })
        .collect();

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "users": response_users,
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": (total + page_size - 1) / page_size,
        }
    })))
}

/// Change user password
pub async fn change_password(
    auth: AuthContext,
    body: web::Json<ChangePasswordRequest>,
    app_state: web::Data<AppState>,
) -> ApiResult<HttpResponse> {
    info!("Changing password for user: {}", auth.user_id);

    let user_id = Uuid::parse_str(&auth.user_id)
        .map_err(|_| ApiError::internal("Invalid user ID"))?;

    let user_service = UserManagementService::new(app_state.db.clone());

    user_service
        .change_password(user_id, &body.old_password, &body.new_password)
        .await
        .map_err(|e| {
            error!("Failed to change password: {}", e);
            match e {
                pytake_core::errors::CoreError::NotFound(_) => ApiError::not_found("User not found"),
                pytake_core::errors::CoreError::Unauthorized(_) => ApiError::bad_request("Invalid current password"),
                _ => ApiError::internal(&e.to_string()),
            }
        })?;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "message": "Password changed successfully"
    })))
}

/// Reset user password (admin action)
pub async fn reset_password(
    auth: AuthContext,
    user_id: web::Path<Uuid>,
    body: web::Json<ResetPasswordRequest>,
    app_state: web::Data<AppState>,
) -> ApiResult<HttpResponse> {
    let user_id = user_id.into_inner();
    info!("Resetting password for user: {}", user_id);

    let permission_checker = auth.permission_checker();
    let user_service = UserManagementService::new(app_state.db.clone());

    user_service
        .reset_password(user_id, &body.new_password, &permission_checker)
        .await
        .map_err(|e| {
            error!("Failed to reset password: {}", e);
            match e {
                pytake_core::errors::CoreError::NotFound(_) => ApiError::not_found("User not found"),
                pytake_core::errors::CoreError::Unauthorized(_) => ApiError::forbidden(&e.to_string()),
                _ => ApiError::internal(&e.to_string()),
            }
        })?;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "message": "Password reset successfully"
    })))
}

/// Get current user
pub async fn get_current_user(
    auth: AuthContext,
    app_state: web::Data<AppState>,
) -> ApiResult<HttpResponse> {
    info!("Getting current user: {}", auth.user_id);

    let user_id = Uuid::parse_str(&auth.user_id)
        .map_err(|_| ApiError::internal("Invalid user ID"))?;

    let permission_checker = auth.permission_checker();
    let user_service = UserManagementService::new(app_state.db.clone());

    let user = user_service
        .get_user(user_id, &permission_checker)
        .await
        .map_err(|e| {
            error!("Failed to get current user: {}", e);
            match e {
                pytake_core::errors::CoreError::NotFound(_) => ApiError::not_found("User not found"),
                _ => ApiError::internal(&e.to_string()),
            }
        })?;

    let response = UserResponse {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role.as_str().to_string(),
        is_active: user.is_active,
        organization_id: user.organization_id,
        last_login_at: user.last_login_at,
        created_at: user.created_at,
    };

    Ok(HttpResponse::Ok().json(response))
}

#[cfg(test)]
mod tests {
    use super::*;
    use actix_web::test;

    #[actix_web::test]
    async fn test_list_users_query_params() {
        let query = ListUsersQuery {
            page: Some(2),
            page_size: Some(50),
            include_inactive: Some(true),
            role: Some("admin".to_string()),
        };

        assert_eq!(query.page.unwrap(), 2);
        assert_eq!(query.page_size.unwrap(), 50);
        assert!(query.include_inactive.unwrap());
        assert_eq!(query.role.unwrap(), "admin");
    }
}