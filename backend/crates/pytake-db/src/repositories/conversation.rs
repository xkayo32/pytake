//! Conversation repository

use crate::entities::conversation;
use crate::error::{DatabaseError, Result};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, 
    QueryFilter, QueryOrder, PaginatorTrait, QuerySelect
};
use sea_orm::ActiveValue::Set;
use uuid::Uuid;

/// Repository for managing conversations
pub struct ConversationRepository<'a> {
    db: &'a DatabaseConnection,
}

impl<'a> ConversationRepository<'a> {
    /// Create a new conversation repository
    pub fn new(db: &'a DatabaseConnection) -> Self {
        Self { db }
    }

    /// Create a new conversation
    pub async fn create(&self, contact_phone: String, contact_name: Option<String>) -> Result<conversation::Model> {
        let conversation = conversation::ActiveModel {
            id: Set(Uuid::new_v4()),
            contact_phone_number: Set(contact_phone),
            contact_name: Set(contact_name),
            contact_profile_picture_url: Set(None),
            assigned_user_id: Set(None),
            assigned_at: Set(None),
            status: Set("active".to_string()),
            is_active: Set(true),
            tags: Set(vec![]),
            metadata: Set(serde_json::json!({})),
            message_count: Set(0),
            last_message_at: Set(None),
            last_message_from: Set(None),
            created_at: Set(chrono::Utc::now()),
            updated_at: Set(chrono::Utc::now()),
        };

        conversation
            .insert(self.db)
            .await
            .map_err(|e| DatabaseError::QueryError(e.to_string()))
    }

    /// Find conversation by ID
    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<conversation::Model>> {
        conversation::Entity::find_by_id(id)
            .one(self.db)
            .await
            .map_err(|e| DatabaseError::QueryError(e.to_string()))
    }

    /// Find conversation by phone number
    pub async fn find_by_phone(&self, phone: &str) -> Result<Option<conversation::Model>> {
        conversation::Entity::find()
            .filter(conversation::Column::ContactPhoneNumber.eq(phone))
            .filter(conversation::Column::IsActive.eq(true))
            .order_by_desc(conversation::Column::UpdatedAt)
            .one(self.db)
            .await
            .map_err(|e| DatabaseError::QueryError(e.to_string()))
    }

    /// Find or create conversation by phone number
    pub async fn find_or_create(&self, phone: String, name: Option<String>) -> Result<conversation::Model> {
        match self.find_by_phone(&phone).await? {
            Some(conv) => Ok(conv),
            None => self.create(phone, name).await,
        }
    }

    /// Get active conversations
    pub async fn get_active(&self, limit: u64, offset: u64) -> Result<Vec<conversation::Model>> {
        conversation::Entity::find()
            .filter(conversation::Column::IsActive.eq(true))
            .filter(conversation::Column::Status.eq("active"))
            .order_by_desc(conversation::Column::LastMessageAt)
            .limit(limit)
            .offset(offset)
            .all(self.db)
            .await
            .map_err(|e| DatabaseError::QueryError(e.to_string()))
    }

    /// Get conversations assigned to user
    pub async fn get_by_user(&self, user_id: Uuid, limit: u64, offset: u64) -> Result<Vec<conversation::Model>> {
        conversation::Entity::find()
            .filter(conversation::Column::AssignedUserId.eq(user_id))
            .filter(conversation::Column::IsActive.eq(true))
            .order_by_desc(conversation::Column::LastMessageAt)
            .limit(limit)
            .offset(offset)
            .all(self.db)
            .await
            .map_err(|e| DatabaseError::QueryError(e.to_string()))
    }

    /// Get unassigned conversations
    pub async fn get_unassigned(&self, limit: u64, offset: u64) -> Result<Vec<conversation::Model>> {
        conversation::Entity::find()
            .filter(conversation::Column::AssignedUserId.is_null())
            .filter(conversation::Column::IsActive.eq(true))
            .filter(conversation::Column::Status.eq("active"))
            .order_by_desc(conversation::Column::LastMessageAt)
            .limit(limit)
            .offset(offset)
            .all(self.db)
            .await
            .map_err(|e| DatabaseError::QueryError(e.to_string()))
    }

    /// Assign conversation to user
    pub async fn assign(&self, id: Uuid, user_id: Uuid) -> Result<conversation::Model> {
        let mut conversation: conversation::ActiveModel = conversation::Entity::find_by_id(id)
            .one(self.db)
            .await
            .map_err(|e| DatabaseError::QueryError(e.to_string()))?
            .ok_or_else(|| DatabaseError::NotFound("Conversation not found".to_string()))?
            .into();

        conversation.assigned_user_id = Set(Some(user_id));
        conversation.assigned_at = Set(Some(chrono::Utc::now()));
        conversation.updated_at = Set(chrono::Utc::now());

        conversation
            .update(self.db)
            .await
            .map_err(|e| DatabaseError::QueryError(e.to_string()))
    }

    /// Unassign conversation
    pub async fn unassign(&self, id: Uuid) -> Result<conversation::Model> {
        let mut conversation: conversation::ActiveModel = conversation::Entity::find_by_id(id)
            .one(self.db)
            .await
            .map_err(|e| DatabaseError::QueryError(e.to_string()))?
            .ok_or_else(|| DatabaseError::NotFound("Conversation not found".to_string()))?
            .into();

        conversation.assigned_user_id = Set(None);
        conversation.assigned_at = Set(None);
        conversation.updated_at = Set(chrono::Utc::now());

        conversation
            .update(self.db)
            .await
            .map_err(|e| DatabaseError::QueryError(e.to_string()))
    }

    /// Update conversation status
    pub async fn update_status(&self, id: Uuid, status: &str) -> Result<conversation::Model> {
        let mut conversation: conversation::ActiveModel = conversation::Entity::find_by_id(id)
            .one(self.db)
            .await
            .map_err(|e| DatabaseError::QueryError(e.to_string()))?
            .ok_or_else(|| DatabaseError::NotFound("Conversation not found".to_string()))?
            .into();

        conversation.status = Set(status.to_string());
        conversation.updated_at = Set(chrono::Utc::now());

        conversation
            .update(self.db)
            .await
            .map_err(|e| DatabaseError::QueryError(e.to_string()))
    }

    /// Update last message info
    pub async fn update_last_message(&self, id: Uuid, from: &str) -> Result<conversation::Model> {
        let mut conversation: conversation::ActiveModel = conversation::Entity::find_by_id(id)
            .one(self.db)
            .await
            .map_err(|e| DatabaseError::QueryError(e.to_string()))?
            .ok_or_else(|| DatabaseError::NotFound("Conversation not found".to_string()))?
            .into();

        conversation.last_message_at = Set(Some(chrono::Utc::now()));
        conversation.last_message_from = Set(Some(from.to_string()));
        conversation.message_count = Set(conversation.message_count.unwrap() + 1);
        conversation.updated_at = Set(chrono::Utc::now());

        conversation
            .update(self.db)
            .await
            .map_err(|e| DatabaseError::QueryError(e.to_string()))
    }

    /// Archive conversation
    pub async fn archive(&self, id: Uuid) -> Result<conversation::Model> {
        self.update_status(id, "archived").await
    }

    /// Count active conversations
    pub async fn count_active(&self) -> Result<u64> {
        conversation::Entity::find()
            .filter(conversation::Column::IsActive.eq(true))
            .filter(conversation::Column::Status.eq("active"))
            .count(self.db)
            .await
            .map_err(|e| DatabaseError::QueryError(e.to_string()))
    }

    /// Count unassigned conversations
    pub async fn count_unassigned(&self) -> Result<u64> {
        conversation::Entity::find()
            .filter(conversation::Column::AssignedUserId.is_null())
            .filter(conversation::Column::IsActive.eq(true))
            .filter(conversation::Column::Status.eq("active"))
            .count(self.db)
            .await
            .map_err(|e| DatabaseError::QueryError(e.to_string()))
    }

    /// Search conversations
    pub async fn search(&self, query: &str, limit: u64, offset: u64) -> Result<Vec<conversation::Model>> {
        use sea_orm::QueryFilter;
        
        conversation::Entity::find()
            .filter(
                conversation::Column::ContactPhoneNumber.contains(query)
                    .or(conversation::Column::ContactName.contains(query))
            )
            .filter(conversation::Column::IsActive.eq(true))
            .order_by_desc(conversation::Column::LastMessageAt)
            .limit(limit)
            .offset(offset)
            .all(self.db)
            .await
            .map_err(|e| DatabaseError::QueryError(e.to_string()))
    }
}