//! WhatsApp message processor service

use crate::queue::{JobProcessor, JobResult, JobType, MessageContent, QueueJob};
use async_trait::async_trait;
use std::time::Duration;
use tracing::{info, warn, error};

/// Service to process WhatsApp messages
#[derive(Clone)]
pub struct WhatsAppMessageProcessor {
    db: Option<std::sync::Arc<sea_orm::DatabaseConnection>>,
    whatsapp_client: Option<std::sync::Arc<pytake_whatsapp::WhatsAppClient>>,
}

impl WhatsAppMessageProcessor {
    /// Create a new WhatsApp message processor
    pub fn new() -> Self {
        Self {
            db: None,
            whatsapp_client: None,
        }
    }
    
    /// Create with dependencies
    pub fn with_dependencies(
        db: std::sync::Arc<sea_orm::DatabaseConnection>,
        whatsapp_client: std::sync::Arc<pytake_whatsapp::WhatsAppClient>,
    ) -> Self {
        Self {
            db: Some(db),
            whatsapp_client: Some(whatsapp_client),
        }
    }

    /// Process inbound message
    async fn process_inbound_message(
        &self,
        message_id: String,
        from: String,
        _timestamp: i64,
        content: MessageContent,
    ) -> JobResult {
        info!("Processing inbound message {} from {}", message_id, from);

        // For now, just log the message and return success
        // The actual database storage will be handled by pytake-api
        // which has access to pytake-db
        info!("Processed inbound message {} from {} with content: {:?}", 
              message_id, from, content);

        // TODO: Check for active flows
        // TODO: Route to appropriate handler (flow engine or agent)

        JobResult::Success
    }

    /// Send outbound message
    async fn send_message(
        &self,
        to: String,
        content: MessageContent,
        retry_count: u32,
    ) -> JobResult {
        info!("Sending message to {} (retry: {})", to, retry_count);

        // Get WhatsApp client
        let client = match &self.whatsapp_client {
            Some(client) => client,
            None => {
                error!("WhatsApp client not configured");
                return JobResult::PermanentFailure("WhatsApp client not configured".to_string());
            }
        };

        // Send message based on type
        let result = match &content {
            MessageContent::Text { body } => {
                client.send_text_message(&to, body).await
            }
            MessageContent::Image { url, id, caption } => {
                if let Some(url) = url {
                    client.send_image_url(&to, url, caption.as_ref()).await
                } else if let Some(id) = id {
                    client.send_image_id(&to, id, caption.as_ref()).await
                } else {
                    return JobResult::PermanentFailure("Image must have URL or ID".to_string());
                }
            }
            MessageContent::Document { url, id, filename } => {
                if let Some(url) = url {
                    client.send_document_url(&to, url, filename.as_ref(), None).await
                } else if let Some(id) = id {
                    client.send_document_id(&to, id, filename.as_ref(), None).await
                } else {
                    return JobResult::PermanentFailure("Document must have URL or ID".to_string());
                }
            }
            _ => {
                warn!("Unsupported message type for sending");
                return JobResult::PermanentFailure("Unsupported message type".to_string());
            }
        };

        match result {
            Ok(response) => {
                info!("Message sent successfully");
                // TODO: Update message status in database with response.messages info
                JobResult::Success
            }
            Err(e) => {
                error!("Failed to send message: {}", e);
                // Check if error is retryable
                if retry_count < 3 {
                    JobResult::RetryableFailure(format!("WhatsApp API error: {}", e))
                } else {
                    JobResult::PermanentFailure(format!("Failed after {} retries: {}", retry_count, e))
                }
            }
        }
    }

    /// Update message status
    async fn update_message_status(
        &self,
        message_id: String,
        status: crate::queue::types::MessageStatus,
    ) -> JobResult {
        info!("Updating message {} status to {:?}", message_id, status);

        // TODO: Update message status in database
        // TODO: Notify connected clients via WebSocket

        JobResult::Success
    }

    /// Process webhook event
    async fn process_webhook(&self, event_type: String, payload: serde_json::Value) -> JobResult {
        info!("Processing webhook event: {}", event_type);

        // TODO: Handle different webhook event types
        match event_type.as_str() {
            "account_update" => {
                info!("Account update event: {:?}", payload);
                JobResult::Success
            }
            "phone_number_update" => {
                info!("Phone number update event: {:?}", payload);
                JobResult::Success
            }
            _ => {
                warn!("Unknown webhook event type: {}", event_type);
                JobResult::Success
            }
        }
    }

    /// Sync contacts
    async fn sync_contacts(&self, phone_numbers: Vec<String>) -> JobResult {
        info!("Syncing {} contacts", phone_numbers.len());

        // Get WhatsApp client
        let client = match &self.whatsapp_client {
            Some(client) => client,
            None => {
                error!("WhatsApp client not configured");
                return JobResult::PermanentFailure("WhatsApp client not configured".to_string());
            }
        };

        // Get database
        let db = match &self.db {
            Some(db) => db,
            None => {
                error!("Database not configured");
                return JobResult::PermanentFailure("Database not configured".to_string());
            }
        };

        // Create contact sync service
        use crate::services::contact_sync::ContactSyncService;
        
        // Create a dummy queue for the service (we're already in the queue processor)
        let dummy_queue = std::sync::Arc::new(crate::queue::MockMessageQueue::new());
        let sync_service = ContactSyncService::new(client.clone(), dummy_queue);
        
        // Process sync job
        match sync_service.process_sync_job(phone_numbers).await {
            Ok(_) => JobResult::Success,
            Err(e) => {
                error!("Contact sync failed: {}", e);
                JobResult::RetryableFailure(format!("Contact sync failed: {}", e))
            }
        }
    }

    /// Update contacts info
    async fn update_contacts_info(&self, results: Vec<crate::services::contact_sync::ContactVerifyResult>) -> JobResult {
        info!("Updating {} contact records", results.len());

        // For now, just log the update
        // The actual database update will be handled by pytake-api
        for result in &results {
            info!("Contact {} - WhatsApp: {}, ID: {:?}", 
                  result.phone_number, 
                  result.has_whatsapp,
                  result.whatsapp_id);
        }

        JobResult::Success
    }

    /// Mark contact sync as failed
    async fn sync_contact_failed(&self, phone_number: String, error: String) -> JobResult {
        warn!("Contact sync failed for {}: {}", phone_number, error);
        
        // For now, just log the failure
        // The actual database update will be handled by pytake-api
        
        JobResult::Success
    }

    /// Sync stale contacts
    async fn sync_stale_contacts(&self, limit: u64) -> JobResult {
        info!("Syncing stale contacts (limit: {})", limit);

        // For now, this is a no-op since we don't have database access
        // The actual implementation will be in pytake-api which can
        // query the database and queue sync jobs
        
        warn!("Stale contact sync requested but database access not available in core");
        JobResult::Success
    }

    /// Download media
    async fn download_media(
        &self,
        media_id: String,
        _media_url: String,
        message_id: String,
    ) -> JobResult {
        info!("Downloading media {} for message {}", media_id, message_id);

        // TODO: Implement media download
        // 1. Download media from WhatsApp servers
        // 2. Store in local storage or cloud storage
        // 3. Update message record with local media path
        // 4. Generate thumbnails if needed

        JobResult::Success
    }

    /// Execute flow
    async fn execute_flow(
        &self,
        flow_id: String,
        contact_id: String,
        _trigger_message_id: Option<String>,
        _context: std::collections::HashMap<String, serde_json::Value>,
    ) -> JobResult {
        info!("Executing flow {} for contact {}", flow_id, contact_id);

        // TODO: Implement flow execution
        // 1. Load flow definition
        // 2. Execute flow steps
        // 3. Handle conditions and branches
        // 4. Send messages as needed
        // 5. Update flow state

        JobResult::Success
    }
}

#[async_trait]
impl JobProcessor for WhatsAppMessageProcessor {
    async fn process(&self, job: QueueJob) -> JobResult {
        match job.job_type {
            JobType::ProcessInboundMessage {
                message_id,
                from,
                timestamp,
                content,
            } => self.process_inbound_message(message_id, from, timestamp, content).await,
            
            JobType::SendMessage { to, content, retry_count } => {
                self.send_message(to, content, retry_count).await
            }
            
            JobType::UpdateMessageStatus { message_id, status, .. } => {
                self.update_message_status(message_id, status).await
            }
            
            JobType::ProcessWebhook { event_type, payload } => {
                self.process_webhook(event_type, payload).await
            }
            
            JobType::SyncContacts { phone_numbers } => {
                self.sync_contacts(phone_numbers).await
            }
            
            JobType::DownloadMedia { media_id, media_url, message_id } => {
                self.download_media(media_id, media_url, message_id).await
            }
            
            JobType::ExecuteFlow {
                flow_id,
                contact_id,
                trigger_message_id,
                context,
            } => {
                self.execute_flow(flow_id, contact_id, trigger_message_id, context).await
            }
            
            JobType::UpdateContactsInfo { results } => {
                self.update_contacts_info(results).await
            }
            
            JobType::SyncContactFailed { phone_number, error } => {
                self.sync_contact_failed(phone_number, error).await
            }
            
            JobType::SyncStaleContacts { limit } => {
                self.sync_stale_contacts(limit).await
            }
        }
    }

    fn queues(&self) -> Vec<String> {
        vec![
            "inbound".to_string(),
            "outbound".to_string(),
            "status".to_string(),
            "webhook".to_string(),
            "contacts".to_string(),
            "media".to_string(),
            "flow".to_string(),
        ]
    }

    fn max_concurrent_jobs(&self) -> usize {
        20
    }

    fn poll_interval(&self) -> Duration {
        Duration::from_millis(100)
    }
}


#[cfg(test)]
mod tests {
    use super::*;
    use crate::queue::types::Priority;

    #[tokio::test]
    async fn test_process_inbound_message() {
        let processor = WhatsAppMessageProcessor::new();
        
        let job = QueueJob::new(JobType::ProcessInboundMessage {
            message_id: "msg123".to_string(),
            from: "1234567890".to_string(),
            timestamp: 1234567890,
            content: MessageContent::Text {
                body: "Test message".to_string(),
            },
        });

        let result = processor.process(job).await;
        assert!(matches!(result, JobResult::Success));
    }

    #[tokio::test]
    async fn test_send_message() {
        let processor = WhatsAppMessageProcessor::new();
        
        let job = QueueJob::new(JobType::SendMessage {
            to: "1234567890".to_string(),
            content: MessageContent::Text {
                body: "Test outbound".to_string(),
            },
            retry_count: 0,
        });

        let result = processor.process(job).await;
        // Could be Success or RetryableFailure due to random simulation
        assert!(matches!(result, JobResult::Success | JobResult::RetryableFailure(_)));
    }

    #[test]
    fn test_processor_queues() {
        let processor = WhatsAppMessageProcessor::new();
        let queues = processor.queues();
        
        assert!(queues.contains(&"inbound".to_string()));
        assert!(queues.contains(&"outbound".to_string()));
        assert_eq!(queues.len(), 7);
    }
}