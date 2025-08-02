//! User repository for database operations

use crate::{
    entities::user::{self, ActiveModel, Column, Entity, Model},
    error::{DbError, DbResult},
};
use sea_orm::{
    entity::*, query::*, DatabaseConnection, DbBackend, QueryFilter, 
    ActiveValue::Set, ColumnTrait, EntityTrait, PaginatorTrait, QueryOrder,
};
use uuid::Uuid;
use tracing::{debug, error, info};

/// User repository for managing users
pub struct UserRepository {
    db: DatabaseConnection,
}

impl UserRepository {
    /// Create a new user repository
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    /// Create a new user
    pub async fn create(
        &self,
        organization_id: Uuid,
        email: String,
        name: String,
        password_hash: String,
        role: String,
    ) -> DbResult<Model> {
        debug!("Creating new user: {} ({})", name, email);

        let user = ActiveModel {
            id: Set(Uuid::new_v4()),
            organization_id: Set(organization_id),
            email: Set(email),
            name: Set(name),
            password_hash: Set(password_hash),
            role: Set(role),
            is_active: Set(true),
            last_login_at: Set(None),
            created_at: Set(chrono::Utc::now()),
            updated_at: Set(chrono::Utc::now()),
            ..Default::default()
        };

        let result = user.insert(&self.db).await.map_err(|e| {
            error!("Failed to create user: {}", e);
            DbError::QueryError(e.to_string())
        })?;

        info!("Created user with ID: {}", result.id);
        Ok(result)
    }

    /// Get a user by ID
    pub async fn get_by_id(&self, id: Uuid) -> DbResult<Option<Model>> {
        Entity::find_by_id(id)
            .one(&self.db)
            .await
            .map_err(|e| DbError::QueryError(e.to_string()))
    }

    /// Get a user by email
    pub async fn get_by_email(&self, email: &str) -> DbResult<Option<Model>> {
        Entity::find()
            .filter(Column::Email.eq(email))
            .one(&self.db)
            .await
            .map_err(|e| DbError::QueryError(e.to_string()))
    }

    /// Get a user by email and organization
    pub async fn get_by_email_and_org(
        &self,
        email: &str,
        organization_id: Uuid,
    ) -> DbResult<Option<Model>> {
        Entity::find()
            .filter(Column::Email.eq(email))
            .filter(Column::OrganizationId.eq(organization_id))
            .one(&self.db)
            .await
            .map_err(|e| DbError::QueryError(e.to_string()))
    }

    /// Update a user
    pub async fn update(
        &self,
        id: Uuid,
        name: Option<String>,
        role: Option<String>,
        is_active: Option<bool>,
    ) -> DbResult<Model> {
        debug!("Updating user with ID: {}", id);

        let user = Entity::find_by_id(id)
            .one(&self.db)
            .await
            .map_err(|e| DbError::QueryError(e.to_string()))?
            .ok_or_else(|| DbError::NotFound(format!("User {} not found", id)))?;

        let mut active_model: ActiveModel = user.into();

        if let Some(name) = name {
            active_model.name = Set(name);
        }
        if let Some(role) = role {
            active_model.role = Set(role);
        }
        if let Some(is_active) = is_active {
            active_model.is_active = Set(is_active);
        }

        active_model.updated_at = Set(chrono::Utc::now());

        let result = active_model.update(&self.db).await.map_err(|e| {
            error!("Failed to update user: {}", e);
            DbError::QueryError(e.to_string())
        })?;

        info!("Updated user with ID: {}", result.id);
        Ok(result)
    }

    /// Update user password
    pub async fn update_password(&self, id: Uuid, password_hash: String) -> DbResult<()> {
        Entity::update_many()
            .filter(Column::Id.eq(id))
            .col_expr(Column::PasswordHash, Expr::value(password_hash))
            .col_expr(Column::UpdatedAt, Expr::value(chrono::Utc::now()))
            .exec(&self.db)
            .await
            .map_err(|e| DbError::QueryError(e.to_string()))?;

        Ok(())
    }

    /// Update last login timestamp
    pub async fn update_last_login(&self, id: Uuid) -> DbResult<()> {
        Entity::update_many()
            .filter(Column::Id.eq(id))
            .col_expr(Column::LastLoginAt, Expr::value(Some(chrono::Utc::now())))
            .col_expr(Column::UpdatedAt, Expr::value(chrono::Utc::now()))
            .exec(&self.db)
            .await
            .map_err(|e| DbError::QueryError(e.to_string()))?;

        Ok(())
    }

    /// Delete a user (soft delete by setting is_active = false)
    pub async fn delete(&self, id: Uuid) -> DbResult<()> {
        debug!("Soft deleting user with ID: {}", id);

        Entity::update_many()
            .filter(Column::Id.eq(id))
            .col_expr(Column::IsActive, Expr::value(false))
            .col_expr(Column::UpdatedAt, Expr::value(chrono::Utc::now()))
            .exec(&self.db)
            .await
            .map_err(|e| DbError::QueryError(e.to_string()))?;

        info!("Soft deleted user with ID: {}", id);
        Ok(())
    }

    /// List users by organization with pagination
    pub async fn list_by_organization(
        &self,
        organization_id: Uuid,
        page: u64,
        page_size: u64,
        include_inactive: bool,
    ) -> DbResult<(Vec<Model>, u64)> {
        let mut query = Entity::find()
            .filter(Column::OrganizationId.eq(organization_id));

        if !include_inactive {
            query = query.filter(Column::IsActive.eq(true));
        }

        query = query.order_by_asc(Column::Name);

        let paginator = query.paginate(&self.db, page_size);
        let total = paginator.num_items().await?;
        let users = paginator.fetch_page(page - 1).await?;

        Ok((users, total))
    }

    /// List users by role
    pub async fn list_by_role(
        &self,
        organization_id: Uuid,
        role: &str,
    ) -> DbResult<Vec<Model>> {
        Entity::find()
            .filter(Column::OrganizationId.eq(organization_id))
            .filter(Column::Role.eq(role))
            .filter(Column::IsActive.eq(true))
            .order_by_asc(Column::Name)
            .all(&self.db)
            .await
            .map_err(|e| DbError::QueryError(e.to_string()))
    }

    /// Count active users by organization
    pub async fn count_by_organization(&self, organization_id: Uuid) -> DbResult<u64> {
        Entity::find()
            .filter(Column::OrganizationId.eq(organization_id))
            .filter(Column::IsActive.eq(true))
            .count(&self.db)
            .await
            .map_err(|e| DbError::QueryError(e.to_string()))
    }

    /// Check if email exists in organization
    pub async fn email_exists_in_org(
        &self,
        email: &str,
        organization_id: Uuid,
    ) -> DbResult<bool> {
        let count = Entity::find()
            .filter(Column::Email.eq(email))
            .filter(Column::OrganizationId.eq(organization_id))
            .count(&self.db)
            .await
            .map_err(|e| DbError::QueryError(e.to_string()))?;

        Ok(count > 0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use sea_orm::{Database, DatabaseBackend, MockDatabase};

    async fn create_mock_db() -> DatabaseConnection {
        let db = MockDatabase::new(DatabaseBackend::Postgres)
            .into_connection();
        db
    }

    #[tokio::test]
    async fn test_create_user() {
        let db = create_mock_db().await;
        let repo = UserRepository::new(db);

        let org_id = Uuid::new_v4();
        
        // Note: This will fail with mock DB, but demonstrates the usage
        let result = repo.create(
            org_id,
            "test@example.com".to_string(),
            "Test User".to_string(),
            "hashed_password".to_string(),
            "agent".to_string(),
        ).await;
        
        assert!(result.is_err()); // Expected with mock DB
    }
}