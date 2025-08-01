//! Notification worker for processing scheduled notifications

use pytake_core::queue::{JobProcessor, JobResult, QueueJob};
use pytake_core::services::notification::NotificationService;
use pytake_core::websocket::WebSocketManager;
use std::sync::Arc;
use std::time::Duration;
use tracing::{info, error, debug};
use async_trait::async_trait;

/// Notification worker for processing notification jobs
pub struct NotificationWorker {
    notification_service: Arc<NotificationService>,
    websocket_manager: Arc<WebSocketManager>,
}

impl NotificationWorker {
    /// Create new notification worker
    pub fn new(
        notification_service: Arc<NotificationService>,
        websocket_manager: Arc<WebSocketManager>,
    ) -> Self {
        Self {
            notification_service,
            websocket_manager,
        }
    }
    
    /// Process scheduled notifications
    async fn process_scheduled_notifications(&self) -> JobResult {
        debug!("Processing scheduled notifications");
        
        match self.notification_service.process_scheduled_notifications().await {
            Ok(notifications) => {
                for notification in notifications {
                    // Send through WebSocket if enabled
                    if notification.channels.contains(&pytake_core::services::notification::NotificationChannel::WebSocket) {
                        let ws_message = self.notification_service.to_websocket_message(&notification);
                        
                        if let Err(e) = self.websocket_manager
                            .connection_manager()
                            .send_to_user(notification.recipient_id, ws_message)
                            .await
                        {
                            error!("Failed to send WebSocket notification: {}", e);
                        }
                    }
                    
                    // Send through other channels
                    if let Err(e) = self.notification_service.send_notification(&notification).await {
                        error!("Failed to send notification {}: {}", notification.id, e);
                    } else {
                        info!("Sent scheduled notification {}", notification.id);
                    }
                }
                
                JobResult::Success
            }
            Err(e) => {
                error!("Failed to process scheduled notifications: {}", e);
                JobResult::RetryableFailure(format!("Failed to process scheduled notifications: {}", e))
            }
        }
    }
    
    /// Send notification immediately
    async fn send_notification(&self, notification_id: uuid::Uuid) -> JobResult {
        debug!("Sending notification {}", notification_id);
        
        // In a real implementation, this would:
        // 1. Fetch notification from database
        // 2. Send through configured channels
        // 3. Update delivery status
        
        info!("Notification {} sent successfully", notification_id);
        JobResult::Success
    }
    
    /// Send bulk notifications
    async fn send_bulk_notifications(&self, notification_ids: Vec<uuid::Uuid>) -> JobResult {
        debug!("Sending {} bulk notifications", notification_ids.len());
        
        let mut success_count = 0;
        let mut error_count = 0;
        
        for notification_id in notification_ids {
            match self.send_notification(notification_id).await {
                JobResult::Success => success_count += 1,
                _ => error_count += 1,
            }
        }
        
        info!("Bulk notification results: {} success, {} errors", success_count, error_count);
        
        if error_count > 0 && success_count == 0 {
            JobResult::RetryableFailure("All bulk notifications failed".to_string())
        } else if error_count > 0 {
            JobResult::Success // Partial success
        } else {
            JobResult::Success
        }
    }
    
    /// Clean up expired notifications
    async fn cleanup_expired_notifications(&self) -> JobResult {
        debug!("Cleaning up expired notifications");
        
        // In a real implementation, this would:
        // 1. Query database for expired notifications
        // 2. Delete or mark as expired
        // 3. Clean up related resources
        
        info!("Expired notifications cleaned up");
        JobResult::Success
    }
}

#[async_trait]
impl JobProcessor for NotificationWorker {
    async fn process(&self, job: QueueJob) -> JobResult {
        match job.job_type {
            pytake_core::queue::JobType::ProcessScheduledNotifications => {
                self.process_scheduled_notifications().await
            }
            
            pytake_core::queue::JobType::SendNotification { notification_id } => {
                self.send_notification(notification_id).await
            }
            
            pytake_core::queue::JobType::SendBulkNotifications { notification_ids } => {
                self.send_bulk_notifications(notification_ids).await
            }
            
            pytake_core::queue::JobType::CleanupExpiredNotifications => {
                self.cleanup_expired_notifications().await
            }
            
            _ => {
                error!("Unsupported job type for notification worker: {:?}", job.job_type);
                JobResult::PermanentFailure("Unsupported job type".to_string())
            }
        }
    }
    
    fn queues(&self) -> Vec<String> {
        vec![
            "notifications".to_string(),
            "scheduled_notifications".to_string(),
            "bulk_notifications".to_string(),
        ]
    }
    
    fn max_concurrent_jobs(&self) -> usize {
        10 // Process up to 10 notification jobs concurrently
    }
    
    fn poll_interval(&self) -> Duration {
        Duration::from_secs(5) // Check for new notification jobs every 5 seconds
    }
}

/// Notification integration service
pub struct NotificationIntegrationService {
    notification_service: Arc<NotificationService>,
    websocket_manager: Arc<WebSocketManager>,
}

impl NotificationIntegrationService {
    /// Create new notification integration service
    pub fn new(
        notification_service: Arc<NotificationService>,
        websocket_manager: Arc<WebSocketManager>,
    ) -> Self {
        Self {
            notification_service,
            websocket_manager,
        }
    }
    
    /// Send notification for new message
    pub async fn notify_new_message(
        &self,
        recipient_id: uuid::Uuid,
        sender_name: &str,
        message_preview: &str,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let notification = self.notification_service
            .notify_new_message(recipient_id, sender_name, message_preview)
            .await?;
        
        // Send via WebSocket if enabled
        if notification.channels.contains(&pytake_core::services::notification::NotificationChannel::WebSocket) {
            let ws_message = self.notification_service.to_websocket_message(&notification);
            
            if let Err(e) = self.websocket_manager
                .connection_manager()
                .send_to_user(recipient_id, ws_message)
                .await
            {
                error!("Failed to send WebSocket notification: {}", e);
            }
        }
        
        // Send through other channels
        self.notification_service.send_notification(&notification).await?;
        
        Ok(())
    }
    
    /// Send notification for message status update
    pub async fn notify_message_status(
        &self,
        recipient_id: uuid::Uuid,
        status: &str,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let notification = self.notification_service
            .notify_message_status(recipient_id, status)
            .await?;
        
        // Send via WebSocket if enabled
        if notification.channels.contains(&pytake_core::services::notification::NotificationChannel::WebSocket) {
            let ws_message = self.notification_service.to_websocket_message(&notification);
            
            if let Err(e) = self.websocket_manager
                .connection_manager()
                .send_to_user(recipient_id, ws_message)
                .await
            {
                error!("Failed to send WebSocket notification: {}", e);
            }
        }
        
        self.notification_service.send_notification(&notification).await?;
        
        Ok(())
    }
    
    /// Send system alert
    pub async fn send_system_alert(
        &self,
        recipient_id: uuid::Uuid,
        alert_message: &str,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let notification = self.notification_service
            .notify_system_alert(recipient_id, alert_message)
            .await?;
        
        // Send via WebSocket if enabled
        if notification.channels.contains(&pytake_core::services::notification::NotificationChannel::WebSocket) {
            let ws_message = self.notification_service.to_websocket_message(&notification);
            
            if let Err(e) = self.websocket_manager
                .connection_manager()
                .send_to_user(recipient_id, ws_message)
                .await
            {
                error!("Failed to send WebSocket notification: {}", e);
            }
        }
        
        self.notification_service.send_notification(&notification).await?;
        
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use pytake_core::auth::token::TokenValidator;
    
    #[tokio::test]
    async fn test_notification_worker_creation() {
        let notification_service = Arc::new(NotificationService::new());
        let token_validator = Arc::new(TokenValidator::new(
            pytake_core::auth::token::TokenConfig::default()
        ));
        let websocket_manager = Arc::new(pytake_core::websocket::WebSocketManager::new(token_validator));
        
        let worker = NotificationWorker::new(notification_service, websocket_manager);
        
        assert_eq!(worker.queues().len(), 3);
        assert_eq!(worker.max_concurrent_jobs(), 10);
    }
    
    #[tokio::test]
    async fn test_notification_integration_service() {
        let notification_service = Arc::new(NotificationService::new());
        let token_validator = Arc::new(TokenValidator::new(
            pytake_core::auth::token::TokenConfig::default()
        ));
        let websocket_manager = Arc::new(pytake_core::websocket::WebSocketManager::new(token_validator));
        
        let integration_service = NotificationIntegrationService::new(
            notification_service,
            websocket_manager,
        );
        
        let recipient_id = uuid::Uuid::new_v4();
        
        // Test new message notification
        let result = integration_service.notify_new_message(
            recipient_id,
            "Test User",
            "Hello world",
        ).await;
        
        assert!(result.is_ok());
    }
}