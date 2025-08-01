//! Flow business logic and domain services

use crate::entities::flow::{Flow, FlowActionType, FlowStatus, FlowTrigger};
use crate::entities::common::EntityId;
use crate::entities::Validatable;
use crate::errors::{CoreError, CoreResult};
use crate::services::{DomainService, ValidatingService};
use async_trait::async_trait;
use std::collections::HashMap;

/// Flow domain service
#[derive(Debug, Default)]
pub struct FlowService;

impl FlowService {
    /// Create a new flow service instance
    pub fn new() -> Self {
        Self
    }

    /// Create a new flow with validation
    pub async fn create_flow(
        &self,
        user_id: EntityId,
        name: String,
        description: Option<String>,
    ) -> CoreResult<Flow> {
        let flow = Flow::new(user_id, name, description);
        
        // Validate the flow
        self.validate(&flow).await?;
        
        Ok(flow)
    }

    /// Update flow information with validation
    pub async fn update_flow(
        &self,
        mut flow: Flow,
        name: Option<String>,
        description: Option<String>,
        status: Option<FlowStatus>,
    ) -> CoreResult<Flow> {
        flow.update(name, description, status);
        
        // Validate the updated flow
        self.validate(&flow).await?;
        
        Ok(flow)
    }

    /// Add an action to a flow with validation
    pub async fn add_action_to_flow(
        &self,
        mut flow: Flow,
        action_type: FlowActionType,
        parameters: HashMap<String, serde_json::Value>,
    ) -> CoreResult<Flow> {
        // Validate action before adding
        self.validate_action(&action_type, &parameters)?;
        
        flow.add_action(action_type, parameters);
        
        // Validate the updated flow
        self.validate(&flow).await?;
        
        Ok(flow)
    }

    /// Remove an action from a flow
    pub async fn remove_action_from_flow(
        &self,
        mut flow: Flow,
        action_id: EntityId,
    ) -> CoreResult<Flow> {
        if !flow.remove_action(action_id) {
            return Err(CoreError::not_found("FlowAction", &action_id.to_string()));
        }
        
        // Validate the updated flow
        self.validate(&flow).await?;
        
        Ok(flow)
    }

    /// Set flow trigger with validation
    pub async fn set_flow_trigger(
        &self,
        mut flow: Flow,
        trigger: FlowTrigger,
    ) -> CoreResult<Flow> {
        // Validate trigger
        self.validate_trigger(&trigger)?;
        
        flow.set_trigger(trigger);
        
        Ok(flow)
    }

    /// Activate a flow
    pub async fn activate_flow(&self, mut flow: Flow) -> CoreResult<Flow> {
        if flow.status == FlowStatus::Active {
            return Err(CoreError::business_rule("Flow is already active"));
        }
        
        // Ensure flow has at least one action before activation
        if flow.actions.is_empty() {
            return Err(CoreError::business_rule(
                "Cannot activate flow without actions"
            ));
        }
        
        // Ensure all actions are valid
        for action in &flow.actions {
            self.validate_action(&action.action_type, &action.parameters)?;
        }
        
        flow.update(None, None, Some(FlowStatus::Active));
        
        Ok(flow)
    }

    /// Pause a flow
    pub async fn pause_flow(&self, mut flow: Flow) -> CoreResult<Flow> {
        if flow.status != FlowStatus::Active {
            return Err(CoreError::business_rule("Can only pause active flows"));
        }
        
        flow.update(None, None, Some(FlowStatus::Paused));
        
        Ok(flow)
    }

    /// Archive a flow
    pub async fn archive_flow(&self, mut flow: Flow) -> CoreResult<Flow> {
        if flow.status == FlowStatus::Archived {
            return Err(CoreError::business_rule("Flow is already archived"));
        }
        
        flow.update(None, None, Some(FlowStatus::Archived));
        
        Ok(flow)
    }

    /// Check if a user can execute a flow
    pub fn can_execute_flow(&self, flow: &Flow, user_id: &EntityId) -> bool {
        // User must own the flow and flow must be active
        flow.user_id == *user_id && flow.is_active()
    }

    /// Validate a flow trigger
    pub fn validate_trigger(&self, trigger: &FlowTrigger) -> CoreResult<()> {
        match trigger {
            FlowTrigger::Manual => Ok(()),
            FlowTrigger::Schedule { cron_expression } => {
                // Basic cron validation (in a real implementation, use a cron parsing library)
                if cron_expression.is_empty() {
                    return Err(CoreError::validation("Cron expression cannot be empty"));
                }
                
                let parts: Vec<&str> = cron_expression.split_whitespace().collect();
                if parts.len() != 5 && parts.len() != 6 {
                    return Err(CoreError::validation(
                        "Cron expression must have 5 or 6 parts"
                    ));
                }
                
                Ok(())
            },
            FlowTrigger::Webhook { url, .. } => {
                if url.is_empty() {
                    return Err(CoreError::validation("Webhook URL cannot be empty"));
                }
                
                if !url.starts_with("http://") && !url.starts_with("https://") {
                    return Err(CoreError::validation("Webhook URL must start with http:// or https://"));
                }
                
                Ok(())
            },
            FlowTrigger::WhatsappMessage { phone_number, .. } => {
                if phone_number.is_empty() {
                    return Err(CoreError::validation("Phone number cannot be empty"));
                }
                
                // Basic phone number validation
                if !phone_number.starts_with('+') {
                    return Err(CoreError::validation("Phone number must start with +"));
                }
                
                Ok(())
            },
        }
    }

    /// Validate a flow action
    pub fn validate_action(
        &self,
        action_type: &FlowActionType,
        _parameters: &HashMap<String, serde_json::Value>,
    ) -> CoreResult<()> {
        match action_type {
            FlowActionType::SendWhatsappMessage { to, template } => {
                if to.is_empty() {
                    return Err(CoreError::validation("WhatsApp recipient cannot be empty"));
                }
                
                if template.is_empty() {
                    return Err(CoreError::validation("WhatsApp template cannot be empty"));
                }
                
                // Validate phone number format
                if !to.starts_with('+') {
                    return Err(CoreError::validation("Phone number must start with +"));
                }
                
                Ok(())
            },
            FlowActionType::HttpRequest { method, url, .. } => {
                if method.is_empty() {
                    return Err(CoreError::validation("HTTP method cannot be empty"));
                }
                
                if url.is_empty() {
                    return Err(CoreError::validation("HTTP URL cannot be empty"));
                }
                
                // Validate HTTP method
                let valid_methods = vec!["GET", "POST", "PUT", "DELETE", "PATCH"];
                if !valid_methods.contains(&method.to_uppercase().as_str()) {
                    return Err(CoreError::validation("Invalid HTTP method"));
                }
                
                // Validate URL format
                if !url.starts_with("http://") && !url.starts_with("https://") {
                    return Err(CoreError::validation("URL must start with http:// or https://"));
                }
                
                Ok(())
            },
            FlowActionType::DataTransformation { script } => {
                if script.is_empty() {
                    return Err(CoreError::validation("Transformation script cannot be empty"));
                }
                
                // In a real implementation, you might want to validate the script syntax
                Ok(())
            },
            FlowActionType::Delay { duration_seconds } => {
                if *duration_seconds == 0 {
                    return Err(CoreError::validation("Delay duration must be greater than 0"));
                }
                
                if *duration_seconds > 86400 {  // 24 hours
                    return Err(CoreError::validation("Delay duration cannot exceed 24 hours"));
                }
                
                Ok(())
            },
            FlowActionType::Conditional { condition, true_actions, false_actions } => {
                if condition.is_empty() {
                    return Err(CoreError::validation("Conditional condition cannot be empty"));
                }
                
                if true_actions.is_empty() && false_actions.is_empty() {
                    return Err(CoreError::validation(
                        "Conditional must have at least one action branch"
                    ));
                }
                
                Ok(())
            },
        }
    }

    /// Get flow execution readiness status
    pub fn get_flow_readiness(&self, flow: &Flow) -> FlowReadiness {
        let mut issues = Vec::new();
        
        // Check if flow has actions
        if flow.actions.is_empty() {
            issues.push("Flow has no actions".to_string());
        }
        
        // Check if trigger is properly configured
        if let Err(e) = self.validate_trigger(&flow.trigger) {
            issues.push(format!("Invalid trigger: {}", e));
        }
        
        // Check each action
        for (index, action) in flow.actions.iter().enumerate() {
            if let Err(e) = self.validate_action(&action.action_type, &action.parameters) {
                issues.push(format!("Invalid action {}: {}", index + 1, e));
            }
        }
        
        if issues.is_empty() {
            FlowReadiness::Ready
        } else {
            FlowReadiness::NotReady { issues }
        }
    }
}

/// Flow readiness status
#[derive(Debug, Clone, PartialEq)]
pub enum FlowReadiness {
    Ready,
    NotReady { issues: Vec<String> },
}

impl DomainService for FlowService {
    fn service_name(&self) -> &'static str {
        "FlowService"
    }
}

#[async_trait]
impl ValidatingService for FlowService {
    type Entity = Flow;
    type Error = CoreError;
    
    async fn validate(&self, flow: &Self::Entity) -> Result<(), Self::Error> {
        // First run the entity's built-in validation
        flow.validate()?;
        
        // Then run business-specific validation rules
        self.validate_trigger(&flow.trigger)?;
        
        // Validate all actions
        for action in &flow.actions {
            self.validate_action(&action.action_type, &action.parameters)?;
        }
        
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_create_flow() {
        let service = FlowService::new();
        let user_id = EntityId::new();
        
        let result = service.create_flow(
            user_id,
            "Test Flow".to_string(),
            Some("Test description".to_string()),
        ).await;
        
        assert!(result.is_ok());
        let flow = result.unwrap();
        assert_eq!(flow.name, "Test Flow");
        assert_eq!(flow.user_id, user_id);
    }

    #[tokio::test]
    async fn test_add_action_to_flow() {
        let service = FlowService::new();
        let user_id = EntityId::new();
        
        let flow = service.create_flow(
            user_id,
            "Test Flow".to_string(),
            None,
        ).await.unwrap();
        
        let action_type = FlowActionType::Delay { duration_seconds: 10 };
        let parameters = HashMap::new();
        
        let result = service.add_action_to_flow(flow, action_type, parameters).await;
        
        assert!(result.is_ok());
        let flow = result.unwrap();
        assert_eq!(flow.actions.len(), 1);
    }

    #[tokio::test]
    async fn test_activate_flow_without_actions() {
        let service = FlowService::new();
        let user_id = EntityId::new();
        
        let flow = service.create_flow(
            user_id,
            "Test Flow".to_string(),
            None,
        ).await.unwrap();
        
        let result = service.activate_flow(flow).await;
        
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), CoreError::BusinessRuleViolation(_)));
    }

    #[tokio::test]
    async fn test_flow_readiness() {
        let service = FlowService::new();
        let user_id = EntityId::new();
        
        // Flow without actions should not be ready
        let flow = service.create_flow(
            user_id,
            "Test Flow".to_string(),
            None,
        ).await.unwrap();
        
        let readiness = service.get_flow_readiness(&flow);
        assert!(matches!(readiness, FlowReadiness::NotReady { .. }));
        
        // Flow with valid action should be ready
        let action_type = FlowActionType::Delay { duration_seconds: 10 };
        let parameters = HashMap::new();
        
        let flow = service.add_action_to_flow(flow, action_type, parameters).await.unwrap();
        let readiness = service.get_flow_readiness(&flow);
        assert!(matches!(readiness, FlowReadiness::Ready));
    }

    #[tokio::test]
    async fn test_trigger_validation() {
        let service = FlowService::new();
        
        // Valid triggers
        assert!(service.validate_trigger(&FlowTrigger::Manual).is_ok());
        assert!(service.validate_trigger(&FlowTrigger::Schedule {
            cron_expression: "0 9 * * 1-5".to_string()
        }).is_ok());
        assert!(service.validate_trigger(&FlowTrigger::Webhook {
            url: "https://example.com/webhook".to_string(),
            secret: None,
        }).is_ok());
        
        // Invalid triggers
        assert!(service.validate_trigger(&FlowTrigger::Schedule {
            cron_expression: "".to_string()
        }).is_err());
        assert!(service.validate_trigger(&FlowTrigger::Webhook {
            url: "invalid-url".to_string(),
            secret: None,
        }).is_err());
    }

    #[tokio::test]
    async fn test_action_validation() {
        let service = FlowService::new();
        let parameters = HashMap::new();
        
        // Valid actions
        assert!(service.validate_action(
            &FlowActionType::Delay { duration_seconds: 10 },
            &parameters
        ).is_ok());
        
        assert!(service.validate_action(
            &FlowActionType::HttpRequest {
                method: "POST".to_string(),
                url: "https://api.example.com".to_string(),
                headers: None,
            },
            &parameters
        ).is_ok());
        
        // Invalid actions
        assert!(service.validate_action(
            &FlowActionType::Delay { duration_seconds: 0 },
            &parameters
        ).is_err());
        
        assert!(service.validate_action(
            &FlowActionType::HttpRequest {
                method: "INVALID".to_string(),
                url: "https://api.example.com".to_string(),
                headers: None,
            },
            &parameters
        ).is_err());
    }
}