use actix_web::{web, HttpResponse, Result};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use chrono::{DateTime, Utc};
use uuid::Uuid;
use anyhow::{Result as AnyhowResult};
use thiserror::Error;
use utoipa::ToSchema;

// Langchain imports (these would be actual imports when langchain-rust 4.5+ is available)
// Note: O sistema atual é uma simulação completa da interface que será usada
// quando langchain-rust 4.5+ estiver disponível. Todos os endpoints e estruturas
// estão prontos para serem integrados com a biblioteca real.
//
// Imports que serão habilitados:
// use langchain_rust::llm::{OpenAI, Anthropic, Ollama};
// use langchain_rust::chain::{Chain, ConversationChain, QAChain, SummarizationChain};
// use langchain_rust::agent::{Agent, AgentExecutor, Tool};
// use langchain_rust::memory::{ConversationBufferMemory, ConversationSummaryMemory};
// use langchain_rust::vectorstore::{Qdrant, Pinecone, LocalVectorStore};
// use langchain_rust::embeddings::{OpenAIEmbeddings, HuggingFaceEmbeddings};

// Error types
#[derive(Error, Debug)]
pub enum LangChainError {
    #[error("LLM provider error: {0}")]
    LLMProvider(String),
    #[error("Chain execution error: {0}")]
    ChainExecution(String),
    #[error("Agent execution error: {0}")]
    AgentExecution(String),
    #[error("Vector store error: {0}")]
    VectorStore(String),
    #[error("Memory error: {0}")]
    Memory(String),
    #[error("Document processing error: {0}")]
    DocumentProcessing(String),
    #[error("Knowledge base error: {0}")]
    KnowledgeBase(String),
    #[error("Function calling error: {0}")]
    FunctionCalling(String),
    #[error("Rate limit exceeded")]
    RateLimit,
    #[error("Invalid configuration: {0}")]
    InvalidConfig(String),
}

// Data structures
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct LLMConfig {
    pub provider: LLMProvider,
    pub model: String,
    pub api_key: Option<String>,
    pub base_url: Option<String>,
    pub temperature: f32,
    pub max_tokens: u32,
    pub timeout_seconds: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub enum LLMProvider {
    OpenAI,
    Anthropic,
    Ollama,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct VectorStoreConfig {
    pub provider: VectorStoreProvider,
    pub api_key: Option<String>,
    pub url: Option<String>,
    pub collection_name: String,
    pub dimension: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub enum VectorStoreProvider {
    Qdrant,
    Pinecone,
    Local,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
    pub timestamp: DateTime<Utc>,
    pub metadata: Option<HashMap<String, String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ChatRequest {
    pub message: String,
    pub conversation_id: Option<String>,
    pub chain_type: Option<ChainType>,
    pub context: Option<HashMap<String, String>>,
    pub use_rag: Option<bool>,
    pub tenant_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ChatResponse {
    pub response: String,
    pub conversation_id: String,
    pub sources: Option<Vec<DocumentSource>>,
    pub chain_used: ChainType,
    pub tokens_used: u32,
    pub response_time_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub enum ChainType {
    Conversation,
    QA,
    Summarization,
    Analysis,
    Custom(String),
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct DocumentSource {
    pub document_id: String,
    pub chunk_id: String,
    pub content: String,
    pub similarity_score: f32,
    pub metadata: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct RAGQuery {
    pub query: String,
    pub tenant_id: Option<String>,
    pub collection: Option<String>,
    pub top_k: Option<u32>,
    pub similarity_threshold: Option<f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct RAGResponse {
    pub answer: String,
    pub sources: Vec<DocumentSource>,
    pub confidence_score: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct AgentRequest {
    pub task: String,
    pub agent_type: AgentType,
    pub tools: Vec<String>,
    pub max_iterations: Option<u32>,
    pub context: Option<HashMap<String, String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub enum AgentType {
    Reasoning,
    Planning,
    ReactDocstore,
    SelfAskWithSearch,
    ConversationalReAct,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct AgentResponse {
    pub result: String,
    pub steps: Vec<AgentStep>,
    pub tools_used: Vec<String>,
    pub iterations: u32,
    pub success: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct AgentStep {
    pub thought: String,
    pub action: String,
    pub observation: String,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct DocumentUpload {
    pub content: Vec<u8>,
    pub filename: String,
    pub content_type: String,
    pub tenant_id: Option<String>,
    pub collection: Option<String>,
    pub metadata: Option<HashMap<String, String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct DocumentMetadata {
    pub id: String,
    pub filename: String,
    pub content_type: String,
    pub size_bytes: u64,
    pub chunks_count: u32,
    pub uploaded_at: DateTime<Utc>,
    pub tenant_id: Option<String>,
    pub collection: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ChainDefinition {
    pub name: String,
    pub description: String,
    pub steps: Vec<ChainStep>,
    pub input_variables: Vec<String>,
    pub output_variables: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ChainStep {
    pub name: String,
    pub chain_type: ChainType,
    pub prompt_template: String,
    pub conditions: Option<HashMap<String, String>>,
}

// Function calling structures
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct FunctionCall {
    pub name: String,
    pub arguments: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct FunctionResult {
    pub success: bool,
    pub result: serde_json::Value,
    pub error: Option<String>,
    pub execution_time_ms: u64,
}

// ERP Integration Functions (simulando até termos langchain-rust completo)
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct Customer {
    pub id: String,
    pub name: String,
    pub cpf: String,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub status: String,
}

// Main LangChain AI Service
#[derive(Clone)]
pub struct LangChainAIService {
    llm_configs: Arc<RwLock<HashMap<String, LLMConfig>>>,
    vector_store_configs: Arc<RwLock<HashMap<String, VectorStoreConfig>>>,
    conversations: Arc<RwLock<HashMap<String, Vec<ChatMessage>>>>,
    knowledge_base: Arc<RwLock<HashMap<String, Vec<DocumentMetadata>>>>,
    chains: Arc<RwLock<HashMap<String, ChainDefinition>>>,
    // Placeholder para quando langchain-rust estiver disponível
    // llm_instances: Arc<RwLock<HashMap<String, Box<dyn LLM>>>>,
    // vector_stores: Arc<RwLock<HashMap<String, Box<dyn VectorStore>>>>,
    // agents: Arc<RwLock<HashMap<String, AgentExecutor>>>,
}

impl LangChainAIService {
    pub fn new() -> Self {
        let service = Self {
            llm_configs: Arc::new(RwLock::new(HashMap::new())),
            vector_store_configs: Arc::new(RwLock::new(HashMap::new())),
            conversations: Arc::new(RwLock::new(HashMap::new())),
            knowledge_base: Arc::new(RwLock::new(HashMap::new())),
            chains: Arc::new(RwLock::new(HashMap::new())),
        };

        // Initialize default configurations asynchronously
        let service_clone = service.clone();
        tokio::spawn(async move {
            if let Err(e) = service_clone.initialize_defaults().await {
                log::error!("Failed to initialize LangChain AI defaults: {}", e);
            }
        });

        service
    }

    async fn initialize_defaults(&self) -> AnyhowResult<()> {
        // Initialize default LLM configurations
        let mut llm_configs = self.llm_configs.write().await;
        
        llm_configs.insert("openai-gpt4".to_string(), LLMConfig {
            provider: LLMProvider::OpenAI,
            model: "gpt-4".to_string(),
            api_key: std::env::var("OPENAI_API_KEY").ok(),
            base_url: None,
            temperature: 0.7,
            max_tokens: 4096,
            timeout_seconds: 30,
        });

        llm_configs.insert("anthropic-claude".to_string(), LLMConfig {
            provider: LLMProvider::Anthropic,
            model: "claude-3-sonnet-20240229".to_string(),
            api_key: std::env::var("ANTHROPIC_API_KEY").ok(),
            base_url: None,
            temperature: 0.7,
            max_tokens: 4096,
            timeout_seconds: 30,
        });

        llm_configs.insert("ollama-local".to_string(), LLMConfig {
            provider: LLMProvider::Ollama,
            model: "llama3".to_string(),
            api_key: None,
            base_url: Some("http://localhost:11434".to_string()),
            temperature: 0.7,
            max_tokens: 4096,
            timeout_seconds: 60,
        });

        // Initialize default vector store configurations
        let mut vector_configs = self.vector_store_configs.write().await;
        
        vector_configs.insert("qdrant-local".to_string(), VectorStoreConfig {
            provider: VectorStoreProvider::Qdrant,
            api_key: None,
            url: Some("http://localhost:6333".to_string()),
            collection_name: "pytake-knowledge".to_string(),
            dimension: 1536,
        });

        vector_configs.insert("pinecone-cloud".to_string(), VectorStoreConfig {
            provider: VectorStoreProvider::Pinecone,
            api_key: std::env::var("PINECONE_API_KEY").ok(),
            url: std::env::var("PINECONE_ENVIRONMENT").ok(),
            collection_name: "pytake-knowledge".to_string(),
            dimension: 1536,
        });

        // Initialize pre-built chains
        let mut chains = self.chains.write().await;
        
        chains.insert("customer-support".to_string(), ChainDefinition {
            name: "Customer Support Chain".to_string(),
            description: "Automated customer support with ERP integration".to_string(),
            steps: vec![
                ChainStep {
                    name: "identify-customer".to_string(),
                    chain_type: ChainType::Custom("customer-lookup".to_string()),
                    prompt_template: "Extract customer information from: {input}".to_string(),
                    conditions: None,
                },
                ChainStep {
                    name: "resolve-query".to_string(),
                    chain_type: ChainType::QA,
                    prompt_template: "Resolve customer query using available data: {customer_data} Query: {input}".to_string(),
                    conditions: None,
                },
            ],
            input_variables: vec!["input".to_string(), "phone_number".to_string()],
            output_variables: vec!["resolution".to_string(), "actions_taken".to_string()],
        });

        Ok(())
    }

    // Chat with chains
    pub async fn chat(&self, request: ChatRequest) -> Result<ChatResponse, LangChainError> {
        let start_time = std::time::Instant::now();
        let conversation_id = request.conversation_id.unwrap_or_else(|| Uuid::new_v4().to_string());
        
        // Add message to conversation history
        let mut conversations = self.conversations.write().await;
        let history = conversations.entry(conversation_id.clone()).or_insert_with(Vec::new);
        
        history.push(ChatMessage {
            role: "user".to_string(),
            content: request.message.clone(),
            timestamp: Utc::now(),
            metadata: request.context.clone(),
        });

        // Simulate chain execution (replace with actual langchain-rust implementation)
        let response_content = if request.use_rag.unwrap_or(false) {
            self.execute_rag_chain(&request.message, request.tenant_id.as_deref()).await?
        } else {
            self.execute_conversation_chain(&request.message, &history).await?
        };

        // Add response to history
        history.push(ChatMessage {
            role: "assistant".to_string(),
            content: response_content.clone(),
            timestamp: Utc::now(),
            metadata: None,
        });

        let response_time = start_time.elapsed().as_millis() as u64;

        Ok(ChatResponse {
            response: response_content.clone(),
            conversation_id,
            sources: None, // Would be populated with actual RAG sources
            chain_used: request.chain_type.unwrap_or(ChainType::Conversation),
            tokens_used: self.estimate_tokens(&request.message) + self.estimate_tokens(&response_content),
            response_time_ms: response_time,
        })
    }

    // RAG query processing
    pub async fn rag_query(&self, query: RAGQuery) -> Result<RAGResponse, LangChainError> {
        // Simulate RAG processing (replace with actual implementation)
        let sources = self.search_knowledge_base(&query.query, query.tenant_id.as_deref()).await?;
        
        let answer = format!(
            "Based on the available knowledge base, here's what I found regarding '{}': [Simulated RAG response]",
            query.query
        );

        Ok(RAGResponse {
            answer,
            sources,
            confidence_score: 0.85, // Simulated confidence
        })
    }

    // Agent execution
    pub async fn run_agent(&self, request: AgentRequest) -> Result<AgentResponse, LangChainError> {
        let _start_time = std::time::Instant::now();
        
        // Simulate agent execution (replace with actual langchain-rust agent)
        let steps = vec![
            AgentStep {
                thought: format!("I need to analyze the task: {}", request.task),
                action: "analyze_task".to_string(),
                observation: "Task requires customer data lookup".to_string(),
                timestamp: Utc::now(),
            },
            AgentStep {
                thought: "I should use the ERP connector to get customer information".to_string(),
                action: "call_erp_function".to_string(),
                observation: "Customer data retrieved successfully".to_string(),
                timestamp: Utc::now(),
            },
        ];

        let result = format!("Agent completed task: {} using tools: {:?}", request.task, request.tools);

        Ok(AgentResponse {
            result,
            steps,
            tools_used: request.tools,
            iterations: 2,
            success: true,
        })
    }

    // Knowledge base upload
    pub async fn upload_document(&self, upload: DocumentUpload) -> Result<DocumentMetadata, LangChainError> {
        let document_id = Uuid::new_v4().to_string();
        let collection = upload.collection.unwrap_or_else(|| "default".to_string());
        
        // Process document based on content type
        let chunks_count = match upload.content_type.as_str() {
            "application/pdf" => self.process_pdf(&upload.content).await?,
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document" => {
                self.process_docx(&upload.content).await?
            },
            "text/plain" => self.process_text(&upload.content).await?,
            _ => return Err(LangChainError::DocumentProcessing(
                format!("Unsupported content type: {}", upload.content_type)
            )),
        };

        let metadata = DocumentMetadata {
            id: document_id.clone(),
            filename: upload.filename,
            content_type: upload.content_type,
            size_bytes: upload.content.len() as u64,
            chunks_count,
            uploaded_at: Utc::now(),
            tenant_id: upload.tenant_id,
            collection: collection.clone(),
        };

        // Store metadata in knowledge base
        let mut kb = self.knowledge_base.write().await;
        let tenant_kb = kb.entry(collection).or_insert_with(Vec::new);
        tenant_kb.push(metadata.clone());

        Ok(metadata)
    }

    // Available chains
    pub async fn get_available_chains(&self) -> Result<Vec<ChainDefinition>, LangChainError> {
        let chains = self.chains.read().await;
        Ok(chains.values().cloned().collect())
    }

    // ERP Function Calling Integration
    pub async fn call_erp_function(&self, function: FunctionCall) -> Result<FunctionResult, LangChainError> {
        let start_time = std::time::Instant::now();
        
        let result = match function.name.as_str() {
            "get_customer_data" => {
                if let Some(cpf) = function.arguments.get("cpf") {
                    self.get_customer_data(cpf.as_str().unwrap_or("")).await
                } else {
                    Err(LangChainError::FunctionCalling("Missing CPF parameter".to_string()))
                }
            },
            "create_support_ticket" => {
                if let Some(description) = function.arguments.get("description") {
                    self.create_support_ticket(description.as_str().unwrap_or("")).await
                } else {
                    Err(LangChainError::FunctionCalling("Missing description parameter".to_string()))
                }
            },
            "schedule_technician_visit" => {
                let date = function.arguments.get("date").and_then(|v| v.as_str()).unwrap_or("");
                let time = function.arguments.get("time").and_then(|v| v.as_str()).unwrap_or("");
                self.schedule_technician_visit(date, time).await
            },
            "generate_invoice_pdf" => {
                if let Some(invoice_id) = function.arguments.get("invoice_id") {
                    self.generate_invoice_pdf(invoice_id.as_str().unwrap_or("")).await
                } else {
                    Err(LangChainError::FunctionCalling("Missing invoice_id parameter".to_string()))
                }
            },
            _ => Err(LangChainError::FunctionCalling(format!("Unknown function: {}", function.name))),
        };

        let execution_time = start_time.elapsed().as_millis() as u64;

        match result {
            Ok(data) => Ok(FunctionResult {
                success: true,
                result: data,
                error: None,
                execution_time_ms: execution_time,
            }),
            Err(e) => Ok(FunctionResult {
                success: false,
                result: serde_json::Value::Null,
                error: Some(e.to_string()),
                execution_time_ms: execution_time,
            }),
        }
    }

    // Helper methods (simulações até termos langchain-rust completo)
    async fn execute_rag_chain(&self, query: &str, _tenant_id: Option<&str>) -> Result<String, LangChainError> {
        // Simulate RAG chain execution
        Ok(format!("RAG response for: {} (simulated)", query))
    }

    async fn execute_conversation_chain(&self, message: &str, _history: &[ChatMessage]) -> Result<String, LangChainError> {
        // Simulate conversation chain execution
        Ok(format!("Conversation response for: {} (simulated)", message))
    }

    async fn search_knowledge_base(&self, query: &str, _tenant_id: Option<&str>) -> Result<Vec<DocumentSource>, LangChainError> {
        // Simulate knowledge base search
        Ok(vec![
            DocumentSource {
                document_id: "doc_1".to_string(),
                chunk_id: "chunk_1".to_string(),
                content: format!("Relevant content for: {}", query),
                similarity_score: 0.9,
                metadata: HashMap::new(),
            }
        ])
    }

    fn estimate_tokens(&self, text: &str) -> u32 {
        // Simple token estimation (replace with actual tokenizer)
        (text.len() / 4) as u32
    }

    async fn process_pdf(&self, _content: &[u8]) -> Result<u32, LangChainError> {
        // Simulate PDF processing
        Ok(10) // chunks count
    }

    async fn process_docx(&self, _content: &[u8]) -> Result<u32, LangChainError> {
        // Simulate DOCX processing
        Ok(5) // chunks count
    }

    async fn process_text(&self, content: &[u8]) -> Result<u32, LangChainError> {
        let text = String::from_utf8_lossy(content);
        let chunks = (text.len() / 1000).max(1) as u32; // Simulate chunking
        Ok(chunks)
    }

    // ERP Integration Functions (simulated)
    async fn get_customer_data(&self, cpf: &str) -> Result<serde_json::Value, LangChainError> {
        // Simulate ERP customer lookup
        Ok(serde_json::json!({
            "id": "cust_123",
            "name": "João Silva",
            "cpf": cpf,
            "email": "joao@example.com",
            "phone": "+5561994013828",
            "status": "active"
        }))
    }

    async fn create_support_ticket(&self, description: &str) -> Result<serde_json::Value, LangChainError> {
        // Simulate support ticket creation
        Ok(serde_json::json!({
            "ticket_id": "TKT-001",
            "description": description,
            "status": "open",
            "created_at": Utc::now()
        }))
    }

    async fn schedule_technician_visit(&self, date: &str, time: &str) -> Result<serde_json::Value, LangChainError> {
        // Simulate technician scheduling
        Ok(serde_json::json!({
            "schedule_id": "SCH-001",
            "date": date,
            "time": time,
            "technician_id": "TECH-001",
            "status": "scheduled"
        }))
    }

    async fn generate_invoice_pdf(&self, invoice_id: &str) -> Result<serde_json::Value, LangChainError> {
        // Simulate PDF generation
        Ok(serde_json::json!({
            "pdf_url": format!("https://api.pytake.net/invoices/{}.pdf", invoice_id),
            "generated_at": Utc::now()
        }))
    }
}

// HTTP Handlers
pub async fn chat_handler(
    data: web::Data<Arc<LangChainAIService>>,
    request: web::Json<ChatRequest>,
) -> Result<HttpResponse> {
    match data.chat(request.into_inner()).await {
        Ok(response) => Ok(HttpResponse::Ok().json(response)),
        Err(e) => Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": e.to_string()
        }))),
    }
}

pub async fn rag_query_handler(
    data: web::Data<Arc<LangChainAIService>>,
    query: web::Json<RAGQuery>,
) -> Result<HttpResponse> {
    match data.rag_query(query.into_inner()).await {
        Ok(response) => Ok(HttpResponse::Ok().json(response)),
        Err(e) => Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": e.to_string()
        }))),
    }
}

pub async fn run_agent_handler(
    data: web::Data<Arc<LangChainAIService>>,
    request: web::Json<AgentRequest>,
) -> Result<HttpResponse> {
    match data.run_agent(request.into_inner()).await {
        Ok(response) => Ok(HttpResponse::Ok().json(response)),
        Err(e) => Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": e.to_string()
        }))),
    }
}

pub async fn upload_knowledge_handler(
    data: web::Data<Arc<LangChainAIService>>,
    mut payload: web::Payload,
) -> Result<HttpResponse> {
    use actix_web::web::BytesMut;
    use futures::StreamExt;

    let mut body = BytesMut::new();
    while let Some(chunk) = payload.next().await {
        let chunk = chunk.map_err(|_| actix_web::error::ErrorBadRequest("Payload error"))?;
        body.extend_from_slice(&chunk);
    }

    let upload = DocumentUpload {
        content: body.to_vec(),
        filename: "uploaded_document".to_string(),
        content_type: "text/plain".to_string(),
        tenant_id: None,
        collection: None,
        metadata: None,
    };

    match data.upload_document(upload).await {
        Ok(metadata) => Ok(HttpResponse::Ok().json(metadata)),
        Err(e) => Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": e.to_string()
        }))),
    }
}

pub async fn available_chains_handler(
    data: web::Data<Arc<LangChainAIService>>,
) -> Result<HttpResponse> {
    match data.get_available_chains().await {
        Ok(chains) => Ok(HttpResponse::Ok().json(chains)),
        Err(e) => Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": e.to_string()
        }))),
    }
}

pub async fn call_function_handler(
    data: web::Data<Arc<LangChainAIService>>,
    function: web::Json<FunctionCall>,
) -> Result<HttpResponse> {
    match data.call_erp_function(function.into_inner()).await {
        Ok(result) => Ok(HttpResponse::Ok().json(result)),
        Err(e) => Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": e.to_string()
        }))),
    }
}

// Service factory for integration
pub fn create_langchain_service() -> Arc<LangChainAIService> {
    Arc::new(LangChainAIService::new())
}

// Route configuration
pub fn configure_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/api/v1/ai-v2")
            .route("/chat", web::post().to(chat_handler))
            .route("/rag/query", web::post().to(rag_query_handler))
            .route("/agents/run", web::post().to(run_agent_handler))
            .route("/knowledge/upload", web::post().to(upload_knowledge_handler))
            .route("/chains/available", web::get().to(available_chains_handler))
            .route("/functions/call", web::post().to(call_function_handler))
    );
}

#[cfg(test)]
mod tests {
    use super::*;
    use actix_web::{test, App, web};

    #[actix_web::test]
    async fn test_langchain_service_creation() {
        let _service = create_langchain_service();
        // Service should be created successfully
        assert!(true);
    }

    #[actix_web::test]
    async fn test_chat_endpoint() {
        let service = create_langchain_service();
        let app = test::init_service(
            App::new()
                .app_data(web::Data::new(service))
                .service(web::resource("/chat").route(web::post().to(chat_handler)))
        ).await;

        let chat_request = ChatRequest {
            message: "Hello, world!".to_string(),
            conversation_id: None,
            chain_type: Some(ChainType::Conversation),
            context: None,
            use_rag: Some(false),
            tenant_id: None,
        };

        let req = test::TestRequest::post()
            .uri("/chat")
            .set_json(&chat_request)
            .to_request();

        let resp = test::call_service(&app, req).await;
        assert_eq!(resp.status(), 200);
    }

    #[actix_web::test]
    async fn test_available_chains() {
        let service = create_langchain_service();
        
        // Wait a bit for initialization
        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
        
        let chains = service.get_available_chains().await.unwrap();
        assert!(!chains.is_empty());
        assert!(chains.iter().any(|c| c.name == "Customer Support Chain"));
    }

    #[actix_web::test]
    async fn test_erp_function_calling() {
        let service = create_langchain_service();
        
        let function_call = FunctionCall {
            name: "get_customer_data".to_string(),
            arguments: {
                let mut args = HashMap::new();
                args.insert("cpf".to_string(), serde_json::Value::String("12345678901".to_string()));
                args
            },
        };

        let result = service.call_erp_function(function_call).await.unwrap();
        assert!(result.success);
        assert!(result.result.get("name").is_some());
    }
}