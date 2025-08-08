use actix_web::{web, HttpResponse, Result};
use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    sync::Arc,
    time::{Duration, SystemTime},
};
use async_trait::async_trait;
use dashmap::DashMap;
use leaky_bucket::RateLimiter;
use reqwest::Client;
use thiserror::Error;
use tokio::sync::Mutex;
use tracing::{error, info, warn};
use uuid::Uuid;
use utoipa::ToSchema;

// ===== ERROR TYPES =====

#[derive(Error, Debug)]
pub enum AIError {
    #[error("Provider error: {0}")]
    ProviderError(String),
    #[error("Rate limit exceeded for provider: {0}")]
    RateLimitError(String),
    #[error("Content filter violated: {0}")]
    ContentFilterError(String),
    #[error("Invalid request: {0}")]
    InvalidRequest(String),
    #[error("Service unavailable")]
    ServiceUnavailable,
    #[error("Authentication failed")]
    AuthenticationFailed,
    #[error("Token count exceeded: {current}/{max}")]
    TokenLimitExceeded { current: usize, max: usize },
}

// ===== REQUEST/RESPONSE TYPES =====

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct ChatRequest {
    /// Message content
    pub message: String,
    /// User/conversation ID
    pub user_id: String,
    /// Conversation context
    pub conversation_id: String,
    /// Optional system context
    pub context: Option<HashMap<String, String>>,
    /// Preferred AI provider
    pub preferred_provider: Option<AIProvider>,
    /// Maximum tokens for response
    pub max_tokens: Option<usize>,
    /// Temperature for creativity (0.0-1.0)
    pub temperature: Option<f32>,
    /// Include conversation history
    pub include_history: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct ChatResponse {
    /// Generated response
    pub response: String,
    /// Provider used
    pub provider: AIProvider,
    /// Tokens used in request
    pub tokens_used: usize,
    /// Conversation ID
    pub conversation_id: String,
    /// Confidence score (0.0-1.0)
    pub confidence: f32,
    /// Response metadata
    pub metadata: HashMap<String, String>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct AnalyzeRequest {
    /// Message to analyze
    pub message: String,
    /// User ID
    pub user_id: String,
    /// Analysis type
    pub analysis_type: Vec<AnalysisType>,
    /// Additional context
    pub context: Option<HashMap<String, String>>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema, Clone)]
#[serde(rename_all = "snake_case")]
pub enum AnalysisType {
    Intent,
    Sentiment,
    Entity,
    Language,
    Priority,
    Category,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct AnalyzeResponse {
    /// Analysis results
    pub analysis: HashMap<String, serde_json::Value>,
    /// Confidence scores
    pub confidence: HashMap<String, f32>,
    /// Provider used
    pub provider: AIProvider,
    /// Processing time in milliseconds
    pub processing_time_ms: u64,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct IntentClassificationRequest {
    /// Message to classify
    pub message: String,
    /// User ID
    pub user_id: String,
    /// Available intents
    pub available_intents: Option<Vec<String>>,
    /// Additional context
    pub context: Option<HashMap<String, String>>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct IntentClassificationResponse {
    /// Detected intent
    pub intent: String,
    /// Confidence score
    pub confidence: f32,
    /// Alternative intents
    pub alternatives: Vec<IntentAlternative>,
    /// Extracted entities
    pub entities: HashMap<String, String>,
    /// Provider used
    pub provider: AIProvider,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct IntentAlternative {
    pub intent: String,
    pub confidence: f32,
}

#[derive(Debug, Serialize, Deserialize, ToSchema, Clone)]
pub struct CustomPrompt {
    pub id: Uuid,
    pub name: String,
    pub description: String,
    pub template: String,
    pub variables: Vec<String>,
    pub tenant_id: Option<String>,
    pub is_active: bool,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct CreatePromptRequest {
    pub name: String,
    pub description: String,
    pub template: String,
    pub variables: Vec<String>,
    pub tenant_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema, Clone, PartialEq, Eq, Hash)]
#[serde(rename_all = "snake_case")]
pub enum AIProvider {
    OpenAI,
    Anthropic,
    Auto, // Automatic fallback
}

// ===== CONVERSATION CONTEXT =====

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConversationMessage {
    pub role: String, // "user", "assistant", "system"
    pub content: String,
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub metadata: HashMap<String, String>,
}

#[derive(Debug, Clone)]
pub struct ConversationContext {
    pub conversation_id: String,
    pub user_id: String,
    pub messages: Vec<ConversationMessage>,
    pub user_info: HashMap<String, String>,
    pub business_context: HashMap<String, String>,
    pub last_updated: chrono::DateTime<chrono::Utc>,
}

// ===== AI PROVIDER TRAIT =====

#[async_trait]
pub trait AIProviderTrait: Send + Sync {
    async fn chat_completion(
        &self,
        messages: &[ConversationMessage],
        max_tokens: Option<usize>,
        temperature: Option<f32>,
    ) -> Result<String, AIError>;

    async fn analyze_message(
        &self,
        message: &str,
        analysis_types: &[AnalysisType],
        context: Option<&HashMap<String, String>>,
    ) -> Result<HashMap<String, serde_json::Value>, AIError>;

    async fn classify_intent(
        &self,
        message: &str,
        available_intents: Option<&[String]>,
        context: Option<&HashMap<String, String>>,
    ) -> Result<(String, f32, Vec<IntentAlternative>), AIError>;

    fn provider_name(&self) -> &'static str;
    fn is_available(&self) -> bool;
    fn get_rate_limit(&self) -> usize;
}

// ===== OPENAI PROVIDER =====

pub struct OpenAIProvider {
    client: Client,
    api_key: String,
    base_url: String,
    rate_limiter: Arc<Mutex<RateLimiter>>,
}

impl OpenAIProvider {
    pub fn new(api_key: String) -> Self {
        let rate_limiter = RateLimiter::builder()
            .max(60) // 60 requests per minute
            .initial(60)
            .interval(Duration::from_secs(60))
            .build();

        Self {
            client: Client::new(),
            api_key,
            base_url: "https://api.openai.com/v1".to_string(),
            rate_limiter: Arc::new(Mutex::new(rate_limiter)),
        }
    }

    async fn check_rate_limit(&self) -> Result<(), AIError> {
        let limiter = self.rate_limiter.lock().await;
        if limiter.try_acquire(1) {
            Ok(())
        } else {
            Err(AIError::RateLimitError("OpenAI".to_string()))
        }
    }
}

#[async_trait]
impl AIProviderTrait for OpenAIProvider {
    async fn chat_completion(
        &self,
        messages: &[ConversationMessage],
        max_tokens: Option<usize>,
        temperature: Option<f32>,
    ) -> Result<String, AIError> {
        self.check_rate_limit().await?;

        let openai_messages: Vec<serde_json::Value> = messages
            .iter()
            .map(|msg| serde_json::json!({
                "role": msg.role,
                "content": msg.content
            }))
            .collect();

        let request_body = serde_json::json!({
            "model": "gpt-4o-mini",
            "messages": openai_messages,
            "max_tokens": max_tokens.unwrap_or(1000),
            "temperature": temperature.unwrap_or(0.7),
            "stream": false
        });

        let response = self
            .client
            .post(&format!("{}/chat/completions", self.base_url))
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .json(&request_body)
            .send()
            .await
            .map_err(|e| AIError::ProviderError(format!("OpenAI request failed: {}", e)))?;

        if !response.status().is_success() {
            return Err(AIError::ProviderError(format!(
                "OpenAI API error: {}",
                response.status()
            )));
        }

        let response_json: serde_json::Value = response
            .json()
            .await
            .map_err(|e| AIError::ProviderError(format!("Failed to parse OpenAI response: {}", e)))?;

        let content = response_json
            .get("choices")
            .and_then(|choices| choices.get(0))
            .and_then(|choice| choice.get("message"))
            .and_then(|message| message.get("content"))
            .and_then(|content| content.as_str())
            .ok_or_else(|| AIError::ProviderError("Invalid OpenAI response format".to_string()))?;

        Ok(content.to_string())
    }

    async fn analyze_message(
        &self,
        message: &str,
        analysis_types: &[AnalysisType],
        context: Option<&HashMap<String, String>>,
    ) -> Result<HashMap<String, serde_json::Value>, AIError> {
        self.check_rate_limit().await?;

        let analysis_prompt = format!(
            "Analyze this message for: {:?}\nMessage: {}\nContext: {:?}\n\
            Return a JSON object with the analysis results.",
            analysis_types, message, context
        );

        let messages = vec![ConversationMessage {
            role: "user".to_string(),
            content: analysis_prompt,
            timestamp: chrono::Utc::now(),
            metadata: HashMap::new(),
        }];

        let response = self.chat_completion(&messages, Some(500), Some(0.3)).await?;

        // Parse JSON response
        let analysis: HashMap<String, serde_json::Value> = serde_json::from_str(&response)
            .unwrap_or_else(|_| {
                // Fallback analysis if JSON parsing fails
                let mut fallback = HashMap::new();
                fallback.insert("raw_response".to_string(), serde_json::Value::String(response));
                fallback
            });

        Ok(analysis)
    }

    async fn classify_intent(
        &self,
        message: &str,
        available_intents: Option<&[String]>,
        context: Option<&HashMap<String, String>>,
    ) -> Result<(String, f32, Vec<IntentAlternative>), AIError> {
        self.check_rate_limit().await?;

        let intents_list = available_intents
            .map(|intents| intents.join(", "))
            .unwrap_or_else(|| "greeting, question, complaint, request, information, goodbye".to_string());

        let intent_prompt = format!(
            "Classify the intent of this message. Available intents: {}\n\
            Message: {}\nContext: {:?}\n\
            Return JSON with: {{\"intent\": \"primary_intent\", \"confidence\": 0.0-1.0, \"alternatives\": [{{\"intent\": \"alt\", \"confidence\": 0.0-1.0}}]}}",
            intents_list, message, context
        );

        let messages = vec![ConversationMessage {
            role: "user".to_string(),
            content: intent_prompt,
            timestamp: chrono::Utc::now(),
            metadata: HashMap::new(),
        }];

        let response = self.chat_completion(&messages, Some(300), Some(0.1)).await?;

        // Parse JSON response
        let parsed: serde_json::Value = serde_json::from_str(&response)
            .map_err(|_| AIError::ProviderError("Failed to parse intent classification response".to_string()))?;

        let intent = parsed
            .get("intent")
            .and_then(|i| i.as_str())
            .unwrap_or("unknown")
            .to_string();

        let confidence = parsed
            .get("confidence")
            .and_then(|c| c.as_f64())
            .unwrap_or(0.5) as f32;

        let alternatives = parsed
            .get("alternatives")
            .and_then(|alts| alts.as_array())
            .map(|arr| {
                arr.iter()
                    .filter_map(|alt| {
                        Some(IntentAlternative {
                            intent: alt.get("intent")?.as_str()?.to_string(),
                            confidence: alt.get("confidence")?.as_f64()? as f32,
                        })
                    })
                    .collect()
            })
            .unwrap_or_default();

        Ok((intent, confidence, alternatives))
    }

    fn provider_name(&self) -> &'static str {
        "OpenAI"
    }

    fn is_available(&self) -> bool {
        !self.api_key.is_empty()
    }

    fn get_rate_limit(&self) -> usize {
        60 // requests per minute
    }
}

// ===== ANTHROPIC PROVIDER =====

pub struct AnthropicProvider {
    client: Client,
    api_key: String,
    base_url: String,
    rate_limiter: Arc<Mutex<RateLimiter>>,
}

impl AnthropicProvider {
    pub fn new(api_key: String) -> Self {
        let rate_limiter = RateLimiter::builder()
            .max(50) // 50 requests per minute
            .initial(50)
            .interval(Duration::from_secs(60))
            .build();

        Self {
            client: Client::new(),
            api_key,
            base_url: "https://api.anthropic.com/v1".to_string(),
            rate_limiter: Arc::new(Mutex::new(rate_limiter)),
        }
    }

    async fn check_rate_limit(&self) -> Result<(), AIError> {
        let limiter = self.rate_limiter.lock().await;
        if limiter.try_acquire(1) {
            Ok(())
        } else {
            Err(AIError::RateLimitError("Anthropic".to_string()))
        }
    }
}

#[async_trait]
impl AIProviderTrait for AnthropicProvider {
    async fn chat_completion(
        &self,
        messages: &[ConversationMessage],
        max_tokens: Option<usize>,
        temperature: Option<f32>,
    ) -> Result<String, AIError> {
        self.check_rate_limit().await?;

        // Convert messages to Anthropic format
        let mut anthropic_messages = Vec::new();
        let mut system_message = String::new();

        for msg in messages {
            match msg.role.as_str() {
                "system" => {
                    if !system_message.is_empty() {
                        system_message.push('\n');
                    }
                    system_message.push_str(&msg.content);
                }
                "user" | "assistant" => {
                    anthropic_messages.push(serde_json::json!({
                        "role": msg.role,
                        "content": msg.content
                    }));
                }
                _ => {} // Skip unknown roles
            }
        }

        let mut request_body = serde_json::json!({
            "model": "claude-3-haiku-20240307",
            "messages": anthropic_messages,
            "max_tokens": max_tokens.unwrap_or(1000),
            "temperature": temperature.unwrap_or(0.7)
        });

        if !system_message.is_empty() {
            request_body["system"] = serde_json::Value::String(system_message);
        }

        let response = self
            .client
            .post(&format!("{}/messages", self.base_url))
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", "2023-06-01")
            .header("Content-Type", "application/json")
            .json(&request_body)
            .send()
            .await
            .map_err(|e| AIError::ProviderError(format!("Anthropic request failed: {}", e)))?;

        if !response.status().is_success() {
            return Err(AIError::ProviderError(format!(
                "Anthropic API error: {}",
                response.status()
            )));
        }

        let response_json: serde_json::Value = response
            .json()
            .await
            .map_err(|e| AIError::ProviderError(format!("Failed to parse Anthropic response: {}", e)))?;

        let content = response_json
            .get("content")
            .and_then(|content| content.get(0))
            .and_then(|first_content| first_content.get("text"))
            .and_then(|text| text.as_str())
            .ok_or_else(|| AIError::ProviderError("Invalid Anthropic response format".to_string()))?;

        Ok(content.to_string())
    }

    async fn analyze_message(
        &self,
        message: &str,
        analysis_types: &[AnalysisType],
        context: Option<&HashMap<String, String>>,
    ) -> Result<HashMap<String, serde_json::Value>, AIError> {
        self.check_rate_limit().await?;

        let analysis_prompt = format!(
            "Analyze this message for: {:?}\nMessage: {}\nContext: {:?}\n\
            Return a JSON object with the analysis results.",
            analysis_types, message, context
        );

        let messages = vec![ConversationMessage {
            role: "user".to_string(),
            content: analysis_prompt,
            timestamp: chrono::Utc::now(),
            metadata: HashMap::new(),
        }];

        let response = self.chat_completion(&messages, Some(500), Some(0.3)).await?;

        // Parse JSON response
        let analysis: HashMap<String, serde_json::Value> = serde_json::from_str(&response)
            .unwrap_or_else(|_| {
                // Fallback analysis if JSON parsing fails
                let mut fallback = HashMap::new();
                fallback.insert("raw_response".to_string(), serde_json::Value::String(response));
                fallback
            });

        Ok(analysis)
    }

    async fn classify_intent(
        &self,
        message: &str,
        available_intents: Option<&[String]>,
        context: Option<&HashMap<String, String>>,
    ) -> Result<(String, f32, Vec<IntentAlternative>), AIError> {
        self.check_rate_limit().await?;

        let intents_list = available_intents
            .map(|intents| intents.join(", "))
            .unwrap_or_else(|| "greeting, question, complaint, request, information, goodbye".to_string());

        let intent_prompt = format!(
            "Classify the intent of this message. Available intents: {}\n\
            Message: {}\nContext: {:?}\n\
            Return JSON with: {{\"intent\": \"primary_intent\", \"confidence\": 0.0-1.0, \"alternatives\": [{{\"intent\": \"alt\", \"confidence\": 0.0-1.0}}]}}",
            intents_list, message, context
        );

        let messages = vec![ConversationMessage {
            role: "user".to_string(),
            content: intent_prompt,
            timestamp: chrono::Utc::now(),
            metadata: HashMap::new(),
        }];

        let response = self.chat_completion(&messages, Some(300), Some(0.1)).await?;

        // Parse JSON response
        let parsed: serde_json::Value = serde_json::from_str(&response)
            .map_err(|_| AIError::ProviderError("Failed to parse intent classification response".to_string()))?;

        let intent = parsed
            .get("intent")
            .and_then(|i| i.as_str())
            .unwrap_or("unknown")
            .to_string();

        let confidence = parsed
            .get("confidence")
            .and_then(|c| c.as_f64())
            .unwrap_or(0.5) as f32;

        let alternatives = parsed
            .get("alternatives")
            .and_then(|alts| alts.as_array())
            .map(|arr| {
                arr.iter()
                    .filter_map(|alt| {
                        Some(IntentAlternative {
                            intent: alt.get("intent")?.as_str()?.to_string(),
                            confidence: alt.get("confidence")?.as_f64()? as f32,
                        })
                    })
                    .collect()
            })
            .unwrap_or_default();

        Ok((intent, confidence, alternatives))
    }

    fn provider_name(&self) -> &'static str {
        "Anthropic"
    }

    fn is_available(&self) -> bool {
        !self.api_key.is_empty()
    }

    fn get_rate_limit(&self) -> usize {
        50 // requests per minute
    }
}

// ===== MAIN AI SERVICE =====

pub struct AIService {
    providers: HashMap<AIProvider, Arc<dyn AIProviderTrait>>,
    conversations: Arc<DashMap<String, ConversationContext>>,
    custom_prompts: Arc<DashMap<Uuid, CustomPrompt>>,
    content_filter: ContentFilter,
    usage_tracker: Arc<DashMap<String, UsageStats>>,
}

#[derive(Debug, Clone, Serialize)]
pub struct UsageStats {
    pub user_id: String,
    pub total_requests: u64,
    pub total_tokens: u64,
    pub last_request: chrono::DateTime<chrono::Utc>,
    pub requests_today: u64,
}

pub struct ContentFilter {
    blocked_patterns: Vec<regex::Regex>,
}

impl ContentFilter {
    pub fn new() -> Self {
        let patterns = vec![
            r"(?i)(hack|exploit|vulnerability)",
            r"(?i)(bomb|weapon|violence)",
            r"(?i)(drug|illegal)",
        ];

        let blocked_patterns = patterns
            .into_iter()
            .filter_map(|pattern| regex::Regex::new(pattern).ok())
            .collect();

        Self { blocked_patterns }
    }

    pub fn is_safe(&self, text: &str) -> bool {
        !self.blocked_patterns.iter().any(|pattern| pattern.is_match(text))
    }
}

impl AIService {
    pub fn new() -> Self {
        let mut providers: HashMap<AIProvider, Arc<dyn AIProviderTrait>> = HashMap::new();

        // Initialize OpenAI if API key is available
        if let Ok(openai_key) = std::env::var("OPENAI_API_KEY") {
            if !openai_key.is_empty() {
                info!("Initializing OpenAI provider");
                providers.insert(AIProvider::OpenAI, Arc::new(OpenAIProvider::new(openai_key)));
            }
        }

        // Initialize Anthropic if API key is available
        if let Ok(anthropic_key) = std::env::var("ANTHROPIC_API_KEY") {
            if !anthropic_key.is_empty() {
                info!("Initializing Anthropic provider");
                providers.insert(AIProvider::Anthropic, Arc::new(AnthropicProvider::new(anthropic_key)));
            }
        }

        if providers.is_empty() {
            warn!("No AI providers configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY environment variables.");
        } else {
            info!("Initialized AI service with {} providers", providers.len());
        }

        Self {
            providers,
            conversations: Arc::new(DashMap::new()),
            custom_prompts: Arc::new(DashMap::new()),
            content_filter: ContentFilter::new(),
            usage_tracker: Arc::new(DashMap::new()),
        }
    }

    async fn select_provider(&self, preferred: Option<AIProvider>) -> Result<Arc<dyn AIProviderTrait>, AIError> {
        match preferred {
            Some(AIProvider::OpenAI) => {
                self.providers
                    .get(&AIProvider::OpenAI)
                    .cloned()
                    .ok_or(AIError::ServiceUnavailable)
            }
            Some(AIProvider::Anthropic) => {
                self.providers
                    .get(&AIProvider::Anthropic)
                    .cloned()
                    .ok_or(AIError::ServiceUnavailable)
            }
            Some(AIProvider::Auto) | None => {
                // Try OpenAI first, then Anthropic
                self.providers
                    .get(&AIProvider::OpenAI)
                    .or_else(|| self.providers.get(&AIProvider::Anthropic))
                    .cloned()
                    .ok_or(AIError::ServiceUnavailable)
            }
        }
    }

    pub async fn chat(
        &self,
        request: ChatRequest,
    ) -> Result<ChatResponse, AIError> {
        let start_time = SystemTime::now();

        // Content filtering
        if !self.content_filter.is_safe(&request.message) {
            return Err(AIError::ContentFilterError("Message contains inappropriate content".to_string()));
        }

        // Select provider
        let provider = self.select_provider(request.preferred_provider).await?;

        // Get or create conversation context
        let mut conversation = self
            .conversations
            .entry(request.conversation_id.clone())
            .or_insert_with(|| ConversationContext {
                conversation_id: request.conversation_id.clone(),
                user_id: request.user_id.clone(),
                messages: Vec::new(),
                user_info: HashMap::new(),
                business_context: HashMap::new(),
                last_updated: chrono::Utc::now(),
            });

        // Add user message to conversation
        conversation.messages.push(ConversationMessage {
            role: "user".to_string(),
            content: request.message.clone(),
            timestamp: chrono::Utc::now(),
            metadata: request.context.clone().unwrap_or_default(),
        });

        // Prepare messages for AI
        let mut messages = Vec::new();

        // Add system message if context is provided
        if let Some(context) = &request.context {
            if let Some(system_prompt) = context.get("system_prompt") {
                messages.push(ConversationMessage {
                    role: "system".to_string(),
                    content: system_prompt.clone(),
                    timestamp: chrono::Utc::now(),
                    metadata: HashMap::new(),
                });
            }
        }

        // Add conversation history if requested
        if request.include_history.unwrap_or(true) {
            let history_limit = 10; // Last 10 messages
            let recent_messages = conversation
                .messages
                .iter()
                .rev()
                .take(history_limit)
                .rev()
                .cloned()
                .collect::<Vec<_>>();
            messages.extend(recent_messages);
        } else {
            // Just add the current message
            messages.push(conversation.messages.last().unwrap().clone());
        }

        // Generate response
        let response_content = provider
            .chat_completion(&messages, request.max_tokens, request.temperature)
            .await?;

        // Add AI response to conversation
        conversation.messages.push(ConversationMessage {
            role: "assistant".to_string(),
            content: response_content.clone(),
            timestamp: chrono::Utc::now(),
            metadata: HashMap::new(),
        });

        conversation.last_updated = chrono::Utc::now();

        // Update usage stats
        let tokens_used = response_content.len() / 4; // Rough token estimation
        self.update_usage_stats(&request.user_id, tokens_used).await;

        // Calculate confidence (simplified)
        let confidence = if response_content.len() > 50 { 0.8 } else { 0.6 };

        let processing_time = start_time.elapsed().unwrap_or_default().as_millis() as u64;

        let mut metadata = HashMap::new();
        metadata.insert("processing_time_ms".to_string(), processing_time.to_string());
        metadata.insert("provider".to_string(), provider.provider_name().to_string());

        Ok(ChatResponse {
            response: response_content,
            provider: match provider.provider_name() {
                "OpenAI" => AIProvider::OpenAI,
                "Anthropic" => AIProvider::Anthropic,
                _ => AIProvider::Auto,
            },
            tokens_used,
            conversation_id: request.conversation_id,
            confidence,
            metadata,
        })
    }

    pub async fn analyze(
        &self,
        request: AnalyzeRequest,
    ) -> Result<AnalyzeResponse, AIError> {
        let start_time = SystemTime::now();

        // Content filtering
        if !self.content_filter.is_safe(&request.message) {
            return Err(AIError::ContentFilterError("Message contains inappropriate content".to_string()));
        }

        // Select provider (prefer OpenAI for analysis tasks)
        let provider = match self.select_provider(Some(AIProvider::OpenAI)).await {
            Ok(provider) => provider,
            Err(_) => self.select_provider(Some(AIProvider::Anthropic)).await?,
        };

        // Perform analysis
        let analysis = provider
            .analyze_message(&request.message, &request.analysis_type, request.context.as_ref())
            .await?;

        // Generate confidence scores (simplified)
        let mut confidence = HashMap::new();
        for analysis_type in &request.analysis_type {
            let key = format!("{:?}", analysis_type).to_lowercase();
            confidence.insert(key, 0.8); // Default confidence
        }

        // Update usage stats
        self.update_usage_stats(&request.user_id, 100).await; // Rough estimation

        let processing_time = start_time.elapsed().unwrap_or_default().as_millis() as u64;

        Ok(AnalyzeResponse {
            analysis,
            confidence,
            provider: match provider.provider_name() {
                "OpenAI" => AIProvider::OpenAI,
                "Anthropic" => AIProvider::Anthropic,
                _ => AIProvider::Auto,
            },
            processing_time_ms: processing_time,
        })
    }

    pub async fn classify_intent(
        &self,
        request: IntentClassificationRequest,
    ) -> Result<IntentClassificationResponse, AIError> {
        // Content filtering
        if !self.content_filter.is_safe(&request.message) {
            return Err(AIError::ContentFilterError("Message contains inappropriate content".to_string()));
        }

        // Select provider
        let provider = match self.select_provider(Some(AIProvider::OpenAI)).await {
            Ok(provider) => provider,
            Err(_) => self.select_provider(Some(AIProvider::Anthropic)).await?,
        };

        // Classify intent
        let (intent, confidence, alternatives) = provider
            .classify_intent(
                &request.message,
                request.available_intents.as_ref().map(|v| v.as_slice()),
                request.context.as_ref(),
            )
            .await?;

        // Extract basic entities (simplified)
        let entities = extract_basic_entities(&request.message);

        // Update usage stats
        self.update_usage_stats(&request.user_id, 50).await;

        Ok(IntentClassificationResponse {
            intent,
            confidence,
            alternatives,
            entities,
            provider: match provider.provider_name() {
                "OpenAI" => AIProvider::OpenAI,
                "Anthropic" => AIProvider::Anthropic,
                _ => AIProvider::Auto,
            },
        })
    }

    async fn update_usage_stats(&self, user_id: &str, tokens_used: usize) {
        let now = chrono::Utc::now();
        let today = now.date_naive();

        let mut stats = self.usage_tracker
            .entry(user_id.to_string())
            .or_insert_with(|| UsageStats {
                user_id: user_id.to_string(),
                total_requests: 0,
                total_tokens: 0,
                last_request: now,
                requests_today: 0,
            });

        stats.total_requests += 1;
        stats.total_tokens += tokens_used as u64;
        stats.last_request = now;

        // Reset daily counter if it's a new day
        if stats.last_request.date_naive() != today {
            stats.requests_today = 1;
        } else {
            stats.requests_today += 1;
        }
    }

    pub fn add_custom_prompt(&self, prompt: CustomPrompt) {
        self.custom_prompts.insert(prompt.id, prompt);
    }

    pub fn get_custom_prompt(&self, id: &Uuid) -> Option<CustomPrompt> {
        self.custom_prompts.get(id).map(|p| p.value().clone())
    }

    pub fn list_custom_prompts(&self) -> Vec<CustomPrompt> {
        self.custom_prompts.iter().map(|entry| entry.value().clone()).collect()
    }

    pub fn get_usage_stats(&self, user_id: &str) -> Option<UsageStats> {
        self.usage_tracker.get(user_id).map(|stats| stats.value().clone())
    }
}

// ===== UTILITY FUNCTIONS =====

fn extract_basic_entities(text: &str) -> HashMap<String, String> {
    let mut entities = HashMap::new();

    // Email regex
    let email_regex = regex::Regex::new(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b").unwrap();
    if let Some(email_match) = email_regex.find(text) {
        entities.insert("email".to_string(), email_match.as_str().to_string());
    }

    // Phone regex (simplified)
    let phone_regex = regex::Regex::new(r"\b\+?[\d\s\-\(\)]{10,15}\b").unwrap();
    if let Some(phone_match) = phone_regex.find(text) {
        entities.insert("phone".to_string(), phone_match.as_str().to_string());
    }

    // Name patterns (very basic)
    let name_regex = regex::Regex::new(r"\b[A-Z][a-z]+ [A-Z][a-z]+\b").unwrap();
    if let Some(name_match) = name_regex.find(text) {
        entities.insert("name".to_string(), name_match.as_str().to_string());
    }

    entities
}

// ===== HTTP HANDLERS =====

pub async fn chat_handler(
    ai_service: web::Data<AIService>,
    request: web::Json<ChatRequest>,
) -> Result<HttpResponse> {
    match ai_service.chat(request.into_inner()).await {
        Ok(response) => Ok(HttpResponse::Ok().json(response)),
        Err(AIError::RateLimitError(provider)) => {
            Ok(HttpResponse::TooManyRequests().json(serde_json::json!({
                "error": "rate_limit_exceeded",
                "message": format!("Rate limit exceeded for provider: {}", provider)
            })))
        }
        Err(AIError::ContentFilterError(msg)) => {
            Ok(HttpResponse::BadRequest().json(serde_json::json!({
                "error": "content_filter_violation",
                "message": msg
            })))
        }
        Err(AIError::ServiceUnavailable) => {
            Ok(HttpResponse::ServiceUnavailable().json(serde_json::json!({
                "error": "service_unavailable",
                "message": "AI service is temporarily unavailable"
            })))
        }
        Err(err) => {
            error!("AI chat error: {}", err);
            Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "internal_error",
                "message": "An error occurred while processing your request"
            })))
        }
    }
}

pub async fn analyze_handler(
    ai_service: web::Data<AIService>,
    request: web::Json<AnalyzeRequest>,
) -> Result<HttpResponse> {
    match ai_service.analyze(request.into_inner()).await {
        Ok(response) => Ok(HttpResponse::Ok().json(response)),
        Err(AIError::ContentFilterError(msg)) => {
            Ok(HttpResponse::BadRequest().json(serde_json::json!({
                "error": "content_filter_violation",
                "message": msg
            })))
        }
        Err(err) => {
            error!("AI analysis error: {}", err);
            Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "internal_error",
                "message": "An error occurred while analyzing the message"
            })))
        }
    }
}

pub async fn classify_intent_handler(
    ai_service: web::Data<AIService>,
    request: web::Json<IntentClassificationRequest>,
) -> Result<HttpResponse> {
    match ai_service.classify_intent(request.into_inner()).await {
        Ok(response) => Ok(HttpResponse::Ok().json(response)),
        Err(AIError::ContentFilterError(msg)) => {
            Ok(HttpResponse::BadRequest().json(serde_json::json!({
                "error": "content_filter_violation",
                "message": msg
            })))
        }
        Err(err) => {
            error!("Intent classification error: {}", err);
            Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "internal_error",
                "message": "An error occurred while classifying intent"
            })))
        }
    }
}

pub async fn list_prompts_handler(
    ai_service: web::Data<AIService>,
) -> Result<HttpResponse> {
    let prompts = ai_service.list_custom_prompts();
    Ok(HttpResponse::Ok().json(prompts))
}

pub async fn create_prompt_handler(
    ai_service: web::Data<AIService>,
    request: web::Json<CreatePromptRequest>,
) -> Result<HttpResponse> {
    let prompt = CustomPrompt {
        id: Uuid::new_v4(),
        name: request.name.clone(),
        description: request.description.clone(),
        template: request.template.clone(),
        variables: request.variables.clone(),
        tenant_id: request.tenant_id.clone(),
        is_active: true,
        created_at: chrono::Utc::now(),
        updated_at: chrono::Utc::now(),
    };

    ai_service.add_custom_prompt(prompt.clone());
    Ok(HttpResponse::Created().json(prompt))
}

pub async fn get_usage_stats_handler(
    ai_service: web::Data<AIService>,
    path: web::Path<String>,
) -> Result<HttpResponse> {
    let user_id = path.into_inner();
    
    match ai_service.get_usage_stats(&user_id) {
        Some(stats) => Ok(HttpResponse::Ok().json(stats)),
        None => Ok(HttpResponse::NotFound().json(serde_json::json!({
            "error": "user_not_found",
            "message": "No usage statistics found for this user"
        })))
    }
}

// ===== ROUTE CONFIGURATION =====

pub fn configure_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/ai")
            .route("/chat", web::post().to(chat_handler))
            .route("/analyze", web::post().to(analyze_handler))
            .route("/classify", web::post().to(classify_intent_handler))
            .route("/prompts", web::get().to(list_prompts_handler))
            .route("/prompts", web::post().to(create_prompt_handler))
            .route("/usage/{user_id}", web::get().to(get_usage_stats_handler))
    );
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_content_filter() {
        let filter = ContentFilter::new();
        
        // Safe content
        assert!(filter.is_safe("Hello, how can I help you today?"));
        assert!(filter.is_safe("I need information about your products"));
        
        // Unsafe content
        assert!(!filter.is_safe("How to hack into systems"));
        assert!(!filter.is_safe("I want to buy illegal drugs"));
    }

    #[test]
    fn test_entity_extraction() {
        let text = "My name is John Doe and my email is john.doe@example.com";
        let entities = extract_basic_entities(text);
        
        assert!(entities.contains_key("email"));
        assert_eq!(entities.get("email").unwrap(), "john.doe@example.com");
        assert!(entities.contains_key("name"));
        assert_eq!(entities.get("name").unwrap(), "John Doe");
    }

    #[tokio::test]
    async fn test_ai_service_creation() {
        let ai_service = AIService::new();
        // Service should be created successfully even without API keys
        assert!(ai_service.providers.is_empty()); // No keys configured in test
    }

    #[test]
    fn test_custom_prompt_creation() {
        let ai_service = AIService::new();
        let prompt = CustomPrompt {
            id: Uuid::new_v4(),
            name: "Test Prompt".to_string(),
            description: "A test prompt".to_string(),
            template: "Hello {{name}}!".to_string(),
            variables: vec!["name".to_string()],
            tenant_id: Some("tenant1".to_string()),
            is_active: true,
            created_at: chrono::Utc::now(),
            updated_at: chrono::Utc::now(),
        };

        let prompt_id = prompt.id;
        ai_service.add_custom_prompt(prompt);

        let retrieved = ai_service.get_custom_prompt(&prompt_id);
        assert!(retrieved.is_some());
        assert_eq!(retrieved.unwrap().name, "Test Prompt");
    }
}