# 🚀 ROADMAP: Implementação Backend WhatsApp

**Autor:** Kayo Carvalho Fernandes  
**Data:** 12 de dezembro de 2025  
**Status:** Pronto para Iniciar  
**Duração Estimada:** 4-5 semanas  

---

## 📊 VISÃO GERAL

```
┌─────────────────────────────────────────────────────────────────┐
│ SEMANA 1: FOUNDATION (Banco + Webhook básico)                  │
├─────────────────────────────────────────────────────────────────┤
│ ✓ Migrations (conversation_states, conversation_logs)           │
│ ✓ Webhook receiver (GET/POST /whatsapp/webhook)                │
│ ✓ Validação de assinatura Meta                                 │
│ Output: Endpoints operacionais, DB pronto                       │
└─────────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────────┐
│ SEMANA 2: ROUTING & STATE (Router + State Manager)              │
├─────────────────────────────────────────────────────────────────┤
│ ✓ Message router (phone → chatbot lookup)                       │
│ ✓ Conversation state manager (CRUD)                             │
│ ✓ Background job processing                                     │
│ Output: Estado persistido, roteamento funcional                 │
└─────────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────────┐
│ SEMANA 3: FLOW ENGINE (Execução de Fluxos)                     │
├─────────────────────────────────────────────────────────────────┤
│ ✓ Flow execution engine (processo node-by-node)                │
│ ✓ Node type handlers (message, question, condition, etc)        │
│ ✓ Variable substitution {{var}}                                │
│ Output: Fluxos executáveis, respostas geradas                   │
└─────────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────────┐
│ SEMANA 4: MESSAGE SENDER & ANALYTICS (Meta + Logs)              │
├─────────────────────────────────────────────────────────────────┤
│ ✓ Message sender (POST /messages Meta API)                      │
│ ✓ Retry logic + exponential backoff                             │
│ ✓ Conversation history logging                                  │
│ ✓ Analytics endpoints                                           │
│ Output: Mensagens entregues, histórico rastreável               │
└─────────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────────┐
│ SEMANA 5: POLISH & INTEGRAÇÃO (Testes + Frontend)               │
├─────────────────────────────────────────────────────────────────┤
│ ✓ Testes unitários (engine, router, state)                      │
│ ✓ Testes e2e (webhook → resposta)                               │
│ ✓ Rate limiting + segurança                                     │
│ ✓ Documentação API completa                                     │
│ ✓ Adaptação frontend                                            │
│ Output: Sistema pronto para produção                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📋 SEMANA 1: FOUNDATION

### Dependências
- ✅ PostgreSQL rodando (container)
- ✅ Alembic configurado
- ✅ FastAPI application structure
- ✅ Poetry/pip para dependências

### Tarefas

#### 1.1 Migrations Database
**Arquivo:** `backend/alembic/versions/XXX_add_whatsapp_conversation_tables.py`

**O que criar:**
```sql
-- Nova tabela: conversation_states
CREATE TABLE conversation_states (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL (FK → organizations),
  phone_number VARCHAR(20) NOT NULL,
  flow_id UUID NOT NULL (FK → flows),
  current_node_id VARCHAR(255) NULLABLE,
  variables JSONB DEFAULT '{}',
  execution_path JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  last_message_at TIMESTAMP,
  session_expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_flow FOREIGN KEY (flow_id) REFERENCES flows(id) ON DELETE CASCADE,
  UNIQUE (organization_id, phone_number, flow_id)
);

CREATE INDEX idx_conv_org_phone ON conversation_states(organization_id, phone_number);
CREATE INDEX idx_conv_org_flow ON conversation_states(organization_id, flow_id, is_active);
CREATE INDEX idx_conv_expires ON conversation_states(session_expires_at);

-- Nova tabela: conversation_logs
CREATE TABLE conversation_logs (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL (FK → organizations),
  phone_number VARCHAR(20) NOT NULL,
  flow_id UUID NOT NULL (FK → flows),
  user_message TEXT,
  bot_response TEXT,
  node_id VARCHAR(255),
  timestamp TIMESTAMP DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  CONSTRAINT fk_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_flow FOREIGN KEY (flow_id) REFERENCES flows(id) ON DELETE CASCADE
);

CREATE INDEX idx_logs_org_flow ON conversation_logs(organization_id, flow_id, timestamp DESC);
CREATE INDEX idx_logs_org_phone ON conversation_logs(organization_id, phone_number, timestamp DESC);

-- Alterar tabela: whatsapp_numbers
ALTER TABLE whatsapp_numbers 
ADD COLUMN default_chatbot_id UUID NULLABLE (FK → chatbots),
ADD COLUMN is_fallback BOOLEAN DEFAULT false,
ADD CONSTRAINT fk_chatbot FOREIGN KEY (default_chatbot_id) REFERENCES chatbots(id) ON DELETE SET NULL;

-- Adicionar coluna: chatbots (se não existir)
ALTER TABLE chatbots ADD COLUMN is_fallback BOOLEAN DEFAULT false;
```

**Validação (antes de apply):**
- ✅ Rodar migration em dev: `podman exec pytake-backend alembic upgrade head`
- ✅ Verificar tabelas: `psql -c "SELECT * FROM conversation_states LIMIT 0;"`

---

#### 1.2 Webhook Receiver
**Arquivo:** `backend/app/api/v1/endpoints/whatsapp.py`

**O que implementar:**

```python
# GET /api/v1/whatsapp/webhook (Webhook Verification)
@router.get("/webhook")
async def verify_webhook(
    mode: str = Query(...),
    verify_token: str = Query(...),
    challenge: str = Query(...)
):
    """
    Meta webhook verification endpoint.
    Called by Meta once when setting up webhook.
    
    Validações:
    - mode == "subscribe"
    - verify_token == WEBHOOK_VERIFY_TOKEN (env var)
    
    Returns: challenge string (200 OK)
    """
    if mode != "subscribe":
        raise HTTPException(status_code=400, detail="Invalid mode")
    
    if verify_token != os.getenv("WEBHOOK_VERIFY_TOKEN"):
        raise HTTPException(status_code=403, detail="Invalid token")
    
    return challenge

# POST /api/v1/whatsapp/webhook (Incoming Messages)
@router.post("/webhook")
async def receive_webhook(
    request: Request,
    background_tasks: BackgroundTasks
):
    """
    Recebe mensagens incoming do Meta Cloud API.
    
    IMPORTANTE:
    1. Valida assinatura X-Hub-Signature-256
    2. Retorna 200 OK IMEDIATAMENTE (async processing)
    3. Enfileira processamento em background
    
    Payload esperado:
    {
      "object": "whatsapp_business_account",
      "entry": [{
        "id": "...",
        "changes": [{
          "value": {
            "messaging_product": "whatsapp",
            "metadata": { "phone_number_id": "..." },
            "messages": [{
              "from": "5511999999999",
              "timestamp": "123456",
              "text": { "body": "Olá" }
            }]
          }
        }]
      }]
    }
    
    Returns: { "status": "received" } (200 OK sempre)
    """
    # 1. Validar assinatura
    signature = request.headers.get("X-Hub-Signature-256")
    if not validate_signature(signature, body):
        raise HTTPException(status_code=403, detail="Invalid signature")
    
    # 2. Parse payload
    body = await request.json()
    
    # 3. Enfileirar processamento
    for entry in body.get("entry", []):
        for change in entry.get("changes", []):
            background_tasks.add_task(
                process_message_async,
                change["value"]
            )
    
    # 4. Retornar 200 OK IMEDIATAMENTE
    return {"status": "received"}
```

**Validação:**
- ✅ Teste GET com Postman/curl
- ✅ Teste POST com payload Mock
- ✅ Verificar signature validation

---

#### 1.3 Estrutura de Repositórios
**Arquivos:**
- `backend/app/repositories/conversation_state_repository.py`
- `backend/app/repositories/conversation_log_repository.py`

**O que implementar:**

```python
# ConversationStateRepository
class ConversationStateRepository:
    async def get_or_create(
        self,
        org_id: UUID,
        phone: str,
        flow_id: UUID
    ) -> ConversationState:
        """Recupera ou cria estado de conversa"""
        # Query com organization_id + phone + flow_id
        state = await db.query(ConversationState).filter(
            ConversationState.organization_id == org_id,
            ConversationState.phone_number == phone,
            ConversationState.flow_id == flow_id
        ).first()
        
        if not state:
            state = ConversationState(
                organization_id=org_id,
                phone_number=phone,
                flow_id=flow_id,
                current_node_id=None,
                variables={},
                execution_path=[],
                is_active=True,
                session_expires_at=datetime.now() + timedelta(hours=24)
            )
            db.add(state)
            await db.commit()
        
        return state
    
    async def update(self, state_id: UUID, updates: dict) -> None:
        """Atualiza estado"""
        await db.query(ConversationState).filter(
            ConversationState.id == state_id
        ).update({
            **updates,
            ConversationState.updated_at: datetime.now(),
            ConversationState.session_expires_at: datetime.now() + timedelta(hours=24)
        })
        await db.commit()
    
    async def close(self, state_id: UUID) -> None:
        """Encerra conversa"""
        await db.query(ConversationState).filter(
            ConversationState.id == state_id
        ).update({ConversationState.is_active: False})
        await db.commit()

# ConversationLogRepository
class ConversationLogRepository:
    async def create(
        self,
        org_id: UUID,
        phone: str,
        flow_id: UUID,
        user_message: str,
        bot_response: str,
        node_id: str
    ) -> None:
        """Persiste histórico de conversa"""
        log = ConversationLog(
            organization_id=org_id,
            phone_number=phone,
            flow_id=flow_id,
            user_message=user_message,
            bot_response=bot_response,
            node_id=node_id
        )
        db.add(log)
        await db.commit()
```

**Validação:**
- ✅ Testes unitários: create, get, update, close
- ✅ Testar multi-tenancy (org_id filtering)

---

### 🎯 Output Semana 1

**APIs Disponíveis:**
```
✅ GET  /api/v1/whatsapp/webhook (verification)
✅ POST /api/v1/whatsapp/webhook (receive messages)
```

**Database:**
- ✅ 2 tabelas novas (conversation_states, conversation_logs)
- ✅ 2 repositórios funcionais

**Frontend NÃO precisa fazer nada ainda** (apenas webhook está ativo, sem roteamento)

---

## 📋 SEMANA 2: ROUTING & STATE

### Dependências
- ✅ SEMANA 1 completa
- ✅ Repositories funcionando
- ✅ Background job system (Celery ou APScheduler)

### Tarefas

#### 2.1 Message Router Service
**Arquivo:** `backend/app/services/whatsapp_router_service.py`

**O que implementar:**

```python
class WhatsAppRouterService:
    """
    Responsável por encontrar o Chatbot/Flow correto para uma mensagem.
    
    Fluxo de decisão:
    1. Lookup WhatsAppNumber por phone_number (com organization_id)
    2. Se tem default_chatbot_id → usar esse chatbot
    3. Se não → procurar fallback chatbot
    4. Se não → rejeitar mensagem
    """
    
    async def route_message(
        self,
        phone_number: str,
        organization_id: UUID
    ) -> tuple[Chatbot, Flow]:
        """
        Retorna (Chatbot, Flow) para uma mensagem.
        
        Args:
            phone_number: "+55 11 99999-9999"
            organization_id: UUID da organização
        
        Returns:
            (chatbot, flow) tuple
        
        Raises:
            RouterException se não encontrar rota válida
        """
        # 1. Lookup WhatsAppNumber
        whatsapp_number = await whatsapp_repo.get_by_phone_and_org(
            phone=phone_number,
            org_id=organization_id
        )
        
        if not whatsapp_number:
            raise RouterException(f"Phone {phone_number} not configured")
        
        # 2. Lookup Chatbot (default ou fallback)
        chatbot = None
        if whatsapp_number.default_chatbot_id:
            chatbot = await chatbot_repo.get(whatsapp_number.default_chatbot_id)
        
        if not chatbot:
            chatbot = await chatbot_repo.get_fallback(org_id=organization_id)
        
        if not chatbot:
            raise RouterException(f"No chatbot configured for {phone_number}")
        
        # 3. Load Flow
        flow = await flow_repo.get(chatbot.flow_id)
        
        if not flow:
            raise RouterException(f"Flow {chatbot.flow_id} not found")
        
        return chatbot, flow
```

**Validação:**
- ✅ Teste com 3 cenários:
  - Phone com default_chatbot_id
  - Phone sem default, com fallback
  - Phone não registrado (erro)

---

#### 2.2 Background Job Processing
**Arquivo:** `backend/app/tasks/whatsapp_tasks.py`

**O que implementar:**

```python
@celery_app.task(bind=True, max_retries=3)
async def process_message_async(
    self,
    webhook_value: dict,
    organization_id: UUID = None
):
    """
    Processamento assíncrono de mensagem WhatsApp.
    
    Executa:
    1. Parse webhook payload
    2. Router (find chatbot/flow)
    3. State manager (load/create conversation)
    4. Flow executor (execute nodes)
    5. Message sender (send response)
    6. Logging (save history)
    
    Args:
        webhook_value: dict com estrutura:
            {
              "messaging_product": "whatsapp",
              "metadata": { "phone_number_id": "..." },
              "messages": [{
                "from": "5511999999999",
                "timestamp": "123",
                "text": { "body": "Olá" }
              }]
            }
        organization_id: UUID da organização (se não vier, inferir)
    
    Returns:
        {"status": "processed", "response_sent": bool}
    """
    try:
        # 1. Parse payload
        phone = webhook_value["messages"][0]["from"]
        message_text = webhook_value["messages"][0]["text"]["body"]
        
        # 2. Inferir organization_id (se não passou)
        if not organization_id:
            org = await infer_organization(phone)  # Lookup by phone
            organization_id = org.id
        
        # 3. Router
        chatbot, flow = await router_service.route_message(
            phone_number=phone,
            organization_id=organization_id
        )
        
        # 4. State Manager
        state = await state_service.get_or_create_state(
            org_id=organization_id,
            phone=phone,
            flow_id=flow.id
        )
        
        # 5. Flow Executor
        execution_result = await flow_executor.execute(
            flow=flow,
            state=state,
            user_message=message_text
        )
        
        # 6. Message Sender
        for response in execution_result.responses:
            await message_sender.send(
                phone_number=phone,
                message_text=response
            )
        
        # 7. Update State
        await state_service.update_state(
            state_id=state.id,
            current_node_id=execution_result.current_node_id,
            variables=execution_result.variables,
            execution_path=execution_result.execution_path
        )
        
        # 8. Log
        for response in execution_result.responses:
            await conversation_log_repo.create(
                org_id=organization_id,
                phone=phone,
                flow_id=flow.id,
                user_message=message_text,
                bot_response=response,
                node_id=execution_result.current_node_id
            )
        
        return {"status": "processed", "response_sent": True}
        
    except Exception as exc:
        # Retry com backoff exponencial
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))
```

**Validação:**
- ✅ Teste sem conexão Meta (não falha)
- ✅ Teste com retry (simular timeout)

---

#### 2.3 State Manager Service
**Arquivo:** `backend/app/services/conversation_state_service.py`

```python
class ConversationStateService:
    """Gerencia estado de conversa"""
    
    async def get_or_create_state(
        self,
        org_id: UUID,
        phone: str,
        flow_id: UUID
    ) -> ConversationState:
        """Recupera ou cria estado inicial"""
        return await state_repo.get_or_create(org_id, phone, flow_id)
    
    async def update_state(
        self,
        state_id: UUID,
        current_node_id: str = None,
        variables: dict = None,
        execution_path: list = None
    ) -> None:
        """Atualiza estado após execução"""
        updates = {
            ConversationState.updated_at: datetime.now(),
            ConversationState.session_expires_at: datetime.now() + timedelta(hours=24)
        }
        
        if current_node_id:
            updates[ConversationState.current_node_id] = current_node_id
        if variables:
            updates[ConversationState.variables] = variables
        if execution_path:
            updates[ConversationState.execution_path] = execution_path
        
        await state_repo.update(state_id, updates)
    
    async def close_state(self, state_id: UUID) -> None:
        """Encerra conversa"""
        await state_repo.close(state_id)
    
    async def cleanup_expired(self) -> int:
        """Remove conversas expiradas (job agendado)"""
        return await state_repo.cleanup_expired()
```

**Validação:**
- ✅ CRUD completo
- ✅ Session TTL (24 horas)

---

### 🎯 Output Semana 2

**Services Implementados:**
```
✅ WhatsAppRouterService (phone → chatbot/flow)
✅ ConversationStateService (CRUD de estado)
✅ Background task (process_message_async)
```

**O que agora funciona:**
- ✅ Mensagem recebida → Roteada para chatbot correto
- ✅ Estado de conversa persistido
- ✅ Processamento async sem bloquear webhook

**Frontend ainda não precisa fazer nada**

---

## 📋 SEMANA 3: FLOW ENGINE

### Dependências
- ✅ SEMANA 1-2 completa
- ✅ Services de roteamento e estado funcionando

### Tarefas

#### 3.1 Flow Execution Engine
**Arquivo:** `backend/app/services/flow_executor_service.py`

**O que implementar:**

```python
class FlowExecutorService:
    """
    Motor de execução de fluxos.
    
    Responsável por:
    1. Processar entrada do usuário
    2. Executar nodes (start, message, question, condition, etc)
    3. Substituir variáveis {{var}}
    4. Retornar respostas + próximo estado
    
    Referência: frontend/src/hooks/use-flow-simulator.ts
    (mas simplificado para backend)
    """
    
    async def execute(
        self,
        flow: Flow,
        state: ConversationState,
        user_message: str = None
    ) -> ExecutionResult:
        """
        Executa um passo do fluxo.
        
        Args:
            flow: Objeto Flow com nodes e edges
            state: Estado atual da conversa
            user_message: Mensagem do usuário (opcional)
        
        Returns:
            ExecutionResult com:
            - responses: List[str] (respostas para enviar)
            - current_node_id: str (próximo node)
            - variables: dict (variáveis atualizadas)
            - execution_path: list (caminho percorrido)
            - awaiting_input: bool (esperando input?)
        """
        
        # 1. Inicializar (primeira mensagem)
        if state.current_node_id is None:
            current_node = flow.get_node("start")
            state.current_node_id = current_node.id
        
        # 2. Loop de execução
        responses = []
        execution_path = list(state.execution_path) if state.execution_path else []
        variables = dict(state.variables) if state.variables else {}
        
        iterations = 0
        max_iterations = int(os.getenv("MAX_FLOW_ITERATIONS", 100))
        awaiting_input = False
        
        while iterations < max_iterations:
            iterations += 1
            
            # Pegar node atual
            current_node = flow.get_node(state.current_node_id)
            if not current_node:
                break
            
            execution_path.append(current_node.id)
            
            # 3. Executar handler do node
            if current_node.type == "start":
                # START: apenas passa para próximo
                next_node_id = flow.get_next_node(current_node.id)
                state.current_node_id = next_node_id
                
            elif current_node.type == "message":
                # MESSAGE: substitui variáveis + envia
                content = current_node.data.get("content", "")
                content = self._substitute_variables(content, variables)
                responses.append(content)
                next_node_id = flow.get_next_node(current_node.id)
                state.current_node_id = next_node_id
                
            elif current_node.type == "question":
                # QUESTION: espera input do usuário
                if user_message is None:
                    awaiting_input = True
                    break
                
                # Validar input (opcional)
                validation = current_node.data.get("validationType")
                if validation == "number":
                    if not user_message.isdigit():
                        responses.append("Resposta inválida. Digite um número.")
                        awaiting_input = True
                        break
                
                # Armazenar variável
                var_name = current_node.data.get("variableName")
                variables[var_name] = user_message
                
                next_node_id = flow.get_next_node(current_node.id)
                state.current_node_id = next_node_id
                user_message = None  # Consome input
                
            elif current_node.type == "condition":
                # CONDITION: lógica if/else
                condition = current_node.data.get("condition")
                var_name = condition.get("variableName")
                operator = condition.get("operator")  # "==", ">", "<", etc
                value = condition.get("value")
                
                var_value = variables.get(var_name)
                
                if self._evaluate_condition(var_value, operator, value):
                    next_node_id = current_node.data.get("trueNodeId")
                else:
                    next_node_id = current_node.data.get("falseNodeId")
                
                state.current_node_id = next_node_id
                
            elif current_node.type == "end":
                # END: finalizar fluxo
                content = current_node.data.get("content", "")
                content = self._substitute_variables(content, variables)
                responses.append(content)
                state.current_node_id = current_node.id
                break
            
            else:
                # Unknown node type
                break
        
        return ExecutionResult(
            responses=responses,
            current_node_id=state.current_node_id,
            variables=variables,
            execution_path=execution_path,
            awaiting_input=awaiting_input
        )
    
    def _substitute_variables(self, text: str, variables: dict) -> str:
        """Substitui {{var}} por valores"""
        for key, value in variables.items():
            text = text.replace(f"{{{{{key}}}}}", str(value))
        return text
    
    def _evaluate_condition(self, var_value: any, operator: str, condition_value: any) -> bool:
        """Avalia condição"""
        if operator == "==":
            return var_value == condition_value
        elif operator == ">":
            return float(var_value) > float(condition_value)
        elif operator == "<":
            return float(var_value) < float(condition_value)
        elif operator == "contains":
            return condition_value in str(var_value)
        return False
```

**Validação:**
- ✅ Teste cada node type
- ✅ Teste substituição de variáveis
- ✅ Teste condições

---

#### 3.2 Flow Node Types Support
**Arquivo:** `backend/app/models/flow.py`

**O que garantir:**

```python
# Node types suportados (SEMANA 3):
NODE_TYPES = {
    "start": StartNodeHandler,
    "end": EndNodeHandler,
    "message": MessageNodeHandler,
    "question": QuestionNodeHandler,
    "condition": ConditionNodeHandler,
    # Expandir conforme necessário:
    # "set_variable", "api_call", "webhook", etc
}

class FlowNode(BaseModel):
    id: str
    type: str  # "start", "message", "question", "condition", "end", etc
    label: str
    data: dict
    # data varia conforme type:
    # - message: { content: str }
    # - question: { label: str, variableName: str, validationType: str }
    # - condition: { condition: {...}, trueNodeId: str, falseNodeId: str }
```

---

### 🎯 Output Semana 3

**Services Implementados:**
```
✅ FlowExecutorService (executa fluxos passo-a-passo)
✅ Support para 5+ node types
✅ Variable substitution {{var}}
✅ Condition evaluation
```

**Agora funciona:**
- ✅ Fluxo inteiro executável (start → message → question → end)
- ✅ Variáveis persistidas entre turnos
- ✅ Lógica condicional

---

## 📋 SEMANA 4: MESSAGE SENDER & ANALYTICS

### Dependências
- ✅ SEMANA 1-3 completa
- ✅ Fluxo totalmente funcional

### Tarefas

#### 4.1 Message Sender Service
**Arquivo:** `backend/app/services/message_sender_service.py`

```python
class MessageSenderService:
    """
    Envia mensagens para Meta Cloud API.
    
    Responsável por:
    1. Formatar payload para Meta
    2. POST /messages
    3. Retry com exponential backoff
    4. Logging de erros
    """
    
    async def send(
        self,
        phone_number: str,
        message_text: str,
        retry_count: int = 0
    ) -> dict:
        """
        Envia mensagem via Meta.
        
        Args:
            phone_number: "+55 11 99999-9999"
            message_text: Conteúdo da mensagem
            retry_count: Tentativa atual
        
        Returns:
            {
              "message_id": "wamid.XYZ",
              "status": "sent"
            }
        
        Raises:
            MessageSenderException se todas retries falham
        """
        
        url = f"{os.getenv('META_GRAPH_API_BASE')}/{os.getenv('META_PHONE_NUMBER_ID')}/messages"
        
        payload = {
            "messaging_product": "whatsapp",
            "to": phone_number,
            "type": "text",
            "text": {
                "body": message_text
            }
        }
        
        headers = {
            "Authorization": f"Bearer {os.getenv('META_ACCESS_TOKEN')}"
        }
        
        try:
            response = await http_client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            
            result = response.json()
            logger.info(f"Message sent to {phone_number}: {result['messages'][0]['id']}")
            
            return {
                "message_id": result["messages"][0]["id"],
                "status": "sent"
            }
        
        except Exception as exc:
            if retry_count < 3:
                wait_time = 60 * (2 ** retry_count)
                logger.warning(f"Retry {retry_count} in {wait_time}s")
                await asyncio.sleep(wait_time)
                return await self.send(
                    phone_number=phone_number,
                    message_text=message_text,
                    retry_count=retry_count + 1
                )
            else:
                logger.error(f"Failed to send message to {phone_number}: {exc}")
                raise MessageSenderException(str(exc))
```

---

#### 4.2 Analytics Endpoints
**Arquivo:** `backend/app/api/v1/endpoints/analytics.py`

```python
# GET /api/v1/analytics/conversations
@router.get("/conversations")
async def get_conversation_analytics(
    org_id: UUID = Depends(get_current_org),
    skip: int = 0,
    limit: int = 50
):
    """
    Lista conversas com paginação.
    
    Returns:
    {
      "total": 150,
      "conversations": [
        {
          "id": "conv_001",
          "phone_number": "+55 11 99999-9999",
          "flow_id": "flow_001",
          "flow_name": "Atendimento Vendas",
          "is_active": true,
          "messages_count": 5,
          "last_message_at": "2025-12-12T10:30:00Z",
          "created_at": "2025-12-12T09:00:00Z"
        }
      ]
    }
    """

# GET /api/v1/analytics/conversations/:phone
@router.get("/conversations/{phone}")
async def get_conversation_history(
    phone: str,
    org_id: UUID = Depends(get_current_org),
    skip: int = 0,
    limit: int = 100
):
    """
    Histórico completo de uma conversa.
    
    Returns:
    {
      "phone_number": "+55 11 99999-9999",
      "flow_id": "flow_001",
      "flow_name": "Atendimento Vendas",
      "messages": [
        {
          "type": "user",
          "text": "Olá",
          "timestamp": "2025-12-12T09:00:00Z"
        },
        {
          "type": "bot",
          "text": "Qual é seu nome?",
          "timestamp": "2025-12-12T09:00:05Z"
        }
      ]
    }
    """
```

---

### 🎯 Output Semana 4

**Services Implementados:**
```
✅ MessageSenderService (envia via Meta com retry)
✅ Analytics endpoints (conversas + histórico)
```

**Agora funciona end-to-end:**
- ✅ Mensagem recebida → Roteada → Fluxo executado → Resposta enviada

---

## 📋 SEMANA 5: POLISH & INTEGRAÇÃO

### Tarefas

#### 5.1 Testes Unitários
- [ ] FlowExecutorService (todos node types)
- [ ] MessageRouter (3 cenários)
- [ ] ConversationState (CRUD)
- [ ] MessageSender (retry logic)

#### 5.2 Testes E2E
- [ ] Webhook verification (GET)
- [ ] Mensagem completa (GET → routing → execution → send)

#### 5.3 Segurança
- [ ] Rate limiting por phone (5 msgs/min)
- [ ] Validação de JWT/org_id em todos endpoints
- [ ] Signature validation em webhook

#### 5.4 Documentação API
- [ ] OpenAPI/Swagger completo
- [ ] Exemplos de payload
- [ ] Códigos de erro

#### 5.5 Frontend Adaptation
- [ ] Frontend remove dependência de `useFlowSimulator` frontend
- [ ] Frontend chama backend para executar fluxo (se necessário)
- [ ] Frontend exibe histórico de conversas

---

## 🔄 RESUMO: Endpoints Finais

```
┌─────────────────────────────────────────┐
│ WEBHOOK (Meta → Seu Backend)            │
├─────────────────────────────────────────┤
│ GET  /api/v1/whatsapp/webhook           │ (verification)
│ POST /api/v1/whatsapp/webhook           │ (incoming messages)
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ CONVERSAS (Frontend → Backend)           │
├─────────────────────────────────────────┤
│ GET  /api/v1/conversations              │ (list all)
│ GET  /api/v1/conversations/{phone}      │ (history)
│ POST /api/v1/conversations/{phone}/send │ (send manual msg)
│ POST /api/v1/conversations/{phone}/close│ (close conv)
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ ANALYTICS (Dashboard)                   │
├─────────────────────────────────────────┤
│ GET  /api/v1/analytics/conversations    │ (list)
│ GET  /api/v1/analytics/metrics          │ (aggregate stats)
└─────────────────────────────────────────┘
```

---

## ⚠️ RISCOS & MITIGAÇÃO

### Risk #1: Multi-tenancy
**Risco:** Dados vazando entre organizações  
**Mitigação:** TODAS queries filtram por `organization_id`  
**Checkpoint:** Code review semanal

### Risk #2: Message duplication
**Risco:** Mesmo webhook processado 2x  
**Mitigação:** Usar `message_id` como idempotency key  
**Implementar:** Semana 3-4

### Risk #3: Fluxo infinito
**Risco:** MAX_FLOW_ITERATIONS não é suficiente  
**Mitigação:** Env var = 100, testado com ciclos  
**Checkpoint:** Teste com fluxo circular

### Risk #4: Meta API downtime
**Risco:** Mensagens não enviadas  
**Mitigação:** Fila com retry exponencial  
**Checkpoint:** Teste de falha em Semana 5

---

## 📊 CHECKLIST FINAL

```
SEMANA 1:
- [ ] Migrations aplicadas
- [ ] GET /webhook funcionando
- [ ] POST /webhook recebendo
- [ ] Repositórios testados

SEMANA 2:
- [ ] Router roteia corretamente
- [ ] State manager persiste estado
- [ ] Background job processa async
- [ ] Multi-tenancy validado

SEMANA 3:
- [ ] Flow executor funciona
- [ ] Nodes (start, message, question, condition, end) OK
- [ ] Variables substituted
- [ ] Fluxo completo testado

SEMANA 4:
- [ ] Message sender envia via Meta
- [ ] Retry logic funciona
- [ ] Analytics endpoints operacionais
- [ ] E2E testado (webhook → resposta)

SEMANA 5:
- [ ] Testes unitários (80%+ coverage)
- [ ] Testes E2E passando
- [ ] Rate limiting ativo
- [ ] Documentação API completa
- [ ] Frontend adaptado
```

---

## 🚀 PRÓXIMOS PASSOS IMEDIATOS

**Antes de começar:**
1. ✅ Revisar este documento com time
2. ✅ Confirmar ferramenta de background job (Celery vs APScheduler)
3. ✅ Setup env vars em `.env` e GitHub Secrets
4. ✅ Criar branch feature: `feature/PYTK-XXX-whatsapp-integration`

**Semana 1 - Terça-feira:**
1. Criar migration Alembic
2. Implementar GET/POST webhook
3. Fazer primeira integração com Meta (teste manual)

**Pré-requisitos de env:**
```
WEBHOOK_VERIFY_TOKEN=seu_token_32_chars
META_GRAPH_API_BASE=https://graph.instagram.com/v18.0
META_PHONE_NUMBER_ID=seu_number_id
META_ACCESS_TOKEN=seu_long_token
FLOW_EXECUTION_TIMEOUT_MS=30000
MAX_FLOW_ITERATIONS=100
CONVERSATION_SESSION_TTL_HOURS=24
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/0
```

---

**Autor:** Kayo Carvalho Fernandes  
**Versão:** 1.0  
**Última Atualização:** 12 de dezembro de 2025
