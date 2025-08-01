//! SeaORM entity models for PyTake

pub mod user;
pub mod flow;
pub mod whatsapp_message;
pub mod webhook_event;
pub mod conversation;
pub mod message;
pub mod message_media;
pub mod conversation_tag;
pub mod quick_reply;
pub mod contact;

// Re-export all entities
pub use user::*;
pub use flow::*;
pub use whatsapp_message::*;
pub use webhook_event::*;
pub use conversation::*;
pub use message::*;
// pub use message_media::*;
// pub use conversation_tag::*;
// pub use quick_reply::*;

// Common imports for all entities
pub use sea_orm::entity::prelude::*;
pub use sea_orm::{NotSet, Unchanged};
pub use serde::{Deserialize, Serialize};

/// Convert from domain entity ID to database UUID
pub fn entity_id_to_uuid(id: &pytake_core::entities::common::EntityId) -> Uuid {
    id.as_uuid()
}

/// Convert from database UUID to domain entity ID
pub fn uuid_to_entity_id(uuid: Uuid) -> pytake_core::entities::common::EntityId {
    pytake_core::entities::common::EntityId::from_uuid(uuid)
}

/// Convert from domain timestamp to database DateTime
pub fn timestamp_to_datetime(ts: &pytake_core::entities::common::Timestamp) -> chrono::DateTime<chrono::Utc> {
    ts.as_datetime()
}

/// Convert from database DateTime to domain timestamp
pub fn datetime_to_timestamp(dt: chrono::DateTime<chrono::Utc>) -> pytake_core::entities::common::Timestamp {
    pytake_core::entities::common::Timestamp::from_datetime(dt)
}