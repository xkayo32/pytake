//! Conversation entity

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "conversations")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    
    // WhatsApp contact info
    pub contact_phone_number: String,
    pub contact_name: Option<String>,
    pub contact_profile_picture_url: Option<String>,
    
    // Assignment
    pub assigned_user_id: Option<Uuid>,
    pub assigned_at: Option<DateTimeUtc>,
    
    // Status
    pub status: String,
    pub is_active: bool,
    
    // Metadata
    pub tags: Vec<String>,
    pub metadata: Json,
    
    // Stats
    pub message_count: i32,
    pub last_message_at: Option<DateTimeUtc>,
    pub last_message_from: Option<String>,
    
    // Timestamps
    pub created_at: DateTimeUtc,
    pub updated_at: DateTimeUtc,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::user::Entity",
        from = "Column::AssignedUserId",
        to = "super::user::Column::Id"
    )]
    AssignedUser,
    
    #[sea_orm(has_many = "super::message::Entity")]
    Messages,
}

impl Related<super::user::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::AssignedUser.def()
    }
}

impl Related<super::message::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Messages.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

// Conversation status enum
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum ConversationStatus {
    Active,
    Archived,
    Resolved,
    Pending,
    Spam,
}

impl ConversationStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Active => "active",
            Self::Archived => "archived",
            Self::Resolved => "resolved",
            Self::Pending => "pending",
            Self::Spam => "spam",
        }
    }
    
    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "active" => Some(Self::Active),
            "archived" => Some(Self::Archived),
            "resolved" => Some(Self::Resolved),
            "pending" => Some(Self::Pending),
            "spam" => Some(Self::Spam),
            _ => None,
        }
    }
}

impl Model {
    /// Get conversation status enum
    pub fn status_enum(&self) -> Option<ConversationStatus> {
        ConversationStatus::from_str(&self.status)
    }
    
    /// Check if conversation needs attention
    pub fn needs_attention(&self) -> bool {
        self.is_active && 
        self.assigned_user_id.is_none() && 
        matches!(self.status.as_str(), "active" | "pending")
    }
    
    /// Get time since last message
    pub fn time_since_last_message(&self) -> Option<chrono::Duration> {
        self.last_message_at.map(|last| {
            chrono::Utc::now() - last
        })
    }
}