//! Domain entities and value objects
//!
//! This module contains the core domain entities that represent the business
//! concepts in PyTake. These entities are framework-agnostic and contain
//! the fundamental business rules and invariants.

pub mod common;
pub mod flow;
pub mod user;
pub mod whatsapp;

// Re-export commonly used types
pub use common::{EntityId, Timestamp};

/// Trait for entities that have a unique identifier
pub trait Entity {
    type Id;
    
    fn id(&self) -> &Self::Id;
}

/// Trait for entities that track creation and modification times
pub trait Timestamped {
    fn created_at(&self) -> &Timestamp;
    fn updated_at(&self) -> &Timestamp;
}

/// Trait for entities that can be validated
pub trait Validatable {
    type Error;
    
    fn validate(&self) -> Result<(), Self::Error>;
}