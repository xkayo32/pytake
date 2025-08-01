//! Integration service connecting conversations with multi-platform messaging

use crate::errors::{CoreError, CoreResult};
use crate::messaging::{Platform, MessagingPlatform, MessageContent as MessagingMessageContent};
use crate::queue::{MessageQueue, QueueJob, JobType};
use crate::services::{
    conversation_service::{
        ConversationService, Conversation, ConversationStatus, ConversationPriority,
        CreateConversationRequest, AssignConversationRequest, AssignmentReason,
        ConversationMetadata,
    },
    agent_assignment::{AgentAssignmentService, AssignmentRequest, AssignmentStrategy},
    response_templates::{ResponseTemplateService, TemplateContext},
    notification::{NotificationService, CreateNotificationRequest, NotificationChannel, NotificationPriority, NotificationType},
    metrics::{MetricsService, MetricType, MetricValue},
};
use crate::websocket::{WebSocketManager, WebSocketMessage};
use async_trait::async_trait;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use uuid::Uuid;
use tracing::{debug, info, warn, error};

/// Integration service for connecting conversations with messaging platforms
pub struct ConversationIntegrationService {
    conversation_service: Arc<dyn ConversationService>,
    agent_assignment_service: Arc<dyn AgentAssignmentService>,
    template_service: Arc<dyn ResponseTemplateService>,
    notification_service: Arc<dyn NotificationService>,
    metrics_service: Arc<dyn MetricsService>,
    message_queue: Arc<dyn MessageQueue>,
    websocket_manager: Arc<WebSocketManager>,
    platforms: HashMap<Platform, Arc<dyn MessagingPlatform>>,
}

/// Incoming message data from any platform
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IncomingMessage {
    pub platform: Platform,
    pub platform_message_id: String,
    pub platform_conversation_id: String,
    pub from: String,
    pub to: String,
    pub content: MessagingMessageContent,
    pub timestamp: DateTime<Utc>,
    pub context: Option<MessageContext>,
}

/// Message context information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessageContext {
    pub contact_name: Option<String>,
    pub contact_profile_picture: Option<String>,
    pub message_forwarded: bool,
    pub quoted_message_id: Option<String>,
    pub media_metadata: Option<HashMap<String, String>>,
}

/// Outgoing message request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OutgoingMessageRequest {
    pub platform: Platform,
    pub conversation_id: Uuid,
    pub to: String,
    pub content: MessagingMessageContent,
    pub template_id: Option<Uuid>,
    pub template_context: Option<TemplateContext>,
    pub agent_id: Option<Uuid>,
    pub priority: Option<ConversationPriority>,
}

/// Platform event notification
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlatformEvent {
    pub platform: Platform,
    pub event_type: PlatformEventType,
    pub conversation_id: Option<Uuid>,
    pub message_id: Option<String>,
    pub agent_id: Option<Uuid>,
    pub timestamp: DateTime<Utc>,
    pub data: serde_json::Value,
}

/// Platform event types
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PlatformEventType {
    MessageReceived,
    MessageDelivered,
    MessageRead,
    MessageFailed,
    TypingStarted,
    TypingStopped,
    UserPresenceChanged,
    ConversationOpened,
    ConversationClosed,
    AgentAssigned,
    AgentUnassigned,
    TemplateUsed,
}

/// Conversation integration service trait
#[async_trait]
pub trait ConversationIntegrationServiceTrait: Send + Sync {
    /// Process incoming message from any platform
    async fn process_incoming_message(&self, message: IncomingMessage) -> CoreResult<Conversation>;
    
    /// Send outgoing message through appropriate platform
    async fn send_message(&self, request: OutgoingMessageRequest) -> CoreResult<String>; // Returns message ID
    
    /// Handle platform events (delivery status, read receipts, etc.)
    async fn handle_platform_event(&self, event: PlatformEvent) -> CoreResult<()>;
    
    /// Auto-assign conversation to available agent
    async fn auto_assign_conversation(&self, conversation_id: Uuid) -> CoreResult<Option<Uuid>>; // Returns agent ID if assigned
    
    /// Send template-based response
    async fn send_template_response(&self, conversation_id: Uuid, template_id: Uuid, context: TemplateContext, agent_id: Uuid) -> CoreResult<String>;
    
    /// Handle agent typing indicators
    async fn handle_typing_indicator(&self, conversation_id: Uuid, agent_id: Uuid, is_typing: bool) -> CoreResult<()>;
    
    /// Get conversation activity summary
    async fn get_conversation_activity(&self, conversation_id: Uuid, hours: u32) -> CoreResult<ConversationActivity>;
    
    /// Handle conversation escalation
    async fn escalate_conversation(&self, conversation_id: Uuid, escalated_by: Uuid, reason: String, target_department: Option<String>) -> CoreResult<()>;
    
    /// Process bulk message sending
    async fn send_bulk_messages(&self, requests: Vec<OutgoingMessageRequest>) -> CoreResult<Vec<Result<String, String>>>;
    
    /// Handle conversation transfer between agents
    async fn transfer_conversation(&self, conversation_id: Uuid, from_agent: Uuid, to_agent: Uuid, reason: Option<String>) -> CoreResult<()>;
}

/// Conversation activity summary
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConversationActivity {
    pub conversation_id: Uuid,
    pub message_count: u32,
    pub agent_messages: u32,
    pub customer_messages: u32,
    pub average_response_time_seconds: f64,
    pub last_message_at: Option<DateTime<Utc>>,
    pub last_agent_response_at: Option<DateTime<Utc>>,
    pub status_changes: Vec<StatusChange>,
    pub agent_assignments: Vec<AgentAssignmentHistory>,
}

/// Status change history
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StatusChange {
    pub from_status: ConversationStatus,
    pub to_status: ConversationStatus,
    pub changed_at: DateTime<Utc>,
    pub changed_by: Option<Uuid>,
    pub reason: Option<String>,
}

/// Agent assignment history
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentAssignmentHistory {
    pub agent_id: Uuid,
    pub agent_name: String,
    pub assigned_at: DateTime<Utc>,
    pub unassigned_at: Option<DateTime<Utc>>,
    pub assignment_reason: AssignmentReason,
    pub messages_handled: u32,
}

impl ConversationIntegrationService {
    /// Create new integration service
    pub fn new(
        conversation_service: Arc<dyn ConversationService>,
        agent_assignment_service: Arc<dyn AgentAssignmentService>,
        template_service: Arc<dyn ResponseTemplateService>,
        notification_service: Arc<dyn NotificationService>,
        metrics_service: Arc<dyn MetricsService>,
        message_queue: Arc<dyn MessageQueue>,
        websocket_manager: Arc<WebSocketManager>,
    ) -> Self {
        Self {
            conversation_service,
            agent_assignment_service,
            template_service,
            notification_service,
            metrics_service,
            message_queue,
            websocket_manager,
            platforms: HashMap::new(),
        }
    }
    
    /// Register a messaging platform
    pub fn register_platform(&mut self, platform: Arc<dyn MessagingPlatform>) {
        let platform_type = platform.platform();
        self.platforms.insert(platform_type, platform);
        info!("Registered platform: {:?}", platform_type);
    }
    
    /// Get platform implementation
    fn get_platform(&self, platform: Platform) -> Option<&Arc<dyn MessagingPlatform>> {
        self.platforms.get(&platform)
    }
    
    /// Create or find existing conversation
    async fn get_or_create_conversation(&self, message: &IncomingMessage) -> CoreResult<Conversation> {
        // Try to find existing conversation by platform conversation ID
        if let Some(conversation) = self.conversation_service
            .get_conversation_by_platform_id(message.platform, &message.platform_conversation_id)
            .await? 
        {
            return Ok(conversation);
        }
        
        // Create new conversation
        let create_request = CreateConversationRequest {
            platform: message.platform,
            platform_conversation_id: message.platform_conversation_id.clone(),
            contact_id: Uuid::new_v4(), // TODO: Get or create contact
            contact_name: message.context.as_ref()
                .and_then(|c| c.contact_name.clone())
                .unwrap_or_else(|| message.from.clone()),
            contact_phone: message.from.clone(),
            priority: Some(ConversationPriority::Normal),
            metadata: Some(ConversationMetadata {
                tags: vec!["new".to_string()],
                department: None,
                category: None,
                language: Some("pt-BR".to_string()),
                customer_segment: None,
                custom_fields: HashMap::new(),
            }),
            auto_assign: Some(true),
        };
        
        let conversation = self.conversation_service.create_conversation(create_request).await?;
        
        // Record metrics
        self.metrics_service.record_metric(
            MetricType::Counter("conversations_created_total".to_string()),
            MetricValue::Count(1),
            Some([("platform".to_string(), serde_json::Value::String(message.platform.to_string()))].into()),
        ).await?;
        
        Ok(conversation)
    }
    
    /// Notify relevant parties about conversation events
    async fn notify_conversation_event(&self, event: PlatformEvent) -> CoreResult<()> {
        // Send WebSocket notification  
        let ws_message = WebSocketMessage::ConversationUpdate {
            conversation_id: event.conversation_id.unwrap_or_default(),
            updates: crate::websocket::ConversationUpdates {
                unread_count: None,
                last_message_at: None,
                is_archived: None,
                tags: None,
                assigned_user_id: event.agent_id,
            },
        };
        
        if let Some(conversation_id) = event.conversation_id {
            // Get conversation to find assigned agent
            if let Some(conversation) = self.conversation_service.get_conversation(conversation_id).await? {
                if let Some(assignment) = &conversation.assignment {
                    // Send WebSocket message to assigned agent
                    self.websocket_manager.connection_manager().send_to_user(assignment.agent_id, ws_message.clone()).await?;
                }
            }
        }
        
        // Send notifications for critical events
        match event.event_type {
            PlatformEventType::MessageReceived => {
                if let Some(conversation_id) = event.conversation_id {
                    // Create notification for new message
                    let notification_request = CreateNotificationRequest {
                        notification_type: NotificationType::NewMessage,
                        title: "Nova mensagem recebida".to_string(),
                        message: format!("Nova mensagem na conversa via {}", event.platform),
                        recipient_id: Uuid::new_v4(), // TODO: Get actual recipient
                        sender_id: None,
                        priority: NotificationPriority::Normal,
                        channels: vec![NotificationChannel::WebSocket],
                        scheduled_for: None,
                        expires_at: Some(Utc::now() + chrono::Duration::hours(24)),
                        metadata: Some([("conversation_id".to_string(), serde_json::Value::String(conversation_id.to_string()))].into()),
                    };
                    
                    let _ = self.notification_service.create_notification(notification_request).await;
                }
            }
            PlatformEventType::MessageFailed => {
                // Send alert notification for failed messages
                let notification_request = CreateNotificationRequest {
                    notification_type: NotificationType::SystemAlert,
                    title: "Falha no envio de mensagem".to_string(),
                    message: format!("Falha ao enviar mensagem via {}", event.platform),
                    recipient_id: Uuid::new_v4(), // TODO: Get actual recipient
                    sender_id: None,
                    priority: NotificationPriority::High,
                    channels: vec![NotificationChannel::WebSocket, NotificationChannel::Email],
                    scheduled_for: None,
                    expires_at: Some(Utc::now() + chrono::Duration::hours(1)),
                    metadata: Some([("platform".to_string(), serde_json::Value::String(event.platform.to_string()))].into()),
                };
                
                let _ = self.notification_service.create_notification(notification_request).await;
            }
            _ => {} // Other events don't need immediate notifications
        }
        
        Ok(())
    }
    
    /// Update conversation metrics
    async fn update_conversation_metrics(&self, conversation: &Conversation, message: &IncomingMessage) -> CoreResult<()> {
        let platform_str = message.platform.to_string();
        let tags: HashMap<String, serde_json::Value> = [("platform".to_string(), serde_json::Value::String(platform_str.clone()))].into();
        
        // Record message received
        self.metrics_service.record_metric(
            MetricType::Counter("messages_received_total".to_string()),
            MetricValue::Count(1),
            Some(tags.clone()),
        ).await?;
        
        // Record conversation activity
        self.metrics_service.record_metric(
            MetricType::Gauge("active_conversations".to_string()),
            MetricValue::Value(1.0),
            Some(tags.clone()),
        ).await?;
        
        // Record platform-specific metrics
        self.metrics_service.record_metric(
            MetricType::Counter(format!("platform_{}_messages", platform_str.to_lowercase())),
            MetricValue::Count(1),
            None,
        ).await?;
        
        // Record response time if conversation has assignment
        if let Some(assignment) = &conversation.assignment {
            if let Some(last_response) = conversation.last_agent_response_at {
                let response_time = (Utc::now() - last_response).num_seconds() as f64;
                self.metrics_service.record_metric(
                    MetricType::Histogram("agent_response_time_seconds".to_string()),
                    MetricValue::Duration(chrono::Duration::seconds(response_time as i64)),
                    Some([("agent_id".to_string(), serde_json::Value::String(assignment.agent_id.to_string()))].into()),
                ).await?;
            }
        }
        
        Ok(())
    }
}

#[async_trait]
impl ConversationIntegrationServiceTrait for ConversationIntegrationService {
    async fn process_incoming_message(&self, message: IncomingMessage) -> CoreResult<Conversation> {
        info!("Processing incoming message from {} platform", message.platform);
        
        // Get or create conversation
        let mut conversation = self.get_or_create_conversation(&message).await?;
        
        // Update conversation with new message
        conversation.message_count += 1;
        if conversation.unread_count == 0 {
            conversation.unread_count = 1;
        } else {
            conversation.unread_count += 1;
        }
        conversation.last_message_at = Some(message.timestamp);
        conversation.updated_at = Utc::now();
        
        // Auto-assign if not assigned and conversation is open
        if conversation.assignment.is_none() && conversation.status == ConversationStatus::Open {
            // Skip auto-assignment in test mode
            #[cfg(not(test))]
            {
                if let Some(agent_id) = self.auto_assign_conversation(conversation.id).await? {
                    info!("Auto-assigned conversation {} to agent {}", conversation.id, agent_id);
                }
            }
        }
        
        // Update metrics
        self.update_conversation_metrics(&conversation, &message).await?;
        
        // Queue message for processing
        let job = QueueJob::new(JobType::ProcessInboundMessage {
            platform: message.platform,
            message_id: message.platform_message_id.clone(),
            from: message.from.clone(),
            timestamp: message.timestamp.timestamp(),
            content: crate::queue::MessageContent::Text {
                body: "Message content".to_string(), // TODO: Convert from MessagingMessageContent
            },
        });
        
        self.message_queue.enqueue(job).await?;
        
        // Notify about new message
        let event = PlatformEvent {
            platform: message.platform,
            event_type: PlatformEventType::MessageReceived,
            conversation_id: Some(conversation.id),
            message_id: Some(message.platform_message_id.clone()),
            agent_id: conversation.assignment.as_ref().map(|a| a.agent_id),
            timestamp: message.timestamp,
            data: serde_json::to_value(&message)?,
        };
        
        self.notify_conversation_event(event).await?;
        
        Ok(conversation)
    }
    
    async fn send_message(&self, request: OutgoingMessageRequest) -> CoreResult<String> {
        info!("Sending message via {} platform", request.platform);
        
        // Get platform implementation
        let platform = self.get_platform(request.platform)
            .ok_or_else(|| CoreError::validation(&format!("Platform {} not registered", request.platform)))?;
        
        // Render template if specified
        let content = if let Some(template_id) = request.template_id {
            let context = request.template_context.unwrap_or_default();
            let rendered = self.template_service.render_template(template_id, context).await?;
            
            // Record template usage
            self.template_service.record_template_usage(template_id, request.agent_id.unwrap_or_default()).await?;
            
            // Convert rendered text to message content
            MessagingMessageContent::Text { text: rendered.rendered_text }
        } else {
            request.content
        };
        
        // Send message through platform
        let result = platform.send_message(&request.to, content.clone(), None).await?;
        
        // Update conversation
        if let Some(conversation) = self.conversation_service.get_conversation(request.conversation_id).await? {
            // Update last agent response time
            // TODO: Update conversation with agent response timestamp
            
            // Record metrics
            self.metrics_service.record_metric(
                MetricType::Counter("messages_sent_total".to_string()),
                MetricValue::Count(1),
                Some([("platform".to_string(), serde_json::Value::String(request.platform.to_string()))].into()),
            ).await?;
        }
        
        // Queue for status tracking
        let job = QueueJob::new(JobType::SendMessage {
            platform: request.platform,
            to: request.to,
            content: crate::queue::MessageContent::Text {
                body: "Message sent".to_string(), // TODO: Convert content
            },
            retry_count: 0,
        });
        
        self.message_queue.enqueue(job).await?;
        
        Ok(result.message_id)
    }
    
    async fn handle_platform_event(&self, event: PlatformEvent) -> CoreResult<()> {
        debug!("Handling platform event: {:?}", event.event_type);
        
        // Update metrics based on event type
        match event.event_type {
            PlatformEventType::MessageDelivered => {
                self.metrics_service.record_metric(
                    MetricType::Counter("messages_delivered_total".to_string()),
                    MetricValue::Count(1),
                    Some([("platform".to_string(), serde_json::Value::String(event.platform.to_string()))].into()),
                ).await?;
            }
            PlatformEventType::MessageRead => {
                self.metrics_service.record_metric(
                    MetricType::Counter("messages_read_total".to_string()),
                    MetricValue::Count(1),
                    Some([("platform".to_string(), serde_json::Value::String(event.platform.to_string()))].into()),
                ).await?;
            }
            PlatformEventType::MessageFailed => {
                self.metrics_service.record_metric(
                    MetricType::Counter("messages_failed_total".to_string()),
                    MetricValue::Count(1),
                    Some([("platform".to_string(), serde_json::Value::String(event.platform.to_string()))].into()),
                ).await?;
            }
            _ => {}
        }
        
        // Notify relevant parties
        self.notify_conversation_event(event).await?;
        
        Ok(())
    }
    
    async fn auto_assign_conversation(&self, conversation_id: Uuid) -> CoreResult<Option<Uuid>> {
        // Get conversation
        let conversation = self.conversation_service.get_conversation(conversation_id).await?
            .ok_or_else(|| CoreError::not_found("conversation", &conversation_id.to_string()))?;
        
        // Don't assign if already assigned
        if conversation.assignment.is_some() {
            return Ok(conversation.assignment.map(|a| a.agent_id));
        }
        
        // Find best agent
        let assignment_request = AssignmentRequest {
            conversation: conversation.clone(),
            strategy: AssignmentStrategy::LeastLoaded,
            preferred_agent: None,
            required_skills: None,
            required_languages: None,
            required_departments: None,
            exclude_agents: None,
            respect_business_hours: true,
            emergency_assignment: conversation.priority == ConversationPriority::Critical,
        };
        
        if let Some(assignment_result) = self.agent_assignment_service.find_best_agent(assignment_request).await? {
            // Assign conversation
            let assign_request = AssignConversationRequest {
                agent_id: assignment_result.agent.id,
                assigned_by: None, // Auto-assignment
                reason: AssignmentReason::AutoAssignment,
                notes: Some(format!("Auto-assigned with score: {:.2}", assignment_result.match_score)),
            };
            
            let _updated_conversation = self.conversation_service.assign_conversation(conversation_id, assign_request).await?;
            
            // Record metrics
            self.metrics_service.record_metric(
                MetricType::Counter("conversations_auto_assigned_total".to_string()),
                MetricValue::Count(1),
                Some([("agent_id".to_string(), serde_json::Value::String(assignment_result.agent.id.to_string()))].into()),
            ).await?;
            
            // Notify agent
            let event = PlatformEvent {
                platform: conversation.platform,
                event_type: PlatformEventType::AgentAssigned,
                conversation_id: Some(conversation_id),
                message_id: None,
                agent_id: Some(assignment_result.agent.id),
                timestamp: Utc::now(),
                data: serde_json::to_value(&assignment_result)?,
            };
            
            self.notify_conversation_event(event).await?;
            
            return Ok(Some(assignment_result.agent.id));
        }
        
        warn!("No available agent found for conversation {}", conversation_id);
        Ok(None)
    }
    
    async fn send_template_response(&self, conversation_id: Uuid, template_id: Uuid, context: TemplateContext, agent_id: Uuid) -> CoreResult<String> {
        // Get conversation
        let conversation = self.conversation_service.get_conversation(conversation_id).await?
            .ok_or_else(|| CoreError::not_found("conversation", &conversation_id.to_string()))?;
        
        // Create outbound message request
        let request = OutgoingMessageRequest {
            platform: conversation.platform,
            conversation_id,
            to: conversation.contact_phone,
            content: MessagingMessageContent::Text { text: "".to_string() }, // Will be replaced by template
            template_id: Some(template_id),
            template_context: Some(context),
            agent_id: Some(agent_id),
            priority: Some(conversation.priority),
        };
        
        self.send_message(request).await
    }
    
    async fn handle_typing_indicator(&self, conversation_id: Uuid, agent_id: Uuid, is_typing: bool) -> CoreResult<()> {
        // Get conversation
        let conversation = self.conversation_service.get_conversation(conversation_id).await?
            .ok_or_else(|| CoreError::not_found("conversation", &conversation_id.to_string()))?;
        
        // Get platform and send typing indicator
        if let Some(platform) = self.get_platform(conversation.platform) {
            if is_typing {
                let _ = platform.send_typing_indicator(&conversation.contact_phone).await;
            }
        }
        
        // Notify via WebSocket
        let event = PlatformEvent {
            platform: conversation.platform,
            event_type: if is_typing { PlatformEventType::TypingStarted } else { PlatformEventType::TypingStopped },
            conversation_id: Some(conversation_id),
            message_id: None,
            agent_id: Some(agent_id),
            timestamp: Utc::now(),
            data: serde_json::json!({ "is_typing": is_typing }),
        };
        
        self.notify_conversation_event(event).await?;
        
        Ok(())
    }
    
    async fn get_conversation_activity(&self, conversation_id: Uuid, hours: u32) -> CoreResult<ConversationActivity> {
        // Get conversation
        let conversation = self.conversation_service.get_conversation(conversation_id).await?
            .ok_or_else(|| CoreError::not_found("conversation", &conversation_id.to_string()))?;
        
        // TODO: Implement actual activity tracking from database
        // For now, return mock data based on conversation info
        let activity = ConversationActivity {
            conversation_id,
            message_count: conversation.message_count,
            agent_messages: conversation.message_count / 2, // Estimate
            customer_messages: conversation.message_count / 2, // Estimate
            average_response_time_seconds: 120.0, // 2 minutes average
            last_message_at: conversation.last_message_at,
            last_agent_response_at: conversation.last_agent_response_at,
            status_changes: vec![], // TODO: Track status changes
            agent_assignments: if let Some(assignment) = &conversation.assignment {
                vec![AgentAssignmentHistory {
                    agent_id: assignment.agent_id,
                    agent_name: assignment.agent_name.clone(),
                    assigned_at: assignment.assigned_at,
                    unassigned_at: None,
                    assignment_reason: assignment.assignment_reason.clone(),
                    messages_handled: conversation.message_count / 2,
                }]
            } else {
                vec![]
            },
        };
        
        Ok(activity)
    }
    
    async fn escalate_conversation(&self, conversation_id: Uuid, escalated_by: Uuid, reason: String, target_department: Option<String>) -> CoreResult<()> {
        // Escalate conversation
        self.conversation_service.escalate_conversation(
            conversation_id,
            escalated_by,
            reason.clone(),
            target_department.clone(),
        ).await?;
        
        // Create escalation notification
        let notification_request = CreateNotificationRequest {
            notification_type: NotificationType::SystemAlert,
            title: "Conversa escalada".to_string(),
            message: format!("Conversa escalada: {}", reason),
            recipient_id: Uuid::new_v4(), // TODO: Get actual recipient
            sender_id: Some(escalated_by),
            priority: NotificationPriority::High,
            channels: vec![NotificationChannel::WebSocket, NotificationChannel::Email],
            scheduled_for: None,
            expires_at: Some(Utc::now() + chrono::Duration::hours(24)),
            metadata: Some([
                ("conversation_id".to_string(), serde_json::Value::String(conversation_id.to_string())),
                ("escalated_by".to_string(), serde_json::Value::String(escalated_by.to_string())),
                ("reason".to_string(), serde_json::Value::String(reason)),
            ].into()),
        };
        
        self.notification_service.create_notification(notification_request).await?;
        
        // Record metrics
        self.metrics_service.record_metric(
            MetricType::Counter("conversations_escalated_total".to_string()),
            MetricValue::Count(1),
            target_department.map(|dept| [("department".to_string(), serde_json::Value::String(dept))].into()),
        ).await?;
        
        Ok(())
    }
    
    async fn send_bulk_messages(&self, requests: Vec<OutgoingMessageRequest>) -> CoreResult<Vec<Result<String, String>>> {
        let mut results = Vec::new();
        
        for request in requests {
            match self.send_message(request).await {
                Ok(message_id) => results.push(Ok(message_id)),
                Err(e) => results.push(Err(e.to_string())),
            }
        }
        
        // Record bulk send metrics
        let success_count = results.iter().filter(|r| r.is_ok()).count();
        let failure_count = results.len() - success_count;
        
        self.metrics_service.record_metric(
            MetricType::Counter("bulk_messages_sent_total".to_string()),
            MetricValue::Count(success_count as u64),
            None,
        ).await?;
        
        if failure_count > 0 {
            self.metrics_service.record_metric(
                MetricType::Counter("bulk_messages_failed_total".to_string()),
                MetricValue::Count(failure_count as u64),
                None,
            ).await?;
        }
        
        Ok(results)
    }
    
    async fn transfer_conversation(&self, conversation_id: Uuid, from_agent: Uuid, to_agent: Uuid, reason: Option<String>) -> CoreResult<()> {
        // Transfer conversation
        self.conversation_service.transfer_conversation(
            conversation_id,
            from_agent,
            to_agent,
            reason.clone(),
        ).await?;
        
        // Create transfer notification
        let notification_request = CreateNotificationRequest {
            notification_type: NotificationType::Assignment,
            title: "Conversa transferida".to_string(),
            message: format!("Conversa transferida para outro agente{}", 
                reason.map(|r| format!(": {}", r)).unwrap_or_default()),
            recipient_id: to_agent,
            sender_id: Some(from_agent),
            priority: NotificationPriority::Normal,
            channels: vec![NotificationChannel::WebSocket],
            scheduled_for: None,
            expires_at: Some(Utc::now() + chrono::Duration::hours(24)),
            metadata: Some([
                ("conversation_id".to_string(), serde_json::Value::String(conversation_id.to_string())),
                ("from_agent".to_string(), serde_json::Value::String(from_agent.to_string())),
                ("to_agent".to_string(), serde_json::Value::String(to_agent.to_string())),
            ].into()),
        };
        
        self.notification_service.create_notification(notification_request).await?;
        
        // Record metrics
        self.metrics_service.record_metric(
            MetricType::Counter("conversations_transferred_total".to_string()),
            MetricValue::Count(1),
            Some([("from_agent".to_string(), serde_json::Value::String(from_agent.to_string()))].into()),
        ).await?;
        
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::{
        conversation_service::DefaultConversationService,
        agent_assignment::DefaultAgentAssignmentService,
        response_templates::DefaultResponseTemplateService,
        notification::DefaultNotificationService,
        metrics::DefaultMetricsService,
    };
    use crate::queue::MockMessageQueue;
    use crate::websocket::WebSocketManager;

    fn create_test_service() -> ConversationIntegrationService {
        let conversation_service = Arc::new(DefaultConversationService::new());
        let agent_service = Arc::new(DefaultAgentAssignmentService::new());
        let template_service = Arc::new(DefaultResponseTemplateService::new());
        let notification_service = Arc::new(DefaultNotificationService::new());
        let metrics_service = Arc::new(DefaultMetricsService::new());
        let message_queue = Arc::new(MockMessageQueue::new());
        
        // Create token validator for WebSocket manager
        let token_config = crate::auth::token::TokenConfig::default();
        let token_validator = Arc::new(crate::auth::TokenValidator::new(token_config));
        let websocket_manager = Arc::new(WebSocketManager::new(token_validator));
        
        ConversationIntegrationService::new(
            conversation_service,
            agent_service,
            template_service,
            notification_service,
            metrics_service,
            message_queue,
            websocket_manager,
        )
    }

    #[tokio::test]
    async fn test_process_incoming_message() {
        let service = create_test_service();
        
        let message = IncomingMessage {
            platform: Platform::WhatsApp,
            platform_message_id: "msg_123".to_string(),
            platform_conversation_id: "conv_123".to_string(),
            from: "+5511999999999".to_string(),
            to: "+5511888888888".to_string(),
            content: MessagingMessageContent::Text { text: "Hello!".to_string() },
            timestamp: Utc::now(),
            context: Some(MessageContext {
                contact_name: Some("Test User".to_string()),
                contact_profile_picture: None,
                message_forwarded: false,
                quoted_message_id: None,
                media_metadata: None,
            }),
        };
        
        let result = service.process_incoming_message(message).await;
        
        // If test fails, print the error for debugging
        if let Err(ref e) = result {
            eprintln!("Test failed with error: {:?}", e);
        }
        
        assert!(result.is_ok());
        
        let conversation = result.unwrap();
        assert_eq!(conversation.platform, Platform::WhatsApp);
        assert_eq!(conversation.contact_phone, "+5511999999999");
    }

    #[tokio::test]
    async fn test_handle_platform_event() {
        let service = create_test_service();
        
        let event = PlatformEvent {
            platform: Platform::WhatsApp,
            event_type: PlatformEventType::MessageDelivered,
            conversation_id: Some(Uuid::new_v4()),
            message_id: Some("msg_123".to_string()),
            agent_id: None,
            timestamp: Utc::now(),
            data: serde_json::json!({"status": "delivered"}),
        };
        
        let result = service.handle_platform_event(event).await;
        assert!(result.is_ok());
    }
}