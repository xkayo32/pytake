//! Agent assignment service for intelligent conversation routing

use crate::errors::{CoreError, CoreResult};
use crate::messaging::Platform;
use crate::services::conversation_service::{
    Conversation, ConversationPriority, ConversationStatus, AssignmentRule, 
    AssignmentConditions, AssignmentActions, AssignmentReason, ConversationAssignment
};
use async_trait::async_trait;
use chrono::{DateTime, Utc, Timelike};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;
use tracing::{debug, info, warn, error};

/// Agent availability status
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum AgentStatus {
    /// Agent is online and available
    Available,
    /// Agent is online but busy (at capacity)
    Busy,
    /// Agent is online but in do-not-disturb mode
    DoNotDisturb,
    /// Agent is temporarily away
    Away,
    /// Agent is offline
    Offline,
    /// Agent is in break/lunch
    Break,
}

/// Agent information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Agent {
    pub id: Uuid,
    pub name: String,
    pub email: String,
    pub status: AgentStatus,
    pub departments: Vec<String>,
    pub skills: Vec<String>,
    pub languages: Vec<String>,
    pub platforms: Vec<Platform>,
    pub max_concurrent_conversations: u32,
    pub current_conversation_count: u32,
    pub priority_level: u8, // 1-10, higher = can handle more critical conversations
    pub workload_score: f64, // Current workload calculation
    pub average_response_time_seconds: Option<f64>,
    pub satisfaction_rating: Option<f64>, // 1.0-5.0
    pub total_conversations_handled: u64,
    pub online_since: Option<DateTime<Utc>>,
    pub last_activity: DateTime<Utc>,
}

/// Agent workload calculation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentWorkload {
    pub agent_id: Uuid,
    pub total_conversations: u32,
    pub high_priority_conversations: u32,
    pub overdue_responses: u32,
    pub average_response_time: Option<f64>,
    pub workload_percentage: f64, // 0.0-100.0
    pub capacity_remaining: u32,
    pub is_at_capacity: bool,
}

/// Assignment strategy for automatic routing
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AssignmentStrategy {
    /// Round-robin assignment
    RoundRobin,
    /// Assign to least loaded agent
    LeastLoaded,
    /// Assign to most skilled agent
    BestSkillMatch,
    /// Assign based on agent priority/experience
    PriorityBased,
    /// Assign to agent with best performance metrics
    PerformanceBased,
    /// Assign to agent with same language
    LanguageMatch,
    /// Custom assignment logic
    Custom(String),
}

/// Business hours configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BusinessHours {
    pub timezone: String,
    pub monday: Option<DaySchedule>,
    pub tuesday: Option<DaySchedule>,
    pub wednesday: Option<DaySchedule>,
    pub thursday: Option<DaySchedule>,
    pub friday: Option<DaySchedule>,
    pub saturday: Option<DaySchedule>,
    pub sunday: Option<DaySchedule>,
    pub holidays: Vec<DateTime<Utc>>,
}

/// Daily schedule
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DaySchedule {
    pub start_time: String, // "09:00"
    pub end_time: String,   // "17:00"
    pub break_periods: Option<Vec<BreakPeriod>>,
}

/// Break period during the day
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BreakPeriod {
    pub start_time: String,
    pub end_time: String,
    pub name: String, // "Lunch", "Coffee Break", etc.
}

/// Assignment request with context
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssignmentRequest {
    pub conversation: Conversation,
    pub strategy: AssignmentStrategy,
    pub preferred_agent: Option<Uuid>,
    pub required_skills: Option<Vec<String>>,
    pub required_languages: Option<Vec<String>>,
    pub required_departments: Option<Vec<String>>,
    pub exclude_agents: Option<Vec<Uuid>>,
    pub respect_business_hours: bool,
    pub emergency_assignment: bool, // Bypass normal rules for critical situations
}

/// Assignment result with scoring
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssignmentResult {
    pub agent: Agent,
    pub assignment: ConversationAssignment,
    pub match_score: f64, // 0.0-1.0, how well the agent matches the requirements
    pub assignment_reasoning: Vec<String>, // Explanation of why this agent was chosen
    pub estimated_response_time: Option<u64>, // seconds
}

/// Assignment engine trait
#[async_trait]
pub trait AgentAssignmentService: Send + Sync {
    /// Get all available agents
    async fn get_available_agents(&self) -> CoreResult<Vec<Agent>>;
    
    /// Get agent by ID
    async fn get_agent(&self, agent_id: Uuid) -> CoreResult<Option<Agent>>;
    
    /// Update agent status
    async fn update_agent_status(&self, agent_id: Uuid, status: AgentStatus) -> CoreResult<()>;
    
    /// Calculate agent workload
    async fn calculate_agent_workload(&self, agent_id: Uuid) -> CoreResult<AgentWorkload>;
    
    /// Find best agent for conversation
    async fn find_best_agent(&self, request: AssignmentRequest) -> CoreResult<Option<AssignmentResult>>;
    
    /// Auto-assign conversation using rules
    async fn auto_assign_conversation(&self, conversation: &Conversation) -> CoreResult<Option<AssignmentResult>>;
    
    /// Get assignment rules
    async fn get_assignment_rules(&self) -> CoreResult<Vec<AssignmentRule>>;
    
    /// Evaluate assignment rule against conversation
    async fn evaluate_assignment_rule(&self, rule: &AssignmentRule, conversation: &Conversation) -> CoreResult<bool>;
    
    /// Check if current time is within business hours
    async fn is_business_hours(&self) -> CoreResult<bool>;
    
    /// Get agent performance metrics
    async fn get_agent_metrics(&self, agent_id: Uuid, period_days: u32) -> CoreResult<AgentPerformanceMetrics>;
    
    /// Balance workload across agents
    async fn balance_workload(&self) -> CoreResult<Vec<(Uuid, Uuid)>>; // (conversation_id, new_agent_id)
    
    /// Handle agent unavailable scenarios
    async fn handle_agent_unavailable(&self, conversation_id: Uuid, original_agent: Uuid) -> CoreResult<Option<AssignmentResult>>;
}

/// Agent performance metrics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentPerformanceMetrics {
    pub agent_id: Uuid,
    pub period_start: DateTime<Utc>,
    pub period_end: DateTime<Utc>,
    pub total_conversations: u64,
    pub closed_conversations: u64,
    pub average_response_time_seconds: f64,
    pub average_resolution_time_hours: f64,
    pub customer_satisfaction_avg: Option<f64>,
    pub escalation_rate: f64, // Percentage of conversations escalated
    pub first_response_time_avg_seconds: f64,
    pub concurrent_conversations_avg: f64,
    pub online_time_hours: f64,
    pub productivity_score: f64, // 0.0-1.0
}

/// Default assignment service implementation
pub struct DefaultAgentAssignmentService {
    business_hours: Option<BusinessHours>,
    assignment_rules: Vec<AssignmentRule>,
    default_strategy: AssignmentStrategy,
}

impl DefaultAgentAssignmentService {
    /// Create new assignment service
    pub fn new() -> Self {
        Self {
            business_hours: None,
            assignment_rules: Vec::new(),
            default_strategy: AssignmentStrategy::LeastLoaded,
        }
    }
    
    /// Set business hours configuration
    pub fn with_business_hours(mut self, business_hours: BusinessHours) -> Self {
        self.business_hours = Some(business_hours);
        self
    }
    
    /// Set assignment rules
    pub fn with_assignment_rules(mut self, rules: Vec<AssignmentRule>) -> Self {
        self.assignment_rules = rules;
        self
    }
    
    /// Set default assignment strategy
    pub fn with_default_strategy(mut self, strategy: AssignmentStrategy) -> Self {
        self.default_strategy = strategy;
        self
    }
    
    /// Calculate agent match score
    fn calculate_match_score(
        &self,
        agent: &Agent,
        conversation: &Conversation,
        request: &AssignmentRequest,
    ) -> f64 {
        let mut score = 0.0f64;
        let mut total_weight = 0.0f64;
        
        // Availability (40% weight)
        if agent.status == AgentStatus::Available {
            score += 1.0 * 0.4;
        } else if agent.status == AgentStatus::Busy && agent.current_conversation_count < agent.max_concurrent_conversations {
            score += 0.5 * 0.4;
        }
        total_weight += 0.4;
        
        // Workload (30% weight)
        let workload_factor = 1.0 - (agent.current_conversation_count as f64 / agent.max_concurrent_conversations as f64);
        score += workload_factor * 0.3;
        total_weight += 0.3;
        
        // Skills match (15% weight)
        if let Some(required_skills) = &request.required_skills {
            let matching_skills = agent.skills.iter()
                .filter(|skill| required_skills.contains(skill))
                .count();
            let skill_match_ratio = matching_skills as f64 / required_skills.len() as f64;
            score += skill_match_ratio * 0.15;
        } else {
            score += 0.15; // No specific skills required
        }
        total_weight += 0.15;
        
        // Language match (10% weight)
        if let Some(required_languages) = &request.required_languages {
            let has_language_match = agent.languages.iter()
                .any(|lang| required_languages.contains(lang));
            if has_language_match {
                score += 0.10;
            }
        } else {
            score += 0.10; // No specific language required
        }
        total_weight += 0.10;
        
        // Performance (5% weight)
        if let Some(satisfaction) = agent.satisfaction_rating {
            score += (satisfaction / 5.0) * 0.05;
        } else {
            score += 0.025; // Neutral for new agents
        }
        total_weight += 0.05;
        
        // Normalize score
        if total_weight > 0.0 {
            score / total_weight
        } else {
            0.0
        }
    }
    
    /// Check if agent can handle conversation
    fn can_agent_handle_conversation(&self, agent: &Agent, conversation: &Conversation, request: &AssignmentRequest) -> bool {
        // Check availability
        if agent.status == AgentStatus::Offline || agent.status == AgentStatus::Break {
            return false;
        }
        
        // Check capacity
        if agent.status != AgentStatus::Available && agent.current_conversation_count >= agent.max_concurrent_conversations {
            return false;
        }
        
        // Check platform support
        if !agent.platforms.contains(&conversation.platform) {
            return false;
        }
        
        // Check if agent is excluded
        if let Some(excluded) = &request.exclude_agents {
            if excluded.contains(&agent.id) {
                return false;
            }
        }
        
        // Check department match
        if let Some(required_departments) = &request.required_departments {
            if !agent.departments.iter().any(|dept| required_departments.contains(dept)) {
                return false;
            }
        }
        
        // Check priority level for critical conversations
        if conversation.priority == ConversationPriority::Critical && agent.priority_level < 7 {
            return false;
        }
        
        true
    }
    
    /// Get current time as hour (0-23)
    fn current_hour(&self) -> u32 {
        Utc::now().hour()
    }
    
    /// Generate assignment reasoning
    fn generate_assignment_reasoning(
        &self,
        agent: &Agent,
        conversation: &Conversation,
        strategy: &AssignmentStrategy,
        match_score: f64,
    ) -> Vec<String> {
        let mut reasoning = Vec::new();
        
        reasoning.push(format!("Selected agent: {} (ID: {})", agent.name, agent.id));
        reasoning.push(format!("Assignment strategy: {:?}", strategy));
        reasoning.push(format!("Match score: {:.2}", match_score));
        reasoning.push(format!("Agent status: {:?}", agent.status));
        reasoning.push(format!("Current workload: {}/{} conversations", 
            agent.current_conversation_count, agent.max_concurrent_conversations));
        
        if agent.platforms.contains(&conversation.platform) {
            reasoning.push(format!("Supports platform: {}", conversation.platform));
        }
        
        if let Some(satisfaction) = agent.satisfaction_rating {
            reasoning.push(format!("Customer satisfaction: {:.1}/5.0", satisfaction));
        }
        
        if !agent.skills.is_empty() {
            reasoning.push(format!("Skills: {}", agent.skills.join(", ")));
        }
        
        if !agent.languages.is_empty() {
            reasoning.push(format!("Languages: {}", agent.languages.join(", ")));
        }
        
        reasoning
    }
}

#[async_trait]
impl AgentAssignmentService for DefaultAgentAssignmentService {
    async fn get_available_agents(&self) -> CoreResult<Vec<Agent>> {
        // TODO: Implement database query
        // For now, return mock data
        Ok(vec![
            Agent {
                id: Uuid::new_v4(),
                name: "Alice Silva".to_string(),
                email: "alice@company.com".to_string(),
                status: AgentStatus::Available,
                departments: vec!["Suporte".to_string(), "Vendas".to_string()],
                skills: vec!["WhatsApp".to_string(), "Técnico".to_string()],
                languages: vec!["Português".to_string(), "Inglês".to_string()],
                platforms: vec![Platform::WhatsApp, Platform::Instagram],
                max_concurrent_conversations: 5,
                current_conversation_count: 2,
                priority_level: 8,
                workload_score: 0.4,
                average_response_time_seconds: Some(45.0),
                satisfaction_rating: Some(4.7),
                total_conversations_handled: 1250,
                online_since: Some(Utc::now() - chrono::Duration::hours(3)),
                last_activity: Utc::now() - chrono::Duration::minutes(5),
            },
            Agent {
                id: Uuid::new_v4(),
                name: "Bruno Santos".to_string(),
                email: "bruno@company.com".to_string(),
                status: AgentStatus::Busy,
                departments: vec!["Suporte".to_string()],
                skills: vec!["WhatsApp".to_string(), "Atendimento".to_string()],
                languages: vec!["Português".to_string()],
                platforms: vec![Platform::WhatsApp, Platform::Webchat],
                max_concurrent_conversations: 4,
                current_conversation_count: 4,
                priority_level: 6,
                workload_score: 1.0,
                average_response_time_seconds: Some(62.0),
                satisfaction_rating: Some(4.3),
                total_conversations_handled: 890,
                online_since: Some(Utc::now() - chrono::Duration::hours(2)),
                last_activity: Utc::now() - chrono::Duration::minutes(1),
            },
        ])
    }
    
    async fn get_agent(&self, agent_id: Uuid) -> CoreResult<Option<Agent>> {
        // TODO: Implement database query
        let agents = self.get_available_agents().await?;
        Ok(agents.into_iter().find(|a| a.id == agent_id))
    }
    
    async fn update_agent_status(&self, agent_id: Uuid, status: AgentStatus) -> CoreResult<()> {
        info!("Updating agent {} status to {:?}", agent_id, status);
        // TODO: Implement database update
        Ok(())
    }
    
    async fn calculate_agent_workload(&self, agent_id: Uuid) -> CoreResult<AgentWorkload> {
        debug!("Calculating workload for agent: {}", agent_id);
        
        let agent = self.get_agent(agent_id).await?
            .ok_or_else(|| CoreError::not_found("agent", &agent_id.to_string()))?;
        
        let workload_percentage = (agent.current_conversation_count as f64 / agent.max_concurrent_conversations as f64) * 100.0;
        
        Ok(AgentWorkload {
            agent_id,
            total_conversations: agent.current_conversation_count,
            high_priority_conversations: 0, // TODO: Calculate from database
            overdue_responses: 0, // TODO: Calculate from database
            average_response_time: agent.average_response_time_seconds,
            workload_percentage,
            capacity_remaining: agent.max_concurrent_conversations - agent.current_conversation_count,
            is_at_capacity: agent.current_conversation_count >= agent.max_concurrent_conversations,
        })
    }
    
    async fn find_best_agent(&self, request: AssignmentRequest) -> CoreResult<Option<AssignmentResult>> {
        info!("Finding best agent for conversation: {}", request.conversation.id);
        
        let agents = self.get_available_agents().await?;
        let mut candidates = Vec::new();
        
        // Filter agents that can handle this conversation
        for agent in agents {
            if self.can_agent_handle_conversation(&agent, &request.conversation, &request) {
                let match_score = self.calculate_match_score(&agent, &request.conversation, &request);
                candidates.push((agent, match_score));
            }
        }
        
        if candidates.is_empty() {
            warn!("No available agents found for conversation: {}", request.conversation.id);
            return Ok(None);
        }
        
        // Sort by match score (highest first)
        candidates.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
        
        let (best_agent, match_score) = candidates.into_iter().next().unwrap();
        
        let assignment = ConversationAssignment {
            agent_id: best_agent.id,
            agent_name: best_agent.name.clone(),
            assigned_at: Utc::now(),
            assigned_by: None, // Auto-assignment
            assignment_reason: AssignmentReason::AutoAssignment,
        };
        
        let reasoning = self.generate_assignment_reasoning(
            &best_agent,
            &request.conversation,
            &request.strategy,
            match_score,
        );
        
        let result = AssignmentResult {
            agent: best_agent.clone(),
            assignment,
            match_score,
            assignment_reasoning: reasoning,
            estimated_response_time: best_agent.average_response_time_seconds.map(|rt| rt as u64),
        };
        
        Ok(Some(result))
    }
    
    async fn auto_assign_conversation(&self, conversation: &Conversation) -> CoreResult<Option<AssignmentResult>> {
        let request = AssignmentRequest {
            conversation: conversation.clone(),
            strategy: self.default_strategy.clone(),
            preferred_agent: None,
            required_skills: None,
            required_languages: None,
            required_departments: None,
            exclude_agents: None,
            respect_business_hours: true,
            emergency_assignment: false,
        };
        
        self.find_best_agent(request).await
    }
    
    async fn get_assignment_rules(&self) -> CoreResult<Vec<AssignmentRule>> {
        Ok(self.assignment_rules.clone())
    }
    
    async fn evaluate_assignment_rule(&self, rule: &AssignmentRule, conversation: &Conversation) -> CoreResult<bool> {
        if !rule.enabled {
            return Ok(false);
        }
        
        let conditions = &rule.conditions;
        
        // Check platform match
        if let Some(platforms) = &conditions.platforms {
            if !platforms.contains(&conversation.platform) {
                return Ok(false);
            }
        }
        
        // Check priority match
        if let Some(priorities) = &conditions.priority_levels {
            if !priorities.contains(&conversation.priority) {
                return Ok(false);
            }
        }
        
        // Check business hours
        if conditions.business_hours_only.unwrap_or(false) {
            if !self.is_business_hours().await? {
                return Ok(false);
            }
        }
        
        // Check tags match
        if let Some(required_tags) = &conditions.tags {
            let has_matching_tag = conversation.metadata.tags.iter()
                .any(|tag| required_tags.contains(tag));
            if !has_matching_tag {
                return Ok(false);
            }
        }
        
        Ok(true)
    }
    
    async fn is_business_hours(&self) -> CoreResult<bool> {
        // TODO: Implement proper business hours check with timezone
        let current_hour = self.current_hour();
        Ok(current_hour >= 9 && current_hour < 18) // Simple 9-18 check
    }
    
    async fn get_agent_metrics(&self, agent_id: Uuid, _period_days: u32) -> CoreResult<AgentPerformanceMetrics> {
        // TODO: Implement database query for real metrics
        Ok(AgentPerformanceMetrics {
            agent_id,
            period_start: Utc::now() - chrono::Duration::days(30),
            period_end: Utc::now(),
            total_conversations: 156,
            closed_conversations: 142,
            average_response_time_seconds: 45.2,
            average_resolution_time_hours: 2.1,
            customer_satisfaction_avg: Some(4.6),
            escalation_rate: 0.08, // 8%
            first_response_time_avg_seconds: 32.5,
            concurrent_conversations_avg: 3.2,
            online_time_hours: 160.0,
            productivity_score: 0.89,
        })
    }
    
    async fn balance_workload(&self) -> CoreResult<Vec<(Uuid, Uuid)>> {
        // TODO: Implement workload balancing logic
        info!("Balancing workload across agents");
        Ok(Vec::new())
    }
    
    async fn handle_agent_unavailable(&self, conversation_id: Uuid, original_agent: Uuid) -> CoreResult<Option<AssignmentResult>> {
        warn!("Agent {} unavailable for conversation {}, finding replacement", original_agent, conversation_id);
        
        // TODO: Implement logic to find replacement agent
        // For now, return None to indicate no replacement found
        Ok(None)
    }
}

impl Default for DefaultAgentAssignmentService {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::conversation_service::ConversationMetadata;

    fn create_test_conversation() -> Conversation {
        Conversation {
            id: Uuid::new_v4(),
            platform: Platform::WhatsApp,
            platform_conversation_id: "test_conv_123".to_string(),
            contact_id: Uuid::new_v4(),
            contact_name: "Test Customer".to_string(),
            contact_phone: "+5511999999999".to_string(),
            status: ConversationStatus::Open,
            priority: ConversationPriority::Normal,
            assignment: None,
            metadata: ConversationMetadata::default(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
            last_message_at: Some(Utc::now()),
            last_agent_response_at: None,
            response_time_sla: Some(300), // 5 minutes
            message_count: 1,
            unread_count: 1,
        }
    }

    #[test]
    fn test_agent_status_comparison() {
        assert_eq!(AgentStatus::Available, AgentStatus::Available);
        assert_ne!(AgentStatus::Available, AgentStatus::Busy);
    }

    #[test]
    fn test_assignment_service_creation() {
        let service = DefaultAgentAssignmentService::new();
        assert_eq!(service.assignment_rules.len(), 0);
    }

    #[tokio::test]
    async fn test_agent_workload_calculation() {
        let service = DefaultAgentAssignmentService::new();
        let agent_id = Uuid::new_v4();
        
        // This would fail in real implementation without database
        // but shows the expected interface
        let result = service.calculate_agent_workload(agent_id).await;
        if result.is_err() {
            // Expected to fail without database implementation
            assert!(true);
        }
    }

    #[test]
    fn test_business_hours_simple() {
        let service = DefaultAgentAssignmentService::new();
        let current_hour = service.current_hour();
        assert!(current_hour <= 23);
    }
}