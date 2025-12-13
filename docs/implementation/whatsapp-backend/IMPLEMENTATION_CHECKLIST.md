# ✅ CHECKLIST INICIAL: Pronto para Começar

**Autor:** Kayo Carvalho Fernandes  
**Data:** 12 de dezembro de 2025  
**Status:** Ações Imediatas  

---

## 🚀 FASE 0: PRÉ-IMPLEMENTAÇÃO (Antes de Semana 1)

### 0.1 Preparação de Ambiente

- [ ] **Variáveis de Ambiente**
  - [ ] Criar/revisar `.env` com:
    ```
    # WhatsApp/Meta
    WEBHOOK_VERIFY_TOKEN=seu_token_aleatorio_32_chars
    META_GRAPH_API_BASE=https://graph.instagram.com/v18.0
    META_PHONE_NUMBER_ID=seu_phone_id_aqui
    META_ACCESS_TOKEN=seu_bearer_token_longo
    
    # Flow Execution
    FLOW_EXECUTION_TIMEOUT_MS=30000
    MAX_FLOW_ITERATIONS=100
    CONVERSATION_SESSION_TTL_HOURS=24
    
    # Background Jobs (escolher um)
    # Option A: Celery
    CELERY_BROKER_URL=redis://redis:6379/0
    CELERY_RESULT_BACKEND=redis://redis:6379/0
    
    # Option B: APScheduler
    # SCHEDULER_TYPE=apscheduler
    ```
  - [ ] Adicionar secrets ao GitHub:
    ```bash
    gh secret set WEBHOOK_VERIFY_TOKEN -b "seu_token"
    gh secret set META_ACCESS_TOKEN -b "seu_bearer_token"
    gh secret set META_PHONE_NUMBER_ID -b "seu_phone_id"
    ```

- [ ] **Dependências Python**
  - [ ] Verificar `backend/requirements.txt`:
    ```
    fastapi
    sqlalchemy
    alembic
    psycopg2-binary  (PostgreSQL driver)
    python-jose[cryptography]  (JWT)
    pydantic
    
    # Background jobs (escolher um):
    celery[redis]  # or
    apscheduler
    
    # HTTP client
    httpx
    ```
  - [ ] Instalar: `pip install -r backend/requirements.txt`

- [ ] **Containers**
  - [ ] Verificar `docker-compose.yml`:
    - [ ] PostgreSQL rodando (porta 5432)
    - [ ] Redis rodando (porta 6379) - **se usar Celery**
    - [ ] Backend rodando (porta 8000)
  - [ ] Levantar: `podman compose up -d`
  - [ ] Verificar logs: `podman compose logs -f backend`

---

### 0.2 Decisão: Background Job System

**PRECISA ESCOLHER UMA:**

#### ✅ Opção A: Celery + Redis
**Pros:**
- Produção-ready
- Escalável (multi-worker)
- Retry built-in
- Dashboard (Flower) disponível

**Cons:**
- Setup mais complexo
- Precisa Redis

**Use se:** Deploy em prod esperado, múltiplos workers necessários

#### ✅ Opção B: APScheduler + In-Memory
**Pros:**
- Setup simples
- Sem dependências extra (salvo APScheduler)
- Bom para MVP/teste

**Cons:**
- Não escalável (1 worker só)
- Perde jobs se app restart
- Difícil debugar

**Use se:** MVP rápido, prototipagem, teste local

**RECOMENDAÇÃO:** Celery (production-ready desde dia 1)

---

### 0.3 Review da Documentação

- [ ] **Ler na ordem:**
  1. Este arquivo (CHECKLIST)
  2. `IMPLEMENTATION_ROADMAP.md` (5-10 min)
  3. `API_SPECIFICATION.md` (10-15 min)
  4. `ARCHITECTURE_DIAGRAMS.md` (5-10 min)

- [ ] **Time alinhado:**
  - [ ] Backend entendeu o fluxo completo
  - [ ] Frontend sabe que NÃO precisa fazer nada até Semana 5
  - [ ] Tech lead confirmou decisões (Celery vs APScheduler)

---

### 0.4 Setup Git & Branch

- [ ] **Git configurado**
  ```bash
  git fetch origin develop
  git pull origin develop
  git checkout -b feature/PYTK-XXX-whatsapp-integration
  ```

- [ ] **Workflow padrão**
  ```bash
  # Ao começar a trabalhar:
  git fetch origin && git pull origin develop
  git checkout -b feature/PYTK-XXX-description
  
  # Commits frequent (smallquick commits):
  git add backend/app/api/v1/endpoints/whatsapp.py
  git commit -m "feat: implement GET /whatsapp/webhook | Author: Kayo Carvalho Fernandes"
  
  # Push:
  git push origin feature/PYTK-XXX-description
  
  # PR quando pronto (target: develop, NÃO main)
  ```

---

### 0.5 Estrutura de Arquivos

**Criar pastas (se não existir):**

```
backend/app/
├── api/v1/
│   ├── endpoints/
│   │   ├── __init__.py
│   │   ├── users.py       (existing)
│   │   └── whatsapp.py    (NEW - Semana 1)
│   └── router.py          (existing)
│
├── services/
│   ├── __init__.py
│   ├── user_service.py    (existing)
│   ├── whatsapp_router_service.py     (NEW - Semana 2)
│   ├── conversation_state_service.py  (NEW - Semana 2)
│   ├── flow_executor_service.py       (NEW - Semana 3)
│   └── message_sender_service.py      (NEW - Semana 4)
│
├── repositories/
│   ├── __init__.py
│   ├── user_repository.py  (existing)
│   ├── conversation_state_repository.py  (NEW - Semana 1)
│   └── conversation_log_repository.py    (NEW - Semana 1)
│
├── models/
│   ├── __init__.py
│   ├── user.py        (existing)
│   ├── organization.py (existing)
│   ├── flow.py        (existing)
│   ├── chatbot.py     (existing)
│   ├── whatsapp_number.py  (NEW - alterar)
│   ├── conversation_state.py   (NEW - Semana 1)
│   └── conversation_log.py     (NEW - Semana 1)
│
├── tasks/
│   ├── __init__.py
│   ├── celery_app.py  (NEW - Semana 2, se Celery)
│   └── whatsapp_tasks.py  (NEW - Semana 2)
│
├── schemas/
│   ├── __init__.py
│   ├── conversation.py  (NEW - Semana 1)
│   └── whatsapp.py      (NEW - Semana 1)
│
└── tests/
    ├── __init__.py
    ├── test_whatsapp_router.py     (NEW - Semana 2)
    ├── test_conversation_state.py  (NEW - Semana 2)
    ├── test_flow_executor.py       (NEW - Semana 3)
    └── test_message_sender.py      (NEW - Semana 4)
```

---

## 📋 SEMANA 1: FOUNDATION

### 1.1 Migrations Database

- [ ] **Criar migration Alembic**
  ```bash
  cd backend
  alembic revision --autogenerate -m "Add conversation_states and conversation_logs tables"
  ```

- [ ] **Review migration file**
  - [ ] Arquivo em: `backend/alembic/versions/XXX_add_conversation...py`
  - [ ] Verificar:
    - [ ] Tabelas criadas (conversation_states, conversation_logs)
    - [ ] Columns corretos
    - [ ] Indexes criados
    - [ ] Foreign keys com ON DELETE CASCADE
    - [ ] organization_id em TODAS tabelas (multi-tenancy!)

- [ ] **Aplicar migration**
  ```bash
  podman exec pytake-backend alembic upgrade head
  ```

- [ ] **Validar no DB**
  ```bash
  psql -h localhost -U pytake_user -d pytake -c "
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name LIKE 'conversation%';
  "
  ```
  Expected output:
  ```
   conversation_states
   conversation_logs
  ```

---

### 1.2 Webhook Receiver Implementation

- [ ] **Criar arquivo: `backend/app/api/v1/endpoints/whatsapp.py`**

  Incluir:
  - [ ] GET /webhook (verification)
  - [ ] POST /webhook (receive messages)
  - [ ] Validação de token
  - [ ] Validação de assinatura X-Hub-Signature-256
  - [ ] Enfileiramento em background job

- [ ] **Criar modelos: `backend/app/schemas/whatsapp.py`**
  - [ ] WebhookPayload (Pydantic model)
  - [ ] MessageResponse

- [ ] **Registrar rota em `backend/app/api/v1/router.py`**
  ```python
  from app.api.v1.endpoints import whatsapp
  
  router.include_router(whatsapp.router, prefix="/whatsapp", tags=["whatsapp"])
  ```

- [ ] **Teste manual (GET)**
  ```bash
  curl "http://localhost:8000/api/v1/whatsapp/webhook?
    hub.mode=subscribe&
    hub.challenge=123456&
    hub.verify_token=seu_token_aqui"
  ```
  Expected: `123456` (200 OK)

- [ ] **Teste manual (POST com Postman)**
  - [ ] Usar payload de exemplo do `webhook-payload-examples.md`
  - [ ] Esperar: `{"status": "received"}` (200 OK)

---

### 1.3 Database Models & Repositories

- [ ] **Criar modelos SQLAlchemy**
  - [ ] `backend/app/models/conversation_state.py`
  - [ ] `backend/app/models/conversation_log.py`
  - [ ] Alterar: `backend/app/models/whatsapp_number.py` (add columns)
  - [ ] Registrar em `backend/app/models/__init__.py`

- [ ] **Criar repositórios**
  - [ ] `backend/app/repositories/conversation_state_repository.py`
    - [ ] `get_or_create(org_id, phone, flow_id)`
    - [ ] `update(state_id, updates)`
    - [ ] `close(state_id)`
  - [ ] `backend/app/repositories/conversation_log_repository.py`
    - [ ] `create(org_id, phone, flow_id, user_msg, bot_msg, node_id)`
    - [ ] `get_by_phone(org_id, phone, limit)`
  - [ ] Registrar em `backend/app/repositories/__init__.py`

- [ ] **Testes unitários (Semana 1)**
  - [ ] `pytest backend/tests/test_conversation_state_repository.py`
    - [ ] Test create
    - [ ] Test get
    - [ ] Test update
    - [ ] Test multi-tenancy (org_id filtering)

---

### 1.4 CI/CD Check

- [ ] **Build passa**
  ```bash
  podman compose build backend
  ```

- [ ] **Tests passam**
  ```bash
  podman exec pytake-backend pytest backend/tests/ -v
  ```

- [ ] **Linter/type-check (if enabled)**
  ```bash
  podman exec pytake-backend mypy backend/app
  ```

---

## 📋 SEMANA 2: ROUTING & STATE

### 2.1 Background Job Setup

**Se usar Celery:**

- [ ] **Criar: `backend/app/tasks/celery_app.py`**
  ```python
  from celery import Celery
  
  celery_app = Celery(
      'pytake',
      broker=os.getenv('CELERY_BROKER_URL'),
      backend=os.getenv('CELERY_RESULT_BACKEND')
  )
  ```

- [ ] **Verificar docker-compose.yml**
  - [ ] Redis service presente
  - [ ] CELERY_BROKER_URL correto

**Se usar APScheduler:**

- [ ] **Criar: `backend/app/tasks/scheduler_app.py`**
  ```python
  from apscheduler.schedulers.asyncio import AsyncIOScheduler
  
  scheduler = AsyncIOScheduler()
  ```

- [ ] **Registrar em: `backend/app/main.py`**
  ```python
  @app.on_event("startup")
  async def startup():
      scheduler.start()
  
  @app.on_event("shutdown")
  async def shutdown():
      scheduler.shutdown()
  ```

---

### 2.2 Services Implementation

- [ ] **Criar: `backend/app/services/whatsapp_router_service.py`**
  - [ ] `route_message(phone, org_id) → (Chatbot, Flow)`
  - [ ] Lookup WhatsAppNumber
  - [ ] Load Chatbot (default ou fallback)
  - [ ] Load Flow
  - [ ] Error handling (RouterException)

- [ ] **Criar: `backend/app/services/conversation_state_service.py`**
  - [ ] `get_or_create_state(org_id, phone, flow_id)`
  - [ ] `update_state(state_id, node_id, variables, path)`
  - [ ] `close_state(state_id)`
  - [ ] `cleanup_expired()` (job agendado diariamente)

---

### 2.3 Background Task

- [ ] **Criar: `backend/app/tasks/whatsapp_tasks.py`**
  - [ ] `process_message_async(webhook_value, org_id)`
  - [ ] Implementar os 8 steps do fluxo
  - [ ] Error handling + retry logic
  - [ ] Logging detalhado

- [ ] **Registrar em webhook endpoint**
  ```python
  # POST /webhook
  background_tasks.add_task(
      process_message_async,
      webhook_value
  )
  ```

- [ ] **Testes**
  - [ ] Test router (3 cenários)
  - [ ] Test state manager (CRUD)
  - [ ] Test background job (sem Meta, apenas lógica)

---

## 📋 SEMANA 3: FLOW ENGINE

### 3.1 Flow Executor Service

- [ ] **Criar: `backend/app/services/flow_executor_service.py`**
  - [ ] Classe: `FlowExecutorService`
  - [ ] Método: `execute(flow, state, user_message)`
  - [ ] Implementar node handlers:
    - [ ] START: pass-through
    - [ ] MESSAGE: output + substitute {{var}}
    - [ ] QUESTION: capture input
    - [ ] CONDITION: evaluate logic
    - [ ] END: finalize

- [ ] **Helper methods**
  - [ ] `_substitute_variables(text, variables)`
  - [ ] `_evaluate_condition(var, operator, value)`
  - [ ] `_get_next_node(current_node, flow)`

- [ ] **Return type**
  - [ ] ExecutionResult(responses, current_node_id, variables, execution_path, awaiting_input)

- [ ] **Testes**
  - [ ] Test cada node type
  - [ ] Test variable substitution
  - [ ] Test condition evaluation
  - [ ] Test fluxo completo (5+ nodes)

---

### 3.2 Models/Schemas

- [ ] **Validar: `backend/app/models/flow.py`**
  - [ ] FlowNode com types: start, message, question, condition, end
  - [ ] Cada tipo tem seu `data` dict

- [ ] **Validar: `backend/app/schemas/flow.py`**
  - [ ] Pydantic schemas para nodes

---

## 📋 SEMANA 4: MESSAGE SENDER & ANALYTICS

### 4.1 Message Sender

- [ ] **Criar: `backend/app/services/message_sender_service.py`**
  - [ ] `send(phone, message_text, retry_count=0)`
  - [ ] POST para Meta Cloud API
  - [ ] Retry com exponential backoff (60s, 120s, 240s)
  - [ ] Error handling + logging

- [ ] **Integrar em: `whatsapp_tasks.py`**
  - [ ] Chamar message_sender após flow execution
  - [ ] Para cada response: enviar mensagem

- [ ] **Testes**
  - [ ] Test send (mock Meta API)
  - [ ] Test retry logic
  - [ ] Test timeout handling

---

### 4.2 Analytics Endpoints

- [ ] **Criar: `backend/app/api/v1/endpoints/analytics.py`**
  - [ ] GET /conversations (list all)
  - [ ] GET /conversations/{phone} (history)
  - [ ] GET /analytics/conversations (metrics)
  - [ ] GET /analytics/metrics (aggregate stats)

- [ ] **Queries complexas (SQL otimizadas)**
  - [ ] JOIN conversation_states + conversation_logs
  - [ ] Filtrar por organization_id
  - [ ] Aggregate functions (COUNT, AVG, etc)

- [ ] **Paginação**
  - [ ] Skip/limit
  - [ ] Total count
  - [ ] Sorting (by date, messages, etc)

---

## 📋 SEMANA 5: POLISH & INTEGRAÇÃO

### 5.1 Testes Completos

- [ ] **Testes unitários (80%+ coverage)**
  - [ ] Flow executor
  - [ ] Message router
  - [ ] Conversation state
  - [ ] Message sender

- [ ] **Testes e2e**
  - [ ] GET /webhook (verification)
  - [ ] POST /webhook (incoming message)
  - [ ] Verificar: message roteada, estado persistido, resposta enviada

- [ ] **Teste de multi-tenancy**
  - [ ] 2 organizações, mesmo phone number
  - [ ] Verificar isolamento

- [ ] **Teste de carga**
  - [ ] 10 mensagens simultâneas
  - [ ] Verificar timeouts, concorrência

---

### 5.2 Segurança

- [ ] **Rate limiting**
  - [ ] Max 5 msg/min por phone
  - [ ] Implementar com: slowapi ou redis

- [ ] **RBAC em endpoints**
  - [ ] GET /conversations → org_admin, agent
  - [ ] POST /conversations/{phone}/send → org_admin, agent
  - [ ] GET /analytics → org_admin, super_admin

- [ ] **Validação de org_id**
  - [ ] TODAS queries filtram por organization_id
  - [ ] Dependency injection de org_id

---

### 5.3 Documentação

- [ ] **OpenAPI/Swagger**
  - [ ] Todos endpoints documentados
  - [ ] Query params, path params, request bodies descritos
  - [ ] Response examples

- [ ] **README**
  - [ ] Como rodar localmente
  - [ ] Como configurar Meta webhook
  - [ ] Exemplos de curl

---

### 5.4 Frontend Adaptation

- [ ] **Frontend team**
  - [ ] Remove `useFlowSimulator` (não precisa mais)
  - [ ] Implementar GET /conversations
  - [ ] Implementar GET /conversations/{phone}
  - [ ] Implementar POST /conversations/{phone}/send
  - [ ] Atualizar UI com dados do backend

---

## 🔄 VERIFICAÇÃO FINAL

Antes de passar para produção:

```
✅ SEMANA 1:
- [ ] Migrations aplicadas ✓
- [ ] Webhook recebendo ✓
- [ ] Repositórios testados ✓

✅ SEMANA 2:
- [ ] Router funciona ✓
- [ ] State manager persiste ✓
- [ ] Background job enfileira ✓
- [ ] Multi-tenancy validado ✓

✅ SEMANA 3:
- [ ] Flow executor completo ✓
- [ ] 5 node types funcionando ✓
- [ ] Variables substituídas ✓
- [ ] E2E funcionando ✓

✅ SEMANA 4:
- [ ] Message sender envia ✓
- [ ] Analytics endpoints OK ✓
- [ ] Histórico persistido ✓

✅ SEMANA 5:
- [ ] 80%+ test coverage ✓
- [ ] Rate limiting ativo ✓
- [ ] Docs completa ✓
- [ ] Frontend integrado ✓
```

---

## 🚀 PRÓXIMOS PASSOS IMEDIATOS

1. **Hoje (Sexta-feira):**
   - [ ] Review este documento com time
   - [ ] Decidir: Celery vs APScheduler
   - [ ] Setup git branch

2. **Segunda (Semana 1 - Dia 1):**
   - [ ] Criar migration
   - [ ] Implementar webhook receiver
   - [ ] Primeiro commit

3. **Segunda (Semana 1 - Terça):**
   - [ ] Testar webhook com Meta
   - [ ] Implementar repositórios
   - [ ] Testes unitários

---

**Autor:** Kayo Carvalho Fernandes  
**Versão:** 1.0  
**Última Atualização:** 12 de dezembro de 2025
