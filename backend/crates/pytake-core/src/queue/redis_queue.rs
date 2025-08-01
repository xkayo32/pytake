//! Redis-based message queue implementation

use crate::errors::{CoreError, CoreResult};
use crate::queue::{MessageQueue, QueueJob, QueueStats};
use async_trait::async_trait;
use redis::{aio::ConnectionManager, AsyncCommands, Client as RedisClient};
use std::collections::HashMap;
use tracing::{debug, error, info};

/// Redis-based message queue
#[derive(Clone)]
pub struct RedisQueue {
    client: RedisClient,
    connection_manager: ConnectionManager,
    key_prefix: String,
}

impl RedisQueue {
    /// Create a new Redis queue
    pub async fn new(redis_url: &str, key_prefix: Option<String>) -> CoreResult<Self> {
        let client = RedisClient::open(redis_url)
            .map_err(|e| CoreError::External(format!("Failed to create Redis client: {}", e)))?;

        let connection_manager = ConnectionManager::new(client.clone())
            .await
            .map_err(|e| CoreError::External(format!("Failed to create connection manager: {}", e)))?;

        Ok(Self {
            client,
            connection_manager,
            key_prefix: key_prefix.unwrap_or_else(|| "pytake:queue:".to_string()),
        })
    }

    /// Get queue key
    fn queue_key(&self, queue: &str) -> String {
        format!("{}{}", self.key_prefix, queue)
    }

    /// Get job key
    fn job_key(&self, job_id: &str) -> String {
        format!("{}job:{}", self.key_prefix, job_id)
    }

    /// Get priority queue key
    fn priority_queue_key(&self, queue: &str, priority: u8) -> String {
        format!("{}{}:priority:{}", self.key_prefix, queue, priority)
    }

    /// Get delayed queue key
    fn delayed_queue_key(&self) -> String {
        format!("{}delayed", self.key_prefix)
    }

    /// Get processing set key
    fn processing_key(&self) -> String {
        format!("{}processing", self.key_prefix)
    }

    /// Get failed queue key
    fn failed_queue_key(&self) -> String {
        format!("{}failed", self.key_prefix)
    }

    /// Get stats key
    fn stats_key(&self, queue: &str) -> String {
        format!("{}stats:{}", self.key_prefix, queue)
    }
}

#[async_trait]
impl MessageQueue for RedisQueue {
    async fn enqueue(&self, job: QueueJob) -> CoreResult<String> {
        let mut conn = self.connection_manager.clone();
        let job_id = job.id.clone();
        let job_data = serde_json::to_string(&job)
            .map_err(|e| CoreError::Serialization(e.to_string()))?;

        // Store job data
        let job_key = self.job_key(&job_id);
        conn.set(&job_key, &job_data)
            .await
            .map_err(|e| CoreError::External(format!("Failed to store job: {}", e)))?;

        // Determine queue based on job type
        let queue_name = match &job.job_type {
            crate::queue::types::JobType::ProcessInboundMessage { .. } => "inbound",
            crate::queue::types::JobType::SendMessage { .. } => "outbound",
            crate::queue::types::JobType::UpdateMessageStatus { .. } => "status",
            crate::queue::types::JobType::ProcessWebhook { .. } => "webhook",
            crate::queue::types::JobType::SyncContacts { .. } => "contacts",
            crate::queue::types::JobType::DownloadMedia { .. } => "media",
            crate::queue::types::JobType::ExecuteFlow { .. } => "flow",
            crate::queue::types::JobType::UpdateContactsInfo { .. } => "contacts",
            crate::queue::types::JobType::SyncContactFailed { .. } => "contacts",
            crate::queue::types::JobType::SyncStaleContacts { .. } => "contacts",
            crate::queue::types::JobType::ProcessScheduledNotifications => "notifications",
            crate::queue::types::JobType::SendNotification { .. } => "notifications",
            crate::queue::types::JobType::SendBulkNotifications { .. } => "notifications",
            crate::queue::types::JobType::CleanupExpiredNotifications => "notifications",
        };

        // Check if job should be delayed
        let now = chrono::Utc::now();
        if job.process_after > now {
            let delay_ms = (job.process_after - now).num_milliseconds();
            let delayed_key = self.delayed_queue_key();
            conn.zadd(&delayed_key, &job_id, delay_ms)
                .await
                .map_err(|e| CoreError::External(format!("Failed to add to delayed queue: {}", e)))?;
        } else {
            // Add to priority queue
            let priority_key = self.priority_queue_key(queue_name, job.priority as u8);
            conn.lpush(&priority_key, &job_id)
                .await
                .map_err(|e| CoreError::External(format!("Failed to enqueue job: {}", e)))?;
        }

        // Update stats
        let stats_key = self.stats_key(queue_name);
        let _: () = redis::pipe()
            .atomic()
            .hincr(&stats_key, "total_jobs", 1)
            .hincr(&stats_key, format!("priority_{}", job.priority as u8), 1)
            .hincr(&stats_key, "jobs_by_type", 1)
            .query_async(&mut conn)
            .await
            .map_err(|e| CoreError::External(format!("Failed to update stats: {}", e)))?;

        info!("Enqueued job {} to queue {} with priority {:?}", job_id, queue_name, job.priority);
        Ok(job_id)
    }

    async fn dequeue(&self, queues: &[&str]) -> CoreResult<Option<QueueJob>> {
        let mut conn = self.connection_manager.clone();

        // First, check delayed queue
        let delayed_key = self.delayed_queue_key();
        let now_ms = chrono::Utc::now().timestamp_millis();
        
        // Get delayed jobs that are ready
        let ready_jobs: Vec<String> = conn
            .zrangebyscore_limit(&delayed_key, 0, now_ms, 0, 10)
            .await
            .map_err(|e| CoreError::External(format!("Failed to check delayed queue: {}", e)))?;

        // Move ready jobs to their respective queues
        for job_id in ready_jobs {
            if let Ok(Some(job)) = self.get_job(&job_id).await {
                let queue_name = match &job.job_type {
                    crate::queue::types::JobType::ProcessInboundMessage { .. } => "inbound",
                    crate::queue::types::JobType::SendMessage { .. } => "outbound",
                    crate::queue::types::JobType::UpdateMessageStatus { .. } => "status",
                    crate::queue::types::JobType::ProcessWebhook { .. } => "webhook",
                    crate::queue::types::JobType::SyncContacts { .. } => "contacts",
                    crate::queue::types::JobType::DownloadMedia { .. } => "media",
                    crate::queue::types::JobType::ExecuteFlow { .. } => "flow",
                    crate::queue::types::JobType::UpdateContactsInfo { .. } => "contacts",
                    crate::queue::types::JobType::SyncContactFailed { .. } => "contacts",
                    crate::queue::types::JobType::SyncStaleContacts { .. } => "contacts",
                    crate::queue::types::JobType::ProcessScheduledNotifications => "notifications",
                    crate::queue::types::JobType::SendNotification { .. } => "notifications",
                    crate::queue::types::JobType::SendBulkNotifications { .. } => "notifications",
                    crate::queue::types::JobType::CleanupExpiredNotifications => "notifications",
                };
                
                let priority_key = self.priority_queue_key(queue_name, job.priority as u8);
                let _: () = redis::pipe()
                    .atomic()
                    .zrem(&delayed_key, &job_id)
                    .lpush(&priority_key, &job_id)
                    .query_async(&mut conn)
                    .await
                    .map_err(|e| CoreError::External(format!("Failed to move delayed job: {}", e)))?;
            }
        }

        // Check queues in priority order
        for priority in [3, 2, 1, 0] {
            for queue in queues {
                let priority_key = self.priority_queue_key(queue, priority);
                
                // Try to pop from queue
                let job_id: Option<String> = conn
                    .rpop(&priority_key, None)
                    .await
                    .map_err(|e| CoreError::External(format!("Failed to dequeue: {}", e)))?;

                if let Some(job_id) = job_id {
                    // Get job data
                    let job_key = self.job_key(&job_id);
                    let job_data: Option<String> = conn
                        .get(&job_key)
                        .await
                        .map_err(|e| CoreError::External(format!("Failed to get job data: {}", e)))?;

                    if let Some(job_data) = job_data {
                        let job: QueueJob = serde_json::from_str(&job_data)
                            .map_err(|e| CoreError::Deserialization(e.to_string()))?;

                        // Add to processing set
                        let processing_key = self.processing_key();
                        conn.sadd(&processing_key, &job_id)
                            .await
                            .map_err(|e| CoreError::External(format!("Failed to add to processing: {}", e)))?;

                        debug!("Dequeued job {} from queue {}", job_id, queue);
                        return Ok(Some(job));
                    }
                }
            }
        }

        Ok(None)
    }

    async fn complete(&self, job_id: &str) -> CoreResult<()> {
        let mut conn = self.connection_manager.clone();
        
        let _: () = redis::pipe()
            .atomic()
            .del(self.job_key(job_id))
            .srem(self.processing_key(), job_id)
            .query_async(&mut conn)
            .await
            .map_err(|e| CoreError::External(format!("Failed to complete job: {}", e)))?;

        debug!("Completed job {}", job_id);
        Ok(())
    }

    async fn fail(&self, job_id: &str, error: &str) -> CoreResult<()> {
        let mut conn = self.connection_manager.clone();
        
        // Get job data to update failure info
        let job_key = self.job_key(job_id);
        let job_data: Option<String> = conn
            .get(&job_key)
            .await
            .map_err(|e| CoreError::External(format!("Failed to get job data: {}", e)))?;

        if let Some(job_data) = job_data {
            let mut job: QueueJob = serde_json::from_str(&job_data)
                .map_err(|e| CoreError::Deserialization(e.to_string()))?;
            
            // Add failure metadata
            job.metadata.insert("last_error".to_string(), serde_json::Value::String(error.to_string()));
            job.metadata.insert("failed_at".to_string(), serde_json::Value::String(chrono::Utc::now().to_rfc3339()));
            
            let updated_job_data = serde_json::to_string(&job)
                .map_err(|e| CoreError::Serialization(e.to_string()))?;

            let _: () = redis::pipe()
                .atomic()
                .set(&job_key, &updated_job_data)
                .srem(self.processing_key(), job_id)
                .lpush(self.failed_queue_key(), job_id)
                .query_async(&mut conn)
                .await
                .map_err(|e| CoreError::External(format!("Failed to mark job as failed: {}", e)))?;
        }

        error!("Job {} failed: {}", job_id, error);
        Ok(())
    }

    async fn retry(&self, job: QueueJob) -> CoreResult<()> {
        let mut conn = self.connection_manager.clone();
        
        // Remove from processing
        conn.srem(self.processing_key(), &job.id)
            .await
            .map_err(|e| CoreError::External(format!("Failed to remove from processing: {}", e)))?;

        // Re-enqueue with updated retry info
        self.enqueue(job).await?;
        Ok(())
    }

    async fn stats(&self, queue: &str) -> CoreResult<QueueStats> {
        let mut conn = self.connection_manager.clone();
        let stats_key = self.stats_key(queue);
        
        let stats_data: HashMap<String, String> = conn
            .hgetall(&stats_key)
            .await
            .map_err(|e| CoreError::External(format!("Failed to get stats: {}", e)))?;

        let total_jobs = stats_data.get("total_jobs")
            .and_then(|v| v.parse().ok())
            .unwrap_or(0);

        let failed_count: u64 = conn
            .llen(self.failed_queue_key())
            .await
            .map_err(|e| CoreError::External(format!("Failed to get failed count: {}", e)))?;

        Ok(QueueStats {
            total_jobs,
            jobs_by_priority: HashMap::new(),
            jobs_by_type: HashMap::new(),
            failed_jobs: failed_count,
            processed_last_hour: 0,
            avg_processing_time_ms: 0,
        })
    }

    async fn clear(&self, queue: &str) -> CoreResult<u64> {
        let mut conn = self.connection_manager.clone();
        let mut count = 0u64;

        // Clear all priority queues
        for priority in 0..4 {
            let key = self.priority_queue_key(queue, priority);
            let queue_count: u64 = conn
                .llen(&key)
                .await
                .map_err(|e| CoreError::External(format!("Failed to get queue length: {}", e)))?;
            
            if queue_count > 0 {
                conn.del(&key)
                    .await
                    .map_err(|e| CoreError::External(format!("Failed to clear queue: {}", e)))?;
                count += queue_count;
            }
        }

        // Clear stats
        conn.del(self.stats_key(queue))
            .await
            .map_err(|e| CoreError::External(format!("Failed to clear stats: {}", e)))?;

        Ok(count)
    }

    async fn get_job(&self, job_id: &str) -> CoreResult<Option<QueueJob>> {
        let mut conn = self.connection_manager.clone();
        let job_key = self.job_key(job_id);
        
        let job_data: Option<String> = conn
            .get(&job_key)
            .await
            .map_err(|e| CoreError::External(format!("Failed to get job: {}", e)))?;

        match job_data {
            Some(data) => {
                let job = serde_json::from_str(&data)
                    .map_err(|e| CoreError::Deserialization(e.to_string()))?;
                Ok(Some(job))
            }
            None => Ok(None),
        }
    }

    async fn list_jobs(&self, queue: &str, limit: usize) -> CoreResult<Vec<QueueJob>> {
        let mut conn = self.connection_manager.clone();
        let mut jobs = Vec::new();

        // Get jobs from all priority queues
        for priority in [3, 2, 1, 0] {
            let key = self.priority_queue_key(queue, priority);
            let job_ids: Vec<String> = conn
                .lrange(&key, 0, limit as isize - 1)
                .await
                .map_err(|e| CoreError::External(format!("Failed to list jobs: {}", e)))?;

            for job_id in job_ids {
                if let Ok(Some(job)) = self.get_job(&job_id).await {
                    jobs.push(job);
                    if jobs.len() >= limit {
                        return Ok(jobs);
                    }
                }
            }
        }

        Ok(jobs)
    }

    async fn health_check(&self) -> CoreResult<bool> {
        let mut conn = self.connection_manager.clone();
        
        // Try to ping Redis
        let pong: String = redis::cmd("PING")
            .query_async(&mut conn)
            .await
            .map_err(|e| CoreError::External(format!("Redis health check failed: {}", e)))?;

        Ok(pong == "PONG")
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::queue::types::{JobType, MessageContent, Priority};

    #[tokio::test]
    async fn test_redis_queue_operations() {
        // This test requires a Redis instance running
        // Skip in CI or when Redis is not available
        if std::env::var("REDIS_URL").is_err() {
            println!("Skipping Redis queue test - REDIS_URL not set");
            return;
        }

        let redis_url = std::env::var("REDIS_URL").unwrap();
        let queue = RedisQueue::new(&redis_url, Some("test:".to_string())).await.unwrap();

        // Clear any existing data
        queue.clear("test").await.unwrap();

        // Test enqueue
        let job = QueueJob::new(JobType::ProcessInboundMessage {
            platform: crate::messaging::Platform::WhatsApp,
            message_id: "msg123".to_string(),
            from: "1234567890".to_string(),
            timestamp: 1234567890,
            content: MessageContent::Text {
                body: "Test message".to_string(),
            },
        })
        .with_priority(Priority::High);

        let job_id = queue.enqueue(job.clone()).await.unwrap();
        assert!(!job_id.is_empty());

        // Test dequeue
        let dequeued = queue.dequeue(&["inbound"]).await.unwrap();
        assert!(dequeued.is_some());
        assert_eq!(dequeued.unwrap().id, job_id);

        // Test complete
        queue.complete(&job_id).await.unwrap();

        // Test stats
        let stats = queue.stats("inbound").await.unwrap();
        assert!(stats.total_jobs > 0);

        // Test health check
        let healthy = queue.health_check().await.unwrap();
        assert!(healthy);
    }
}