//! Message repository

use crate::entities::{message, conversation};
use crate::error::{DatabaseError, Result};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, 
    QueryFilter, QueryOrder, PaginatorTrait, QuerySelect, Set, TransactionTrait
};
use uuid::Uuid;

/// Repository for managing messages
pub struct MessageRepository<'a> {
    db: &'a DatabaseConnection,
}

impl<'a> MessageRepository<'a> {
    /// Create a new message repository
    pub fn new(db: &'a DatabaseConnection) -> Self {
        Self { db }
    }

    /// Create a new message
    pub async fn create(&self, msg: CreateMessage) -> Result<message::Model> {
        let message = message::ActiveModel {
            id: Set(Uuid::new_v4()),
            whatsapp_message_id: Set(msg.whatsapp_message_id),
            conversation_id: Set(msg.conversation_id),
            direction: Set(msg.direction),
            from_phone_number: Set(msg.from_phone_number),
            to_phone_number: Set(msg.to_phone_number),
            message_type: Set(msg.message_type),
            content: Set(msg.content),
            status: Set(msg.status.unwrap_or_else(|| "pending".to_string())),
            sent_at: Set(msg.sent_at),
            delivered_at: Set(None),
            read_at: Set(None),
            failed_at: Set(None),
            failure_reason: Set(None),
            reply_to_message_id: Set(msg.reply_to_message_id),
            media_id: Set(msg.media_id),
            media_url: Set(msg.media_url),
            media_mime_type: Set(msg.media_mime_type),
            media_size: Set(msg.media_size),
            metadata: Set(msg.metadata.unwrap_or_else(|| serde_json::json!({}))),
            created_at: Set(chrono::Utc::now()),
            updated_at: Set(chrono::Utc::now()),
        };

        message
            .insert(self.db)
            .await
            .map_err(|e| DatabaseError::Query(e.to_string()))
    }

    /// Find message by ID
    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<message::Model>> {
        message::Entity::find_by_id(id)
            .one(self.db)
            .await
            .map_err(|e| DatabaseError::Query(e.to_string()))
    }

    /// Find message by WhatsApp ID
    pub async fn find_by_whatsapp_id(&self, whatsapp_id: &str) -> Result<Option<message::Model>> {
        message::Entity::find()
            .filter(message::Column::WhatsappMessageId.eq(whatsapp_id))
            .one(self.db)
            .await
            .map_err(|e| DatabaseError::Query(e.to_string()))
    }

    /// Get messages for conversation
    pub async fn get_by_conversation(&self, conversation_id: Uuid, limit: u64, offset: u64) -> Result<Vec<message::Model>> {
        message::Entity::find()
            .filter(message::Column::ConversationId.eq(conversation_id))
            .order_by_desc(message::Column::CreatedAt)
            .limit(limit)
            .offset(offset)
            .all(self.db)
            .await
            .map_err(|e| DatabaseError::Query(e.to_string()))
    }

    /// Get recent messages
    pub async fn get_recent(&self, limit: u64) -> Result<Vec<message::Model>> {
        message::Entity::find()
            .order_by_desc(message::Column::CreatedAt)
            .limit(limit)
            .all(self.db)
            .await
            .map_err(|e| DatabaseError::Query(e.to_string()))
    }

    /// Update message status
    pub async fn update_status(&self, id: Uuid, status: &str) -> Result<message::Model> {
        let mut message: message::ActiveModel = message::Entity::find_by_id(id)
            .one(self.db)
            .await
            .map_err(|e| DatabaseError::Query(e.to_string()))?
            .ok_or_else(|| DatabaseError::NotFound("Message not found".to_string()))?
            .into();

        message.status = Set(status.to_string());
        message.updated_at = Set(chrono::Utc::now());

        // Update status timestamps
        match status {
            "sent" => message.sent_at = Set(Some(chrono::Utc::now())),
            "delivered" => message.delivered_at = Set(Some(chrono::Utc::now())),
            "read" => message.read_at = Set(Some(chrono::Utc::now())),
            "failed" => message.failed_at = Set(Some(chrono::Utc::now())),
            _ => {}
        }

        message
            .update(self.db)
            .await
            .map_err(|e| DatabaseError::Query(e.to_string()))
    }

    /// Update message status by WhatsApp ID
    pub async fn update_status_by_whatsapp_id(&self, whatsapp_id: &str, status: &str) -> Result<Option<message::Model>> {
        if let Some(msg) = self.find_by_whatsapp_id(whatsapp_id).await? {
            Ok(Some(self.update_status(msg.id, status).await?))
        } else {
            Ok(None)
        }
    }

    /// Mark message as failed
    pub async fn mark_failed(&self, id: Uuid, reason: &str) -> Result<message::Model> {
        let mut message: message::ActiveModel = message::Entity::find_by_id(id)
            .one(self.db)
            .await
            .map_err(|e| DatabaseError::Query(e.to_string()))?
            .ok_or_else(|| DatabaseError::NotFound("Message not found".to_string()))?
            .into();

        message.status = Set("failed".to_string());
        message.failed_at = Set(Some(chrono::Utc::now()));
        message.failure_reason = Set(Some(reason.to_string()));
        message.updated_at = Set(chrono::Utc::now());

        message
            .update(self.db)
            .await
            .map_err(|e| DatabaseError::Query(e.to_string()))
    }

    /// Count messages in conversation
    pub async fn count_by_conversation(&self, conversation_id: Uuid) -> Result<u64> {
        message::Entity::find()
            .filter(message::Column::ConversationId.eq(conversation_id))
            .count(self.db)
            .await
            .map_err(|e| DatabaseError::Query(e.to_string()))
    }

    /// Count unread messages
    pub async fn count_unread(&self, conversation_id: Option<Uuid>) -> Result<u64> {
        let mut query = message::Entity::find()
            .filter(message::Column::Direction.eq("inbound"))
            .filter(message::Column::ReadAt.is_null());

        if let Some(conv_id) = conversation_id {
            query = query.filter(message::Column::ConversationId.eq(conv_id));
        }

        query
            .count(self.db)
            .await
            .map_err(|e| DatabaseError::Query(e.to_string()))
    }

    /// Search messages
    pub async fn search(&self, query: &str, conversation_id: Option<Uuid>, limit: u64, offset: u64) -> Result<Vec<message::Model>> {
        let mut search_query = message::Entity::find();

        if let Some(conv_id) = conversation_id {
            search_query = search_query.filter(message::Column::ConversationId.eq(conv_id));
        }

        // Search in message content
        // Note: This is a simple search. For production, consider using full-text search
        search_query = search_query.filter(
            message::Column::Content.contains(query)
        );

        search_query
            .order_by_desc(message::Column::CreatedAt)
            .limit(limit)
            .offset(offset)
            .all(self.db)
            .await
            .map_err(|e| DatabaseError::Query(e.to_string()))
    }

    /// Get messages with media
    pub async fn get_with_media(&self, conversation_id: Option<Uuid>, limit: u64, offset: u64) -> Result<Vec<message::Model>> {
        let mut query = message::Entity::find()
            .filter(message::Column::MediaId.is_not_null());

        if let Some(conv_id) = conversation_id {
            query = query.filter(message::Column::ConversationId.eq(conv_id));
        }

        query
            .order_by_desc(message::Column::CreatedAt)
            .limit(limit)
            .offset(offset)
            .all(self.db)
            .await
            .map_err(|e| DatabaseError::Query(e.to_string()))
    }
}

/// Structure for creating a new message
pub struct CreateMessage {
    pub whatsapp_message_id: String,
    pub conversation_id: Uuid,
    pub direction: String,
    pub from_phone_number: String,
    pub to_phone_number: String,
    pub message_type: String,
    pub content: serde_json::Value,
    pub status: Option<String>,
    pub sent_at: Option<chrono::DateTime<chrono::Utc>>,
    pub reply_to_message_id: Option<Uuid>,
    pub media_id: Option<String>,
    pub media_url: Option<String>,
    pub media_mime_type: Option<String>,
    pub media_size: Option<i32>,
    pub metadata: Option<serde_json::Value>,
}