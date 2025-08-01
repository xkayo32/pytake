//! Response templates service for quick agent responses

use crate::errors::{CoreError, CoreResult};
use crate::messaging::Platform;
use async_trait::async_trait;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;
use tracing::{debug, info, warn, error};

/// Template category for organization
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "snake_case")]
pub enum TemplateCategory {
    /// Greeting messages
    Greeting,
    /// Thank you messages
    Gratitude,
    /// Away/unavailable messages
    Away,
    /// Information requests
    Information,
    /// Product/service support
    Support,
    /// Sales/marketing responses
    Sales,
    /// Escalation messages
    Escalation,
    /// Closing/farewell messages
    Farewell,
    /// FAQ responses
    Faq,
    /// Apology messages
    Apology,
    /// Follow-up messages
    FollowUp,
    /// Custom category
    Custom(String),
}

/// Template content types
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TemplateContentType {
    /// Plain text
    Text,
    /// Rich text with formatting
    RichText,
    /// Template with variables
    Template,
    /// Interactive buttons
    Interactive,
    /// Media with caption
    Media,
}

/// Variable definition for templates
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TemplateVariable {
    pub name: String,
    pub description: String,
    pub default_value: Option<String>,
    pub required: bool,
    pub variable_type: VariableType,
}

/// Variable types
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum VariableType {
    Text,
    Number,
    Date,
    Time,
    DateTime,
    Boolean,
    Url,
    Email,
    Phone,
    Custom(String),
}

/// Template content with variables
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TemplateContent {
    pub content_type: TemplateContentType,
    pub text: String,
    pub variables: Vec<TemplateVariable>,
    pub media_url: Option<String>,
    pub media_type: Option<String>,
    pub buttons: Option<Vec<TemplateButton>>,
    pub quick_replies: Option<Vec<String>>,
}

/// Interactive button for templates
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TemplateButton {
    pub id: String,
    pub title: String,
    pub button_type: ButtonType,
    pub payload: Option<String>,
    pub url: Option<String>,
}

/// Button types
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ButtonType {
    Reply,
    Url,
    Call,
    QuickReply,
}

/// Response template
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResponseTemplate {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub category: TemplateCategory,
    pub content: TemplateContent,
    pub platforms: Vec<Platform>,
    pub departments: Vec<String>,
    pub tags: Vec<String>,
    pub is_active: bool,
    pub is_global: bool, // Available to all agents
    pub created_by: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub usage_count: u64,
    pub last_used_at: Option<DateTime<Utc>>,
}

/// Template creation request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateTemplateRequest {
    pub name: String,
    pub description: Option<String>,
    pub category: TemplateCategory,
    pub content: TemplateContent,
    pub platforms: Vec<Platform>,
    pub departments: Option<Vec<String>>,
    pub tags: Option<Vec<String>>,
    pub is_global: Option<bool>,
}

/// Template update request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateTemplateRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub category: Option<TemplateCategory>,
    pub content: Option<TemplateContent>,
    pub platforms: Option<Vec<Platform>>,
    pub departments: Option<Vec<String>>,
    pub tags: Option<Vec<String>>,
    pub is_active: Option<bool>,
    pub is_global: Option<bool>,
}

/// Template search filters
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TemplateFilters {
    pub category: Option<Vec<TemplateCategory>>,
    pub platform: Option<Vec<Platform>>,
    pub department: Option<String>,
    pub tags: Option<Vec<String>>,
    pub is_active: Option<bool>,
    pub is_global: Option<bool>,
    pub created_by: Option<Uuid>,
    pub search_text: Option<String>,
}

/// Template search options
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TemplateSearchOptions {
    pub filters: TemplateFilters,
    pub sort_by: TemplateSortBy,
    pub sort_order: SortOrder,
    pub page: u32,
    pub page_size: u32,
}

/// Template sorting options
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TemplateSortBy {
    Name,
    Category,
    CreatedAt,
    UpdatedAt,
    UsageCount,
    LastUsedAt,
}

/// Sort order
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SortOrder {
    Asc,
    Desc,
}

/// Paginated template results
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TemplatePage {
    pub templates: Vec<ResponseTemplate>,
    pub total_count: u64,
    pub page: u32,
    pub page_size: u32,
    pub total_pages: u32,
    pub has_next: bool,
    pub has_previous: bool,
}

/// Template usage statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TemplateStats {
    pub total_templates: u64,
    pub active_templates: u64,
    pub global_templates: u64,
    pub most_used_templates: Vec<(Uuid, String, u64)>, // (id, name, usage_count)
    pub templates_by_category: HashMap<TemplateCategory, u64>,
    pub templates_by_platform: HashMap<Platform, u64>,
}

/// Template rendering context
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct TemplateContext {
    pub variables: HashMap<String, serde_json::Value>,
    pub agent_name: Option<String>,
    pub customer_name: Option<String>,
    pub company_name: Option<String>,
    pub conversation_id: Option<Uuid>,
    pub platform: Option<Platform>,
}

/// Rendered template result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RenderedTemplate {
    pub template_id: Uuid,
    pub rendered_text: String,
    pub media_url: Option<String>,
    pub buttons: Option<Vec<TemplateButton>>,
    pub quick_replies: Option<Vec<String>>,
    pub variables_used: HashMap<String, serde_json::Value>,
}

/// Response templates service trait
#[async_trait]
pub trait ResponseTemplateService: Send + Sync {
    /// Create a new template
    async fn create_template(&self, request: CreateTemplateRequest, created_by: Uuid) -> CoreResult<ResponseTemplate>;
    
    /// Get template by ID
    async fn get_template(&self, id: Uuid) -> CoreResult<Option<ResponseTemplate>>;
    
    /// Update template
    async fn update_template(&self, id: Uuid, request: UpdateTemplateRequest, updated_by: Uuid) -> CoreResult<ResponseTemplate>;
    
    /// Delete template
    async fn delete_template(&self, id: Uuid, deleted_by: Uuid) -> CoreResult<()>;
    
    /// Search templates with filters and pagination
    async fn search_templates(&self, options: TemplateSearchOptions) -> CoreResult<TemplatePage>;
    
    /// Get templates by category
    async fn get_templates_by_category(&self, category: TemplateCategory, platform: Option<Platform>) -> CoreResult<Vec<ResponseTemplate>>;
    
    /// Get templates for agent/department
    async fn get_agent_templates(&self, agent_id: Uuid, department: Option<String>, platform: Option<Platform>) -> CoreResult<Vec<ResponseTemplate>>;
    
    /// Get global templates
    async fn get_global_templates(&self, platform: Option<Platform>) -> CoreResult<Vec<ResponseTemplate>>;
    
    /// Render template with context
    async fn render_template(&self, template_id: Uuid, context: TemplateContext) -> CoreResult<RenderedTemplate>;
    
    /// Duplicate template
    async fn duplicate_template(&self, template_id: Uuid, new_name: String, created_by: Uuid) -> CoreResult<ResponseTemplate>;
    
    /// Toggle template active status
    async fn toggle_template_status(&self, template_id: Uuid, is_active: bool, updated_by: Uuid) -> CoreResult<ResponseTemplate>;
    
    /// Record template usage
    async fn record_template_usage(&self, template_id: Uuid, used_by: Uuid) -> CoreResult<()>;
    
    /// Get template statistics
    async fn get_template_stats(&self, filters: Option<TemplateFilters>) -> CoreResult<TemplateStats>;
    
    /// Validate template content
    async fn validate_template(&self, content: &TemplateContent) -> CoreResult<Vec<String>>; // Returns validation errors
    
    /// Import templates from file
    async fn import_templates(&self, templates: Vec<CreateTemplateRequest>, imported_by: Uuid) -> CoreResult<Vec<ResponseTemplate>>;
    
    /// Export templates to file
    async fn export_templates(&self, filters: Option<TemplateFilters>) -> CoreResult<Vec<ResponseTemplate>>;
}

/// Default template service implementation
pub struct DefaultResponseTemplateService {
    // In a real implementation, this would have database connections
    templates: std::sync::RwLock<HashMap<Uuid, ResponseTemplate>>,
}

impl DefaultResponseTemplateService {
    /// Create new template service
    pub fn new() -> Self {
        Self {
            templates: std::sync::RwLock::new(HashMap::new()),
        }
    }
    
    /// Create sample templates for testing
    pub fn with_sample_templates(mut self) -> Self {
        let mut templates = HashMap::new();
        
        // Greeting template
        let greeting_template = ResponseTemplate {
            id: Uuid::new_v4(),
            name: "Saudação Padrão".to_string(),
            description: Some("Mensagem de boas-vindas para novos clientes".to_string()),
            category: TemplateCategory::Greeting,
            content: TemplateContent {
                content_type: TemplateContentType::Template,
                text: "Olá {{customer_name}}! 👋 Bem-vindo(a) à {{company_name}}. Como posso ajudá-lo(a) hoje?".to_string(),
                variables: vec![
                    TemplateVariable {
                        name: "customer_name".to_string(),
                        description: "Nome do cliente".to_string(),
                        default_value: Some("Cliente".to_string()),
                        required: false,
                        variable_type: VariableType::Text,
                    },
                    TemplateVariable {
                        name: "company_name".to_string(),
                        description: "Nome da empresa".to_string(),
                        default_value: Some("Nossa Empresa".to_string()),
                        required: false,
                        variable_type: VariableType::Text,
                    },
                ],
                media_url: None,
                media_type: None,
                buttons: None,
                quick_replies: Some(vec![
                    "Suporte Técnico".to_string(),
                    "Informações de Produto".to_string(),
                    "Falar com Vendas".to_string(),
                ]),
            },
            platforms: vec![Platform::WhatsApp, Platform::Instagram, Platform::Webchat],
            departments: vec!["Suporte".to_string(), "Vendas".to_string()],
            tags: vec!["greeting".to_string(), "welcome".to_string()],
            is_active: true,
            is_global: true,
            created_by: Uuid::new_v4(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
            usage_count: 125,
            last_used_at: Some(Utc::now() - chrono::Duration::hours(2)),
        };
        
        // Away message template
        let away_template = ResponseTemplate {
            id: Uuid::new_v4(),
            name: "Fora do Horário".to_string(),
            description: Some("Mensagem automática fora do horário comercial".to_string()),
            category: TemplateCategory::Away,
            content: TemplateContent {
                content_type: TemplateContentType::Template,
                text: "Obrigado por entrar em contato! 🕒 Nosso horário de atendimento é de segunda a sexta, das 9h às 18h. Retornaremos assim que possível.".to_string(),
                variables: vec![],
                media_url: None,
                media_type: None,
                buttons: None,
                quick_replies: None,
            },
            platforms: vec![Platform::WhatsApp, Platform::Instagram],
            departments: vec!["Suporte".to_string()],
            tags: vec!["away".to_string(), "hours".to_string()],
            is_active: true,
            is_global: true,
            created_by: Uuid::new_v4(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
            usage_count: 89,
            last_used_at: Some(Utc::now() - chrono::Duration::hours(1)),
        };
        
        // Support template
        let support_template = ResponseTemplate {
            id: Uuid::new_v4(),
            name: "Solicitação de Informações".to_string(),
            description: Some("Template para solicitar mais informações do cliente".to_string()),
            category: TemplateCategory::Support,
            content: TemplateContent {
                content_type: TemplateContentType::Template,
                text: "Para que eu possa ajudá-lo(a) da melhor forma, você poderia me fornecer mais detalhes sobre {{issue_type}}? Qualquer informação adicional será muito útil! 📝".to_string(),
                variables: vec![
                    TemplateVariable {
                        name: "issue_type".to_string(),
                        description: "Tipo do problema ou dúvida".to_string(),
                        default_value: Some("sua solicitação".to_string()),
                        required: false,
                        variable_type: VariableType::Text,
                    },
                ],
                media_url: None,
                media_type: None,
                buttons: None,
                quick_replies: Some(vec![
                    "Problema Técnico".to_string(),
                    "Dúvida sobre Produto".to_string(),
                    "Problema de Pagamento".to_string(),
                ]),
            },
            platforms: vec![Platform::WhatsApp],
            departments: vec!["Suporte".to_string()],
            tags: vec!["support".to_string(), "information".to_string()],
            is_active: true,
            is_global: false,
            created_by: Uuid::new_v4(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
            usage_count: 67,
            last_used_at: Some(Utc::now() - chrono::Duration::minutes(30)),
        };
        
        templates.insert(greeting_template.id, greeting_template);
        templates.insert(away_template.id, away_template);
        templates.insert(support_template.id, support_template);
        
        self.templates = std::sync::RwLock::new(templates);
        self
    }
    
    /// Render template variables
    fn render_variables(&self, text: &str, context: &TemplateContext) -> String {
        let mut rendered = text.to_string();
        
        // Replace standard variables
        if let Some(agent_name) = &context.agent_name {
            rendered = rendered.replace("{{agent_name}}", agent_name);
        }
        
        if let Some(customer_name) = &context.customer_name {
            rendered = rendered.replace("{{customer_name}}", customer_name);
        }
        
        if let Some(company_name) = &context.company_name {
            rendered = rendered.replace("{{company_name}}", company_name);
        }
        
        // Replace custom variables
        for (key, value) in &context.variables {
            let placeholder = format!("{{{{{}}}}}", key);
            let value_str = match value {
                serde_json::Value::String(s) => s.clone(),
                serde_json::Value::Number(n) => n.to_string(),
                serde_json::Value::Bool(b) => b.to_string(),
                _ => value.to_string(),
            };
            rendered = rendered.replace(&placeholder, &value_str);
        }
        
        rendered
    }
    
    /// Validate template variables
    fn validate_template_variables(&self, content: &TemplateContent) -> Vec<String> {
        let mut errors = Vec::new();
        
        // Extract variable names from text
        let text = &content.text;
        let mut vars_in_text = Vec::new();
        let mut i = 0;
        let chars: Vec<char> = text.chars().collect();
        
        while i < chars.len() - 1 {
            if chars[i] == '{' && i + 1 < chars.len() && chars[i + 1] == '{' {
                let mut j = i + 2;
                while j < chars.len() - 1 && !(chars[j] == '}' && chars[j + 1] == '}') {
                    j += 1;
                }
                if j < chars.len() - 1 {
                    let var_name: String = chars[(i + 2)..j].iter().collect();
                    vars_in_text.push(var_name.trim().to_string());
                    i = j + 2;
                } else {
                    i += 1;
                }
            } else {
                i += 1;
            }
        }
        
        // Check if all variables in text are defined
        let defined_vars: Vec<String> = content.variables.iter().map(|v| v.name.clone()).collect();
        let system_vars = vec!["agent_name".to_string(), "customer_name".to_string(), "company_name".to_string()];
        
        for var in vars_in_text {
            if !defined_vars.contains(&var) && !system_vars.contains(&var) {
                errors.push(format!("Undefined variable: {}", var));
            }
        }
        
        // Validate variable definitions
        for var in &content.variables {
            if var.name.trim().is_empty() {
                errors.push("Variable name cannot be empty".to_string());
            }
            
            if var.name.contains(' ') {
                errors.push(format!("Variable name '{}' cannot contain spaces", var.name));
            }
        }
        
        errors
    }
}

#[async_trait]
impl ResponseTemplateService for DefaultResponseTemplateService {
    async fn create_template(&self, request: CreateTemplateRequest, created_by: Uuid) -> CoreResult<ResponseTemplate> {
        info!("Creating new template: {}", request.name);
        
        // Validate template content
        let validation_errors = self.validate_template(&request.content).await?;
        if !validation_errors.is_empty() {
            return Err(CoreError::validation(&format!("Template validation failed: {}", validation_errors.join(", "))));
        }
        
        let template = ResponseTemplate {
            id: Uuid::new_v4(),
            name: request.name,
            description: request.description,
            category: request.category,
            content: request.content,
            platforms: request.platforms,
            departments: request.departments.unwrap_or_default(),
            tags: request.tags.unwrap_or_default(),
            is_active: true,
            is_global: request.is_global.unwrap_or(false),
            created_by,
            created_at: Utc::now(),
            updated_at: Utc::now(),
            usage_count: 0,
            last_used_at: None,
        };
        
        let mut templates = self.templates.write().unwrap();
        templates.insert(template.id, template.clone());
        
        Ok(template)
    }
    
    async fn get_template(&self, id: Uuid) -> CoreResult<Option<ResponseTemplate>> {
        let templates = self.templates.read().unwrap();
        Ok(templates.get(&id).cloned())
    }
    
    async fn update_template(&self, id: Uuid, request: UpdateTemplateRequest, _updated_by: Uuid) -> CoreResult<ResponseTemplate> {
        let mut templates = self.templates.write().unwrap();
        
        let template = templates.get_mut(&id)
            .ok_or_else(|| CoreError::not_found("template", &id.to_string()))?;
        
        if let Some(name) = request.name {
            template.name = name;
        }
        
        if let Some(description) = request.description {
            template.description = Some(description);
        }
        
        if let Some(category) = request.category {
            template.category = category;
        }
        
        if let Some(content) = request.content {
            // Validate new content
            let validation_errors = self.validate_template_variables(&content);
            if !validation_errors.is_empty() {
                return Err(CoreError::validation(&format!("Template validation failed: {}", validation_errors.join(", "))));
            }
            template.content = content;
        }
        
        if let Some(platforms) = request.platforms {
            template.platforms = platforms;
        }
        
        if let Some(departments) = request.departments {
            template.departments = departments;
        }
        
        if let Some(tags) = request.tags {
            template.tags = tags;
        }
        
        if let Some(is_active) = request.is_active {
            template.is_active = is_active;
        }
        
        if let Some(is_global) = request.is_global {
            template.is_global = is_global;
        }
        
        template.updated_at = Utc::now();
        
        Ok(template.clone())
    }
    
    async fn delete_template(&self, id: Uuid, _deleted_by: Uuid) -> CoreResult<()> {
        let mut templates = self.templates.write().unwrap();
        
        if templates.remove(&id).is_some() {
            info!("Deleted template: {}", id);
            Ok(())
        } else {
            Err(CoreError::not_found("template", &id.to_string()))
        }
    }
    
    async fn search_templates(&self, options: TemplateSearchOptions) -> CoreResult<TemplatePage> {
        let templates = self.templates.read().unwrap();
        let mut filtered_templates: Vec<_> = templates.values().collect();
        
        // Apply filters
        if let Some(categories) = &options.filters.category {
            filtered_templates.retain(|t| categories.contains(&t.category));
        }
        
        if let Some(platforms) = &options.filters.platform {
            filtered_templates.retain(|t| t.platforms.iter().any(|p| platforms.contains(p)));
        }
        
        if let Some(department) = &options.filters.department {
            filtered_templates.retain(|t| t.departments.contains(department));
        }
        
        if let Some(is_active) = options.filters.is_active {
            filtered_templates.retain(|t| t.is_active == is_active);
        }
        
        if let Some(is_global) = options.filters.is_global {
            filtered_templates.retain(|t| t.is_global == is_global);
        }
        
        if let Some(search_text) = &options.filters.search_text {
            let search_lower = search_text.to_lowercase();
            filtered_templates.retain(|t| {
                t.name.to_lowercase().contains(&search_lower) ||
                t.content.text.to_lowercase().contains(&search_lower) ||
                t.tags.iter().any(|tag| tag.to_lowercase().contains(&search_lower))
            });
        }
        
        // Sort templates
        filtered_templates.sort_by(|a, b| {
            use std::cmp::Ordering;
            let ordering = match options.sort_by {
                TemplateSortBy::Name => a.name.cmp(&b.name),
                TemplateSortBy::CreatedAt => a.created_at.cmp(&b.created_at),
                TemplateSortBy::UpdatedAt => a.updated_at.cmp(&b.updated_at),
                TemplateSortBy::UsageCount => a.usage_count.cmp(&b.usage_count),
                TemplateSortBy::LastUsedAt => {
                    match (&a.last_used_at, &b.last_used_at) {
                        (Some(a_time), Some(b_time)) => a_time.cmp(b_time),
                        (Some(_), None) => Ordering::Greater,
                        (None, Some(_)) => Ordering::Less,
                        (None, None) => Ordering::Equal,
                    }
                }
                TemplateSortBy::Category => format!("{:?}", a.category).cmp(&format!("{:?}", b.category)),
            };
            
            match options.sort_order {
                SortOrder::Asc => ordering,
                SortOrder::Desc => ordering.reverse(),
            }
        });
        
        let total_count = filtered_templates.len() as u64;
        let total_pages = ((total_count as f64) / (options.page_size as f64)).ceil() as u32;
        
        // Apply pagination
        let start_idx = ((options.page - 1) * options.page_size) as usize;
        let end_idx = (start_idx + options.page_size as usize).min(filtered_templates.len());
        
        let page_templates: Vec<ResponseTemplate> = filtered_templates[start_idx..end_idx]
            .iter()
            .map(|t| (*t).clone())
            .collect();
        
        Ok(TemplatePage {
            templates: page_templates,
            total_count,
            page: options.page,
            page_size: options.page_size,
            total_pages,
            has_next: options.page < total_pages,
            has_previous: options.page > 1,
        })
    }
    
    async fn get_templates_by_category(&self, category: TemplateCategory, platform: Option<Platform>) -> CoreResult<Vec<ResponseTemplate>> {
        let templates = self.templates.read().unwrap();
        
        let filtered_templates: Vec<ResponseTemplate> = templates.values()
            .filter(|t| t.category == category && t.is_active)
            .filter(|t| platform.map_or(true, |p| t.platforms.contains(&p)))
            .cloned()
            .collect();
        
        Ok(filtered_templates)
    }
    
    async fn get_agent_templates(&self, _agent_id: Uuid, department: Option<String>, platform: Option<Platform>) -> CoreResult<Vec<ResponseTemplate>> {
        let templates = self.templates.read().unwrap();
        
        let filtered_templates: Vec<ResponseTemplate> = templates.values()
            .filter(|t| t.is_active)
            .filter(|t| t.is_global || department.as_ref().map_or(false, |dept| t.departments.contains(dept)))
            .filter(|t| platform.map_or(true, |p| t.platforms.contains(&p)))
            .cloned()
            .collect();
        
        Ok(filtered_templates)
    }
    
    async fn get_global_templates(&self, platform: Option<Platform>) -> CoreResult<Vec<ResponseTemplate>> {
        let templates = self.templates.read().unwrap();
        
        let filtered_templates: Vec<ResponseTemplate> = templates.values()
            .filter(|t| t.is_global && t.is_active)
            .filter(|t| platform.map_or(true, |p| t.platforms.contains(&p)))
            .cloned()
            .collect();
        
        Ok(filtered_templates)
    }
    
    async fn render_template(&self, template_id: Uuid, context: TemplateContext) -> CoreResult<RenderedTemplate> {
        let templates = self.templates.read().unwrap();
        
        let template = templates.get(&template_id)
            .ok_or_else(|| CoreError::not_found("template", &template_id.to_string()))?;
        
        let rendered_text = self.render_variables(&template.content.text, &context);
        
        let rendered = RenderedTemplate {
            template_id,
            rendered_text,
            media_url: template.content.media_url.clone(),
            buttons: template.content.buttons.clone(),
            quick_replies: template.content.quick_replies.clone(),
            variables_used: context.variables,
        };
        
        Ok(rendered)
    }
    
    async fn duplicate_template(&self, template_id: Uuid, new_name: String, created_by: Uuid) -> CoreResult<ResponseTemplate> {
        let original_template = {
            let templates = self.templates.read().unwrap();
            templates.get(&template_id)
                .ok_or_else(|| CoreError::not_found("template", &template_id.to_string()))?
                .clone()
        };
        
        let request = CreateTemplateRequest {
            name: new_name,
            description: original_template.description.clone(),
            category: original_template.category.clone(),
            content: original_template.content.clone(),
            platforms: original_template.platforms.clone(),
            departments: Some(original_template.departments.clone()),
            tags: Some(original_template.tags.clone()),
            is_global: Some(original_template.is_global),
        };
        
        self.create_template(request, created_by).await
    }
    
    async fn toggle_template_status(&self, template_id: Uuid, is_active: bool, _updated_by: Uuid) -> CoreResult<ResponseTemplate> {
        let mut templates = self.templates.write().unwrap();
        
        let template = templates.get_mut(&template_id)
            .ok_or_else(|| CoreError::not_found("template", &template_id.to_string()))?;
        
        template.is_active = is_active;
        template.updated_at = Utc::now();
        
        Ok(template.clone())
    }
    
    async fn record_template_usage(&self, template_id: Uuid, _used_by: Uuid) -> CoreResult<()> {
        let mut templates = self.templates.write().unwrap();
        
        if let Some(template) = templates.get_mut(&template_id) {
            template.usage_count += 1;
            template.last_used_at = Some(Utc::now());
        }
        
        Ok(())
    }
    
    async fn get_template_stats(&self, _filters: Option<TemplateFilters>) -> CoreResult<TemplateStats> {
        let templates = self.templates.read().unwrap();
        
        let total_templates = templates.len() as u64;
        let active_templates = templates.values().filter(|t| t.is_active).count() as u64;
        let global_templates = templates.values().filter(|t| t.is_global).count() as u64;
        
        let mut most_used_templates: Vec<_> = templates.values()
            .map(|t| (t.id, t.name.clone(), t.usage_count))
            .collect();
        most_used_templates.sort_by(|a, b| b.2.cmp(&a.2));
        most_used_templates.truncate(10);
        
        let mut templates_by_category = HashMap::new();
        let mut templates_by_platform = HashMap::new();
        
        for template in templates.values() {
            *templates_by_category.entry(template.category.clone()).or_insert(0) += 1;
            
            for platform in &template.platforms {
                *templates_by_platform.entry(platform.clone()).or_insert(0) += 1;
            }
        }
        
        Ok(TemplateStats {
            total_templates,
            active_templates,
            global_templates,
            most_used_templates,
            templates_by_category,
            templates_by_platform,
        })
    }
    
    async fn validate_template(&self, content: &TemplateContent) -> CoreResult<Vec<String>> {
        Ok(self.validate_template_variables(content))
    }
    
    async fn import_templates(&self, templates: Vec<CreateTemplateRequest>, imported_by: Uuid) -> CoreResult<Vec<ResponseTemplate>> {
        let mut imported = Vec::new();
        
        for template_request in templates {
            match self.create_template(template_request, imported_by).await {
                Ok(template) => imported.push(template),
                Err(e) => warn!("Failed to import template: {}", e),
            }
        }
        
        info!("Imported {} templates", imported.len());
        Ok(imported)
    }
    
    async fn export_templates(&self, filters: Option<TemplateFilters>) -> CoreResult<Vec<ResponseTemplate>> {
        let search_options = TemplateSearchOptions {
            filters: filters.unwrap_or_default(),
            sort_by: TemplateSortBy::Name,
            sort_order: SortOrder::Asc,
            page: 1,
            page_size: 1000, // Large page size for export
        };
        
        let page = self.search_templates(search_options).await?;
        Ok(page.templates)
    }
}

impl Default for DefaultResponseTemplateService {
    fn default() -> Self {
        Self::new()
    }
}

impl Default for TemplateFilters {
    fn default() -> Self {
        Self {
            category: None,
            platform: None,
            department: None,
            tags: None,
            is_active: Some(true), // Only active templates by default
            is_global: None,
            created_by: None,
            search_text: None,
        }
    }
}

impl Default for TemplateSearchOptions {
    fn default() -> Self {
        Self {
            filters: TemplateFilters::default(),
            sort_by: TemplateSortBy::Name,
            sort_order: SortOrder::Asc,
            page: 1,
            page_size: 20,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_create_template() {
        let service = DefaultResponseTemplateService::new();
        let created_by = Uuid::new_v4();
        
        let request = CreateTemplateRequest {
            name: "Test Template".to_string(),
            description: Some("Test description".to_string()),
            category: TemplateCategory::Greeting,
            content: TemplateContent {
                content_type: TemplateContentType::Text,
                text: "Hello {{customer_name}}!".to_string(),
                variables: vec![
                    TemplateVariable {
                        name: "customer_name".to_string(),
                        description: "Customer name".to_string(),
                        default_value: Some("Customer".to_string()),
                        required: false,
                        variable_type: VariableType::Text,
                    },
                ],
                media_url: None,
                media_type: None,
                buttons: None,
                quick_replies: None,
            },
            platforms: vec![Platform::WhatsApp],
            departments: Some(vec!["Support".to_string()]),
            tags: Some(vec!["test".to_string()]),
            is_global: Some(true),
        };
        
        let template = service.create_template(request, created_by).await.unwrap();
        assert_eq!(template.name, "Test Template");
        assert_eq!(template.category, TemplateCategory::Greeting);
        assert!(template.is_global);
    }
    
    #[tokio::test]
    async fn test_render_template() {
        let service = DefaultResponseTemplateService::new().with_sample_templates();
        
        // Get the greeting template which contains both customer_name and company_name
        let templates = service.templates.read().unwrap();
        let greeting_template = templates.values()
            .find(|t| t.category == TemplateCategory::Greeting)
            .unwrap();
        let template_id = greeting_template.id;
        drop(templates);
        
        let context = TemplateContext {
            variables: std::collections::HashMap::new(),
            agent_name: Some("João".to_string()),
            customer_name: Some("Maria".to_string()),
            company_name: Some("TechCorp".to_string()),
            conversation_id: None,
            platform: Some(Platform::WhatsApp),
        };
        
        let rendered = service.render_template(template_id, context).await.unwrap();
        assert!(rendered.rendered_text.contains("Maria"));
        assert!(rendered.rendered_text.contains("TechCorp"));
    }
    
    #[tokio::test]
    async fn test_search_templates() {
        let service = DefaultResponseTemplateService::new().with_sample_templates();
        
        let options = TemplateSearchOptions {
            filters: TemplateFilters {
                category: Some(vec![TemplateCategory::Greeting]),
                ..Default::default()
            },
            ..Default::default()
        };
        
        let page = service.search_templates(options).await.unwrap();
        assert!(page.templates.len() > 0);
        assert!(page.templates.iter().all(|t| t.category == TemplateCategory::Greeting));
    }
    
    #[test]
    fn test_template_validation() {
        let service = DefaultResponseTemplateService::new();
        
        let content = TemplateContent {
            content_type: TemplateContentType::Template,
            text: "Hello {{undefined_var}}!".to_string(),
            variables: vec![],
            media_url: None,
            media_type: None,
            buttons: None,
            quick_replies: None,
        };
        
        let errors = service.validate_template_variables(&content);
        assert!(errors.len() > 0);
        assert!(errors.iter().any(|e| e.contains("undefined_var")));
    }
}