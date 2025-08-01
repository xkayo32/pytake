//! Flow-related domain entities

use super::common::{EntityId, Timestamp};
use super::{Entity, Timestamped, Validatable};
use crate::errors::CoreError;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use validator::Validate;

/// Automation flow entity
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Validate)]
pub struct Flow {
    pub id: EntityId,
    pub user_id: EntityId,
    
    #[validate(length(min = 1, max = 255, message = "Flow name must be between 1 and 255 characters"))]
    pub name: String,
    
    #[validate(length(max = 1000, message = "Description cannot exceed 1000 characters"))]
    pub description: Option<String>,
    
    pub status: FlowStatus,
    pub trigger: FlowTrigger,
    pub actions: Vec<FlowAction>,
    pub metadata: HashMap<String, serde_json::Value>,
    pub created_at: Timestamp,
    pub updated_at: Timestamp,
}

/// Flow execution status
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum FlowStatus {
    Draft,
    Active,
    Paused,
    Archived,
}

/// Flow trigger configuration
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum FlowTrigger {
    Manual,
    Schedule {
        cron_expression: String,
    },
    Webhook {
        url: String,
        secret: Option<String>,
    },
    WhatsappMessage {
        phone_number: String,
        keyword: Option<String>,
    },
}

/// Flow action definition
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct FlowAction {
    pub id: EntityId,
    pub action_type: FlowActionType,
    pub parameters: HashMap<String, serde_json::Value>,
    pub order: u32,
    pub enabled: bool,
}

/// Types of actions that can be performed in a flow
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum FlowActionType {
    SendWhatsappMessage {
        to: String,
        template: String,
    },
    HttpRequest {
        method: String,
        url: String,
        headers: Option<HashMap<String, String>>,
    },
    DataTransformation {
        script: String,
    },
    Delay {
        duration_seconds: u64,
    },
    Conditional {
        condition: String,
        true_actions: Vec<EntityId>,
        false_actions: Vec<EntityId>,
    },
}

impl Flow {
    /// Create a new flow
    pub fn new(user_id: EntityId, name: String, description: Option<String>) -> Self {
        let now = Timestamp::now();
        
        Self {
            id: EntityId::new(),
            user_id,
            name,
            description,
            status: FlowStatus::Draft,
            trigger: FlowTrigger::Manual,
            actions: Vec::new(),
            metadata: HashMap::new(),
            created_at: now,
            updated_at: now,
        }
    }

    /// Update flow information
    pub fn update(&mut self, name: Option<String>, description: Option<String>, status: Option<FlowStatus>) {
        if let Some(name) = name {
            self.name = name;
        }
        
        if let Some(description) = description {
            self.description = Some(description);
        }
        
        if let Some(status) = status {
            self.status = status;
        }
        
        self.updated_at = Timestamp::now();
    }

    /// Add an action to the flow
    pub fn add_action(&mut self, action_type: FlowActionType, parameters: HashMap<String, serde_json::Value>) {
        let order = self.actions.len() as u32;
        let action = FlowAction {
            id: EntityId::new(),
            action_type,
            parameters,
            order,
            enabled: true,
        };
        
        self.actions.push(action);
        self.updated_at = Timestamp::now();
    }

    /// Remove an action from the flow
    pub fn remove_action(&mut self, action_id: EntityId) -> bool {
        if let Some(pos) = self.actions.iter().position(|a| a.id == action_id) {
            self.actions.remove(pos);
            
            // Reorder remaining actions
            for (index, action) in self.actions.iter_mut().enumerate() {
                action.order = index as u32;
            }
            
            self.updated_at = Timestamp::now();
            true
        } else {
            false
        }
    }

    /// Set the flow trigger
    pub fn set_trigger(&mut self, trigger: FlowTrigger) {
        self.trigger = trigger;
        self.updated_at = Timestamp::now();
    }

    /// Check if flow is active
    pub fn is_active(&self) -> bool {
        self.status == FlowStatus::Active
    }

    /// Get enabled actions in order
    pub fn enabled_actions(&self) -> Vec<&FlowAction> {
        let mut actions: Vec<&FlowAction> = self.actions.iter().filter(|a| a.enabled).collect();
        actions.sort_by_key(|a| a.order);
        actions
    }
}

impl Entity for Flow {
    type Id = EntityId;
    
    fn id(&self) -> &Self::Id {
        &self.id
    }
}

impl Timestamped for Flow {
    fn created_at(&self) -> &Timestamp {
        &self.created_at
    }
    
    fn updated_at(&self) -> &Timestamp {
        &self.updated_at
    }
}

impl Validatable for Flow {
    type Error = CoreError;
    
    fn validate(&self) -> Result<(), Self::Error> {
        use validator::Validate;
        Validate::validate(self)
            .map_err(|e| CoreError::ValidationError(format!("Flow validation failed: {}", e)))?;
        
        // Additional business rules validation
        if self.actions.is_empty() && self.status == FlowStatus::Active {
            return Err(CoreError::ValidationError(
                "Active flow must have at least one action".to_string()
            ));
        }
        
        Ok(())
    }
}

impl Default for FlowStatus {
    fn default() -> Self {
        FlowStatus::Draft
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::entities::Validatable;

    #[test]
    fn test_flow_creation() {
        let user_id = EntityId::new();
        let flow = Flow::new(user_id, "Test Flow".to_string(), Some("Test description".to_string()));
        
        assert_eq!(flow.user_id, user_id);
        assert_eq!(flow.name, "Test Flow");
        assert_eq!(flow.description, Some("Test description".to_string()));
        assert_eq!(flow.status, FlowStatus::Draft);
        assert!(flow.actions.is_empty());
    }

    #[test]
    fn test_flow_add_remove_action() {
        let user_id = EntityId::new();
        let mut flow = Flow::new(user_id, "Test Flow".to_string(), None);
        
        // Add action
        let action_type = FlowActionType::Delay { duration_seconds: 10 };
        let parameters = HashMap::new();
        flow.add_action(action_type, parameters);
        
        assert_eq!(flow.actions.len(), 1);
        assert_eq!(flow.actions[0].order, 0);
        
        // Remove action
        let action_id = flow.actions[0].id;
        assert!(flow.remove_action(action_id));
        assert!(flow.actions.is_empty());
    }

    #[test]
    fn test_flow_validation() {
        let user_id = EntityId::new();
        let mut flow = Flow::new(user_id, "Test Flow".to_string(), None);
        
        // Should fail validation when active with no actions
        flow.status = FlowStatus::Active;
        assert!(Validatable::validate(&flow).is_err());
        
        // Should pass validation when active with actions
        flow.add_action(FlowActionType::Delay { duration_seconds: 10 }, HashMap::new());
        assert!(Validatable::validate(&flow).is_ok());
    }
}