//! Repository trait definitions

use crate::error::Result;
use super::{PaginatedResult, PaginationParams, QueryParams};
use pytake_core::entities::common::EntityId;
use async_trait::async_trait;

/// Generic repository trait for CRUD operations
#[async_trait]
pub trait Repository<T> {
    /// Create a new entity
    async fn create(&self, entity: T) -> Result<T>;

    /// Find an entity by ID
    async fn find_by_id(&self, id: EntityId) -> Result<Option<T>>;

    /// Update an existing entity
    async fn update(&self, entity: T) -> Result<T>;

    /// Delete an entity by ID
    async fn delete(&self, id: EntityId) -> Result<bool>;

    /// List entities with pagination
    async fn list(&self, params: QueryParams) -> Result<PaginatedResult<T>>;

    /// Count total entities
    async fn count(&self) -> Result<u64>;

    /// Check if entity exists by ID
    async fn exists(&self, id: EntityId) -> Result<bool>;
}

/// User-specific repository operations
#[async_trait]
pub trait UserRepository: Repository<pytake_core::entities::user::User> {
    /// Find user by email
    async fn find_by_email(&self, email: &str) -> Result<Option<pytake_core::entities::user::User>>;

    /// Find users by role
    async fn find_by_role(
        &self,
        role: pytake_core::entities::user::UserRole,
        params: PaginationParams,
    ) -> Result<PaginatedResult<pytake_core::entities::user::User>>;

    /// Find users by status
    async fn find_by_status(
        &self,
        status: pytake_core::entities::user::UserStatus,
        params: PaginationParams,
    ) -> Result<PaginatedResult<pytake_core::entities::user::User>>;

    /// Check if email exists
    async fn email_exists(&self, email: &str) -> Result<bool>;

    /// Get active user count
    async fn active_user_count(&self) -> Result<u64>;
}

/// Flow-specific repository operations
#[async_trait]
pub trait FlowRepository: Repository<pytake_core::entities::flow::Flow> {
    /// Find flows by user ID
    async fn find_by_user_id(
        &self,
        user_id: EntityId,
        params: PaginationParams,
    ) -> Result<PaginatedResult<pytake_core::entities::flow::Flow>>;

    /// Find flows by status
    async fn find_by_status(
        &self,
        status: pytake_core::entities::flow::FlowStatus,
        params: PaginationParams,
    ) -> Result<PaginatedResult<pytake_core::entities::flow::Flow>>;

    /// Find active flows for a user
    async fn find_active_by_user_id(
        &self,
        user_id: EntityId,
        params: PaginationParams,
    ) -> Result<PaginatedResult<pytake_core::entities::flow::Flow>>;

    /// Search flows by name
    async fn search_by_name(
        &self,
        name_pattern: &str,
        params: PaginationParams,
    ) -> Result<PaginatedResult<pytake_core::entities::flow::Flow>>;

    /// Count flows by user
    async fn count_by_user(&self, user_id: EntityId) -> Result<u64>;

    /// Count active flows
    async fn count_active(&self) -> Result<u64>;
}

/// WhatsApp message-specific repository operations
#[async_trait]
pub trait WhatsAppMessageRepository: Repository<pytake_core::entities::whatsapp::WhatsAppMessage> {
    /// Find messages by user ID
    async fn find_by_user_id(
        &self,
        user_id: EntityId,
        params: PaginationParams,
    ) -> Result<PaginatedResult<pytake_core::entities::whatsapp::WhatsAppMessage>>;

    /// Find messages by flow ID
    async fn find_by_flow_id(
        &self,
        flow_id: EntityId,
        params: PaginationParams,
    ) -> Result<PaginatedResult<pytake_core::entities::whatsapp::WhatsAppMessage>>;

    /// Find messages by phone number
    async fn find_by_phone_number(
        &self,
        phone_number: &str,
        params: PaginationParams,
    ) -> Result<PaginatedResult<pytake_core::entities::whatsapp::WhatsAppMessage>>;

    /// Find messages by status
    async fn find_by_status(
        &self,
        status: pytake_core::entities::whatsapp::MessageStatus,
        params: PaginationParams,
    ) -> Result<PaginatedResult<pytake_core::entities::whatsapp::WhatsAppMessage>>;

    /// Find messages by direction
    async fn find_by_direction(
        &self,
        direction: pytake_core::entities::whatsapp::MessageDirection,
        params: PaginationParams,
    ) -> Result<PaginatedResult<pytake_core::entities::whatsapp::WhatsAppMessage>>;

    /// Find messages in date range
    async fn find_by_date_range(
        &self,
        start_date: chrono::DateTime<chrono::Utc>,
        end_date: chrono::DateTime<chrono::Utc>,
        params: PaginationParams,
    ) -> Result<PaginatedResult<pytake_core::entities::whatsapp::WhatsAppMessage>>;

    /// Find conversation between two numbers
    async fn find_conversation(
        &self,
        phone1: &str,
        phone2: &str,
        params: PaginationParams,
    ) -> Result<PaginatedResult<pytake_core::entities::whatsapp::WhatsAppMessage>>;

    /// Count messages by status
    async fn count_by_status(
        &self,
        status: pytake_core::entities::whatsapp::MessageStatus,
    ) -> Result<u64>;

    /// Count pending messages
    async fn count_pending(&self) -> Result<u64>;

    /// Update message status
    async fn update_status(
        &self,
        message_id: EntityId,
        status: pytake_core::entities::whatsapp::MessageStatus,
    ) -> Result<bool>;
}

/// Webhook event-specific repository operations
#[async_trait]
pub trait WebhookEventRepository {
    /// Create a new webhook event
    async fn create(
        &self,
        event: pytake_core::entities::whatsapp::WhatsAppWebhookEvent,
    ) -> Result<crate::entities::webhook_event::ExtendedWebhookEvent>;

    /// Find event by ID
    async fn find_by_id(
        &self,
        id: EntityId,
    ) -> Result<Option<crate::entities::webhook_event::ExtendedWebhookEvent>>;

    /// Find unprocessed events
    async fn find_unprocessed(
        &self,
        params: PaginationParams,
    ) -> Result<PaginatedResult<crate::entities::webhook_event::ExtendedWebhookEvent>>;

    /// Find events by type
    async fn find_by_type(
        &self,
        event_type: pytake_core::entities::whatsapp::WebhookEventType,
        params: PaginationParams,
    ) -> Result<PaginatedResult<crate::entities::webhook_event::ExtendedWebhookEvent>>;

    /// Find events by phone number
    async fn find_by_phone_number(
        &self,
        phone_number: &str,
        params: PaginationParams,
    ) -> Result<PaginatedResult<crate::entities::webhook_event::ExtendedWebhookEvent>>;

    /// Find failed events that should be retried
    async fn find_for_retry(
        &self,
        max_retries: i32,
        params: PaginationParams,
    ) -> Result<PaginatedResult<crate::entities::webhook_event::ExtendedWebhookEvent>>;

    /// Mark event as processed
    async fn mark_processed(&self, event_id: EntityId) -> Result<bool>;

    /// Mark event as failed
    async fn mark_failed(&self, event_id: EntityId, error_message: String) -> Result<bool>;

    /// Count unprocessed events
    async fn count_unprocessed(&self) -> Result<u64>;

    /// Count events by type
    async fn count_by_type(
        &self,
        event_type: pytake_core::entities::whatsapp::WebhookEventType,
    ) -> Result<u64>;

    /// Delete old processed events
    async fn cleanup_old_events(&self, older_than_days: u32) -> Result<u64>;
}

/// Repository factory trait for dependency injection
#[async_trait]
pub trait RepositoryFactory: Send + Sync {
    type UserRepo: UserRepository + Send + Sync;
    type FlowRepo: FlowRepository + Send + Sync;
    type MessageRepo: WhatsAppMessageRepository + Send + Sync;
    type WebhookRepo: WebhookEventRepository + Send + Sync;

    /// Get user repository
    fn user_repository(&self) -> &Self::UserRepo;

    /// Get flow repository
    fn flow_repository(&self) -> &Self::FlowRepo;

    /// Get WhatsApp message repository
    fn message_repository(&self) -> &Self::MessageRepo;

    /// Get webhook event repository
    fn webhook_repository(&self) -> &Self::WebhookRepo;
}

#[cfg(test)]
mod tests {
    use super::*;
    
    // Test that trait definitions compile correctly
    #[test]
    fn test_trait_definitions() {
        // This test ensures all trait definitions are syntactically correct
        // and can be compiled without issues
        assert!(true);
    }
}