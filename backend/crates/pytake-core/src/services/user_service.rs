//! User business logic and domain services

use crate::entities::user::{User, UserRole, UserStatus};
use crate::entities::common::EntityId;
use crate::entities::{Entity, Validatable};
use crate::errors::{CoreError, CoreResult};
use crate::services::{DomainService, ValidatingService};
use async_trait::async_trait;

/// User domain service
#[derive(Debug, Default)]
pub struct UserService;

impl UserService {
    /// Create a new user service instance
    pub fn new() -> Self {
        Self
    }

    /// Create a new user with validation
    pub async fn create_user(&self, email: String, name: String) -> CoreResult<User> {
        // Create user entity
        let user = User::new(email, name);
        
        // Validate the user
        self.validate(&user).await?;
        
        Ok(user)
    }

    /// Update user information with validation
    pub async fn update_user(
        &self,
        mut user: User,
        name: Option<String>,
        role: Option<UserRole>,
        status: Option<UserStatus>,
    ) -> CoreResult<User> {
        // Update the user
        user.update(name, role, status);
        
        // Validate the updated user
        self.validate(&user).await?;
        
        Ok(user)
    }

    /// Check if a user can perform admin actions
    pub fn can_perform_admin_actions(&self, user: &User) -> bool {
        user.is_admin() && user.is_active()
    }

    /// Check if a user can access a resource owned by another user
    pub fn can_access_user_resource(&self, requesting_user: &User, resource_owner_id: &EntityId) -> bool {
        // User can access their own resources
        if requesting_user.id() == resource_owner_id {
            return true;
        }
        
        // Admin users can access any resource
        if self.can_perform_admin_actions(requesting_user) {
            return true;
        }
        
        false
    }

    /// Deactivate a user (soft delete)
    pub async fn deactivate_user(&self, mut user: User) -> CoreResult<User> {
        if !user.is_active() {
            return Err(CoreError::business_rule("User is already inactive"));
        }
        
        user.update(None, None, Some(UserStatus::Inactive));
        
        Ok(user)
    }

    /// Activate a user
    pub async fn activate_user(&self, mut user: User) -> CoreResult<User> {
        if user.is_active() {
            return Err(CoreError::business_rule("User is already active"));
        }
        
        user.update(None, None, Some(UserStatus::Active));
        
        Ok(user)
    }

    /// Suspend a user
    pub async fn suspend_user(&self, mut user: User, _reason: String) -> CoreResult<User> {
        if user.status == UserStatus::Suspended {
            return Err(CoreError::business_rule("User is already suspended"));
        }
        
        user.update(None, None, Some(UserStatus::Suspended));
        
        Ok(user)
    }

    /// Promote user to admin
    pub async fn promote_to_admin(&self, mut user: User) -> CoreResult<User> {
        if user.is_admin() {
            return Err(CoreError::business_rule("User is already an admin"));
        }
        
        if !user.is_active() {
            return Err(CoreError::business_rule("Cannot promote inactive user to admin"));
        }
        
        user.update(None, Some(UserRole::Admin), None);
        
        Ok(user)
    }

    /// Demote admin to regular user
    pub async fn demote_from_admin(&self, mut user: User) -> CoreResult<User> {
        if !user.is_admin() {
            return Err(CoreError::business_rule("User is not an admin"));
        }
        
        user.update(None, Some(UserRole::User), None);
        
        Ok(user)
    }

    /// Validate email format (additional business rules beyond basic validation)
    pub fn validate_email_business_rules(&self, email: &str) -> CoreResult<()> {
        // Check for blocked domains (example business rule)
        let blocked_domains = vec!["tempmail.com", "10minutemail.com"];
        
        if let Some(domain) = email.split('@').nth(1) {
            if blocked_domains.contains(&domain.to_lowercase().as_str()) {
                return Err(CoreError::business_rule(
                    "Email domain is not allowed"
                ));
            }
        }
        
        // Check minimum email length
        if email.len() < 5 {
            return Err(CoreError::business_rule(
                "Email must be at least 5 characters long"
            ));
        }
        
        Ok(())
    }

    /// Validate name format (additional business rules)
    pub fn validate_name_business_rules(&self, name: &str) -> CoreResult<()> {
        // Check for profanity or inappropriate content (simplified example)
        let blocked_words = vec!["admin", "system", "root"];
        let name_lower = name.to_lowercase();
        
        for blocked_word in blocked_words {
            if name_lower.contains(blocked_word) {
                return Err(CoreError::business_rule(
                    format!("Name cannot contain '{}'", blocked_word)
                ));
            }
        }
        
        // Check for minimum meaningful length
        if name.trim().len() < 2 {
            return Err(CoreError::business_rule(
                "Name must be at least 2 characters long"
            ));
        }
        
        Ok(())
    }
}

impl DomainService for UserService {
    fn service_name(&self) -> &'static str {
        "UserService"
    }
}

#[async_trait]
impl ValidatingService for UserService {
    type Entity = User;
    type Error = CoreError;
    
    async fn validate(&self, user: &Self::Entity) -> Result<(), Self::Error> {
        // First run the entity's built-in validation
        user.validate()?;
        
        // Then run business-specific validation rules
        self.validate_email_business_rules(&user.email)?;
        self.validate_name_business_rules(&user.name)?;
        
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_create_user() {
        let service = UserService::new();
        let result = service.create_user(
            "test@example.com".to_string(),
            "Test User".to_string(),
        ).await;
        
        assert!(result.is_ok());
        let user = result.unwrap();
        assert_eq!(user.email, "test@example.com");
        assert_eq!(user.name, "Test User");
        assert!(user.is_active());
    }

    #[tokio::test]
    async fn test_create_user_with_blocked_domain() {
        let service = UserService::new();
        let result = service.create_user(
            "test@tempmail.com".to_string(),
            "Test User".to_string(),
        ).await;
        
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), CoreError::BusinessRuleViolation(_)));
    }

    #[tokio::test]
    async fn test_create_user_with_blocked_name() {
        let service = UserService::new();
        let result = service.create_user(
            "test@example.com".to_string(),
            "admin".to_string(),
        ).await;
        
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), CoreError::BusinessRuleViolation(_)));
    }

    #[tokio::test]
    async fn test_user_permissions() {
        let service = UserService::new();
        
        // Create regular user
        let user = service.create_user(
            "user@example.com".to_string(),
            "Regular User".to_string(),
        ).await.unwrap();
        
        // Create admin user  
        let admin = service.create_user(
            "manager@example.com".to_string(),
            "Manager User".to_string(),
        ).await.unwrap();
        let admin = service.promote_to_admin(admin).await.unwrap();
        
        // Test permissions
        assert!(!service.can_perform_admin_actions(&user));
        assert!(service.can_perform_admin_actions(&admin));
        
        // Test resource access
        assert!(service.can_access_user_resource(&user, user.id()));
        assert!(!service.can_access_user_resource(&user, admin.id()));
        assert!(service.can_access_user_resource(&admin, user.id()));
    }

    #[tokio::test]
    async fn test_user_status_transitions() {
        let service = UserService::new();
        let user = service.create_user(
            "test@example.com".to_string(),
            "Test User".to_string(),
        ).await.unwrap();
        
        // Test deactivation
        let user = service.deactivate_user(user).await.unwrap();
        assert!(!user.is_active());
        
        // Test activation
        let user = service.activate_user(user).await.unwrap();
        assert!(user.is_active());
        
        // Test suspension
        let user = service.suspend_user(user, "Test reason".to_string()).await.unwrap();
        assert_eq!(user.status, UserStatus::Suspended);
    }

    #[tokio::test]
    async fn test_admin_promotion_demotion() {
        let service = UserService::new();
        let user = service.create_user(
            "test@example.com".to_string(),
            "Test User".to_string(),
        ).await.unwrap();
        
        // Test promotion
        let user = service.promote_to_admin(user).await.unwrap();
        assert!(user.is_admin());
        
        // Test demotion
        let user = service.demote_from_admin(user).await.unwrap();
        assert!(!user.is_admin());
    }
}