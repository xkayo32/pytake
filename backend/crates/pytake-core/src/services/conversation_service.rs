//! Conversation management service for handling multi-platform conversations

use crate::errors::{CoreError, CoreResult};
use crate::messaging::Platform;
use async_trait::async_trait;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;
use tracing::{debug, info, warn, error};

/// Conversation status
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "snake_case")]
pub enum ConversationStatus {
    /// New conversation, not yet assigned
    Open,
    /// Assigned to an agent
    Assigned,
    /// Agent is actively responding
    Active,
    /// Waiting for customer response
    Pending,
    /// Conversation is closed
    Closed,
    /// Conversation is archived
    Archived,
    /// Conversation requires escalation
    Escalated,
}

/// Conversation priority levels
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, PartialOrd, Eq, Hash, Ord)]
#[serde(rename_all = "snake_case")]
pub enum ConversationPriority {
    Low = 1,
    Normal = 2,
    High = 3,
    Urgent = 4,
    Critical = 5,
}

/// Conversation assignment information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConversationAssignment {
    pub agent_id: Uuid,
    pub agent_name: String,
    pub assigned_at: DateTime<Utc>,
    pub assigned_by: Option<Uuid>, // Who assigned (supervisor, auto-assignment, etc.)
    pub assignment_reason: AssignmentReason,
}

/// Reasons for conversation assignment
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AssignmentReason {
    /// Automatically assigned by system rules
    AutoAssignment,
    /// Manually assigned by supervisor
    ManualAssignment,
    /// Customer requested specific agent
    CustomerRequest,
    /// Transferred from another agent
    Transfer,
    /// Escalated from another department
    Escalation,
    /// Load balancing
    LoadBalancing,
}

/// Conversation metadata and tags
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConversationMetadata {
    pub tags: Vec<String>,
    pub department: Option<String>,
    pub category: Option<String>,
    pub language: Option<String>,
    pub customer_segment: Option<String>,
    pub custom_fields: HashMap<String, serde_json::Value>,
}

/// Complete conversation information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Conversation {
    pub id: Uuid,
    pub platform: Platform,
    pub platform_conversation_id: String,
    pub contact_id: Uuid,
    pub contact_name: String,
    pub contact_phone: String,
    pub status: ConversationStatus,
    pub priority: ConversationPriority,
    pub assignment: Option<ConversationAssignment>,
    pub metadata: ConversationMetadata,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub last_message_at: Option<DateTime<Utc>>,
    pub last_agent_response_at: Option<DateTime<Utc>>,
    pub response_time_sla: Option<u64>, // seconds
    pub message_count: u32,
    pub unread_count: u32,
}

/// Conversation creation data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateConversationRequest {
    pub platform: Platform,
    pub platform_conversation_id: String,
    pub contact_id: Uuid,
    pub contact_name: String,
    pub contact_phone: String,
    pub priority: Option<ConversationPriority>,
    pub metadata: Option<ConversationMetadata>,
    pub auto_assign: Option<bool>,
}

/// Conversation update data  
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateConversationRequest {
    pub status: Option<ConversationStatus>,
    pub priority: Option<ConversationPriority>,
    pub metadata: Option<ConversationMetadata>,
    pub tags: Option<Vec<String>>,
}

/// Conversation assignment request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssignConversationRequest {
    pub agent_id: Uuid,
    pub assigned_by: Option<Uuid>,
    pub reason: AssignmentReason,
    pub notes: Option<String>,
}

/// Conversation search filters
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ConversationFilters {
    pub status: Option<Vec<ConversationStatus>>,
    pub priority: Option<Vec<ConversationPriority>>,
    pub platform: Option<Vec<Platform>>,
    pub assigned_agent: Option<Uuid>,
    pub department: Option<String>,
    pub tags: Option<Vec<String>>,
    pub created_after: Option<DateTime<Utc>>,
    pub created_before: Option<DateTime<Utc>>,
    pub has_unread: Option<bool>,
    pub search_text: Option<String>,
}

/// Conversation search and pagination options
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConversationSearchOptions {
    pub filters: ConversationFilters,
    pub sort_by: ConversationSortBy,
    pub sort_order: SortOrder,
    pub page: u32,
    pub page_size: u32,
}

/// Conversation sorting options
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ConversationSortBy {
    CreatedAt,
    UpdatedAt,
    LastMessageAt,
    Priority,
    Status,
    ContactName,
    MessageCount,
    ResponseTime,
}

/// Sort order
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SortOrder {
    Asc,
    Desc,
}

/// Paginated conversation results
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConversationPage {
    pub conversations: Vec<Conversation>,
    pub total_count: u64,
    pub page: u32,
    pub page_size: u32,
    pub total_pages: u32,
    pub has_next: bool,
    pub has_previous: bool,
}

/// Conversation statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConversationStats {
    pub total_conversations: u64,
    pub open_conversations: u64,
    pub assigned_conversations: u64,
    pub closed_conversations: u64,
    pub average_response_time_seconds: Option<f64>,
    pub conversations_by_platform: HashMap<Platform, u64>,
    pub conversations_by_priority: HashMap<ConversationPriority, u64>,
    pub conversations_by_status: HashMap<ConversationStatus, u64>,
}

/// Agent assignment rules
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssignmentRule {
    pub id: Uuid,
    pub name: String,
    pub priority: u32,
    pub conditions: AssignmentConditions,
    pub actions: AssignmentActions,
    pub enabled: bool,
}

/// Conditions for automatic assignment
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssignmentConditions {
    pub platforms: Option<Vec<Platform>>,
    pub priority_levels: Option<Vec<ConversationPriority>>,
    pub departments: Option<Vec<String>>,
    pub tags: Option<Vec<String>>,
    pub business_hours_only: Option<bool>,
    pub customer_segments: Option<Vec<String>>,
}

/// Actions to take when assignment rule matches
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssignmentActions {
    pub assign_to_agent: Option<Uuid>,
    pub assign_to_department: Option<String>,
    pub use_load_balancing: Option<bool>,
    pub set_priority: Option<ConversationPriority>,
    pub add_tags: Option<Vec<String>>,
    pub send_notification: Option<bool>,
}

/// Conversation service trait
#[async_trait]
pub trait ConversationService: Send + Sync {
    /// Create a new conversation
    async fn create_conversation(&self, request: CreateConversationRequest) -> CoreResult<Conversation>;
    
    /// Get conversation by ID
    async fn get_conversation(&self, id: Uuid) -> CoreResult<Option<Conversation>>;
    
    /// Get conversation by platform conversation ID
    async fn get_conversation_by_platform_id(
        &self, 
        platform: Platform, 
        platform_conversation_id: &str
    ) -> CoreResult<Option<Conversation>>;
    
    /// Update conversation
    async fn update_conversation(&self, id: Uuid, request: UpdateConversationRequest) -> CoreResult<Conversation>;
    
    /// Assign conversation to agent
    async fn assign_conversation(&self, id: Uuid, request: AssignConversationRequest) -> CoreResult<Conversation>;
    
    /// Unassign conversation
    async fn unassign_conversation(&self, id: Uuid, unassigned_by: Option<Uuid>) -> CoreResult<Conversation>;
    
    /// Close conversation
    async fn close_conversation(&self, id: Uuid, closed_by: Uuid, reason: Option<String>) -> CoreResult<Conversation>;
    
    /// Reopen conversation
    async fn reopen_conversation(&self, id: Uuid, reopened_by: Uuid) -> CoreResult<Conversation>;
    
    /// Archive conversation
    async fn archive_conversation(&self, id: Uuid, archived_by: Uuid) -> CoreResult<Conversation>;
    
    /// Search conversations with filters and pagination
    async fn search_conversations(&self, options: ConversationSearchOptions) -> CoreResult<ConversationPage>;
    
    /// Get conversations assigned to a specific agent
    async fn get_agent_conversations(&self, agent_id: Uuid, status_filter: Option<Vec<ConversationStatus>>) -> CoreResult<Vec<Conversation>>;
    
    /// Get conversation statistics
    async fn get_conversation_stats(&self, filters: Option<ConversationFilters>) -> CoreResult<ConversationStats>;
    
    /// Auto-assign conversation based on rules
    async fn auto_assign_conversation(&self, conversation_id: Uuid) -> CoreResult<Option<ConversationAssignment>>;
    
    /// Transfer conversation to another agent
    async fn transfer_conversation(
        &self, 
        conversation_id: Uuid, 
        from_agent: Uuid, 
        to_agent: Uuid,
        reason: Option<String>
    ) -> CoreResult<Conversation>;
    
    /// Escalate conversation
    async fn escalate_conversation(
        &self,
        conversation_id: Uuid,
        escalated_by: Uuid,
        escalation_reason: String,
        target_department: Option<String>
    ) -> CoreResult<Conversation>;
    
    /// Update conversation priority
    async fn update_priority(&self, conversation_id: Uuid, priority: ConversationPriority, updated_by: Uuid) -> CoreResult<Conversation>;
    
    /// Add tags to conversation
    async fn add_tags(&self, conversation_id: Uuid, tags: Vec<String>, added_by: Uuid) -> CoreResult<Conversation>;
    
    /// Remove tags from conversation
    async fn remove_tags(&self, conversation_id: Uuid, tags: Vec<String>, removed_by: Uuid) -> CoreResult<Conversation>;
    
    /// Mark conversation as read/unread
    async fn mark_as_read(&self, conversation_id: Uuid, agent_id: Uuid) -> CoreResult<()>;
    async fn mark_as_unread(&self, conversation_id: Uuid) -> CoreResult<()>;
    
    /// Get assignment rules
    async fn get_assignment_rules(&self) -> CoreResult<Vec<AssignmentRule>>;
    
    /// Create assignment rule
    async fn create_assignment_rule(&self, rule: AssignmentRule) -> CoreResult<AssignmentRule>;
    
    /// Update assignment rule
    async fn update_assignment_rule(&self, rule: AssignmentRule) -> CoreResult<AssignmentRule>;
    
    /// Delete assignment rule
    async fn delete_assignment_rule(&self, rule_id: Uuid) -> CoreResult<()>;
}

/// Default implementations and helpers
impl Default for ConversationPriority {
    fn default() -> Self {
        ConversationPriority::Normal
    }
}

impl Default for ConversationStatus {
    fn default() -> Self {
        ConversationStatus::Open
    }
}

impl Default for ConversationMetadata {
    fn default() -> Self {
        Self {
            tags: Vec::new(),
            department: None,
            category: None,
            language: None,
            customer_segment: None,
            custom_fields: HashMap::new(),
        }
    }
}

impl Default for ConversationSearchOptions {
    fn default() -> Self {
        Self {
            filters: ConversationFilters {
                status: None,
                priority: None,
                platform: None,
                assigned_agent: None,
                department: None,
                tags: None,
                created_after: None,
                created_before: None,
                has_unread: None,
                search_text: None,
            },
            sort_by: ConversationSortBy::UpdatedAt,
            sort_order: SortOrder::Desc,
            page: 1,
            page_size: 20,
        }
    }
}

impl ConversationPriority {
    /// Get priority score for sorting
    pub fn score(&self) -> u8 {
        match self {
            ConversationPriority::Low => 1,
            ConversationPriority::Normal => 2,
            ConversationPriority::High => 3,
            ConversationPriority::Urgent => 4,
            ConversationPriority::Critical => 5,
        }
    }
    
    /// Get priority color for UI
    pub fn color(&self) -> &'static str {
        match self {
            ConversationPriority::Low => "#6B7280",      // Gray
            ConversationPriority::Normal => "#3B82F6",   // Blue
            ConversationPriority::High => "#F59E0B",     // Yellow
            ConversationPriority::Urgent => "#EF4444",   // Red
            ConversationPriority::Critical => "#7C2D12", // Dark Red
        }
    }
}

impl ConversationStatus {
    /// Check if status allows new messages
    pub fn allows_messages(&self) -> bool {
        match self {
            ConversationStatus::Open 
            | ConversationStatus::Assigned 
            | ConversationStatus::Active 
            | ConversationStatus::Pending 
            | ConversationStatus::Escalated => true,
            ConversationStatus::Closed 
            | ConversationStatus::Archived => false,
        }
    }
    
    /// Check if status requires agent assignment
    pub fn requires_assignment(&self) -> bool {
        match self {
            ConversationStatus::Open => true,
            _ => false,
        }
    }
    
    /// Get status color for UI
    pub fn color(&self) -> &'static str {
        match self {
            ConversationStatus::Open => "#F59E0B",       // Yellow
            ConversationStatus::Assigned => "#3B82F6",   // Blue
            ConversationStatus::Active => "#10B981",     // Green
            ConversationStatus::Pending => "#8B5CF6",    // Purple
            ConversationStatus::Closed => "#6B7280",     // Gray
            ConversationStatus::Archived => "#374151",   // Dark Gray
            ConversationStatus::Escalated => "#EF4444",  // Red
        }
    }
}

/// Default implementation of ConversationService
pub struct DefaultConversationService {
    // In a real implementation, this would have database connections
}

impl DefaultConversationService {
    pub fn new() -> Self {
        Self {}
    }
}

#[async_trait]
impl ConversationService for DefaultConversationService {
    async fn create_conversation(&self, request: CreateConversationRequest) -> CoreResult<Conversation> {
        let conversation = Conversation {
            id: Uuid::new_v4(),
            platform: request.platform,
            platform_conversation_id: request.platform_conversation_id,
            contact_id: request.contact_id,
            contact_name: request.contact_name,
            contact_phone: request.contact_phone,
            status: ConversationStatus::Open,
            priority: request.priority.unwrap_or(ConversationPriority::Normal),
            assignment: None,
            metadata: request.metadata.unwrap_or_default(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
            last_message_at: None,
            last_agent_response_at: None,
            response_time_sla: None,
            message_count: 0,
            unread_count: 0,
        };
        
        info!("Created conversation {} for contact {}", conversation.id, conversation.contact_id);
        Ok(conversation)
    }
    
    async fn get_conversation(&self, id: Uuid) -> CoreResult<Option<Conversation>> {
        debug!("Getting conversation {}", id);
        // Return None for now - in a real implementation, this would query the database
        Ok(None)
    }

    async fn get_conversation_by_platform_id(&self, platform: Platform, platform_conversation_id: &str) -> CoreResult<Option<Conversation>> {
        debug!("Getting conversation by platform {:?} and platform_id {}", platform, platform_conversation_id);
        // Return None for now - in a real implementation, this would query the database
        Ok(None)
    }
    
    async fn update_conversation(&self, id: Uuid, request: UpdateConversationRequest) -> CoreResult<Conversation> {
        // Return a mock conversation - in a real implementation, this would update the database
        let conversation = Conversation {
            id,
            platform: Platform::WhatsApp,
            platform_conversation_id: "mock_conv_id".to_string(),
            contact_id: Uuid::new_v4(),
            contact_name: "Mock Contact".to_string(),
            contact_phone: "+5511999999999".to_string(),
            status: request.status.unwrap_or(ConversationStatus::Open),
            priority: request.priority.unwrap_or(ConversationPriority::Normal),
            assignment: None,
            metadata: request.metadata.unwrap_or_default(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
            last_message_at: None,
            last_agent_response_at: None,
            response_time_sla: None,
            message_count: 0,
            unread_count: 0,
        };
        
        info!("Updated conversation {}", id);
        Ok(conversation)
    }
    
    async fn assign_conversation(&self, id: Uuid, request: AssignConversationRequest) -> CoreResult<Conversation> {
        // Return a mock conversation with assignment - in a real implementation, this would update the database
        let assignment = ConversationAssignment {
            agent_id: request.agent_id,
            agent_name: "Mock Agent".to_string(),
            assigned_at: Utc::now(),
            assigned_by: request.assigned_by,
            assignment_reason: request.reason,
        };
        
        let conversation = Conversation {
            id,
            platform: Platform::WhatsApp,
            platform_conversation_id: "mock_conv_id".to_string(),
            contact_id: Uuid::new_v4(),
            contact_name: "Mock Contact".to_string(),
            contact_phone: "+5511999999999".to_string(),
            status: ConversationStatus::Assigned,
            priority: ConversationPriority::Normal,
            assignment: Some(assignment),
            metadata: ConversationMetadata::default(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
            last_message_at: None,
            last_agent_response_at: None,
            response_time_sla: None,
            message_count: 0,
            unread_count: 0,
        };
        
        info!("Assigned conversation {} to agent {}", id, request.agent_id);
        Ok(conversation)
    }
    
    async fn unassign_conversation(&self, id: Uuid, unassigned_by: Option<Uuid>) -> CoreResult<Conversation> {
        // Return a mock conversation without assignment - in a real implementation, this would update the database
        let conversation = Conversation {
            id,
            platform: Platform::WhatsApp,
            platform_conversation_id: "mock_conv_id".to_string(),
            contact_id: Uuid::new_v4(),
            contact_name: "Mock Contact".to_string(),
            contact_phone: "+5511999999999".to_string(),
            status: ConversationStatus::Open,
            priority: ConversationPriority::Normal,
            assignment: None,
            metadata: ConversationMetadata::default(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
            last_message_at: None,
            last_agent_response_at: None,
            response_time_sla: None,
            message_count: 0,
            unread_count: 0,
        };
        
        info!("Unassigned conversation {} by {:?}", id, unassigned_by);
        Ok(conversation)
    }
    
    async fn close_conversation(&self, id: Uuid, closed_by: Uuid, reason: Option<String>) -> CoreResult<Conversation> {
        // Return a mock closed conversation
        let mut metadata = ConversationMetadata::default();
        if let Some(reason) = reason {
            metadata.custom_fields.insert("close_reason".to_string(), serde_json::Value::String(reason));
        }
        metadata.custom_fields.insert("closed_by".to_string(), serde_json::Value::String(closed_by.to_string()));
        
        let conversation = Conversation {
            id,
            platform: Platform::WhatsApp,
            platform_conversation_id: "mock_conv_id".to_string(),
            contact_id: Uuid::new_v4(),
            contact_name: "Mock Contact".to_string(),
            contact_phone: "+5511999999999".to_string(),
            status: ConversationStatus::Closed,
            priority: ConversationPriority::Normal,
            assignment: None,
            metadata,
            created_at: Utc::now(),
            updated_at: Utc::now(),
            last_message_at: None,
            last_agent_response_at: None,
            response_time_sla: None,
            message_count: 0,
            unread_count: 0,
        };
        
        info!("Closed conversation {}", id);
        Ok(conversation)
    }

    async fn reopen_conversation(&self, id: Uuid, reopened_by: Uuid) -> CoreResult<Conversation> {
        info!("Reopened conversation {} by {}", id, reopened_by);
        // Mock implementation
        let conversation = Conversation {
            id,
            platform: Platform::WhatsApp,
            platform_conversation_id: "mock_conv_id".to_string(),
            contact_id: Uuid::new_v4(),
            contact_name: "Mock Contact".to_string(),
            contact_phone: "+5511999999999".to_string(),
            status: ConversationStatus::Open,
            priority: ConversationPriority::Normal,
            assignment: None,
            metadata: ConversationMetadata::default(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
            last_message_at: None,
            last_agent_response_at: None,
            response_time_sla: None,
            message_count: 0,
            unread_count: 0,
        };
        Ok(conversation)
    }
    
    async fn archive_conversation(&self, id: Uuid, archived_by: Uuid) -> CoreResult<Conversation> {
        info!("Archived conversation {} by {}", id, archived_by);
        // Mock implementation
        let conversation = Conversation {
            id,
            platform: Platform::WhatsApp,
            platform_conversation_id: "mock_conv_id".to_string(),
            contact_id: Uuid::new_v4(),
            contact_name: "Mock Contact".to_string(),
            contact_phone: "+5511999999999".to_string(),
            status: ConversationStatus::Archived,
            priority: ConversationPriority::Normal,
            assignment: None,
            metadata: ConversationMetadata::default(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
            last_message_at: None,
            last_agent_response_at: None,
            response_time_sla: None,
            message_count: 0,
            unread_count: 0,
        };
        Ok(conversation)
    }

    async fn search_conversations(&self, options: ConversationSearchOptions) -> CoreResult<ConversationPage> {
        debug!("Searching conversations with options: {:?}", options);
        // Mock implementation
        Ok(ConversationPage {
            conversations: vec![],
            total_count: 0,
            page: options.page,
            page_size: options.page_size,
            total_pages: 0,
            has_next: false,
            has_previous: false,
        })
    }

    async fn get_agent_conversations(&self, agent_id: Uuid, status_filter: Option<Vec<ConversationStatus>>) -> CoreResult<Vec<Conversation>> {
        debug!("Getting conversations for agent {} with status filter: {:?}", agent_id, status_filter);
        // Mock implementation
        Ok(vec![])
    }

    async fn get_conversation_stats(&self, filters: Option<ConversationFilters>) -> CoreResult<ConversationStats> {
        debug!("Getting conversation stats with filters: {:?}", filters);
        // Mock implementation
        use std::collections::HashMap;
        Ok(ConversationStats {
            total_conversations: 0,
            open_conversations: 0,
            assigned_conversations: 0,
            closed_conversations: 0,
            average_response_time_seconds: Some(0.0),
            conversations_by_platform: HashMap::new(),
            conversations_by_priority: HashMap::new(),
            conversations_by_status: HashMap::new(),
        })
    }

    async fn auto_assign_conversation(&self, conversation_id: Uuid) -> CoreResult<Option<ConversationAssignment>> {
        debug!("Auto-assigning conversation {}", conversation_id);
        // Mock implementation
        Ok(None)
    }

    async fn transfer_conversation(&self, conversation_id: Uuid, from_agent: Uuid, to_agent: Uuid, reason: Option<String>) -> CoreResult<Conversation> {
        info!("Transferring conversation {} from {} to {} with reason: {:?}", conversation_id, from_agent, to_agent, reason);
        // Mock implementation
        let assignment = ConversationAssignment {
            agent_id: to_agent,
            agent_name: "Target Agent".to_string(),
            assigned_at: Utc::now(),
            assigned_by: Some(from_agent),
            assignment_reason: AssignmentReason::Transfer,
        };
        
        let conversation = Conversation {
            id: conversation_id,
            platform: Platform::WhatsApp,
            platform_conversation_id: "mock_conv_id".to_string(),
            contact_id: Uuid::new_v4(),
            contact_name: "Mock Contact".to_string(),
            contact_phone: "+5511999999999".to_string(),
            status: ConversationStatus::Assigned,
            priority: ConversationPriority::Normal,
            assignment: Some(assignment),
            metadata: ConversationMetadata::default(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
            last_message_at: None,
            last_agent_response_at: None,
            response_time_sla: None,
            message_count: 0,
            unread_count: 0,
        };
        Ok(conversation)
    }

    async fn escalate_conversation(&self, conversation_id: Uuid, escalated_by: Uuid, escalation_reason: String, target_department: Option<String>) -> CoreResult<Conversation> {
        info!("Escalating conversation {} by {} to department {:?}: {}", conversation_id, escalated_by, target_department, escalation_reason);
        // Mock implementation
        let mut metadata = ConversationMetadata::default();
        metadata.custom_fields.insert("escalation_reason".to_string(), serde_json::Value::String(escalation_reason));
        metadata.custom_fields.insert("escalated_by".to_string(), serde_json::Value::String(escalated_by.to_string()));
        if let Some(dept) = target_department {
            metadata.department = Some(dept);
        }
        
        let conversation = Conversation {
            id: conversation_id,
            platform: Platform::WhatsApp,
            platform_conversation_id: "mock_conv_id".to_string(),
            contact_id: Uuid::new_v4(),
            contact_name: "Mock Contact".to_string(),
            contact_phone: "+5511999999999".to_string(),
            status: ConversationStatus::Escalated,
            priority: ConversationPriority::Critical,
            assignment: None,
            metadata,
            created_at: Utc::now(),
            updated_at: Utc::now(),
            last_message_at: None,
            last_agent_response_at: None,
            response_time_sla: None,
            message_count: 0,
            unread_count: 0,
        };
        Ok(conversation)
    }

    async fn update_priority(&self, conversation_id: Uuid, priority: ConversationPriority, updated_by: Uuid) -> CoreResult<Conversation> {
        info!("Updating priority for conversation {} to {:?} by {}", conversation_id, priority, updated_by);
        // Mock implementation
        let conversation = Conversation {
            id: conversation_id,
            platform: Platform::WhatsApp,
            platform_conversation_id: "mock_conv_id".to_string(),
            contact_id: Uuid::new_v4(),
            contact_name: "Mock Contact".to_string(),
            contact_phone: "+5511999999999".to_string(),
            status: ConversationStatus::Open,
            priority,
            assignment: None,
            metadata: ConversationMetadata::default(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
            last_message_at: None,
            last_agent_response_at: None,
            response_time_sla: None,
            message_count: 0,
            unread_count: 0,
        };
        Ok(conversation)
    }

    async fn add_tags(&self, conversation_id: Uuid, tags: Vec<String>, added_by: Uuid) -> CoreResult<Conversation> {
        info!("Adding tags {:?} to conversation {} by {}", tags, conversation_id, added_by);
        // Mock implementation
        let mut metadata = ConversationMetadata::default();
        metadata.tags = tags;
        
        let conversation = Conversation {
            id: conversation_id,
            platform: Platform::WhatsApp,
            platform_conversation_id: "mock_conv_id".to_string(),
            contact_id: Uuid::new_v4(),
            contact_name: "Mock Contact".to_string(),
            contact_phone: "+5511999999999".to_string(),
            status: ConversationStatus::Open,
            priority: ConversationPriority::Normal,
            assignment: None,
            metadata,
            created_at: Utc::now(),
            updated_at: Utc::now(),
            last_message_at: None,
            last_agent_response_at: None,
            response_time_sla: None,
            message_count: 0,
            unread_count: 0,
        };
        Ok(conversation)
    }

    async fn remove_tags(&self, conversation_id: Uuid, tags: Vec<String>, removed_by: Uuid) -> CoreResult<Conversation> {
        info!("Removing tags {:?} from conversation {} by {}", tags, conversation_id, removed_by);
        // Mock implementation
        let conversation = Conversation {
            id: conversation_id,
            platform: Platform::WhatsApp,
            platform_conversation_id: "mock_conv_id".to_string(),
            contact_id: Uuid::new_v4(),
            contact_name: "Mock Contact".to_string(),
            contact_phone: "+5511999999999".to_string(),
            status: ConversationStatus::Open,
            priority: ConversationPriority::Normal,
            assignment: None,
            metadata: ConversationMetadata::default(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
            last_message_at: None,
            last_agent_response_at: None,
            response_time_sla: None,
            message_count: 0,
            unread_count: 0,
        };
        Ok(conversation)
    }

    async fn mark_as_read(&self, conversation_id: Uuid, agent_id: Uuid) -> CoreResult<()> {
        info!("Marking conversation {} as read by agent {}", conversation_id, agent_id);
        Ok(())
    }

    async fn mark_as_unread(&self, conversation_id: Uuid) -> CoreResult<()> {
        info!("Marking conversation {} as unread", conversation_id);
        Ok(())
    }

    async fn get_assignment_rules(&self) -> CoreResult<Vec<AssignmentRule>> {
        debug!("Getting assignment rules");
        Ok(vec![])
    }

    async fn create_assignment_rule(&self, rule: AssignmentRule) -> CoreResult<AssignmentRule> {
        info!("Creating assignment rule: {}", rule.name);
        Ok(rule)
    }

    async fn update_assignment_rule(&self, rule: AssignmentRule) -> CoreResult<AssignmentRule> {
        info!("Updating assignment rule: {}", rule.name);
        Ok(rule)
    }

    async fn delete_assignment_rule(&self, rule_id: Uuid) -> CoreResult<()> {
        info!("Deleting assignment rule: {}", rule_id);
        Ok(())
    }
}

impl Default for DefaultConversationService {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_conversation_priority_ordering() {
        assert!(ConversationPriority::Critical > ConversationPriority::High);
        assert!(ConversationPriority::High > ConversationPriority::Normal);
        assert!(ConversationPriority::Normal > ConversationPriority::Low);
    }

    #[test]
    fn test_conversation_status_allows_messages() {
        assert!(ConversationStatus::Open.allows_messages());
        assert!(ConversationStatus::Active.allows_messages());
        assert!(!ConversationStatus::Closed.allows_messages());
        assert!(!ConversationStatus::Archived.allows_messages());
    }

    #[test]
    fn test_priority_score() {
        assert_eq!(ConversationPriority::Critical.score(), 5);
        assert_eq!(ConversationPriority::Low.score(), 1);
    }

    #[test]
    fn test_default_values() {
        let priority = ConversationPriority::default();
        assert_eq!(priority, ConversationPriority::Normal);
        
        let status = ConversationStatus::default();
        assert_eq!(status, ConversationStatus::Open);
    }

    #[test]
    fn test_requires_assignment() {
        assert!(ConversationStatus::Open.requires_assignment());
        assert!(!ConversationStatus::Assigned.requires_assignment());
        assert!(!ConversationStatus::Closed.requires_assignment());
    }
}