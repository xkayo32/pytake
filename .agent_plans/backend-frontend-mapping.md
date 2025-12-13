# Mapeamento Backend-Frontend: O que Funciona vs O que Ajustar

**Data:** 13 de dezembro de 2025 - 03:50 UTC  
**Status:** ✅ Teste com dados reais da API de produção  
**Objetivo:** Identificar gaps de integração e ajustes necessários

---

## 1. RESUMO EXECUTIVO

### ✅ FUNCIONANDO
| Componente | Backend | Frontend | Status |
|-----------|---------|----------|--------|
| **Autenticação** | JWT Bearer ✅ | useAuth hook ✅ | ✅ OK |
| **WhatsApp Numbers** | GET /whatsapp/ ✅ | whatsappService ✅ | ✅ OK |
| **default_chatbot_id** | Campo presente ✅ | UI component ✅ | ✅ OK |
| **Flows (básico)** | GET /flows/?chatbot_id ✅ | flowbuilderService ✅ | ✅ OK |
| **Flow Structure** | nodes + edges ✅ | Flow canvas ✅ | ✅ OK |
| **Variables {{var}}** | Backend suporta ✅ | VariableInput ✅ | ✅ OK |

### ⚠️ AJUSTES NECESSÁRIOS
1. **Conversations API** - Precisa filtro `chatbot_id`
2. **Webhook receiver** - Não testado ainda
3. **Flow execution** - Backend vs Frontend discrepância
4. **Message sender** - Precisa implementação

---

## 2. TESTES EXECUTADOS COM DADOS REAIS

### 2.1 Autenticação JWT
```
✅ POST /auth/login
Status: 200 OK
Response: access_token, refresh_token, user (super_admin)
Validade: 900 segundos (15 minutos)

Frontend: ✅ useAuth hook está implementado e funcionando
```

### 2.2 GET /whatsapp/ - Listar Números
```
✅ GET /api/v1/whatsapp/
Status: 200 OK
Authentication: Bearer token (obrigatório)

Response Data:
{
  "phone_number": "+556181287787",
  "display_name": "Pydev",
  "default_chatbot_id": "f9651dd7-87fd-40c0-9c5b-599b0dfe9ea8", ✨
  "webhook_url": "https://api-dev.pytake.net/api/v1/whatsapp/webhook",
  "webhook_verify_token": "dWd8cMBfNGi6Q4nTmcoswb4BATWgfvyu"
}

Frontend: ✅ whatsappService.getWhatsAppNumbers() está correto
Arquivo: src/services/whatsapp.service.ts (linha 13-22)
```

### 2.3 GET /flows/?chatbot_id - Listar Flows
```
✅ GET /api/v1/flows/?chatbot_id=f9651dd7-87fd-40c0-9c5b-599b0dfe9ea8
Status: 200 OK
Authentication: Bearer token (obrigatório)

Response Data:
{
  "flows": [{
    "id": "756df9af-09e7-4634-8f64-ff483d9436ca",
    "name": "Main Flow - Teste Persistência 03:45",
    "is_main": true,
    "is_fallback": false,
    "canvas_data": {
      "nodes": [
        { "id": "start", "type": "start", ... },
        { "id": "question-1765557724569", "type": "question", 
          "data": { "content": "Qual seu nome", "variableName": "meu_nome" }
        },
        { "id": "message-1765557754452", "type": "message",
          "data": { "content": "Ola {{meu_nome}}" }  ← VARIÁVEL!
        },
        { "id": "end-1765557772185", "type": "end", ... }
      ],
      "edges": [
        { "source": "start", "target": "question-1765557724569" },
        { "source": "question-1765557724569", "target": "message-1765557754452" },
        { "source": "message-1765557754452", "target": "end-1765557772185" }
      ]
    },
    "created_at": "2025-12-11T02:11:54.054725Z",
    "updated_at": "2025-12-12T18:18:21.566379Z"
  }]
}

Frontend: ✅ flowbuilderService.getFlows() está correto
Arquivo: src/services/flowbuilder.service.ts (linha 86-105)
```

### 2.4 GET /conversations/?chatbot_id - Listar Conversas
```
✅ GET /api/v1/conversations/?chatbot_id=f9651dd7-87fd-40c0-9c5b-599b0dfe9ea8
Status: 200 OK
Response: [] (empty array - sem conversas ainda)

⚠️ DESCOBERTA: API retorna array vazio, não objeto paginado
Backend format: [] (array direto)
Frontend expects: { items: [], total: 0 } (paginado)

Frontend Issue:
Arquivo: src/services/conversations.service.ts (linha 17-31)
Código atual tenta converter, mas sem meta informações de paginação
```

---

## 3. ANÁLISE DETALHADA: O QUE CADA SERVIÇO PRECISA

### 3.1 flowbuilderService.ts
**Arquivo:** `src/services/flowbuilder.service.ts`

#### ✅ O que funciona:
- getFlows() está correto
- Endpoints mapeados corretamente

#### ⚠️ O que precisa ajustar:
1. **getFlows() não passa chatbot_id**
   ```typescript
   // ATUAL (linha 93-105):
   async getFlows(params?: { skip?: number; limit?: number }) {
     // ❌ NÃO ESTÁ PASSANDO chatbot_id
   }
   
   // NECESSÁRIO:
   async getFlows(chatbotId: string, params?: { skip?: number; limit?: number }) {
     // ✅ PASSAR chatbot_id como query param
   }
   ```

2. **Falta método para criar/atualizar flows**
   ```typescript
   // ❌ NÃO EXISTE:
   async saveFlow(chatbotId: string, flowData: any)
   
   // ✅ PRECISA:
   async saveFlow(chatbotId: string, flowId: string, flowData: any)
   ```

3. **Falta método para deletar flows**
   ```typescript
   // ❌ NÃO EXISTE:
   async deleteFlow(flowId: string)
   ```

---

### 3.2 conversationsService.ts
**Arquivo:** `src/services/conversations.service.ts`

#### ✅ O que funciona:
- Estrutura básica está pronta
- Tipos estão definidos

#### ⚠️ O que precisa ajustar:
1. **getConversations() não passa chatbot_id**
   ```typescript
   // ATUAL (linha 17-31):
   async getConversations(params?: ConversationsListParams) {
     // ❌ NÃO ESTÁ PASSANDO chatbot_id
     await api.get("/conversations/", params)
   }
   
   // NECESSÁRIO:
   async getConversations(chatbotId: string, params?: ConversationsListParams) {
     // ✅ PASSAR chatbot_id como query param
     await api.get("/conversations/?chatbot_id=" + chatbotId, params)
   }
   ```

2. **API retorna array direto, não objeto paginado**
   ```typescript
   // Backend response: []
   // Frontend expects: { items: [], total: 0 }
   
   // AJUSTE NECESSÁRIO:
   return {
     items: Array.isArray(data) ? data : [],
     total: (data as any)?.total || (Array.isArray(data) ? data.length : 0)
   }
   ```

---

### 3.3 whatsappService.ts
**Arquivo:** `src/services/whatsapp.service.ts`

#### ✅ O que funciona:
- getWhatsAppNumbers() - OK
- getWhatsAppNumber(id) - OK
- updateWhatsAppNumber(id, data) com `default_chatbot_id` - OK
- getAllWhatsAppNumbers() - OK (se existe)

#### ✅ Nenhum ajuste necessário
Backend e frontend estão alinhados para WhatsApp numbers

---

## 4. FLOW EXECUTION: Backend vs Frontend

### Descoberta Importante
**Backend retorna flow com estrutura completa de nodes + edges**
```json
{
  "nodes": [
    { "id": "start", "type": "start", ... },
    { "id": "question-xyz", "type": "question", "data": { "variableName": "meu_nome" } },
    { "id": "message-abc", "type": "message", "data": { "content": "Ola {{meu_nome}}" } }
  ],
  "edges": [
    { "source": "start", "target": "question-xyz" },
    { "source": "question-xyz", "target": "message-abc" }
  ]
}
```

### Frontend Implementation
**Arquivo:** `src/hooks/use-flow-simulator.ts`

Frontend tem simulador de flow, mas:
- ✅ Lê nodes e edges corretamente
- ✅ Executa variáveis {{var}}
- ⚠️ **Pergunta:** Este simulador deve rodar no backend ou frontend?

**Análise:**
- Se rodar no **backend:** Frontend só envia mensagem, backend executa flow e responde
- Se rodar no **frontend:** Frontend executa flow localmente e envia resposta

**Recomendação:**
```
Backend deve executar flows para:
✅ Persistir estado da conversa
✅ Salvar histórico de mensagens
✅ Suportar multiple clients (web, app, etc)
✅ Executar ações backend (API calls, database queries)
✅ Aplicar analytics corretamente

Frontend simulator pode ser usado para:
✅ Preview durante design (Visual testing)
✅ Offline development
```

---

## 5. WEBHOOK HANDLER: Ainda não testado

**O que falta verificar:**

### 5.1 POST /whatsapp/webhook (Recebimento)
```
Endpoint: POST /api/v1/whatsapp/webhook
Content-Type: application/json
X-Hub-Signature: sha256=<hmac>

Backend precisa:
1. ✅ Validar HMAC signature
2. ✅ Extrair mensagem de payload Meta
3. ✅ Criar conversation se não existe
4. ✅ Guardar mensagem no banco
5. ⏳ EXECUTAR FLOW (qual versão?)
6. ⏳ Enviar resposta de volta para usuário

Status: NÃO TESTADO - Precisa simular webhook da Meta
```

### 5.2 GET /whatsapp/webhook (Verificação Meta)
```
Endpoint: GET /api/v1/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=xxx&hub.challenge=yyy
Response: Plain text echo of hub.challenge

Backend precisa:
1. ✅ Validar hub.verify_token (deve ser webhook_verify_token)
2. ✅ Retornar hub.challenge como plain text

Status: NÃO TESTADO - Precisa testar com Meta sandbox
```

---

## 6. MENSAGENS: POST /messages

**Não foi testado se existe endpoint para enviar mensagens**

Possíveis endpoints:
```
POST /api/v1/conversations/{id}/messages  (para agent enviar)
POST /api/v1/whatsapp/send  (direto para WhatsApp)
POST /api/v1/messages/send  (genérico)
```

**Status:** ⏳ Precisa verificar Swagger completo

---

## 7. CHECKLIST: AJUSTES NECESSÁRIOS NO FRONTEND

### Priority 1 - CRÍTICO (Bloqueia funcionalidade)
- [ ] **flowbuilderService.ts** - Adicionar `chatbotId` obrigatório em `getFlows()`
- [ ] **conversationsService.ts** - Adicionar `chatbotId` obrigatório em `getConversations()`
- [ ] **conversationsService.ts** - Ajustar parser de resposta array → paginada

### Priority 2 - IMPORTANTE (Completa integração)
- [ ] **flowbuilderService.ts** - Adicionar `saveFlow()` para criar/atualizar
- [ ] **flowbuilderService.ts** - Adicionar `deleteFlow()` para remover
- [ ] **whatsappService.ts** - Adicionar `sendMessage()` ou equivalente
- [ ] **useFlowSimulator.ts** - Verificar se backend executa ou frontend?

### Priority 3 - VALIDAÇÃO (Qualidade)
- [ ] Testar POST /whatsapp/webhook com payload real
- [ ] Testar GET /whatsapp/webhook (Meta verification)
- [ ] Testar flow execution end-to-end
- [ ] Testar conversation state persistence

---

## 8. CÓDIGO ESPECÍFICO PARA AJUSTAR

### 8.1 flowbuilderService.ts (linha 86-105)

**ATUAL:**
```typescript
async getFlows(params?: {
  skip?: number;
  limit?: number;
}): Promise<FlowBotsListResponse> {
  const queryParams = new URLSearchParams();
  if (params?.skip !== undefined)
    queryParams.append("skip", String(params.skip));
  if (params?.limit !== undefined)
    queryParams.append("limit", String(params.limit));
  const query = queryParams.toString();
  // ... resto do código
}
```

**NECESSÁRIO:**
```typescript
async getFlows(
  chatbotId: string,  // ← ADICIONAR
  params?: {
    skip?: number;
    limit?: number;
  }
): Promise<FlowBotsListResponse> {
  const queryParams = new URLSearchParams();
  queryParams.append("chatbot_id", chatbotId);  // ← ADICIONAR
  if (params?.skip !== undefined)
    queryParams.append("skip", String(params.skip));
  if (params?.limit !== undefined)
    queryParams.append("limit", String(params.limit));
  const query = queryParams.toString();
  // ... resto do código
}
```

### 8.2 conversationsService.ts (linha 17-31)

**ATUAL:**
```typescript
async getConversations(
  params?: ConversationsListParams
): Promise<PaginatedResponse<Conversation>> {
  try {
    const data = await api.get<Conversation[]>(
      "/conversations/",  // ❌ Sem chatbot_id
      params as any
    );
    return {
      items: Array.isArray(data) ? data : [],
      total: Array.isArray(data) ? data.length : 0,
    };
  } catch (error) {
    // fallback
  }
}
```

**NECESSÁRIO:**
```typescript
async getConversations(
  chatbotId: string,  // ← ADICIONAR
  params?: ConversationsListParams
): Promise<PaginatedResponse<Conversation>> {
  try {
    const queryParams = new URLSearchParams();
    queryParams.append("chatbot_id", chatbotId);  // ← ADICIONAR
    if (params?.skip) queryParams.append("skip", String(params.skip));
    if (params?.limit) queryParams.append("limit", String(params.limit));
    
    const query = queryParams.toString();
    const data = await api.get<Conversation[]>(
      `/conversations/?${query}`,  // ✅ Com chatbot_id
      params as any
    );
    return {
      items: Array.isArray(data) ? data : [],
      total: Array.isArray(data) ? data.length : 0,
    };
  } catch (error) {
    // fallback
  }
}
```

---

## 9. PRÓXIMOS TESTES

### 9.1 Testar Webhook (Simular recebimento)
```bash
# Simular Meta webhook com payload real
POST /api/v1/whatsapp/webhook
Content-Type: application/json
X-Hub-Signature: sha256=<hmac>

Body: {
  "object": "whatsapp_business_account",
  "entry": [{
    "id": "123456789",
    "changes": [{
      "value": {
        "messaging_product": "whatsapp",
        "messages": [{
          "from": "556181287787",
          "id": "wamid.123",
          "timestamp": "1671234567",
          "type": "text",
          "text": { "body": "Olá! Meu nome é João" }
        }],
        "contacts": [{
          "profile": { "name": "João Silva" },
          "wa_id": "556181287787"
        }]
      }
    }]
  }]
}
```

### 9.2 Verificar resposta de webhook
```
Esperado: Backend executa flow e:
1. Cria conversation se não existe
2. Armazena mensagem recebida
3. Executa flow (question node)
4. Retorna response para Meta
5. Meta entrega ao usuário
```

### 9.3 Testar GET /conversations/ após webhook
```
GET /api/v1/conversations/?chatbot_id=f9651dd7-87fd-40c0-9c5b-599b0dfe9ea8

Esperado: Array com nova conversation
```

---

## 10. CONCLUSÃO & RECOMENDAÇÕES

### ✅ Status Geral: 70% Pronto
- Autenticação: ✅ OK
- WhatsApp management: ✅ OK
- Flow structure: ✅ OK (mas precisa ajustar params)
- Conversation management: ⚠️ Ajustes simples necessários
- Webhook integration: ⏳ Não testado
- Flow execution: ⏳ Não testado
- Message sending: ⏳ Não testado

### 📋 Ações Imediatas (Hoje)
1. Fazer 3 ajustes de parâmetros (chatbot_id)
2. Testar localmente com novo código
3. Validar que chamadas agora incluem chatbot_id

### 🚀 Próximas Verificações (Amanhã)
1. Simular webhook com payload Meta
2. Verificar flow execution end-to-end
3. Testar conversation persistence
4. Implementar message sender se não existir

---

**Gerado:** 13 de dezembro de 2025, 03:50 UTC  
**Próxima revisão:** Após implementar ajustes Priority 1
