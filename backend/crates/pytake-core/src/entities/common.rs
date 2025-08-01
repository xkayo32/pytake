//! Common types and utilities for entities

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::fmt;
use uuid::Uuid;

/// A strongly-typed entity identifier
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(transparent)]
pub struct EntityId(Uuid);

impl EntityId {
    /// Generate a new random entity ID
    pub fn new() -> Self {
        Self(Uuid::new_v4())
    }

    /// Create an EntityId from a UUID
    pub fn from_uuid(uuid: Uuid) -> Self {
        Self(uuid)
    }

    /// Get the inner UUID
    pub fn as_uuid(&self) -> Uuid {
        self.0
    }

    /// Convert to string representation
    pub fn to_string(&self) -> String {
        self.0.to_string()
    }
}

impl Default for EntityId {
    fn default() -> Self {
        Self::new()
    }
}

impl fmt::Display for EntityId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl From<Uuid> for EntityId {
    fn from(uuid: Uuid) -> Self {
        Self(uuid)
    }
}

impl From<EntityId> for Uuid {
    fn from(id: EntityId) -> Self {
        id.0
    }
}

/// Timestamp type for tracking creation and modification times
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(transparent)]
pub struct Timestamp(DateTime<Utc>);

impl Timestamp {
    /// Create a new timestamp with the current time
    pub fn now() -> Self {
        Self(Utc::now())
    }

    /// Create a timestamp from a DateTime<Utc>
    pub fn from_datetime(dt: DateTime<Utc>) -> Self {
        Self(dt)
    }

    /// Get the inner DateTime<Utc>
    pub fn as_datetime(&self) -> DateTime<Utc> {
        self.0
    }
}

impl Default for Timestamp {
    fn default() -> Self {
        Self::now()
    }
}

impl fmt::Display for Timestamp {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0.format("%Y-%m-%d %H:%M:%S UTC"))
    }
}

impl From<DateTime<Utc>> for Timestamp {
    fn from(dt: DateTime<Utc>) -> Self {
        Self(dt)
    }
}

impl From<Timestamp> for DateTime<Utc> {
    fn from(ts: Timestamp) -> Self {
        ts.0
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_entity_id_generation() {
        let id1 = EntityId::new();
        let id2 = EntityId::new();
        
        assert_ne!(id1, id2);
        assert!(!id1.to_string().is_empty());
    }

    #[test]
    fn test_entity_id_from_uuid() {
        let uuid = Uuid::new_v4();
        let id = EntityId::from_uuid(uuid);
        
        assert_eq!(id.as_uuid(), uuid);
    }

    #[test]
    fn test_timestamp_creation() {
        let ts1 = Timestamp::now();
        let ts2 = Timestamp::now();
        
        // Timestamps should be very close but might not be exactly equal
        assert!(ts2.as_datetime() >= ts1.as_datetime());
    }

    #[test]
    fn test_timestamp_from_datetime() {
        let dt = Utc::now();
        let ts = Timestamp::from_datetime(dt);
        
        assert_eq!(ts.as_datetime(), dt);
    }
}