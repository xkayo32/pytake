//! Webhook event repository implementation

use crate::entities::webhook_event::{Entity as WebhookEntity, Model as WebhookModel, ActiveModel as WebhookActiveModel, WebhookEventType, ExtendedWebhookEvent};
use crate::error::{DatabaseError, DatabaseResultExt, Result};
use crate::repositories::{PaginatedResult, PaginationParams, paginate_query, traits::WebhookEventRepository};
use pytake_core::entities::{common::EntityId, whatsapp::{WhatsAppWebhookEvent, WebhookEventType as DomainWebhookEventType}};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, Condition, DatabaseConnection, EntityTrait, 
    QueryFilter, QueryOrder, Set, PaginatorTrait
};
use async_trait::async_trait;
use std::sync::Arc;

/// Webhook event repository implementation
pub struct WebhookEventRepositoryImpl {
    db: Arc<DatabaseConnection>,
}

impl WebhookEventRepositoryImpl {
    /// Create a new webhook event repository
    pub fn new(db: Arc<DatabaseConnection>) -> Self {
        Self { db }
    }
}

#[async_trait]
impl WebhookEventRepository for WebhookEventRepositoryImpl {
    async fn create(
        &self,
        event: WhatsAppWebhookEvent,
    ) -> Result<ExtendedWebhookEvent> {
        let active_model = WebhookActiveModel::from_domain(event);
        let model = active_model.insert(self.db.as_ref()).await?;
        Ok(model.to_extended())
    }

    async fn find_by_id(
        &self,
        id: EntityId,
    ) -> Result<Option<ExtendedWebhookEvent>> {
        let uuid = crate::entities::entity_id_to_uuid(&id);
        let model = WebhookEntity::find_by_id(uuid)
            .one(self.db.as_ref())
            .await?;

        Ok(model.map(|m| m.to_extended()))
    }

    async fn find_unprocessed(
        &self,
        params: PaginationParams,
    ) -> Result<PaginatedResult<ExtendedWebhookEvent>> {
        let query = WebhookEntity::find()
            .filter(crate::entities::webhook_event::Column::Processed.eq(false))
            .order_by_asc(crate::entities::webhook_event::Column::CreatedAt);

        let paginated = paginate_query(query, &params, self.db.as_ref()).await?;
        Ok(paginated.map(|m| m.to_extended()))
    }

    async fn find_by_type(
        &self,
        event_type: DomainWebhookEventType,
        params: PaginationParams,
    ) -> Result<PaginatedResult<ExtendedWebhookEvent>> {
        let db_event_type: WebhookEventType = event_type.into();
        let query = WebhookEntity::find()
            .filter(crate::entities::webhook_event::Column::EventType.eq(db_event_type))
            .order_by_desc(crate::entities::webhook_event::Column::CreatedAt);

        let paginated = paginate_query(query, &params, self.db.as_ref()).await?;
        Ok(paginated.map(|m| m.to_extended()))
    }

    async fn find_by_phone_number(
        &self,
        phone_number: &str,
        params: PaginationParams,
    ) -> Result<PaginatedResult<ExtendedWebhookEvent>> {
        let query = WebhookEntity::find()
            .filter(crate::entities::webhook_event::Column::PhoneNumber.eq(phone_number))
            .order_by_desc(crate::entities::webhook_event::Column::CreatedAt);

        let paginated = paginate_query(query, &params, self.db.as_ref()).await?;
        Ok(paginated.map(|m| m.to_extended()))
    }

    async fn find_for_retry(
        &self,
        max_retries: i32,
        params: PaginationParams,
    ) -> Result<PaginatedResult<ExtendedWebhookEvent>> {
        let query = WebhookEntity::find()
            .filter(crate::entities::webhook_event::Column::Processed.eq(false))
            .filter(crate::entities::webhook_event::Column::RetryCount.lt(max_retries))
            .filter(crate::entities::webhook_event::Column::ErrorMessage.is_not_null())
            .order_by_asc(crate::entities::webhook_event::Column::CreatedAt);

        let paginated = paginate_query(query, &params, self.db.as_ref()).await?;
        Ok(paginated.map(|m| m.to_extended()))
    }

    async fn mark_processed(&self, event_id: EntityId) -> Result<bool> {
        let uuid = crate::entities::entity_id_to_uuid(&event_id);
        
        let existing_model = WebhookEntity::find_by_id(uuid)
            .one(self.db.as_ref())
            .await?
            .ok_or_else(|| DatabaseError::NotFound(format!("Webhook event with id {} not found", event_id)))?;

        let mut active_model: WebhookActiveModel = existing_model.into();
        active_model.mark_processed();
        
        active_model.update(self.db.as_ref()).await?;
        Ok(true)
    }

    async fn mark_failed(&self, event_id: EntityId, error_message: String) -> Result<bool> {
        let uuid = crate::entities::entity_id_to_uuid(&event_id);
        
        let existing_model = WebhookEntity::find_by_id(uuid)
            .one(self.db.as_ref())
            .await?
            .ok_or_else(|| DatabaseError::NotFound(format!("Webhook event with id {} not found", event_id)))?;

        let mut active_model: WebhookActiveModel = existing_model.into();
        active_model.mark_failed(error_message);
        
        active_model.update(self.db.as_ref()).await?;
        Ok(true)
    }

    async fn count_unprocessed(&self) -> Result<u64> {
        let count = WebhookEntity::find()
            .filter(crate::entities::webhook_event::Column::Processed.eq(false))
            .count(self.db.as_ref())
            .await?;
        Ok(count)
    }

    async fn count_by_type(
        &self,
        event_type: DomainWebhookEventType,
    ) -> Result<u64> {
        let db_event_type: WebhookEventType = event_type.into();
        let count = WebhookEntity::find()
            .filter(crate::entities::webhook_event::Column::EventType.eq(db_event_type))
            .count(self.db.as_ref())
            .await?;
        Ok(count)
    }

    async fn cleanup_old_events(&self, older_than_days: u32) -> Result<u64> {
        let cutoff_date = chrono::Utc::now() - chrono::Duration::days(older_than_days as i64);
        
        let result = WebhookEntity::delete_many()
            .filter(crate::entities::webhook_event::Column::Processed.eq(true))
            .filter(crate::entities::webhook_event::Column::CreatedAt.lt(cutoff_date))
            .exec(self.db.as_ref())
            .await?;

        Ok(result.rows_affected)
    }
}