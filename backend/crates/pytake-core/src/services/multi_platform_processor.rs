//! Multi-platform message processor service

use crate::messaging::{Platform, MessagingPlatform, WhatsAppPlatform, MessageContent as MessagingMessageContent};
use crate::queue::{JobProcessor, JobResult, JobType, MessageContent as QueueMessageContent, QueueJob};
use async_trait::async_trait;
use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;
use tracing::{info, warn, error, debug};

/// Service to process messages from multiple platforms
#[derive(Clone)]
pub struct MultiPlatformMessageProcessor {
    platforms: HashMap<Platform, Arc<dyn MessagingPlatform>>,
}

impl MultiPlatformMessageProcessor {
    /// Create a new multi-platform message processor
    pub fn new() -> Self {
        Self {
            platforms: HashMap::new(),
        }
    }

    /// Register a platform implementation
    pub fn register_platform<P>(&mut self, platform: P) 
    where
        P: MessagingPlatform + 'static,
    {
        let platform_type = platform.platform();
        self.platforms.insert(platform_type, Arc::new(platform));
        info!("Registered platform: {}", platform_type);
    }

    /// Get platform implementation
    pub fn get_platform(&self, platform: Platform) -> Option<&Arc<dyn MessagingPlatform>> {
        self.platforms.get(&platform)
    }

    /// Get all registered platforms
    pub fn get_platforms(&self) -> Vec<Platform> {
        self.platforms.keys().copied().collect()
    }

    /// Process inbound message from any platform
    async fn process_inbound_message(
        &self,
        platform: Platform,
        message_id: String,
        from: String,
        _timestamp: i64,
        _content: QueueMessageContent,
    ) -> JobResult {
        info!("Processing inbound message from {} platform: {}", platform, message_id);

        let platform_impl = match self.get_platform(platform) {
            Some(impl_) => impl_,
            None => {
                error!("Platform {} not registered", platform);
                return JobResult::PermanentFailure(format!("Platform {} not supported", platform));
            }
        };

        // TODO: Store message in database
        // TODO: Apply business rules
        // TODO: Trigger flows if needed
        // TODO: Send auto-responses if configured

        debug!("Processed inbound {} message from {}", platform, from);
        JobResult::Success
    }

    /// Send message through any platform
    async fn send_message(
        &self,
        platform: Platform,
        to: String,
        content: QueueMessageContent,
        retry_count: u32,
    ) -> JobResult {
        info!("Sending message via {} platform to: {}", platform, to);

        let platform_impl = match self.get_platform(platform) {
            Some(impl_) => impl_,
            None => {
                error!("Platform {} not registered", platform);
                return JobResult::PermanentFailure(format!("Platform {} not supported", platform));
            }
        };

        // TODO: Convert QueueMessageContent to MessagingMessageContent
        info!("Message sent via {} (simulated): {}", platform, to);
        JobResult::Success
    }

    /// Update message status
    async fn update_message_status(
        &self,
        platform: Platform,
        message_id: String,
        status: crate::queue::MessageStatus,
        timestamp: chrono::DateTime<chrono::Utc>,
    ) -> JobResult {
        info!("Updating message status for {} platform: {} -> {:?}", platform, message_id, status);

        // TODO: Update database with new status
        // TODO: Trigger webhooks/notifications if needed
        // TODO: Update metrics

        debug!("Updated message status for {}: {}", platform, message_id);
        JobResult::Success
    }

    /// Process webhook event from any platform
    async fn process_webhook(
        &self,
        platform: Platform,
        event_type: String,
        payload: serde_json::Value,
    ) -> JobResult {
        info!("Processing webhook event from {} platform: {}", platform, event_type);

        let platform_impl = match self.get_platform(platform) {
            Some(impl_) => impl_,
            None => {
                error!("Platform {} not registered", platform);
                return JobResult::PermanentFailure(format!("Platform {} not supported", platform));
            }
        };

        // Parse the webhook event using platform-specific logic
        match platform_impl.parse_webhook_event(&payload.to_string()) {
            Ok(events) => {
                for event in events {
                    debug!("Parsed webhook event: {:?}", event.event_type);
                    
                    // TODO: Process each event type appropriately
                    match event.event_type {
                        crate::messaging::WebhookEventType::MessageReceived => {
                            // Extract message data and queue for processing
                            debug!("Received message event from {}", platform);
                        }
                        crate::messaging::WebhookEventType::MessageDelivered => {
                            // Update message status to delivered
                            debug!("Message delivered on {}", platform);
                        }
                        crate::messaging::WebhookEventType::MessageRead => {
                            // Update message status to read
                            debug!("Message read on {}", platform);
                        }
                        crate::messaging::WebhookEventType::MessageFailed => {
                            // Handle failed message
                            debug!("Message failed on {}", platform);
                        }
                        _ => {
                            debug!("Unhandled webhook event type: {:?}", event.event_type);
                        }
                    }
                }
                JobResult::Success
            }
            Err(e) => {
                error!("Failed to parse webhook event from {}: {}", platform, e);
                JobResult::RetryableFailure(format!("Webhook parse failed: {}", e))
            }
        }
    }

    /// Download media from any platform
    async fn download_media(
        &self,
        platform: Platform,
        media_id: String,
        media_url: String,
        message_id: String,
    ) -> JobResult {
        info!("Downloading media from {} platform: {}", platform, media_id);

        let platform_impl = match self.get_platform(platform) {
            Some(impl_) => impl_,
            None => {
                error!("Platform {} not registered", platform);
                return JobResult::PermanentFailure(format!("Platform {} not supported", platform));
            }
        };

        match platform_impl.download_media(&media_id).await {
            Ok(media_bytes) => {
                info!("Downloaded {} bytes from {} for message {}", media_bytes.len(), platform, message_id);
                
                // TODO: Store media file
                // TODO: Update message with local media path
                // TODO: Scan for viruses/malware if needed
                
                JobResult::Success
            }
            Err(e) => {
                error!("Failed to download media from {}: {}", platform, e);
                JobResult::RetryableFailure(format!("Media download failed: {}", e))
            }
        }
    }
}

impl Default for MultiPlatformMessageProcessor {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl JobProcessor for MultiPlatformMessageProcessor {
    async fn process(&self, job: QueueJob) -> JobResult {
        match job.job_type {
            JobType::ProcessInboundMessage {
                platform,
                message_id,
                from,
                timestamp,
                content,
            } => self.process_inbound_message(platform, message_id, from, timestamp, content).await,
            
            JobType::SendMessage { platform, to, content, retry_count } => {
                self.send_message(platform, to, content, retry_count).await
            }
            
            JobType::UpdateMessageStatus { platform, message_id, status, timestamp } => {
                self.update_message_status(platform, message_id, status, timestamp).await
            }
            
            JobType::ProcessWebhook { platform, event_type, payload } => {
                self.process_webhook(platform, event_type, payload).await
            }
            
            JobType::DownloadMedia { platform, media_id, media_url, message_id } => {
                self.download_media(platform, media_id, media_url, message_id).await
            }
            
            // Contact sync and other jobs are platform-agnostic
            JobType::SyncContacts { phone_numbers } => {
                info!("Syncing {} contacts", phone_numbers.len());
                // TODO: Implement contact sync logic
                JobResult::Success
            }
            
            JobType::ExecuteFlow { flow_id, contact_id, .. } => {
                info!("Executing flow {} for contact {}", flow_id, contact_id);
                // TODO: Implement flow execution logic
                JobResult::Success
            }
            
            JobType::UpdateContactsInfo { results } => {
                info!("Updating info for {} contacts", results.len());
                // TODO: Implement contact update logic
                JobResult::Success
            }
            
            JobType::SyncContactFailed { phone_number, error } => {
                warn!("Contact sync failed for {}: {}", phone_number, error);
                // TODO: Handle failed contact sync
                JobResult::Success
            }
            
            JobType::SyncStaleContacts { limit } => {
                info!("Syncing up to {} stale contacts", limit);
                // TODO: Implement stale contact sync
                JobResult::Success
            }
            
            // Notification jobs handled separately
            JobType::ProcessScheduledNotifications |
            JobType::SendNotification { .. } |
            JobType::SendBulkNotifications { .. } |
            JobType::CleanupExpiredNotifications => {
                JobResult::PermanentFailure("Notification jobs should be handled by NotificationProcessor".to_string())
            }
        }
    }

    fn queues(&self) -> Vec<String> {
        vec![
            "inbound".to_string(),
            "outbound".to_string(),
            "status".to_string(),
            "webhook".to_string(),
            "media".to_string(),
            "contacts".to_string(),
            "flow".to_string(),
        ]
    }

    fn poll_interval(&self) -> Duration {
        Duration::from_secs(1)
    }
}

/// Builder for creating multi-platform processor with common platforms
pub struct MultiPlatformProcessorBuilder {
    processor: MultiPlatformMessageProcessor,
}

impl MultiPlatformProcessorBuilder {
    /// Create new builder
    pub fn new() -> Self {
        Self {
            processor: MultiPlatformMessageProcessor::new(),
        }
    }

    /// Add WhatsApp platform
    pub fn with_whatsapp(mut self, whatsapp_platform: WhatsAppPlatform) -> Self {
        self.processor.register_platform(whatsapp_platform);
        self
    }

    /// Build the processor
    pub fn build(self) -> MultiPlatformMessageProcessor {
        self.processor
    }
}

impl Default for MultiPlatformProcessorBuilder {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::whatsapp::WhatsAppClient;

    #[test]
    fn test_processor_creation() {
        let processor = MultiPlatformMessageProcessor::new();
        assert_eq!(processor.get_platforms().len(), 0);
    }

    #[test]
    fn test_platform_registration() {
        let mut processor = MultiPlatformMessageProcessor::new();
        
        let whatsapp_platform = WhatsAppPlatform::new("test_token".to_string(), "test_phone".to_string());
        
        processor.register_platform(whatsapp_platform);
        
        assert_eq!(processor.get_platforms().len(), 1);
        assert!(processor.get_platforms().contains(&Platform::WhatsApp));
        assert!(processor.get_platform(Platform::WhatsApp).is_some());
    }

    #[test]
    fn test_builder_pattern() {
        let whatsapp_platform = WhatsAppPlatform::new("test_token".to_string(), "test_phone".to_string());
        
        let processor = MultiPlatformProcessorBuilder::new()
            .with_whatsapp(whatsapp_platform)
            .build();
        
        assert_eq!(processor.get_platforms().len(), 1);
        assert!(processor.get_platforms().contains(&Platform::WhatsApp));
    }

    #[test]
    fn test_queues() {
        let processor = MultiPlatformMessageProcessor::new();
        let queues = processor.queues();
        
        assert!(queues.contains(&"inbound".to_string()));
        assert!(queues.contains(&"outbound".to_string()));
        assert!(queues.contains(&"webhook".to_string()));
    }
}