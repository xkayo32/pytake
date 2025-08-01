//! Notification service for managing system notifications

use crate::errors::{CoreError, CoreResult};
use crate::websocket::{NotificationLevel, WebSocketMessage};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;
use chrono::{DateTime, Utc};
use tracing::{info, debug};

/// Notification service for managing system notifications
pub struct NotificationService {
    // In a real implementation, this might have database or external service integrations
}

/// Notification types
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum NotificationType {
    /// New message received
    NewMessage,
    /// Message status changed
    MessageStatus,
    /// Contact sync completed
    ContactSync,
    /// System alert
    SystemAlert,
    /// User mention
    UserMention,
    /// Assignment notification
    Assignment,
    /// Flow completed
    FlowCompleted,
    /// Custom notification
    Custom(String),
}

/// Notification priority levels
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, PartialOrd)]
#[serde(rename_all = "lowercase")]
pub enum NotificationPriority {
    Low = 1,
    Normal = 2,
    High = 3,
    Critical = 4,
}

/// Notification channels
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "snake_case")]
pub enum NotificationChannel {
    /// WebSocket real-time notification
    WebSocket,
    /// Email notification
    Email,
    /// SMS notification
    Sms,
    /// Push notification
    Push,
    /// In-app notification
    InApp,
}

/// Notification data structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Notification {
    pub id: Uuid,
    pub notification_type: NotificationType,
    pub priority: NotificationPriority,
    pub title: String,
    pub message: String,
    pub recipient_id: Uuid,
    pub sender_id: Option<Uuid>,
    pub channels: Vec<NotificationChannel>,
    pub metadata: HashMap<String, serde_json::Value>,
    pub created_at: DateTime<Utc>,
    pub scheduled_for: Option<DateTime<Utc>>,
    pub expires_at: Option<DateTime<Utc>>,
    pub is_read: bool,
    pub read_at: Option<DateTime<Utc>>,
}

/// Notification template for reusable notifications
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotificationTemplate {
    pub id: String,
    pub notification_type: NotificationType,
    pub title_template: String,
    pub message_template: String,
    pub default_channels: Vec<NotificationChannel>,
    pub default_priority: NotificationPriority,
    pub variables: Vec<String>,
}

/// Notification preferences for users
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotificationPreferences {
    pub user_id: Uuid,
    pub enabled_types: Vec<NotificationType>,
    pub enabled_channels: Vec<NotificationChannel>,
    pub quiet_hours_start: Option<String>, // HH:MM format
    pub quiet_hours_end: Option<String>,   // HH:MM format
    pub timezone: String,
}

/// Notification delivery result
#[derive(Debug, Clone)]
pub enum DeliveryResult {
    Success,
    Failed(String),
    Retry(DateTime<Utc>),
    Skipped(String),
}

/// Notification context for template rendering
pub type NotificationContext = HashMap<String, serde_json::Value>;

impl NotificationService {
    /// Create new notification service
    pub fn new() -> Self {
        Self {}
    }
    
    /// Create a new notification
    pub async fn create_notification(
        &self,
        notification_type: NotificationType,
        title: String,
        message: String,
        recipient_id: Uuid,
        sender_id: Option<Uuid>,
        priority: NotificationPriority,
        channels: Vec<NotificationChannel>,
    ) -> CoreResult<Notification> {
        let notification = Notification {
            id: Uuid::new_v4(),
            notification_type,
            priority,
            title,
            message,
            recipient_id,
            sender_id,
            channels,
            metadata: HashMap::new(),
            created_at: Utc::now(),
            scheduled_for: None,
            expires_at: None,
            is_read: false,
            read_at: None,
        };
        
        info!("Created notification {} for user {}", notification.id, recipient_id);
        Ok(notification)
    }
    
    /// Create notification from template
    pub async fn create_from_template(
        &self,
        template_id: &str,
        recipient_id: Uuid,
        sender_id: Option<Uuid>,
        context: NotificationContext,
    ) -> CoreResult<Notification> {
        let template = self.get_template(template_id).await?;
        
        let title = self.render_template(&template.title_template, &context)?;
        let message = self.render_template(&template.message_template, &context)?;
        
        let mut notification = self.create_notification(
            template.notification_type,
            title,
            message,
            recipient_id,
            sender_id,
            template.default_priority,
            template.default_channels,
        ).await?;
        
        // Add template metadata
        notification.metadata.insert(
            "template_id".to_string(),
            serde_json::Value::String(template_id.to_string()),
        );
        notification.metadata.insert(
            "context".to_string(),
            serde_json::to_value(context)?,
        );
        
        Ok(notification)
    }
    
    /// Schedule a notification for later delivery
    pub async fn schedule_notification(
        &self,
        mut notification: Notification,
        scheduled_for: DateTime<Utc>,
    ) -> CoreResult<Notification> {
        notification.scheduled_for = Some(scheduled_for);
        
        info!(
            "Scheduled notification {} for delivery at {}",
            notification.id, scheduled_for
        );
        
        Ok(notification)
    }
    
    /// Mark notification as read
    pub async fn mark_as_read(&self, notification_id: Uuid, user_id: Uuid) -> CoreResult<()> {
        info!("Marking notification {} as read by user {}", notification_id, user_id);
        
        // In real implementation, this would update the database
        Ok(())
    }
    
    /// Get notifications for user
    pub async fn get_user_notifications(
        &self,
        user_id: Uuid,
        unread_only: bool,
        limit: usize,
        offset: usize,
    ) -> CoreResult<Vec<Notification>> {
        debug!(
            "Getting notifications for user {} (unread_only: {}, limit: {}, offset: {})",
            user_id, unread_only, limit, offset
        );
        
        // In real implementation, this would query the database
        Ok(vec![])
    }
    
    /// Get unread notification count for user
    pub async fn get_unread_count(&self, user_id: Uuid) -> CoreResult<u64> {
        debug!("Getting unread notification count for user {}", user_id);
        
        // In real implementation, this would query the database
        Ok(0)
    }
    
    /// Process scheduled notifications
    pub async fn process_scheduled_notifications(&self) -> CoreResult<Vec<Notification>> {
        let now = Utc::now();
        debug!("Processing scheduled notifications at {}", now);
        
        // In real implementation, this would:
        // 1. Query database for notifications scheduled before now
        // 2. Send each notification
        // 3. Update status
        
        Ok(vec![])
    }
    
    /// Send notification through specified channels
    pub async fn send_notification(&self, notification: &Notification) -> CoreResult<HashMap<NotificationChannel, DeliveryResult>> {
        let mut results = HashMap::new();
        
        for channel in &notification.channels {
            let result = self.send_to_channel(notification, channel).await;
            results.insert(channel.clone(), result);
        }
        
        info!("Sent notification {} through {} channels", notification.id, notification.channels.len());
        Ok(results)
    }
    
    /// Send notification to specific channel
    async fn send_to_channel(&self, notification: &Notification, channel: &NotificationChannel) -> DeliveryResult {
        match channel {
            NotificationChannel::WebSocket => {
                // WebSocket delivery would be handled by WebSocket service
                debug!("WebSocket delivery for notification {}", notification.id);
                DeliveryResult::Success
            }
            
            NotificationChannel::Email => {
                // Email delivery would be handled by email service
                debug!("Email delivery for notification {}", notification.id);
                DeliveryResult::Success
            }
            
            NotificationChannel::Sms => {
                // SMS delivery would be handled by SMS service
                debug!("SMS delivery for notification {}", notification.id);
                DeliveryResult::Success
            }
            
            NotificationChannel::Push => {
                // Push notification delivery
                debug!("Push notification delivery for notification {}", notification.id);
                DeliveryResult::Success
            }
            
            NotificationChannel::InApp => {
                // In-app notification (usually stored in database)
                debug!("In-app notification delivery for notification {}", notification.id);
                DeliveryResult::Success
            }
        }
    }
    
    /// Get notification template
    async fn get_template(&self, template_id: &str) -> CoreResult<NotificationTemplate> {
        // Return built-in templates or load from database
        match template_id {
            "new_message" => Ok(NotificationTemplate {
                id: "new_message".to_string(),
                notification_type: NotificationType::NewMessage,
                title_template: "Nova mensagem de {{sender_name}}".to_string(),
                message_template: "{{message_preview}}".to_string(),
                default_channels: vec![
                    NotificationChannel::WebSocket,
                    NotificationChannel::InApp,
                ],
                default_priority: NotificationPriority::Normal,
                variables: vec!["sender_name".to_string(), "message_preview".to_string()],
            }),
            
            "message_status" => Ok(NotificationTemplate {
                id: "message_status".to_string(),
                notification_type: NotificationType::MessageStatus,
                title_template: "Status da mensagem atualizado".to_string(),
                message_template: "Sua mensagem foi {{status}}".to_string(),
                default_channels: vec![NotificationChannel::WebSocket],
                default_priority: NotificationPriority::Low,
                variables: vec!["status".to_string()],
            }),
            
            "contact_sync" => Ok(NotificationTemplate {
                id: "contact_sync".to_string(),
                notification_type: NotificationType::ContactSync,
                title_template: "Sincronização de contatos".to_string(),
                message_template: "{{count}} contatos foram sincronizados".to_string(),
                default_channels: vec![NotificationChannel::InApp],
                default_priority: NotificationPriority::Low,
                variables: vec!["count".to_string()],
            }),
            
            "system_alert" => Ok(NotificationTemplate {
                id: "system_alert".to_string(),
                notification_type: NotificationType::SystemAlert,
                title_template: "Alerta do sistema".to_string(),
                message_template: "{{alert_message}}".to_string(),
                default_channels: vec![
                    NotificationChannel::WebSocket,
                    NotificationChannel::Email,
                    NotificationChannel::InApp,
                ],
                default_priority: NotificationPriority::High,
                variables: vec!["alert_message".to_string()],
            }),
            
            _ => Err(CoreError::not_found("template", template_id)),
        }
    }
    
    /// Render template with context
    fn render_template(&self, template: &str, context: &NotificationContext) -> CoreResult<String> {
        let mut result = template.to_string();
        
        // Simple template rendering (in production, use a proper template engine)
        for (key, value) in context {
            let placeholder = format!("{{{{{}}}}}", key);
            let replacement = match value {
                serde_json::Value::String(s) => s.clone(),
                serde_json::Value::Number(n) => n.to_string(),
                serde_json::Value::Bool(b) => b.to_string(),
                _ => value.to_string(),
            };
            result = result.replace(&placeholder, &replacement);
        }
        
        Ok(result)
    }
    
    /// Convert notification to WebSocket message
    pub fn to_websocket_message(&self, notification: &Notification) -> WebSocketMessage {
        let level = match notification.priority {
            NotificationPriority::Low => NotificationLevel::Info,
            NotificationPriority::Normal => NotificationLevel::Info,
            NotificationPriority::High => NotificationLevel::Warning,
            NotificationPriority::Critical => NotificationLevel::Error,
        };
        
        WebSocketMessage::Notification {
            id: notification.id,
            title: notification.title.clone(),
            message: notification.message.clone(),
            level,
            timestamp: notification.created_at,
            metadata: Some(notification.metadata.clone()),
        }
    }
    
    /// Create quick notification helpers
    pub async fn notify_new_message(
        &self,
        recipient_id: Uuid,
        sender_name: &str,
        message_preview: &str,
    ) -> CoreResult<Notification> {
        let mut context = NotificationContext::new();
        context.insert("sender_name".to_string(), serde_json::Value::String(sender_name.to_string()));
        context.insert("message_preview".to_string(), serde_json::Value::String(message_preview.to_string()));
        
        self.create_from_template("new_message", recipient_id, None, context).await
    }
    
    pub async fn notify_message_status(
        &self,
        recipient_id: Uuid,
        status: &str,
    ) -> CoreResult<Notification> {
        let mut context = NotificationContext::new();
        context.insert("status".to_string(), serde_json::Value::String(status.to_string()));
        
        self.create_from_template("message_status", recipient_id, None, context).await
    }
    
    pub async fn notify_contact_sync(
        &self,
        recipient_id: Uuid,
        count: u64,
    ) -> CoreResult<Notification> {
        let mut context = NotificationContext::new();
        context.insert("count".to_string(), serde_json::Value::Number(serde_json::Number::from(count)));
        
        self.create_from_template("contact_sync", recipient_id, None, context).await
    }
    
    pub async fn notify_system_alert(
        &self,
        recipient_id: Uuid,
        alert_message: &str,
    ) -> CoreResult<Notification> {
        let mut context = NotificationContext::new();
        context.insert("alert_message".to_string(), serde_json::Value::String(alert_message.to_string()));
        
        self.create_from_template("system_alert", recipient_id, None, context).await
    }
}

impl Default for NotificationService {
    fn default() -> Self {
        Self::new()
    }
}

impl Default for NotificationPriority {
    fn default() -> Self {
        Self::Normal
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_create_notification() {
        let service = NotificationService::new();
        
        let notification = service.create_notification(
            NotificationType::NewMessage,
            "Test Title".to_string(),
            "Test Message".to_string(),
            Uuid::new_v4(),
            None,
            NotificationPriority::Normal,
            vec![NotificationChannel::WebSocket],
        ).await.unwrap();
        
        assert_eq!(notification.title, "Test Title");
        assert_eq!(notification.message, "Test Message");
        assert_eq!(notification.priority, NotificationPriority::Normal);
        assert!(!notification.is_read);
    }
    
    #[tokio::test]
    async fn test_template_rendering() {
        let service = NotificationService::new();
        let mut context = NotificationContext::new();
        context.insert("name".to_string(), serde_json::Value::String("João".to_string()));
        context.insert("count".to_string(), serde_json::Value::Number(serde_json::Number::from(5)));
        
        let result = service.render_template("Olá {{name}}, você tem {{count}} mensagens", &context).unwrap();
        assert_eq!(result, "Olá João, você tem 5 mensagens");
    }
    
    #[tokio::test]
    async fn test_create_from_template() {
        let service = NotificationService::new();
        let recipient_id = Uuid::new_v4();
        
        let notification = service.notify_new_message(
            recipient_id,
            "João Silva",
            "Olá, como você está?",
        ).await.unwrap();
        
        assert_eq!(notification.recipient_id, recipient_id);
        assert_eq!(notification.notification_type, NotificationType::NewMessage);
        assert!(notification.title.contains("João Silva"));
        assert!(notification.message.contains("Olá, como você está?"));
    }
    
    #[test]
    fn test_to_websocket_message() {
        let service = NotificationService::new();
        let notification = Notification {
            id: Uuid::new_v4(),
            notification_type: NotificationType::NewMessage,
            priority: NotificationPriority::High,
            title: "Test".to_string(),
            message: "Test message".to_string(),
            recipient_id: Uuid::new_v4(),
            sender_id: None,
            channels: vec![],
            metadata: HashMap::new(),
            created_at: Utc::now(),
            scheduled_for: None,
            expires_at: None,
            is_read: false,
            read_at: None,
        };
        
        let ws_message = service.to_websocket_message(&notification);
        
        match ws_message {
            WebSocketMessage::Notification { title, level, .. } => {
                assert_eq!(title, "Test");
                assert_eq!(level, NotificationLevel::Warning);
            }
            _ => panic!("Expected Notification message"),
        }
    }
}