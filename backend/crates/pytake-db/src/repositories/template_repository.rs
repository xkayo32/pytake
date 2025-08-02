use crate::entities::{prelude::*, template};
use sea_orm::*;
use uuid::Uuid;
use chrono::Utc;
use serde_json::json;

#[derive(Clone, Debug)]
pub struct TemplateRepository {
    db: DatabaseConnection,
}

impl TemplateRepository {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    /// Create a new template
    pub async fn create(
        &self,
        organization_id: Uuid,
        created_by: Uuid,
        name: String,
        content: String,
        category: String,
        shortcut: Option<String>,
        language: Option<String>,
        variables: Option<serde_json::Value>,
        tags: Option<Vec<String>>,
    ) -> Result<template::Model, DbErr> {
        let template = template::ActiveModel {
            id: Set(Uuid::new_v4()),
            organization_id: Set(organization_id),
            created_by: Set(created_by),
            name: Set(name),
            content: Set(content),
            category: Set(category),
            shortcut: Set(shortcut),
            language: Set(language.unwrap_or_else(|| "pt-BR".to_string())),
            variables: Set(variables.unwrap_or_else(|| json!([]))),
            is_active: Set(true),
            usage_count: Set(0),
            tags: Set(tags),
            attachments: Set(None),
            created_at: Set(Utc::now()),
            updated_at: Set(Utc::now()),
            ..Default::default()
        };

        template.insert(&self.db).await
    }

    /// Find template by ID
    pub async fn find_by_id(
        &self,
        id: Uuid,
        organization_id: Uuid,
    ) -> Result<Option<template::Model>, DbErr> {
        Template::find()
            .filter(template::Column::Id.eq(id))
            .filter(template::Column::OrganizationId.eq(organization_id))
            .one(&self.db)
            .await
    }

    /// Find template by shortcut
    pub async fn find_by_shortcut(
        &self,
        shortcut: &str,
        organization_id: Uuid,
    ) -> Result<Option<template::Model>, DbErr> {
        Template::find()
            .filter(template::Column::Shortcut.eq(shortcut))
            .filter(template::Column::OrganizationId.eq(organization_id))
            .filter(template::Column::IsActive.eq(true))
            .one(&self.db)
            .await
    }

    /// List templates with pagination and filters
    pub async fn list(
        &self,
        organization_id: Uuid,
        page: u64,
        page_size: u64,
        category: Option<String>,
        search: Option<String>,
        is_active: Option<bool>,
    ) -> Result<(Vec<template::Model>, u64), DbErr> {
        let mut query = Template::find()
            .filter(template::Column::OrganizationId.eq(organization_id));

        if let Some(cat) = category {
            query = query.filter(template::Column::Category.eq(cat));
        }

        if let Some(active) = is_active {
            query = query.filter(template::Column::IsActive.eq(active));
        }

        if let Some(search_term) = search {
            query = query.filter(
                Condition::any()
                    .add(template::Column::Name.contains(&search_term))
                    .add(template::Column::Content.contains(&search_term))
                    .add(template::Column::Shortcut.contains(&search_term))
            );
        }

        let paginator = query
            .order_by_desc(template::Column::UsageCount)
            .order_by_desc(template::Column::UpdatedAt)
            .paginate(&self.db, page_size);

        let total = paginator.num_items().await?;
        let templates = paginator.fetch_page(page - 1).await?;

        Ok((templates, total))
    }

    /// Update template
    pub async fn update(
        &self,
        id: Uuid,
        organization_id: Uuid,
        name: Option<String>,
        content: Option<String>,
        category: Option<String>,
        shortcut: Option<String>,
        language: Option<String>,
        variables: Option<serde_json::Value>,
        is_active: Option<bool>,
        tags: Option<Vec<String>>,
    ) -> Result<template::Model, DbErr> {
        let template = Template::find()
            .filter(template::Column::Id.eq(id))
            .filter(template::Column::OrganizationId.eq(organization_id))
            .one(&self.db)
            .await?
            .ok_or(DbErr::RecordNotFound("Template not found".to_string()))?;

        let mut active_model: template::ActiveModel = template.into();

        if let Some(n) = name {
            active_model.name = Set(n);
        }
        if let Some(c) = content {
            active_model.content = Set(c);
        }
        if let Some(cat) = category {
            active_model.category = Set(cat);
        }
        if let Some(s) = shortcut {
            active_model.shortcut = Set(Some(s));
        }
        if let Some(l) = language {
            active_model.language = Set(l);
        }
        if let Some(v) = variables {
            active_model.variables = Set(v);
        }
        if let Some(a) = is_active {
            active_model.is_active = Set(a);
        }
        if let Some(t) = tags {
            active_model.tags = Set(Some(t));
        }

        active_model.updated_at = Set(Utc::now());
        active_model.update(&self.db).await
    }

    /// Delete template (soft delete by marking inactive)
    pub async fn delete(
        &self,
        id: Uuid,
        organization_id: Uuid,
    ) -> Result<(), DbErr> {
        Template::update_many()
            .filter(template::Column::Id.eq(id))
            .filter(template::Column::OrganizationId.eq(organization_id))
            .col_expr(template::Column::IsActive, Expr::value(false))
            .col_expr(template::Column::UpdatedAt, Expr::value(Utc::now()))
            .exec(&self.db)
            .await?;

        Ok(())
    }

    /// Increment usage count
    pub async fn increment_usage(
        &self,
        id: Uuid,
    ) -> Result<(), DbErr> {
        Template::update_many()
            .filter(template::Column::Id.eq(id))
            .col_expr(
                template::Column::UsageCount,
                Expr::col(template::Column::UsageCount).add(1),
            )
            .exec(&self.db)
            .await?;

        Ok(())
    }

    /// Get most used templates
    pub async fn get_most_used(
        &self,
        organization_id: Uuid,
        limit: u64,
    ) -> Result<Vec<template::Model>, DbErr> {
        Template::find()
            .filter(template::Column::OrganizationId.eq(organization_id))
            .filter(template::Column::IsActive.eq(true))
            .order_by_desc(template::Column::UsageCount)
            .limit(limit)
            .all(&self.db)
            .await
    }

    /// Search templates by content
    pub async fn search(
        &self,
        organization_id: Uuid,
        query: &str,
        limit: u64,
    ) -> Result<Vec<template::Model>, DbErr> {
        Template::find()
            .filter(template::Column::OrganizationId.eq(organization_id))
            .filter(template::Column::IsActive.eq(true))
            .filter(
                Condition::any()
                    .add(template::Column::Name.contains(query))
                    .add(template::Column::Content.contains(query))
                    .add(template::Column::Shortcut.contains(query))
            )
            .order_by_desc(template::Column::UsageCount)
            .limit(limit)
            .all(&self.db)
            .await
    }

    /// Get templates by category
    pub async fn get_by_category(
        &self,
        organization_id: Uuid,
        category: &str,
    ) -> Result<Vec<template::Model>, DbErr> {
        Template::find()
            .filter(template::Column::OrganizationId.eq(organization_id))
            .filter(template::Column::Category.eq(category))
            .filter(template::Column::IsActive.eq(true))
            .order_by_desc(template::Column::UsageCount)
            .all(&self.db)
            .await
    }

    /// Get unique categories
    pub async fn get_categories(
        &self,
        organization_id: Uuid,
    ) -> Result<Vec<String>, DbErr> {
        let results = Template::find()
            .select_only()
            .column(template::Column::Category)
            .filter(template::Column::OrganizationId.eq(organization_id))
            .filter(template::Column::IsActive.eq(true))
            .group_by(template::Column::Category)
            .into_tuple::<String>()
            .all(&self.db)
            .await?;

        Ok(results)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::*;

    #[tokio::test]
    async fn test_template_crud() {
        let db = setup_test_db().await;
        let repo = TemplateRepository::new(db);
        
        let org_id = Uuid::new_v4();
        let user_id = Uuid::new_v4();
        
        // Create
        let template = repo.create(
            org_id,
            user_id,
            "Welcome Message".to_string(),
            "Hello {{name}}, welcome to our service!".to_string(),
            "greeting".to_string(),
            Some("/welcome".to_string()),
            None,
            Some(json!([
                {
                    "name": "name",
                    "description": "Customer name",
                    "required": true
                }
            ])),
            Some(vec!["welcome".to_string(), "greeting".to_string()]),
        ).await.unwrap();
        
        assert_eq!(template.name, "Welcome Message");
        assert_eq!(template.shortcut, Some("/welcome".to_string()));
        
        // Find by ID
        let found = repo.find_by_id(template.id, org_id).await.unwrap();
        assert!(found.is_some());
        
        // Update
        let updated = repo.update(
            template.id,
            org_id,
            Some("Updated Welcome".to_string()),
            None,
            None,
            None,
            None,
            None,
            None,
            None,
        ).await.unwrap();
        
        assert_eq!(updated.name, "Updated Welcome");
        
        // Delete
        repo.delete(template.id, org_id).await.unwrap();
        
        let deleted = repo.find_by_id(template.id, org_id).await.unwrap().unwrap();
        assert!(!deleted.is_active);
    }
}