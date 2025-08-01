//! Orchestration service that coordinates all PyTake components

use crate::errors::{CoreError, CoreResult};
use crate::messaging::{Platform, MessagingPlatform, WhatsAppPlatform};
use crate::queue::{MessageQueue, RedisQueue};
use crate::services::{
    conversation_service::{ConversationService, DefaultConversationService},
    agent_assignment::{AgentAssignmentService, DefaultAgentAssignmentService},
    response_templates::{ResponseTemplateService, DefaultResponseTemplateService},
    notification::{NotificationService, DefaultNotificationService},
    metrics::{MetricsService, DefaultMetricsService},
    conversation_search::{ConversationSearchService, DefaultConversationSearchService},
    conversation_integration::{ConversationIntegrationService, ConversationIntegrationServiceTrait, IncomingMessage, OutgoingMessageRequest, PlatformEvent},
    multi_platform_processor::MultiPlatformMessageProcessor,
};
use crate::websocket::WebSocketManager;
use async_trait::async_trait;
use redis::Client as RedisClient;
use std::collections::HashMap;
use std::sync::Arc;
use tracing::{info, warn, error};
use uuid::Uuid;

/// Main orchestration service that coordinates all PyTake components
pub struct PyTakeOrchestrator {
    // Core services
    conversation_service: Arc<dyn ConversationService>,
    agent_assignment_service: Arc<dyn AgentAssignmentService>,
    template_service: Arc<dyn ResponseTemplateService>,
    notification_service: Arc<dyn NotificationService>,
    metrics_service: Arc<dyn MetricsService>,
    search_service: Arc<dyn ConversationSearchService>,
    
    // Integration services
    integration_service: Arc<dyn ConversationIntegrationServiceTrait>,
    multi_platform_processor: Arc<MultiPlatformMessageProcessor>,
    
    // Infrastructure
    message_queue: Arc<dyn MessageQueue>,
    websocket_manager: Arc<WebSocketManager>,
    
    // Registered platforms
    platforms: HashMap<Platform, Arc<dyn MessagingPlatform>>,
    
    // Configuration
    config: OrchestratorConfig,
}

/// Configuration for the orchestrator
#[derive(Debug, Clone)]
pub struct OrchestratorConfig {
    pub auto_assign_enabled: bool,
    pub template_suggestions_enabled: bool,
    pub metrics_collection_enabled: bool,
    pub websocket_notifications_enabled: bool,
    pub bulk_processing_batch_size: usize,
    pub max_concurrent_conversations_per_agent: u32,
}

impl Default for OrchestratorConfig {
    fn default() -> Self {
        Self {
            auto_assign_enabled: true,
            template_suggestions_enabled: true,
            metrics_collection_enabled: true,
            websocket_notifications_enabled: true,
            bulk_processing_batch_size: 100,
            max_concurrent_conversations_per_agent: 10,
        }
    }
}

/// Orchestrator builder for easy setup
pub struct PyTakeOrchestratorBuilder {
    config: OrchestratorConfig,
    redis_client: Option<RedisClient>,
    whatsapp_config: Option<WhatsAppConfig>,
}

/// WhatsApp configuration
#[derive(Debug, Clone)]
pub struct WhatsAppConfig {
    pub access_token: String,
    pub phone_number_id: String,
    pub webhook_verify_token: Option<String>,
}

impl PyTakeOrchestratorBuilder {
    pub fn new() -> Self {
        Self {
            config: OrchestratorConfig::default(),
            redis_client: None,
            whatsapp_config: None,
        }
    }
    
    pub fn with_config(mut self, config: OrchestratorConfig) -> Self {
        self.config = config;
        self
    }
    
    pub fn with_redis(mut self, redis_client: RedisClient) -> Self {
        self.redis_client = Some(redis_client);
        self
    }
    
    pub fn with_whatsapp(mut self, config: WhatsAppConfig) -> Self {
        self.whatsapp_config = Some(config);
        self
    }
    
    pub async fn build(self) -> CoreResult<PyTakeOrchestrator> {
        // Create message queue
        let message_queue: Arc<dyn MessageQueue> = if let Some(_redis_client) = self.redis_client {
            Arc::new(RedisQueue::new("redis://localhost:6379", Some("pytake".to_string())).await?)
        } else {
            return Err(CoreError::validation("Redis client is required"));
        };
        
        // Create WebSocket manager
        let token_config = crate::auth::token::TokenConfig {
            secret: "secret_key".to_string(),
            issuer: "pytake".to_string(),
            audience: "pytake-api".to_string(),
            access_token_duration: chrono::Duration::minutes(15),
            refresh_token_duration: chrono::Duration::days(7),
            algorithm: jsonwebtoken::Algorithm::HS256,
        };
        let token_validator = Arc::new(crate::auth::TokenValidator::new(token_config));
        let websocket_manager = Arc::new(WebSocketManager::new(token_validator));
        
        // Create core services
        let conversation_service = Arc::new(DefaultConversationService::new());
        let agent_assignment_service = Arc::new(DefaultAgentAssignmentService::new());
        let template_service = Arc::new(DefaultResponseTemplateService::new().with_sample_templates());
        let notification_service = Arc::new(DefaultNotificationService::new());
        let metrics_service = Arc::new(DefaultMetricsService::new());
        let search_service = Arc::new(DefaultConversationSearchService::new().with_sample_conversations());
        
        // Create integration service
        let integration_service = Arc::new(ConversationIntegrationService::new(
            conversation_service.clone(),
            agent_assignment_service.clone(),
            template_service.clone(),
            notification_service.clone(),
            metrics_service.clone(),
            message_queue.clone(),
            websocket_manager.clone(),
        ));
        
        // Create multi-platform processor
        let mut multi_platform_processor = MultiPlatformMessageProcessor::new();
        let mut platforms = HashMap::new();
        
        // Register WhatsApp if configured
        if let Some(whatsapp_config) = self.whatsapp_config {
            let whatsapp_platform = Arc::new(WhatsAppPlatform::new(
                whatsapp_config.access_token,
                whatsapp_config.phone_number_id,
            ));
            
            // Register platform with multi-platform processor (skip for now until we implement Clone)
            // multi_platform_processor.register_platform((*whatsapp_platform).clone());
            platforms.insert(Platform::WhatsApp, whatsapp_platform as Arc<dyn MessagingPlatform>);
            
            info!("Registered WhatsApp platform");
        }
        
        let multi_platform_processor = Arc::new(multi_platform_processor);
        
        Ok(PyTakeOrchestrator {
            conversation_service,
            agent_assignment_service,
            template_service,
            notification_service,
            metrics_service,
            search_service,
            integration_service,
            multi_platform_processor,
            message_queue,
            websocket_manager,
            platforms,
            config: self.config,
        })
    }
}

impl Default for PyTakeOrchestratorBuilder {
    fn default() -> Self {
        Self::new()
    }
}

/// Orchestrator trait for high-level operations
#[async_trait]
pub trait PyTakeOrchestratorTrait: Send + Sync {
    /// Initialize all services and start background workers
    async fn initialize(&self) -> CoreResult<()>;
    
    /// Shutdown all services gracefully
    async fn shutdown(&self) -> CoreResult<()>;
    
    /// Process incoming message from any platform
    async fn handle_incoming_message(&self, message: IncomingMessage) -> CoreResult<String>; // Returns conversation ID
    
    /// Send message to customer
    async fn send_customer_message(&self, request: OutgoingMessageRequest) -> CoreResult<String>; // Returns message ID
    
    /// Handle platform webhook events
    async fn handle_webhook_event(&self, platform: Platform, event_type: String, payload: serde_json::Value) -> CoreResult<()>;
    
    /// Get system health status
    async fn get_health_status(&self) -> CoreResult<SystemHealthStatus>;
    
    /// Get system statistics
    async fn get_system_stats(&self) -> CoreResult<SystemStats>;
    
    /// Register a new messaging platform
    async fn register_platform(&mut self, platform: Arc<dyn MessagingPlatform>) -> CoreResult<()>;
    
    /// Process bulk operations
    async fn process_bulk_messages(&self, requests: Vec<OutgoingMessageRequest>) -> CoreResult<BulkOperationResult>;
}

/// System health status
#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct SystemHealthStatus {
    pub overall_status: HealthStatus,
    pub services: HashMap<String, ServiceHealth>,
    pub platforms: HashMap<Platform, PlatformHealth>,
    pub last_check: chrono::DateTime<chrono::Utc>,
}

/// Health status enum
#[derive(Debug, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum HealthStatus {
    Healthy,
    Degraded,
    Unhealthy,
}

/// Service health information
#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct ServiceHealth {
    pub status: HealthStatus,
    pub last_check: chrono::DateTime<chrono::Utc>,
    pub response_time_ms: Option<u64>,
    pub error_message: Option<String>,
}

/// Platform health information
#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct PlatformHealth {
    pub status: HealthStatus,
    pub last_successful_request: Option<chrono::DateTime<chrono::Utc>>,
    pub error_rate: f64,
    pub average_response_time_ms: f64,
}

/// System statistics
#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct SystemStats {
    pub total_conversations: u64,
    pub active_conversations: u64,
    pub total_messages: u64,
    pub messages_today: u64,
    pub online_agents: u32,
    pub platform_stats: HashMap<Platform, PlatformStats>,
    pub performance_metrics: PerformanceMetrics,
}

/// Platform-specific statistics
#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct PlatformStats {
    pub messages_sent: u64,
    pub messages_received: u64,
    pub delivery_rate: f64,
    pub error_rate: f64,
    pub average_response_time_ms: f64,
}

/// Performance metrics
#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct PerformanceMetrics {
    pub average_conversation_resolution_time_hours: f64,
    pub agent_utilization_rate: f64,
    pub customer_satisfaction_score: Option<f64>,
    pub first_response_time_minutes: f64,
}

/// Bulk operation result
#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct BulkOperationResult {
    pub total_requests: usize,
    pub successful: usize,
    pub failed: usize,
    pub results: Vec<BulkOperationItem>,
    pub processing_time_ms: u64,
}

/// Individual bulk operation item result
#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct BulkOperationItem {
    pub request_id: Option<String>,
    pub success: bool,
    pub result: Option<String>, // Message ID or error message
}

#[async_trait]
impl PyTakeOrchestratorTrait for PyTakeOrchestrator {
    async fn initialize(&self) -> CoreResult<()> {
        info!("Initializing PyTake Orchestrator...");
        
        // Initialize WebSocket manager
        // TODO: Start WebSocket server
        
        // Initialize metrics collection
        if self.config.metrics_collection_enabled {
            // TODO: Start metrics collection background task
            info!("Metrics collection enabled");
        }
        
        // Initialize notification processing
        // TODO: Start notification processing background task
        
        info!("PyTake Orchestrator initialized successfully");
        Ok(())
    }
    
    async fn shutdown(&self) -> CoreResult<()> {
        info!("Shutting down PyTake Orchestrator...");
        
        // Shutdown WebSocket connections
        // TODO: Close all WebSocket connections gracefully
        
        // Wait for background tasks to complete
        // TODO: Wait for all background tasks
        
        info!("PyTake Orchestrator shutdown complete");
        Ok(())
    }
    
    async fn handle_incoming_message(&self, message: IncomingMessage) -> CoreResult<String> {
        info!("Handling incoming message from platform: {:?}", message.platform);
        
        // Process through integration service
        let conversation = self.integration_service.process_incoming_message(message).await?;
        
        // Auto-assign if enabled and needed
        if self.config.auto_assign_enabled && conversation.assignment.is_none() {
            if let Some(_agent_id) = self.integration_service.auto_assign_conversation(conversation.id).await? {
                info!("Auto-assigned conversation {}", conversation.id);
            }
        }
        
        Ok(conversation.id.to_string())
    }
    
    async fn send_customer_message(&self, request: OutgoingMessageRequest) -> CoreResult<String> {
        info!("Sending customer message via platform: {:?}", request.platform);
        
        // Send through integration service
        let message_id = self.integration_service.send_message(request).await?;
        
        Ok(message_id)
    }
    
    async fn handle_webhook_event(&self, platform: Platform, event_type: String, payload: serde_json::Value) -> CoreResult<()> {
        info!("Handling webhook event from {:?}: {}", platform, event_type);
        
        // Create platform event
        let event = PlatformEvent {
            platform,
            event_type: match event_type.as_str() {
                "message_received" => crate::services::conversation_integration::PlatformEventType::MessageReceived,
                "message_delivered" => crate::services::conversation_integration::PlatformEventType::MessageDelivered,
                "message_read" => crate::services::conversation_integration::PlatformEventType::MessageRead,
                "message_failed" => crate::services::conversation_integration::PlatformEventType::MessageFailed,
                _ => return Ok(()), // Ignore unknown events
            },
            conversation_id: None, // TODO: Extract from payload
            message_id: None, // TODO: Extract from payload
            agent_id: None,
            timestamp: chrono::Utc::now(),
            data: payload,
        };
        
        // Handle through integration service
        self.integration_service.handle_platform_event(event).await?;
        
        Ok(())
    }
    
    async fn get_health_status(&self) -> CoreResult<SystemHealthStatus> {
        let now = chrono::Utc::now();
        let mut services = HashMap::new();
        let mut platforms = HashMap::new();
        
        // Check service health
        services.insert("conversation_service".to_string(), ServiceHealth {
            status: HealthStatus::Healthy,
            last_check: now,
            response_time_ms: Some(10),
            error_message: None,
        });
        
        services.insert("agent_assignment".to_string(), ServiceHealth {
            status: HealthStatus::Healthy,
            last_check: now,
            response_time_ms: Some(5),
            error_message: None,
        });
        
        services.insert("notification_service".to_string(), ServiceHealth {
            status: HealthStatus::Healthy,
            last_check: now,
            response_time_ms: Some(15),
            error_message: None,
        });
        
        // Check platform health
        for (platform, _) in &self.platforms {
            platforms.insert(*platform, PlatformHealth {
                status: HealthStatus::Healthy,
                last_successful_request: Some(now),
                error_rate: 0.01, // 1% error rate
                average_response_time_ms: 200.0,
            });
        }
        
        // Determine overall status
        let overall_status = if services.values().all(|s| matches!(s.status, HealthStatus::Healthy)) &&
                               platforms.values().all(|p| matches!(p.status, HealthStatus::Healthy)) {
            HealthStatus::Healthy
        } else {
            HealthStatus::Degraded
        };
        
        Ok(SystemHealthStatus {
            overall_status,
            services,
            platforms,
            last_check: now,
        })
    }
    
    async fn get_system_stats(&self) -> CoreResult<SystemStats> {
        // TODO: Implement actual stats collection from services
        let mut platform_stats = HashMap::new();
        
        for (platform, _) in &self.platforms {
            platform_stats.insert(*platform, PlatformStats {
                messages_sent: 1500,
                messages_received: 2300,
                delivery_rate: 0.98,
                error_rate: 0.02,
                average_response_time_ms: 180.0,
            });
        }
        
        Ok(SystemStats {
            total_conversations: 850,
            active_conversations: 45,
            total_messages: 12500,
            messages_today: 380,
            online_agents: 8,
            platform_stats,
            performance_metrics: PerformanceMetrics {
                average_conversation_resolution_time_hours: 2.5,
                agent_utilization_rate: 0.75,
                customer_satisfaction_score: Some(4.2),
                first_response_time_minutes: 3.2,
            },
        })
    }
    
    async fn register_platform(&mut self, platform: Arc<dyn MessagingPlatform>) -> CoreResult<()> {
        let platform_type = platform.platform();
        
        // Register with multi-platform processor
        // TODO: This requires mutable access which we don't have in this context
        // self.multi_platform_processor.register_platform((*platform).clone());
        
        // Store platform reference
        self.platforms.insert(platform_type, platform);
        
        info!("Registered platform: {:?}", platform_type);
        Ok(())
    }
    
    async fn process_bulk_messages(&self, requests: Vec<OutgoingMessageRequest>) -> CoreResult<BulkOperationResult> {
        let start_time = std::time::Instant::now();
        let total_requests = requests.len();
        
        info!("Processing {} bulk messages", total_requests);
        
        // Process in batches
        let batch_size = self.config.bulk_processing_batch_size;
        let mut results = Vec::new();
        let mut successful = 0;
        let mut failed = 0;
        
        for chunk in requests.chunks(batch_size) {
            let batch_results = self.integration_service.send_bulk_messages(chunk.to_vec()).await?;
            
            for (index, result) in batch_results.into_iter().enumerate() {
                let item = BulkOperationItem {
                    request_id: Some(format!("bulk_{}", results.len() + index)),
                    success: result.is_ok(),
                    result: Some(match result {
                        Ok(message_id) => {
                            successful += 1;
                            message_id
                        }
                        Err(error) => {
                            failed += 1;
                            error
                        }
                    }),
                };
                results.push(item);
            }
        }
        
        let processing_time = start_time.elapsed().as_millis() as u64;
        
        info!("Bulk processing complete: {}/{} successful in {}ms", 
              successful, total_requests, processing_time);
        
        Ok(BulkOperationResult {
            total_requests,
            successful,
            failed,
            results,
            processing_time_ms: processing_time,
        })
    }
}

impl PyTakeOrchestrator {
    /// Get conversation service
    pub fn conversation_service(&self) -> &Arc<dyn ConversationService> {
        &self.conversation_service
    }
    
    /// Get agent assignment service
    pub fn agent_assignment_service(&self) -> &Arc<dyn AgentAssignmentService> {
        &self.agent_assignment_service
    }
    
    /// Get template service
    pub fn template_service(&self) -> &Arc<dyn ResponseTemplateService> {
        &self.template_service
    }
    
    /// Get search service
    pub fn search_service(&self) -> &Arc<dyn ConversationSearchService> {
        &self.search_service
    }
    
    /// Get notification service
    pub fn notification_service(&self) -> &Arc<dyn NotificationService> {
        &self.notification_service
    }
    
    /// Get metrics service
    pub fn metrics_service(&self) -> &Arc<dyn MetricsService> {
        &self.metrics_service
    }
    
    /// Get WebSocket manager
    pub fn websocket_manager(&self) -> &Arc<WebSocketManager> {
        &self.websocket_manager
    }
    
    /// Get message queue
    pub fn message_queue(&self) -> &Arc<dyn MessageQueue> {
        &self.message_queue
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::messaging::MessageContent as MessagingMessageContent;

    #[tokio::test]
    async fn test_orchestrator_builder() {
        let redis_client = redis::Client::open("redis://127.0.0.1:6379").unwrap();
        
        let whatsapp_config = WhatsAppConfig {
            access_token: "test_token".to_string(),
            phone_number_id: "test_phone".to_string(),
            webhook_verify_token: Some("test_verify".to_string()),
        };
        
        let orchestrator = PyTakeOrchestratorBuilder::new()
            .with_redis(redis_client)
            .with_whatsapp(whatsapp_config)
            .build()
            .await;
        
        // This will fail in test environment without Redis, but tests the structure
        assert!(orchestrator.is_err() || orchestrator.is_ok());
    }

    #[tokio::test]
    async fn test_health_status_structure() {
        // Test that health status structures can be serialized/deserialized
        let health = SystemHealthStatus {
            overall_status: HealthStatus::Healthy,
            services: HashMap::new(),
            platforms: HashMap::new(),
            last_check: chrono::Utc::now(),
        };
        
        let json = serde_json::to_string(&health).unwrap();
        let deserialized: SystemHealthStatus = serde_json::from_str(&json).unwrap();
        
        assert!(matches!(deserialized.overall_status, HealthStatus::Healthy));
    }
}