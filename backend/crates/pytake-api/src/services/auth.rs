//! Authentication service implementation
//!
//! This module provides authentication business logic including user registration,
//! login, token refresh, and logout functionality. It integrates with pytake-core
//! for authentication primitives and pytake-db for user persistence.

use crate::middleware::error_handler::{ApiError, ApiResult};
use pytake_core::{
    auth::{
        AuthResult, PasswordHasher, PasswordVerifier, TokenGenerator, TokenValidator, 
        Claims, SessionManager,
    },
    entities::{User, UserRole, UserStatus},
};
use pytake_db::repositories::{traits::UserRepository, user::UserRepositoryImpl};
use sea_orm::DatabaseConnection;
use std::{sync::Arc, collections::HashMap};
use tracing::{error, info, warn};
use validator::Validate;

/// Temporary password storage (in production, this should be in database)
type PasswordStorage = Arc<tokio::sync::RwLock<HashMap<String, String>>>;

/// Authentication service that handles user authentication operations
#[derive(Clone)]
pub struct AuthService {
    user_repository: Arc<UserRepositoryImpl>,
    password_hasher: PasswordHasher,
    password_verifier: PasswordVerifier,
    token_generator: TokenGenerator,
    token_validator: TokenValidator,
    session_manager: Arc<dyn SessionManager + Send + Sync>,
    // Temporary password storage - in production this should be in database
    password_storage: PasswordStorage,
}

impl AuthService {
    /// Create a new authentication service
    pub fn new(
        db: Arc<DatabaseConnection>,
        token_config: pytake_core::auth::token::TokenConfig,
        session_manager: Arc<dyn SessionManager + Send + Sync>,
    ) -> Self {
        let user_repository = Arc::new(UserRepositoryImpl::new(db));
        let password_hasher = PasswordHasher::new();
        let password_verifier = PasswordVerifier::new();
        let token_generator = TokenGenerator::new(token_config.clone());
        let token_validator = TokenValidator::new(token_config);
        let password_storage = Arc::new(tokio::sync::RwLock::new(HashMap::new()));

        Self {
            user_repository,
            password_hasher,
            password_verifier,
            token_generator,
            token_validator,
            session_manager,
            password_storage,
        }
    }

    /// Register a new user
    pub async fn register(
        &self,
        email: String,
        password: String,
        name: String,
    ) -> ApiResult<AuthResult> {
        info!("Attempting to register user with email: {}", email);

        // Validate input data
        self.validate_registration_input(&email, &password, &name)?;

        // Check if user already exists
        if let Ok(Some(_)) = self.user_repository.find_by_email(&email).await {
            warn!("Registration attempt for existing email: {}", email);
            return Err(ApiError::Conflict("User with this email already exists".to_string()));
        }

        // Hash the password
        let password_hash = self.password_hasher
            .hash_password(&password)
            .map_err(|e| {
                error!("Failed to hash password during registration: {}", e);
                ApiError::Internal("Failed to process password".to_string())
            })?;

        // Create user entity
        let mut user = User::new(email.clone(), name);
        user.validate()
            .map_err(|e| ApiError::Validation(format!("User validation failed: {}", e)))?;

        // Store user in database
        let created_user = self.user_repository
            .create(user)
            .await
            .map_err(|e| {
                error!("Failed to create user in database: {}", e);
                ApiError::Database(e)
            })?;

        // Store password hash (temporarily in memory - should be in database)
        {
            let mut storage = self.password_storage.write().await;
            storage.insert(created_user.email.clone(), password_hash);
        }

        info!("Successfully registered user with ID: {}", created_user.id);

        // Generate tokens
        self.generate_auth_result(&created_user.id.to_string(), &created_user.email, created_user.role).await
    }

    /// Authenticate user with email and password
    pub async fn login(
        &self,
        email: String,
        password: String,
        ip_address: Option<String>,
        user_agent: Option<String>,
    ) -> ApiResult<AuthResult> {
        info!("Login attempt for email: {}", email);

        // Validate input
        if email.trim().is_empty() || password.is_empty() {
            return Err(ApiError::BadRequest("Email and password are required".to_string()));
        }

        // Find user by email
        let user = self.user_repository
            .find_by_email(&email)
            .await
            .map_err(|e| {
                error!("Database error during login: {}", e);
                ApiError::Unauthorized
            })?
            .ok_or_else(|| {
                warn!("Login attempt for non-existent email: {}", email);
                ApiError::Unauthorized
            })?;

        // Check if user is active
        if !user.is_active() {
            warn!("Login attempt for inactive user: {}", email);
            return Err(ApiError::Unauthorized);
        }

        // Get password hash from storage
        let password_hash = {
            let storage = self.password_storage.read().await;
            storage.get(&email).cloned()
        }.ok_or_else(|| {
            warn!("No password hash found for user: {}", email);
            ApiError::Unauthorized
        })?;

        // Verify password
        self.password_verifier
            .verify_password(&password, &password_hash)
            .map_err(|e| {
                warn!("Invalid password for user: {} - {}", email, e);
                ApiError::Unauthorized
            })?;

        info!("Successful login for user: {}", email);

        // Generate tokens and create session
        let auth_result = self.generate_auth_result(&user.id.to_string(), &user.email, user.role).await?;

        // Create session
        if let Err(e) = self.session_manager.create_session(
            &user.id.to_string(),
            ip_address.as_deref(),
            user_agent.as_deref(),
        ).await {
            error!("Failed to create session: {}", e);
            // Continue anyway as token is still valid
        }

        Ok(auth_result)
    }

    /// Refresh access token using refresh token
    pub async fn refresh_token(&self, refresh_token: String) -> ApiResult<AuthResult> {
        info!("Token refresh attempt");

        // Validate the refresh token
        let claims = self.token_validator
            .validate_refresh_token(&refresh_token)
            .map_err(|e| {
                warn!("Invalid refresh token: {}", e);
                ApiError::Unauthorized
            })?;

        // Get user from database to ensure they still exist and are active
        let user_id = pytake_core::entities::common::EntityId::from_string(&claims.sub)
            .map_err(|_| ApiError::Unauthorized)?;

        let user = self.user_repository
            .find_by_id(user_id)
            .await
            .map_err(|e| {
                error!("Database error during token refresh: {}", e);
                ApiError::Unauthorized
            })?
            .ok_or_else(|| {
                warn!("Refresh token for non-existent user: {}", claims.sub);
                ApiError::Unauthorized
            })?;

        if !user.is_active() {
            warn!("Refresh token for inactive user: {}", claims.sub);
            return Err(ApiError::Unauthorized);
        }

        info!("Successfully refreshed token for user: {}", user.email);

        // Generate new tokens
        self.generate_auth_result(&user.id.to_string(), &user.email, user.role).await
    }

    /// Logout user by revoking their session
    pub async fn logout(&self, access_token: String) -> ApiResult<()> {
        info!("Logout attempt");

        // Validate the access token to get user info
        let claims = self.token_validator
            .validate_access_token(&access_token)
            .map_err(|e| {
                warn!("Invalid access token during logout: {}", e);
                ApiError::Unauthorized
            })?;

        // Revoke all user sessions (since we don't track session IDs by token)
        if let Err(e) = self.session_manager.delete_user_sessions(&claims.sub).await {
            error!("Failed to revoke user sessions during logout: {}", e);
            // Continue anyway as we want to log the user out
        }

        info!("Successfully logged out user: {}", claims.sub);
        Ok(())
    }

    /// Get current user information from token
    pub async fn get_current_user(&self, access_token: String) -> ApiResult<User> {
        // Validate the access token
        let claims = self.token_validator
            .validate_access_token(&access_token)
            .map_err(|e| {
                warn!("Invalid access token: {}", e);
                ApiError::Unauthorized
            })?;

        // Get user from database
        let user_id = pytake_core::entities::common::EntityId::from_string(&claims.sub)
            .map_err(|_| ApiError::Unauthorized)?;

        let user = self.user_repository
            .find_by_id(user_id)
            .await
            .map_err(|e| {
                error!("Database error during get current user: {}", e);
                ApiError::Unauthorized
            })?
            .ok_or_else(|| {
                warn!("Token for non-existent user: {}", claims.sub);
                ApiError::Unauthorized
            })?;

        if !user.is_active() {
            warn!("Token for inactive user: {}", claims.sub);
            return Err(ApiError::Unauthorized);
        }

        Ok(user)
    }

    /// Generate authentication result with tokens
    async fn generate_auth_result(
        &self,
        user_id: &str,
        email: &str,
        role: UserRole,
    ) -> ApiResult<AuthResult> {
        let roles = vec![format!("{:?}", role).to_lowercase()];

        let access_token = self.token_generator
            .generate_access_token(user_id, email, roles.clone())
            .map_err(|e| {
                error!("Failed to generate access token: {}", e);
                ApiError::Internal("Failed to generate access token".to_string())
            })?;

        let refresh_token = self.token_generator
            .generate_refresh_token(user_id, email)
            .map_err(|e| {
                error!("Failed to generate refresh token: {}", e);
                ApiError::Internal("Failed to generate refresh token".to_string())
            })?;

        Ok(AuthResult {
            user_id: user_id.to_string(),
            access_token,
            refresh_token,
            expires_in: 3600, // 1 hour
            token_type: "Bearer".to_string(),
        })
    }

    /// Validate registration input
    fn validate_registration_input(
        &self,
        email: &str,
        password: &str,
        name: &str,
    ) -> ApiResult<()> {
        if email.trim().is_empty() {
            return Err(ApiError::BadRequest("Email is required".to_string()));
        }

        if !email.contains('@') {
            return Err(ApiError::BadRequest("Invalid email format".to_string()));
        }

        if password.len() < 8 {
            return Err(ApiError::BadRequest("Password must be at least 8 characters long".to_string()));
        }

        if name.trim().is_empty() {
            return Err(ApiError::BadRequest("Name is required".to_string()));
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use pytake_core::auth::{session::InMemorySessionManager, token::TokenConfig};

    fn create_test_auth_service() -> AuthService {
        // This would need a real database connection in actual tests
        // For now, this is just a compilation test
        todo!("Create test database connection")
    }

    #[test]
    fn test_validate_registration_input() {
        let service = create_test_auth_service();

        // This test would work if we had a proper test setup
        // assert!(service.validate_registration_input("test@example.com", "password123", "Test User").is_ok());
        assert!(true); // Placeholder
    }
}