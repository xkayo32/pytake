//! User repository implementation

use crate::entities::user::{Entity as UserEntity, Model as UserModel, ActiveModel as UserActiveModel, UserRole, UserStatus};
use crate::error::{DatabaseError, DatabaseResultExt, Result};
use crate::repositories::{PaginatedResult, PaginationParams, QueryParams, paginate_query, traits::{Repository, UserRepository}};
use pytake_core::entities::{common::EntityId, user::User};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, Condition, DatabaseConnection, EntityTrait, 
    QueryFilter, QueryOrder, PaginatorTrait
};
use sea_orm::ActiveValue::Set;
use async_trait::async_trait;
use std::sync::Arc;

/// User repository implementation
pub struct UserRepositoryImpl {
    db: Arc<DatabaseConnection>,
}

impl UserRepositoryImpl {
    /// Create a new user repository
    pub fn new(db: Arc<DatabaseConnection>) -> Self {
        Self { db }
    }
}

#[async_trait]
impl Repository<User> for UserRepositoryImpl {
    async fn create(&self, entity: User) -> Result<User> {
        let active_model = UserActiveModel::from_domain(entity);
        let model = active_model.insert(self.db.as_ref()).await?;
        Ok(model.into())
    }

    async fn find_by_id(&self, id: EntityId) -> Result<Option<User>> {
        let uuid = crate::entities::entity_id_to_uuid(&id);
        let model = UserEntity::find_by_id(uuid)
            .one(self.db.as_ref())
            .await?;

        Ok(model.map(Into::into))
    }

    async fn update(&self, entity: User) -> Result<User> {
        let uuid = crate::entities::entity_id_to_uuid(&entity.id);
        let existing_model = UserEntity::find_by_id(uuid)
            .one(self.db.as_ref())
            .await?
            .ok_or_else(|| DatabaseError::NotFound(format!("User with id {} not found", entity.id)))?;

        let mut active_model: UserActiveModel = existing_model.into();
        active_model.update_from_domain(entity);
        
        let updated_model = active_model.update(self.db.as_ref()).await?;
        Ok(updated_model.into())
    }

    async fn delete(&self, id: EntityId) -> Result<bool> {
        let uuid = crate::entities::entity_id_to_uuid(&id);
        let result = UserEntity::delete_by_id(uuid)
            .exec(self.db.as_ref())
            .await?;

        Ok(result.rows_affected > 0)
    }

    async fn list(&self, params: QueryParams) -> Result<PaginatedResult<User>> {
        let mut query = UserEntity::find();

        // Apply sorting
        if let Some(sort) = &params.sort {
            match sort.field.as_str() {
                "name" => {
                    query = match sort.direction {
                        crate::repositories::SortDirection::Asc => {
                            query.order_by_asc(crate::entities::user::Column::Name)
                        }
                        crate::repositories::SortDirection::Desc => {
                            query.order_by_desc(crate::entities::user::Column::Name)
                        }
                    };
                }
                "email" => {
                    query = match sort.direction {
                        crate::repositories::SortDirection::Asc => {
                            query.order_by_asc(crate::entities::user::Column::Email)
                        }
                        crate::repositories::SortDirection::Desc => {
                            query.order_by_desc(crate::entities::user::Column::Email)
                        }
                    };
                }
                "created_at" => {
                    query = match sort.direction {
                        crate::repositories::SortDirection::Asc => {
                            query.order_by_asc(crate::entities::user::Column::CreatedAt)
                        }
                        crate::repositories::SortDirection::Desc => {
                            query.order_by_desc(crate::entities::user::Column::CreatedAt)
                        }
                    };
                }
                _ => {
                    // Default to created_at desc
                    query = query.order_by_desc(crate::entities::user::Column::CreatedAt);
                }
            }
        } else {
            // Default ordering
            query = query.order_by_desc(crate::entities::user::Column::CreatedAt);
        }

        // Apply filters if present
        if let Some(filter) = &params.filter {
            let mut condition = Condition::all();
            
            for filter_condition in &filter.filters {
                match filter_condition.field.as_str() {
                    "role" => {
                        if let Ok(role_str) = serde_json::from_value::<String>(filter_condition.value.clone()) {
                            match filter_condition.operator {
                                crate::repositories::FilterOperator::Eq => {
                                    if let Ok(role) = serde_json::from_str::<UserRole>(&format!("\"{}\"", role_str)) {
                                        condition = condition.add(crate::entities::user::Column::Role.eq(role));
                                    }
                                }
                                _ => {} // Other operators not implemented for role
                            }
                        }
                    }
                    "status" => {
                        if let Ok(status_str) = serde_json::from_value::<String>(filter_condition.value.clone()) {
                            match filter_condition.operator {
                                crate::repositories::FilterOperator::Eq => {
                                    if let Ok(status) = serde_json::from_str::<UserStatus>(&format!("\"{}\"", status_str)) {
                                        condition = condition.add(crate::entities::user::Column::Status.eq(status));
                                    }
                                }
                                _ => {} // Other operators not implemented for status
                            }
                        }
                    }
                    "name" => {
                        if let Ok(name) = serde_json::from_value::<String>(filter_condition.value.clone()) {
                            match filter_condition.operator {
                                crate::repositories::FilterOperator::Like => {
                                    condition = condition.add(crate::entities::user::Column::Name.like(&format!("%{}%", name)));
                                }
                                crate::repositories::FilterOperator::Eq => {
                                    condition = condition.add(crate::entities::user::Column::Name.eq(name));
                                }
                                _ => {} // Other operators not implemented
                            }
                        }
                    }
                    _ => {} // Unknown field, ignore
                }
            }
            
            query = query.filter(condition);
        }

        let paginated = paginate_query(query, &params.pagination, self.db.as_ref()).await?;
        Ok(paginated.map(Into::into))
    }

    async fn count(&self) -> Result<u64> {
        let count = UserEntity::find()
            .count(self.db.as_ref())
            .await?;
        Ok(count)
    }

    async fn exists(&self, id: EntityId) -> Result<bool> {
        let uuid = crate::entities::entity_id_to_uuid(&id);
        let count = UserEntity::find_by_id(uuid)
            .count(self.db.as_ref())
            .await?;
        Ok(count > 0)
    }
}

#[async_trait]
impl UserRepository for UserRepositoryImpl {
    async fn find_by_email(&self, email: &str) -> Result<Option<User>> {
        let model = UserEntity::find()
            .filter(crate::entities::user::Column::Email.eq(email))
            .one(self.db.as_ref())
            .await?;

        Ok(model.map(Into::into))
    }

    async fn find_by_role(
        &self,
        role: pytake_core::entities::user::UserRole,
        params: PaginationParams,
    ) -> Result<PaginatedResult<User>> {
        let db_role: UserRole = role.into();
        let query = UserEntity::find()
            .filter(crate::entities::user::Column::Role.eq(db_role))
            .order_by_desc(crate::entities::user::Column::CreatedAt);

        let paginated = paginate_query(query, &params, self.db.as_ref()).await?;
        Ok(paginated.map(Into::into))
    }

    async fn find_by_status(
        &self,
        status: pytake_core::entities::user::UserStatus,
        params: PaginationParams,
    ) -> Result<PaginatedResult<User>> {
        let db_status: UserStatus = status.into();
        let query = UserEntity::find()
            .filter(crate::entities::user::Column::Status.eq(db_status))
            .order_by_desc(crate::entities::user::Column::CreatedAt);

        let paginated = paginate_query(query, &params, self.db.as_ref()).await?;
        Ok(paginated.map(Into::into))
    }

    async fn email_exists(&self, email: &str) -> Result<bool> {
        let count = UserEntity::find()
            .filter(crate::entities::user::Column::Email.eq(email))
            .count(self.db.as_ref())
            .await?;
        Ok(count > 0)
    }

    async fn active_user_count(&self) -> Result<u64> {
        let count = UserEntity::find()
            .filter(crate::entities::user::Column::Status.eq(UserStatus::Active))
            .count(self.db.as_ref())
            .await?;
        Ok(count)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::{DatabaseConfig, DatabaseUrl};
    use crate::connection::establish_connection;
    use pytake_core::entities::user::{UserRole as DomainUserRole, UserStatus as DomainUserStatus};

    async fn setup_test_db() -> Arc<DatabaseConnection> {
        let config = DatabaseConfig::new(
            DatabaseUrl::new("sqlite::memory:".to_string()).unwrap()
        );
        Arc::new(establish_connection(&config).await.unwrap())
    }

    #[tokio::test]
    async fn test_user_repository_creation() {
        let db = setup_test_db().await;
        let repo = UserRepositoryImpl::new(db);
        
        // Test that repository can be created
        assert_eq!(repo.db.as_ref() as *const _, repo.db.as_ref() as *const _);
    }

    #[test]
    fn test_user_role_conversion() {
        let domain_role = DomainUserRole::Admin;
        let db_role: UserRole = domain_role.into();
        let back_to_domain: DomainUserRole = db_role.into();
        
        assert_eq!(domain_role, back_to_domain);
    }

    #[test]
    fn test_user_status_conversion() {
        let domain_status = DomainUserStatus::Active;
        let db_status: UserStatus = domain_status.into();
        let back_to_domain: DomainUserStatus = db_status.into();
        
        assert_eq!(domain_status, back_to_domain);
    }
}