# 🔌 API Documentation - PyTake

## 📋 Índice
- [Introdução](#introdução)
- [Autenticação](#autenticação)
- [Rate Limiting](#rate-limiting)
- [Endpoints](#endpoints)
- [Webhooks](#webhooks)
- [Códigos de Erro](#códigos-de-erro)
- [Exemplos](#exemplos)

---

## 🎯 Introdução

A API PyTake é RESTful e retorna respostas em JSON. Base URL:

```
Production: https://api.pytake.com/v1
Staging: https://api-staging.pytake.com/v1
```

### Características
- **Protocolo**: HTTPS obrigatório
- **Formato**: JSON
- **Versionamento**: URL path (`/v1`)
- **Autenticação**: API Key (Bearer Token)
- **Rate Limiting**: 1000 req/min por organização

---

## 🔐 Autenticação

### API Keys

Gere uma API Key no dashboard: **Settings → API Keys → Create New Key**

**Header obrigatório:**
```http
Authorization: Bearer {API_KEY}
```

**Exemplo:**
```bash
curl -X GET https://api.pytake.com/v1/contacts \
  -H "Authorization: Bearer pytake_live_abc123xyz456"
```

### Scopes (Permissões)

- `contacts:read` - Ler contatos
- `contacts:write` - Criar/editar contatos
- `messages:send` - Enviar mensagens
- `conversations:read` - Ler conversas
- `chatbots:read` - Ler chatbots
- `chatbots:write` - Criar/editar chatbots
- `campaigns:write` - Criar campanhas
- `analytics:read` - Acessar relatórios

---

## ⏱️ Rate Limiting

**Limites:**
- 1000 requests/minuto por organização
- 100 requests/segundo em bursts

**Headers de resposta:**
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 987
X-RateLimit-Reset: 1696348200
```

**Erro 429 (Too Many Requests):**
```json
{
  "error": {
    "code": "rate_limit_exceeded",
    "message": "Rate limit exceeded. Retry after 60 seconds.",
    "retry_after": 60
  }
}
```

---

## 📡 Endpoints

### Authentication

#### POST /auth/login
Autenticar usuário (retorna tokens)

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response 200:**
```json
{
  "access_token": "eyJhbGc...",
  "refresh_token": "eyJhbGc...",
  "token_type": "bearer",
  "expires_in": 900,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "João Silva",
    "role": "org_admin"
  }
}
```

#### POST /auth/refresh
Renovar access token

**Request:**
```json
{
  "refresh_token": "eyJhbGc..."
}
```

---

### Contacts

#### GET /contacts
Listar contatos

**Query Parameters:**
- `page` (int): Página (default: 1)
- `limit` (int): Itens por página (default: 50, max: 100)
- `search` (string): Buscar por nome/telefone/email
- `tags` (array): Filtrar por tags
- `opt_in` (bool): Filtrar por opt-in status

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "whatsapp_id": "+5511999999999",
      "name": "João Silva",
      "email": "joao@example.com",
      "tags": ["lead", "interested"],
      "attributes": {
        "city": "São Paulo",
        "age": 30
      },
      "opt_in": true,
      "last_message_at": "2025-10-03T14:30:00Z",
      "created_at": "2025-09-01T10:00:00Z"
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 50,
    "total": 1250,
    "total_pages": 25
  }
}
```

#### POST /contacts
Criar contato

**Request:**
```json
{
  "whatsapp_id": "+5511999999999",
  "name": "Maria Santos",
  "email": "maria@example.com",
  "tags": ["customer"],
  "attributes": {
    "city": "Rio de Janeiro",
    "plan": "premium"
  }
}
```

**Response 201:**
```json
{
  "id": "uuid",
  "whatsapp_id": "+5511999999999",
  "name": "Maria Santos",
  "email": "maria@example.com",
  "tags": ["customer"],
  "attributes": {
    "city": "Rio de Janeiro",
    "plan": "premium"
  },
  "opt_in": true,
  "created_at": "2025-10-03T15:00:00Z"
}
```

#### GET /contacts/{id}
Obter contato por ID

**Response 200:**
```json
{
  "id": "uuid",
  "whatsapp_id": "+5511999999999",
  "name": "João Silva",
  "email": "joao@example.com",
  "phone": "+5511999999999",
  "whatsapp_profile_pic_url": "https://...",
  "tags": ["lead", "vip"],
  "attributes": {
    "city": "São Paulo",
    "age": 30
  },
  "opt_in": true,
  "is_blocked": false,
  "total_conversations": 15,
  "total_messages": 142,
  "last_message_at": "2025-10-03T14:30:00Z",
  "created_at": "2025-09-01T10:00:00Z",
  "updated_at": "2025-10-03T14:30:00Z"
}
```

#### PATCH /contacts/{id}
Atualizar contato

**Request:**
```json
{
  "name": "João Pedro Silva",
  "tags": ["customer", "vip"],
  "attributes": {
    "plan": "enterprise"
  }
}
```

#### DELETE /contacts/{id}
Deletar contato (soft delete)

**Response 204:** No content

---

### Messages

#### POST /messages
Enviar mensagem

**Request (texto):**
```json
{
  "to": "+5511999999999",
  "type": "text",
  "text": {
    "body": "Olá {{name}}! Sua senha é {{code}}."
  },
  "variables": {
    "name": "João",
    "code": "123456"
  }
}
```

**Request (imagem):**
```json
{
  "to": "+5511999999999",
  "type": "image",
  "image": {
    "url": "https://example.com/image.jpg",
    "caption": "Confira nossa promoção!"
  }
}
```

**Request (botões):**
```json
{
  "to": "+5511999999999",
  "type": "interactive",
  "interactive": {
    "type": "button",
    "body": {
      "text": "Escolha uma opção:"
    },
    "action": {
      "buttons": [
        {
          "type": "reply",
          "reply": {
            "id": "btn_1",
            "title": "Opção 1"
          }
        },
        {
          "type": "reply",
          "reply": {
            "id": "btn_2",
            "title": "Opção 2"
          }
        }
      ]
    }
  }
}
```

**Request (template):**
```json
{
  "to": "+5511999999999",
  "type": "template",
  "template": {
    "name": "welcome_message",
    "language": {
      "code": "pt_BR"
    },
    "components": [
      {
        "type": "body",
        "parameters": [
          {
            "type": "text",
            "text": "João"
          }
        ]
      }
    ]
  }
}
```

**Response 201:**
```json
{
  "id": "uuid",
  "whatsapp_message_id": "wamid.xxx",
  "to": "+5511999999999",
  "status": "sent",
  "created_at": "2025-10-03T15:30:00Z"
}
```

#### GET /messages/{id}
Obter status de mensagem

**Response 200:**
```json
{
  "id": "uuid",
  "whatsapp_message_id": "wamid.xxx",
  "conversation_id": "uuid",
  "direction": "outbound",
  "type": "text",
  "status": "read",
  "content": {
    "text": "Olá João!"
  },
  "sent_at": "2025-10-03T15:30:00Z",
  "delivered_at": "2025-10-03T15:30:05Z",
  "read_at": "2025-10-03T15:31:00Z",
  "created_at": "2025-10-03T15:30:00Z"
}
```

---

### Conversations

#### GET /conversations
Listar conversas

**Query Parameters:**
- `status` (string): open, pending, assigned, resolved, closed
- `assigned_to` (uuid): Filtrar por agente
- `page` (int)
- `limit` (int)

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "contact": {
        "id": "uuid",
        "name": "João Silva",
        "whatsapp_id": "+5511999999999"
      },
      "status": "open",
      "assigned_to": {
        "id": "uuid",
        "name": "Maria Agent"
      },
      "is_bot_active": false,
      "message_count": 15,
      "last_message_at": "2025-10-03T15:30:00Z",
      "created_at": "2025-10-03T14:00:00Z"
    }
  ],
  "meta": {
    "current_page": 1,
    "total": 50
  }
}
```

#### GET /conversations/{id}
Obter conversa com mensagens

**Response 200:**
```json
{
  "id": "uuid",
  "contact": {...},
  "status": "open",
  "assigned_to": {...},
  "messages": [
    {
      "id": "uuid",
      "direction": "inbound",
      "type": "text",
      "content": {
        "text": "Olá, preciso de ajuda"
      },
      "created_at": "2025-10-03T14:00:00Z"
    },
    {
      "id": "uuid",
      "direction": "outbound",
      "type": "text",
      "content": {
        "text": "Olá! Como posso ajudar?"
      },
      "status": "read",
      "created_at": "2025-10-03T14:01:00Z"
    }
  ],
  "created_at": "2025-10-03T14:00:00Z"
}
```

#### PATCH /conversations/{id}
Atualizar conversa

**Request:**
```json
{
  "status": "resolved",
  "assigned_to": "uuid",
  "tags": ["support", "resolved"]
}
```

---

### Chatbots

#### GET /chatbots
Listar chatbots

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Atendimento Comercial",
      "description": "Bot de vendas",
      "is_active": true,
      "is_published": true,
      "statistics": {
        "total_conversations": 1520,
        "total_messages": 8450
      },
      "created_at": "2025-09-01T10:00:00Z"
    }
  ]
}
```

#### GET /chatbots/{id}
Obter chatbot com fluxos

**Response 200:**
```json
{
  "id": "uuid",
  "name": "Atendimento Comercial",
  "description": "Bot de vendas",
  "is_active": true,
  "flows": [
    {
      "id": "uuid",
      "name": "Fluxo Principal",
      "type": "main",
      "is_active": true,
      "nodes": [...]
    }
  ],
  "settings": {
    "welcome_message": "Olá! Como posso ajudar?",
    "fallback_message": "Não entendi, pode reformular?",
    "handoff_enabled": true
  }
}
```

#### POST /chatbots
Criar chatbot

**Request:**
```json
{
  "name": "Suporte Técnico",
  "description": "Bot de suporte",
  "welcome_message": "Bem-vindo ao suporte!",
  "is_active": true
}
```

---

### Campaigns

#### POST /campaigns
Criar campanha

**Request:**
```json
{
  "name": "Promoção Black Friday",
  "target_type": "tags",
  "target_filters": {
    "tags": ["customer", "active"]
  },
  "template_id": "uuid",
  "message_content": {
    "template": "black_friday_promo",
    "variables": {
      "discount": "50%",
      "code": "BF2025"
    }
  },
  "scheduled_at": "2025-11-25T08:00:00Z",
  "send_rate_limit": 100
}
```

**Response 201:**
```json
{
  "id": "uuid",
  "name": "Promoção Black Friday",
  "status": "scheduled",
  "total_recipients": 1250,
  "scheduled_at": "2025-11-25T08:00:00Z",
  "created_at": "2025-10-03T16:00:00Z"
}
```

#### GET /campaigns/{id}
Obter campanha com métricas

**Response 200:**
```json
{
  "id": "uuid",
  "name": "Promoção Black Friday",
  "status": "completed",
  "total_recipients": 1250,
  "sent_count": 1248,
  "delivered_count": 1230,
  "read_count": 980,
  "failed_count": 2,
  "replied_count": 156,
  "delivery_rate": 98.6,
  "read_rate": 78.4,
  "reply_rate": 12.5,
  "started_at": "2025-11-25T08:00:00Z",
  "completed_at": "2025-11-25T08:45:00Z"
}
```

---

### Analytics

#### GET /analytics/overview
Dashboard geral

**Query Parameters:**
- `start_date` (ISO 8601): Data início
- `end_date` (ISO 8601): Data fim

**Response 200:**
```json
{
  "period": {
    "start": "2025-10-01T00:00:00Z",
    "end": "2025-10-03T23:59:59Z"
  },
  "conversations": {
    "total": 450,
    "new": 120,
    "resolved": 380,
    "avg_resolution_time_seconds": 1850
  },
  "messages": {
    "total": 2340,
    "inbound": 1180,
    "outbound": 1160
  },
  "contacts": {
    "total": 8520,
    "new": 85,
    "active": 450
  },
  "satisfaction": {
    "avg_rating": 4.5,
    "total_ratings": 150
  }
}
```

---

## 🪝 Webhooks

### Configurar Webhook

**Dashboard:** Settings → Webhooks → Create Webhook

**Campos:**
- URL (HTTPS obrigatório)
- Eventos (selecionar)
- Secret (para validação HMAC)

### Eventos Disponíveis

**Messages:**
- `message.received` - Nova mensagem recebida
- `message.sent` - Mensagem enviada
- `message.delivered` - Mensagem entregue
- `message.read` - Mensagem lida
- `message.failed` - Falha no envio

**Conversations:**
- `conversation.created` - Nova conversa
- `conversation.assigned` - Conversa atribuída
- `conversation.resolved` - Conversa resolvida

**Contacts:**
- `contact.created` - Novo contato
- `contact.updated` - Contato atualizado

### Payload

**message.received:**
```json
{
  "event": "message.received",
  "timestamp": "2025-10-03T16:30:00Z",
  "organization_id": "uuid",
  "data": {
    "message": {
      "id": "uuid",
      "whatsapp_message_id": "wamid.xxx",
      "type": "text",
      "content": {
        "text": "Olá, preciso de ajuda"
      },
      "created_at": "2025-10-03T16:30:00Z"
    },
    "conversation": {
      "id": "uuid",
      "status": "open"
    },
    "contact": {
      "id": "uuid",
      "name": "João Silva",
      "whatsapp_id": "+5511999999999"
    }
  }
}
```

### Validação de Assinatura

**Header enviado:**
```
X-PyTake-Signature: sha256=abcdef123456...
```

**Validar (Python):**
```python
import hmac
import hashlib

def validate_webhook(payload, signature, secret):
    expected = hmac.new(
        secret.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()

    received = signature.replace('sha256=', '')
    return hmac.compare_digest(expected, received)
```

### Retry Policy

- **Timeout**: 10 segundos
- **Retries**: 3 tentativas
- **Backoff**: Exponencial (1s, 2s, 4s)
- **Status codes considerados falha**: 4xx, 5xx, timeout

---

## ❌ Códigos de Erro

### HTTP Status Codes

| Code | Significado |
|------|-------------|
| 200 | OK - Sucesso |
| 201 | Created - Recurso criado |
| 204 | No Content - Sucesso sem corpo |
| 400 | Bad Request - Dados inválidos |
| 401 | Unauthorized - Não autenticado |
| 403 | Forbidden - Sem permissão |
| 404 | Not Found - Recurso não encontrado |
| 409 | Conflict - Conflito (ex: duplicata) |
| 422 | Unprocessable Entity - Validação falhou |
| 429 | Too Many Requests - Rate limit |
| 500 | Internal Server Error - Erro do servidor |
| 503 | Service Unavailable - Manutenção |

### Error Response Format

```json
{
  "error": {
    "code": "validation_error",
    "message": "Invalid request parameters",
    "details": [
      {
        "field": "whatsapp_id",
        "message": "Phone number must be in E.164 format"
      }
    ]
  }
}
```

### Error Codes

- `authentication_failed` - Credenciais inválidas
- `invalid_api_key` - API key inválida ou revogada
- `rate_limit_exceeded` - Rate limit excedido
- `validation_error` - Dados de entrada inválidos
- `resource_not_found` - Recurso não encontrado
- `duplicate_resource` - Recurso duplicado
- `insufficient_permissions` - Sem permissão
- `whatsapp_api_error` - Erro da API WhatsApp
- `internal_error` - Erro interno do servidor

---

## 📚 Exemplos

### Python

```python
import requests

API_KEY = "pytake_live_abc123"
BASE_URL = "https://api.pytake.com/v1"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

# Listar contatos
response = requests.get(
    f"{BASE_URL}/contacts",
    headers=headers,
    params={"limit": 100}
)
contacts = response.json()

# Enviar mensagem
response = requests.post(
    f"{BASE_URL}/messages",
    headers=headers,
    json={
        "to": "+5511999999999",
        "type": "text",
        "text": {
            "body": "Olá! Como posso ajudar?"
        }
    }
)
message = response.json()
```

### JavaScript (Node.js)

```javascript
const axios = require('axios');

const API_KEY = 'pytake_live_abc123';
const BASE_URL = 'https://api.pytake.com/v1';

const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json'
  }
});

// Listar contatos
const contacts = await client.get('/contacts', {
  params: { limit: 100 }
});

// Enviar mensagem
const message = await client.post('/messages', {
  to: '+5511999999999',
  type: 'text',
  text: {
    body: 'Olá! Como posso ajudar?'
  }
});
```

### cURL

```bash
# Listar contatos
curl -X GET "https://api.pytake.com/v1/contacts?limit=100" \
  -H "Authorization: Bearer pytake_live_abc123"

# Enviar mensagem
curl -X POST "https://api.pytake.com/v1/messages" \
  -H "Authorization: Bearer pytake_live_abc123" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+5511999999999",
    "type": "text",
    "text": {
      "body": "Olá! Como posso ajudar?"
    }
  }'
```

---

## 🔗 Links Úteis

- **Documentação interativa (Swagger)**: https://api.pytake.com/docs
- **SDKs**:
  - Python: https://github.com/pytake/pytake-python
  - JavaScript: https://github.com/pytake/pytake-js
  - PHP: https://github.com/pytake/pytake-php
- **Postman Collection**: https://www.postman.com/pytake/pytake-api
- **Status da API**: https://status.pytake.com

---

**Versão:** 1.0.0
**Última atualização:** 2025-10-03
