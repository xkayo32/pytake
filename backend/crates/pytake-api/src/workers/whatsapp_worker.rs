//! WhatsApp message processing worker

use pytake_core::queue::{MessageQueue, QueueWorker};
use pytake_core::services::whatsapp_processor::WhatsAppMessageProcessor;
use pytake_core::queue::types::{QueueJob, QueueStats};
use pytake_core::errors::CoreResult;
use async_trait::async_trait;
use std::sync::Arc;
use tracing::{error, info};

/// Wrapper to make Arc<dyn MessageQueue> implement MessageQueue
#[derive(Clone)]
pub struct MessageQueueWrapper {
    inner: Arc<dyn MessageQueue>,
}

impl MessageQueueWrapper {
    pub fn new(queue: Arc<dyn MessageQueue>) -> Self {
        Self { inner: queue }
    }
}

#[async_trait]
impl MessageQueue for MessageQueueWrapper {
    async fn enqueue(&self, job: QueueJob) -> CoreResult<String> {
        self.inner.enqueue(job).await
    }

    async fn dequeue(&self, queues: &[&str]) -> CoreResult<Option<QueueJob>> {
        self.inner.dequeue(queues).await
    }

    async fn complete(&self, job_id: &str) -> CoreResult<()> {
        self.inner.complete(job_id).await
    }

    async fn fail(&self, job_id: &str, error: &str) -> CoreResult<()> {
        self.inner.fail(job_id, error).await
    }

    async fn retry(&self, job: QueueJob) -> CoreResult<()> {
        self.inner.retry(job).await
    }

    async fn stats(&self, queue: &str) -> CoreResult<QueueStats> {
        self.inner.stats(queue).await
    }

    async fn clear(&self, queue: &str) -> CoreResult<u64> {
        self.inner.clear(queue).await
    }

    async fn get_job(&self, job_id: &str) -> CoreResult<Option<QueueJob>> {
        self.inner.get_job(job_id).await
    }

    async fn list_jobs(&self, queue: &str, limit: usize) -> CoreResult<Vec<QueueJob>> {
        self.inner.list_jobs(queue, limit).await
    }

    async fn health_check(&self) -> CoreResult<bool> {
        self.inner.health_check().await
    }
}

/// WhatsApp background worker
#[derive(Clone)]
pub struct WhatsAppWorker {
    worker: Arc<QueueWorker<MessageQueueWrapper, WhatsAppMessageProcessor>>,
}

impl WhatsAppWorker {
    /// Create a new WhatsApp worker
    pub fn new(queue: Arc<dyn MessageQueue>) -> Self {
        let processor = WhatsAppMessageProcessor::new();
        let wrapped_queue = MessageQueueWrapper::new(queue);
        let worker = Arc::new(QueueWorker::new(wrapped_queue, processor));
        
        Self { worker }
    }
    
    /// Create with dependencies
    pub fn with_dependencies(
        queue: Arc<dyn MessageQueue>,
        db: Arc<sea_orm::DatabaseConnection>,
        whatsapp_client: Arc<pytake_whatsapp::WhatsAppClient>,
    ) -> Self {
        let processor = WhatsAppMessageProcessor::with_dependencies(db, whatsapp_client);
        let wrapped_queue = MessageQueueWrapper::new(queue);
        let worker = Arc::new(QueueWorker::new(wrapped_queue, processor));
        
        Self { worker }
    }

    /// Start the worker
    pub async fn start(&self) -> Result<(), Box<dyn std::error::Error>> {
        info!("Starting WhatsApp message processing worker");
        
        // Start worker in background
        let worker = self.worker.clone();
        tokio::spawn(async move {
            if let Err(e) = worker.start().await {
                error!("WhatsApp worker error: {}", e);
            }
        });

        Ok(())
    }

    /// Stop the worker
    pub fn stop(&self) {
        info!("Stopping WhatsApp message processing worker");
        self.worker.stop();
    }

    /// Check if worker is running
    pub fn is_running(&self) -> bool {
        self.worker.is_running()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_worker_creation() {
        use pytake_core::queue::mock::MockMessageQueue;
        use pytake_core::queue::types::{JobType, MessageContent};
        
        let queue = Arc::new(MockMessageQueue::new()) as Arc<dyn MessageQueue>;
        let worker = WhatsAppWorker::new(queue.clone());
        
        assert!(!worker.is_running());
        
        // Enqueue a test job
        let job = QueueJob::new(JobType::ProcessInboundMessage {
            message_id: "test123".to_string(),
            from: "1234567890".to_string(),
            timestamp: 1234567890,
            content: MessageContent::Text {
                body: "Test message".to_string(),
            },
        });
        
        queue.enqueue(job).await.unwrap();
    }
}