//! User management service for multi-user support

use crate::{
    auth::permissions::{Permission, PermissionChecker, Role},
    errors::{CoreError, CoreResult},
};
// Temporarily commented out to fix compilation
// use pytake_db::{
//     repositories::user_repository::UserRepository,
//     entities::user::Model as UserModel,
// };

// Temporary types for compilation
pub struct UserRepository;
pub struct UserModel;
use sea_orm::DatabaseConnection;
use std::sync::Arc;
use uuid::Uuid;
use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};

/// User management service
pub struct UserManagementService {
    db: Arc<DatabaseConnection>,
    user_repo: UserRepository,
}

/// User creation input
#[derive(Debug, Clone)]
pub struct CreateUserInput {
    pub email: String,
    pub name: String,
    pub password: String,
    pub role: Role,
    pub organization_id: Uuid,
}

/// User update input
#[derive(Debug, Clone)]
pub struct UpdateUserInput {
    pub name: Option<String>,
    pub role: Option<Role>,
    pub is_active: Option<bool>,
}

/// User with role information
#[derive(Debug, Clone)]
pub struct UserWithRole {
    pub id: Uuid,
    pub email: String,
    pub name: String,
    pub role: Role,
    pub is_active: bool,
    pub organization_id: Uuid,
    pub last_login_at: Option<chrono::DateTime<chrono::Utc>>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

impl From<UserModel> for UserWithRole {
    fn from(user: UserModel) -> Self {
        let role = Role::from_str(&user.role).unwrap_or(Role::Viewer);
        
        Self {
            id: user.id,
            email: user.email,
            name: user.name,
            role,
            is_active: user.is_active,
            organization_id: user.organization_id,
            last_login_at: user.last_login_at,
            created_at: user.created_at,
        }
    }
}

impl UserManagementService {
    /// Create a new user management service
    pub fn new(db: Arc<DatabaseConnection>) -> Self {
        let user_repo = UserRepository::new(db.as_ref().clone());
        
        Self { db, user_repo }
    }

    /// Create a new user
    pub async fn create_user(
        &self,
        input: CreateUserInput,
        created_by: &PermissionChecker,
    ) -> CoreResult<UserWithRole> {
        // Check permissions
        if !created_by.has_permission(Permission::CreateUsers) {
            return Err(CoreError::Unauthorized("Insufficient permissions to create users".to_string()));
        }

        // Validate role hierarchy - can't create users with higher roles
        if !self.can_manage_role(&input.role, created_by) {
            return Err(CoreError::Unauthorized("Cannot create users with this role".to_string()));
        }

        // Check if email already exists in organization
        if self.user_repo.email_exists_in_org(&input.email, input.organization_id).await? {
            return Err(CoreError::Validation("Email already exists in organization".to_string()));
        }

        // Hash password
        let password_hash = self.hash_password(&input.password)?;

        // Create user
        let user = self.user_repo.create(
            input.organization_id,
            input.email,
            input.name,
            password_hash,
            input.role.as_str().to_string(),
        ).await?;

        Ok(UserWithRole::from(user))
    }

    /// Update a user
    pub async fn update_user(
        &self,
        user_id: Uuid,
        input: UpdateUserInput,
        updated_by: &PermissionChecker,
    ) -> CoreResult<UserWithRole> {
        // Check permissions
        if !updated_by.has_permission(Permission::UpdateUsers) {
            return Err(CoreError::Unauthorized("Insufficient permissions to update users".to_string()));
        }

        // Get existing user
        let user = self.user_repo.get_by_id(user_id)
            .await?
            .ok_or_else(|| CoreError::NotFound("User not found".to_string()))?;

        // Check if updating role
        if let Some(new_role) = &input.role {
            let current_role = Role::from_str(&user.role).unwrap_or(Role::Viewer);
            
            // Can't change your own role
            if user_id == updated_by.get_role().as_str().parse::<Uuid>().unwrap_or_default() {
                return Err(CoreError::Validation("Cannot change your own role".to_string()));
            }

            // Check role hierarchy
            if !self.can_manage_role(new_role, updated_by) || !self.can_manage_role(&current_role, updated_by) {
                return Err(CoreError::Unauthorized("Cannot manage users with this role".to_string()));
            }
        }

        // Update user
        let updated_user = self.user_repo.update(
            user_id,
            input.name,
            input.role.map(|r| r.as_str().to_string()),
            input.is_active,
        ).await?;

        Ok(UserWithRole::from(updated_user))
    }

    /// Delete a user (soft delete)
    pub async fn delete_user(
        &self,
        user_id: Uuid,
        deleted_by: &PermissionChecker,
    ) -> CoreResult<()> {
        // Check permissions
        if !deleted_by.has_permission(Permission::DeleteUsers) {
            return Err(CoreError::Unauthorized("Insufficient permissions to delete users".to_string()));
        }

        // Get existing user
        let user = self.user_repo.get_by_id(user_id)
            .await?
            .ok_or_else(|| CoreError::NotFound("User not found".to_string()))?;

        let user_role = Role::from_str(&user.role).unwrap_or(Role::Viewer);

        // Can't delete yourself
        if user_id == deleted_by.get_role().as_str().parse::<Uuid>().unwrap_or_default() {
            return Err(CoreError::Validation("Cannot delete yourself".to_string()));
        }

        // Check role hierarchy
        if !self.can_manage_role(&user_role, deleted_by) {
            return Err(CoreError::Unauthorized("Cannot delete users with this role".to_string()));
        }

        self.user_repo.delete(user_id).await?;
        Ok(())
    }

    /// Get a user by ID
    pub async fn get_user(
        &self,
        user_id: Uuid,
        requested_by: &PermissionChecker,
    ) -> CoreResult<UserWithRole> {
        // Check permissions
        if !requested_by.has_permission(Permission::ViewUsers) {
            return Err(CoreError::Unauthorized("Insufficient permissions to view users".to_string()));
        }

        let user = self.user_repo.get_by_id(user_id)
            .await?
            .ok_or_else(|| CoreError::NotFound("User not found".to_string()))?;

        Ok(UserWithRole::from(user))
    }

    /// List users by organization
    pub async fn list_users(
        &self,
        organization_id: Uuid,
        page: u64,
        page_size: u64,
        include_inactive: bool,
        requested_by: &PermissionChecker,
    ) -> CoreResult<(Vec<UserWithRole>, u64)> {
        // Check permissions
        if !requested_by.has_permission(Permission::ViewUsers) {
            return Err(CoreError::Unauthorized("Insufficient permissions to view users".to_string()));
        }

        let (users, total) = self.user_repo.list_by_organization(
            organization_id,
            page,
            page_size,
            include_inactive,
        ).await?;

        let users_with_roles = users.into_iter()
            .map(UserWithRole::from)
            .collect();

        Ok((users_with_roles, total))
    }

    /// List users by role
    pub async fn list_users_by_role(
        &self,
        organization_id: Uuid,
        role: Role,
        requested_by: &PermissionChecker,
    ) -> CoreResult<Vec<UserWithRole>> {
        // Check permissions
        if !requested_by.has_permission(Permission::ViewUsers) {
            return Err(CoreError::Unauthorized("Insufficient permissions to view users".to_string()));
        }

        let users = self.user_repo.list_by_role(
            organization_id,
            role.as_str(),
        ).await?;

        let users_with_roles = users.into_iter()
            .map(UserWithRole::from)
            .collect();

        Ok(users_with_roles)
    }

    /// Verify user credentials
    pub async fn verify_credentials(
        &self,
        email: &str,
        password: &str,
        organization_id: Uuid,
    ) -> CoreResult<UserWithRole> {
        let user = self.user_repo.get_by_email_and_org(email, organization_id)
            .await?
            .ok_or_else(|| CoreError::Unauthorized("Invalid credentials".to_string()))?;

        if !user.is_active {
            return Err(CoreError::Unauthorized("User account is inactive".to_string()));
        }

        // Verify password
        if !self.verify_password(password, &user.password_hash)? {
            return Err(CoreError::Unauthorized("Invalid credentials".to_string()));
        }

        // Update last login
        self.user_repo.update_last_login(user.id).await?;

        Ok(UserWithRole::from(user))
    }

    /// Change user password
    pub async fn change_password(
        &self,
        user_id: Uuid,
        old_password: &str,
        new_password: &str,
    ) -> CoreResult<()> {
        let user = self.user_repo.get_by_id(user_id)
            .await?
            .ok_or_else(|| CoreError::NotFound("User not found".to_string()))?;

        // Verify old password
        if !self.verify_password(old_password, &user.password_hash)? {
            return Err(CoreError::Unauthorized("Invalid current password".to_string()));
        }

        // Hash new password
        let new_password_hash = self.hash_password(new_password)?;

        // Update password
        self.user_repo.update_password(user_id, new_password_hash).await?;

        Ok(())
    }

    /// Reset user password (admin action)
    pub async fn reset_password(
        &self,
        user_id: Uuid,
        new_password: &str,
        reset_by: &PermissionChecker,
    ) -> CoreResult<()> {
        // Check permissions
        if !reset_by.has_permission(Permission::UpdateUsers) {
            return Err(CoreError::Unauthorized("Insufficient permissions to reset passwords".to_string()));
        }

        // Get user to check role hierarchy
        let user = self.user_repo.get_by_id(user_id)
            .await?
            .ok_or_else(|| CoreError::NotFound("User not found".to_string()))?;

        let user_role = Role::from_str(&user.role).unwrap_or(Role::Viewer);

        // Check role hierarchy
        if !self.can_manage_role(&user_role, reset_by) {
            return Err(CoreError::Unauthorized("Cannot reset password for users with this role".to_string()));
        }

        // Hash new password
        let new_password_hash = self.hash_password(new_password)?;

        // Update password
        self.user_repo.update_password(user_id, new_password_hash).await?;

        Ok(())
    }

    /// Hash a password
    fn hash_password(&self, password: &str) -> CoreResult<String> {
        let salt = SaltString::generate(&mut OsRng);
        let argon2 = Argon2::default();
        
        let password_hash = argon2.hash_password(password.as_bytes(), &salt)
            .map_err(|e| CoreError::internal(format!("Failed to hash password: {}", e)))?;
        
        Ok(password_hash.to_string())
    }

    /// Verify a password against a hash
    fn verify_password(&self, password: &str, hash: &str) -> CoreResult<bool> {
        let parsed_hash = PasswordHash::new(hash)
            .map_err(|e| CoreError::internal(format!("Invalid password hash: {}", e)))?;
        
        let argon2 = Argon2::default();
        Ok(argon2.verify_password(password.as_bytes(), &parsed_hash).is_ok())
    }

    /// Check if a user can manage another user with a specific role
    fn can_manage_role(&self, target_role: &Role, manager: &PermissionChecker) -> bool {
        match manager.get_role() {
            Role::Admin => true, // Admin can manage all roles
            Role::Supervisor => matches!(target_role, Role::Agent | Role::Viewer), // Supervisor can manage Agent and Viewer
            _ => false, // Agent and Viewer can't manage other users
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use sea_orm::{Database, DatabaseBackend, MockDatabase};

    async fn create_mock_db() -> Arc<DatabaseConnection> {
        let db = MockDatabase::new(DatabaseBackend::Postgres)
            .into_connection();
        Arc::new(db)
    }

    #[tokio::test]
    async fn test_password_hashing() {
        let db = create_mock_db().await;
        let service = UserManagementService::new(db);

        let password = "test_password123";
        let hash = service.hash_password(password).unwrap();
        
        assert!(service.verify_password(password, &hash).unwrap());
        assert!(!service.verify_password("wrong_password", &hash).unwrap());
    }

    #[test]
    fn test_can_manage_role() {
        let db = tokio::runtime::Runtime::new().unwrap().block_on(create_mock_db());
        let service = UserManagementService::new(db);

        // Admin can manage all roles
        let admin_checker = PermissionChecker::new(Role::Admin);
        assert!(service.can_manage_role(&Role::Admin, &admin_checker));
        assert!(service.can_manage_role(&Role::Supervisor, &admin_checker));
        assert!(service.can_manage_role(&Role::Agent, &admin_checker));
        assert!(service.can_manage_role(&Role::Viewer, &admin_checker));

        // Supervisor can manage Agent and Viewer
        let supervisor_checker = PermissionChecker::new(Role::Supervisor);
        assert!(!service.can_manage_role(&Role::Admin, &supervisor_checker));
        assert!(!service.can_manage_role(&Role::Supervisor, &supervisor_checker));
        assert!(service.can_manage_role(&Role::Agent, &supervisor_checker));
        assert!(service.can_manage_role(&Role::Viewer, &supervisor_checker));

        // Agent can't manage anyone
        let agent_checker = PermissionChecker::new(Role::Agent);
        assert!(!service.can_manage_role(&Role::Admin, &agent_checker));
        assert!(!service.can_manage_role(&Role::Supervisor, &agent_checker));
        assert!(!service.can_manage_role(&Role::Agent, &agent_checker));
        assert!(!service.can_manage_role(&Role::Viewer, &agent_checker));
    }
}