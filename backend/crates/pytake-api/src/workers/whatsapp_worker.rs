//! WhatsApp message processing worker

use pytake_core::queue::{MessageQueue, QueueWorker};
use pytake_core::services::whatsapp_processor::WhatsAppMessageProcessor;
use std::sync::Arc;
use tracing::{error, info};

/// WhatsApp background worker
#[derive(Clone)]
pub struct WhatsAppWorker {
    worker: Arc<QueueWorker<Arc<dyn MessageQueue>, WhatsAppMessageProcessor>>,
}

impl WhatsAppWorker {
    /// Create a new WhatsApp worker
    pub fn new(queue: Arc<dyn MessageQueue>) -> Self {
        let processor = WhatsAppMessageProcessor::new();
        let worker = Arc::new(QueueWorker::new(queue, processor));
        
        Self { worker }
    }
    
    /// Create with dependencies
    pub fn with_dependencies(
        queue: Arc<dyn MessageQueue>,
        db: Arc<sea_orm::DatabaseConnection>,
        whatsapp_client: Arc<pytake_whatsapp::WhatsAppClient>,
    ) -> Self {
        let processor = WhatsAppMessageProcessor::with_dependencies(db, whatsapp_client);
        let worker = Arc::new(QueueWorker::new(queue, processor));
        
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
    use pytake_core::queue::{JobType, MessageContent, QueueJob};

    #[tokio::test]
    async fn test_worker_creation() {
        use pytake_core::queue::mock::MockQueue;
        
        let queue = Arc::new(MockQueue::new());
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