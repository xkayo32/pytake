# Análise: Integração de Mensagens com Fluxos

**Data:** 12 de dezembro de 2025  
**Status:** Análise Completa - Pronto para Implementação  
**Objetivo:** Documentar arquitetura de recebimento de mensagens WhatsApp e integração com fluxos

---

## 1. ARQUITETURA ATUAL DO SISTEMA

### 1.1 Estrutura de Associação (Phone → Chatbot)

```
┌─────────────────────────────────────────────────────┐
│ WhatsAppNumber (Tabela Backend)                     │
├─────────────────────────────────────────────────────┤
│ id: UUID                                             │
│ phone_number: string (+55 11 99999-9999)            │
│ display_name: string                                 │
│ connection_type: "official" | "qrcode"              │
│ status: "connected" | "disconnected"                │
│ is_active: boolean                                  │
│ ✨ default_chatbot_id: UUID (FK → Chatbot)         │
│ webhook_url: string                                 │
│ webhook_verify_token: string                        │
│ created_at, updated_at                              │
└─────────────────────────────────────────────────────┘
        ↓ LOOKUP
┌─────────────────────────────────────────────────────┐
│ Chatbot/FlowBot (Tabela Backend)                    │
├─────────────────────────────────────────────────────┤
│ id: UUID                                             │
│ name: string                                         │
│ description: string                                 │
│ flow_id: UUID (FK → Flow)                           │
│ is_fallback: boolean (para mensagens sem match)     │
│ ab_test_enabled: boolean                            │
│ ab_test_flows: Array<FlowAssignment>                │
└─────────────────────────────────────────────────────┘
        ↓ LOAD
┌─────────────────────────────────────────────────────┐
│ Flow (Armazenado em KV + DB)                        │
├─────────────────────────────────────────────────────┤
│ id: UUID                                             │
│ nodes: Array<FlowNode>                              │
│ edges: Array<FlowEdge>                              │
│ variables: Object<string, any>                      │
│ createdAt, updatedAt                                │
└─────────────────────────────────────────────────────┘
```

### 1.2 Fluxo de Dados: Mensagem Incoming

```
1. User envia mensagem no WhatsApp
   ↓
2. Meta Cloud API → POST /whatsapp/webhook (Backend)
   Payload: {
     messaging_product: "whatsapp",
     entry: [{
       id: "phone_number_id",
       changes: [{
         value: {
           messages: [{
             from: "55119999999",  ← PHONE_NUMBER (CHAVE!)
             text: { body: "Olá" }
           }]
         }
       }]
     }]
   }
   ↓
3. Backend Webhook Handler:
   - Parse incoming_phone_number from payload
   - Query: SELECT * FROM whatsapp_numbers WHERE phone_number = ?
   ↓
4. Router Decision:
   - If WhatsAppNumber.default_chatbot_id exists:
     Load chatbot + flow
   - Else if is_fallback flow exists:
     Use fallback flow
   - Else:
     Store message in queue / send "chatbot not configured" reply
   ↓
5. Load/Create Conversation State:
   - Key: `conversation:${phone_number}:${flow_id}`
   - Retrieve: currentNodeId, variables, executionPath
   - If not exists: Initialize from flow start node
   ↓
6. Execute Flow:
   - Call flow execution engine with:
     { flowId, userId: phone_number, userMessage, state }
   - Get response + next state
   ↓
7. Send Response:
   - Meta Cloud API: POST /messages
   - Payload: { to: phone_number, text: { body: response } }
   ↓
8. Persist State:
   - Save updated conversation state to database
   - Log to message history for analytics
```

---

## 2. FRONTEND - O QUE JÁ EXISTE

### 2.1 Componentes de Gerenciamento

**Arquivo:** `src/pages/whatsapp-numbers.tsx`
- Lista todos os WhatsApp Numbers
- CRUD operations
- **Campo-chave:** `default_chatbot_id` → Select dropdown com todos chatbots
- Mensagem de ajuda: "O chatbot será ativado automaticamente quando uma mensagem for recebida"

**Arquivo:** `src/pages/chatbots.tsx`
- Gerencia Chatbots/Flows
- Opções de vinculação: `whatsappNumberIds[]` (múltiplos números)
- Fallback checkbox: `isFallback = true`
- A/B testing: `abTestEnabled`, `abTestFlows`

### 2.2 Service Layer

**Arquivo:** `src/services/whatsapp.service.ts`
```typescript
async getWhatsAppNumbers(): Promise<WhatsAppNumber[]>
async createWhatsAppNumber(data): Promise<WhatsAppNumber>
async updateWhatsAppNumber(id, data): Promise<WhatsAppNumber>
  // ✨ Accepts: default_chatbot_id
```

### 2.3 Types

**Arquivo:** `src/types/api.ts`
```typescript
interface WhatsAppNumber {
  id: string;
  phone_number: string;
  display_name: string;
  connection_type: WhatsAppConnectionType;
  status: "connected" | "disconnected";
  is_active: boolean;
  ✨ default_chatbot_id?: string; // KEY FIELD
  webhook_url: string;
  webhook_verify_token: string;
  // ... others
}

interface WhatsAppNumberUpdate {
  display_name?: string;
  webhook_url?: string;
  app_secret?: string;
  is_active?: boolean;
  away_message?: string;
  ✨ default_chatbot_id?: string; // SUPPORTED
}
```

### 2.4 Flow Execution Reference

**Arquivo:** `src/hooks/use-flow-simulator.ts`

Este é o **MODELO PARA O BACKEND** implementar! Contém:

```typescript
// Key Functions:
initializeFlow(): {
  // Auto-executes from start to first question/end
  // Returns: { responses, currentNodeId, variables }
}

processMessage(userMessage): {
  // Continue from current node with user input
  // Returns: { botResponse, responses, currentNodeId, variables }
}

getNextNode(nodeId, conditionMet?): {
  // Navigate edges with condition routing
}

resetSimulation(): void // Reset all state

// State structure:
interface SimulationState {
  currentNodeId: string | null;
  variables: Record<string, any>;
  executionPath: string[];
  messages: string[];
  awaitingInput: boolean;
  lastProcessedNodeId: string;
}
```

---

## 3. O QUE O BACKEND PRECISA IMPLEMENTAR

### 3.1 Webhook Receiver

**Endpoint:** `POST /whatsapp/webhook` (PUBLIC, NO AUTH)

Responsabilidades:
1. ✅ Parse Meta Cloud API webhook payload
2. ✅ Extract: `incoming_phone_number` from `entry[0].changes[0].value.messages[0].from`
3. ✅ Extract: `message_text` from `entry[0].changes[0].value.messages[0].text.body`
4. ✅ Validate webhook token (hub.verify_token match)
5. ✅ Return 200 OK immediately (async processing)

### 3.2 Message Router

After webhook received, route message:

```
incoming_phone_number
    ↓
QUERY: SELECT * FROM whatsapp_numbers 
       WHERE phone_number = ? AND is_active = true
    ↓
Found?
  ├─ YES: Has default_chatbot_id?
  │        ├─ YES: Load chatbot + flow → EXECUTE
  │        └─ NO: Has is_fallback flow?
  │              ├─ YES: Load fallback flow → EXECUTE
  │              └─ NO: SEND "Chatbot not configured" reply
  │
  └─ NO: SEND "Phone number not registered" reply
```

### 3.3 Conversation State Manager

**Storage Model:**

```
Database Table: conversation_states
┌─────────────────────────────────────────┐
│ id: UUID (PK)                           │
│ phone_number: string (idx)              │
│ flow_id: UUID (idx)                     │
│ current_node_id: string (nullable)      │
│ variables: JSON (default {})            │
│ execution_path: Array<string> JSON      │
│ last_message_at: timestamp              │
│ is_active: boolean                      │
│ session_expires_at: timestamp           │
│ created_at: timestamp                   │
│ updated_at: timestamp                   │
└─────────────────────────────────────────┘

Composite Index: (phone_number, flow_id, is_active)
TTL Policy: Auto-delete after 30 days of inactivity
```

**Operations:**

```typescript
// Load or create
getOrCreateConversationState(phone_number, flow_id): ConversationState
  // SELECT * WHERE phone_number AND flow_id AND is_active
  // If not found: CREATE new with currentNodeId=null (will init on first run)

// Update state
updateConversationState(phone_number, flow_id, state): void
  // UPDATE conversation_states SET 
  //   current_node_id, variables, execution_path, last_message_at

// Cleanup expired
cleanupExpiredSessions(): void
  // DELETE WHERE session_expires_at < NOW()
```

### 3.4 Flow Execution Engine

**Reference:** `src/hooks/use-flow-simulator.ts` (FRONTEND VERSION)

**Backend Implementation Requirements:**

1. **Node Types to Support:** (20+)
   - Basic: start, message, question, end
   - Logic: condition, jump, random
   - Actions: action, set_variable
   - Integration: handoff, delay, api_call
   - AI: ai_prompt, database_query, script
   - WhatsApp: whatsapp_template, interactive_buttons, interactive_list
   - Analytics: analytics, datetime

2. **Variable Substitution:**
   ```typescript
   // Pattern: {{variable_name}}
   const regex = /\{\{([^}]+)\}\}/g;
   const processMessage = (message, variables) => {
     return message.replace(regex, (_, varName) => 
       String(variables[varName] || "")
     );
   }
   ```

3. **Flow Execution Steps:**
   ```
   IF current_node_id IS NULL:
     → Initialize from START node
     → Auto-execute until QUESTION/END
     → Return initial messages
   ELSE:
     → Load current node from flow
     → Process user input
     → Execute logic (conditions, jumps, etc)
     → Move to next node
     → If QUESTION: Wait for user input (set awaitingInput=true)
     → If END: Close conversation
     → Return bot response
   ```

4. **Condition Routing:**
   ```typescript
   // Example: condition node checking age
   if (variables.age >= 18) {
     // Follow TRUE edge
     nextNodeId = findEdge(currentNodeId, { label: "true" })
   } else {
     // Follow FALSE edge  
     nextNodeId = findEdge(currentNodeId, { label: "false" })
   }
   ```

### 3.5 Message Sender

**Endpoint:** `POST /messages` (Meta Cloud API)

```typescript
await metaAPI.post('/messages', {
  messaging_product: 'whatsapp',
  recipient_type: 'individual',
  to: phone_number.replace(/\D/g, ''), // +55119999999 → 55119999999
  type: 'text',
  text: {
    body: bot_message
  }
});
```

---

## 4. IMPLEMENTAÇÃO STEP-BY-STEP

### Fase 1: Webhook + Router (Priority: CRITICAL)

```typescript
// POST /whatsapp/webhook
async handleWebhook(req: Request): Promise<Response> {
  // 1. Parse webhook
  const { entry } = req.body;
  const change = entry[0]?.changes[0]?.value;
  const message = change?.messages?.[0];
  
  if (!message) return { status: "ok" }; // Ignore non-message events
  
  const incoming_phone = message.from; // "55119999999"
  const message_text = message.text?.body; // "Olá"
  
  // 2. Find WhatsAppNumber
  const whatsapp_number = await db.whatsappNumbers.findOne({
    phone_number: incoming_phone,
    is_active: true
  });
  
  if (!whatsapp_number) {
    await sendWhatsAppMessage(incoming_phone, 
      "Número não registrado. Por favor, contate suporte.");
    return { status: "ok" };
  }
  
  // 3. Find Chatbot/Flow
  let flow;
  if (whatsapp_number.default_chatbot_id) {
    const chatbot = await db.chatbots.findById(
      whatsapp_number.default_chatbot_id
    );
    flow = await loadFlow(chatbot.flow_id);
  } else {
    const fallbackFlow = await db.flows.findOne({ is_fallback: true });
    if (!fallbackFlow) {
      await sendWhatsAppMessage(incoming_phone, 
        "Nenhum chatbot configurado para este número.");
      return { status: "ok" };
    }
    flow = await loadFlow(fallbackFlow.id);
  }
  
  // 4. Process message (async, return 200 immediately)
  processMessageAsync(incoming_phone, flow.id, message_text);
  
  return { status: "ok" };
}

async function processMessageAsync(phone, flowId, userMessage) {
  try {
    // Get or create conversation state
    let state = await db.conversationStates.findOne({
      phone_number: phone,
      flow_id: flowId,
      is_active: true
    });
    
    if (!state) {
      state = await initializeConversation(phone, flowId);
    }
    
    // Execute flow
    const result = await executeFlow({
      flowId,
      userMessage,
      state
    });
    
    // Save state
    await db.conversationStates.updateOne(
      { phone_number: phone, flow_id: flowId },
      {
        current_node_id: result.currentNodeId,
        variables: result.variables,
        execution_path: result.executionPath,
        last_message_at: new Date()
      }
    );
    
    // Send response
    for (const response of result.responses) {
      await sendWhatsAppMessage(phone, response);
    }
    
  } catch (error) {
    console.error("Error processing message:", error);
    await sendWhatsAppMessage(phone, 
      "Desculpe, ocorreu um erro. Tente novamente.");
  }
}
```

### Fase 2: Flow Execution Engine

```typescript
async function executeFlow(params: {
  flowId: string;
  userMessage: string;
  state: ConversationState;
}): Promise<ExecutionResult> {
  const { flowId, userMessage, state } = params;
  
  // Load flow definition
  const flow = await loadFlow(flowId);
  
  // Initialize if needed
  let currentNodeId = state.current_node_id;
  let variables = state.variables || {};
  let executionPath = state.execution_path || [];
  const responses: string[] = [];
  
  if (!currentNodeId) {
    // First run: find START node and auto-execute
    const startNode = flow.nodes.find(n => n.type === 'start');
    currentNodeId = startNode.id;
    
    // Auto-execute from start
    while (currentNodeId) {
      const node = flow.nodes.find(n => n.id === currentNodeId);
      
      if (node.type === 'question') {
        // Waiting for input
        break;
      }
      
      if (node.type === 'message') {
        const msg = substituteVariables(node.content, variables);
        responses.push(msg);
      }
      
      // Find next node
      currentNodeId = getNextNode(flow, currentNodeId, null);
      
      if (node.type === 'end') {
        // Extract end message
        if (node.content) {
          const msg = substituteVariables(node.content, variables);
          responses.push(msg);
        }
        currentNodeId = null;
        break;
      }
    }
    
    return {
      responses,
      currentNodeId,
      variables,
      executionPath,
      awaitingInput: currentNodeId !== null
    };
  }
  
  // Subsequent runs: process user input
  const currentNode = flow.nodes.find(n => n.id === currentNodeId);
  
  if (currentNode.type === 'question') {
    // Store user response in variable
    variables[currentNode.variableName] = userMessage;
    
    // Move to next node
    currentNodeId = getNextNode(flow, currentNodeId, true);
  }
  
  // Execute from current node
  while (currentNodeId) {
    const node = flow.nodes.find(n => n.id === currentNodeId);
    
    if (node.type === 'message') {
      const msg = substituteVariables(node.content, variables);
      responses.push(msg);
      currentNodeId = getNextNode(flow, currentNodeId, null);
    }
    
    if (node.type === 'question') {
      break; // Wait for next user input
    }
    
    if (node.type === 'condition') {
      const conditionMet = evaluateCondition(node, variables);
      currentNodeId = getNextNode(flow, currentNodeId, conditionMet);
    }
    
    if (node.type === 'end') {
      if (node.content) {
        const msg = substituteVariables(node.content, variables);
        responses.push(msg);
      }
      currentNodeId = null;
      break;
    }
    
    if (node.type === 'set_variable') {
      variables[node.variableName] = node.variableValue;
      currentNodeId = getNextNode(flow, currentNodeId, null);
    }
    
    if (node.type === 'delay') {
      // For synchronous execution, skip delay for now
      currentNodeId = getNextNode(flow, currentNodeId, null);
    }
    
    // Add more node types as needed...
  }
  
  return {
    responses,
    currentNodeId,
    variables,
    executionPath,
    awaitingInput: currentNodeId !== null
  };
}

function substituteVariables(text: string, variables: Record<string, any>): string {
  const regex = /\{\{([^}]+)\}\}/g;
  return text.replace(regex, (_, varName) => 
    String(variables[varName] || "")
  );
}

function getNextNode(flow: Flow, nodeId: string, conditionMet?: boolean): string | null {
  const edges = flow.edges.filter(e => e.source === nodeId);
  
  if (conditionMet === true || conditionMet === false) {
    // Condition routing
    const edge = edges.find(e => 
      (conditionMet && e.label === 'true') ||
      (!conditionMet && e.label === 'false')
    );
    return edge?.target || null;
  }
  
  // Default: take first edge
  return edges[0]?.target || null;
}
```

### Fase 3: Conversation History & Analytics

```typescript
// Log each exchange for analytics
async function logConversation(
  phone: string,
  flowId: string,
  userMessage: string,
  botResponse: string
) {
  await db.conversationLogs.create({
    phone_number: phone,
    flow_id: flowId,
    user_message: userMessage,
    bot_response: botResponse,
    timestamp: new Date()
  });
}

// Frontend feature: Conversations page
// GET /conversations?flow_id=xxx
async function getConversations(flowId: string) {
  return await db.conversationLogs.find({ flow_id: flowId })
    .sort({ timestamp: -1 })
    .limit(100);
}
```

---

## 5. FRONTEND MODIFICATIONS NEEDED

### 5.1 New Page: Conversations History

**File:** `src/pages/conversations.tsx` (ALREADY EXISTS)

Current state: Can list conversations but doesn't show message history tied to flows.

Needs:
- Dropdown: Select WhatsApp Number or Chatbot
- Dropdown: Select Conversation (by phone)
- Message thread view
- Export conversation option

### 5.2 Dashboard Update

**File:** `src/pages/dashboard.tsx`

Needs:
- Add metric: "Mensagens Processadas Hoje"
- Add metric: "Taxa de Resposta"
- Chart: Messages by hour
- Recent conversations widget

### 5.3 Validation in UI

**File:** `src/components/whatsapp/add-number-wizard.tsx`

When creating number, validate:
- ✅ Webhook URL is correct (`/api/v1/whatsapp/webhook`)
- ✅ Webhook verify token is saved and will work
- ✅ At least one chatbot assigned before marking active

---

## 6. DATABASE SCHEMA CHANGES NEEDED

```sql
-- New table for conversation states
CREATE TABLE conversation_states (
  id UUID PRIMARY KEY,
  phone_number VARCHAR(20) NOT NULL,
  flow_id UUID NOT NULL,
  current_node_id VARCHAR(100),
  variables JSONB DEFAULT '{}',
  execution_path JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  last_message_at TIMESTAMP,
  session_expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(phone_number, flow_id),
  INDEX idx_active (is_active, session_expires_at),
  INDEX idx_phone_flow (phone_number, flow_id)
);

-- Conversation logs for analytics
CREATE TABLE conversation_logs (
  id UUID PRIMARY KEY,
  phone_number VARCHAR(20) NOT NULL,
  flow_id UUID NOT NULL,
  user_message TEXT,
  bot_response TEXT,
  node_id VARCHAR(100),
  timestamp TIMESTAMP DEFAULT NOW(),
  INDEX idx_flow_time (flow_id, timestamp),
  INDEX idx_phone_time (phone_number, timestamp)
);

-- Add column to whatsapp_numbers if not exists
ALTER TABLE whatsapp_numbers 
ADD COLUMN default_chatbot_id UUID REFERENCES chatbots(id) ON DELETE SET NULL;

-- Add column to chatbots if not exists
ALTER TABLE chatbots 
ADD COLUMN is_fallback BOOLEAN DEFAULT false;
```

---

## 7. API ENDPOINTS SUMMARY

### Existing (Already Working)

```
GET    /whatsapp/
POST   /whatsapp/
GET    /whatsapp/{id}
PUT    /whatsapp/{id}  ← Now supports default_chatbot_id
DELETE /whatsapp/{id}
GET    /whatsapp/{id}/templates
POST   /whatsapp/{id}/templates
POST   /whatsapp/{id}/qrcode
GET    /whatsapp/{id}/qrcode/status
POST   /whatsapp/{id}/disconnect
```

### Need Implementation

```
✅ GET    /whatsapp/webhook         (Webhook verification - if using Meta)
✅ POST   /whatsapp/webhook         (CRITICAL - Receive incoming messages)
❌ GET    /conversations            (Message history by flow)
❌ GET    /conversations/{phone}    (Conversation detail)
❌ POST   /conversations/export     (Export conversation)
❌ GET    /analytics/conversations  (Aggregate stats)
```

---

## 8. TESTING STRATEGY

### Unit Tests

```typescript
// Test: Message router
test("Routes message to correct flow", async () => {
  // Setup: WhatsAppNumber with default_chatbot_id
  // Call: handleWebhook with incoming message
  // Assert: processMessageAsync called with correct flow
});

// Test: Variable substitution
test("Substitutes variables in message", () => {
  const msg = "Olá {{name}}, seu saldo é {{balance}}";
  const vars = { name: "João", balance: "R$ 100" };
  expect(substituteVariables(msg, vars))
    .toBe("Olá João, seu saldo é R$ 100");
});

// Test: Condition routing
test("Routes based on condition", async () => {
  // Setup: Flow with condition node
  // Call: executeFlow with variables
  // Assert: Correct edge taken
});
```

### E2E Tests (Using existing E2E framework)

```typescript
// e2e/whatsapp-message-flow.spec.ts
test("End-to-end: Message → Flow → Response", async () => {
  // 1. Create WhatsApp number via API
  // 2. Create chatbot + flow
  // 3. Link number to chatbot (default_chatbot_id)
  // 4. Send mock webhook (POST /whatsapp/webhook)
  // 5. Assert: Response sent back to user
  // 6. Assert: Conversation state persisted
  // 7. Send follow-up message
  // 8. Assert: Flow continues correctly
});
```

### Manual Testing via Postman

```
1. Register WhatsApp Number
   POST /whatsapp/
   Body: {
     phone_number: "+55 11 99999-9999",
     connection_type: "official",
     ...
   }

2. Get number ID from response

3. Link to Chatbot
   PUT /whatsapp/{id}
   Body: {
     default_chatbot_id: "flow-uuid-here"
   }

4. Simulate incoming message
   POST /whatsapp/webhook
   Body: {
     entry: [{
       changes: [{
         value: {
           messages: [{
             from: "55119999999",
             text: { body: "Olá" }
           }]
         }
       }]
     }]
   }

5. Check Meta API logs for outgoing message
```

---

## 9. ERROR HANDLING

### Scenarios to Handle

```
1. Phone number not registered
   → Response: "Número não registrado"
   → Log: Warning

2. No chatbot assigned + no fallback
   → Response: "Chatbot não configurado"
   → Log: Error

3. Flow not found / corrupted
   → Response: "Erro ao processar mensagem"
   → Log: Critical

4. Invalid variable in message
   → Behavior: Replace with empty string
   → Log: Debug

5. Infinite loop in flow (cycle detection)
   → Behavior: Stop after N nodes (e.g., 100)
   → Log: Warning

6. External API failure (ai_prompt, api_call)
   → Behavior: Use fallback message or handoff
   → Log: Error

7. Message sending to WhatsApp fails
   → Behavior: Retry 3x with exponential backoff
   → Log: Error + send admin alert
```

---

## 10. PERFORMANCE CONSIDERATIONS

### Caching Strategy

```typescript
// Cache flow definitions (rarely change)
const flowCache = new Map<string, Flow>();
const CACHE_TTL = 1 * 60 * 60 * 1000; // 1 hour

async function loadFlow(flowId: string): Flow {
  const cached = flowCache.get(flowId);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL) {
    return cached;
  }
  
  const flow = await db.flows.findById(flowId);
  flowCache.set(flowId, { ...flow, cachedAt: Date.now() });
  return flow;
}
```

### Async Processing

```typescript
// Don't block webhook response
POST /whatsapp/webhook
  ↓
  // IMMEDIATE: Return 200 OK
  ↓
  // BACKGROUND: processMessageAsync() in queue/worker
  // (e.g., Bull Queue, Celery, etc)
```

### Connection Pooling

```
- Use connection pools for database
- Implement circuit breaker for Meta API calls
- Add timeout (5s) for all API operations
```

---

## 11. MIGRATION PLAN

### Step 1: Implement Backend (Week 1)
- Webhook receiver + parser
- Message router
- Conversation state manager
- Flow execution engine
- Database schema changes

### Step 2: Testing (Week 1-2)
- Unit tests for all functions
- E2E tests with mock webhooks
- Manual testing with Postman
- Load testing (10-20 concurrent conversations)

### Step 3: Deploy & Monitor (Week 2)
- Deploy to staging
- Monitor webhook success rate
- Monitor execution times
- Check error logs

### Step 4: Frontend Enhancements (Week 3)
- Add conversations history page
- Add analytics widgets
- Add message export
- Add validation checks

### Step 5: Production (Week 4)
- Deploy backend to production
- Deploy frontend changes
- Monitor for 7 days
- Gather user feedback
- Iterate based on metrics

---

## 12. SUMMARY FOR DEVELOPER

### What's Already Built (Frontend)

✅ WhatsApp number registration with `default_chatbot_id` field  
✅ Chatbot management with multiple number assignments  
✅ Flow builder with complete node support  
✅ Chat simulator for testing flows  
✅ Variable system with {{variable}} substitution  
✅ All UI components ready  

### What Needs Building (Backend)

❌ POST /whatsapp/webhook handler  
❌ Message router (phone → chatbot lookup)  
❌ Conversation state persistence  
❌ Flow execution engine (copy logic from frontend useFlowSimulator)  
❌ Message sender to Meta API  
❌ Database schema updates  
❌ Error handling & logging  
❌ Retry logic & circuit breaker  

### Key Reference Files

Frontend (Reference Implementation):
- `src/hooks/use-flow-simulator.ts` → Use as blueprint for backend flow engine
- `src/pages/whatsapp-numbers.tsx` → Shows default_chatbot_id field
- `src/pages/chatbots.tsx` → Shows number-to-flow linking

Backend (To Create):
- `POST /whatsapp/webhook` → Entry point
- `messageRouter.ts` → Phone to flow lookup
- `flowExecutor.ts` → Flow engine
- `conversationStateManager.ts` → State persistence
- Database migrations

---

**Status:** Ready for Backend Implementation  
**Next Step:** Begin Phase 1 (Webhook + Router)
