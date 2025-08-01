//! Message status tracking service

use crate::errors::CoreResult;
use crate::queue::MessageStatus;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tracing::{info, error};

/// Message status tracking service
pub struct MessageStatusService {
    // In a real implementation, this would have database access
    // For now, we'll just define the interface
}

/// Status change event
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StatusChangeEvent {
    pub message_id: String,
    pub old_status: Option<MessageStatus>,
    pub new_status: MessageStatus,
    pub timestamp: DateTime<Utc>,
    pub recipient_id: Option<String>,
    pub error_code: Option<String>,
    pub error_message: Option<String>,
}

/// Status history entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StatusHistoryEntry {
    pub status: MessageStatus,
    pub timestamp: DateTime<Utc>,
    pub details: Option<HashMap<String, serde_json::Value>>,
}

/// Message delivery report
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeliveryReport {
    pub message_id: String,
    pub recipient: String,
    pub status: MessageStatus,
    pub sent_at: Option<DateTime<Utc>>,
    pub delivered_at: Option<DateTime<Utc>>,
    pub read_at: Option<DateTime<Utc>>,
    pub failed_at: Option<DateTime<Utc>>,
    pub error_details: Option<ErrorDetails>,
    pub history: Vec<StatusHistoryEntry>,
}

/// Error details for failed messages
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorDetails {
    pub code: String,
    pub message: String,
    pub is_retryable: bool,
    pub retry_after: Option<DateTime<Utc>>,
}

impl MessageStatusService {
    /// Create new status service
    pub fn new() -> Self {
        Self {}
    }

    /// Process status update
    pub async fn process_status_update(
        &self,
        message_id: String,
        new_status: MessageStatus,
        timestamp: DateTime<Utc>,
    ) -> CoreResult<StatusChangeEvent> {
        info!("Processing status update for message {}: {:?}", message_id, new_status);

        // Create status change event
        let event = StatusChangeEvent {
            message_id: message_id.clone(),
            old_status: None, // Would be fetched from database
            new_status: new_status.clone(),
            timestamp,
            recipient_id: None,
            error_code: None,
            error_message: None,
        };

        // Log status transition
        match new_status {
            MessageStatus::Queued => {
                info!("Message {} queued for sending", message_id);
            }
            MessageStatus::Sent => {
                info!("Message {} sent successfully", message_id);
            }
            MessageStatus::Delivered => {
                info!("Message {} delivered to recipient", message_id);
            }
            MessageStatus::Read => {
                info!("Message {} read by recipient", message_id);
            }
            MessageStatus::Failed => {
                error!("Message {} failed to send", message_id);
            }
        }

        Ok(event)
    }

    /// Get delivery report for a message
    pub async fn get_delivery_report(&self, message_id: &str) -> CoreResult<Option<DeliveryReport>> {
        // In real implementation, this would query the database
        info!("Getting delivery report for message {}", message_id);
        Ok(None)
    }

    /// Get messages by status
    pub async fn get_messages_by_status(
        &self,
        status: MessageStatus,
        limit: usize,
    ) -> CoreResult<Vec<String>> {
        // In real implementation, this would query the database
        info!("Getting messages with status {:?} (limit: {})", status, limit);
        Ok(vec![])
    }

    /// Retry failed messages
    pub async fn retry_failed_messages(&self, limit: usize) -> CoreResult<Vec<String>> {
        info!("Retrying failed messages (limit: {})", limit);
        
        // Get failed messages that are retryable
        let failed_messages = self.get_messages_by_status(MessageStatus::Failed, limit).await?;
        
        for message_id in &failed_messages {
            info!("Scheduling retry for message {}", message_id);
            // Would queue retry job here
        }
        
        Ok(failed_messages)
    }

    /// Calculate delivery metrics
    pub async fn calculate_delivery_metrics(&self, time_range_hours: u32) -> CoreResult<DeliveryMetrics> {
        info!("Calculating delivery metrics for last {} hours", time_range_hours);
        
        Ok(DeliveryMetrics {
            total_sent: 0,
            total_delivered: 0,
            total_read: 0,
            total_failed: 0,
            delivery_rate: 0.0,
            read_rate: 0.0,
            average_delivery_time_seconds: 0,
            average_read_time_seconds: 0,
        })
    }

    /// Check if message can be retried
    pub fn can_retry_message(&self, error_details: &ErrorDetails) -> bool {
        error_details.is_retryable && {
            if let Some(retry_after) = error_details.retry_after {
                Utc::now() >= retry_after
            } else {
                true
            }
        }
    }

    /// Determine if status transition is valid
    pub fn is_valid_transition(&self, from: &MessageStatus, to: &MessageStatus) -> bool {
        use MessageStatus::*;
        
        match (from, to) {
            // Forward transitions
            (Queued, Sent) => true,
            (Queued, Failed) => true,
            (Sent, Delivered) => true,
            (Sent, Failed) => true,
            (Delivered, Read) => true,
            (Delivered, Failed) => false, // Can't fail after delivery
            (Read, _) => false, // Read is final state
            (Failed, Queued) => true, // Retry
            (Failed, Sent) => true, // Retry succeeded
            // Same status is valid (idempotent)
            (a, b) if a == b => true,
            // All other transitions are invalid
            _ => false,
        }
    }
}

/// Delivery metrics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeliveryMetrics {
    pub total_sent: u64,
    pub total_delivered: u64,
    pub total_read: u64,
    pub total_failed: u64,
    pub delivery_rate: f64,
    pub read_rate: f64,
    pub average_delivery_time_seconds: u64,
    pub average_read_time_seconds: u64,
}

/// Status webhook handler trait
#[async_trait::async_trait]
pub trait StatusWebhookHandler: Send + Sync {
    /// Handle status change event
    async fn handle_status_change(&self, event: StatusChangeEvent) -> CoreResult<()>;
}

/// Default webhook handler (logs only)
pub struct LoggingStatusHandler;

#[async_trait::async_trait]
impl StatusWebhookHandler for LoggingStatusHandler {
    async fn handle_status_change(&self, event: StatusChangeEvent) -> CoreResult<()> {
        info!("Status change: {:?}", event);
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_status_transitions() {
        let service = MessageStatusService::new();
        
        // Valid forward transitions
        assert!(service.is_valid_transition(&MessageStatus::Queued, &MessageStatus::Sent));
        assert!(service.is_valid_transition(&MessageStatus::Sent, &MessageStatus::Delivered));
        assert!(service.is_valid_transition(&MessageStatus::Delivered, &MessageStatus::Read));
        
        // Valid failure transitions
        assert!(service.is_valid_transition(&MessageStatus::Queued, &MessageStatus::Failed));
        assert!(service.is_valid_transition(&MessageStatus::Sent, &MessageStatus::Failed));
        
        // Retry transitions
        assert!(service.is_valid_transition(&MessageStatus::Failed, &MessageStatus::Queued));
        assert!(service.is_valid_transition(&MessageStatus::Failed, &MessageStatus::Sent));
        
        // Same status (idempotent)
        assert!(service.is_valid_transition(&MessageStatus::Sent, &MessageStatus::Sent));
        
        // Invalid transitions
        assert!(!service.is_valid_transition(&MessageStatus::Delivered, &MessageStatus::Failed));
        assert!(!service.is_valid_transition(&MessageStatus::Read, &MessageStatus::Delivered));
    }

    #[test]
    fn test_can_retry_message() {
        let service = MessageStatusService::new();
        
        // Retryable error
        let error = ErrorDetails {
            code: "RATE_LIMIT".to_string(),
            message: "Rate limit exceeded".to_string(),
            is_retryable: true,
            retry_after: None,
        };
        assert!(service.can_retry_message(&error));
        
        // Non-retryable error
        let error = ErrorDetails {
            code: "INVALID_NUMBER".to_string(),
            message: "Invalid phone number".to_string(),
            is_retryable: false,
            retry_after: None,
        };
        assert!(!service.can_retry_message(&error));
        
        // Retryable with future retry time
        let error = ErrorDetails {
            code: "RATE_LIMIT".to_string(),
            message: "Rate limit exceeded".to_string(),
            is_retryable: true,
            retry_after: Some(Utc::now() + chrono::Duration::hours(1)),
        };
        assert!(!service.can_retry_message(&error));
    }
}