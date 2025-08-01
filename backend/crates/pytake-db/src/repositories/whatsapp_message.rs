//! WhatsApp message repository implementation

use crate::entities::whatsapp_message::{Entity as MessageEntity, Model as MessageModel, ActiveModel as MessageActiveModel, MessageStatus, MessageDirection};
use crate::error::{DatabaseError, DatabaseResultExt, Result};
use crate::repositories::{PaginatedResult, PaginationParams, QueryParams, paginate_query, traits::{Repository, WhatsAppMessageRepository}};
use pytake_core::entities::{common::EntityId, whatsapp::WhatsAppMessage};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, Condition, DatabaseConnection, EntityTrait, 
    QueryFilter, QueryOrder, PaginatorTrait
};
use sea_orm::ActiveValue::Set;
use async_trait::async_trait;
use std::sync::Arc;

/// WhatsApp message repository implementation
pub struct WhatsAppMessageRepositoryImpl {
    db: Arc<DatabaseConnection>,
}

impl WhatsAppMessageRepositoryImpl {
    /// Create a new WhatsApp message repository
    pub fn new(db: Arc<DatabaseConnection>) -> Self {
        Self { db }
    }
}

#[async_trait]
impl Repository<WhatsAppMessage> for WhatsAppMessageRepositoryImpl {
    async fn create(&self, entity: WhatsAppMessage) -> Result<WhatsAppMessage> {
        let active_model = MessageActiveModel::from_domain(entity);
        let model = active_model.insert(self.db.as_ref()).await?;
        model.to_domain()
    }

    async fn find_by_id(&self, id: EntityId) -> Result<Option<WhatsAppMessage>> {
        let uuid = crate::entities::entity_id_to_uuid(&id);
        let model = MessageEntity::find_by_id(uuid)
            .one(self.db.as_ref())
            .await?;

        match model {
            Some(m) => Ok(Some(m.to_domain()?)),
            None => Ok(None),
        }
    }

    async fn update(&self, entity: WhatsAppMessage) -> Result<WhatsAppMessage> {
        let uuid = crate::entities::entity_id_to_uuid(&entity.id);
        let existing_model = MessageEntity::find_by_id(uuid)
            .one(self.db.as_ref())
            .await?
            .ok_or_else(|| DatabaseError::NotFound(format!("Message with id {} not found", entity.id)))?;

        let mut active_model: MessageActiveModel = existing_model.into();
        active_model.update_from_domain(entity)?;
        
        let updated_model = active_model.update(self.db.as_ref()).await?;
        updated_model.to_domain()
    }

    async fn delete(&self, id: EntityId) -> Result<bool> {
        let uuid = crate::entities::entity_id_to_uuid(&id);
        let result = MessageEntity::delete_by_id(uuid)
            .exec(self.db.as_ref())
            .await?;

        Ok(result.rows_affected > 0)
    }

    async fn list(&self, params: QueryParams) -> Result<PaginatedResult<WhatsAppMessage>> {
        let query = MessageEntity::find()
            .order_by_desc(crate::entities::whatsapp_message::Column::CreatedAt);

        let paginated = paginate_query(query, &params.pagination, self.db.as_ref()).await?;
        let messages: Result<Vec<WhatsAppMessage>> = paginated.items.into_iter()
            .map(|m| m.to_domain())
            .collect();
        
        Ok(PaginatedResult::new(messages?, paginated.total_items, &params.pagination))
    }

    async fn count(&self) -> Result<u64> {
        let count = MessageEntity::find()
            .count(self.db.as_ref())
            .await?;
        Ok(count)
    }

    async fn exists(&self, id: EntityId) -> Result<bool> {
        let uuid = crate::entities::entity_id_to_uuid(&id);
        let count = MessageEntity::find_by_id(uuid)
            .count(self.db.as_ref())
            .await?;
        Ok(count > 0)
    }
}

#[async_trait]
impl WhatsAppMessageRepository for WhatsAppMessageRepositoryImpl {
    async fn find_by_user_id(
        &self,
        user_id: EntityId,
        params: PaginationParams,
    ) -> Result<PaginatedResult<WhatsAppMessage>> {
        let uuid = crate::entities::entity_id_to_uuid(&user_id);
        let query = MessageEntity::find()
            .filter(crate::entities::whatsapp_message::Column::UserId.eq(uuid))
            .order_by_desc(crate::entities::whatsapp_message::Column::CreatedAt);

        let paginated = paginate_query(query, &params, self.db.as_ref()).await?;
        let messages: Result<Vec<WhatsAppMessage>> = paginated.items.into_iter()
            .map(|m| m.to_domain())
            .collect();
        
        Ok(PaginatedResult::new(messages?, paginated.total_items, &params))
    }

    async fn find_by_flow_id(
        &self,
        flow_id: EntityId,
        params: PaginationParams,
    ) -> Result<PaginatedResult<WhatsAppMessage>> {
        let uuid = crate::entities::entity_id_to_uuid(&flow_id);
        let query = MessageEntity::find()
            .filter(crate::entities::whatsapp_message::Column::FlowId.eq(uuid))
            .order_by_desc(crate::entities::whatsapp_message::Column::CreatedAt);

        let paginated = paginate_query(query, &params, self.db.as_ref()).await?;
        let messages: Result<Vec<WhatsAppMessage>> = paginated.items.into_iter()
            .map(|m| m.to_domain())
            .collect();
        
        Ok(PaginatedResult::new(messages?, paginated.total_items, &params))
    }

    async fn find_by_phone_number(
        &self,
        phone_number: &str,
        params: PaginationParams,
    ) -> Result<PaginatedResult<WhatsAppMessage>> {
        let query = MessageEntity::find()
            .filter(
                Condition::any()
                    .add(crate::entities::whatsapp_message::Column::FromNumber.eq(phone_number))
                    .add(crate::entities::whatsapp_message::Column::ToNumber.eq(phone_number))
            )
            .order_by_desc(crate::entities::whatsapp_message::Column::CreatedAt);

        let paginated = paginate_query(query, &params, self.db.as_ref()).await?;
        let messages: Result<Vec<WhatsAppMessage>> = paginated.items.into_iter()
            .map(|m| m.to_domain())
            .collect();
        
        Ok(PaginatedResult::new(messages?, paginated.total_items, &params))
    }

    async fn find_by_status(
        &self,
        status: pytake_core::entities::whatsapp::MessageStatus,
        params: PaginationParams,
    ) -> Result<PaginatedResult<WhatsAppMessage>> {
        let db_status: MessageStatus = status.into();
        let query = MessageEntity::find()
            .filter(crate::entities::whatsapp_message::Column::Status.eq(db_status))
            .order_by_desc(crate::entities::whatsapp_message::Column::CreatedAt);

        let paginated = paginate_query(query, &params, self.db.as_ref()).await?;
        let messages: Result<Vec<WhatsAppMessage>> = paginated.items.into_iter()
            .map(|m| m.to_domain())
            .collect();
        
        Ok(PaginatedResult::new(messages?, paginated.total_items, &params))
    }

    async fn find_by_direction(
        &self,
        direction: pytake_core::entities::whatsapp::MessageDirection,
        params: PaginationParams,
    ) -> Result<PaginatedResult<WhatsAppMessage>> {
        let db_direction: MessageDirection = direction.into();
        let query = MessageEntity::find()
            .filter(crate::entities::whatsapp_message::Column::Direction.eq(db_direction))
            .order_by_desc(crate::entities::whatsapp_message::Column::CreatedAt);

        let paginated = paginate_query(query, &params, self.db.as_ref()).await?;
        let messages: Result<Vec<WhatsAppMessage>> = paginated.items.into_iter()
            .map(|m| m.to_domain())
            .collect();
        
        Ok(PaginatedResult::new(messages?, paginated.total_items, &params))
    }

    async fn find_by_date_range(
        &self,
        start_date: chrono::DateTime<chrono::Utc>,
        end_date: chrono::DateTime<chrono::Utc>,
        params: PaginationParams,
    ) -> Result<PaginatedResult<WhatsAppMessage>> {
        let query = MessageEntity::find()
            .filter(crate::entities::whatsapp_message::Column::CreatedAt.between(start_date, end_date))
            .order_by_desc(crate::entities::whatsapp_message::Column::CreatedAt);

        let paginated = paginate_query(query, &params, self.db.as_ref()).await?;
        let messages: Result<Vec<WhatsAppMessage>> = paginated.items.into_iter()
            .map(|m| m.to_domain())
            .collect();
        
        Ok(PaginatedResult::new(messages?, paginated.total_items, &params))
    }

    async fn find_conversation(
        &self,
        phone1: &str,
        phone2: &str,
        params: PaginationParams,
    ) -> Result<PaginatedResult<WhatsAppMessage>> {
        let query = MessageEntity::find()
            .filter(
                Condition::any()
                    .add(
                        Condition::all()
                            .add(crate::entities::whatsapp_message::Column::FromNumber.eq(phone1))
                            .add(crate::entities::whatsapp_message::Column::ToNumber.eq(phone2))
                    )
                    .add(
                        Condition::all()
                            .add(crate::entities::whatsapp_message::Column::FromNumber.eq(phone2))
                            .add(crate::entities::whatsapp_message::Column::ToNumber.eq(phone1))
                    )
            )
            .order_by_desc(crate::entities::whatsapp_message::Column::CreatedAt);

        let paginated = paginate_query(query, &params, self.db.as_ref()).await?;
        let messages: Result<Vec<WhatsAppMessage>> = paginated.items.into_iter()
            .map(|m| m.to_domain())
            .collect();
        
        Ok(PaginatedResult::new(messages?, paginated.total_items, &params))
    }

    async fn count_by_status(
        &self,
        status: pytake_core::entities::whatsapp::MessageStatus,
    ) -> Result<u64> {
        let db_status: MessageStatus = status.into();
        let count = MessageEntity::find()
            .filter(crate::entities::whatsapp_message::Column::Status.eq(db_status))
            .count(self.db.as_ref())
            .await?;
        Ok(count)
    }

    async fn count_pending(&self) -> Result<u64> {
        let count = MessageEntity::find()
            .filter(crate::entities::whatsapp_message::Column::Status.eq(MessageStatus::Pending))
            .count(self.db.as_ref())
            .await?;
        Ok(count)
    }

    async fn update_status(
        &self,
        message_id: EntityId,
        status: pytake_core::entities::whatsapp::MessageStatus,
    ) -> Result<bool> {
        let uuid = crate::entities::entity_id_to_uuid(&message_id);
        let db_status: MessageStatus = status.into();
        
        let existing_model = MessageEntity::find_by_id(uuid)
            .one(self.db.as_ref())
            .await?
            .ok_or_else(|| DatabaseError::NotFound(format!("Message with id {} not found", message_id)))?;

        let mut active_model: MessageActiveModel = existing_model.into();
        active_model.status = Set(db_status);
        active_model.updated_at = Set(crate::entities::timestamp_to_datetime(&pytake_core::entities::common::Timestamp::now()));
        
        let result = active_model.update(self.db.as_ref()).await?;
        Ok(true)
    }
}