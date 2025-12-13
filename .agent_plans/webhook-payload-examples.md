# Exemplos Práticos: Payload & Fluxos

**Documentação complementar com exemplos reais**

---

## 1. WEBHOOK PAYLOAD - Meta Cloud API

### 1.1 Incoming Message (GET para verificação)

```http
GET /api/v1/whatsapp/webhook?
  hub.mode=subscribe&
  hub.challenge=1234567890&
  hub.verify_token=seu_token_aqui
```

**Response esperada (200 OK):**
```
1234567890
```

### 1.2 Incoming Message (POST - Mensagem Real)

```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "123456789",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "5511987654321",
              "phone_number_id": "111222333",
              "business_account_id": "555666777"
            },
            "messages": [
              {
                "from": "5511999999999",
                "id": "wamid.XYZ=",
                "timestamp": "1639169373",
                "text": {
                  "body": "Olá! Preciso de ajuda com meu pedido"
                },
                "type": "text"
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
}
```

**Extração de dados:**
```typescript
const phone_number = entry[0].changes[0].value.messages[0].from;
// Result: "5511999999999" ou "+55 11 99999-9999"

const message_text = entry[0].changes[0].value.messages[0].text.body;
// Result: "Olá! Preciso de ajuda com meu pedido"

const timestamp = entry[0].changes[0].value.messages[0].timestamp;
// Result: "1639169373"
```

### 1.3 Outras tipos de eventos (não processar em v1)

```json
{
  "messages": [
    {
      "from": "5511999999999",
      "id": "wamid.XYZ=",
      "timestamp": "1639169373",
      "type": "button",
      "button": {
        "payload": "BUTTON_ID_HERE",
        "text": "Clicou em botão"
      }
    }
  ]
}
```

```json
{
  "statuses": [
    {
      "id": "wamid.XYZ=",
      "status": "sent",
      "timestamp": "1639169373",
      "recipient_id": "5511999999999"
    }
  ]
}
```

---

## 2. FLUXO DE EXECUÇÃO - EXEMPLO PRÁTICO

### 2.1 Configuração Inicial

**Base de dados:**

```sql
-- WhatsApp Numbers
INSERT INTO whatsapp_numbers (
  id, phone_number, display_name, 
  connection_type, status, is_active, 
  default_chatbot_id
) VALUES (
  'num_001',
  '+55 11 99999-9999',
  'Vendas',
  'official',
  'connected',
  true,
  'chatbot_001'
);

-- Chatbot
INSERT INTO chatbots (
  id, name, description, 
  flow_id, is_fallback
) VALUES (
  'chatbot_001',
  'Atendimento Vendas',
  'Bot para vendas',
  'flow_001',
  false
);

-- Flow (com nodes)
{
  "id": "flow_001",
  "name": "Fluxo de Vendas",
  "nodes": [
    {
      "id": "node_start",
      "type": "start",
      "label": "Início"
    },
    {
      "id": "node_greeting",
      "type": "message",
      "label": "Saudação",
      "data": {
        "content": "Olá {{nome}}! 👋 Bem-vindo ao nosso atendimento de vendas."
      }
    },
    {
      "id": "node_question",
      "type": "question",
      "label": "Coleta Nome",
      "data": {
        "label": "Qual é seu nome?",
        "variableName": "nome",
        "validationType": "text"
      }
    },
    {
      "id": "node_ask_product",
      "type": "message",
      "label": "Mensagem Produtos",
      "data": {
        "content": "Temos 3 produtos incríveis! Qual te interessa?\n1️⃣ Produto A - R$ 100\n2️⃣ Produto B - R$ 150\n3️⃣ Produto C - R$ 200"
      }
    },
    {
      "id": "node_set_product",
      "type": "question",
      "label": "Escolha Produto",
      "data": {
        "label": "Digite o número",
        "variableName": "produto",
        "validationType": "number"
      }
    },
    {
      "id": "node_end",
      "type": "end",
      "label": "Fim",
      "data": {
        "content": "Obrigado {{nome}}! Enviamos mais informações sobre o Produto {{produto}} para seu email. Em breve nossa equipe entra em contato! 🎉"
      }
    }
  ],
  "edges": [
    { "source": "node_start", "target": "node_greeting" },
    { "source": "node_greeting", "target": "node_question" },
    { "source": "node_question", "target": "node_ask_product" },
    { "source": "node_ask_product", "target": "node_set_product" },
    { "source": "node_set_product", "target": "node_end" }
  ]
}
```

### 2.2 Usuário envia primeira mensagem

**Webhook POST:**
```json
{
  "entry": [{
    "changes": [{
      "value": {
        "messages": [{
          "from": "5511999999999",
          "text": { "body": "Olá, preciso de ajuda" }
        }]
      }
    }]
  }]
}
```

**Backend Processing:**

```typescript
// Step 1: Router
const phone = "5511999999999";
const whatsappNumber = await db.whatsappNumbers.findOne({ 
  phone_number: phone 
});
// Result: { id: 'num_001', default_chatbot_id: 'chatbot_001' }

// Step 2: Load flow
const chatbot = await db.chatbots.findById('chatbot_001');
const flow = await loadFlow('flow_001');

// Step 3: Check/create conversation state
let state = await db.conversationStates.findOne({
  phone_number: phone,
  flow_id: 'flow_001'
});

if (!state) {
  // First message: create new state
  state = {
    phone_number: phone,
    flow_id: 'flow_001',
    current_node_id: null, // Will initialize
    variables: {},
    execution_path: []
  };
}

// Step 4: Execute flow
const result = await executeFlow({
  flowId: 'flow_001',
  userMessage: 'Olá, preciso de ajuda',
  state
});

// Execution trace:
// → currentNodeId = null
// → Find START node (node_start)
// → Auto-execute until QUESTION
//   - node_start → (no action)
//   - node_greeting → Add message: "Olá {{nome}}! 👋..."
//   - node_question → STOP HERE (waiting for input)

// Result:
{
  responses: [
    "Olá {{nome}}! 👋 Bem-vindo ao nosso atendimento de vendas."
  ],
  currentNodeId: "node_question",
  variables: { nome: undefined },
  awaitingInput: true
}

// Note: Variable {{nome}} not substituted yet (user hasn't answered)

// Step 5: Send response
await sendWhatsAppMessage('5511999999999', 
  "Olá {{nome}}! 👋 Bem-vindo ao nosso atendimento de vendas.");

// Note: Send raw message without substitution for now
// Alternative: Send "Olá! 👋 Bem-vindo ao nosso atendimento de vendas."

// Step 6: Save state
await db.conversationStates.updateOne({
  phone_number: phone,
  flow_id: 'flow_001'
}, {
  current_node_id: 'node_question',
  variables: {},
  execution_path: ['node_start', 'node_greeting', 'node_question']
});

// Step 7: Log conversation
await db.conversationLogs.create({
  phone_number: phone,
  flow_id: 'flow_001',
  user_message: 'Olá, preciso de ajuda',
  bot_response: 'Olá! 👋 Bem-vindo...',
  timestamp: new Date()
});
```

**Bot sends to WhatsApp:**
```json
{
  "messaging_product": "whatsapp",
  "to": "5511999999999",
  "type": "text",
  "text": {
    "body": "Qual é seu nome?"
  }
}
```

**User sees:** "Qual é seu nome?"

### 2.3 Usuário responde com seu nome

**Webhook POST:**
```json
{
  "entry": [{
    "changes": [{
      "value": {
        "messages": [{
          "from": "5511999999999",
          "text": { "body": "João Silva" }
        }]
      }
    }]
  }]
}
```

**Backend Processing:**

```typescript
// Step 1: Load existing state
const state = await db.conversationStates.findOne({
  phone_number: '5511999999999',
  flow_id: 'flow_001'
});

// State:
{
  current_node_id: 'node_question',
  variables: {},
  execution_path: ['node_start', 'node_greeting', 'node_question']
}

// Step 2: Execute flow with user input
const result = await executeFlow({
  flowId: 'flow_001',
  userMessage: 'João Silva',
  state
});

// Execution trace:
// → currentNodeId = 'node_question' (QUESTION node)
// → Store user input in variables[nome] = 'João Silva'
// → Move to next node: node_ask_product
// → Continue execution:
//   - node_ask_product → Add message: "Temos 3 produtos..."
//   - End of message, look for next node
//   - Next edge goes to node_set_product (QUESTION node)
//   - STOP HERE (waiting for input)

// Result:
{
  responses: [
    "Temos 3 produtos incríveis! Qual te interessa?\n1️⃣ Produto A - R$ 100\n2️⃣ Produto B - R$ 150\n3️⃣ Produto C - R$ 200"
  ],
  currentNodeId: "node_set_product",
  variables: { nome: "João Silva" },
  executionPath: [
    'node_start', 
    'node_greeting', 
    'node_question', 
    'node_ask_product', 
    'node_set_product'
  ],
  awaitingInput: true
}

// Step 3: Send response
await sendWhatsAppMessage('5511999999999',
  "Temos 3 produtos incríveis! Qual te interessa?\n1️⃣ Produto A - R$ 100\n2️⃣ Produto B - R$ 150\n3️⃣ Produto C - R$ 200");

// Step 4: Save updated state
await db.conversationStates.updateOne({
  phone_number: '5511999999999',
  flow_id: 'flow_001'
}, {
  current_node_id: 'node_set_product',
  variables: { nome: 'João Silva' },
  execution_path: [
    'node_start', 'node_greeting', 'node_question',
    'node_ask_product', 'node_set_product'
  ]
});
```

**Bot sends:**
```
Temos 3 produtos incríveis! Qual te interessa?
1️⃣ Produto A - R$ 100
2️⃣ Produto B - R$ 150
3️⃣ Produto C - R$ 200
```

**User sees:** Menu com 3 opções

### 2.4 Usuário escolhe um produto

**Webhook POST:**
```json
{
  "entry": [{
    "changes": [{
      "value": {
        "messages": [{
          "from": "5511999999999",
          "text": { "body": "2" }
        }]
      }
    }]
  }]
}
```

**Backend Processing:**

```typescript
// Step 1: Load state
const state = await db.conversationStates.findOne({
  phone_number: '5511999999999',
  flow_id: 'flow_001'
});

// State:
{
  current_node_id: 'node_set_product',
  variables: { nome: 'João Silva' },
  execution_path: [...]
}

// Step 2: Execute flow with user input
const result = await executeFlow({
  flowId: 'flow_001',
  userMessage: '2',
  state
});

// Execution trace:
// → currentNodeId = 'node_set_product' (QUESTION node)
// → Store input: variables[produto] = '2'
// → Move to next node: node_end (from edge)
// → Execute node_end (END node):
//   - Extract message: "Obrigado {{nome}}!..."
//   - Substitute variables:
//     {{nome}} → 'João Silva'
//     {{produto}} → '2'
//   - Final: "Obrigado João Silva! Enviamos mais informações sobre o Produto 2 para seu email..."
//   - currentNodeId = null (END reached)

// Result:
{
  responses: [
    "Obrigado João Silva! Enviamos mais informações sobre o Produto 2 para seu email. Em breve nossa equipe entra em contato! 🎉"
  ],
  currentNodeId: null,
  variables: { nome: 'João Silva', produto: '2' },
  executionPath: [...all nodes],
  awaitingInput: false
}

// Step 3: Send response
await sendWhatsAppMessage('5511999999999',
  "Obrigado João Silva! Enviamos mais informações sobre o Produto 2 para seu email. Em breve nossa equipe entra em contato! 🎉");

// Step 4: Save final state
await db.conversationStates.updateOne({
  phone_number: '5511999999999',
  flow_id: 'flow_001'
}, {
  current_node_id: null, // Conversation ended
  variables: { nome: 'João Silva', produto: '2' },
  is_active: false, // Mark as closed
  execution_path: [all nodes]
});

// Step 5: Log final message
await db.conversationLogs.create({
  phone_number: '5511999999999',
  flow_id: 'flow_001',
  user_message: '2',
  bot_response: 'Obrigado João Silva!...',
  timestamp: new Date()
});
```

**Bot sends:**
```
Obrigado João Silva! Enviamos mais informações sobre o Produto 2 para seu email. Em breve nossa equipe entra em contato! 🎉
```

**Conversation ends** - State saved for future reference

---

## 3. RESPOSTAS DO BACKEND PARA META API

### 3.1 Enviar mensagem simples

```typescript
async function sendWhatsAppMessage(phone: string, message: string) {
  const response = await fetch(
    `https://graph.instagram.com/v18.0/${PHONE_NUMBER_ID}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phone.replace(/\D/g, ''),
        type: 'text',
        text: {
          body: message
        }
      })
    }
  );

  const data = await response.json();
  
  if (!response.ok) {
    console.error('Error sending message:', data);
    throw new Error(`Failed to send message: ${data.error.message}`);
  }

  return data;
  // Response:
  // {
  //   "messages": [
  //     {
  //       "id": "wamid.XYZ123="
  //     }
  //   ]
  // }
}
```

### 3.2 Enviar com template (para Official Connection)

```typescript
async function sendTemplateMessage(
  phone: string,
  templateName: string,
  variables: string[]
) {
  const response = await fetch(
    `https://graph.instagram.com/v18.0/${PHONE_NUMBER_ID}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone.replace(/\D/g, ''),
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: 'pt_BR'
          },
          components: [
            {
              type: 'body',
              parameters: variables.map(v => ({ type: 'text', text: v }))
            }
          ]
        }
      })
    }
  );

  return await response.json();
}
```

### 3.3 Enviar com botões interativos

```typescript
async function sendInteractiveButtons(
  phone: string,
  headerText: string,
  bodyText: string,
  buttons: Array<{ title: string; id: string }>
) {
  const response = await fetch(
    `https://graph.instagram.com/v18.0/${PHONE_NUMBER_ID}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone.replace(/\D/g, ''),
        type: 'interactive',
        interactive: {
          type: 'button',
          header: {
            type: 'text',
            text: headerText
          },
          body: {
            text: bodyText
          },
          action: {
            buttons: buttons.map((btn, idx) => ({
              type: 'reply',
              reply: {
                id: btn.id,
                title: btn.title
              }
            }))
          }
        }
      })
    }
  );

  return await response.json();
}
```

---

## 4. DIAGRAMA VISUAL - FLUXO COMPLETO

```
┌─────────────────────────────────────────────────────────────┐
│ USER SENDS MESSAGE VIA WHATSAPP                             │
│ "João Silva" (in reply to "Qual é seu nome?")               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ META CLOUD API RECEIVES MESSAGE                             │
│ Validates webhook signature                                 │
│ Adds to webhook queue                                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ SENDS WEBHOOK POST TO YOUR BACKEND                          │
│ POST https://your-api.com/api/v1/whatsapp/webhook           │
│ Payload includes phone, text, timestamp                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ WEBHOOK HANDLER (handleWebhook)                             │
│ ✅ Parse payload                                            │
│ ✅ Extract: phone = "5511999999999"                         │
│ ✅ Extract: message_text = "João Silva"                     │
│ ✅ Validate token                                           │
│ ✅ Return 200 OK (immediately)                              │
└────────────────────┬────────────────────────────────────────┘
                     │
         (ASYNC PROCESSING STARTS)
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ MESSAGE ROUTER (processMessageAsync)                        │
│ ✅ Query: find WhatsAppNumber by phone                      │
│ ✅ Result: { id: 'num_001', default_chatbot_id: ... }      │
│ ✅ Load chatbot + flow from default_chatbot_id             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ CONVERSATION STATE MANAGER                                  │
│ ✅ Query: find state by (phone, flow_id)                    │
│ ✅ Result: EXISTS (from previous message)                   │
│ ✅ Current node: node_question                              │
│ ✅ Variables: { nome: undefined }                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ FLOW EXECUTION ENGINE (executeFlow)                         │
│                                                             │
│ Process Input:                                              │
│ ├─ currentNodeId = 'node_question'                         │
│ ├─ userMessage = 'João Silva'                              │
│ ├─ variables[nome] = 'João Silva' (store input)            │
│                                                             │
│ Navigate:                                                   │
│ ├─ Find edge from node_question → node_ask_product         │
│ ├─ currentNodeId = 'node_ask_product'                      │
│                                                             │
│ Execute node_ask_product (MESSAGE):                        │
│ ├─ Content: "Temos 3 produtos..."                          │
│ ├─ Add to responses[]                                       │
│ ├─ Find next edge → node_set_product                       │
│ ├─ currentNodeId = 'node_set_product' (QUESTION)           │
│ ├─ STOP (waiting for input)                                │
│                                                             │
│ Return:                                                     │
│ ├─ responses: ["Temos 3 produtos..."]                      │
│ ├─ currentNodeId: 'node_set_product'                       │
│ ├─ variables: { nome: 'João Silva' }                       │
│ ├─ awaitingInput: true                                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ SAVE STATE                                                  │
│ ✅ Update conversation_states:                              │
│    current_node_id = 'node_set_product'                    │
│    variables = { nome: 'João Silva' }                      │
│    last_message_at = NOW()                                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ LOG CONVERSATION                                            │
│ ✅ Insert into conversation_logs:                           │
│    phone, flow_id, user_message, bot_response, timestamp   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ SEND RESPONSE TO META API                                   │
│ POST /messages                                              │
│ Body: {                                                     │
│   to: "5511999999999",                                      │
│   text: { body: "Temos 3 produtos..." }                     │
│ }                                                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ META API DELIVERS TO USER                                   │
│ ✅ Route to correct WhatsApp instance                       │
│ ✅ User receives message                                    │
│ ✅ User sees menu options                                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
           (CYCLE REPEATS ON NEXT MESSAGE)
```

---

## 5. VERIFICAÇÃO DE WEBHOOK (GET Request)

Quando você configura o webhook pela primeira vez no Meta Business:

```http
GET /api/v1/whatsapp/webhook?
  hub.mode=subscribe&
  hub.verify_token=seu_token_seguro_aqui&
  hub.challenge=CHALLENGE_VALUE_123456
```

**Backend Response:**
```typescript
@Get('/webhook')
handleWebhookVerification(
  @Query('hub.mode') mode: string,
  @Query('hub.verify_token') token: string,
  @Query('hub.challenge') challenge: string
) {
  if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
    return challenge; // Return the challenge as string in response body
  }
  throw new UnauthorizedException();
}

// Meta receives: "CHALLENGE_VALUE_123456"
// Status: ✅ Webhook verified
// Subsequent messages will use POST method
```

---

## 6. ERROR SCENARIOS

### Scenario 1: Phone não registrado

```json
{
  "entry": [{
    "changes": [{
      "value": {
        "messages": [{
          "from": "5599999999999",
          "text": { "body": "Oi" }
        }]
      }
    }]
  }]
}
```

**Backend:**
```typescript
const whatsappNumber = await db.whatsappNumbers.findOne({
  phone_number: "5599999999999"
});

if (!whatsappNumber) {
  await sendWhatsAppMessage(
    "5599999999999",
    "❌ Este número não está registrado no sistema. Por favor, contacte o suporte."
  );
  return { status: "ok" };
}
```

### Scenario 2: Chatbot não configurado

```typescript
if (!whatsappNumber.default_chatbot_id) {
  const fallback = await db.flows.findOne({ is_fallback: true });
  
  if (!fallback) {
    await sendWhatsAppMessage(
      phone,
      "⚙️ Desculpe, nenhum chatbot foi configurado para este número. Por favor, tente novamente mais tarde."
    );
    return { status: "ok" };
  }
}
```

### Scenario 3: Flow corrompido/não encontrado

```typescript
const flow = await loadFlow(flowId);

if (!flow || !flow.nodes || flow.nodes.length === 0) {
  console.error(`Flow ${flowId} is corrupted`);
  await sendWhatsAppMessage(
    phone,
    "❌ Erro ao processar sua mensagem. Tente novamente."
  );
  
  // Alert admin
  await notifyAdmin({
    level: 'critical',
    message: `Flow ${flowId} corrupted`,
    phone
  });
  
  return { status: "ok" };
}
```

### Scenario 4: Infinite loop (ciclo de nodes)

```typescript
const MAX_ITERATIONS = 100;
let iterations = 0;

while (currentNodeId && iterations < MAX_ITERATIONS) {
  // ... execute node
  iterations++;
}

if (iterations >= MAX_ITERATIONS) {
  console.warn(`Flow ${flowId} exceeded max iterations`);
  await sendWhatsAppMessage(
    phone,
    "⚠️ Encontramos um loop no fluxo. Por favor, avise ao suporte."
  );
}
```

---

## 7. CONVERSATION HISTORY - EXEMPLO

**Query:**
```typescript
// GET /conversations?flow_id=flow_001
const logs = await db.conversationLogs.find({
  flow_id: 'flow_001'
})
  .sort({ timestamp: -1 })
  .limit(100);
```

**Response:**
```json
[
  {
    "id": "log_003",
    "phone_number": "+55 11 99999-9999",
    "flow_id": "flow_001",
    "user_message": "2",
    "bot_response": "Obrigado João Silva! Enviamos mais informações...",
    "node_id": "node_end",
    "timestamp": "2024-12-12T10:05:30Z"
  },
  {
    "id": "log_002",
    "phone_number": "+55 11 99999-9999",
    "flow_id": "flow_001",
    "user_message": "João Silva",
    "bot_response": "Temos 3 produtos incríveis!...",
    "node_id": "node_set_product",
    "timestamp": "2024-12-12T10:04:20Z"
  },
  {
    "id": "log_001",
    "phone_number": "+55 11 99999-9999",
    "flow_id": "flow_001",
    "user_message": "Olá, preciso de ajuda",
    "bot_response": "Qual é seu nome?",
    "node_id": "node_question",
    "timestamp": "2024-12-12T10:03:10Z"
  }
]
```

---

**Status:** Pronto para referência durante implementação
