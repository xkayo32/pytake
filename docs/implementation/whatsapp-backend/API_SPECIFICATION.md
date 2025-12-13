# 📡 ESPECIFICAÇÃO TÉCNICA: APIs Backend → Frontend

**Autor:** Kayo Carvalho Fernandes  
**Data:** 12 de dezembro de 2025  
**Status:** Para Implementação  

---

## 🎯 PROPÓSITO

Este documento define **EXATAMENTE** que endpoints o backend fornecerá e como o frontend deve consumir.

Frontend **NÃO** precisa copiar a lógica do `useFlowSimulator` - isso é responsabilidade do backend.

---

## 1️⃣ WEBHOOK (Meta → Backend)

### GET `/api/v1/whatsapp/webhook`

**Propósito:** Verificação inicial do webhook (handshake Meta)

**Quando:** Meta chama esta rota 1x ao configurar o webhook  
**Quem chama:** Meta Cloud API (não é frontend)  
**Autenticação:** Token em query param

```
GET /api/v1/whatsapp/webhook?
  hub.mode=subscribe&
  hub.challenge=123456&
  hub.verify_token=seu_token_here

→ Response: 123456 (challenge string, 200 OK)
```

---

### POST `/api/v1/whatsapp/webhook`

**Propósito:** Receber mensagens incoming do WhatsApp

**Quando:** Usuário envia mensagem no WhatsApp  
**Quem chama:** Meta Cloud API (não é frontend)  
**Autenticação:** X-Hub-Signature-256 header

```json
POST /api/v1/whatsapp/webhook

Headers:
  X-Hub-Signature-256: sha256=abc123...

Body (Meta Cloud API payload):
{
  "object": "whatsapp_business_account",
  "entry": [{
    "id": "123456789",
    "changes": [{
      "value": {
        "messaging_product": "whatsapp",
        "metadata": {
          "phone_number_id": "111222333",
          "business_account_id": "555666777"
        },
        "messages": [{
          "from": "5511999999999",
          "id": "wamid.XYZ=",
          "timestamp": "1639169373",
          "text": { "body": "Olá, preciso de ajuda" }
        }]
      }
    }]
  }]
}

→ Response: 200 OK
{
  "status": "received"
}

(Backend processa async em background)
```

---

## 2️⃣ CONVERSAS (Frontend → Backend)

### GET `/api/v1/conversations`

**Propósito:** Listar todas as conversas da organização  
**Autenticação:** JWT (Bearer token)  
**Permissão:** org_admin, agent, super_admin  

```
GET /api/v1/conversations?skip=0&limit=50&flow_id=flow_001

Headers:
  Authorization: Bearer <JWT_TOKEN>

Query Params:
  skip: int (default 0)
  limit: int (default 50)
  flow_id: UUID (optional, filtrar por flow)
  is_active: boolean (optional)

→ Response: 200 OK
{
  "total": 247,
  "conversations": [
    {
      "id": "conv_uuid_001",
      "phone_number": "+55 11 99999-9999",
      "display_phone": "11 99999-9999",
      "flow_id": "flow_uuid_001",
      "flow_name": "Atendimento Vendas",
      "is_active": true,
      "current_node_id": "node_question_product",
      "messages_count": 5,
      "last_message_at": "2025-12-12T10:30:00Z",
      "created_at": "2025-12-12T09:00:00Z",
      "session_expires_at": "2025-12-13T09:00:00Z"
    },
    {
      "id": "conv_uuid_002",
      "phone_number": "+55 11 88888-8888",
      "display_phone": "11 88888-8888",
      "flow_id": "flow_uuid_002",
      "flow_name": "Suporte Técnico",
      "is_active": false,
      "current_node_id": null,
      "messages_count": 12,
      "last_message_at": "2025-12-11T15:45:00Z",
      "created_at": "2025-12-11T14:00:00Z",
      "session_expires_at": "2025-12-12T14:00:00Z"
    }
  ]
}
```

**Campo a notar:** `current_node_id` = onde o usuário está no fluxo (útil para UI)

---

### GET `/api/v1/conversations/{phone}`

**Propósito:** Histórico completo de uma conversa  
**Autenticação:** JWT (Bearer token)  
**Permissão:** org_admin, agent, super_admin  

```
GET /api/v1/conversations/5511999999999?limit=100

Headers:
  Authorization: Bearer <JWT_TOKEN>

Path Params:
  phone: string (formato: "5511999999999")

Query Params:
  limit: int (default 100)
  skip: int (default 0)

→ Response: 200 OK
{
  "phone_number": "+55 11 99999-9999",
  "display_phone": "11 99999-9999",
  "flow_id": "flow_uuid_001",
  "flow_name": "Atendimento Vendas",
  "is_active": true,
  "created_at": "2025-12-12T09:00:00Z",
  "current_state": {
    "current_node_id": "node_question_product",
    "variables": {
      "nome": "João Silva",
      "email": "joao@example.com",
      "produto": "2"
    },
    "execution_path": [
      "node_start",
      "node_greeting",
      "node_question_name",
      "node_message_products",
      "node_question_product"
    ]
  },
  "messages": [
    {
      "id": "msg_001",
      "type": "user",
      "content": "Olá",
      "timestamp": "2025-12-12T09:00:05Z",
      "node_id": "node_greeting"
    },
    {
      "id": "msg_002",
      "type": "bot",
      "content": "Qual é seu nome?",
      "timestamp": "2025-12-12T09:00:06Z",
      "node_id": "node_question_name"
    },
    {
      "id": "msg_003",
      "type": "user",
      "content": "João Silva",
      "timestamp": "2025-12-12T09:00:10Z",
      "node_id": "node_question_name"
    },
    {
      "id": "msg_004",
      "type": "bot",
      "content": "Temos 3 produtos! Qual te interessa?\n1️⃣ Produto A - R$ 100\n2️⃣ Produto B - R$ 150\n3️⃣ Produto C - R$ 200",
      "timestamp": "2025-12-12T09:00:11Z",
      "node_id": "node_message_products"
    },
    {
      "id": "msg_005",
      "type": "user",
      "content": "2",
      "timestamp": "2025-12-12T09:00:15Z",
      "node_id": "node_question_product"
    }
  ],
  "total_messages": 5
}
```

---

### POST `/api/v1/conversations/{phone}/send`

**Propósito:** Enviar mensagem manual (admin/agent testa fluxo)  
**Autenticação:** JWT (Bearer token)  
**Permissão:** org_admin, agent  

```
POST /api/v1/conversations/5511999999999/send

Headers:
  Authorization: Bearer <JWT_TOKEN>
  Content-Type: application/json

Body:
{
  "message": "Preciso do produto 3",
  "flow_id": "flow_uuid_001" (opcional, usa default se não passar)
}

→ Response: 200 OK
{
  "status": "processed",
  "user_message": "Preciso do produto 3",
  "bot_responses": [
    "Obrigado! Você escolheu o Produto 3. Vou processar seu pedido."
  ],
  "current_node_id": "node_end",
  "current_state": {
    "variables": {
      "nome": "João Silva",
      "email": "joao@example.com",
      "produto": "3"
    },
    "execution_path": [
      "node_start",
      "node_greeting",
      "node_question_name",
      "node_message_products",
      "node_question_product",
      "node_end"
    ]
  },
  "awaiting_input": false
}
```

**Nota:** Se `awaiting_input: true`, significa o fluxo está esperando nova mensagem do usuário

---

### POST `/api/v1/conversations/{phone}/close`

**Propósito:** Fechar conversa (marcar como inativa)  
**Autenticação:** JWT (Bearer token)  
**Permissão:** org_admin, agent  

```
POST /api/v1/conversations/5511999999999/close

Headers:
  Authorization: Bearer <JWT_TOKEN>

Body: {} (empty)

→ Response: 200 OK
{
  "status": "closed",
  "phone_number": "+55 11 99999-9999",
  "closed_at": "2025-12-12T11:00:00Z"
}
```

---

## 3️⃣ ANALYTICS (Dashboard)

### GET `/api/v1/analytics/conversations`

**Propósito:** Métricas agregadas de conversas  
**Autenticação:** JWT (Bearer token)  
**Permissão:** org_admin, super_admin  

```
GET /api/v1/analytics/conversations?period=7d&flow_id=flow_001

Headers:
  Authorization: Bearer <JWT_TOKEN>

Query Params:
  period: "24h" | "7d" | "30d" | "all" (default: "7d")
  flow_id: UUID (optional)

→ Response: 200 OK
{
  "period": "7d",
  "metrics": {
    "total_conversations": 347,
    "active_conversations": 23,
    "completed_conversations": 324,
    "total_messages": 1843,
    "avg_messages_per_conversation": 5.3,
    "avg_conversation_duration_minutes": 8.5,
    "completion_rate_percent": 93.4,
    "unique_phone_numbers": 347
  },
  "by_flow": [
    {
      "flow_id": "flow_001",
      "flow_name": "Atendimento Vendas",
      "total": 200,
      "completed": 187,
      "completion_rate": 93.5
    },
    {
      "flow_id": "flow_002",
      "flow_name": "Suporte Técnico",
      "total": 147,
      "completed": 137,
      "completion_rate": 93.2
    }
  ]
}
```

---

## 4️⃣ FLUXOS OPERACIONAIS

### Operação: Usuário envia mensagem WhatsApp

```
1. Meta receives message from user
   ↓
2. Meta sends POST /api/v1/whatsapp/webhook
   → Body: { from: "5511999999999", text: "Olá" }
   ← Response: 200 OK { status: "received" }
   (Backend enfileira processamento ASYNC)
   ↓
3. Backend background job:
   - Lookup organization by phone
   - Route to chatbot/flow
   - Load/create conversation state
   - Execute flow with user message
   - Send response via Meta API (POST /messages)
   - Save to conversation_logs
   ↓
4. User receives response on WhatsApp
   (não é feito pelo frontend)
```

---

### Operação: Agent visualiza conversa no dashboard

```
1. Frontend GET /api/v1/conversations
   ← Lista 50 conversas (paginadas)
   
2. Agent clica em uma conversa
   ↓
3. Frontend GET /api/v1/conversations/{phone}
   ← Histórico completo
   ← current_state (onde está no fluxo)
   
4. Frontend exibe:
   - Chat history (messages)
   - Current node no fluxo visual
   - Variáveis coletadas (variables)
   
5. (Optional) Agent clica "Enviar mensagem teste"
   ↓
6. Frontend POST /api/v1/conversations/{phone}/send
   Body: { message: "Teste", flow_id: "..." }
   ← Response: bot_responses + current_node_id
   
7. Frontend atualiza UI com nova resposta
```

---

## 5️⃣ ESTRUTURA DE DADOS

### ConversationState (persistido no DB)

```python
class ConversationState:
    id: UUID
    organization_id: UUID  # CRITICAL: multi-tenancy
    phone_number: str  # "+55 11 99999-9999"
    flow_id: UUID
    current_node_id: str | None  # "node_question_product"
    variables: dict  # {"nome": "João", "produto": "2"}
    execution_path: list  # ["node_start", "node_greeting", ...]
    is_active: bool
    last_message_at: datetime
    session_expires_at: datetime  # TTL 24h
    created_at: datetime
    updated_at: datetime
```

### ConversationLog (histórico imutável)

```python
class ConversationLog:
    id: UUID
    organization_id: UUID
    phone_number: str
    flow_id: UUID
    user_message: str
    bot_response: str
    node_id: str  # qual node gerou a resposta
    timestamp: datetime
    metadata: dict  # extra info
```

---

## 6️⃣ CÓDIGOS DE ERRO

### Webhook Endpoints

```
400 Bad Request
  {
    "detail": "Invalid mode",
    "error_code": "WEBHOOK_INVALID_MODE"
  }

403 Forbidden
  {
    "detail": "Invalid token",
    "error_code": "WEBHOOK_INVALID_TOKEN"
  }
  OR
  {
    "detail": "Invalid signature",
    "error_code": "WEBHOOK_INVALID_SIGNATURE"
  }
```

### Conversation Endpoints

```
401 Unauthorized
  {
    "detail": "Not authenticated",
    "error_code": "AUTH_MISSING_TOKEN"
  }

403 Forbidden
  {
    "detail": "Insufficient permissions",
    "error_code": "AUTH_INSUFFICIENT_PERMISSION"
  }

404 Not Found
  {
    "detail": "Conversation not found",
    "error_code": "CONVERSATION_NOT_FOUND"
  }

409 Conflict
  {
    "detail": "Conversation is closed",
    "error_code": "CONVERSATION_CLOSED"
  }
```

---

## 7️⃣ FLUXO DE AUTENTICAÇÃO

**Todos endpoints exceto webhook precisam JWT:**

```
Frontend:
1. User já autenticado (sistema auth existente)
2. Token JWT obtido em /auth/login
3. Armazenar em localStorage/sessionStorage
4. Adicionar header em TODAS requisições:
   Authorization: Bearer <token>

Backend:
5. Dependency: get_current_user(token)
   - Valida JWT
   - Retorna user object
   - Extrai organization_id do user
6. Dependency: get_current_org(user)
   - Retorna organization_id do user
   - Filtra dados por org
7. ALL queries filtram por organization_id
```

---

## 8️⃣ FRONTEND DEVE FAZER

**Semana 1-4 (backend em desenvolvimento):**
- [ ] Preparar componentes para exibir conversas
- [ ] Preparar histórico chat component
- [ ] Preparar analytics dashboard skeleton

**Semana 5 (integração):**
- [ ] Implementar GET /conversations
- [ ] Implementar GET /conversations/{phone}
- [ ] Implementar POST /conversations/{phone}/send
- [ ] Remover dependência de `useFlowSimulator` (não precisa mais)
- [ ] Adaptar UI para novos dados do backend

---

## 🎯 RESUMO

| Quem | O quê | Onde | Quando |
|-----|-------|------|--------|
| **Meta** | Envia msg | POST /webhook | Real-time |
| **Backend** | Processa | Background job | Async |
| **Backend** | Persiste estado | DB | Async |
| **Backend** | Envia resposta | Meta API | Async |
| **Frontend** | Lista conversas | GET /conversations | On-demand |
| **Frontend** | Exibe histórico | GET /conversations/{phone} | On-demand |
| **Frontend** | Testa fluxo | POST /conversations/{phone}/send | On-demand |
| **Frontend** | Exibe métricas | GET /analytics/conversations | On-demand |

---

**Autor:** Kayo Carvalho Fernandes  
**Versão:** 1.0  
**Última Atualização:** 12 de dezembro de 2025
