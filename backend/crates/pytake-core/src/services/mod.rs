//! Business logic and domain services
//!
//! This module contains the core business logic that operates on domain entities.
//! Services encapsulate complex business rules and coordinate between different
//! domain entities while remaining independent of external concerns like databases
//! or web frameworks.

pub mod flow_service;
pub mod user_service;
pub mod whatsapp_processor;
pub mod whatsapp_service;
pub mod contact_sync;

// Re-export commonly used service traits
pub use flow_service::FlowService;
pub use user_service::UserService;
pub use whatsapp_service::WhatsAppService;

/// Common trait for all domain services
pub trait DomainService {
    /// Service name for logging and identification
    fn service_name(&self) -> &'static str;
}

/// Trait for services that support validation
#[async_trait::async_trait]
pub trait ValidatingService {
    type Entity;
    type Error;
    
    /// Validate an entity according to business rules
    async fn validate(&self, entity: &Self::Entity) -> Result<(), Self::Error>;
}

#[cfg(test)]
mod tests {
    #[test]
    fn test_module_exports() {
        // This test ensures that all service modules are properly exported
        // and can be imported without issues
    }
}