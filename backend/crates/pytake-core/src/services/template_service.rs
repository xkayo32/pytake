//! Template service for managing quick response templates

use crate::errors::{CoreError, CoreResult};
// Temporarily commented out to fix compilation
// use pytake_db::{
//     entities::template::{
//         CreateTemplateInput, Model as Template, TemplateFilters, 
//         TemplateVariable, UpdateTemplateInput, TemplateWithStats
//     },
//     repositories::template::TemplateRepository,
// };

// Temporary types for compilation
pub struct CreateTemplateInput;
pub struct Template;
pub struct TemplateFilters;
pub struct TemplateVariable;
pub struct UpdateTemplateInput;
pub struct TemplateWithStats;
pub struct TemplateRepository;
use regex::Regex;
use sea_orm::DatabaseConnection;
use std::collections::HashMap;
use std::sync::Arc;
use tracing::{debug, error, info};

/// Template service for managing quick response templates
pub struct TemplateService {
    template_repo: TemplateRepository,
    variable_regex: Regex,
}

impl TemplateService {
    /// Create a new template service
    pub fn new(db: Arc<DatabaseConnection>) -> Self {
        Self {
            template_repo: TemplateRepository::new((*db).clone()),
            variable_regex: Regex::new(r"\{\{(\w+)\}\}").unwrap(),
        }
    }

    /// Create a new template
    pub async fn create_template(
        &self,
        input: CreateTemplateInput,
        created_by: i32,
    ) -> CoreResult<Template> {
        info!("Creating new template: {}", input.name);

        // Validate template
        self.validate_template(&input)?;

        // Extract variables from content
        let variables = self.extract_variables(&input.content);
        
        // Merge with provided variables
        let final_variables = self.merge_variables(variables, input.variables);

        let template_input = CreateTemplateInput {
            variables: Some(final_variables),
            ..input
        };

        self.template_repo
            .create(template_input, created_by)
            .await
            .map_err(|e| CoreError::Database(e.to_string()))
    }

    /// Update an existing template
    pub async fn update_template(
        &self,
        id: i32,
        input: UpdateTemplateInput,
        user_id: i32,
    ) -> CoreResult<Template> {
        info!("Updating template: {}", id);

        // Check if user owns the template or is admin
        let template = self.get_template(id).await?;
        if template.created_by != user_id {
            // TODO: Add admin check
            return Err(CoreError::Unauthorized("You can only update your own templates".into()));
        }

        // If content is being updated, extract variables
        let final_input = if let Some(content) = &input.content {
            let variables = self.extract_variables(content);
            let final_variables = self.merge_variables(variables, input.variables);
            UpdateTemplateInput {
                variables: Some(final_variables),
                ..input
            }
        } else {
            input
        };

        self.template_repo
            .update(id, final_input)
            .await
            .map_err(|e| CoreError::Database(e.to_string()))
    }

    /// Get a template by ID
    pub async fn get_template(&self, id: i32) -> CoreResult<Template> {
        self.template_repo
            .get_by_id(id)
            .await
            .map_err(|e| CoreError::Database(e.to_string()))?
            .ok_or_else(|| CoreError::NotFound(format!("Template {} not found", id)))
    }

    /// Get a template by shortcut
    pub async fn get_template_by_shortcut(&self, shortcut: &str) -> CoreResult<Template> {
        self.template_repo
            .get_by_shortcut(shortcut)
            .await
            .map_err(|e| CoreError::Database(e.to_string()))?
            .ok_or_else(|| CoreError::NotFound(format!("Template with shortcut '{}' not found", shortcut)))
    }

    /// Delete a template (soft delete)
    pub async fn delete_template(&self, id: i32, user_id: i32) -> CoreResult<()> {
        // Check if user owns the template
        let template = self.get_template(id).await?;
        if template.created_by != user_id {
            return Err(CoreError::Unauthorized("You can only delete your own templates".into()));
        }

        self.template_repo
            .delete(id)
            .await
            .map_err(|e| CoreError::Database(e.to_string()))
    }

    /// List templates with filters
    pub async fn list_templates(
        &self,
        filters: TemplateFilters,
        page: u64,
        page_size: u64,
    ) -> CoreResult<(Vec<Template>, u64)> {
        self.template_repo
            .list(filters, page, page_size)
            .await
            .map_err(|e| CoreError::Database(e.to_string()))
    }

    /// Search templates
    pub async fn search_templates(&self, query: &str, limit: u64) -> CoreResult<Vec<Template>> {
        if query.len() < 2 {
            return Err(CoreError::Validation("Search query must be at least 2 characters".into()));
        }

        self.template_repo
            .search(query, limit)
            .await
            .map_err(|e| CoreError::Database(e.to_string()))
    }

    /// Get templates by category
    pub async fn get_templates_by_category(&self, category: &str) -> CoreResult<Vec<Template>> {
        self.template_repo
            .get_by_category(category)
            .await
            .map_err(|e| CoreError::Database(e.to_string()))
    }

    /// Get user's favorite templates (most used)
    pub async fn get_user_favorites(&self, user_id: i32, limit: u64) -> CoreResult<Vec<Template>> {
        self.template_repo
            .get_user_favorites(user_id, limit)
            .await
            .map_err(|e| CoreError::Database(e.to_string()))
    }

    /// Get templates with usage statistics
    pub async fn get_templates_with_stats(&self, limit: u64) -> CoreResult<Vec<TemplateWithStats>> {
        self.template_repo
            .get_with_stats(limit)
            .await
            .map_err(|e| CoreError::Database(e.to_string()))
    }

    /// Use a template (increment usage count and apply variables)
    pub async fn use_template(
        &self,
        id: i32,
        variables: HashMap<String, String>,
    ) -> CoreResult<String> {
        let template = self.get_template(id).await?;
        
        // Increment usage count
        self.template_repo
            .increment_usage(id)
            .await
            .map_err(|e| CoreError::Database(e.to_string()))?;

        // Apply variables to content
        let processed_content = self.apply_variables(&template.content, variables)?;

        Ok(processed_content)
    }

    /// Clone a template
    pub async fn clone_template(
        &self,
        id: i32,
        new_name: String,
        user_id: i32,
    ) -> CoreResult<Template> {
        self.template_repo
            .clone_template(id, new_name, user_id)
            .await
            .map_err(|e| CoreError::Database(e.to_string()))
    }

    /// Extract variables from template content
    fn extract_variables(&self, content: &str) -> Vec<TemplateVariable> {
        let mut variables = Vec::new();
        let mut seen = std::collections::HashSet::new();

        for cap in self.variable_regex.captures_iter(content) {
            if let Some(var_name) = cap.get(1) {
                let name = var_name.as_str().to_string();
                if seen.insert(name.clone()) {
                    variables.push(TemplateVariable {
                        name: name.clone(),
                        description: format!("Variable: {}", name),
                        default_value: None,
                        required: true,
                    });
                }
            }
        }

        variables
    }

    /// Merge extracted variables with provided variables
    fn merge_variables(
        &self,
        extracted: Vec<TemplateVariable>,
        provided: Option<Vec<TemplateVariable>>,
    ) -> Vec<TemplateVariable> {
        let mut result = HashMap::new();

        // Add extracted variables
        for var in extracted {
            result.insert(var.name.clone(), var);
        }

        // Override with provided variables
        if let Some(provided_vars) = provided {
            for var in provided_vars {
                result.insert(var.name.clone(), var);
            }
        }

        result.into_values().collect()
    }

    /// Apply variables to template content
    fn apply_variables(
        &self,
        content: &str,
        variables: HashMap<String, String>,
    ) -> CoreResult<String> {
        let mut processed = content.to_string();
        let mut missing_vars = Vec::new();

        for cap in self.variable_regex.captures_iter(content) {
            if let Some(var_match) = cap.get(0) {
                if let Some(var_name) = cap.get(1) {
                    let name = var_name.as_str();
                    if let Some(value) = variables.get(name) {
                        processed = processed.replace(var_match.as_str(), value);
                    } else {
                        missing_vars.push(name);
                    }
                }
            }
        }

        if !missing_vars.is_empty() {
            return Err(CoreError::Validation(
                format!("Missing required variables: {}", missing_vars.join(", "))
            ));
        }

        Ok(processed)
    }

    /// Validate template input
    fn validate_template(&self, input: &CreateTemplateInput) -> CoreResult<()> {
        // Validate name
        if input.name.trim().is_empty() {
            return Err(CoreError::Validation("Template name cannot be empty".into()));
        }

        if input.name.len() > 100 {
            return Err(CoreError::Validation("Template name must be less than 100 characters".into()));
        }

        // Validate content
        if input.content.trim().is_empty() {
            return Err(CoreError::Validation("Template content cannot be empty".into()));
        }

        if input.content.len() > 4096 {
            return Err(CoreError::Validation("Template content must be less than 4096 characters".into()));
        }

        // Validate shortcut if provided
        if let Some(shortcut) = &input.shortcut {
            if !shortcut.starts_with('/') {
                return Err(CoreError::Validation("Shortcut must start with '/'".into()));
            }

            if shortcut.len() < 2 || shortcut.len() > 20 {
                return Err(CoreError::Validation("Shortcut must be between 2 and 20 characters".into()));
            }

            // Only allow alphanumeric and underscore in shortcuts
            let shortcut_regex = Regex::new(r"^/[a-zA-Z0-9_]+$").unwrap();
            if !shortcut_regex.is_match(shortcut) {
                return Err(CoreError::Validation(
                    "Shortcut can only contain letters, numbers, and underscores".into()
                ));
            }
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_variables() {
        let service = TemplateService {
            template_repo: TemplateRepository::new(sea_orm::Database::connect("sqlite::memory:").await.unwrap()),
            variable_regex: Regex::new(r"\{\{(\w+)\}\}").unwrap(),
        };

        let content = "Hello {{name}}, your order {{order_id}} is ready!";
        let vars = service.extract_variables(content);

        assert_eq!(vars.len(), 2);
        assert_eq!(vars[0].name, "name");
        assert_eq!(vars[1].name, "order_id");
    }

    #[test]
    fn test_apply_variables() {
        let service = TemplateService {
            template_repo: TemplateRepository::new(sea_orm::Database::connect("sqlite::memory:").await.unwrap()),
            variable_regex: Regex::new(r"\{\{(\w+)\}\}").unwrap(),
        };

        let content = "Hello {{name}}, your order {{order_id}} is ready!";
        let mut variables = HashMap::new();
        variables.insert("name".to_string(), "John".to_string());
        variables.insert("order_id".to_string(), "12345".to_string());

        let result = service.apply_variables(content, variables).unwrap();
        assert_eq!(result, "Hello John, your order 12345 is ready!");
    }

    #[test]
    fn test_apply_variables_missing() {
        let service = TemplateService {
            template_repo: TemplateRepository::new(sea_orm::Database::connect("sqlite::memory:").await.unwrap()),
            variable_regex: Regex::new(r"\{\{(\w+)\}\}").unwrap(),
        };

        let content = "Hello {{name}}!";
        let variables = HashMap::new();

        let result = service.apply_variables(content, variables);
        assert!(result.is_err());
    }

    #[test]
    fn test_validate_shortcut() {
        let service = TemplateService {
            template_repo: TemplateRepository::new(sea_orm::Database::connect("sqlite::memory:").await.unwrap()),
            variable_regex: Regex::new(r"\{\{(\w+)\}\}").unwrap(),
        };

        let valid_input = CreateTemplateInput {
            name: "Test".to_string(),
            content: "Content".to_string(),
            category: "test".to_string(),
            shortcut: Some("/test123".to_string()),
            language: "en".to_string(),
            variables: None,
            attachments: None,
            tags: None,
        };

        assert!(service.validate_template(&valid_input).is_ok());

        let invalid_input = CreateTemplateInput {
            shortcut: Some("test".to_string()), // Missing /
            ..valid_input
        };

        assert!(service.validate_template(&invalid_input).is_err());
    }
}