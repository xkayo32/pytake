use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel, Deserialize, Serialize)]
#[sea_orm(table_name = "media_files")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    
    // File metadata
    pub file_name: String,
    pub original_name: String,
    pub file_path: String,
    pub mime_type: String,
    pub file_size: i64,
    pub file_hash: String, // SHA-256 hash for deduplication
    
    // Media type categorization
    pub media_type: MediaType,
    pub file_extension: String,
    
    // WhatsApp specific
    pub whatsapp_media_id: Option<String>, // Media ID from WhatsApp after upload
    pub whatsapp_url: Option<String>,       // Direct URL from WhatsApp
    
    // Organization
    pub folder_path: Option<String>,
    pub tags: Option<Json>,
    pub description: Option<String>,
    
    // Thumbnail for images/videos
    pub thumbnail_path: Option<String>,
    pub thumbnail_url: Option<String>,
    
    // Audio/Video metadata
    pub duration_seconds: Option<i32>,
    pub width: Option<i32>,
    pub height: Option<i32>,
    
    // Access control
    pub is_public: bool,
    pub uploaded_by: i32,
    pub organization_id: Option<i32>,
    
    // Usage tracking
    pub usage_count: i32,
    pub last_used_at: Option<DateTime>,
    
    // Timestamps
    pub created_at: DateTime,
    pub updated_at: DateTime,
    pub deleted_at: Option<DateTime>,
}

#[derive(Copy, Clone, Debug, PartialEq, Eq, EnumIter, DeriveActiveEnum, Deserialize, Serialize)]
#[sea_orm(rs_type = "String", db_type = "String(Some(20))")]
#[serde(rename_all = "snake_case")]
pub enum MediaType {
    #[sea_orm(string_value = "image")]
    Image,
    #[sea_orm(string_value = "video")]
    Video,
    #[sea_orm(string_value = "audio")]
    Audio,
    #[sea_orm(string_value = "document")]
    Document,
    #[sea_orm(string_value = "sticker")]
    Sticker,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::user::Entity",
        from = "Column::UploadedBy",
        to = "super::user::Column::Id"
    )]
    User,
    
    #[sea_orm(
        belongs_to = "super::organization::Entity",
        from = "Column::OrganizationId",
        to = "super::organization::Column::Id"
    )]
    Organization,
    
    #[sea_orm(has_many = "super::message_media::Entity")]
    MessageMedia,
}

impl Related<super::user::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::User.def()
    }
}

impl Related<super::organization::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Organization.def()
    }
}

impl Related<super::message_media::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::MessageMedia.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}