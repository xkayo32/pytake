//! Message media entity

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "message_media")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    
    // Message reference
    pub message_id: Uuid,
    
    // WhatsApp media info
    pub whatsapp_media_id: Option<String>,
    
    // File info
    pub file_name: Option<String>,
    pub file_path: Option<String>,
    pub file_size: Option<i32>,
    pub mime_type: Option<String>,
    
    // Media type
    pub media_type: String,
    
    // Thumbnail (for images/videos)
    pub thumbnail_path: Option<String>,
    pub thumbnail_size: Option<i32>,
    
    // Download status
    pub download_status: String,
    pub downloaded_at: Option<DateTimeUtc>,
    pub download_error: Option<String>,
    
    // Storage info
    pub storage_provider: Option<String>,
    pub storage_path: Option<String>,
    pub public_url: Option<String>,
    
    // Metadata
    pub width: Option<i32>,
    pub height: Option<i32>,
    pub duration: Option<i32>,
    pub metadata: Json,
    
    // Timestamps
    pub created_at: DateTimeUtc,
    pub updated_at: DateTimeUtc,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::message::Entity",
        from = "Column::MessageId",
        to = "super::message::Column::Id"
    )]
    Message,
}

impl Related<super::message::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Message.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

// Media type enum
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum MediaType {
    Image,
    Video,
    Audio,
    Document,
    Sticker,
}

impl MediaType {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Image => "image",
            Self::Video => "video",
            Self::Audio => "audio",
            Self::Document => "document",
            Self::Sticker => "sticker",
        }
    }
    
    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "image" => Some(Self::Image),
            "video" => Some(Self::Video),
            "audio" => Some(Self::Audio),
            "document" => Some(Self::Document),
            "sticker" => Some(Self::Sticker),
            _ => None,
        }
    }
}

// Download status enum
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum DownloadStatus {
    Pending,
    Downloading,
    Completed,
    Failed,
}

impl DownloadStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Downloading => "downloading",
            Self::Completed => "completed",
            Self::Failed => "failed",
        }
    }
    
    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "pending" => Some(Self::Pending),
            "downloading" => Some(Self::Downloading),
            "completed" => Some(Self::Completed),
            "failed" => Some(Self::Failed),
            _ => None,
        }
    }
}

impl Model {
    /// Get media type enum
    pub fn media_type_enum(&self) -> Option<MediaType> {
        MediaType::from_str(&self.media_type)
    }
    
    /// Get download status enum
    pub fn download_status_enum(&self) -> Option<DownloadStatus> {
        DownloadStatus::from_str(&self.download_status)
    }
    
    /// Check if media is downloaded
    pub fn is_downloaded(&self) -> bool {
        self.download_status == "completed" && self.downloaded_at.is_some()
    }
    
    /// Check if media download failed
    pub fn is_failed(&self) -> bool {
        self.download_status == "failed"
    }
    
    /// Get file extension from mime type
    pub fn get_file_extension(&self) -> Option<String> {
        self.mime_type.as_ref().and_then(|mime| {
            match mime.as_str() {
                "image/jpeg" => Some("jpg"),
                "image/png" => Some("png"),
                "image/gif" => Some("gif"),
                "image/webp" => Some("webp"),
                "video/mp4" => Some("mp4"),
                "video/3gpp" => Some("3gp"),
                "audio/mpeg" => Some("mp3"),
                "audio/ogg" => Some("ogg"),
                "audio/wav" => Some("wav"),
                "application/pdf" => Some("pdf"),
                "application/vnd.ms-excel" => Some("xls"),
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" => Some("xlsx"),
                "application/msword" => Some("doc"),
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document" => Some("docx"),
                _ => None,
            }.map(|s| s.to_string())
        })
    }
}