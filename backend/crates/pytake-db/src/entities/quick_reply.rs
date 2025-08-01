//! Quick reply entity

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "quick_replies")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    
    // Quick reply info
    pub title: String,
    pub content: String,
    pub category: Option<String>,
    
    // Shortcut
    pub shortcut: Option<String>,
    
    // Permissions
    pub is_global: bool,
    pub created_by: Uuid,
    
    // Usage stats
    pub usage_count: i32,
    pub last_used_at: Option<DateTimeUtc>,
    
    // Timestamps
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
    Creator,
}

impl Related<super::user::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Creator.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

impl Model {
    /// Check if shortcut is valid (alphanumeric and underscore only)
    pub fn is_valid_shortcut(&self) -> bool {
        if let Some(shortcut) = &self.shortcut {
            !shortcut.is_empty() &&
            shortcut.chars().all(|c| c.is_ascii_alphanumeric() || c == '_')
        } else {
            true // None is valid
        }
    }
    
    /// Get formatted shortcut for display
    pub fn formatted_shortcut(&self) -> Option<String> {
        self.shortcut.as_ref().map(|s| format!("/{}", s))
    }
    
    /// Increment usage count
    pub fn increment_usage(&mut self) {
        self.usage_count += 1;
        self.last_used_at = Some(chrono::Utc::now());
    }
}