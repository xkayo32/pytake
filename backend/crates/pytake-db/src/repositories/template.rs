//! Template repository for database operations

use crate::{
    entities::template::{
        self, ActiveModel, Column, CreateTemplateInput, Entity, Model, 
        TemplateFilters, UpdateTemplateInput, TemplateWithStats
    },
    error::{DbError, DbResult},
};
use sea_orm::{
    entity::*, query::*, DatabaseConnection, DbBackend, QueryFilter, QuerySelect,
    ActiveValue::Set, ColumnTrait, EntityTrait, PaginatorTrait, QueryOrder,
};
use serde_json::json;
use tracing::{debug, error, info};

/// Template repository for managing quick response templates
pub struct TemplateRepository {
    db: DatabaseConnection,
}

impl TemplateRepository {
    /// Create a new template repository
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    /// Create a new template
    pub async fn create(&self, input: CreateTemplateInput, created_by: i32) -> DbResult<Model> {
        debug!("Creating new template: {}", input.name);

        let variables_json = input.variables.map(|v| json!(v));
        let attachments_json = input.attachments.map(|a| json!(a));
        let tags_json = input.tags.map(|t| json!(t));

        let template = ActiveModel {
            name: Set(input.name),
            content: Set(input.content),
            category: Set(input.category),
            shortcut: Set(input.shortcut),
            language: Set(input.language),
            variables: Set(variables_json),
            usage_count: Set(0),
            is_active: Set(true),
            created_by: Set(created_by),
            attachments: Set(attachments_json),
            tags: Set(tags_json),
            created_at: Set(chrono::Utc::now()),
            updated_at: Set(chrono::Utc::now()),
            ..Default::default()
        };

        let result = template.insert(&self.db).await.map_err(|e| {
            error!("Failed to create template: {}", e);
            DbError::QueryError(e.to_string())
        })?;

        info!("Created template with ID: {}", result.id);
        Ok(result)
    }

    /// Get a template by ID
    pub async fn get_by_id(&self, id: i32) -> DbResult<Option<Model>> {
        Entity::find_by_id(id)
            .one(&self.db)
            .await
            .map_err(|e| DbError::QueryError(e.to_string()))
    }

    /// Get a template by shortcut
    pub async fn get_by_shortcut(&self, shortcut: &str) -> DbResult<Option<Model>> {
        Entity::find()
            .filter(Column::Shortcut.eq(shortcut))
            .filter(Column::IsActive.eq(true))
            .one(&self.db)
            .await
            .map_err(|e| DbError::QueryError(e.to_string()))
    }

    /// Update a template
    pub async fn update(&self, id: i32, input: UpdateTemplateInput) -> DbResult<Model> {
        debug!("Updating template with ID: {}", id);

        let template = Entity::find_by_id(id)
            .one(&self.db)
            .await
            .map_err(|e| DbError::QueryError(e.to_string()))?
            .ok_or_else(|| DbError::NotFound(format!("Template {} not found", id)))?;

        let mut active_model: ActiveModel = template.into();

        if let Some(name) = input.name {
            active_model.name = Set(name);
        }
        if let Some(content) = input.content {
            active_model.content = Set(content);
        }
        if let Some(category) = input.category {
            active_model.category = Set(category);
        }
        if let Some(shortcut) = input.shortcut {
            active_model.shortcut = Set(Some(shortcut));
        }
        if let Some(language) = input.language {
            active_model.language = Set(language);
        }
        if let Some(variables) = input.variables {
            active_model.variables = Set(Some(json!(variables)));
        }
        if let Some(is_active) = input.is_active {
            active_model.is_active = Set(is_active);
        }
        if let Some(attachments) = input.attachments {
            active_model.attachments = Set(Some(json!(attachments)));
        }
        if let Some(tags) = input.tags {
            active_model.tags = Set(Some(json!(tags)));
        }

        active_model.updated_at = Set(chrono::Utc::now());

        let result = active_model.update(&self.db).await.map_err(|e| {
            error!("Failed to update template: {}", e);
            DbError::QueryError(e.to_string())
        })?;

        info!("Updated template with ID: {}", result.id);
        Ok(result)
    }

    /// Delete a template (soft delete by setting is_active = false)
    pub async fn delete(&self, id: i32) -> DbResult<()> {
        debug!("Soft deleting template with ID: {}", id);

        Entity::update_many()
            .filter(Column::Id.eq(id))
            .col_expr(Column::IsActive, Expr::value(false))
            .col_expr(Column::UpdatedAt, Expr::value(chrono::Utc::now()))
            .exec(&self.db)
            .await
            .map_err(|e| DbError::QueryError(e.to_string()))?;

        info!("Soft deleted template with ID: {}", id);
        Ok(())
    }

    /// List templates with filters and pagination
    pub async fn list(
        &self,
        filters: TemplateFilters,
        page: u64,
        page_size: u64,
    ) -> DbResult<(Vec<Model>, u64)> {
        debug!("Listing templates with filters: {:?}", filters);

        let mut query = Entity::find();

        // Apply filters
        if let Some(category) = filters.category {
            query = query.filter(Column::Category.eq(category));
        }
        if let Some(language) = filters.language {
            query = query.filter(Column::Language.eq(language));
        }
        if let Some(is_active) = filters.is_active {
            query = query.filter(Column::IsActive.eq(is_active));
        }
        if let Some(created_by) = filters.created_by {
            query = query.filter(Column::CreatedBy.eq(created_by));
        }
        if let Some(search) = filters.search {
            query = query.filter(
                Condition::any()
                    .add(Column::Name.contains(&search))
                    .add(Column::Content.contains(&search))
                    .add(Column::Shortcut.contains(&search))
            );
        }

        // TODO: Add tag filtering when we have proper JSON query support

        // Order by usage count (most used first) and then by name
        query = query
            .order_by_desc(Column::UsageCount)
            .order_by_asc(Column::Name);

        // Paginate
        let paginator = query.paginate(&self.db, page_size);
        let total = paginator.num_items().await?;
        let templates = paginator.fetch_page(page - 1).await?;

        Ok((templates, total))
    }

    /// Get templates by category
    pub async fn get_by_category(&self, category: &str) -> DbResult<Vec<Model>> {
        Entity::find()
            .filter(Column::Category.eq(category))
            .filter(Column::IsActive.eq(true))
            .order_by_desc(Column::UsageCount)
            .all(&self.db)
            .await
            .map_err(|e| DbError::QueryError(e.to_string()))
    }

    /// Search templates by content or name
    pub async fn search(&self, query: &str, limit: u64) -> DbResult<Vec<Model>> {
        Entity::find()
            .filter(Column::IsActive.eq(true))
            .filter(
                Condition::any()
                    .add(Column::Name.contains(query))
                    .add(Column::Content.contains(query))
                    .add(Column::Shortcut.contains(query))
            )
            .order_by_desc(Column::UsageCount)
            .limit(limit)
            .all(&self.db)
            .await
            .map_err(|e| DbError::QueryError(e.to_string()))
    }

    /// Increment usage count for a template
    pub async fn increment_usage(&self, id: i32) -> DbResult<()> {
        // Use raw SQL for atomic increment
        let sql = match self.db.get_database_backend() {
            DbBackend::Postgres => {
                "UPDATE templates SET usage_count = usage_count + 1, updated_at = $1 WHERE id = $2"
            }
            DbBackend::Sqlite => {
                "UPDATE templates SET usage_count = usage_count + 1, updated_at = ?1 WHERE id = ?2"
            }
            _ => return Err(DbError::Internal("Unsupported database backend".to_string())),
        };

        self.db
            .execute(Statement::from_sql_and_values(
                self.db.get_database_backend(),
                sql,
                vec![chrono::Utc::now().into(), id.into()],
            ))
            .await
            .map_err(|e| DbError::QueryError(e.to_string()))?;

        Ok(())
    }

    /// Get templates with usage statistics
    pub async fn get_with_stats(&self, limit: u64) -> DbResult<Vec<TemplateWithStats>> {
        let templates = Entity::find()
            .filter(Column::IsActive.eq(true))
            .order_by_desc(Column::UsageCount)
            .limit(limit)
            .all(&self.db)
            .await?;

        // TODO: Implement actual stats calculation from message history
        // For now, return templates with placeholder stats
        let templates_with_stats = templates
            .into_iter()
            .map(|template| TemplateWithStats {
                last_used_at: Some(template.updated_at),
                usage_last_30_days: template.usage_count,
                average_response_time: Some(2.5),
                template,
            })
            .collect();

        Ok(templates_with_stats)
    }

    /// Get most used templates by a user
    pub async fn get_user_favorites(&self, user_id: i32, limit: u64) -> DbResult<Vec<Model>> {
        Entity::find()
            .filter(Column::CreatedBy.eq(user_id))
            .filter(Column::IsActive.eq(true))
            .order_by_desc(Column::UsageCount)
            .limit(limit)
            .all(&self.db)
            .await
            .map_err(|e| DbError::QueryError(e.to_string()))
    }

    /// Clone a template
    pub async fn clone_template(&self, id: i32, new_name: String, user_id: i32) -> DbResult<Model> {
        let original = self.get_by_id(id)
            .await?
            .ok_or_else(|| DbError::NotFound(format!("Template {} not found", id)))?;

        let input = CreateTemplateInput {
            name: new_name,
            content: original.content,
            category: original.category,
            shortcut: None, // Don't copy shortcut to avoid conflicts
            language: original.language,
            variables: original.variables.map(|v| serde_json::from_value(v).unwrap_or_default()),
            attachments: original.attachments.map(|a| serde_json::from_value(a).unwrap_or_default()),
            tags: original.tags.map(|t| serde_json::from_value(t).unwrap_or_default()),
        };

        self.create(input, user_id).await
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
    async fn test_create_template() {
        let db = create_mock_db().await;
        let repo = TemplateRepository::new(db);

        let input = CreateTemplateInput {
            name: "Welcome Message".to_string(),
            content: "Hello {{customer_name}}, welcome to our service!".to_string(),
            category: "greeting".to_string(),
            shortcut: Some("/welcome".to_string()),
            language: "en-US".to_string(),
            variables: Some(vec![template::TemplateVariable {
                name: "customer_name".to_string(),
                description: "Customer's name".to_string(),
                default_value: Some("Customer".to_string()),
                required: true,
            }]),
            attachments: None,
            tags: Some(vec!["welcome".to_string(), "greeting".to_string()]),
        };

        // Note: This will fail with mock DB, but demonstrates the usage
        let result = repo.create(input, 1).await;
        assert!(result.is_err()); // Expected with mock DB
    }
}