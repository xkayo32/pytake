//! WhatsApp message entity model for SeaORM

use super::*;
use pytake_core::entities::whatsapp as domain;
use sea_orm::ActiveValue::Set;
use std::collections::HashMap;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, Serialize, Deserialize)]
#[sea_orm(table_name = "whatsapp_messages")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    
    pub user_id: Uuid,
    
    pub flow_id: Option<Uuid>,
    
    pub from_number: String,
    
    pub to_number: String,
    
    pub message_type: MessageType,
    
    #[sea_orm(column_type = "Json")]
    pub content: Json,
    
    pub status: MessageStatus,
    
    pub direction: MessageDirection,
    
    #[sea_orm(column_type = "Json")]
    pub metadata: Json,
    
    pub created_at: chrono::DateTime<chrono::Utc>,
    
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::user::Entity",
        from = "Column::UserId",
        to = "super::user::Column::Id"
    )]
    User,
    
    #[sea_orm(
        belongs_to = "super::flow::Entity",
        from = "Column::FlowId",
        to = "super::flow::Column::Id"
    )]
    Flow,
}

impl Related<super::user::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::User.def()
    }
}

impl Related<super::flow::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Flow.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

/// Message type enum for database storage
#[derive(Debug, Clone, PartialEq, Eq, EnumIter, DeriveActiveEnum, Serialize, Deserialize)]
#[sea_orm(rs_type = "String", db_type = "Enum", enum_name = "message_type")]
pub enum MessageType {
    #[sea_orm(string_value = "text")]
    Text,
    #[sea_orm(string_value = "image")]
    Image,
    #[sea_orm(string_value = "document")]
    Document,
    #[sea_orm(string_value = "audio")]
    Audio,
    #[sea_orm(string_value = "video")]
    Video,
    #[sea_orm(string_value = "location")]
    Location,
    #[sea_orm(string_value = "contact")]
    Contact,
    #[sea_orm(string_value = "template")]
    Template,
}

/// Message status enum for database storage
#[derive(Debug, Clone, PartialEq, Eq, EnumIter, DeriveActiveEnum, Serialize, Deserialize)]
#[sea_orm(rs_type = "String", db_type = "Enum", enum_name = "message_status")]
pub enum MessageStatus {
    #[sea_orm(string_value = "pending")]
    Pending,
    #[sea_orm(string_value = "sent")]
    Sent,
    #[sea_orm(string_value = "delivered")]
    Delivered,
    #[sea_orm(string_value = "read")]
    Read,
    #[sea_orm(string_value = "failed")]
    Failed,
}

/// Message direction enum for database storage
#[derive(Debug, Clone, PartialEq, Eq, EnumIter, DeriveActiveEnum, Serialize, Deserialize)]
#[sea_orm(rs_type = "String", db_type = "Enum", enum_name = "message_direction")]
pub enum MessageDirection {
    #[sea_orm(string_value = "inbound")]
    Inbound,
    #[sea_orm(string_value = "outbound")]
    Outbound,
}

impl From<&domain::MessageType> for MessageType {
    fn from(msg_type: &domain::MessageType) -> Self {
        match msg_type {
            domain::MessageType::Text => MessageType::Text,
            domain::MessageType::Image => MessageType::Image,
            domain::MessageType::Document => MessageType::Document,
            domain::MessageType::Audio => MessageType::Audio,
            domain::MessageType::Video => MessageType::Video,
            domain::MessageType::Location => MessageType::Location,
            domain::MessageType::Contact => MessageType::Contact,
            domain::MessageType::Template => MessageType::Template,
        }
    }
}

impl From<MessageType> for domain::MessageType {
    fn from(msg_type: MessageType) -> Self {
        match msg_type {
            MessageType::Text => domain::MessageType::Text,
            MessageType::Image => domain::MessageType::Image,
            MessageType::Document => domain::MessageType::Document,
            MessageType::Audio => domain::MessageType::Audio,
            MessageType::Video => domain::MessageType::Video,
            MessageType::Location => domain::MessageType::Location,
            MessageType::Contact => domain::MessageType::Contact,
            MessageType::Template => domain::MessageType::Template,
        }
    }
}


impl From<domain::MessageStatus> for MessageStatus {
    fn from(status: domain::MessageStatus) -> Self {
        match status {
            domain::MessageStatus::Pending => MessageStatus::Pending,
            domain::MessageStatus::Sent => MessageStatus::Sent,
            domain::MessageStatus::Delivered => MessageStatus::Delivered,
            domain::MessageStatus::Read => MessageStatus::Read,
            domain::MessageStatus::Failed => MessageStatus::Failed,
        }
    }
}

impl From<MessageStatus> for domain::MessageStatus {
    fn from(status: MessageStatus) -> Self {
        match status {
            MessageStatus::Pending => domain::MessageStatus::Pending,
            MessageStatus::Sent => domain::MessageStatus::Sent,
            MessageStatus::Delivered => domain::MessageStatus::Delivered,
            MessageStatus::Read => domain::MessageStatus::Read,
            MessageStatus::Failed => domain::MessageStatus::Failed,
        }
    }
}

impl From<domain::MessageDirection> for MessageDirection {
    fn from(direction: domain::MessageDirection) -> Self {
        match direction {
            domain::MessageDirection::Inbound => MessageDirection::Inbound,
            domain::MessageDirection::Outbound => MessageDirection::Outbound,
        }
    }
}

impl From<MessageDirection> for domain::MessageDirection {
    fn from(direction: MessageDirection) -> Self {
        match direction {
            MessageDirection::Inbound => domain::MessageDirection::Inbound,
            MessageDirection::Outbound => domain::MessageDirection::Outbound,
        }
    }
}

impl From<domain::WhatsAppMessage> for Model {
    fn from(message: domain::WhatsAppMessage) -> Self {
        Self {
            id: super::entity_id_to_uuid(&message.id),
            user_id: super::entity_id_to_uuid(&message.user_id),
            flow_id: message.flow_id.map(|id| super::entity_id_to_uuid(&id)),
            from_number: message.from,
            to_number: message.to,
            message_type: (&message.message_type).into(),
            content: serde_json::to_value(&message.content).unwrap_or_default().into(),
            status: message.status.into(),
            direction: message.direction.into(),
            metadata: serde_json::to_value(&message.metadata).unwrap_or_default().into(),
            created_at: super::timestamp_to_datetime(&message.created_at),
            updated_at: super::timestamp_to_datetime(&message.updated_at),
        }
    }
}

impl TryFrom<Model> for domain::WhatsAppMessage {
    type Error = crate::error::DatabaseError;

    fn try_from(model: Model) -> Result<Self, Self::Error> {
        let content: domain::MessageContent = serde_json::from_value(model.content.clone())
            .map_err(|e| crate::error::DatabaseError::SerializationError(
                format!("Failed to deserialize message content: {}", e)
            ))?;

        let metadata: HashMap<String, serde_json::Value> = serde_json::from_value(model.metadata.clone())
            .map_err(|e| crate::error::DatabaseError::SerializationError(
                format!("Failed to deserialize message metadata: {}", e)
            ))?;

        Ok(Self {
            id: super::uuid_to_entity_id(model.id),
            user_id: super::uuid_to_entity_id(model.user_id),
            flow_id: model.flow_id.map(super::uuid_to_entity_id),
            from: model.from_number,
            to: model.to_number,
            message_type: model.message_type.into(),
            content,
            status: model.status.into(),
            direction: model.direction.into(),
            metadata,
            created_at: super::datetime_to_timestamp(model.created_at),
            updated_at: super::datetime_to_timestamp(model.updated_at),
        })
    }
}

impl From<domain::WhatsAppMessage> for ActiveModel {
    fn from(message: domain::WhatsAppMessage) -> Self {
        Self {
            id: Set(super::entity_id_to_uuid(&message.id)),
            user_id: Set(super::entity_id_to_uuid(&message.user_id)),
            flow_id: Set(message.flow_id.map(|id| super::entity_id_to_uuid(&id))),
            from_number: Set(message.from),
            to_number: Set(message.to),
            message_type: Set((&message.message_type).into()),
            content: Set(serde_json::to_value(&message.content).unwrap_or_default().into()),
            status: Set(message.status.into()),
            direction: Set(message.direction.into()),
            metadata: Set(serde_json::to_value(&message.metadata).unwrap_or_default().into()),
            created_at: Set(super::timestamp_to_datetime(&message.created_at)),
            updated_at: Set(super::timestamp_to_datetime(&message.updated_at)),
        }
    }
}

/// Utility functions for WhatsApp message entity operations
impl Model {
    /// Check if message is outbound
    pub fn is_outbound(&self) -> bool {
        self.direction == MessageDirection::Outbound
    }

    /// Check if message is inbound
    pub fn is_inbound(&self) -> bool {
        self.direction == MessageDirection::Inbound
    }

    /// Check if message was delivered successfully
    pub fn is_delivered(&self) -> bool {
        matches!(self.status, MessageStatus::Delivered | MessageStatus::Read)
    }

    /// Check if message is pending
    pub fn is_pending(&self) -> bool {
        self.status == MessageStatus::Pending
    }

    /// Check if message failed
    pub fn is_failed(&self) -> bool {
        self.status == MessageStatus::Failed
    }

    /// Get text content if this is a text message
    pub fn text_content(&self) -> Option<String> {
        if self.message_type == MessageType::Text {
            if let Ok(content) = serde_json::from_value::<domain::MessageContent>(self.content.clone()) {
                if let domain::MessageContent::Text { body } = content {
                    return Some(body);
                }
            }
        }
        None
    }

    /// Convert to domain entity
    pub fn to_domain(self) -> Result<domain::WhatsAppMessage, crate::error::DatabaseError> {
        self.try_into()
    }
}

impl ActiveModel {
    /// Create from domain WhatsApp message
    pub fn from_domain(message: domain::WhatsAppMessage) -> Self {
        message.into()
    }

    /// Update with domain message data
    pub fn update_from_domain(&mut self, message: domain::WhatsAppMessage) -> Result<(), crate::error::DatabaseError> {
        self.from_number = Set(message.from);
        self.to_number = Set(message.to);
        self.message_type = Set((&message.message_type).into());
        self.content = Set(serde_json::to_value(&message.content)
            .map_err(|e| crate::error::DatabaseError::SerializationError(e.to_string()))?
            .into());
        self.status = Set(message.status.into());
        self.direction = Set(message.direction.into());
        self.metadata = Set(serde_json::to_value(&message.metadata)
            .map_err(|e| crate::error::DatabaseError::SerializationError(e.to_string()))?
            .into());
        self.updated_at = Set(super::timestamp_to_datetime(&message.updated_at));
        
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use pytake_core::entities::common::EntityId;

    #[test]
    fn test_message_type_conversion() {
        let domain_type = domain::MessageType::Text;
        let db_type: MessageType = MessageType::from(&domain_type);
        
        assert_eq!(db_type, MessageType::Text);
    }

    #[test]
    fn test_message_status_conversion() {
        let domain_status = domain::MessageStatus::Delivered;
        let db_status: MessageStatus = domain_status.clone().into();
        let back_to_domain: domain::MessageStatus = db_status.into();
        
        assert_eq!(domain_status, back_to_domain);
    }

    #[test]
    fn test_message_direction_conversion() {
        let domain_direction = domain::MessageDirection::Outbound;
        let db_direction: MessageDirection = domain_direction.into();
        let back_to_domain: domain::MessageDirection = db_direction.into();
        
        assert_eq!(domain_direction, back_to_domain);
    }

    #[test]
    fn test_whatsapp_message_model_conversion() {
        let user_id = EntityId::new();
        let content = domain::MessageContent::Text { 
            body: "Hello, World!".to_string() 
        };
        
        let domain_message = domain::WhatsAppMessage::new_outbound(
            user_id,
            "+1234567890".to_string(),
            "+0987654321".to_string(),
            content,
            None,
        );
        
        let db_model: Model = domain_message.clone().into();
        let back_to_domain: domain::WhatsAppMessage = db_model.try_into().unwrap();
        
        assert_eq!(domain_message.user_id, back_to_domain.user_id);
        assert_eq!(domain_message.from, back_to_domain.from);
        assert_eq!(domain_message.to, back_to_domain.to);
        assert_eq!(domain_message.message_type, back_to_domain.message_type);
        assert_eq!(domain_message.status, back_to_domain.status);
        assert_eq!(domain_message.direction, back_to_domain.direction);
    }

    #[test]
    fn test_message_model_utility_functions() {
        let user_id = EntityId::new();
        let content = domain::MessageContent::Text { 
            body: "Test message".to_string() 
        };
        
        let domain_message = domain::WhatsAppMessage::new_outbound(
            user_id,
            "+1234567890".to_string(),
            "+0987654321".to_string(),
            content,
            None,
        );
        
        let db_model: Model = domain_message.into();
        
        assert!(db_model.is_outbound());
        assert!(!db_model.is_inbound());
        assert!(db_model.is_pending());
        assert!(!db_model.is_delivered());
        assert!(!db_model.is_failed());
        assert_eq!(db_model.text_content(), Some("Test message".to_string()));
    }
}