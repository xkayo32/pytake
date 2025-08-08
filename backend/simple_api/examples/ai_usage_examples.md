# PyTake AI Assistant - Usage Examples

## Overview
The PyTake AI Assistant provides powerful AI integration with OpenAI and Anthropic models for WhatsApp business automation.

## Configuration

### Environment Variables
```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key-here

# Anthropic Configuration  
ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key-here

# Optional: Default provider (openai, anthropic, or auto)
AI_DEFAULT_PROVIDER=auto
```

## API Endpoints

### 1. Chat Generation - `/api/v1/ai/chat`

Generate AI responses for customer conversations.

**Request:**
```bash
curl -X POST http://localhost:8080/api/v1/ai/chat \
-H "Content-Type: application/json" \
-d '{
  "message": "Olá! Gostaria de saber mais sobre seus produtos",
  "user_id": "user123",
  "conversation_id": "conv456",
  "context": {
    "system_prompt": "Você é um atendente virtual da empresa XYZ. Seja cordial e prestativo.",
    "customer_name": "João Silva",
    "product_category": "electronics"
  },
  "preferred_provider": "openai",
  "max_tokens": 500,
  "temperature": 0.7,
  "include_history": true
}'
```

**Response:**
```json
{
  "response": "Olá João! Fico feliz em ajudá-lo! Nossa empresa XYZ oferece uma ampla gama de produtos eletrônicos de alta qualidade...",
  "provider": "openai",
  "tokens_used": 85,
  "conversation_id": "conv456",
  "confidence": 0.8,
  "metadata": {
    "processing_time_ms": "1250",
    "provider": "OpenAI"
  }
}
```

### 2. Message Analysis - `/api/v1/ai/analyze`

Analyze customer messages for insights.

**Request:**
```bash
curl -X POST http://localhost:8080/api/v1/ai/analyze \
-H "Content-Type: application/json" \
-d '{
  "message": "Estou muito insatisfeito com o produto que comprei! Quero meu dinheiro de volta!!!",
  "user_id": "user123",
  "analysis_type": ["sentiment", "intent", "priority", "entity"],
  "context": {
    "previous_purchases": "smartphone",
    "customer_tier": "premium"
  }
}'
```

**Response:**
```json
{
  "analysis": {
    "sentiment": {
      "polarity": "negative",
      "score": -0.8,
      "emotions": ["anger", "frustration"]
    },
    "intent": {
      "primary": "refund_request",
      "confidence": 0.9,
      "secondary": ["complaint", "product_issue"]
    },
    "priority": {
      "level": "high",
      "reason": "negative_sentiment_premium_customer"
    },
    "entity": {
      "customer_tier": "premium",
      "product_mentioned": "smartphone",
      "action_requested": "refund"
    }
  },
  "confidence": {
    "sentiment": 0.9,
    "intent": 0.85,
    "priority": 0.8,
    "entity": 0.75
  },
  "provider": "openai",
  "processing_time_ms": 890
}
```

### 3. Intent Classification - `/api/v1/ai/classify`

Classify customer message intents.

**Request:**
```bash
curl -X POST http://localhost:8080/api/v1/ai/classify \
-H "Content-Type: application/json" \
-d '{
  "message": "Oi, vocês fazem entrega no final de semana?",
  "user_id": "user123",
  "available_intents": [
    "greeting",
    "product_inquiry",
    "delivery_question",
    "pricing_question",
    "support_request",
    "goodbye"
  ],
  "context": {
    "time_of_day": "evening",
    "day_of_week": "friday"
  }
}'
```

**Response:**
```json
{
  "intent": "delivery_question",
  "confidence": 0.92,
  "alternatives": [
    {
      "intent": "support_request",
      "confidence": 0.15
    },
    {
      "intent": "product_inquiry", 
      "confidence": 0.08
    }
  ],
  "entities": {
    "time_reference": "final de semana",
    "service_type": "entrega"
  },
  "provider": "openai"
}
```

### 4. Custom Prompts - `/api/v1/ai/prompts`

Manage custom prompts for different use cases.

**Create Custom Prompt:**
```bash
curl -X POST http://localhost:8080/api/v1/ai/prompts \
-H "Content-Type: application/json" \
-d '{
  "name": "E-commerce Support",
  "description": "Customer support for e-commerce platform",
  "template": "Você é {{agent_name}}, atendente da {{company_name}}. Cliente: {{customer_name}}, histórico: {{purchase_history}}. Seja {{tone}} e ajude com {{request_type}}.",
  "variables": ["agent_name", "company_name", "customer_name", "purchase_history", "tone", "request_type"],
  "tenant_id": "tenant123"
}'
```

**List Custom Prompts:**
```bash
curl -X GET http://localhost:8080/api/v1/ai/prompts
```

### 5. Usage Statistics - `/api/v1/ai/usage/{user_id}`

Monitor AI usage per user.

**Request:**
```bash
curl -X GET http://localhost:8080/api/v1/ai/usage/user123
```

**Response:**
```json
{
  "user_id": "user123",
  "total_requests": 156,
  "total_tokens": 12450,
  "last_request": "2025-08-08T10:30:00Z",
  "requests_today": 23
}
```

## Integration Examples

### WhatsApp Business Integration

```javascript
// Example integration with WhatsApp webhook
const processWhatsAppMessage = async (webhookData) => {
  const { from, message } = webhookData;
  
  // 1. Analyze the message
  const analysis = await fetch('/api/v1/ai/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: message.text,
      user_id: from,
      analysis_type: ['sentiment', 'intent', 'priority']
    })
  });
  
  // 2. Generate appropriate response
  const response = await fetch('/api/v1/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: message.text,
      user_id: from,
      conversation_id: webhookData.conversation_id,
      context: {
        system_prompt: "Você é um assistente virtual. Seja prestativo e profissional.",
        sentiment: analysis.sentiment,
        intent: analysis.intent
      }
    })
  });
  
  // 3. Send response via WhatsApp API
  return sendWhatsAppMessage(from, response.response);
};
```

### Customer Service Automation

```python
# Python example for customer service automation
import requests
import json

class AICustomerService:
    def __init__(self, base_url="http://localhost:8080/api/v1/ai"):
        self.base_url = base_url
    
    async def handle_customer_message(self, customer_id, message, context=None):
        # Step 1: Classify intent
        intent_response = await self.classify_intent(customer_id, message)
        
        # Step 2: Route based on intent
        if intent_response['intent'] in ['complaint', 'refund_request']:
            return await self.handle_escalation(customer_id, message, intent_response)
        elif intent_response['intent'] in ['product_inquiry', 'pricing_question']:
            return await self.generate_product_response(customer_id, message, context)
        else:
            return await self.generate_general_response(customer_id, message, context)
    
    async def classify_intent(self, customer_id, message):
        payload = {
            "message": message,
            "user_id": customer_id,
            "available_intents": [
                "greeting", "product_inquiry", "pricing_question", 
                "complaint", "refund_request", "support_request", "goodbye"
            ]
        }
        
        response = requests.post(f"{self.base_url}/classify", json=payload)
        return response.json()
    
    async def generate_product_response(self, customer_id, message, context):
        payload = {
            "message": message,
            "user_id": customer_id,
            "conversation_id": f"conv_{customer_id}",
            "context": {
                "system_prompt": "Você é especialista em produtos. Forneça informações detalhadas e precisas.",
                **context
            },
            "temperature": 0.3  # Lower temperature for factual responses
        }
        
        response = requests.post(f"{self.base_url}/chat", json=payload)
        return response.json()
```

## Best Practices

### 1. Provider Selection
- Use `"auto"` for automatic fallback between providers
- Choose `"openai"` for general conversations and creativity
- Choose `"anthropic"` for analytical tasks and reasoning

### 2. Temperature Settings
- **0.1-0.3**: Factual, consistent responses (customer support, FAQ)
- **0.5-0.7**: Balanced responses (general conversation)
- **0.8-1.0**: Creative responses (marketing content, brainstorming)

### 3. Context Management
- Include relevant customer information in context
- Use conversation history for continuity
- Set appropriate system prompts for different scenarios

### 4. Rate Limiting
- Monitor usage statistics to avoid API limits
- Implement client-side rate limiting for high-volume applications
- Use caching for frequently asked questions

### 5. Error Handling
```javascript
const handleAIRequest = async (payload) => {
  try {
    const response = await fetch('/api/v1/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (response.status === 429) {
      // Rate limit exceeded - implement exponential backoff
      await delay(Math.pow(2, retryCount) * 1000);
      return handleAIRequest(payload);
    }
    
    if (response.status === 400) {
      // Content filter violation - use fallback response
      return { response: "Desculpe, não posso processar essa mensagem." };
    }
    
    return await response.json();
  } catch (error) {
    console.error('AI request failed:', error);
    return { response: "Desculpe, estou com dificuldades técnicas no momento." };
  }
};
```

## Security Considerations

1. **Content Filtering**: All messages are automatically filtered for inappropriate content
2. **Rate Limiting**: Built-in rate limiting prevents API abuse
3. **Input Sanitization**: All inputs are validated and sanitized
4. **API Key Security**: Never expose API keys in client-side code
5. **Usage Monitoring**: Track and monitor AI usage for anomalies

## Performance Tips

1. **Caching**: Implement caching for similar queries
2. **Batch Processing**: Process multiple messages together when possible
3. **Async Operations**: Use async/await for non-blocking operations
4. **Token Management**: Monitor token usage to optimize costs
5. **Provider Fallback**: Always configure multiple providers for reliability