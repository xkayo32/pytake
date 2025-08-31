# AI Services API Specification

Este documento especifica as APIs backend necessárias para os serviços de IA do sistema de atendimento.

## Overview

As APIs de IA fornecem funcionalidades de:
- Geração de sugestões automáticas de respostas
- Análise de sentimento em tempo real
- Classificação automática de intenções
- Chatbot inteligente com fallback humano
- Analytics e insights consolidados

## Base URL

```
/api/v1/ai
```

## Authentication

Todas as rotas requerem autenticação via Bearer token:

```
Authorization: Bearer <jwt_token>
```

## Rate Limiting

- 100 requests por minuto por usuário para operações normais
- 500 requests por minuto para analytics
- 10 requests por minuto para operações de training/feedback

---

## 1. Suggestion Engine API

### POST /suggestions

Gera sugestões de resposta baseadas no contexto da conversa.

**Request Body:**
```json
{
  "conversation": {
    "id": "string",
    "customerId": "string",
    "messages": [
      {
        "id": "string",
        "content": "string",
        "sender": "agent|customer",
        "timestamp": "2024-01-01T10:00:00Z"
      }
    ],
    "category": "support|sales|complaint|question|compliment",
    "tags": ["string"]
  },
  "agentProfile": {
    "id": "string",
    "name": "string",
    "expertise": ["string"],
    "preferredResponseStyle": "concise|detailed|empathetic"
  },
  "currentMessage": "string",
  "templates": [
    {
      "id": "string",
      "title": "string",
      "content": "string",
      "category": "string",
      "successRate": 0.85
    }
  ],
  "knowledgeItems": [
    {
      "id": "string",
      "question": "string",
      "answer": "string",
      "keywords": ["string"],
      "confidence": 0.9
    }
  ]
}
```

**Response:**
```json
{
  "suggestions": [
    {
      "id": "string",
      "text": "string",
      "confidence": 0.85,
      "category": "greeting|information|solution|escalation|closing",
      "reasoning": "string",
      "personalizable": true,
      "shortcuts": ["string"],
      "followUpQuestions": ["string"],
      "estimatedResponseTime": 3
    }
  ],
  "metadata": {
    "processingTime": 150,
    "source": "ai|template|knowledge_base",
    "modelVersion": "v1.2.0"
  }
}
```

### POST /suggestions/feedback

Registra feedback sobre uso de sugestão para melhorar o modelo.

**Request Body:**
```json
{
  "suggestionId": "string",
  "context": { /* SuggestionContext */ },
  "feedback": {
    "used": true,
    "edited": false,
    "finalText": "string",
    "customerSatisfaction": 4.5,
    "resolved": true
  },
  "timestamp": "2024-01-01T10:00:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Feedback registrado com sucesso"
}
```

### GET /suggestions/stats

Obtém estatísticas de uso das sugestões.

**Response:**
```json
{
  "totalSuggestions": 2847,
  "usageRate": 0.78,
  "satisfactionImpact": 0.15,
  "topSuggestionTypes": [
    {
      "category": "information",
      "count": 892,
      "percentage": 0.31
    }
  ],
  "averageConfidence": 0.82,
  "modelAccuracy": 0.87
}
```

---

## 2. Sentiment Analysis API

### POST /sentiment

Analisa sentimento de uma mensagem.

**Request Body:**
```json
{
  "message": "string",
  "context": [
    {
      "messageId": "string",
      "message": "string",
      "sentiment": { /* SentimentResult */ },
      "timestamp": "2024-01-01T10:00:00Z"
    }
  ]
}
```

**Response:**
```json
{
  "sentiment": {
    "sentiment": "very_positive|positive|neutral|negative|very_negative",
    "confidence": 0.87,
    "score": 0.65,
    "emotions": {
      "anger": 0.1,
      "frustration": 0.2,
      "satisfaction": 0.8,
      "confusion": 0.0,
      "urgency": 0.3,
      "politeness": 0.9,
      "gratitude": 0.7,
      "impatience": 0.1
    },
    "urgency": "low|medium|high|critical",
    "indicators": [
      {
        "type": "positive|negative|neutral",
        "text": "obrigado",
        "weight": 0.8,
        "category": "word|phrase|punctuation|pattern"
      }
    ],
    "suggestions": [
      "Use linguagem empática e calma",
      "Demonstre compreensão do problema"
    ]
  },
  "metadata": {
    "processingTime": 95,
    "modelVersion": "v2.1.0",
    "language": "pt-BR"
  }
}
```

### POST /sentiment/bulk

Analisa sentimento de múltiplas mensagens.

**Request Body:**
```json
{
  "messages": [
    {
      "id": "string",
      "content": "string",
      "timestamp": "2024-01-01T10:00:00Z"
    }
  ]
}
```

**Response:**
```json
{
  "results": {
    "message_id_1": { /* SentimentResult */ },
    "message_id_2": { /* SentimentResult */ }
  },
  "summary": {
    "totalProcessed": 10,
    "averageScore": 0.42,
    "distributionByCategory": {
      "positive": 6,
      "neutral": 2,
      "negative": 2
    }
  }
}
```

### GET /sentiment/stats

Obtém estatísticas globais de análise de sentimento.

**Query Parameters:**
- `startDate`: string (ISO date)
- `endDate`: string (ISO date)
- `groupBy`: string ("day"|"week"|"month")

**Response:**
```json
{
  "totalAnalyses": 2450,
  "sentimentDistribution": {
    "very_positive": 0.15,
    "positive": 0.35,
    "neutral": 0.25,
    "negative": 0.20,
    "very_negative": 0.05
  },
  "averageUrgency": 0.3,
  "topEmotions": [
    {
      "emotion": "satisfaction",
      "percentage": 0.45
    }
  ],
  "trendAnalysis": {
    "sentimentTrend": "improving|declining|stable",
    "weekOverWeekChange": 0.05
  }
}
```

---

## 3. Intent Classification API

### POST /intent

Classifica intenção de uma mensagem.

**Request Body:**
```json
{
  "message": "string",
  "context": {
    "conversationStage": "opening|middle|closing|escalated",
    "customerTier": "regular|premium|vip",
    "previousIntents": ["string"],
    "timeOfDay": "morning|afternoon|evening|night",
    "channel": "chat|email|phone|social",
    "isFollowUp": false
  },
  "language": "pt-BR"
}
```

**Response:**
```json
{
  "intent": {
    "primary": {
      "name": "question_how_to",
      "type": "question",
      "confidence": 0.87,
      "description": "Perguntas sobre como fazer algo"
    },
    "secondary": {
      "name": "request_support",
      "type": "request",
      "confidence": 0.65,
      "description": "Solicitações de suporte"
    },
    "confidence": 0.87,
    "entities": [
      {
        "entity": "email",
        "value": "user@example.com",
        "confidence": 0.95,
        "position": {
          "start": 10,
          "end": 25
        },
        "type": "email"
      }
    ],
    "context": { /* IntentContext */ },
    "urgency": "medium",
    "actionRequired": true,
    "suggestedActions": [
      "Buscar informações na base de conhecimento",
      "Fornecer resposta detalhada"
    ],
    "routing": {
      "department": "technical",
      "skillRequired": ["troubleshooting"],
      "priority": 3
    }
  }
}
```

### POST /intent/bulk

Classifica múltiplas mensagens.

**Request Body:**
```json
{
  "messages": [
    {
      "id": "string",
      "content": "string",
      "context": { /* IntentContext */ }
    }
  ]
}
```

### POST /intent/train

Treina o classificador com dados rotulados.

**Request Body:**
```json
{
  "text": "string",
  "intent": "string",
  "entities": [
    {
      "entity": "string",
      "value": "string",
      "type": "string"
    }
  ],
  "metadata": {},
  "timestamp": "2024-01-01T10:00:00Z"
}
```

### GET /intent/stats

Obtém estatísticas de classificação.

**Response:**
```json
{
  "totalClassifications": 3240,
  "intentDistribution": {
    "question": 0.35,
    "problem_report": 0.20,
    "request": 0.15
  },
  "accuracyMetrics": {
    "overallAccuracy": 0.87,
    "precisionByIntent": {
      "greeting": 0.95,
      "complaint": 0.88
    },
    "recallByIntent": {
      "greeting": 0.93,
      "complaint": 0.85
    }
  },
  "commonEntities": {
    "email": 0.45,
    "phone": 0.30,
    "order_id": 0.25
  }
}
```

---

## 4. Chatbot API

### POST /chatbot/generate

Gera resposta automática do chatbot.

**Request Body:**
```json
{
  "message": "string",
  "intent": { /* IntentResult */ },
  "sentiment": { /* SentimentResult */ },
  "context": {
    "conversationId": "string",
    "previousMessages": [
      {
        "id": "string",
        "content": "string",
        "sender": "bot|user|agent"
      }
    ],
    "currentTopic": "string"
  }
}
```

**Response:**
```json
{
  "response": "string",
  "confidence": 0.85,
  "shouldTransferToHuman": false,
  "transferReason": "string",
  "followUpQuestions": ["string"],
  "suggestedActions": ["string"],
  "metadata": {
    "responseSource": "template|knowledge_base|ai_generated",
    "processingTime": 1200,
    "modelUsed": "gpt-4-turbo"
  }
}
```

### POST /chatbot/feedback

Registra feedback sobre resposta do chatbot.

**Request Body:**
```json
{
  "messageId": "string",
  "rating": 4,
  "wasHelpful": true,
  "comment": "string",
  "timestamp": "2024-01-01T10:00:00Z"
}
```

### GET /chatbot/stats

Obtém estatísticas do chatbot.

**Response:**
```json
{
  "totalInteractions": 1842,
  "automatedResponses": 1398,
  "humanTransfers": 444,
  "averageResponseTime": 1.2,
  "customerSatisfaction": 4.2,
  "resolutionRate": 0.76,
  "topIntents": [
    {
      "intent": "question",
      "count": 567
    }
  ],
  "escalationReasons": [
    {
      "reason": "Sentimento muito negativo",
      "count": 134
    }
  ]
}
```

---

## 5. Knowledge Base API

### POST /knowledge/search

Busca na base de conhecimento.

**Request Body:**
```json
{
  "query": "string",
  "filters": {
    "category": "string",
    "minConfidence": 0.8,
    "limit": 10
  }
}
```

**Response:**
```json
{
  "items": [
    {
      "id": "string",
      "question": "string",
      "answer": "string",
      "category": "string",
      "confidence": 0.95,
      "keywords": ["string"],
      "lastUsed": "2024-01-01T10:00:00Z",
      "usageCount": 45,
      "successRate": 0.87
    }
  ],
  "totalFound": 25,
  "searchTime": 45
}
```

### POST /knowledge

Adiciona item à base de conhecimento.

**Request Body:**
```json
{
  "question": "string",
  "answer": "string",
  "keywords": ["string"],
  "category": "string"
}
```

### PUT /knowledge/{id}

Atualiza item da base de conhecimento.

---

## 6. Templates API

### GET /templates

Obtém templates de resposta.

**Query Parameters:**
- `category`: string
- `tags`: string (comma-separated)
- `minSuccessRate`: number

**Response:**
```json
{
  "templates": [
    {
      "id": "string",
      "title": "string",
      "content": "string",
      "category": "string",
      "tags": ["string"],
      "usageCount": 150,
      "successRate": 0.92,
      "variables": {
        "customerName": "",
        "agentName": ""
      },
      "triggers": {
        "intents": ["greeting"],
        "keywords": ["oi", "olá"],
        "patterns": ["^(oi|olá)"]
      }
    }
  ]
}
```

### POST /templates

Cria novo template.

---

## 7. Analytics API

### GET /analytics/metrics

Obtém métricas consolidadas.

**Query Parameters:**
- `startDate`: string (ISO date)
- `endDate`: string (ISO date)

**Response:**
```json
{
  "suggestions": {
    "totalGenerated": 2847,
    "usageRate": 0.78,
    "satisfactionImpact": 0.15
  },
  "sentiment": {
    "totalAnalyses": 1956,
    "positivePercentage": 45.2,
    "negativePercentage": 18.7,
    "averageScore": 0.31
  },
  "intents": {
    "totalClassifications": 2134,
    "accuracy": 0.87,
    "escalationRate": 0.12
  },
  "chatbot": {
    "totalInteractions": 1432,
    "automationRate": 0.73,
    "humanTransfers": 387,
    "satisfactionRating": 4.1
  },
  "overall": {
    "totalOperations": 8369,
    "healthScore": 85,
    "automationRate": 0.73,
    "customerSatisfaction": 4.2
  }
}
```

### GET /analytics/insights

Obtém insights automáticos.

**Query Parameters:**
- `limit`: number (default: 10)

**Response:**
```json
{
  "insights": [
    {
      "id": "string",
      "type": "chatbot|sentiment|suggestion|intent|performance",
      "title": "string",
      "description": "string",
      "value": "73%",
      "change": 5.2,
      "trend": "up|down|stable",
      "severity": "low|medium|high|critical",
      "actionable": true,
      "timestamp": "2024-01-01T10:00:00Z",
      "recommendations": ["string"]
    }
  ]
}
```

### GET /analytics/export

Exporta dados para análise.

**Query Parameters:**
- `type`: string ("suggestions"|"sentiment"|"intents"|"chatbot"|"all")
- `format`: string ("csv"|"json"|"xlsx")
- `startDate`: string (ISO date)
- `endDate`: string (ISO date)

**Response:** Binary file download

---

## 8. Configuration API

### GET /config

Obtém configurações dos serviços.

### PUT /config/{service}

Atualiza configuração de um serviço específico.

---

## 9. Health Check API

### GET /health

Verifica status dos serviços.

**Response:**
```json
{
  "status": "healthy|degraded|down",
  "services": {
    "suggestions": "up|down",
    "sentiment": "up|down",
    "intents": "up|down",
    "chatbot": "up|down",
    "analytics": "up|down"
  },
  "responseTime": 150,
  "timestamp": "2024-01-01T10:00:00Z",
  "version": "1.0.0"
}
```

---

## Error Responses

Todas as APIs retornam erros no seguinte formato:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Mensagem de erro legível",
    "details": {
      "field": "Detalhes específicos do erro"
    }
  },
  "timestamp": "2024-01-01T10:00:00Z"
}
```

### Códigos de Erro Comuns

- `AUTHENTICATION_REQUIRED`: Token de autenticação necessário
- `INVALID_TOKEN`: Token inválido ou expirado
- `RATE_LIMIT_EXCEEDED`: Limite de requests excedido
- `VALIDATION_ERROR`: Dados de entrada inválidos
- `SERVICE_UNAVAILABLE`: Serviço temporariamente indisponível
- `MODEL_ERROR`: Erro no processamento do modelo de IA
- `INTERNAL_ERROR`: Erro interno do servidor

---

## Implementação

As APIs devem ser implementadas usando:

1. **Framework**: Go com Gin/Echo
2. **Database**: PostgreSQL para dados estruturados
3. **Cache**: Redis para cache de resultados
4. **Queue**: RabbitMQ para processamento assíncrono
5. **Logging**: Structured logging com níveis apropriados
6. **Monitoring**: Métricas Prometheus + Grafana
7. **AI Services**: Integração com OpenAI, Anthropic, ou modelos locais

### Considerações de Performance

1. **Caching**: Cache agressivo para resultados de análise
2. **Rate Limiting**: Implementar rate limiting por usuário/IP
3. **Async Processing**: Processamento assíncrono para operações pesadas
4. **Connection Pooling**: Pool de conexões para database
5. **Circuit Breaker**: Para chamadas externas de IA

### Segurança

1. **Authentication**: JWT tokens com expiração
2. **Authorization**: RBAC para diferentes níveis de acesso
3. **Input Validation**: Validação rigorosa de todos os inputs
4. **Data Encryption**: Criptografia para dados sensíveis
5. **Audit Logging**: Log de todas as operações importantes