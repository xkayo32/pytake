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
            .map_err(|e| DatabaseError::QueryError(e.to_string()))
    }

    /// Find message by ID
    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<message::Model>> {
        message::Entity::find_by_id(id)
            .one(self.db)
            .await
            .map_err(|e| DatabaseError::QueryError(e.to_string()))
    }

    /// Find message by WhatsApp ID
    pub async fn find_by_whatsapp_id(&self, whatsapp_id: &str) -> Result<Option<message::Model>> {
        message::Entity::find()
            .filter(message::Column::WhatsappMessageId.eq(whatsapp_id))
            .one(self.db)
            .await
            .map_err(|e| DatabaseError::QueryError(e.to_string()))
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
            .map_err(|e| DatabaseError::QueryError(e.to_string()))
    }

    /// Get recent messages
    pub async fn get_recent(&self, limit: u64) -> Result<Vec<message::Model>> {
        message::Entity::find()
            .order_by_desc(message::Column::CreatedAt)
            .limit(limit)
            .all(self.db)
            .await
            .map_err(|e| DatabaseError::QueryError(e.to_string()))
    }

    /// Update message status (simple)
    pub async fn update_status_simple(&self, id: Uuid, status: &str) -> Result<message::Model> {
        let mut message: message::ActiveModel = message::Entity::find_by_id(id)
            .one(self.db)
            .await
            .map_err(|e| DatabaseError::QueryError(e.to_string()))?
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
            .map_err(|e| DatabaseError::QueryError(e.to_string()))
    }

    /// Update message status by WhatsApp ID
    pub async fn update_status_by_whatsapp_id(&self, whatsapp_id: &str, status: &str) -> Result<Option<message::Model>> {
        if let Some(msg) = self.find_by_whatsapp_id(whatsapp_id).await? {
            self.update_status(msg.id, status, chrono::Utc::now(), None, None).await?;
            Ok(Some(msg))
        } else {
            Ok(None)
        }
    }

    /// Mark message as failed
    pub async fn mark_failed(&self, id: Uuid, reason: &str) -> Result<message::Model> {
        let mut message: message::ActiveModel = message::Entity::find_by_id(id)
            .one(self.db)
            .await
            .map_err(|e| DatabaseError::QueryError(e.to_string()))?
            .ok_or_else(|| DatabaseError::NotFound("Message not found".to_string()))?
            .into();

        message.status = Set("failed".to_string());
        message.failed_at = Set(Some(chrono::Utc::now()));
        message.failure_reason = Set(Some(reason.to_string()));
        message.updated_at = Set(chrono::Utc::now());

        message
            .update(self.db)
            .await
            .map_err(|e| DatabaseError::QueryError(e.to_string()))
    }

    /// Count messages in conversation
    pub async fn count_by_conversation(&self, conversation_id: Uuid) -> Result<u64> {
        message::Entity::find()
            .filter(message::Column::ConversationId.eq(conversation_id))
            .count(self.db)
            .await
            .map_err(|e| DatabaseError::QueryError(e.to_string()))
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
            .map_err(|e| DatabaseError::QueryError(e.to_string()))
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
            .map_err(|e| DatabaseError::QueryError(e.to_string()))
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
            .map_err(|e| DatabaseError::QueryError(e.to_string()))
    }

    /// Update message status
    pub async fn update_status(
        &self,
        message_id: Uuid,
        status: &str,
        timestamp: chrono::DateTime<chrono::Utc>,
        error_code: Option<String>,
        error_message: Option<String>,
    ) -> Result<()> {
        let mut active = message::ActiveModel {
            id: Set(message_id),
            status: Set(Some(status.to_string())),
            updated_at: Set(chrono::Utc::now()),
            ..Default::default()
        };

        match status {
            "delivered" => {
                active.delivered_at = Set(Some(timestamp));
            }
            "read" => {
                active.read_at = Set(Some(timestamp));
            }
            "failed" => {
                active.failed_at = Set(Some(timestamp));
                active.error_code = Set(error_code);
                active.error_message = Set(error_message);
            }
            _ => {}
        }

        active.update(self.db).await
            .map_err(|e| DatabaseError::QueryError(e.to_string()))?;

        Ok(())
    }

    /// Get status history for a message
    pub async fn get_status_history(&self, message_id: Uuid) -> Result<Vec<StatusHistoryEntry>> {
        // For now, we'll return empty history since we don't have a separate history table
        // In a full implementation, you'd create a message_status_history table
        Ok(vec![])
    }

    /// Increment retry count
    pub async fn increment_retry_count(&self, message_id: Uuid) -> Result<()> {
        let message = self.find_by_id(message_id).await?
            .ok_or_else(|| DatabaseError::NotFound("Message not found".to_string()))?;

        let mut active: message::ActiveModel = message.into();
        let current_count = active.retry_count.as_ref().cloned().unwrap_or(Set(Some(0)));
        
        if let Set(Some(count)) = current_count {
            active.retry_count = Set(Some(count + 1));
        } else {
            active.retry_count = Set(Some(1));
        }
        
        active.updated_at = Set(chrono::Utc::now());
        
        active.update(self.db).await
            .map_err(|e| DatabaseError::QueryError(e.to_string()))?;

        Ok(())
    }

    /// Count messages by status since timestamp
    pub async fn count_by_status_since(&self, status: &str, since: chrono::DateTime<chrono::Utc>) -> Result<u64> {
        message::Entity::find()
            .filter(message::Column::Status.eq(status))
            .filter(message::Column::CreatedAt.gte(since))
            .count(self.db)
            .await
            .map_err(|e| DatabaseError::QueryError(e.to_string()))
    }

    /// Get average delivery time in seconds
    pub async fn get_avg_delivery_time_seconds(&self, since: chrono::DateTime<chrono::Utc>) -> Result<Option<u64>> {
        // This would need raw SQL or a more complex query
        // For now, return a placeholder
        Ok(Some(30)) // 30 seconds average
    }

    /// Get average read time in seconds  
    pub async fn get_avg_read_time_seconds(&self, since: chrono::DateTime<chrono::Utc>) -> Result<Option<u64>> {
        // This would need raw SQL or a more complex query
        // For now, return a placeholder
        Ok(Some(300)) // 5 minutes average
    }

    /// Get failed messages
    pub async fn get_failed_messages(&self, limit: u64, offset: u64) -> Result<Vec<message::Model>> {
        message::Entity::find()
            .filter(message::Column::Status.eq("failed"))
            .order_by_desc(message::Column::FailedAt)
            .limit(limit)
            .offset(offset)
            .all(self.db)
            .await
            .map_err(|e| DatabaseError::QueryError(e.to_string()))
    }

}

/// Status history entry
#[derive(Debug, Clone)]
pub struct StatusHistoryEntry {
    pub status: MessageStatus,
    pub timestamp: DateTime<Utc>,
    pub details: Option<HashMap<String, serde_json::Value>>,
}

/// Message status enumeration
#[derive(Debug, Clone, PartialEq)]
pub enum MessageStatus {
    Queued,
    Sent,
    Delivered,
    Read,
    Failed,
}

impl MessageStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Queued => "queued",
            Self::Sent => "sent",
            Self::Delivered => "delivered",
            Self::Read => "read",
            Self::Failed => "failed",
        }
    }
}

/// Status history entry
#[derive(Debug, Clone)]
pub struct StatusHistoryEntry {
    pub status: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub details: Option<serde_json::Value>,
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