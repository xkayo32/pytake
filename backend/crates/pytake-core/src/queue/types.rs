//! Queue types and structures

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;

/// Priority levels for queue messages
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
#[serde(rename_all = "lowercase")]
pub enum Priority {
    Low = 0,
    Normal = 1,
    High = 2,
    Critical = 3,
}

impl Default for Priority {
    fn default() -> Self {
        Self::Normal
    }
}

/// Types of jobs that can be queued
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum JobType {
    /// Process an incoming WhatsApp message
    ProcessInboundMessage {
        message_id: String,
        from: String,
        timestamp: i64,
        content: MessageContent,
    },
    /// Send an outbound WhatsApp message
    SendMessage {
        to: String,
        content: MessageContent,
        retry_count: u32,
    },
    /// Update message status
    UpdateMessageStatus {
        message_id: String,
        status: MessageStatus,
        timestamp: DateTime<Utc>,
    },
    /// Process webhook event
    ProcessWebhook {
        event_type: String,
        payload: serde_json::Value,
    },
    /// Sync contacts
    SyncContacts {
        phone_numbers: Vec<String>,
    },
    /// Download media
    DownloadMedia {
        media_id: String,
        media_url: String,
        message_id: String,
    },
    /// Execute flow action
    ExecuteFlow {
        flow_id: String,
        contact_id: String,
        trigger_message_id: Option<String>,
        context: HashMap<String, serde_json::Value>,
    },
    /// Update contacts info after verification
    UpdateContactsInfo {
        results: Vec<crate::services::contact_sync::ContactVerifyResult>,
    },
    /// Mark contact sync as failed
    SyncContactFailed {
        phone_number: String,
        error: String,
    },
    /// Sync stale contacts
    SyncStaleContacts {
        limit: u64,
    },
}

/// Message content types for queue
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum MessageContent {
    Text { body: String },
    Image { url: Option<String>, id: Option<String>, caption: Option<String> },
    Document { url: Option<String>, id: Option<String>, filename: Option<String> },
    Audio { url: Option<String>, id: Option<String> },
    Video { url: Option<String>, id: Option<String>, caption: Option<String> },
    Location { latitude: f64, longitude: f64, name: Option<String> },
    Template { name: String, language: String, components: serde_json::Value },
}

/// Message status for tracking
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum MessageStatus {
    Queued,
    Sent,
    Delivered,
    Read,
    Failed,
}

/// Queue job structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueueJob {
    /// Unique job ID
    pub id: String,
    /// Job type and data
    pub job_type: JobType,
    /// Priority level
    pub priority: Priority,
    /// Number of retry attempts
    pub retry_count: u32,
    /// Maximum retry attempts
    pub max_retries: u32,
    /// When the job was created
    pub created_at: DateTime<Utc>,
    /// When the job should be processed (for delayed jobs)
    pub process_after: DateTime<Utc>,
    /// Job metadata
    pub metadata: HashMap<String, serde_json::Value>,
}

impl QueueJob {
    /// Create a new queue job
    pub fn new(job_type: JobType) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4().to_string(),
            job_type,
            priority: Priority::Normal,
            retry_count: 0,
            max_retries: 3,
            created_at: now,
            process_after: now,
            metadata: HashMap::new(),
        }
    }

    /// Set job priority
    pub fn with_priority(mut self, priority: Priority) -> Self {
        self.priority = priority;
        self
    }

    /// Set max retries
    pub fn with_max_retries(mut self, max_retries: u32) -> Self {
        self.max_retries = max_retries;
        self
    }

    /// Delay job processing
    pub fn with_delay(mut self, delay: chrono::Duration) -> Self {
        self.process_after = Utc::now() + delay;
        self
    }

    /// Add metadata
    pub fn with_metadata(mut self, key: String, value: serde_json::Value) -> Self {
        self.metadata.insert(key, value);
        self
    }

    /// Check if job can be retried
    pub fn can_retry(&self) -> bool {
        self.retry_count < self.max_retries
    }

    /// Increment retry count
    pub fn increment_retry(&mut self) {
        self.retry_count += 1;
        // Exponential backoff: 1s, 2s, 4s, 8s...
        let delay_seconds = 2_i64.pow(self.retry_count.min(6));
        self.process_after = Utc::now() + chrono::Duration::seconds(delay_seconds);
    }
}

/// Result of job processing
#[derive(Debug)]
pub enum JobResult {
    /// Job completed successfully
    Success,
    /// Job failed but can be retried
    RetryableFailure(String),
    /// Job failed and should not be retried
    PermanentFailure(String),
}

/// Queue statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueueStats {
    /// Total jobs in queue
    pub total_jobs: u64,
    /// Jobs by priority
    pub jobs_by_priority: HashMap<String, u64>,
    /// Jobs by type
    pub jobs_by_type: HashMap<String, u64>,
    /// Failed jobs
    pub failed_jobs: u64,
    /// Jobs processed in last hour
    pub processed_last_hour: u64,
    /// Average processing time (ms)
    pub avg_processing_time_ms: u64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_queue_job_creation() {
        let job = QueueJob::new(JobType::ProcessInboundMessage {
            message_id: "msg123".to_string(),
            from: "1234567890".to_string(),
            timestamp: 1234567890,
            content: MessageContent::Text {
                body: "Hello".to_string(),
            },
        });

        assert!(!job.id.is_empty());
        assert_eq!(job.priority, Priority::Normal);
        assert_eq!(job.retry_count, 0);
        assert_eq!(job.max_retries, 3);
    }

    #[test]
    fn test_job_retry() {
        let mut job = QueueJob::new(JobType::SendMessage {
            to: "1234567890".to_string(),
            content: MessageContent::Text {
                body: "Test".to_string(),
            },
            retry_count: 0,
        });

        assert!(job.can_retry());
        job.increment_retry();
        assert_eq!(job.retry_count, 1);
        
        // Test max retries
        job.retry_count = 3;
        assert!(!job.can_retry());
    }

    #[test]
    fn test_priority_ordering() {
        assert!(Priority::Critical > Priority::High);
        assert!(Priority::High > Priority::Normal);
        assert!(Priority::Normal > Priority::Low);
    }
}