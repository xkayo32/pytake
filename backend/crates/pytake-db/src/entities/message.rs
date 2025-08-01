//! Message entity

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "messages")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    
    // WhatsApp message ID
    pub whatsapp_message_id: String,
    
    // Conversation reference
    pub conversation_id: Uuid,
    
    // Message direction
    pub direction: String,
    
    // Sender/Recipient info
    pub from_phone_number: String,
    pub to_phone_number: String,
    
    // Message content
    pub message_type: String,
    pub content: Json,
    
    // Status tracking
    pub status: String,
    pub sent_at: Option<DateTimeUtc>,
    pub delivered_at: Option<DateTimeUtc>,
    pub read_at: Option<DateTimeUtc>,
    pub failed_at: Option<DateTimeUtc>,
    pub failure_reason: Option<String>,
    
    // Reply context
    pub reply_to_message_id: Option<Uuid>,
    
    // Media handling
    pub media_id: Option<String>,
    pub media_url: Option<String>,
    pub media_mime_type: Option<String>,
    pub media_size: Option<i32>,
    
    // Metadata
    pub metadata: Json,
    
    // Timestamps
    pub created_at: DateTimeUtc,
    pub updated_at: DateTimeUtc,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::conversation::Entity",
        from = "Column::ConversationId",
        to = "super::conversation::Column::Id"
    )]
    Conversation,
    
    #[sea_orm(
        belongs_to = "Entity",
        from = "Column::ReplyToMessageId",
        to = "Column::Id"
    )]
    ReplyToMessage,
    
    #[sea_orm(has_many = "super::message_media::Entity")]
    Media,
}

impl Related<super::conversation::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Conversation.def()
    }
}

impl Related<super::message_media::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Media.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

// Message direction enum
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum MessageDirection {
    Inbound,
    Outbound,
}

impl MessageDirection {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Inbound => "inbound",
            Self::Outbound => "outbound",
        }
    }
    
    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "inbound" => Some(Self::Inbound),
            "outbound" => Some(Self::Outbound),
            _ => None,
        }
    }
}

// Message status enum
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum MessageStatus {
    Pending,
    Sent,
    Delivered,
    Read,
    Failed,
}

impl MessageStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Sent => "sent",
            Self::Delivered => "delivered",
            Self::Read => "read",
            Self::Failed => "failed",
        }
    }
    
    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "pending" => Some(Self::Pending),
            "sent" => Some(Self::Sent),
            "delivered" => Some(Self::Delivered),
            "read" => Some(Self::Read),
            "failed" => Some(Self::Failed),
            _ => None,
        }
    }
}

// Message type enum
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum MessageType {
    Text,
    Image,
    Video,
    Audio,
    Document,
    Location,
    Contact,
    Template,
    Interactive,
    Sticker,
}

impl MessageType {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Text => "text",
            Self::Image => "image",
            Self::Video => "video",
            Self::Audio => "audio",
            Self::Document => "document",
            Self::Location => "location",
            Self::Contact => "contact",
            Self::Template => "template",
            Self::Interactive => "interactive",
            Self::Sticker => "sticker",
        }
    }
    
    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "text" => Some(Self::Text),
            "image" => Some(Self::Image),
            "video" => Some(Self::Video),
            "audio" => Some(Self::Audio),
            "document" => Some(Self::Document),
            "location" => Some(Self::Location),
            "contact" => Some(Self::Contact),
            "template" => Some(Self::Template),
            "interactive" => Some(Self::Interactive),
            "sticker" => Some(Self::Sticker),
            _ => None,
        }
    }
}

impl Model {
    /// Get message direction enum
    pub fn direction_enum(&self) -> Option<MessageDirection> {
        MessageDirection::from_str(&self.direction)
    }
    
    /// Get message status enum
    pub fn status_enum(&self) -> Option<MessageStatus> {
        MessageStatus::from_str(&self.status)
    }
    
    /// Get message type enum
    pub fn type_enum(&self) -> Option<MessageType> {
        MessageType::from_str(&self.message_type)
    }
    
    /// Check if message is delivered
    pub fn is_delivered(&self) -> bool {
        self.delivered_at.is_some()
    }
    
    /// Check if message is read
    pub fn is_read(&self) -> bool {
        self.read_at.is_some()
    }
    
    /// Check if message failed
    pub fn is_failed(&self) -> bool {
        self.failed_at.is_some()
    }
    
    /// Get text content if message is text type
    pub fn get_text_content(&self) -> Option<String> {
        if self.message_type == "text" {
            self.content.get("body")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
        } else {
            None
        }
    }
}