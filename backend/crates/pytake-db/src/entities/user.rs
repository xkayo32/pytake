//! User entity model for SeaORM

use super::*;
use pytake_core::entities::user as domain;
use sea_orm::ActiveValue::Set;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, Serialize, Deserialize)]
#[sea_orm(table_name = "users")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    
    #[sea_orm(unique)]
    pub email: String,
    
    pub name: String,
    
    pub role: UserRole,
    
    pub status: UserStatus,
    
    pub created_at: chrono::DateTime<chrono::Utc>,
    
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(has_many = "super::flow::Entity")]
    Flows,
    
    #[sea_orm(has_many = "super::whatsapp_message::Entity")]
    WhatsappMessages,
}

impl Related<super::flow::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Flows.def()
    }
}

impl Related<super::whatsapp_message::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::WhatsappMessages.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

/// User role enum for database storage
#[derive(Debug, Clone, PartialEq, Eq, EnumIter, DeriveActiveEnum, Serialize, Deserialize)]
#[sea_orm(rs_type = "String", db_type = "Enum", enum_name = "user_role")]
pub enum UserRole {
    #[sea_orm(string_value = "admin")]
    Admin,
    #[sea_orm(string_value = "user")]
    User,
}

/// User status enum for database storage
#[derive(Debug, Clone, PartialEq, Eq, EnumIter, DeriveActiveEnum, Serialize, Deserialize)]
#[sea_orm(rs_type = "String", db_type = "Enum", enum_name = "user_status")]
pub enum UserStatus {
    #[sea_orm(string_value = "active")]
    Active,
    #[sea_orm(string_value = "inactive")]
    Inactive,
    #[sea_orm(string_value = "suspended")]
    Suspended,
}

impl From<domain::UserRole> for UserRole {
    fn from(role: domain::UserRole) -> Self {
        match role {
            domain::UserRole::Admin => UserRole::Admin,
            domain::UserRole::User => UserRole::User,
        }
    }
}

impl From<UserRole> for domain::UserRole {
    fn from(role: UserRole) -> Self {
        match role {
            UserRole::Admin => domain::UserRole::Admin,
            UserRole::User => domain::UserRole::User,
        }
    }
}

impl From<domain::UserStatus> for UserStatus {
    fn from(status: domain::UserStatus) -> Self {
        match status {
            domain::UserStatus::Active => UserStatus::Active,
            domain::UserStatus::Inactive => UserStatus::Inactive,
            domain::UserStatus::Suspended => UserStatus::Suspended,
        }
    }
}

impl From<UserStatus> for domain::UserStatus {
    fn from(status: UserStatus) -> Self {
        match status {
            UserStatus::Active => domain::UserStatus::Active,
            UserStatus::Inactive => domain::UserStatus::Inactive,
            UserStatus::Suspended => domain::UserStatus::Suspended,
        }
    }
}

impl From<domain::User> for Model {
    fn from(user: domain::User) -> Self {
        Self {
            id: super::entity_id_to_uuid(&user.id),
            email: user.email,
            name: user.name,
            role: user.role.into(),
            status: user.status.into(),
            created_at: super::timestamp_to_datetime(&user.created_at),
            updated_at: super::timestamp_to_datetime(&user.updated_at),
        }
    }
}

impl From<Model> for domain::User {
    fn from(model: Model) -> Self {
        Self {
            id: super::uuid_to_entity_id(model.id),
            email: model.email,
            name: model.name,
            role: model.role.into(),
            status: model.status.into(),
            created_at: super::datetime_to_timestamp(model.created_at),
            updated_at: super::datetime_to_timestamp(model.updated_at),
        }
    }
}

impl From<domain::User> for ActiveModel {
    fn from(user: domain::User) -> Self {
        Self {
            id: Set(super::entity_id_to_uuid(&user.id)),
            email: Set(user.email),
            name: Set(user.name),
            role: Set(user.role.into()),
            status: Set(user.status.into()),
            created_at: Set(super::timestamp_to_datetime(&user.created_at)),
            updated_at: Set(super::timestamp_to_datetime(&user.updated_at)),
        }
    }
}

/// Utility functions for user entity operations
impl Model {
    /// Check if user is active
    pub fn is_active(&self) -> bool {
        self.status == UserStatus::Active
    }

    /// Check if user is admin
    pub fn is_admin(&self) -> bool {
        self.role == UserRole::Admin
    }

    /// Convert to domain entity
    pub fn to_domain(self) -> domain::User {
        self.into()
    }
}

impl ActiveModel {
    /// Create from domain user
    pub fn from_domain(user: domain::User) -> Self {
        user.into()
    }

    /// Update with domain user data
    pub fn update_from_domain(&mut self, user: domain::User) {
        self.email = Set(user.email);
        self.name = Set(user.name);
        self.role = Set(user.role.into());
        self.status = Set(user.status.into());
        self.updated_at = Set(super::timestamp_to_datetime(&user.updated_at));
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use pytake_core::entities::common::{EntityId, Timestamp};
    use sea_orm::ActiveValue::Set;

    #[test]
    fn test_user_role_conversion() {
        let domain_role = domain::UserRole::Admin;
        let db_role: UserRole = domain_role.into();
        let back_to_domain: domain::UserRole = db_role.into();
        
        assert_eq!(domain_role, back_to_domain);
    }

    #[test]
    fn test_user_status_conversion() {
        let domain_status = domain::UserStatus::Active;
        let db_status: UserStatus = domain_status.into();
        let back_to_domain: domain::UserStatus = db_status.into();
        
        assert_eq!(domain_status, back_to_domain);
    }

    #[test]
    fn test_user_model_conversion() {
        let domain_user = domain::User::new(
            "test@example.com".to_string(),
            "Test User".to_string(),
        );
        
        let db_model: Model = domain_user.clone().into();
        let back_to_domain: domain::User = db_model.into();
        
        assert_eq!(domain_user.email, back_to_domain.email);
        assert_eq!(domain_user.name, back_to_domain.name);
        assert_eq!(domain_user.role, back_to_domain.role);
        assert_eq!(domain_user.status, back_to_domain.status);
    }

    #[test]
    fn test_active_model_from_domain() {
        let domain_user = domain::User::new(
            "test@example.com".to_string(),
            "Test User".to_string(),
        );
        
        let active_model = ActiveModel::from_domain(domain_user.clone());
        
        match active_model.email {
            Set(email) => assert_eq!(email, domain_user.email),
            _ => panic!("Expected Set value"),
        }
    }
}