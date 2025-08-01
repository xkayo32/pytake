//! Background worker implementation

use super::{MessageQueue, JobProcessor, JobResult};
// use crate::errors::CoreResult;
use std::sync::Arc;
use tokio::time::{sleep, Duration};
use tracing::{info, error, warn};

/// Background worker that processes jobs from a queue
pub struct Worker<P> {
    queue: Arc<dyn MessageQueue>,
    processor: P,
}

impl<P> Worker<P>
where
    P: JobProcessor + Send + Sync + 'static,
{
    /// Create a new worker
    pub fn new(queue: Arc<dyn MessageQueue>, processor: P) -> Self {
        Self { queue, processor }
    }

    /// Run the worker loop
    pub async fn run(self) {
        let queue_names = self.processor.queues();
        let queues: Vec<&str> = queue_names.iter().map(|s| s.as_str()).collect();
        let poll_interval = self.processor.poll_interval();
        
        info!("Worker started for queues: {:?}", queues);
        
        loop {
            match self.queue.dequeue(&queues).await {
                Ok(Some(job)) => {
                    let job_id = job.id.clone();
                    info!("Processing job: {}", job_id);
                    
                    match self.processor.process(job).await {
                        JobResult::Success => {
                            if let Err(e) = self.queue.complete(&job_id).await {
                                error!("Failed to mark job {} as completed: {}", job_id, e);
                            }
                        }
                        JobResult::RetryableFailure(error) => {
                            warn!("Job {} failed (retryable): {}", job_id, error);
                            if let Err(e) = self.queue.fail(&job_id, &error).await {
                                error!("Failed to mark job {} as failed: {}", job_id, e);
                            }
                        }
                        JobResult::PermanentFailure(error) => {
                            error!("Job {} failed permanently: {}", job_id, error);
                            if let Err(e) = self.queue.fail(&job_id, &error).await {
                                error!("Failed to mark job {} as failed: {}", job_id, e);
                            }
                        }
                    }
                }
                Ok(None) => {
                    // No jobs available, wait before polling again
                    sleep(poll_interval).await;
                }
                Err(e) => {
                    error!("Failed to dequeue job: {}", e);
                    sleep(Duration::from_secs(5)).await; // Wait longer on error
                }
            }
        }
    }
}