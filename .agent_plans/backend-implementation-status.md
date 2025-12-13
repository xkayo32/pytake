# Status de Implementação Backend - PyTake

**Data:** 13 de dezembro de 2025  
**Status:** Análise de implementação vs requisitos  
**Baseado em:** `backend-frontend-mapping.md`

---

## 📊 RESUMO EXECUTIVO

| Recurso | Status | Detalhes |
|---------|--------|----------|
| **Autenticação JWT** | ✅ OK | Implementado em `auth.py` |
| **GET /whatsapp/** | ✅ OK | Lista números com `default_chatbot_id` |
| **GET /flows/?chatbot_id** | ✅ OK | Implementado em `flows.py` |
| **GET /conversations/** | ⚠️ INCOMPLETO | Falta filtro `chatbot_id` como query param |
| **POST /conversations/{id}/messages** | ✅ OK | Implementado para enviar via WhatsApp |
| **PUT /flows/{id}** | ✅ OK | Implementado em `flows.py` |
| **DELETE /flows/{id}** | ✅ OK | Implementado em `flows.py` |
| **POST /whatsapp/webhook** | ✅ OK | Implementado com validação HMAC |
| **GET /whatsapp/webhook** | ✅ OK | Verificação Meta (challenge) |
| **Flow Execution** | ✅ OK | `flow_executor.py` + `node_executor.py` |

---

## ✅ O QUE JÁ TEMOS IMPLEMENTADO

### 1. **Autenticação & JWT**
- **Arquivo:** `backend/app/api/deps.py` + `backend/app/core/security.py`
- **Status:** ✅ Funcional
- **Detalhes:**
  - JWT Bearer token validation
  - `get_current_user()` dependency
  - RBAC com roles (super_admin, org_admin, agent, viewer)
  - Refresh token support

### 2. **WhatsApp Endpoints**
- **Arquivo:** `backend/app/api/v1/endpoints/whatsapp.py`
- **Status:** ✅ Funcional

#### GET /api/v1/whatsapp/
```python
@router.get("/", response_model=List[WhatsAppNumber])
async def list_whatsapp_numbers(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
)
```
- ✅ Retorna array com `default_chatbot_id`
- ✅ Filtrado por `organization_id` (multi-tenancy OK)
- ✅ Inclui webhook_url e webhook_verify_token

#### POST /api/v1/whatsapp/webhook (Recebimento)
```python
@router.post("/webhook", dependencies=[])
async def receive_webhook(request: Request)
```
- ✅ Validação HMAC signature
- ✅ Processa mensagens, status updates, contatos
- ✅ Documentação completa com exemplo de payload

#### GET /api/v1/whatsapp/webhook (Verificação Meta)
```python
@router.get("/webhook")
async def verify_webhook(
    hub_mode: str = Query(...),
    hub_verify_token: str = Query(...),
    hub_challenge: str = Query(...),
)
```
- ✅ Valida `hub.verify_token`
- ✅ Retorna `hub.challenge` como PlainTextResponse
- ✅ Tratamento de erro com status 403

### 3. **Flow Endpoints**
- **Arquivo:** `backend/app/api/v1/endpoints/flows.py`
- **Status:** ✅ Funcional

#### POST /api/v1/flows/
```python
@router.post("/", response_model=Flow, status_code=status.HTTP_201_CREATED)
async def create_flow(data: FlowCreate, ...)
```
- ✅ Cria novo flow com nodes + edges
- ✅ Suporta `canvas_data` (React Flow format)

#### GET /api/v1/flows/?chatbot_id={uuid}
```python
@router.get("/", response_model=FlowList)
async def list_flows_by_chatbot(
    chatbot_id: UUID = Query(...),
    ...
)
```
- ✅ **CRÍTICO:** Obrigatório `chatbot_id` como query param
- ✅ Filtrado por organization_id
- ✅ Retorna FlowList com total, page, per_page

#### PUT /api/v1/flows/{flow_id}
```python
@router.put("/{flow_id}", response_model=Flow)
async def update_flow(
    flow_id: UUID,
    data: FlowUpdate,
    ...
)
```
- ✅ Atualiza flow (canvas_data, name, etc)
- ✅ Multi-tenancy OK

#### DELETE /api/v1/flows/{flow_id}
```python
@router.delete("/{flow_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_flow(flow_id: UUID, ...)
```
- ✅ Soft delete (deleta logicamente)
- ✅ Retorna 204 No Content

### 4. **Conversation Endpoints**
- **Arquivo:** `backend/app/api/v1/endpoints/conversations.py`
- **Status:** ⚠️ PARCIAL

#### GET /api/v1/conversations/
```python
@router.get("/", response_model=List[Conversation])
async def list_conversations(
    skip: int = Query(0),
    limit: int = Query(100),
    status: Optional[str] = Query(None),
    assigned_to_me: bool = Query(False),
    department_id: Optional[UUID] = Query(None),
    queue_id: Optional[UUID] = Query(None),
    ...
)
```
- ✅ Lista conversas com paginação
- ✅ Filtros: status, assigned_to_me, department_id, queue_id
- ⚠️ **FALTA:** `chatbot_id` como query param obrigatório
- ✅ Filtrado por organization_id
- ✅ Retorna array de Conversations

#### POST /api/v1/conversations/
```python
@router.post("/", response_model=Conversation, status_code=status.HTTP_201_CREATED)
async def create_conversation(data: ConversationCreate, ...)
```
- ✅ Cria nova conversa
- ✅ Multi-tenancy OK

#### POST /api/v1/conversations/{conversation_id}/messages
```python
@router.post("/{conversation_id}/messages", response_model=MessageResponse, ...)
async def send_message(
    conversation_id: UUID,
    data: MessageSendRequest,
    ...
)
```
- ✅ Envia mensagem via WhatsApp
- ✅ Valida janela de 24h
- ✅ Usa WhatsAppService para envio

#### Outros endpoints de conversation
- ✅ GET /{conversation_id}
- ✅ GET /{conversation_id}/messages
- ✅ POST /{conversation_id}/read
- ✅ POST /{conversation_id}/assign
- ✅ POST /{conversation_id}/transfer
- ✅ POST /{conversation_id}/close
- ✅ GET /metrics (métricas agregadas)

### 5. **Flow Execution Pipeline**
- **Arquivos:**
  - `backend/app/services/flow_executor.py`
  - `backend/app/services/node_executor.py`
  - `backend/app/services/flow_engine.py`
- **Status:** ✅ Implementado

#### FlowExecutor
```python
class FlowExecutor:
    async def execute(self, conversation_state: ConversationState) -> FlowExecutionResult
```
- ✅ Carrega flow do banco
- ✅ Itera nós sequencialmente
- ✅ Mantém estado da conversa
- ✅ Retorna resposta + próximo nó

#### NodeExecutor
```python
class NodeExecutor:
    async def execute_node(self, node: dict, state: ConversationState) -> NodeExecutionResult
```
- ✅ Suporta tipos: `text`, `question`, `condition`, `api_call`, `assignment`, `end`, `jump_to_flow`
- ✅ Interpolação de variáveis `{{var}}`
- ✅ Executa ações backend (API calls, database queries)

#### FlowEngine (orquestração)
- ✅ Executa flows completos
- ✅ Integração com webhook handler
- ✅ Salva histórico de execução

### 6. **Message Sender Service**
- **Arquivo:** `backend/app/services/message_sender_service.py`
- **Status:** ✅ Implementado

```python
class MessageSenderService:
    async def send_text_message(self, ...)
    async def send_template_message(self, ...)
    async def send_media_message(self, ...)
```
- ✅ Envia mensagens de texto
- ✅ Suporte a template messages
- ✅ Suporte a mídia (imagem, documento)
- ✅ Integração com Meta Cloud API

### 7. **Webhook Handler**
- **Arquivo:** `backend/app/api/webhooks/meta.py` (ou integrado em whatsapp.py)
- **Status:** ✅ Implementado

```python
async def receive_webhook(request: Request)
```
- ✅ Valida HMAC signature
- ✅ Processa events da Meta
- ✅ Salva mensagens no banco
- ✅ Executa flows automaticamente
- ✅ Envia resposta de volta ao usuário

---

## ⚠️ O QUE PRECISA AJUSTAR

### 1. **GET /conversations/ - Falta `chatbot_id` Query Param** 🔴 CRÍTICO
**Arquivo:** `backend/app/api/v1/endpoints/conversations.py` (linhas 31-73)

**Problema:**
```python
# ATUAL - NÃO TEM chatbot_id
@router.get("/", response_model=List[Conversation])
async def list_conversations(
    skip: int = Query(0),
    limit: int = Query(100),
    status: Optional[str] = Query(None),
    assigned_to_me: bool = Query(False),
    department_id: Optional[UUID] = Query(None),
    queue_id: Optional[UUID] = Query(None),
    ...
)
```

**Solução Necessária:**
```python
# NECESSÁRIO - ADICIONAR chatbot_id
@router.get("/", response_model=List[Conversation])
async def list_conversations(
    chatbot_id: Optional[UUID] = Query(None, description="Filtrar por chatbot_id"),  # ← ADICIONAR
    skip: int = Query(0),
    limit: int = Query(100),
    status: Optional[str] = Query(None),
    assigned_to_me: bool = Query(False),
    department_id: Optional[UUID] = Query(None),
    queue_id: Optional[UUID] = Query(None),
    ...
)
```

**Impacto:** 
- Frontend não consegue filtrar conversas por chatbot
- Frontend precisa de todos os parâmetros para query correcta
- Multi-tenancy pode vazar dados se não filtrar por chatbot

**Prioridade:** 🔴 CRÍTICO

---

### 2. **ConversationService.list_conversations() - Precisa suportar chatbot_id**
**Arquivo:** `backend/app/services/conversation_service.py`

**Problema:**
```python
# ATUAL
async def list_conversations(
    self,
    organization_id: UUID,
    status: Optional[str] = None,
    assigned_agent_id: Optional[UUID] = None,
    assigned_department_id: Optional[UUID] = None,
    queue_id: Optional[UUID] = None,
    skip: int = 0,
    limit: int = 100,
)
```

**Solução Necessária:**
```python
# NECESSÁRIO - ADICIONAR chatbot_id
async def list_conversations(
    self,
    organization_id: UUID,
    chatbot_id: Optional[UUID] = None,  # ← ADICIONAR
    status: Optional[str] = None,
    assigned_agent_id: Optional[UUID] = None,
    assigned_department_id: Optional[UUID] = None,
    queue_id: Optional[UUID] = None,
    skip: int = 0,
    limit: int = 100,
)
```

E adicionar na query:
```python
stmt = select(Conversation).where(Conversation.organization_id == organization_id)

if chatbot_id:  # ← ADICIONAR ESTE FILTRO
    stmt = stmt.where(Conversation.chatbot_id == chatbot_id)

if status:
    stmt = stmt.where(Conversation.status == status)
# ... resto dos filtros
```

**Impacto:** 
- Endpoint acima depende disso
- Frontend consegue filtrar por chatbot

**Prioridade:** 🔴 CRÍTICO

---

## ✅ O QUE NÃO PRECISA AJUSTAR

### 1. **POST /conversations/{id}/messages** ✅
- ✅ Já está implementado
- ✅ Envia via WhatsApp
- ✅ Multi-tenancy OK

### 2. **PUT /flows/{id}** ✅
- ✅ Já está implementado
- ✅ Atualiza canvas_data corretamente

### 3. **DELETE /flows/{id}** ✅
- ✅ Já está implementado
- ✅ Soft delete OK

### 4. **Webhook Handler** ✅
- ✅ POST /whatsapp/webhook - Recebimento OK
- ✅ GET /whatsapp/webhook - Verificação Meta OK
- ✅ Validação HMAC signature OK
- ✅ Integração com flow executor OK

### 5. **Flow Execution** ✅
- ✅ FlowExecutor orquestra nós
- ✅ NodeExecutor executa nó individual
- ✅ Suporte a variáveis {{var}}
- ✅ Salva estado da conversa

---

## 📋 CHECKLIST: AJUSTES NECESSÁRIOS

### Priority 1 - CRÍTICO (Bloqueia funcionalidade)
- [ ] Adicionar `chatbot_id` como Query param em `GET /conversations/`
- [ ] Adicionar filtro `chatbot_id` em `ConversationService.list_conversations()`
- [ ] Testar que query retorna apenas conversas do chatbot específico

### Priority 2 - VALIDAÇÃO (Qualidade)
- [ ] Testar POST /whatsapp/webhook com payload real
- [ ] Testar GET /whatsapp/webhook (Meta verification)
- [ ] Testar flow execution end-to-end
- [ ] Testar conversation state persistence

---

## 🔍 ANÁLISE DETALHADA DE ARQUIVOS

### Backend Endpoints Mapeados

```
/api/v1/
├── /auth/
│   ├── POST /login                          ✅ Implementado
│   ├── POST /refresh                        ✅ Implementado
│   └── POST /logout                         ✅ Implementado
│
├── /whatsapp/
│   ├── GET /                                ✅ Lista números com default_chatbot_id
│   ├── GET /{id}                            ✅ Get número específico
│   ├── POST /                               ✅ Criar número
│   ├── PUT /{id}                            ✅ Atualizar número
│   ├── DELETE /{id}                         ✅ Deletar número
│   ├── GET /webhook                         ✅ Verificação Meta (GET challenge)
│   └── POST /webhook                        ✅ Receber mensagens (POST webhook)
│
├── /flows/
│   ├── GET / ?chatbot_id={uuid}             ✅ Lista flows com filtro
│   ├── POST /                               ✅ Criar flow
│   ├── GET /{flow_id}                       ✅ Get flow específico
│   ├── PUT /{flow_id}                       ✅ Atualizar flow
│   └── DELETE /{flow_id}                    ✅ Deletar flow
│
├── /conversations/
│   ├── GET / [?chatbot_id?status?etc]       ⚠️  Falta chatbot_id param
│   ├── POST /                               ✅ Criar conversa
│   ├── GET /{conversation_id}               ✅ Get conversa
│   ├── GET /{id}/messages                   ✅ Lista mensagens
│   ├── POST /{id}/messages                  ✅ Envia mensagem
│   ├── POST /{id}/read                      ✅ Marca como lida
│   ├── POST /{id}/assign                    ✅ Atribui agente
│   ├── POST /{id}/transfer                  ✅ Transfere conversa
│   ├── POST /{id}/close                     ✅ Fecha conversa
│   └── GET /metrics                         ✅ Métricas agregadas
│
├── /chatbots/
│   ├── GET /                                ✅ Implementado
│   ├── POST /                               ✅ Implementado
│   ├── GET /{id}                            ✅ Implementado
│   └── PUT /{id}                            ✅ Implementado
│
└── /contacts/
    ├── GET /                                ✅ Implementado
    └── POST /                               ✅ Implementado
```

---

## 📊 COMPARAÇÃO: FRONTEND EXPECTATIONS vs BACKEND REALITY

| Feature | Frontend Espera | Backend Tem | Gap |
|---------|-----------------|-------------|-----|
| GET /conversations/?chatbot_id | ✅ Query param obrigatório | ⚠️ Sem o param | ⚠️ Precisa adicionar |
| GET /flows/?chatbot_id | ✅ Query param obrigatório | ✅ Tem o param | ✅ OK |
| POST /conversations/{id}/messages | ✅ Enviar mensagem | ✅ Tem endpoint | ✅ OK |
| PUT /flows/{id} | ✅ Atualizar flow | ✅ Tem endpoint | ✅ OK |
| DELETE /flows/{id} | ✅ Deletar flow | ✅ Tem endpoint | ✅ OK |
| Flow execution | ✅ Backend executa | ✅ FlowExecutor existe | ✅ OK |
| Webhook recebimento | ✅ Receber msg WhatsApp | ✅ Handler existe | ✅ OK |
| Webhook verificação | ✅ Meta verification | ✅ Implementado | ✅ OK |

---

## 📝 PRÓXIMAS AÇÕES

### 1. **Adicionar `chatbot_id` em GET /conversations/**
**Tempo estimado:** 5 minutos

```bash
# Arquivo: backend/app/api/v1/endpoints/conversations.py
# Adicionar linha 37:
chatbot_id: Optional[UUID] = Query(None, description="Filtrar por chatbot_id"),

# Arquivo: backend/app/services/conversation_service.py
# Adicionar parametro à função list_conversations
# Adicionar filtro na query
```

### 2. **Testar ajuste com frontend**
```bash
# Frontend deve conseguir fazer:
GET /api/v1/conversations/?chatbot_id=f9651dd7-87fd-40c0-9c5b-599b0dfe9ea8
# E receber apenas conversas daquele chatbot
```

### 3. **Validar webhook end-to-end**
```bash
# Simular Meta webhook com payload real
# Verificar que:
# 1. Conversation é criada
# 2. Mensagem é salva
# 3. Flow é executado
# 4. Resposta volta ao usuário
```

---

**Próxima revisão:** Após implementar ajustes Priority 1  
**Autor:** Backend Implementation Agent
