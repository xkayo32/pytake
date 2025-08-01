//! # PyTake Core
//!
//! This crate contains the core business logic and domain entities for PyTake.
//! It is framework-agnostic and focuses on the domain model and business rules.
//!
//! ## Modules
//!
//! - [`entities`] - Domain entities and value objects
//! - [`services`] - Business logic and domain services
//! - [`errors`] - Error types and error handling utilities
//! - [`utils`] - Utility functions and helpers

pub mod entities;
pub mod errors;
pub mod services;
pub mod utils;

// Re-export commonly used types
pub use errors::{CoreError, CoreResult};
pub use utils::validation;

/// Current version of the core crate
pub const VERSION: &str = env!("CARGO_PKG_VERSION");

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_version_is_set() {
        assert!(!VERSION.is_empty());
        assert!(VERSION.chars().next().unwrap().is_ascii_digit());
    }
}