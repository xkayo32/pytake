//! Role-Based Access Control (RBAC) system
//!
//! This module provides role and permission management for the PyTake system.

use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::fmt;

/// User role
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Role {
    /// Super administrator with all permissions
    SuperAdmin,
    
    /// Administrator with most permissions
    Admin,
    
    /// Agent who can handle conversations
    Agent,
    
    /// Supervisor who can monitor agents
    Supervisor,
    
    /// Regular user with limited permissions
    User,
    
    /// Custom role with specific permissions
    Custom(String),
}

impl fmt::Display for Role {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Role::SuperAdmin => write!(f, "super_admin"),
            Role::Admin => write!(f, "admin"),
            Role::Agent => write!(f, "agent"),
            Role::Supervisor => write!(f, "supervisor"),
            Role::User => write!(f, "user"),
            Role::Custom(name) => write!(f, "custom:{}", name),
        }
    }
}

/// System permission
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Permission {
    // User permissions
    UserRead,
    UserWrite,
    UserDelete,
    UserManageRoles,
    
    // Flow permissions
    FlowRead,
    FlowWrite,
    FlowDelete,
    FlowExecute,
    FlowPublish,
    
    // Conversation permissions
    ConversationRead,
    ConversationWrite,
    ConversationAssign,
    ConversationClose,
    
    // Message permissions
    MessageRead,
    MessageSend,
    MessageDelete,
    
    // Webhook permissions
    WebhookRead,
    WebhookWrite,
    WebhookDelete,
    
    // System permissions
    SystemConfig,
    SystemMonitor,
    SystemBackup,
    
    // Analytics permissions
    AnalyticsRead,
    AnalyticsExport,
    
    // Custom permission
    Custom(String),
}

impl fmt::Display for Permission {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Permission::UserRead => write!(f, "user:read"),
            Permission::UserWrite => write!(f, "user:write"),
            Permission::UserDelete => write!(f, "user:delete"),
            Permission::UserManageRoles => write!(f, "user:manage_roles"),
            Permission::FlowRead => write!(f, "flow:read"),
            Permission::FlowWrite => write!(f, "flow:write"),
            Permission::FlowDelete => write!(f, "flow:delete"),
            Permission::FlowExecute => write!(f, "flow:execute"),
            Permission::FlowPublish => write!(f, "flow:publish"),
            Permission::ConversationRead => write!(f, "conversation:read"),
            Permission::ConversationWrite => write!(f, "conversation:write"),
            Permission::ConversationAssign => write!(f, "conversation:assign"),
            Permission::ConversationClose => write!(f, "conversation:close"),
            Permission::MessageRead => write!(f, "message:read"),
            Permission::MessageSend => write!(f, "message:send"),
            Permission::MessageDelete => write!(f, "message:delete"),
            Permission::WebhookRead => write!(f, "webhook:read"),
            Permission::WebhookWrite => write!(f, "webhook:write"),
            Permission::WebhookDelete => write!(f, "webhook:delete"),
            Permission::SystemConfig => write!(f, "system:config"),
            Permission::SystemMonitor => write!(f, "system:monitor"),
            Permission::SystemBackup => write!(f, "system:backup"),
            Permission::AnalyticsRead => write!(f, "analytics:read"),
            Permission::AnalyticsExport => write!(f, "analytics:export"),
            Permission::Custom(name) => write!(f, "custom:{}", name),
        }
    }
}

/// Role-permission mapping
pub struct RolePermissions {
    mappings: HashMap<Role, HashSet<Permission>>,
}

impl RolePermissions {
    /// Create default role-permission mappings
    pub fn default_mappings() -> Self {
        let mut mappings = HashMap::new();
        
        // SuperAdmin has all permissions
        let super_admin_perms: HashSet<Permission> = vec![
            Permission::UserRead,
            Permission::UserWrite,
            Permission::UserDelete,
            Permission::UserManageRoles,
            Permission::FlowRead,
            Permission::FlowWrite,
            Permission::FlowDelete,
            Permission::FlowExecute,
            Permission::FlowPublish,
            Permission::ConversationRead,
            Permission::ConversationWrite,
            Permission::ConversationAssign,
            Permission::ConversationClose,
            Permission::MessageRead,
            Permission::MessageSend,
            Permission::MessageDelete,
            Permission::WebhookRead,
            Permission::WebhookWrite,
            Permission::WebhookDelete,
            Permission::SystemConfig,
            Permission::SystemMonitor,
            Permission::SystemBackup,
            Permission::AnalyticsRead,
            Permission::AnalyticsExport,
        ]
        .into_iter()
        .collect();
        mappings.insert(Role::SuperAdmin, super_admin_perms);
        
        // Admin has most permissions except system-critical ones
        let admin_perms: HashSet<Permission> = vec![
            Permission::UserRead,
            Permission::UserWrite,
            Permission::UserDelete,
            Permission::FlowRead,
            Permission::FlowWrite,
            Permission::FlowDelete,
            Permission::FlowExecute,
            Permission::FlowPublish,
            Permission::ConversationRead,
            Permission::ConversationWrite,
            Permission::ConversationAssign,
            Permission::ConversationClose,
            Permission::MessageRead,
            Permission::MessageSend,
            Permission::MessageDelete,
            Permission::WebhookRead,
            Permission::WebhookWrite,
            Permission::SystemMonitor,
            Permission::AnalyticsRead,
            Permission::AnalyticsExport,
        ]
        .into_iter()
        .collect();
        mappings.insert(Role::Admin, admin_perms);
        
        // Supervisor can monitor and manage conversations
        let supervisor_perms: HashSet<Permission> = vec![
            Permission::UserRead,
            Permission::FlowRead,
            Permission::ConversationRead,
            Permission::ConversationWrite,
            Permission::ConversationAssign,
            Permission::ConversationClose,
            Permission::MessageRead,
            Permission::MessageSend,
            Permission::AnalyticsRead,
        ]
        .into_iter()
        .collect();
        mappings.insert(Role::Supervisor, supervisor_perms);
        
        // Agent can handle conversations
        let agent_perms: HashSet<Permission> = vec![
            Permission::ConversationRead,
            Permission::ConversationWrite,
            Permission::MessageRead,
            Permission::MessageSend,
            Permission::FlowRead,
            Permission::FlowExecute,
        ]
        .into_iter()
        .collect();
        mappings.insert(Role::Agent, agent_perms);
        
        // User has minimal permissions
        let user_perms: HashSet<Permission> = vec![
            Permission::ConversationRead,
            Permission::MessageRead,
            Permission::MessageSend,
        ]
        .into_iter()
        .collect();
        mappings.insert(Role::User, user_perms);
        
        Self { mappings }
    }
    
    /// Get permissions for a role
    pub fn get_permissions(&self, role: &Role) -> Option<&HashSet<Permission>> {
        self.mappings.get(role)
    }
    
    /// Add a custom role with permissions
    pub fn add_role(&mut self, role: Role, permissions: HashSet<Permission>) {
        self.mappings.insert(role, permissions);
    }
    
    /// Check if a role has a specific permission
    pub fn role_has_permission(&self, role: &Role, permission: &Permission) -> bool {
        self.mappings
            .get(role)
            .map(|perms| perms.contains(permission))
            .unwrap_or(false)
    }
}

impl Default for RolePermissions {
    fn default() -> Self {
        Self::default_mappings()
    }
}

/// Role checker for authorization
pub struct RoleChecker {
    role_permissions: RolePermissions,
}

impl RoleChecker {
    /// Create a new role checker with default mappings
    pub fn new() -> Self {
        Self {
            role_permissions: RolePermissions::default(),
        }
    }
    
    /// Create a role checker with custom mappings
    pub fn with_mappings(role_permissions: RolePermissions) -> Self {
        Self { role_permissions }
    }
    
    /// Check if a set of roles has a specific permission
    pub fn check_permission(
        &self,
        roles: &[Role],
        permission: &Permission,
    ) -> Result<(), PermissionError> {
        for role in roles {
            if self.role_permissions.role_has_permission(role, permission) {
                return Ok(());
            }
        }
        
        Err(PermissionError::InsufficientPermissions {
            required: permission.to_string(),
            roles: roles.iter().map(|r| r.to_string()).collect(),
        })
    }
    
    /// Check if a set of roles has all specified permissions
    pub fn check_all_permissions(
        &self,
        roles: &[Role],
        permissions: &[Permission],
    ) -> Result<(), PermissionError> {
        for permission in permissions {
            self.check_permission(roles, permission)?;
        }
        Ok(())
    }
    
    /// Check if a set of roles has any of the specified permissions
    pub fn check_any_permission(
        &self,
        roles: &[Role],
        permissions: &[Permission],
    ) -> Result<(), PermissionError> {
        for permission in permissions {
            if self.check_permission(roles, permission).is_ok() {
                return Ok(());
            }
        }
        
        Err(PermissionError::InsufficientPermissions {
            required: permissions.iter().map(|p| p.to_string()).collect::<Vec<_>>().join(" OR "),
            roles: roles.iter().map(|r| r.to_string()).collect(),
        })
    }
    
    /// Get all permissions for a set of roles
    pub fn get_all_permissions(&self, roles: &[Role]) -> HashSet<Permission> {
        let mut all_permissions = HashSet::new();
        
        for role in roles {
            if let Some(permissions) = self.role_permissions.get_permissions(role) {
                all_permissions.extend(permissions.clone());
            }
        }
        
        all_permissions
    }
}

impl Default for RoleChecker {
    fn default() -> Self {
        Self::new()
    }
}

/// Permission-related errors
#[derive(Debug, thiserror::Error)]
pub enum PermissionError {
    #[error("Insufficient permissions: required {required}, user has roles {roles:?}")]
    InsufficientPermissions {
        required: String,
        roles: Vec<String>,
    },
    
    #[error("Role not found: {0}")]
    RoleNotFound(String),
    
    #[error("Permission not found: {0}")]
    PermissionNotFound(String),
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_role_permissions() {
        let role_perms = RolePermissions::default_mappings();
        
        // SuperAdmin should have UserDelete permission
        assert!(role_perms.role_has_permission(&Role::SuperAdmin, &Permission::UserDelete));
        
        // Agent should not have UserDelete permission
        assert!(!role_perms.role_has_permission(&Role::Agent, &Permission::UserDelete));
        
        // Agent should have MessageSend permission
        assert!(role_perms.role_has_permission(&Role::Agent, &Permission::MessageSend));
    }
    
    #[test]
    fn test_role_checker() {
        let checker = RoleChecker::new();
        
        // Admin should be able to delete users
        assert!(checker
            .check_permission(&[Role::Admin], &Permission::UserDelete)
            .is_ok());
        
        // Agent should not be able to delete users
        assert!(checker
            .check_permission(&[Role::Agent], &Permission::UserDelete)
            .is_err());
        
        // User with multiple roles
        assert!(checker
            .check_permission(&[Role::User, Role::Admin], &Permission::UserDelete)
            .is_ok());
    }
    
    #[test]
    fn test_get_all_permissions() {
        let checker = RoleChecker::new();
        
        let permissions = checker.get_all_permissions(&[Role::Agent, Role::User]);
        
        // Should have permissions from both roles
        assert!(permissions.contains(&Permission::MessageSend));
        assert!(permissions.contains(&Permission::FlowExecute)); // From Agent
        assert!(permissions.contains(&Permission::ConversationRead)); // From both
    }
}