//! Mock implementation for testing

use super::{MessageQueue, QueueStats, QueueJob};
use crate::errors::CoreResult;
use async_trait::async_trait;
use std::sync::Mutex;

/// Mock message queue for testing
pub struct MockMessageQueue {
    jobs: Mutex<Vec<QueueJob>>,
}

impl MockMessageQueue {
    /// Create new mock queue
    pub fn new() -> Self {
        Self {
            jobs: Mutex::new(Vec::new()),
        }
    }
    
    /// Get all enqueued jobs
    pub fn get_jobs(&self) -> Vec<QueueJob> {
        self.jobs.lock().unwrap().clone()
    }
    
    /// Clear all jobs
    pub fn clear(&self) {
        self.jobs.lock().unwrap().clear();
    }
}

#[async_trait]
impl MessageQueue for MockMessageQueue {
    async fn enqueue(&self, job: QueueJob) -> CoreResult<String> {
        let job_id = job.id.clone();
        self.jobs.lock().unwrap().push(job);
        Ok(job_id)
    }
    
    async fn dequeue(&self, _queues: &[&str]) -> CoreResult<Option<QueueJob>> {
        Ok(self.jobs.lock().unwrap().pop())
    }
    
    async fn complete(&self, _job_id: &str) -> CoreResult<()> {
        Ok(())
    }
    
    async fn fail(&self, _job_id: &str, _error: &str) -> CoreResult<()> {
        Ok(())
    }
    
    async fn retry(&self, job: QueueJob) -> CoreResult<()> {
        self.jobs.lock().unwrap().push(job);
        Ok(())
    }
    
    async fn stats(&self, _queue: &str) -> CoreResult<QueueStats> {
        let count = self.jobs.lock().unwrap().len() as u64;
        Ok(QueueStats {
            total_jobs: count,
            jobs_by_priority: std::collections::HashMap::new(),
            jobs_by_type: std::collections::HashMap::new(),
            failed_jobs: 0,
            processed_last_hour: 0,
            avg_processing_time_ms: 0,
        })
    }
    
    async fn clear(&self, _queue: &str) -> CoreResult<u64> {
        let count = self.jobs.lock().unwrap().len() as u64;
        self.jobs.lock().unwrap().clear();
        Ok(count)
    }
    
    async fn get_job(&self, job_id: &str) -> CoreResult<Option<QueueJob>> {
        Ok(self.jobs.lock().unwrap()
            .iter()
            .find(|j| j.id == job_id)
            .cloned())
    }
    
    async fn list_jobs(&self, _queue: &str, limit: usize) -> CoreResult<Vec<QueueJob>> {
        let jobs = self.jobs.lock().unwrap();
        Ok(jobs.iter().take(limit).cloned().collect())
    }
    
    async fn health_check(&self) -> CoreResult<bool> {
        Ok(true)
    }
}

impl Default for MockMessageQueue {
    fn default() -> Self {
        Self::new()
    }
}