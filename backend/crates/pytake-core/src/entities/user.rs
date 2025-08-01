//! User domain entities

use super::common::{EntityId, Timestamp};
use super::{Entity, Timestamped, Validatable};
use crate::errors::CoreError;
use serde::{Deserialize, Serialize};
use validator::Validate;

/// User entity representing a system user
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Validate)]
pub struct User {
    pub id: EntityId,
    
    #[validate(email(message = "Invalid email format"))]
    pub email: String,
    
    #[validate(length(min = 1, max = 100, message = "Name must be between 1 and 100 characters"))]
    pub name: String,
    
    pub role: UserRole,
    pub status: UserStatus,
    pub created_at: Timestamp,
    pub updated_at: Timestamp,
}

/// User roles in the system
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum UserRole {
    Admin,
    User,
}

/// User account status
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum UserStatus {
    Active,
    Inactive,
    Suspended,
}

impl User {
    /// Create a new user
    pub fn new(email: String, name: String) -> Self {
        let now = Timestamp::now();
        
        Self {
            id: EntityId::new(),
            email,
            name,
            role: UserRole::User,
            status: UserStatus::Active,
            created_at: now,
            updated_at: now,
        }
    }

    /// Update user information
    pub fn update(&mut self, name: Option<String>, role: Option<UserRole>, status: Option<UserStatus>) {
        if let Some(name) = name {
            self.name = name;
        }
        
        if let Some(role) = role {
            self.role = role;
        }
        
        if let Some(status) = status {
            self.status = status;
        }
        
        self.updated_at = Timestamp::now();
    }

    /// Check if user is active
    pub fn is_active(&self) -> bool {
        self.status == UserStatus::Active
    }

    /// Check if user is admin
    pub fn is_admin(&self) -> bool {
        self.role == UserRole::Admin
    }
}

impl Entity for User {
    type Id = EntityId;
    
    fn id(&self) -> &Self::Id {
        &self.id
    }
}

impl Timestamped for User {
    fn created_at(&self) -> &Timestamp {
        &self.created_at
    }
    
    fn updated_at(&self) -> &Timestamp {
        &self.updated_at
    }
}

impl Validatable for User {
    type Error = CoreError;
    
    fn validate(&self) -> Result<(), Self::Error> {
        use validator::Validate;
        Validate::validate(self)
            .map_err(|e| CoreError::ValidationError(format!("User validation failed: {}", e)))
    }
}

impl Default for UserRole {
    fn default() -> Self {
        UserRole::User
    }
}

impl Default for UserStatus {
    fn default() -> Self {
        UserStatus::Active
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_user_creation() {
        let user = User::new("test@example.com".to_string(), "Test User".to_string());
        
        assert_eq!(user.email, "test@example.com");
        assert_eq!(user.name, "Test User");
        assert_eq!(user.role, UserRole::User);
        assert_eq!(user.status, UserStatus::Active);
        assert!(user.is_active());
        assert!(!user.is_admin());
    }

    #[test]
    fn test_user_update() {
        let mut user = User::new("test@example.com".to_string(), "Test User".to_string());
        let original_updated_at = user.updated_at;
        
        // Small delay to ensure timestamp changes
        std::thread::sleep(std::time::Duration::from_millis(1));
        
        user.update(
            Some("Updated User".to_string()),
            Some(UserRole::Admin),
            Some(UserStatus::Inactive),
        );
        
        assert_eq!(user.name, "Updated User");
        assert_eq!(user.role, UserRole::Admin);
        assert_eq!(user.status, UserStatus::Inactive);
        assert!(user.updated_at.as_datetime() > original_updated_at.as_datetime());
        assert!(user.is_admin());
        assert!(!user.is_active());
    }
}