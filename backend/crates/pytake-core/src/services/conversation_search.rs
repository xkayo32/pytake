//! Advanced conversation search and filtering service

use crate::errors::{CoreError, CoreResult};
use crate::messaging::Platform;
use crate::services::conversation_service::{
    Conversation, ConversationStatus, ConversationPriority, ConversationFilters,
    ConversationSearchOptions, ConversationPage, ConversationSortBy, SortOrder,
};
use async_trait::async_trait;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;
use tracing::{debug, info, warn};

/// Advanced search filters for conversations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AdvancedConversationFilters {
    /// Basic filters
    pub basic: ConversationFilters,
    
    /// Message content search
    pub message_content: Option<String>,
    
    /// Contact information search
    pub contact_info: Option<ContactSearchFilter>,
    
    /// Time-based filters
    pub time_filters: Option<TimeFilters>,
    
    /// Agent performance filters
    pub agent_filters: Option<AgentFilters>,
    
    /// Message count filters
    pub message_count: Option<CountRange>,
    
    /// Response time filters (SLA compliance)
    pub response_time: Option<ResponseTimeFilters>,
    
    /// Custom field filters
    pub custom_fields: Option<HashMap<String, CustomFieldFilter>>,
    
    /// Conversation flow state
    pub flow_state: Option<FlowStateFilter>,
}

/// Contact search filter
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContactSearchFilter {
    pub name: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub location: Option<String>,
    pub customer_segment: Option<String>,
}

/// Time-based filters
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimeFilters {
    pub created_between: Option<DateRange>,
    pub last_message_between: Option<DateRange>,
    pub last_agent_response_between: Option<DateRange>,
    pub inactive_for_hours: Option<u32>,
    pub active_in_last_hours: Option<u32>,
}

/// Date range filter
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DateRange {
    pub start: DateTime<Utc>,
    pub end: DateTime<Utc>,
}

/// Agent performance filters
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentFilters {
    pub response_time_avg: Option<CountRange>,
    pub satisfaction_rating: Option<f64>,
    pub assigned_agent_department: Option<String>,
    pub assigned_agent_skills: Option<Vec<String>>,
    pub reassignment_count: Option<CountRange>,
}

/// Count range filter
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CountRange {
    pub min: Option<u32>,
    pub max: Option<u32>,
}

/// Response time filters
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResponseTimeFilters {
    pub within_sla: Option<bool>,
    pub overdue_by_minutes: Option<u32>,
    pub average_response_time: Option<CountRange>, // in seconds
    pub first_response_time: Option<CountRange>, // in seconds
}

/// Custom field filter
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum CustomFieldFilter {
    Equals(serde_json::Value),
    Contains(String),
    GreaterThan(f64),
    LessThan(f64),
    InRange { min: f64, max: f64 },
    IsNull,
    IsNotNull,
}

/// Flow state filter
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FlowStateFilter {
    pub active_flow_id: Option<String>,
    pub completed_flows: Option<Vec<String>>,
    pub flow_step: Option<String>,
    pub flow_completion_rate: Option<f64>,
}

/// Search result with highlighting
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConversationSearchResult {
    pub conversation: Conversation,
    pub relevance_score: f64,
    pub highlights: Vec<SearchHighlight>,
    pub matched_fields: Vec<String>,
}

/// Search highlight information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchHighlight {
    pub field: String,
    pub fragment: String,
    pub start_pos: usize,
    pub end_pos: usize,
}

/// Paginated search results with facets
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConversationSearchPage {
    pub results: Vec<ConversationSearchResult>,
    pub total_count: u64,
    pub page: u32,
    pub page_size: u32,
    pub total_pages: u32,
    pub has_next: bool,
    pub has_previous: bool,
    pub facets: SearchFacets,
    pub query_stats: QueryStats,
}

/// Search facets for filtering refinement
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchFacets {
    pub status: HashMap<ConversationStatus, u64>,
    pub priority: HashMap<ConversationPriority, u64>,
    pub platform: HashMap<Platform, u64>,
    pub departments: HashMap<String, u64>,
    pub agents: HashMap<String, u64>, // agent_name -> count
    pub tags: HashMap<String, u64>,
    pub time_ranges: HashMap<String, u64>, // "last_hour", "last_day", etc.
}

/// Query performance statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryStats {
    pub query_time_ms: u64,
    pub total_documents: u64,
    pub filtered_documents: u64,
    pub index_usage: Vec<String>,
}

/// Saved search configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SavedSearch {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub filters: AdvancedConversationFilters,
    pub sort_options: ConversationSearchOptions,
    pub created_by: Uuid,
    pub created_at: DateTime<Utc>,
    pub is_shared: bool,
    pub usage_count: u64,
    pub last_used_at: Option<DateTime<Utc>>,
}

/// Auto-complete suggestion
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchSuggestion {
    pub text: String,
    pub category: SearchSuggestionCategory,
    pub count: u64,
}

/// Search suggestion categories
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SearchSuggestionCategory {
    Contact,
    Agent,
    Tag,
    Department,
    MessageContent,
    CustomField,
}

/// Conversation search service trait
#[async_trait]
pub trait ConversationSearchService: Send + Sync {
    /// Advanced search with filters and facets
    async fn advanced_search(&self, filters: AdvancedConversationFilters, options: ConversationSearchOptions) -> CoreResult<ConversationSearchPage>;
    
    /// Full-text search across conversation content
    async fn full_text_search(&self, query: &str, filters: Option<ConversationFilters>, options: ConversationSearchOptions) -> CoreResult<ConversationSearchPage>;
    
    /// Search by contact information
    async fn search_by_contact(&self, contact_filter: ContactSearchFilter, options: ConversationSearchOptions) -> CoreResult<ConversationSearchPage>;
    
    /// Search conversations by message content
    async fn search_by_message_content(&self, content: &str, platform: Option<Platform>, options: ConversationSearchOptions) -> CoreResult<ConversationSearchPage>;
    
    /// Get search suggestions for auto-complete
    async fn get_search_suggestions(&self, partial_query: &str, category: Option<SearchSuggestionCategory>) -> CoreResult<Vec<SearchSuggestion>>;
    
    /// Save search configuration
    async fn save_search(&self, name: String, filters: AdvancedConversationFilters, options: ConversationSearchOptions, created_by: Uuid) -> CoreResult<SavedSearch>;
    
    /// Get saved searches for user
    async fn get_saved_searches(&self, user_id: Uuid, include_shared: bool) -> CoreResult<Vec<SavedSearch>>;
    
    /// Execute saved search
    async fn execute_saved_search(&self, search_id: Uuid, override_options: Option<ConversationSearchOptions>) -> CoreResult<ConversationSearchPage>;
    
    /// Delete saved search
    async fn delete_saved_search(&self, search_id: Uuid, user_id: Uuid) -> CoreResult<()>;
    
    /// Get search facets for filter refinement
    async fn get_search_facets(&self, base_filters: Option<ConversationFilters>) -> CoreResult<SearchFacets>;
    
    /// Build search index for conversations
    async fn rebuild_search_index(&self) -> CoreResult<u64>; // returns number of indexed conversations
    
    /// Get search analytics
    async fn get_search_analytics(&self, date_range: DateRange) -> CoreResult<SearchAnalytics>;
}

/// Search analytics data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchAnalytics {
    pub total_searches: u64,
    pub unique_users: u64,
    pub most_common_filters: HashMap<String, u64>,
    pub average_query_time_ms: f64,
    pub most_used_saved_searches: Vec<(String, u64)>,
    pub search_success_rate: f64, // % of searches that returned results
}

/// Default implementation of conversation search service
pub struct DefaultConversationSearchService {
    // In a real implementation, this would have search engine connections (Elasticsearch, etc.)
    conversations: std::sync::RwLock<HashMap<Uuid, Conversation>>,
    saved_searches: std::sync::RwLock<HashMap<Uuid, SavedSearch>>,
}

impl DefaultConversationSearchService {
    pub fn new() -> Self {
        Self {
            conversations: std::sync::RwLock::new(HashMap::new()),
            saved_searches: std::sync::RwLock::new(HashMap::new()),
        }
    }
    
    pub fn with_sample_conversations(mut self) -> Self {
        let mut conversations = HashMap::new();
        
        // Create sample conversations for testing
        for i in 1..=50 {
            let conversation = Conversation {
                id: Uuid::new_v4(),
                platform: match i % 3 {
                    0 => Platform::WhatsApp,
                    1 => Platform::Instagram,
                    _ => Platform::Webchat,
                },
                platform_conversation_id: format!("conv_{}", i),
                contact_id: Uuid::new_v4(),
                contact_name: format!("Cliente {}", i),
                contact_phone: format!("+551199999{:04}", i),
                status: match i % 5 {
                    0 => ConversationStatus::Open,
                    1 => ConversationStatus::Assigned,
                    2 => ConversationStatus::Active,
                    3 => ConversationStatus::Pending,
                    _ => ConversationStatus::Closed,
                },
                priority: match i % 4 {
                    0 => ConversationPriority::Low,
                    1 => ConversationPriority::Normal,
                    2 => ConversationPriority::High,
                    _ => ConversationPriority::Urgent,
                },
                assignment: if i % 3 == 0 {
                    Some(crate::services::conversation_service::ConversationAssignment {
                        agent_id: Uuid::new_v4(),
                        agent_name: format!("Agente {}", i % 5 + 1),
                        assigned_at: Utc::now() - chrono::Duration::hours(i as i64 % 24),
                        assigned_by: Some(Uuid::new_v4()),
                        assignment_reason: crate::services::conversation_service::AssignmentReason::AutoAssignment,
                    })
                } else {
                    None
                },
                metadata: crate::services::conversation_service::ConversationMetadata {
                    tags: vec![
                        format!("tag_{}", i % 5),
                        if i % 2 == 0 { "support".to_string() } else { "sales".to_string() },
                    ],
                    department: Some(if i % 3 == 0 { "Suporte".to_string() } else { "Vendas".to_string() }),
                    category: Some(format!("categoria_{}", i % 3)),
                    language: Some("pt-BR".to_string()),
                    customer_segment: Some(if i % 2 == 0 { "premium".to_string() } else { "standard".to_string() }),
                    custom_fields: HashMap::new(),
                },
                created_at: Utc::now() - chrono::Duration::days(i as i64 % 30),
                updated_at: Utc::now() - chrono::Duration::hours(i as i64 % 48),
                last_message_at: Some(Utc::now() - chrono::Duration::minutes(i as i64 % 120)),
                last_agent_response_at: if i % 3 == 0 {
                    Some(Utc::now() - chrono::Duration::minutes(i as i64 % 60))
                } else {
                    None
                },
                response_time_sla: Some(300), // 5 minutes
                message_count: (i % 20) + 1,
                unread_count: i % 5,
            };
            
            conversations.insert(conversation.id, conversation);
        }
        
        self.conversations = std::sync::RwLock::new(conversations);
        self
    }
    
    /// Apply basic filters to conversations
    fn apply_basic_filters<'a>(&self, conversations: &[&'a Conversation], filters: &ConversationFilters) -> Vec<&'a Conversation> {
        let mut filtered: Vec<&'a Conversation> = conversations.to_vec();
        
        if let Some(statuses) = &filters.status {
            filtered.retain(|c| statuses.contains(&c.status));
        }
        
        if let Some(priorities) = &filters.priority {
            filtered.retain(|c| priorities.contains(&c.priority));
        }
        
        if let Some(platforms) = &filters.platform {
            filtered.retain(|c| platforms.contains(&c.platform));
        }
        
        if let Some(agent_id) = &filters.assigned_agent {
            filtered.retain(|c| {
                c.assignment.as_ref().map_or(false, |a| a.agent_id == *agent_id)
            });
        }
        
        if let Some(department) = &filters.department {
            filtered.retain(|c| {
                c.metadata.department.as_ref().map_or(false, |d| d == department)
            });
        }
        
        if let Some(tags) = &filters.tags {
            filtered.retain(|c| {
                tags.iter().any(|tag| c.metadata.tags.contains(tag))
            });
        }
        
        if let Some(created_after) = &filters.created_after {
            filtered.retain(|c| c.created_at >= *created_after);
        }
        
        if let Some(created_before) = &filters.created_before {
            filtered.retain(|c| c.created_at <= *created_before);
        }
        
        if let Some(has_unread) = filters.has_unread {
            if has_unread {
                filtered.retain(|c| c.unread_count > 0);
            } else {
                filtered.retain(|c| c.unread_count == 0);
            }
        }
        
        if let Some(search_text) = &filters.search_text {
            let search_lower = search_text.to_lowercase();
            filtered.retain(|c| {
                c.contact_name.to_lowercase().contains(&search_lower) ||
                c.contact_phone.contains(search_text) ||
                c.metadata.tags.iter().any(|tag| tag.to_lowercase().contains(&search_lower))
            });
        }
        
        filtered
    }
    
    /// Apply advanced filters
    fn apply_advanced_filters<'a>(&self, conversations: &[&'a Conversation], filters: &AdvancedConversationFilters) -> Vec<&'a Conversation> {
        let mut filtered = self.apply_basic_filters(conversations, &filters.basic);
        
        // Apply contact filters
        if let Some(contact_filter) = &filters.contact_info {
            if let Some(name) = &contact_filter.name {
                let name_lower = name.to_lowercase();
                filtered.retain(|c| c.contact_name.to_lowercase().contains(&name_lower));
            }
            
            if let Some(phone) = &contact_filter.phone {
                filtered.retain(|c| c.contact_phone.contains(phone));
            }
            
            if let Some(segment) = &contact_filter.customer_segment {
                filtered.retain(|c| {
                    c.metadata.customer_segment.as_ref().map_or(false, |s| s == segment)
                });
            }
        }
        
        // Apply time filters
        if let Some(time_filters) = &filters.time_filters {
            if let Some(inactive_hours) = time_filters.inactive_for_hours {
                let threshold = Utc::now() - chrono::Duration::hours(inactive_hours as i64);
                filtered.retain(|c| {
                    c.last_message_at.map_or(true, |t| t < threshold)
                });
            }
            
            if let Some(active_hours) = time_filters.active_in_last_hours {
                let threshold = Utc::now() - chrono::Duration::hours(active_hours as i64);
                filtered.retain(|c| {
                    c.last_message_at.map_or(false, |t| t >= threshold)
                });
            }
        }
        
        // Apply message count filters
        if let Some(count_range) = &filters.message_count {
            if let Some(min) = count_range.min {
                filtered.retain(|c| c.message_count >= min);
            }
            
            if let Some(max) = count_range.max {
                filtered.retain(|c| c.message_count <= max);
            }
        }
        
        filtered
    }
    
    /// Calculate relevance score for search results
    fn calculate_relevance_score(&self, conversation: &Conversation, query: &str) -> f64 {
        let mut score = 0.0;
        let query_lower = query.to_lowercase();
        
        // Contact name match (high weight)
        if conversation.contact_name.to_lowercase().contains(&query_lower) {
            score += 1.0;
        }
        
        // Phone number match (high weight)
        if conversation.contact_phone.contains(query) {
            score += 1.0;
        }
        
        // Tag matches (medium weight)
        for tag in &conversation.metadata.tags {
            if tag.to_lowercase().contains(&query_lower) {
                score += 0.5;
            }
        }
        
        // Department match (medium weight)
        if let Some(department) = &conversation.metadata.department {
            if department.to_lowercase().contains(&query_lower) {
                score += 0.5;
            }
        }
        
        // Priority boost for high priority conversations
        score += match conversation.priority {
            ConversationPriority::Critical => 0.3,
            ConversationPriority::Urgent => 0.2,
            ConversationPriority::High => 0.1,
            _ => 0.0,
        };
        
        // Recency boost for recent conversations
        let hours_since_update = (Utc::now() - conversation.updated_at).num_hours();
        if hours_since_update < 24 {
            score += 0.2;
        } else if hours_since_update < 72 {
            score += 0.1;
        }
        
        score
    }
    
    /// Generate search facets
    fn generate_facets(&self, conversations: &[&Conversation]) -> SearchFacets {
        let mut status_facets = HashMap::new();
        let mut priority_facets = HashMap::new();
        let mut platform_facets = HashMap::new();
        let mut department_facets = HashMap::new();
        let mut agent_facets = HashMap::new();
        let mut tag_facets = HashMap::new();
        
        for conversation in conversations {
            *status_facets.entry(conversation.status.clone()).or_insert(0) += 1;
            *priority_facets.entry(conversation.priority.clone()).or_insert(0) += 1;
            *platform_facets.entry(conversation.platform.clone()).or_insert(0) += 1;
            
            if let Some(department) = &conversation.metadata.department {
                *department_facets.entry(department.clone()).or_insert(0) += 1;
            }
            
            if let Some(assignment) = &conversation.assignment {
                *agent_facets.entry(assignment.agent_name.clone()).or_insert(0) += 1;
            }
            
            for tag in &conversation.metadata.tags {
                *tag_facets.entry(tag.clone()).or_insert(0) += 1;
            }
        }
        
        let mut time_ranges = HashMap::new();
        let now = Utc::now();
        
        // Calculate time range facets
        for conversation in conversations {
            if let Some(last_msg) = conversation.last_message_at {
                let hours_ago = (now - last_msg).num_hours();
                
                if hours_ago < 1 {
                    *time_ranges.entry("last_hour".to_string()).or_insert(0) += 1;
                } else if hours_ago < 24 {
                    *time_ranges.entry("last_day".to_string()).or_insert(0) += 1;
                } else if hours_ago < 168 {
                    *time_ranges.entry("last_week".to_string()).or_insert(0) += 1;
                } else {
                    *time_ranges.entry("older".to_string()).or_insert(0) += 1;
                }
            }
        }
        
        SearchFacets {
            status: status_facets,
            priority: priority_facets,
            platform: platform_facets,
            departments: department_facets,
            agents: agent_facets,
            tags: tag_facets,
            time_ranges,
        }
    }
}

impl Default for DefaultConversationSearchService {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl ConversationSearchService for DefaultConversationSearchService {
    async fn advanced_search(&self, filters: AdvancedConversationFilters, options: ConversationSearchOptions) -> CoreResult<ConversationSearchPage> {
        let start_time = std::time::Instant::now();
        
        let conversations = self.conversations.read().unwrap();
        let all_conversations: Vec<&Conversation> = conversations.values().collect();
        
        let filtered_conversations = self.apply_advanced_filters(&all_conversations, &filters);
        
        // Apply sorting
        let mut sorted_conversations = filtered_conversations.clone();
        sorted_conversations.sort_by(|a, b| {
            use std::cmp::Ordering;
            let ordering = match options.sort_by {
                ConversationSortBy::CreatedAt => a.created_at.cmp(&b.created_at),
                ConversationSortBy::UpdatedAt => a.updated_at.cmp(&b.updated_at),
                ConversationSortBy::LastMessageAt => {
                    match (&a.last_message_at, &b.last_message_at) {
                        (Some(a_time), Some(b_time)) => a_time.cmp(b_time),
                        (Some(_), None) => Ordering::Greater,
                        (None, Some(_)) => Ordering::Less,
                        (None, None) => Ordering::Equal,
                    }
                }
                ConversationSortBy::Priority => a.priority.cmp(&b.priority),
                ConversationSortBy::Status => format!("{:?}", a.status).cmp(&format!("{:?}", b.status)),
                ConversationSortBy::ContactName => a.contact_name.cmp(&b.contact_name),
                ConversationSortBy::MessageCount => a.message_count.cmp(&b.message_count),
                ConversationSortBy::ResponseTime => {
                    // Simple response time estimation based on last agent response
                    let a_response_time = a.last_agent_response_at.map_or(0, |t| (Utc::now() - t).num_seconds());
                    let b_response_time = b.last_agent_response_at.map_or(0, |t| (Utc::now() - t).num_seconds());
                    a_response_time.cmp(&b_response_time)
                }
            };
            
            match options.sort_order {
                SortOrder::Asc => ordering,
                SortOrder::Desc => ordering.reverse(),
            }
        });
        
        let total_count = sorted_conversations.len() as u64;
        let total_pages = ((total_count as f64) / (options.page_size as f64)).ceil() as u32;
        
        // Apply pagination
        let start_idx = ((options.page - 1) * options.page_size) as usize;
        let end_idx = (start_idx + options.page_size as usize).min(sorted_conversations.len());
        
        let page_conversations = &sorted_conversations[start_idx..end_idx];
        
        // Generate search results with relevance scoring
        let results: Vec<ConversationSearchResult> = page_conversations
            .iter()
            .map(|c| ConversationSearchResult {
                conversation: (*c).clone(),
                relevance_score: 1.0, // TODO: Implement proper relevance scoring
                highlights: vec![], // TODO: Implement highlighting
                matched_fields: vec![], // TODO: Track which fields matched
            })
            .collect();
        
        let facets = self.generate_facets(&filtered_conversations);
        
        let query_time = start_time.elapsed().as_millis() as u64;
        
        Ok(ConversationSearchPage {
            results,
            total_count,
            page: options.page,
            page_size: options.page_size,
            total_pages,
            has_next: options.page < total_pages,
            has_previous: options.page > 1,
            facets,
            query_stats: QueryStats {
                query_time_ms: query_time,
                total_documents: conversations.len() as u64,
                filtered_documents: total_count,
                index_usage: vec!["memory_search".to_string()],
            },
        })
    }
    
    async fn full_text_search(&self, query: &str, filters: Option<ConversationFilters>, options: ConversationSearchOptions) -> CoreResult<ConversationSearchPage> {
        info!("Performing full-text search: {}", query);
        
        let advanced_filters = AdvancedConversationFilters {
            basic: filters.unwrap_or_default(),
            message_content: Some(query.to_string()),
            contact_info: None,
            time_filters: None,
            agent_filters: None,
            message_count: None,
            response_time: None,
            custom_fields: None,
            flow_state: None,
        };
        
        self.advanced_search(advanced_filters, options).await
    }
    
    async fn search_by_contact(&self, contact_filter: ContactSearchFilter, options: ConversationSearchOptions) -> CoreResult<ConversationSearchPage> {
        let advanced_filters = AdvancedConversationFilters {
            basic: ConversationFilters::default(),
            message_content: None,
            contact_info: Some(contact_filter),
            time_filters: None,
            agent_filters: None,
            message_count: None,
            response_time: None,
            custom_fields: None,
            flow_state: None,
        };
        
        self.advanced_search(advanced_filters, options).await
    }
    
    async fn search_by_message_content(&self, content: &str, platform: Option<Platform>, options: ConversationSearchOptions) -> CoreResult<ConversationSearchPage> {
        let mut basic_filters = ConversationFilters::default();
        if let Some(p) = platform {
            basic_filters.platform = Some(vec![p]);
        }
        
        let advanced_filters = AdvancedConversationFilters {
            basic: basic_filters,
            message_content: Some(content.to_string()),
            contact_info: None,
            time_filters: None,
            agent_filters: None,
            message_count: None,
            response_time: None,
            custom_fields: None,
            flow_state: None,
        };
        
        self.advanced_search(advanced_filters, options).await
    }
    
    async fn get_search_suggestions(&self, partial_query: &str, _category: Option<SearchSuggestionCategory>) -> CoreResult<Vec<SearchSuggestion>> {
        let conversations = self.conversations.read().unwrap();
        let mut suggestions = Vec::new();
        let query_lower = partial_query.to_lowercase();
        
        // Collect suggestions from contact names
        for conversation in conversations.values() {
            if conversation.contact_name.to_lowercase().contains(&query_lower) {
                suggestions.push(SearchSuggestion {
                    text: conversation.contact_name.clone(),
                    category: SearchSuggestionCategory::Contact,
                    count: 1,
                });
            }
        }
        
        // Deduplicate and limit suggestions
        suggestions.sort_by(|a, b| a.text.cmp(&b.text));
        suggestions.dedup_by(|a, b| a.text == b.text);
        suggestions.truncate(10);
        
        Ok(suggestions)
    }
    
    async fn save_search(&self, name: String, filters: AdvancedConversationFilters, options: ConversationSearchOptions, created_by: Uuid) -> CoreResult<SavedSearch> {
        let saved_search = SavedSearch {
            id: Uuid::new_v4(),
            name,
            description: None,
            filters,
            sort_options: options,
            created_by,
            created_at: Utc::now(),
            is_shared: false,
            usage_count: 0,
            last_used_at: None,
        };
        
        let mut saved_searches = self.saved_searches.write().unwrap();
        saved_searches.insert(saved_search.id, saved_search.clone());
        
        Ok(saved_search)
    }
    
    async fn get_saved_searches(&self, user_id: Uuid, include_shared: bool) -> CoreResult<Vec<SavedSearch>> {
        let saved_searches = self.saved_searches.read().unwrap();
        
        let results: Vec<SavedSearch> = saved_searches
            .values()
            .filter(|s| s.created_by == user_id || (include_shared && s.is_shared))
            .cloned()
            .collect();
        
        Ok(results)
    }
    
    async fn execute_saved_search(&self, search_id: Uuid, override_options: Option<ConversationSearchOptions>) -> CoreResult<ConversationSearchPage> {
        let (filters, options) = {
            let saved_searches = self.saved_searches.read().unwrap();
            
            let saved_search = saved_searches.get(&search_id)
                .ok_or_else(|| CoreError::not_found("saved_search", &search_id.to_string()))?;
            
            let options = override_options.unwrap_or_else(|| saved_search.sort_options.clone());
            let filters = saved_search.filters.clone();
            
            (filters, options)
        };
        
        // Update usage stats (in real implementation, this would be atomic)
        {
            let mut saved_searches = self.saved_searches.write().unwrap();
            if let Some(search) = saved_searches.get_mut(&search_id) {
                search.usage_count += 1;
                search.last_used_at = Some(Utc::now());
            }
        }
        
        self.advanced_search(filters, options).await
    }
    
    async fn delete_saved_search(&self, search_id: Uuid, _user_id: Uuid) -> CoreResult<()> {
        let mut saved_searches = self.saved_searches.write().unwrap();
        
        if saved_searches.remove(&search_id).is_some() {
            Ok(())
        } else {
            Err(CoreError::not_found("saved_search", &search_id.to_string()))
        }
    }
    
    async fn get_search_facets(&self, base_filters: Option<ConversationFilters>) -> CoreResult<SearchFacets> {
        let conversations = self.conversations.read().unwrap();
        let all_conversations: Vec<&Conversation> = conversations.values().collect();
        
        let filtered_conversations = if let Some(filters) = base_filters {
            self.apply_basic_filters(&all_conversations, &filters)
        } else {
            all_conversations
        };
        
        Ok(self.generate_facets(&filtered_conversations))
    }
    
    async fn rebuild_search_index(&self) -> CoreResult<u64> {
        let conversations = self.conversations.read().unwrap();
        let count = conversations.len() as u64;
        
        info!("Rebuilt search index for {} conversations", count);
        Ok(count)
    }
    
    async fn get_search_analytics(&self, _date_range: DateRange) -> CoreResult<SearchAnalytics> {
        // Mock analytics data
        Ok(SearchAnalytics {
            total_searches: 1250,
            unique_users: 45,
            most_common_filters: [
                ("status".to_string(), 890),
                ("priority".to_string(), 670),
                ("platform".to_string(), 560),
            ].into_iter().collect(),
            average_query_time_ms: 15.2,
            most_used_saved_searches: vec![
                ("Open High Priority".to_string(), 125),
                ("My Assignments".to_string(), 98),
                ("Overdue Responses".to_string(), 76),
            ],
            search_success_rate: 0.87,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_advanced_search() {
        let service = DefaultConversationSearchService::new().with_sample_conversations();
        
        let filters = AdvancedConversationFilters {
            basic: ConversationFilters {
                status: Some(vec![ConversationStatus::Open, ConversationStatus::Assigned]),
                ..Default::default()
            },
            message_content: None,
            contact_info: None,
            time_filters: None,
            agent_filters: None,
            message_count: Some(CountRange { min: Some(5), max: Some(15) }),
            response_time: None,
            custom_fields: None,
            flow_state: None,
        };
        
        let options = ConversationSearchOptions::default();
        
        let result = service.advanced_search(filters, options).await.unwrap();
        assert!(result.total_count > 0);
        assert!(result.results.iter().all(|r| 
            matches!(r.conversation.status, ConversationStatus::Open | ConversationStatus::Assigned) &&
            r.conversation.message_count >= 5 && r.conversation.message_count <= 15
        ));
    }
    
    #[tokio::test]
    async fn test_full_text_search() {
        let service = DefaultConversationSearchService::new().with_sample_conversations();
        
        let result = service.full_text_search("Cliente", None, ConversationSearchOptions::default()).await.unwrap();
        assert!(result.total_count > 0);
        assert!(result.results.iter().all(|r| r.conversation.contact_name.contains("Cliente")));
    }
    
    #[tokio::test]
    async fn test_save_and_execute_search() {
        let service = DefaultConversationSearchService::new().with_sample_conversations();
        let user_id = Uuid::new_v4();
        
        let filters = AdvancedConversationFilters {
            basic: ConversationFilters {
                priority: Some(vec![ConversationPriority::High, ConversationPriority::Urgent]),
                ..Default::default()
            },
            message_content: None,
            contact_info: None,
            time_filters: None,
            agent_filters: None,
            message_count: None,
            response_time: None,
            custom_fields: None,
            flow_state: None,
        };
        
        let options = ConversationSearchOptions::default();
        
        let saved_search = service.save_search("High Priority".to_string(), filters, options, user_id).await.unwrap();
        assert_eq!(saved_search.name, "High Priority");
        
        let result = service.execute_saved_search(saved_search.id, None).await.unwrap();
        assert!(result.results.iter().all(|r| 
            matches!(r.conversation.priority, ConversationPriority::High | ConversationPriority::Urgent)
        ));
    }
    
    #[tokio::test]
    async fn test_search_facets() {
        let service = DefaultConversationSearchService::new().with_sample_conversations();
        
        let facets = service.get_search_facets(None).await.unwrap();
        
        assert!(!facets.status.is_empty());
        assert!(!facets.priority.is_empty());
        assert!(!facets.platform.is_empty());
    }
}