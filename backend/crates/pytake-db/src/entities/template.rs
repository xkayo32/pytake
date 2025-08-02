//! Template entity for quick responses

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel, Deserialize, Serialize)]
#[sea_orm(table_name = "templates")]
pub struct Model {
    #[sea_orm(primary_key)]
    #[serde(skip_deserializing)]
    pub id: i32,
    
    /// Template name for easy identification
    pub name: String,
    
    /// Template content with placeholders
    pub content: String,
    
    /// Category for organization (e.g., "greetings", "support", "sales")
    pub category: String,
    
    /// Shortcut key for quick access (e.g., "/hello", "/thanks")
    #[sea_orm(unique)]
    pub shortcut: Option<String>,
    
    /// Language code (pt-BR, en-US, etc.)
    pub language: String,
    
    /// Variables/placeholders used in this template
    #[sea_orm(column_type = "Json", nullable)]
    pub variables: Option<Json>,
    
    /// Usage count for analytics
    pub usage_count: i32,
    
    /// Whether the template is active
    pub is_active: bool,
    
    /// User who created the template
    pub created_by: i32,
    
    /// Optional media attachments (JSON array of URLs)
    #[sea_orm(column_type = "Json", nullable)]
    pub attachments: Option<Json>,
    
    /// Tags for better searchability
    #[sea_orm(column_type = "Json", nullable)]
    pub tags: Option<Json>,
    
    pub created_at: DateTimeUtc,
    pub updated_at: DateTimeUtc,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::user::Entity",
        from = "Column::CreatedBy",
        to = "super::user::Column::Id"
    )]
    User,
}

impl Related<super::user::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::User.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

/// Template variable definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TemplateVariable {
    pub name: String,
    pub description: String,
    pub default_value: Option<String>,
    pub required: bool,
}

/// Template category
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum TemplateCategory {
    Greeting,
    Support,
    Sales,
    Information,
    Farewell,
    Followup,
    Custom(String),
}

impl TemplateCategory {
    pub fn as_str(&self) -> &str {
        match self {
            Self::Greeting => "greeting",
            Self::Support => "support",
            Self::Sales => "sales",
            Self::Information => "information",
            Self::Farewell => "farewell",
            Self::Followup => "followup",
            Self::Custom(s) => s,
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "greeting" => Self::Greeting,
            "support" => Self::Support,
            "sales" => Self::Sales,
            "information" => Self::Information,
            "farewell" => Self::Farewell,
            "followup" => Self::Followup,
            other => Self::Custom(other.to_string()),
        }
    }
}

/// Create template input
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateTemplateInput {
    pub name: String,
    pub content: String,
    pub category: String,
    pub shortcut: Option<String>,
    pub language: String,
    pub variables: Option<Vec<TemplateVariable>>,
    pub attachments: Option<Vec<String>>,
    pub tags: Option<Vec<String>>,
}

/// Update template input
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateTemplateInput {
    pub name: Option<String>,
    pub content: Option<String>,
    pub category: Option<String>,
    pub shortcut: Option<String>,
    pub language: Option<String>,
    pub variables: Option<Vec<TemplateVariable>>,
    pub is_active: Option<bool>,
    pub attachments: Option<Vec<String>>,
    pub tags: Option<Vec<String>>,
}

/// Template with usage statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TemplateWithStats {
    #[serde(flatten)]
    pub template: Model,
    pub last_used_at: Option<DateTimeUtc>,
    pub usage_last_30_days: i32,
    pub average_response_time: Option<f64>,
}

/// Template search filters
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct TemplateFilters {
    pub category: Option<String>,
    pub language: Option<String>,
    pub is_active: Option<bool>,
    pub search: Option<String>,
    pub tags: Option<Vec<String>>,
    pub created_by: Option<i32>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_template_category_conversion() {
        assert_eq!(TemplateCategory::Greeting.as_str(), "greeting");
        assert_eq!(TemplateCategory::from_str("support"), TemplateCategory::Support);
        assert_eq!(
            TemplateCategory::from_str("custom_category"),
            TemplateCategory::Custom("custom_category".to_string())
        );
    }

    #[test]
    fn test_template_variable_serialization() {
        let var = TemplateVariable {
            name: "customer_name".to_string(),
            description: "Customer's full name".to_string(),
            default_value: Some("Cliente".to_string()),
            required: true,
        };

        let json = serde_json::to_string(&var).unwrap();
        let deserialized: TemplateVariable = serde_json::from_str(&json).unwrap();

        assert_eq!(var.name, deserialized.name);
        assert_eq!(var.required, deserialized.required);
    }
}