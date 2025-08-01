//! Conversation tag entity

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "conversation_tags")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    
    // Tag info
    pub name: String,
    pub color: Option<String>,
    pub description: Option<String>,
    
    // Usage stats
    pub usage_count: i32,
    
    // Timestamps
    pub created_at: DateTimeUtc,
    pub updated_at: DateTimeUtc,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}

impl Model {
    /// Validate color format (hex color)
    pub fn is_valid_color(&self) -> bool {
        if let Some(color) = &self.color {
            color.starts_with('#') && color.len() == 7 &&
            color[1..].chars().all(|c| c.is_ascii_hexdigit())
        } else {
            true // None is valid
        }
    }
    
    /// Get color or default
    pub fn color_or_default(&self) -> &str {
        self.color.as_deref().unwrap_or("#3B82F6")
    }
}