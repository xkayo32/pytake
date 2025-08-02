use serde::{Deserialize, Serialize};
use std::collections::HashSet;

/// User roles in the system
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Role {
    Admin,
    Supervisor,
    Agent,
    Viewer,
}

impl Role {
    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "admin" => Some(Role::Admin),
            "supervisor" => Some(Role::Supervisor),
            "agent" => Some(Role::Agent),
            "viewer" => Some(Role::Viewer),
            _ => None,
        }
    }

    pub fn as_str(&self) -> &'static str {
        match self {
            Role::Admin => "admin",
            Role::Supervisor => "supervisor",
            Role::Agent => "agent",
            Role::Viewer => "viewer",
        }
    }

    /// Get all permissions for this role
    pub fn permissions(&self) -> HashSet<Permission> {
        match self {
            Role::Admin => Permission::all(),
            Role::Supervisor => Permission::supervisor_permissions(),
            Role::Agent => Permission::agent_permissions(),
            Role::Viewer => Permission::viewer_permissions(),
        }
    }

    /// Check if role has a specific permission
    pub fn has_permission(&self, permission: Permission) -> bool {
        self.permissions().contains(&permission)
    }
}

/// System permissions
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Permission {
    // User management
    ViewUsers,
    CreateUsers,
    UpdateUsers,
    DeleteUsers,
    
    // Conversation management
    ViewConversations,
    CreateConversations,
    UpdateConversations,
    DeleteConversations,
    AssignConversations,
    
    // Message management
    ViewMessages,
    SendMessages,
    DeleteMessages,
    
    // Contact management
    ViewContacts,
    CreateContacts,
    UpdateContacts,
    DeleteContacts,
    
    // Template management
    ViewTemplates,
    CreateTemplates,
    UpdateTemplates,
    DeleteTemplates,
    
    // Media management
    ViewMedia,
    UploadMedia,
    DeleteMedia,
    
    // Dashboard and reports
    ViewDashboard,
    ViewReports,
    ExportData,
    
    // Organization management
    ViewOrganization,
    UpdateOrganization,
    ManageIntegrations,
    
    // System administration
    ViewSystemSettings,
    UpdateSystemSettings,
    ViewAuditLogs,
    ManageWebhooks,
}

impl Permission {
    /// Get all permissions (for admin)
    pub fn all() -> HashSet<Permission> {
        use Permission::*;
        vec![
            ViewUsers, CreateUsers, UpdateUsers, DeleteUsers,
            ViewConversations, CreateConversations, UpdateConversations, DeleteConversations, AssignConversations,
            ViewMessages, SendMessages, DeleteMessages,
            ViewContacts, CreateContacts, UpdateContacts, DeleteContacts,
            ViewTemplates, CreateTemplates, UpdateTemplates, DeleteTemplates,
            ViewMedia, UploadMedia, DeleteMedia,
            ViewDashboard, ViewReports, ExportData,
            ViewOrganization, UpdateOrganization, ManageIntegrations,
            ViewSystemSettings, UpdateSystemSettings, ViewAuditLogs, ManageWebhooks,
        ].into_iter().collect()
    }

    /// Get supervisor permissions
    pub fn supervisor_permissions() -> HashSet<Permission> {
        use Permission::*;
        vec![
            ViewUsers, CreateUsers, UpdateUsers,
            ViewConversations, CreateConversations, UpdateConversations, AssignConversations,
            ViewMessages, SendMessages, DeleteMessages,
            ViewContacts, CreateContacts, UpdateContacts, DeleteContacts,
            ViewTemplates, CreateTemplates, UpdateTemplates, DeleteTemplates,
            ViewMedia, UploadMedia, DeleteMedia,
            ViewDashboard, ViewReports, ExportData,
            ViewOrganization,
            ViewAuditLogs,
        ].into_iter().collect()
    }

    /// Get agent permissions
    pub fn agent_permissions() -> HashSet<Permission> {
        use Permission::*;
        vec![
            ViewConversations, UpdateConversations,
            ViewMessages, SendMessages,
            ViewContacts, CreateContacts, UpdateContacts,
            ViewTemplates, CreateTemplates,
            ViewMedia, UploadMedia,
            ViewDashboard,
        ].into_iter().collect()
    }

    /// Get viewer permissions
    pub fn viewer_permissions() -> HashSet<Permission> {
        use Permission::*;
        vec![
            ViewConversations,
            ViewMessages,
            ViewContacts,
            ViewTemplates,
            ViewMedia,
            ViewDashboard,
        ].into_iter().collect()
    }

    /// Get permission from string
    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "view_users" => Some(Permission::ViewUsers),
            "create_users" => Some(Permission::CreateUsers),
            "update_users" => Some(Permission::UpdateUsers),
            "delete_users" => Some(Permission::DeleteUsers),
            "view_conversations" => Some(Permission::ViewConversations),
            "create_conversations" => Some(Permission::CreateConversations),
            "update_conversations" => Some(Permission::UpdateConversations),
            "delete_conversations" => Some(Permission::DeleteConversations),
            "assign_conversations" => Some(Permission::AssignConversations),
            "view_messages" => Some(Permission::ViewMessages),
            "send_messages" => Some(Permission::SendMessages),
            "delete_messages" => Some(Permission::DeleteMessages),
            "view_contacts" => Some(Permission::ViewContacts),
            "create_contacts" => Some(Permission::CreateContacts),
            "update_contacts" => Some(Permission::UpdateContacts),
            "delete_contacts" => Some(Permission::DeleteContacts),
            "view_templates" => Some(Permission::ViewTemplates),
            "create_templates" => Some(Permission::CreateTemplates),
            "update_templates" => Some(Permission::UpdateTemplates),
            "delete_templates" => Some(Permission::DeleteTemplates),
            "view_media" => Some(Permission::ViewMedia),
            "upload_media" => Some(Permission::UploadMedia),
            "delete_media" => Some(Permission::DeleteMedia),
            "view_dashboard" => Some(Permission::ViewDashboard),
            "view_reports" => Some(Permission::ViewReports),
            "export_data" => Some(Permission::ExportData),
            "view_organization" => Some(Permission::ViewOrganization),
            "update_organization" => Some(Permission::UpdateOrganization),
            "manage_integrations" => Some(Permission::ManageIntegrations),
            "view_system_settings" => Some(Permission::ViewSystemSettings),
            "update_system_settings" => Some(Permission::UpdateSystemSettings),
            "view_audit_logs" => Some(Permission::ViewAuditLogs),
            "manage_webhooks" => Some(Permission::ManageWebhooks),
            _ => None,
        }
    }

    /// Convert permission to string
    pub fn as_str(&self) -> &'static str {
        match self {
            Permission::ViewUsers => "view_users",
            Permission::CreateUsers => "create_users",
            Permission::UpdateUsers => "update_users",
            Permission::DeleteUsers => "delete_users",
            Permission::ViewConversations => "view_conversations",
            Permission::CreateConversations => "create_conversations",
            Permission::UpdateConversations => "update_conversations",
            Permission::DeleteConversations => "delete_conversations",
            Permission::AssignConversations => "assign_conversations",
            Permission::ViewMessages => "view_messages",
            Permission::SendMessages => "send_messages",
            Permission::DeleteMessages => "delete_messages",
            Permission::ViewContacts => "view_contacts",
            Permission::CreateContacts => "create_contacts",
            Permission::UpdateContacts => "update_contacts",
            Permission::DeleteContacts => "delete_contacts",
            Permission::ViewTemplates => "view_templates",
            Permission::CreateTemplates => "create_templates",
            Permission::UpdateTemplates => "update_templates",
            Permission::DeleteTemplates => "delete_templates",
            Permission::ViewMedia => "view_media",
            Permission::UploadMedia => "upload_media",
            Permission::DeleteMedia => "delete_media",
            Permission::ViewDashboard => "view_dashboard",
            Permission::ViewReports => "view_reports",
            Permission::ExportData => "export_data",
            Permission::ViewOrganization => "view_organization",
            Permission::UpdateOrganization => "update_organization",
            Permission::ManageIntegrations => "manage_integrations",
            Permission::ViewSystemSettings => "view_system_settings",
            Permission::UpdateSystemSettings => "update_system_settings",
            Permission::ViewAuditLogs => "view_audit_logs",
            Permission::ManageWebhooks => "manage_webhooks",
        }
    }
}

/// Permission check helper
pub struct PermissionChecker {
    user_role: Role,
    user_permissions: HashSet<Permission>,
}

impl PermissionChecker {
    pub fn new(role: Role) -> Self {
        Self {
            user_role: role,
            user_permissions: role.permissions(),
        }
    }

    pub fn with_custom_permissions(role: Role, permissions: HashSet<Permission>) -> Self {
        Self {
            user_role: role,
            user_permissions: permissions,
        }
    }

    pub fn has_permission(&self, permission: Permission) -> bool {
        self.user_permissions.contains(&permission)
    }

    pub fn has_any_permission(&self, permissions: &[Permission]) -> bool {
        permissions.iter().any(|p| self.has_permission(*p))
    }

    pub fn has_all_permissions(&self, permissions: &[Permission]) -> bool {
        permissions.iter().all(|p| self.has_permission(*p))
    }

    pub fn get_role(&self) -> Role {
        self.user_role
    }

    pub fn is_admin(&self) -> bool {
        self.user_role == Role::Admin
    }

    pub fn is_supervisor_or_above(&self) -> bool {
        matches!(self.user_role, Role::Admin | Role::Supervisor)
    }

    pub fn is_agent_or_above(&self) -> bool {
        matches!(self.user_role, Role::Admin | Role::Supervisor | Role::Agent)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_role_permissions() {
        let admin = Role::Admin;
        assert!(admin.has_permission(Permission::DeleteUsers));
        assert!(admin.has_permission(Permission::ViewDashboard));

        let agent = Role::Agent;
        assert!(agent.has_permission(Permission::SendMessages));
        assert!(!agent.has_permission(Permission::DeleteUsers));

        let viewer = Role::Viewer;
        assert!(viewer.has_permission(Permission::ViewMessages));
        assert!(!viewer.has_permission(Permission::SendMessages));
    }

    #[test]
    fn test_permission_checker() {
        let checker = PermissionChecker::new(Role::Supervisor);
        
        assert!(checker.has_permission(Permission::CreateUsers));
        assert!(!checker.has_permission(Permission::UpdateSystemSettings));
        
        assert!(checker.has_any_permission(&[
            Permission::UpdateSystemSettings,
            Permission::ViewUsers,
        ]));
        
        assert!(!checker.has_all_permissions(&[
            Permission::ViewUsers,
            Permission::UpdateSystemSettings,
        ]));
    }

    #[test]
    fn test_role_hierarchy_checks() {
        let admin_checker = PermissionChecker::new(Role::Admin);
        assert!(admin_checker.is_admin());
        assert!(admin_checker.is_supervisor_or_above());
        assert!(admin_checker.is_agent_or_above());

        let agent_checker = PermissionChecker::new(Role::Agent);
        assert!(!agent_checker.is_admin());
        assert!(!agent_checker.is_supervisor_or_above());
        assert!(agent_checker.is_agent_or_above());
    }
}