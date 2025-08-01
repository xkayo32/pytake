//! Utility functions and helpers
//!
//! This module contains utility functions and helpers that are used throughout
//! the core domain logic. These utilities are framework-agnostic and focus on
//! common operations and transformations.

pub mod validation;
pub mod formatting;
pub mod serialization;
pub mod time;

// Re-export commonly used utilities
pub use validation::*;
pub use formatting::*;
pub use time::*;