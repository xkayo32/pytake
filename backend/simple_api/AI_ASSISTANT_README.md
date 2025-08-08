# PyTake AI Assistant Integration

## 🚀 Overview

The PyTake AI Assistant is a comprehensive AI integration system that provides intelligent conversation handling, message analysis, and intent classification for WhatsApp Business automation. It supports multiple AI providers with automatic fallback and includes robust security, rate limiting, and monitoring features.

## ✨ Features

### 🤖 AI Providers
- **OpenAI Integration**: GPT-4o-mini for chat and analysis
- **Anthropic Integration**: Claude-3-Haiku for reasoning tasks
- **Automatic Fallback**: Seamless provider switching for reliability
- **Rate Limiting**: Per-provider request limiting with smart queuing

### 💬 Chat Generation
- **Contextual Responses**: Generate appropriate responses based on conversation history
- **Conversation Memory**: Maintain context across multiple interactions
- **Temperature Control**: Adjust creativity vs consistency based on use case
- **Token Management**: Optimize token usage and costs

### 📊 Message Analysis
- **Sentiment Analysis**: Detect customer emotions and satisfaction levels
- **Intent Classification**: Identify customer intentions and route appropriately
- **Entity Extraction**: Extract names, emails, phone numbers, and other data
- **Priority Assessment**: Automatically prioritize messages based on urgency

### 🎯 Smart Features
- **Custom Prompts**: Tenant-specific AI prompts for different business needs
- **Content Filtering**: Automatic filtering of inappropriate content
- **Usage Tracking**: Monitor AI usage and costs per user/tenant
- **Conversation Context**: Maintain rich conversation state and history

## 🔧 Installation & Setup

### 1. Dependencies
The AI assistant is already integrated into the PyTake backend. Dependencies are managed through `Cargo.toml`:

```toml
# AI integration dependencies
async-trait = "0.1"
dashmap = "5.5"
tiktoken-rs = "0.5"
leaky-bucket = "1.0"
```

### 2. Environment Configuration
Copy the environment template and configure your API keys:

```bash
cp backend/.env.ai.example backend/.env
```

Edit `.env` with your API keys:
```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key-here

# Anthropic Configuration
ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key-here

# Optional configurations
AI_DEFAULT_PROVIDER=auto
AI_CONTENT_FILTER_ENABLED=true
```

### 3. Start the Server
```bash
cd backend/simple_api
cargo run
```

The AI endpoints will be available at `http://localhost:8080/api/v1/ai/*`

## 📚 API Documentation

### Endpoints Overview
- `POST /api/v1/ai/chat` - Generate AI responses
- `POST /api/v1/ai/analyze` - Analyze messages
- `POST /api/v1/ai/classify` - Classify intents
- `GET /api/v1/ai/prompts` - List custom prompts
- `POST /api/v1/ai/prompts` - Create custom prompts
- `GET /api/v1/ai/usage/{user_id}` - Get usage statistics

Full API documentation with examples is available in:
- **Swagger UI**: http://localhost:8080/docs
- **Usage Examples**: [examples/ai_usage_examples.md](examples/ai_usage_examples.md)

## 🔒 Security Features

### Content Filtering
Automatic content filtering prevents processing of inappropriate messages:
- Blocks harmful, illegal, or offensive content
- Configurable filter strictness
- Safe fallback responses for filtered content

### Rate Limiting
Built-in rate limiting prevents API abuse:
- **OpenAI**: 60 requests/minute (configurable)
- **Anthropic**: 50 requests/minute (configurable)
- Per-user daily limits with monitoring

### Input Validation
- Message sanitization and validation
- Token limit enforcement
- Request size limits
- Type safety with Rust's type system

## 📈 Monitoring & Analytics

### Usage Tracking
- Total requests per user
- Token consumption monitoring
- Daily usage statistics
- Provider performance metrics

### Error Handling
- Comprehensive error types with detailed messages
- Automatic retry with exponential backoff
- Provider fallback on failures
- Detailed logging for debugging

## 🧪 Testing

### Unit Tests
```bash
cargo test ai_assistant_tests
```

### Integration Tests
For full integration testing with real API keys:
```bash
# Set your API keys
export OPENAI_API_KEY="your-key"
export ANTHROPIC_API_KEY="your-key"

# Run integration tests (uncomment in test file)
cargo test integration_tests_with_api_keys
```

## 🚀 Production Deployment

### Performance Optimization
- Async/await for non-blocking operations
- Connection pooling for efficient resource usage
- Smart caching for similar queries
- Batch processing capabilities

### Scalability
- Stateless design for horizontal scaling
- Distributed conversation storage with DashMap
- Provider load balancing
- Graceful degradation on provider failures

### Monitoring
- Structured logging with tracing
- Metrics collection for usage patterns
- Error tracking and alerting
- Performance monitoring

## 💼 Business Use Cases

### Customer Support Automation
- Automatic response generation for common queries
- Sentiment analysis for escalation routing
- Intent classification for department routing
- Quality assessment for agent training

### Sales Assistance
- Product recommendation based on customer queries
- Lead qualification through conversation analysis
- Personalized responses based on customer history
- Upselling opportunities identification

### Content Moderation
- Inappropriate content detection
- Spam filtering for WhatsApp Business
- Compliance monitoring for regulated industries
- Brand safety protection

## 🔧 Configuration Options

### AI Provider Settings
```rust
// Rust configuration example
let ai_service = AIService::new();

// Provider selection
let response = ai_service.chat(ChatRequest {
    preferred_provider: Some(AIProvider::OpenAI), // or Anthropic, Auto
    temperature: Some(0.7), // Creativity control
    max_tokens: Some(500),  // Response length limit
    // ... other options
}).await?;
```

### Custom Prompts
```json
{
  "name": "E-commerce Support",
  "template": "You are {{agent_name}} from {{company_name}}. Help customer {{customer_name}} with {{issue_type}}. Be {{tone}} and professional.",
  "variables": ["agent_name", "company_name", "customer_name", "issue_type", "tone"]
}
```

## 📖 Integration Examples

### WhatsApp Webhook Integration
```rust
// Process incoming WhatsApp message
pub async fn process_whatsapp_message(
    message: WhatsAppMessage,
    ai_service: web::Data<AIService>,
) -> Result<String> {
    // Analyze message
    let analysis = ai_service.analyze(AnalyzeRequest {
        message: message.text.clone(),
        user_id: message.from.clone(),
        analysis_type: vec![AnalysisType::Sentiment, AnalysisType::Intent],
        context: Some(get_customer_context(&message.from).await),
    }).await?;

    // Generate response
    let response = ai_service.chat(ChatRequest {
        message: message.text,
        user_id: message.from,
        conversation_id: message.conversation_id,
        context: Some(build_context(&analysis)),
        preferred_provider: Some(AIProvider::Auto),
        temperature: Some(0.7),
        include_history: Some(true),
    }).await?;

    Ok(response.response)
}
```

## 🛠️ Development

### Adding New AI Providers
Implement the `AIProviderTrait`:

```rust
#[async_trait]
impl AIProviderTrait for NewProvider {
    async fn chat_completion(&self, messages: &[ConversationMessage], ...) -> Result<String, AIError> {
        // Implementation
    }
    
    async fn analyze_message(&self, message: &str, ...) -> Result<HashMap<String, serde_json::Value>, AIError> {
        // Implementation
    }
    
    // ... other required methods
}
```

### Custom Analysis Types
Extend the `AnalysisType` enum:

```rust
#[derive(Debug, Serialize, Deserialize, ToSchema, Clone)]
#[serde(rename_all = "snake_case")]
pub enum AnalysisType {
    // Existing types...
    CustomAnalysis,     // Your new analysis type
    BusinessMetrics,    // Another custom type
}
```

## 📞 Support & Troubleshooting

### Common Issues

1. **"Service Unavailable" Errors**
   - Check API keys are set correctly
   - Verify network connectivity to AI providers
   - Check rate limiting status

2. **Content Filter Violations**
   - Review message content for inappropriate terms
   - Adjust filter settings if needed
   - Check custom blocked patterns

3. **High Token Usage**
   - Optimize conversation history length
   - Reduce max_tokens parameter
   - Use appropriate temperature settings

### Debug Mode
Enable detailed logging:
```bash
RUST_LOG=simple_api::ai_assistant=debug cargo run
```

## 🔮 Future Enhancements

- **Caching Layer**: Redis integration for response caching
- **Advanced Analytics**: ML-based conversation insights
- **Multi-Language Support**: Automatic language detection and translation
- **Custom Model Training**: Fine-tuning for specific business domains
- **Voice Integration**: Speech-to-text and text-to-speech capabilities

## 📄 License

This AI Assistant integration is part of the PyTake project and follows the same licensing terms.

---

**Built with ❤️ using Rust, OpenAI, and Anthropic Claude**