//! Flow entity model for SeaORM

use super::*;
use pytake_core::entities::flow as domain;
use std::collections::HashMap;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, Serialize, Deserialize)]
#[sea_orm(table_name = "flows")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    
    pub user_id: Uuid,
    
    pub name: String,
    
    pub description: Option<String>,
    
    pub status: FlowStatus,
    
    #[sea_orm(column_type = "Json")]
    pub trigger: Json,
    
    #[sea_orm(column_type = "Json")]
    pub actions: Json,
    
    #[sea_orm(column_type = "Json")]
    pub metadata: Json,
    
    pub created_at: chrono::DateTime<chrono::Utc>,
    
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::user::Entity",
        from = "Column::UserId",
        to = "super::user::Column::Id"
    )]
    User,
    
    #[sea_orm(has_many = "super::whatsapp_message::Entity")]
    WhatsappMessages,
}

impl Related<super::user::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::User.def()
    }
}

impl Related<super::whatsapp_message::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::WhatsappMessages.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

/// Flow status enum for database storage
#[derive(Debug, Clone, PartialEq, Eq, EnumIter, DeriveActiveEnum, Serialize, Deserialize)]
#[sea_orm(rs_type = "String", db_type = "Enum", enum_name = "flow_status")]
pub enum FlowStatus {
    #[sea_orm(string_value = "draft")]
    Draft,
    #[sea_orm(string_value = "active")]
    Active,
    #[sea_orm(string_value = "paused")]
    Paused,
    #[sea_orm(string_value = "archived")]
    Archived,
}

impl From<domain::FlowStatus> for FlowStatus {
    fn from(status: domain::FlowStatus) -> Self {
        match status {
            domain::FlowStatus::Draft => FlowStatus::Draft,
            domain::FlowStatus::Active => FlowStatus::Active,
            domain::FlowStatus::Paused => FlowStatus::Paused,
            domain::FlowStatus::Archived => FlowStatus::Archived,
        }
    }
}

impl From<FlowStatus> for domain::FlowStatus {
    fn from(status: FlowStatus) -> Self {
        match status {
            FlowStatus::Draft => domain::FlowStatus::Draft,
            FlowStatus::Active => domain::FlowStatus::Active,
            FlowStatus::Paused => domain::FlowStatus::Paused,
            FlowStatus::Archived => domain::FlowStatus::Archived,
        }
    }
}

impl From<domain::Flow> for Model {
    fn from(flow: domain::Flow) -> Self {
        Self {
            id: super::entity_id_to_uuid(&flow.id),
            user_id: super::entity_id_to_uuid(&flow.user_id),
            name: flow.name,
            description: flow.description,
            status: flow.status.into(),
            trigger: serde_json::to_value(&flow.trigger).unwrap_or_default().into(),
            actions: serde_json::to_value(&flow.actions).unwrap_or_default().into(),
            metadata: serde_json::to_value(&flow.metadata).unwrap_or_default().into(),
            created_at: super::timestamp_to_datetime(&flow.created_at),
            updated_at: super::timestamp_to_datetime(&flow.updated_at),
        }
    }
}

impl TryFrom<Model> for domain::Flow {
    type Error = crate::error::DatabaseError;

    fn try_from(model: Model) -> Result<Self, Self::Error> {
        let trigger: domain::FlowTrigger = serde_json::from_value(model.trigger.clone())
            .map_err(|e| crate::error::DatabaseError::SerializationError(
                format!("Failed to deserialize flow trigger: {}", e)
            ))?;

        let actions: Vec<domain::FlowAction> = serde_json::from_value(model.actions.clone())
            .map_err(|e| crate::error::DatabaseError::SerializationError(
                format!("Failed to deserialize flow actions: {}", e)
            ))?;

        let metadata: HashMap<String, serde_json::Value> = serde_json::from_value(model.metadata.clone())
            .map_err(|e| crate::error::DatabaseError::SerializationError(
                format!("Failed to deserialize flow metadata: {}", e)
            ))?;

        Ok(Self {
            id: super::uuid_to_entity_id(model.id),
            user_id: super::uuid_to_entity_id(model.user_id),
            name: model.name,
            description: model.description,
            status: model.status.into(),
            trigger,
            actions,
            metadata,
            created_at: super::datetime_to_timestamp(model.created_at),
            updated_at: super::datetime_to_timestamp(model.updated_at),
        })
    }
}

impl From<domain::Flow> for ActiveModel {
    fn from(flow: domain::Flow) -> Self {
        Self {
            id: Set(super::entity_id_to_uuid(&flow.id)),
            user_id: Set(super::entity_id_to_uuid(&flow.user_id)),
            name: Set(flow.name),
            description: Set(flow.description),
            status: Set(flow.status.into()),
            trigger: Set(serde_json::to_value(&flow.trigger).unwrap_or_default().into()),
            actions: Set(serde_json::to_value(&flow.actions).unwrap_or_default().into()),
            metadata: Set(serde_json::to_value(&flow.metadata).unwrap_or_default().into()),
            created_at: Set(super::timestamp_to_datetime(&flow.created_at)),
            updated_at: Set(super::timestamp_to_datetime(&flow.updated_at)),
        }
    }
}

/// Utility functions for flow entity operations
impl Model {
    /// Check if flow is active
    pub fn is_active(&self) -> bool {
        self.status == FlowStatus::Active
    }

    /// Check if flow can be executed
    pub fn can_execute(&self) -> bool {
        matches!(self.status, FlowStatus::Active | FlowStatus::Paused)
    }

    /// Get the number of actions
    pub fn action_count(&self) -> usize {
        if let Ok(actions) = serde_json::from_value::<Vec<domain::FlowAction>>(self.actions.clone()) {
            actions.len()
        } else {
            0
        }
    }

    /// Convert to domain entity
    pub fn to_domain(self) -> Result<domain::Flow, crate::error::DatabaseError> {
        self.try_into()
    }
}

impl ActiveModel {
    /// Create from domain flow
    pub fn from_domain(flow: domain::Flow) -> Self {
        flow.into()
    }

    /// Update with domain flow data
    pub fn update_from_domain(&mut self, flow: domain::Flow) -> Result<(), crate::error::DatabaseError> {
        self.name = Set(flow.name);
        self.description = Set(flow.description);
        self.status = Set(flow.status.into());
        self.trigger = Set(serde_json::to_value(&flow.trigger)
            .map_err(|e| crate::error::DatabaseError::SerializationError(e.to_string()))?
            .into());
        self.actions = Set(serde_json::to_value(&flow.actions)
            .map_err(|e| crate::error::DatabaseError::SerializationError(e.to_string()))?
            .into());
        self.metadata = Set(serde_json::to_value(&flow.metadata)
            .map_err(|e| crate::error::DatabaseError::SerializationError(e.to_string()))?
            .into());
        self.updated_at = Set(super::timestamp_to_datetime(&flow.updated_at));
        
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use pytake_core::entities::common::EntityId;
    use std::collections::HashMap;

    #[test]
    fn test_flow_status_conversion() {
        let domain_status = domain::FlowStatus::Active;
        let db_status: FlowStatus = domain_status.into();
        let back_to_domain: domain::FlowStatus = db_status.into();
        
        assert_eq!(domain_status, back_to_domain);
    }

    #[test]
    fn test_flow_model_conversion() {
        let user_id = EntityId::new();
        let domain_flow = domain::Flow::new(
            user_id,
            "Test Flow".to_string(),
            Some("Test description".to_string()),
        );
        
        let db_model: Model = domain_flow.clone().into();
        let back_to_domain: domain::Flow = db_model.try_into().unwrap();
        
        assert_eq!(domain_flow.name, back_to_domain.name);
        assert_eq!(domain_flow.description, back_to_domain.description);
        assert_eq!(domain_flow.status, back_to_domain.status);
        assert_eq!(domain_flow.user_id, back_to_domain.user_id);
    }

    #[test]
    fn test_active_model_from_domain() {
        let user_id = EntityId::new();
        let domain_flow = domain::Flow::new(
            user_id,
            "Test Flow".to_string(),
            None,
        );
        
        let active_model = ActiveModel::from_domain(domain_flow.clone());
        
        match active_model.name {
            Set(name) => assert_eq!(name, domain_flow.name),
            _ => panic!("Expected Set value"),
        }
    }

    #[test]
    fn test_flow_model_utility_functions() {
        let user_id = EntityId::new();
        let mut domain_flow = domain::Flow::new(
            user_id,
            "Test Flow".to_string(),
            None,
        );
        
        // Add an action to test action_count
        domain_flow.add_action(
            domain::FlowActionType::Delay { duration_seconds: 10 },
            HashMap::new(),
        );
        
        let db_model: Model = domain_flow.into();
        
        assert!(!db_model.is_active()); // Should be draft by default
        assert!(db_model.can_execute()); // Draft flows can be executed
        assert_eq!(db_model.action_count(), 1);
    }
}