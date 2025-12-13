# 📨 FLUXO COMPLETO: Mensagem Recebida → Armazenamento

**Pergunta**: O que é armazenado quando o cliente envia mensagem para um número nosso?

**Arquivo principal**: `backend/app/services/whatsapp_service.py:4099-4440`

---

## 🔄 PIPELINE VISUAL

```
┌────────────────────────────────────────────────────────────────┐
│                   CLIENTE ENVIA MENSAGEM                       │
│          5511988888888 → número nosso via WhatsApp             │
└────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────┐
│              META CLOUD API WEBHOOK (HTTPS POST)               │
│                                                                │
│  Payload:                                                      │
│  {                                                             │
│    "object": "whatsapp_business_account",                     │
│    "entry": [{                                                │
│      "changes": [{                                            │
│        "value": {                                             │
│          "metadata": {"phone_number_id": "123456789"},        │
│          "messages": [{                                       │
│            "from": "5511988888888",                           │
│            "id": "wamid.123xyz",                              │
│            "timestamp": "1702560000",                         │
│            "type": "text",                                    │
│            "text": {"body": "Olá, tudo bem?"}                 │
│          }],                                                  │
│          "contacts": [{                                       │
│            "profile": {"name": "João Silva"},                 │
│            "wa_id": "5511988888888"                           │
│          }]                                                   │
│        }                                                       │
│      }]                                                       │
│    }]                                                         │
│  }                                                             │
└────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────┐
│           backend/app/api/v1/endpoints/whatsapp.py             │
│                    receive_webhook()                           │
│                                                                │
│  1. Verify X-Hub-Signature-256 header (HMAC-SHA256)            │
│  2. Extract phone_number_id from payload                       │
│  3. Find WhatsAppNumber by phone_number_id                     │
│  4. Call WhatsAppService.process_webhook()                     │
└────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────┐
│       WhatsAppService.process_webhook() [Line 4105]            │
│                                                                │
│  for each message in payload["entry"][0]["changes"][0]        │
│    → call _process_incoming_message()                          │
└────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────┐
│   _process_incoming_message() [Line 4250-4440]                 │
│                                                                │
│  Input: message dict, org_id, phone_number_id, flow_id        │
│  Output: Conversation + Message salvas no banco                │
└────────────────────────────────────────────────────────────────┘
```

---

## 💾 DADOS ARMAZENADOS - DETALHADO

### PASSO 1: GARANTIR CONTATO EXISTE

**Tabela**: `contacts`  
**Chave única**: `organization_id + whatsapp_id`

```python
# Buscar ou criar contato
contact = await contact_repo.get_or_create(
    organization_id=org_id,
    whatsapp_id="5511988888888",
    defaults={
        "whatsapp_name": "João Silva",  # Do webhook
        "name": "João Silva",
        "created_at": datetime.utcnow(),
    }
)
```

**Dados salvos em Contact:**
| Campo | Valor | Tipo |
|-------|-------|------|
| `id` | UUID | UUID (PK) |
| `organization_id` | org_id | UUID (FK) |
| `whatsapp_id` | "5511988888888" | String (índice) |
| `whatsapp_name` | "João Silva" | String |
| `name` | "João Silva" | String |
| `email` | NULL | String (opcional) |
| `phone_number` | NULL | String (opcional) |
| `attributes` | {} | JSONB (custom fields) |
| `source` | NULL | String (opcional) |
| `lead_score` | 0 | Integer |
| `lifecycle_stage` | NULL | String (opcional) |
| `created_at` | now() | DateTime |
| `updated_at` | now() | DateTime |
| `deleted_at` | NULL | DateTime |

---

### PASSO 2: GARANTIR CONVERSA EXISTE

**Tabela**: `conversations`  
**Chave única**: `organization_id + contact_id + whatsapp_number_id`

```python
# Buscar ou criar conversa
conversation = await conv_repo.get_or_create(
    organization_id=org_id,
    contact_id=contact.id,
    whatsapp_number_id=phone_number_id,
    defaults={
        "status": "open",
        "is_bot_active": True,
        "channel": "whatsapp",
        "active_flow_id": default_flow_id,  # ← Se configurado
        "active_chatbot_id": default_chatbot_id,  # ← Se configurado
        "current_node_id": start_node.id if default_flow_id else None,
        "context_variables": {},
        "extra_data": {},
    }
)

# Se PRIMEIRA mensagem: seta first_message_at
if conversation.first_message_at is None:
    await conv_repo.update(conversation.id, {
        "first_message_at": datetime.utcnow()
    })
```

**Dados salvos em Conversation:**
| Campo | Valor (1ª msg) | Tipo |
|-------|-------|------|
| `id` | UUID | UUID (PK) |
| `organization_id` | org_id | UUID (FK) |
| `contact_id` | contact.id | UUID (FK) |
| `whatsapp_number_id` | phone_number_id | UUID (FK) |
| `channel` | "whatsapp" | String |
| `status` | "open" | String |
| `is_bot_active` | TRUE | Boolean |
| `is_human_requested` | FALSE | Boolean |
| `active_chatbot_id` | default_chatbot_id OR NULL | UUID |
| `active_flow_id` | default_flow_id OR NULL | UUID |
| `current_node_id` | start_node.id OR NULL | UUID |
| `queue_id` | NULL | UUID (enquanto bot ativo) |
| `current_agent_id` | NULL | UUID (enquanto bot ativo) |
| `context_variables` | {} | JSONB (variáveis do flow) |
| `extra_data` | {} | JSONB (custom data) |
| `first_message_at` | now() | DateTime |
| `last_message_at` | (updated next) | DateTime |
| `last_message_from_contact_at` | (updated next) | DateTime |
| `created_at` | now() | DateTime |
| `deleted_at` | NULL | DateTime |

---

### PASSO 3: ARMAZENAR MENSAGEM

**Tabela**: `messages`  
**Registra cada mensagem individual**

```python
# Extrair dados da mensagem Meta
whatsapp_message_id = message.get("id")  # "wamid.123xyz"
timestamp = message.get("timestamp")  # "1702560000"
message_type = message.get("type")  # "text", "image", etc
content = message.get(message_type, {})  # {"body": "Olá"}

message_data = {
    "organization_id": org_id,
    "conversation_id": conversation.id,
    "whatsapp_number_id": phone_number_id,
    "direction": "inbound",  # ← Mensagem chegando
    "sender_type": "contact",  # ← De quem
    "whatsapp_message_id": whatsapp_message_id,  # Identificador Meta (ÚNICO)
    "whatsapp_timestamp": int(timestamp),  # Unix timestamp de quando foi enviada
    "message_type": message_type,  # text, image, video, etc
    "content": content,  # JSONB com conteúdo específico
    "status": "received",  # ← Já recebido e armazenado
}

new_message = await message_repo.create(message_data)
```

**Dados salvos em Message:**
| Campo | Exemplo | Tipo | Descrição |
|-------|---------|------|-----------|
| `id` | UUID | UUID | PK - ID único da mensagem |
| `organization_id` | org_id | UUID | FK - Multi-tenancy |
| `conversation_id` | conv.id | UUID | FK - Qual conversa |
| `whatsapp_number_id` | phone_id | UUID | FK - Qual número recebeu |
| `direction` | "inbound" | String | De entrada/saída |
| `sender_type` | "contact" | String | Quem enviou (contact/bot/agent) |
| `sender_user_id` | NULL | UUID | Se enviado por agente, qual |
| `whatsapp_message_id` | "wamid.123xyz" | String | ID único Meta (UNIQUE) |
| `whatsapp_timestamp` | 1702560000 | Integer | Unix timestamp Meta |
| `message_type` | "text" | String | Tipo (text/image/video/etc) |
| `content` | {"body": "Olá"} | JSONB | Conteúdo específico |
| `media_url` | NULL | Text | Se imagem/video/audio |
| `media_mime_type` | NULL | String | Ex: "image/jpeg" |
| `media_filename` | NULL | String | Nome original |
| `media_size_bytes` | NULL | Integer | Tamanho em bytes |
| `status` | "received" | String | pending/sent/delivered/read/failed |
| `sent_at` | NULL | DateTime | Apenas para outbound |
| `delivered_at` | NULL | DateTime | Quando foi entregue |
| `read_at` | NULL | DateTime | Quando foi lida |
| `failed_at` | NULL | DateTime | Se falhou |
| `error_code` | NULL | String | Ex: "131047" |
| `error_message` | NULL | Text | Descrição do erro |
| `template_id` | NULL | UUID | Se foi template |
| `reply_to_message_id` | NULL | UUID | Se resposta a outra msg |
| `created_at` | now() | DateTime | Quando armazenada |
| `updated_at` | now() | DateTime | Última atualização |
| `deleted_at` | NULL | DateTime | Soft delete |

**Exemplos de `content` por tipo:**

```json
// TEXT
{
  "text": "Olá, tudo bem?"
}

// IMAGE
{
  "image": {
    "url": "https://...",
    "caption": "Foto da loja"
  }
}

// VIDEO
{
  "video": {
    "url": "https://...",
    "caption": "Demo do produto"
  }
}

// AUDIO
{
  "audio": {
    "url": "https://..."
  }
}

// DOCUMENT
{
  "document": {
    "url": "https://...",
    "filename": "invoice.pdf"
  }
}

// LOCATION
{
  "location": {
    "latitude": -23.5505,
    "longitude": -46.6333,
    "name": "São Paulo",
    "address": "Av Paulista 1000"
  }
}

// CONTACTS
{
  "contacts": [
    {
      "name": {"first_name": "João"},
      "phones": [{"phone": "5511999999999"}],
      "emails": [{"email": "joao@email.com"}]
    }
  ]
}

// INTERACTIVE
{
  "interactive": {
    "type": "button_reply",
    "button_reply": {
      "id": "btn_1",
      "title": "Sim"
    }
  }
}
```

---

### PASSO 4: ATUALIZAR CONVERSATION COM TIMING

```python
await conv_repo.update(conversation.id, {
    "last_message_at": datetime.utcnow(),
    "last_message_from_contact_at": datetime.utcnow(),
})
```

---

### PASSO 5: EMITIR WEBSOCKET (REAL-TIME)

```python
message_dict = {
    "id": str(new_message.id),
    "conversation_id": str(conversation.id),
    "direction": "inbound",
    "sender_type": "contact",
    "message_type": "text",
    "content": {"text": "Olá"},
    "status": "received",
    "whatsapp_message_id": "wamid.123xyz",
    "created_at": "2023-12-14T10:00:00"
}

await emit_to_conversation(
    conversation_id=str(conversation.id),
    event="message:new",
    data=message_dict
)

# Agentes veem em tempo real: nova mensagem recebida!
```

---

### PASSO 6: DISPARAR BOT/FLOW (SE CONFIGURADO)

```python
if conversation.is_bot_active and (conversation.active_chatbot_id or conversation.active_flow_id):
    await self._trigger_chatbot(conversation, new_message)
    # ↓ Isso vai executar o node do flow e enviar resposta
```

---

## 🗂️ ESTRUTURA FINAL NO BANCO

```
ORGANIZATION: PyTake Inc.
  ├─ CONTACT: João Silva
  │  ├─ whatsapp_id: 5511988888888
  │  ├─ name: João Silva
  │  ├─ email: NULL
  │  └─ attributes: {}
  │
  ├─ WHATSAPP_NUMBER: +55 11 9999-9999
  │  ├─ phone_number_id: 123456789
  │  ├─ default_flow_id: flow-uuid
  │  └─ connection_type: official
  │
  └─ CONVERSATION: João Silva ↔ +55 11 9999-9999
     ├─ status: open
     ├─ is_bot_active: TRUE
     ├─ active_flow_id: flow-uuid
     ├─ active_chatbot_id: NULL
     ├─ current_node_id: node-start-uuid
     ├─ context_variables: {}
     ├─ first_message_at: 2023-12-14T10:00:00
     ├─ last_message_at: 2023-12-14T10:00:00
     └─ MESSAGES:
        ├─ Mensagem 1 (INBOUND - Cliente)
        │  ├─ whatsapp_message_id: wamid.123xyz
        │  ├─ direction: inbound
        │  ├─ sender_type: contact
        │  ├─ message_type: text
        │  ├─ content: {"text": "Olá"}
        │  ├─ status: received
        │  └─ created_at: 2023-12-14T10:00:00
        │
        ├─ Mensagem 2 (OUTBOUND - Bot responde)
        │  ├─ whatsapp_message_id: wamid.456abc
        │  ├─ direction: outbound
        │  ├─ sender_type: bot
        │  ├─ message_type: text
        │  ├─ content: {"text": "Olá! Como posso ajudar?"}
        │  ├─ status: delivered
        │  └─ created_at: 2023-12-14T10:00:05
        │
        └─ Mensagem 3 (INBOUND - Resposta do cliente)
           ├─ whatsapp_message_id: wamid.789def
           ├─ direction: inbound
           ├─ sender_type: contact
           ├─ message_type: text
           ├─ content: {"text": "Queria saber o preço"}
           ├─ status: received
           └─ created_at: 2023-12-14T10:00:10
```

---

## 📊 DADOS SALVOS - RESUMO POR TABELA

### Tabela: `contacts`
**O que é**: Registro do contato que enviou mensagem

| Campo Salvo | Origem | Tipo |
|-------------|--------|------|
| whatsapp_id | message.from | String |
| whatsapp_name | contacts[0].profile.name | String |
| name | copiado de whatsapp_name | String |
| attributes | {} (vazio inicialmente) | JSONB |
| source | NULL (pode ser preenchido depois) | String |
| lead_score | 0 | Integer |

---

### Tabela: `conversations`
**O que é**: Fio da conversa entre contato e número nosso

| Campo Salvo | Origem | Tipo |
|-------------|--------|------|
| contact_id | Contact criado | UUID |
| whatsapp_number_id | phone_number_id do webhook | UUID |
| status | "open" (padrão) | String |
| is_bot_active | TRUE (padrão) | Boolean |
| active_flow_id | whatsapp_number.default_flow_id | UUID |
| active_chatbot_id | whatsapp_number.default_chatbot_id | UUID |
| current_node_id | flow.start_node_id | UUID |
| context_variables | {} (vazio inicialmente) | JSONB |
| extra_data | {} (vazio inicialmente) | JSONB |
| first_message_at | now() | DateTime |
| last_message_at | now() | DateTime |

---

### Tabela: `messages`
**O que é**: Cada mensagem individual

| Campo Salvo | Origem | Tipo |
|-------------|--------|------|
| conversation_id | Conversation criada | UUID |
| direction | "inbound" (cliente enviando) | String |
| sender_type | "contact" | String |
| message_type | message.type do webhook | String |
| content | message[type] do webhook | JSONB |
| whatsapp_message_id | message.id (Meta) | String |
| whatsapp_timestamp | message.timestamp (Meta) | Integer |
| status | "received" | String |
| created_at | now() | DateTime |

---

## 🔐 SEGURANÇA & MULTI-TENANCY

**Critical**: Toda query filtra por `organization_id`

```python
# ✅ CORRETO
stmt = select(Message).where(
    Message.organization_id == org_id,
    Message.conversation_id == conversation_id
)

# ❌ ERRADO (data leak potencial!)
stmt = select(Message).where(
    Message.conversation_id == conversation_id
)
```

---

## 🚀 FLUXO COMPLETO EM 1 MINUTO

1. **Cliente envia mensagem** → Meta webhook
2. **Webhook recebido** → Verificação HMAC (segurança)
3. **Contact garantido** → Get/create por whatsapp_id
4. **Conversation garantida** → Get/create por contact + whatsapp_number
5. **Message armazenada** → Registra com todos os detalhes
6. **Timing atualizado** → last_message_at na conversation
7. **WebSocket emitido** → Agentes veem em tempo real
8. **Bot disparado** → Se é_bot_active, executa flow
9. **Resposta enviada** → Nova message (outbound, sender_type: bot)

---

## 📝 EXEMPLO PRÁTICO - FLUXO REAL

### Cenário: Cliente João envia "Olá" para número 5585987654321

```python
# WEBHOOK RECEBIDO
payload = {
    "entry": [{
        "changes": [{
            "value": {
                "metadata": {"phone_number_id": "123456789"},
                "messages": [{
                    "from": "5511988888888",
                    "id": "wamid.incoming.123",
                    "timestamp": "1702560000",
                    "type": "text",
                    "text": {"body": "Olá"}
                }],
                "contacts": [{
                    "profile": {"name": "João Silva"},
                    "wa_id": "5511988888888"
                }]
            }
        }]
    }]
}

# ========== BANCO APÓS PROCESSAMENTO ==========

# CONTACT criado
Contact(
    id = "550e8400-e29b-41d4-a716-446655440000",
    organization_id = "org-uuid",
    whatsapp_id = "5511988888888",
    whatsapp_name = "João Silva",
    name = "João Silva",
    created_at = "2023-12-14T10:00:00Z"
)

# CONVERSATION criada
Conversation(
    id = "660e8400-e29b-41d4-a716-446655440000",
    organization_id = "org-uuid",
    contact_id = "550e8400-e29b-41d4-a716-446655440000",
    whatsapp_number_id = "123456789",
    status = "open",
    is_bot_active = True,
    active_flow_id = "flow-uuid-123",
    current_node_id = "node-start-uuid",
    first_message_at = "2023-12-14T10:00:00Z",
    last_message_at = "2023-12-14T10:00:00Z"
)

# MESSAGE armazenada
Message(
    id = "770e8400-e29b-41d4-a716-446655440000",
    organization_id = "org-uuid",
    conversation_id = "660e8400-e29b-41d4-a716-446655440000",
    direction = "inbound",
    sender_type = "contact",
    message_type = "text",
    content = {"text": "Olá"},
    whatsapp_message_id = "wamid.incoming.123",
    whatsapp_timestamp = 1702560000,
    status = "received",
    created_at = "2023-12-14T10:00:00Z"
)

# WEBSOCKET emitido
emit_to_conversation(
    conversation_id = "660e8400-e29b-41d4-a716-446655440000",
    event = "message:new",
    data = {
        "id": "770e8400-e29b-41d4-a716-446655440000",
        "content": {"text": "Olá"},
        "sender_type": "contact"
    }
)

# FLOW DISPARADO → Bot responde
# (novo Message outbound criado com bot response)
```

---

## 🔍 VERIFICAÇÃO DE DADOS

Para ver o que foi armazenado:

```sql
-- Ver contato
SELECT * FROM contacts 
WHERE organization_id = 'org-uuid' 
AND whatsapp_id = '5511988888888';

-- Ver conversa
SELECT * FROM conversations 
WHERE organization_id = 'org-uuid' 
AND contact_id = '550e8400-e29b-41d4-a716-446655440000';

-- Ver mensagens da conversa
SELECT * FROM messages 
WHERE conversation_id = '660e8400-e29b-41d4-a716-446655440000'
ORDER BY created_at;

-- Ver timeline completa
SELECT 
  c.id AS conversation_id,
  ct.name AS contact_name,
  m.direction,
  m.sender_type,
  m.content,
  m.created_at
FROM conversations c
JOIN contacts ct ON c.contact_id = ct.id
JOIN messages m ON c.id = m.conversation_id
WHERE c.id = '660e8400-e29b-41d4-a716-446655440000'
ORDER BY m.created_at;
```

---

**Criado para**: Documentação técnica do sistema PyTake  
**Versão**: 1.0  
**Última atualização**: Dec 14, 2023
