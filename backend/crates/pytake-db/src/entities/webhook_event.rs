//! Webhook event entity model for SeaORM

use super::*;
use pytake_core::entities::whatsapp as domain;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, Serialize, Deserialize)]
#[sea_orm(table_name = "webhook_events")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    
    pub event_type: WebhookEventType,
    
    pub message_id: Option<Uuid>,
    
    pub phone_number: String,
    
    #[sea_orm(column_type = "Json")]
    pub payload: Json,
    
    pub processed: bool,
    
    pub created_at: chrono::DateTime<chrono::Utc>,
    
    #[sea_orm(index)]
    pub processed_at: Option<chrono::DateTime<chrono::Utc>>,
    
    pub error_message: Option<String>,
    
    pub retry_count: i32,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::whatsapp_message::Entity",
        from = "Column::MessageId",
        to = "super::whatsapp_message::Column::Id"
    )]
    WhatsappMessage,
}

impl Related<super::whatsapp_message::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::WhatsappMessage.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

/// Webhook event type enum for database storage
#[derive(Debug, Clone, PartialEq, Eq, EnumIter, DeriveActiveEnum, Serialize, Deserialize)]
#[sea_orm(rs_type = "String", db_type = "Enum", enum_name = "webhook_event_type")]
pub enum WebhookEventType {
    #[sea_orm(string_value = "message_received")]
    MessageReceived,
    #[sea_orm(string_value = "message_status")]
    MessageStatus,
    #[sea_orm(string_value = "account_update")]
    AccountUpdate,
    #[sea_orm(string_value = "error")]
    Error,
}

impl From<domain::WebhookEventType> for WebhookEventType {
    fn from(event_type: domain::WebhookEventType) -> Self {
        match event_type {
            domain::WebhookEventType::MessageReceived => WebhookEventType::MessageReceived,
            domain::WebhookEventType::MessageStatus => WebhookEventType::MessageStatus,
            domain::WebhookEventType::AccountUpdate => WebhookEventType::AccountUpdate,
            domain::WebhookEventType::Error => WebhookEventType::Error,
        }
    }
}

impl From<WebhookEventType> for domain::WebhookEventType {
    fn from(event_type: WebhookEventType) -> Self {
        match event_type {
            WebhookEventType::MessageReceived => domain::WebhookEventType::MessageReceived,
            WebhookEventType::MessageStatus => domain::WebhookEventType::MessageStatus,
            WebhookEventType::AccountUpdate => domain::WebhookEventType::AccountUpdate,
            WebhookEventType::Error => domain::WebhookEventType::Error,
        }
    }
}

impl From<domain::WhatsAppWebhookEvent> for Model {
    fn from(event: domain::WhatsAppWebhookEvent) -> Self {
        Self {
            id: super::entity_id_to_uuid(&event.id),
            event_type: event.event_type.into(),
            message_id: event.message_id.map(|id| super::entity_id_to_uuid(&id)),
            phone_number: event.phone_number,
            payload: event.payload.into(),
            processed: event.processed,
            created_at: super::timestamp_to_datetime(&event.created_at),
            processed_at: None,
            error_message: None,
            retry_count: 0,
        }
    }
}

impl From<Model> for domain::WhatsAppWebhookEvent {
    fn from(model: Model) -> Self {
        Self {
            id: super::uuid_to_entity_id(model.id),
            event_type: model.event_type.into(),
            message_id: model.message_id.map(super::uuid_to_entity_id),
            phone_number: model.phone_number,
            payload: model.payload.clone(),
            processed: model.processed,
            created_at: super::datetime_to_timestamp(model.created_at),
        }
    }
}

impl From<domain::WhatsAppWebhookEvent> for ActiveModel {
    fn from(event: domain::WhatsAppWebhookEvent) -> Self {
        Self {
            id: Set(super::entity_id_to_uuid(&event.id)),
            event_type: Set(event.event_type.into()),
            message_id: Set(event.message_id.map(|id| super::entity_id_to_uuid(&id))),
            phone_number: Set(event.phone_number),
            payload: Set(event.payload.into()),
            processed: Set(event.processed),
            created_at: Set(super::timestamp_to_datetime(&event.created_at)),
            processed_at: NotSet,
            error_message: NotSet,
            retry_count: Set(0),
        }
    }
}

/// Extended webhook event model with additional database-specific fields
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtendedWebhookEvent {
    pub id: pytake_core::entities::common::EntityId,
    pub event_type: domain::WebhookEventType,
    pub message_id: Option<pytake_core::entities::common::EntityId>,
    pub phone_number: String,
    pub payload: serde_json::Value,
    pub processed: bool,
    pub created_at: pytake_core::entities::common::Timestamp,
    pub processed_at: Option<pytake_core::entities::common::Timestamp>,
    pub error_message: Option<String>,
    pub retry_count: i32,
}

impl From<Model> for ExtendedWebhookEvent {
    fn from(model: Model) -> Self {
        Self {
            id: super::uuid_to_entity_id(model.id),
            event_type: model.event_type.into(),
            message_id: model.message_id.map(super::uuid_to_entity_id),
            phone_number: model.phone_number,
            payload: model.payload.clone(),
            processed: model.processed,
            created_at: super::datetime_to_timestamp(model.created_at),
            processed_at: model.processed_at.map(super::datetime_to_timestamp),
            error_message: model.error_message,
            retry_count: model.retry_count,
        }
    }
}

/// Utility functions for webhook event entity operations
impl Model {
    /// Check if event is processed
    pub fn is_processed(&self) -> bool {
        self.processed
    }

    /// Check if event has failed processing
    pub fn has_failed(&self) -> bool {
        self.error_message.is_some()
    }

    /// Check if event should be retried
    pub fn should_retry(&self, max_retries: i32) -> bool {
        !self.processed && self.retry_count < max_retries
    }

    /// Get the event age in seconds
    pub fn age_seconds(&self) -> i64 {
        let now = chrono::Utc::now();
        (now - self.created_at.into()).num_seconds()
    }

    /// Convert to domain entity
    pub fn to_domain(self) -> domain::WhatsAppWebhookEvent {
        self.into()
    }

    /// Convert to extended webhook event
    pub fn to_extended(self) -> ExtendedWebhookEvent {
        self.into()
    }
}

impl ActiveModel {
    /// Create from domain webhook event
    pub fn from_domain(event: domain::WhatsAppWebhookEvent) -> Self {
        event.into()
    }

    /// Mark event as processed
    pub fn mark_processed(&mut self) {
        self.processed = Set(true);
        self.processed_at = Set(Some(chrono::Utc::now()));
    }

    /// Mark event as failed with error message
    pub fn mark_failed(&mut self, error_message: String) {
        self.error_message = Set(Some(error_message));
        self.retry_count = Set(self.retry_count.clone().unwrap_or_default() + 1);
    }

    /// Reset for retry
    pub fn reset_for_retry(&mut self) {
        self.processed = Set(false);
        self.processed_at = Set(None);
        self.error_message = Set(None);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use pytake_core::entities::common::EntityId;

    #[test]
    fn test_webhook_event_type_conversion() {
        let domain_type = domain::WebhookEventType::MessageReceived;
        let db_type: WebhookEventType = domain_type.into();
        let back_to_domain: domain::WebhookEventType = db_type.into();
        
        assert_eq!(domain_type, back_to_domain);
    }

    #[test]
    fn test_webhook_event_model_conversion() {
        let payload = serde_json::json!({"test": "data"});
        let domain_event = domain::WhatsAppWebhookEvent::new(
            domain::WebhookEventType::MessageReceived,
            "+1234567890".to_string(),
            payload.clone(),
            None,
        );
        
        let db_model: Model = domain_event.clone().into();
        let back_to_domain: domain::WhatsAppWebhookEvent = db_model.into();
        
        assert_eq!(domain_event.event_type, back_to_domain.event_type);
        assert_eq!(domain_event.phone_number, back_to_domain.phone_number);
        assert_eq!(domain_event.processed, back_to_domain.processed);
    }

    #[test]
    fn test_webhook_event_utility_functions() {
        let payload = serde_json::json!({"test": "data"});
        let domain_event = domain::WhatsAppWebhookEvent::new(
            domain::WebhookEventType::MessageReceived,
            "+1234567890".to_string(),
            payload,
            None,
        );
        
        let db_model: Model = domain_event.into();
        
        assert!(!db_model.is_processed());
        assert!(!db_model.has_failed());
        assert!(db_model.should_retry(3));
        assert!(db_model.age_seconds() >= 0);
    }

    #[test]
    fn test_active_model_processing_operations() {
        let payload = serde_json::json!({"test": "data"});
        let domain_event = domain::WhatsAppWebhookEvent::new(
            domain::WebhookEventType::MessageReceived,
            "+1234567890".to_string(),
            payload,
            None,
        );
        
        let mut active_model = ActiveModel::from_domain(domain_event);
        
        // Test mark processed
        active_model.mark_processed();
        match active_model.processed {
            Set(true) => (),
            _ => panic!("Expected processed to be Set(true)"),
        }
        
        // Test mark failed
        active_model.mark_failed("Test error".to_string());
        match active_model.error_message {
            Set(Some(ref msg)) => assert_eq!(msg, "Test error"),
            _ => panic!("Expected error_message to be Set(Some(error))"),
        }
    }

    #[test]
    fn test_extended_webhook_event_conversion() {
        let payload = serde_json::json!({"test": "data"});
        let domain_event = domain::WhatsAppWebhookEvent::new(
            domain::WebhookEventType::MessageReceived,
            "+1234567890".to_string(),
            payload.clone(),
            None,
        );
        
        let db_model: Model = domain_event.into();
        let extended: ExtendedWebhookEvent = db_model.into();
        
        assert_eq!(extended.event_type, domain::WebhookEventType::MessageReceived);
        assert_eq!(extended.phone_number, "+1234567890");
        assert_eq!(extended.payload, payload);
        assert!(!extended.processed);
        assert_eq!(extended.retry_count, 0);
        assert!(extended.processed_at.is_none());
        assert!(extended.error_message.is_none());
    }
}