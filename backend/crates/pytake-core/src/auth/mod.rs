//! Authentication and authorization module
//!
//! This module provides core authentication functionality including:
//! - Password hashing and verification
//! - JWT token generation and validation
//! - Role-based access control (RBAC)
//! - Session management

pub mod password;
pub mod token;
pub mod rbac;
pub mod session;

pub use password::{PasswordHasher, PasswordVerifier, PasswordError};
pub use token::{TokenGenerator, TokenValidator, Claims, TokenError};
pub use rbac::{Role, Permission, RoleChecker, PermissionError};
pub use session::{Session, SessionManager, SessionError};

use serde::{Deserialize, Serialize};

/// Authentication result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthResult {
    pub user_id: String,
    pub access_token: String,
    pub refresh_token: String,
    pub expires_in: i64,
    pub token_type: String,
}

/// Authentication error types
#[derive(Debug, thiserror::Error)]
pub enum AuthError {
    #[error("Invalid credentials")]
    InvalidCredentials,
    
    #[error("Account is disabled")]
    AccountDisabled,
    
    #[error("Account is locked")]
    AccountLocked,
    
    #[error("Session expired")]
    SessionExpired,
    
    #[error("Invalid token")]
    InvalidToken,
    
    #[error("Insufficient permissions")]
    InsufficientPermissions,
    
    #[error("Password error: {0}")]
    Password(#[from] PasswordError),
    
    #[error("Token error: {0}")]
    Token(#[from] TokenError),
    
    #[error("Permission error: {0}")]
    Permission(#[from] PermissionError),
    
    #[error("Session error: {0}")]
    Session(#[from] SessionError),
    
    #[error("Internal error: {0}")]
    Internal(String),
}

/// Authentication context
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthContext {
    pub user_id: String,
    pub email: String,
    pub roles: Vec<Role>,
    pub permissions: Vec<Permission>,
    pub session_id: Option<String>,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
}

impl AuthContext {
    /// Check if the user has a specific role
    pub fn has_role(&self, role: &Role) -> bool {
        self.roles.contains(role)
    }
    
    /// Check if the user has a specific permission
    pub fn has_permission(&self, permission: &Permission) -> bool {
        self.permissions.contains(permission)
    }
    
    /// Check if the user has any of the specified roles
    pub fn has_any_role(&self, roles: &[Role]) -> bool {
        roles.iter().any(|role| self.has_role(role))
    }
    
    /// Check if the user has all of the specified permissions
    pub fn has_all_permissions(&self, permissions: &[Permission]) -> bool {
        permissions.iter().all(|perm| self.has_permission(perm))
    }
}

/// Authentication provider trait
#[async_trait::async_trait]
pub trait AuthProvider: Send + Sync {
    /// Authenticate a user with credentials
    async fn authenticate(
        &self,
        email: &str,
        password: &str,
    ) -> Result<AuthResult, AuthError>;
    
    /// Refresh an access token
    async fn refresh_token(
        &self,
        refresh_token: &str,
    ) -> Result<AuthResult, AuthError>;
    
    /// Revoke a token
    async fn revoke_token(&self, token: &str) -> Result<(), AuthError>;
    
    /// Get authentication context from token
    async fn get_context(&self, token: &str) -> Result<AuthContext, AuthError>;
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_auth_context_permissions() {
        let context = AuthContext {
            user_id: "user123".to_string(),
            email: "user@example.com".to_string(),
            roles: vec![Role::Admin],
            permissions: vec![Permission::UserRead, Permission::UserWrite],
            session_id: None,
            ip_address: None,
            user_agent: None,
        };
        
        assert!(context.has_role(&Role::Admin));
        assert!(!context.has_role(&Role::User));
        assert!(context.has_permission(&Permission::UserRead));
        assert!(!context.has_permission(&Permission::UserDelete));
    }
}