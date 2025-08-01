//! Flow repository implementation

use crate::entities::flow::{Entity as FlowEntity, Model as FlowModel, ActiveModel as FlowActiveModel, FlowStatus};
use crate::error::{DatabaseError, DatabaseResultExt, Result};
use crate::repositories::{PaginatedResult, PaginationParams, QueryParams, paginate_query, traits::{Repository, FlowRepository}};
use pytake_core::entities::{common::EntityId, flow::Flow};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, Condition, DatabaseConnection, EntityTrait, 
    QueryFilter, QueryOrder, Set, PaginatorTrait
};
use async_trait::async_trait;
use std::sync::Arc;

/// Flow repository implementation
pub struct FlowRepositoryImpl {
    db: Arc<DatabaseConnection>,
}

impl FlowRepositoryImpl {
    /// Create a new flow repository
    pub fn new(db: Arc<DatabaseConnection>) -> Self {
        Self { db }
    }
}

#[async_trait]
impl Repository<Flow> for FlowRepositoryImpl {
    async fn create(&self, entity: Flow) -> Result<Flow> {
        let active_model = FlowActiveModel::from_domain(entity);
        let model = active_model.insert(self.db.as_ref()).await?;
        model.to_domain()
    }

    async fn find_by_id(&self, id: EntityId) -> Result<Option<Flow>> {
        let uuid = crate::entities::entity_id_to_uuid(&id);
        let model = FlowEntity::find_by_id(uuid)
            .one(self.db.as_ref())
            .await?;

        match model {
            Some(m) => Ok(Some(m.to_domain()?)),
            None => Ok(None),
        }
    }

    async fn update(&self, entity: Flow) -> Result<Flow> {
        let uuid = crate::entities::entity_id_to_uuid(&entity.id);
        let existing_model = FlowEntity::find_by_id(uuid)
            .one(self.db.as_ref())
            .await?
            .ok_or_else(|| DatabaseError::NotFound(format!("Flow with id {} not found", entity.id)))?;

        let mut active_model: FlowActiveModel = existing_model.into();
        active_model.update_from_domain(entity)?;
        
        let updated_model = active_model.update(self.db.as_ref()).await?;
        updated_model.to_domain()
    }

    async fn delete(&self, id: EntityId) -> Result<bool> {
        let uuid = crate::entities::entity_id_to_uuid(&id);
        let result = FlowEntity::delete_by_id(uuid)
            .exec(self.db.as_ref())
            .await?;

        Ok(result.rows_affected > 0)
    }

    async fn list(&self, params: QueryParams) -> Result<PaginatedResult<Flow>> {
        let query = FlowEntity::find()
            .order_by_desc(crate::entities::flow::Column::CreatedAt);

        let paginated = paginate_query(query, &params.pagination, self.db.as_ref()).await?;
        let flows: Result<Vec<Flow>> = paginated.items.into_iter()
            .map(|m| m.to_domain())
            .collect();
        
        Ok(PaginatedResult::new(flows?, paginated.total_items, &params.pagination))
    }

    async fn count(&self) -> Result<u64> {
        let count = FlowEntity::find()
            .count(self.db.as_ref())
            .await?;
        Ok(count)
    }

    async fn exists(&self, id: EntityId) -> Result<bool> {
        let uuid = crate::entities::entity_id_to_uuid(&id);
        let count = FlowEntity::find_by_id(uuid)
            .count(self.db.as_ref())
            .await?;
        Ok(count > 0)
    }
}

#[async_trait]
impl FlowRepository for FlowRepositoryImpl {
    async fn find_by_user_id(
        &self,
        user_id: EntityId,
        params: PaginationParams,
    ) -> Result<PaginatedResult<Flow>> {
        let uuid = crate::entities::entity_id_to_uuid(&user_id);
        let query = FlowEntity::find()
            .filter(crate::entities::flow::Column::UserId.eq(uuid))
            .order_by_desc(crate::entities::flow::Column::CreatedAt);

        let paginated = paginate_query(query, &params, self.db.as_ref()).await?;
        let flows: Result<Vec<Flow>> = paginated.items.into_iter()
            .map(|m| m.to_domain())
            .collect();
        
        Ok(PaginatedResult::new(flows?, paginated.total_items, &params))
    }

    async fn find_by_status(
        &self,
        status: pytake_core::entities::flow::FlowStatus,
        params: PaginationParams,
    ) -> Result<PaginatedResult<Flow>> {
        let db_status: FlowStatus = status.into();
        let query = FlowEntity::find()
            .filter(crate::entities::flow::Column::Status.eq(db_status))
            .order_by_desc(crate::entities::flow::Column::CreatedAt);

        let paginated = paginate_query(query, &params, self.db.as_ref()).await?;
        let flows: Result<Vec<Flow>> = paginated.items.into_iter()
            .map(|m| m.to_domain())
            .collect();
        
        Ok(PaginatedResult::new(flows?, paginated.total_items, &params))
    }

    async fn find_active_by_user_id(
        &self,
        user_id: EntityId,
        params: PaginationParams,
    ) -> Result<PaginatedResult<Flow>> {
        let uuid = crate::entities::entity_id_to_uuid(&user_id);
        let query = FlowEntity::find()
            .filter(crate::entities::flow::Column::UserId.eq(uuid))
            .filter(crate::entities::flow::Column::Status.eq(FlowStatus::Active))
            .order_by_desc(crate::entities::flow::Column::CreatedAt);

        let paginated = paginate_query(query, &params, self.db.as_ref()).await?;
        let flows: Result<Vec<Flow>> = paginated.items.into_iter()
            .map(|m| m.to_domain())
            .collect();
        
        Ok(PaginatedResult::new(flows?, paginated.total_items, &params))
    }

    async fn search_by_name(
        &self,
        name_pattern: &str,
        params: PaginationParams,
    ) -> Result<PaginatedResult<Flow>> {
        let query = FlowEntity::find()
            .filter(crate::entities::flow::Column::Name.like(&format!("%{}%", name_pattern)))
            .order_by_desc(crate::entities::flow::Column::CreatedAt);

        let paginated = paginate_query(query, &params, self.db.as_ref()).await?;
        let flows: Result<Vec<Flow>> = paginated.items.into_iter()
            .map(|m| m.to_domain())
            .collect();
        
        Ok(PaginatedResult::new(flows?, paginated.total_items, &params))
    }

    async fn count_by_user(&self, user_id: EntityId) -> Result<u64> {
        let uuid = crate::entities::entity_id_to_uuid(&user_id);
        let count = FlowEntity::find()
            .filter(crate::entities::flow::Column::UserId.eq(uuid))
            .count(self.db.as_ref())
            .await?;
        Ok(count)
    }

    async fn count_active(&self) -> Result<u64> {
        let count = FlowEntity::find()
            .filter(crate::entities::flow::Column::Status.eq(FlowStatus::Active))
            .count(self.db.as_ref())
            .await?;
        Ok(count)
    }
}