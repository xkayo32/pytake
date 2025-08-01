//! Status update worker

use pytake_core::queue::{JobProcessor, JobResult, JobType, QueueJob, MessageStatus};
use pytake_db::repositories::message::MessageRepository;
use sea_orm::DatabaseConnection;
use std::sync::Arc;
use async_trait::async_trait;
use std::time::Duration;
use tracing::{info, error, warn};

/// Worker to process message status updates
pub struct StatusUpdateWorker {
    db: Arc<DatabaseConnection>,
}

impl StatusUpdateWorker {
    /// Create new status worker
    pub fn new(db: Arc<DatabaseConnection>) -> Self {
        Self { db }
    }

    /// Process status update job
    async fn process_status_update(
        &self,
        message_id: String,
        status: MessageStatus,
        timestamp: chrono::DateTime<chrono::Utc>,
    ) -> JobResult {
        info!("Processing status update for message {}: {:?}", message_id, status);

        let msg_repo = MessageRepository::new(&self.db);

        // Find message by WhatsApp message ID
        let message = match msg_repo.find_by_whatsapp_id(&message_id).await {
            Ok(Some(msg)) => msg,
            Ok(None) => {
                warn!("Message {} not found for status update", message_id);
                return JobResult::Success; // Don't retry for non-existent messages
            }
            Err(e) => {
                error!("Failed to find message {}: {}", message_id, e);
                return JobResult::RetryableFailure(format!("Database error: {}", e));
            }
        };

        // Update status
        let status_str = match status {
            MessageStatus::Queued => "queued",
            MessageStatus::Sent => "sent",
            MessageStatus::Delivered => "delivered",
            MessageStatus::Read => "read",
            MessageStatus::Failed => "failed",
        };

        // Check if this is a valid status transition
        let current_status = message.status.as_deref().unwrap_or("unknown");
        if !is_valid_status_transition(current_status, status_str) {
            warn!("Invalid status transition from {} to {} for message {}", 
                  current_status, status_str, message_id);
            return JobResult::Success; // Don't retry invalid transitions
        }

        // Update in database
        match msg_repo.update_status(
            message.id,
            status_str,
            timestamp,
            None, // error_code would come from webhook data
            None, // error_message would come from webhook data
        ).await {
            Ok(_) => {
                info!("Status updated for message {} to {}", message_id, status_str);
                
                // Log status milestones
                match status {
                    MessageStatus::Delivered => {
                        info!("Message {} delivered successfully", message_id);
                    }
                    MessageStatus::Read => {
                        info!("Message {} read by recipient", message_id);
                    }
                    MessageStatus::Failed => {
                        error!("Message {} failed to deliver", message_id);
                    }
                    _ => {}
                }

                JobResult::Success
            }
            Err(e) => {
                error!("Failed to update status for message {}: {}", message_id, e);
                JobResult::RetryableFailure(format!("Database update failed: {}", e))
            }
        }
    }
}

#[async_trait]
impl JobProcessor for StatusUpdateWorker {
    async fn process(&self, job: QueueJob) -> JobResult {
        match job.job_type {
            JobType::UpdateMessageStatus { message_id, status, timestamp } => {
                self.process_status_update(message_id, status, timestamp).await
            }
            _ => {
                warn!("Status worker received unsupported job type: {:?}", job.job_type);
                JobResult::PermanentFailure("Unsupported job type".to_string())
            }
        }
    }

    fn queues(&self) -> Vec<String> {
        vec!["status".to_string()]
    }

    fn max_concurrent_jobs(&self) -> usize {
        10
    }

    fn poll_interval(&self) -> Duration {
        Duration::from_millis(200)
    }
}

/// Check if status transition is valid
fn is_valid_status_transition(from: &str, to: &str) -> bool {
    match (from, to) {
        // Forward transitions
        ("queued", "sent") => true,
        ("queued", "failed") => true,
        ("sent", "delivered") => true,
        ("sent", "failed") => true,
        ("delivered", "read") => true,
        ("delivered", "failed") => false, // Can't fail after delivery
        ("read", _) => false, // Read is final state
        ("failed", "queued") => true, // Retry
        ("failed", "sent") => true, // Retry succeeded
        // Same status is valid (idempotent)
        (a, b) if a == b => true,
        // From unknown status, allow any transition
        ("unknown", _) => true,
        // All other transitions are invalid
        _ => false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_status_transitions() {
        // Valid transitions
        assert!(is_valid_status_transition("queued", "sent"));
        assert!(is_valid_status_transition("sent", "delivered"));
        assert!(is_valid_status_transition("delivered", "read"));
        assert!(is_valid_status_transition("failed", "queued")); // retry
        
        // Invalid transitions
        assert!(!is_valid_status_transition("delivered", "failed"));
        assert!(!is_valid_status_transition("read", "delivered"));
        assert!(!is_valid_status_transition("read", "failed"));
        
        // Idempotent
        assert!(is_valid_status_transition("sent", "sent"));
        assert!(is_valid_status_transition("delivered", "delivered"));
        
        // From unknown
        assert!(is_valid_status_transition("unknown", "sent"));
        assert!(is_valid_status_transition("unknown", "failed"));
    }
}