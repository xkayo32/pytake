//! Message queue trait and implementations

use crate::errors::CoreResult;
use crate::queue::types::{JobResult, QueueJob, QueueStats};
use async_trait::async_trait;
use std::time::Duration;

/// Trait for message queue implementations
#[async_trait]
pub trait MessageQueue: Send + Sync {
    /// Enqueue a job
    async fn enqueue(&self, job: QueueJob) -> CoreResult<String>;

    /// Dequeue a job for processing
    async fn dequeue(&self, queues: &[&str]) -> CoreResult<Option<QueueJob>>;

    /// Mark a job as completed
    async fn complete(&self, job_id: &str) -> CoreResult<()>;

    /// Mark a job as failed
    async fn fail(&self, job_id: &str, error: &str) -> CoreResult<()>;

    /// Retry a failed job
    async fn retry(&self, job: QueueJob) -> CoreResult<()>;

    /// Get queue statistics
    async fn stats(&self, queue: &str) -> CoreResult<QueueStats>;

    /// Clear all jobs from a queue
    async fn clear(&self, queue: &str) -> CoreResult<u64>;

    /// Get a specific job by ID
    async fn get_job(&self, job_id: &str) -> CoreResult<Option<QueueJob>>;

    /// List jobs in a queue
    async fn list_jobs(&self, queue: &str, limit: usize) -> CoreResult<Vec<QueueJob>>;

    /// Check queue health
    async fn health_check(&self) -> CoreResult<bool>;
}

/// Job processor trait
#[async_trait]
pub trait JobProcessor: Send + Sync {
    /// Process a job
    async fn process(&self, job: QueueJob) -> JobResult;

    /// Get the queues this processor handles
    fn queues(&self) -> Vec<String>;

    /// Get the maximum concurrent jobs this processor can handle
    fn max_concurrent_jobs(&self) -> usize {
        10
    }

    /// Get the job poll interval
    fn poll_interval(&self) -> Duration {
        Duration::from_millis(100)
    }
}

/// Queue worker that processes jobs
pub struct QueueWorker<Q: MessageQueue, P: JobProcessor> {
    queue: Q,
    processor: P,
    is_running: std::sync::Arc<std::sync::atomic::AtomicBool>,
}

impl<Q: MessageQueue + Clone + 'static, P: JobProcessor + Clone + 'static> QueueWorker<Q, P> {
    /// Create a new queue worker
    pub fn new(queue: Q, processor: P) -> Self {
        Self {
            queue,
            processor,
            is_running: std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false)),
        }
    }

    /// Start the worker
    pub async fn start(&self) -> CoreResult<()> {
        use std::sync::atomic::Ordering;
        use tokio::sync::Semaphore;

        self.is_running.store(true, Ordering::SeqCst);
        let semaphore = std::sync::Arc::new(Semaphore::new(self.processor.max_concurrent_jobs()));
        let queues = self.processor.queues();
        let queue_refs: Vec<&str> = queues.iter().map(|s| s.as_str()).collect();

        while self.is_running.load(Ordering::SeqCst) {
            // Try to acquire a permit to process a job
            if let Ok(permit) = semaphore.clone().try_acquire_owned() {
                // Try to dequeue a job
                match self.queue.dequeue(&queue_refs).await {
                    Ok(Some(job)) => {
                        let queue = self.queue.clone();
                        let processor = self.processor.clone();
                        
                        // Spawn a task to process the job
                        tokio::spawn(async move {
                            let job_id = job.id.clone();
                            
                            match processor.process(job.clone()).await {
                                JobResult::Success => {
                                    if let Err(e) = queue.complete(&job_id).await {
                                        tracing::error!("Failed to mark job {} as complete: {}", job_id, e);
                                    }
                                }
                                JobResult::RetryableFailure(error) => {
                                    if job.can_retry() {
                                        let mut retry_job = job;
                                        retry_job.increment_retry();
                                        if let Err(e) = queue.retry(retry_job).await {
                                            tracing::error!("Failed to retry job {}: {}", job_id, e);
                                        }
                                    } else {
                                        if let Err(e) = queue.fail(&job_id, &error).await {
                                            tracing::error!("Failed to mark job {} as failed: {}", job_id, e);
                                        }
                                    }
                                }
                                JobResult::PermanentFailure(error) => {
                                    if let Err(e) = queue.fail(&job_id, &error).await {
                                        tracing::error!("Failed to mark job {} as failed: {}", job_id, e);
                                    }
                                }
                            }
                            
                            drop(permit);
                        });
                    }
                    Ok(None) => {
                        // No jobs available, wait before polling again
                        tokio::time::sleep(self.processor.poll_interval()).await;
                    }
                    Err(e) => {
                        tracing::error!("Failed to dequeue job: {}", e);
                        tokio::time::sleep(Duration::from_secs(1)).await;
                    }
                }
            } else {
                // All workers are busy, wait a bit
                tokio::time::sleep(Duration::from_millis(10)).await;
            }
        }

        Ok(())
    }

    /// Stop the worker
    pub fn stop(&self) {
        use std::sync::atomic::Ordering;
        self.is_running.store(false, Ordering::SeqCst);
    }

    /// Check if the worker is running
    pub fn is_running(&self) -> bool {
        use std::sync::atomic::Ordering;
        self.is_running.load(Ordering::SeqCst)
    }
}

/// Mock implementations for testing
#[cfg(test)]
pub mod mock {
    use super::*;
    use std::collections::HashMap;
    use std::sync::Mutex;

    pub struct MockQueue {
        jobs: std::sync::Arc<Mutex<HashMap<String, QueueJob>>>,
    }

    impl MockQueue {
        pub fn new() -> Self {
            Self {
                jobs: std::sync::Arc::new(Mutex::new(HashMap::new())),
            }
        }
    }

    #[async_trait]
    impl MessageQueue for MockQueue {
        async fn enqueue(&self, job: QueueJob) -> CoreResult<String> {
            let id = job.id.clone();
            self.jobs.lock().unwrap().insert(id.clone(), job);
            Ok(id)
        }

        async fn dequeue(&self, _queues: &[&str]) -> CoreResult<Option<QueueJob>> {
            let mut jobs = self.jobs.lock().unwrap();
            if let Some((id, job)) = jobs.iter().next() {
                let job = job.clone();
                jobs.remove(&id.clone());
                Ok(Some(job))
            } else {
                Ok(None)
            }
        }

        async fn complete(&self, _job_id: &str) -> CoreResult<()> {
            Ok(())
        }

        async fn fail(&self, _job_id: &str, _error: &str) -> CoreResult<()> {
            Ok(())
        }

        async fn retry(&self, job: QueueJob) -> CoreResult<()> {
            self.enqueue(job).await?;
            Ok(())
        }

        async fn stats(&self, _queue: &str) -> CoreResult<QueueStats> {
            Ok(QueueStats {
                total_jobs: self.jobs.lock().unwrap().len() as u64,
                jobs_by_priority: HashMap::new(),
                jobs_by_type: HashMap::new(),
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
            Ok(self.jobs.lock().unwrap().get(job_id).cloned())
        }

        async fn list_jobs(&self, _queue: &str, limit: usize) -> CoreResult<Vec<QueueJob>> {
            Ok(self.jobs.lock().unwrap().values().take(limit).cloned().collect())
        }

        async fn health_check(&self) -> CoreResult<bool> {
            Ok(true)
        }
    }
}

