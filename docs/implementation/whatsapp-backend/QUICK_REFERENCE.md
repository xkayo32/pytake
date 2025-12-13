# ⚡ QUICK REFERENCE - Backend Implementação

**Autor:** Kayo Carvalho Fernandes  
**Data:** 12 de dezembro de 2025  
**Uso:** Abrir durante desenvolvimento para referência rápida  

---

## 📌 CHECKLIST INÍCIO (Semana 1)

```bash
# Git Setup
git fetch origin develop && git pull origin develop
git checkout -b feature/PYTK-XXX-whatsapp-integration

# Environment
cp .env.example .env
# Adicionar:
# WEBHOOK_VERIFY_TOKEN=seu_token_32_chars
# META_PHONE_NUMBER_ID=seu_phone_id
# META_ACCESS_TOKEN=seu_bearer_token

# Containers
podman compose up -d
podman exec pytake-backend bash

# Python deps
pip install -r requirements.txt

# Alembic migration
alembic revision --autogenerate -m "Add conversation tables"
# REVIEW arquivo gerado em: alembic/versions/

alembic upgrade head

# Test webhook endpoint
curl http://localhost:8000/api/v1/whatsapp/webhook?hub.mode=subscribe&hub.challenge=123&hub.verify_token=seu_token
# Expected: 123
```

---

## 🗺️ FILES MAPPING (Semana 1)

```
backend/app/
├── api/v1/
│   └── endpoints/whatsapp.py          ← CREATE (webhook GET/POST)
│
├── models/
│   ├── conversation_state.py           ← CREATE
│   ├── conversation_log.py             ← CREATE
│   └── whatsapp_number.py              ← MODIFY (add columns)
│
├── repositories/
│   ├── conversation_state_repository.py ← CREATE
│   └── conversation_log_repository.py   ← CREATE
│
├── schemas/
│   ├── whatsapp.py                     ← CREATE
│   └── conversation.py                 ← CREATE
│
├── api/v1/router.py                    ← MODIFY (add whatsapp routes)
│
└── tests/
    └── test_whatsapp_webhook.py        ← CREATE (testes)

alembic/
└── versions/
    └── XXX_add_conversation_tables.py  ← CREATE (migration)
```

---

## 🔄 FLUXO WEBHOOK (Semana 1)

```
USER sends WhatsApp message
    ↓
META Cloud API POST /whatsapp/webhook
    ↓
BACKEND endpoint receives:
    {
      "messages": [{
        "from": "5511999999999",
        "text": { "body": "Hello" }
      }]
    }
    ↓
BACKEND returns 200 OK
    { "status": "received" }
    ↓
BACKEND enqueues: background_tasks.add_task(...)
    (continues in background)
```

---

## 📝 CÓDIGO TEMPLATE (Webhook Endpoint)

```python
# backend/app/api/v1/endpoints/whatsapp.py

from fastapi import APIRouter, Request, BackgroundTasks, HTTPException, Query
from app.services import conversation_state_service
import os
import hashlib
import hmac

router = APIRouter()

@router.get("/webhook")
async def verify_webhook(
    mode: str = Query(...),
    verify_token: str = Query(...),
    challenge: str = Query(...)
):
    """Meta webhook verification"""
    if mode != "subscribe":
        raise HTTPException(status_code=400, detail="Invalid mode")
    
    if verify_token != os.getenv("WEBHOOK_VERIFY_TOKEN"):
        raise HTTPException(status_code=403, detail="Invalid token")
    
    return challenge  # Return as string, not JSON


@router.post("/webhook")
async def receive_webhook(request: Request, background_tasks: BackgroundTasks):
    """Receive incoming messages from Meta"""
    
    # 1. Validate signature
    signature = request.headers.get("X-Hub-Signature-256", "")
    body = await request.json()
    
    # Compute expected signature (simplified - use proper hmac)
    # expected = hmac.new(...)
    # if signature != expected:
    #     raise HTTPException(status_code=403, detail="Invalid signature")
    
    # 2. Parse webhook
    for entry in body.get("entry", []):
        for change in entry.get("changes", []):
            value = change["value"]
            
            # 3. Enqueue background job
            background_tasks.add_task(
                process_message_async,
                value
            )
    
    # 4. Return 200 OK immediately
    return {"status": "received"}


async def process_message_async(webhook_value: dict):
    """Background task: process message"""
    try:
        # Extract phone and message
        phone = webhook_value["messages"][0]["from"]
        text = webhook_value["messages"][0]["text"]["body"]
        
        # TODO: Implement full processing:
        # 1. Router (find chatbot)
        # 2. State Manager (load/create state)
        # 3. Flow Executor (execute flow)
        # 4. Message Sender (send response)
        # 5. Logger (save history)
        
        print(f"Processing message from {phone}: {text}")
    
    except Exception as exc:
        print(f"Error processing message: {exc}")
        # TODO: Implement retry logic
```

---

## 🗄️ MIGRATION TEMPLATE (Semana 1)

```python
# alembic/versions/XXX_add_conversation_tables.py

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

def upgrade():
    op.create_table(
        'conversation_states',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('organization_id', sa.UUID(), nullable=False),
        sa.Column('phone_number', sa.VARCHAR(20), nullable=False),
        sa.Column('flow_id', sa.UUID(), nullable=False),
        sa.Column('current_node_id', sa.VARCHAR(255), nullable=True),
        sa.Column('variables', postgresql.JSONB(), server_default='{}'),
        sa.Column('execution_path', postgresql.JSONB(), server_default='[]'),
        sa.Column('is_active', sa.Boolean(), server_default='true'),
        sa.Column('last_message_at', sa.DateTime(), nullable=True),
        sa.Column('session_expires_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['flow_id'], ['flows.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('organization_id', 'phone_number', 'flow_id', name='uq_conv_org_phone_flow')
    )
    
    op.create_index('idx_conv_org_phone', 'conversation_states', ['organization_id', 'phone_number'])
    op.create_index('idx_conv_expires', 'conversation_states', ['session_expires_at'])
    
    # Similar for conversation_logs table
    # ... (code omitted)

def downgrade():
    op.drop_index('idx_conv_expires', 'conversation_states')
    op.drop_index('idx_conv_org_phone', 'conversation_states')
    op.drop_table('conversation_states')
    # ... rest of downgrade
```

---

## 🏭 SERVICE TEMPLATE (Semana 2)

```python
# backend/app/services/conversation_state_service.py

from uuid import UUID
from datetime import datetime, timedelta
from app.repositories import ConversationStateRepository
from app.models import ConversationState

class ConversationStateService:
    def __init__(self, repo: ConversationStateRepository):
        self.repo = repo
    
    async def get_or_create_state(
        self,
        org_id: UUID,
        phone: str,
        flow_id: UUID
    ) -> ConversationState:
        """Get existing or create new conversation state"""
        state = await self.repo.get_or_create(org_id, phone, flow_id)
        return state
    
    async def update_state(
        self,
        state_id: UUID,
        current_node_id: str = None,
        variables: dict = None,
        execution_path: list = None
    ) -> None:
        """Update conversation state"""
        updates = {
            'updated_at': datetime.now(),
            'session_expires_at': datetime.now() + timedelta(hours=24)
        }
        
        if current_node_id:
            updates['current_node_id'] = current_node_id
        if variables is not None:
            updates['variables'] = variables
        if execution_path is not None:
            updates['execution_path'] = execution_path
        
        await self.repo.update(state_id, updates)
    
    async def close_state(self, state_id: UUID) -> None:
        """Close conversation state"""
        await self.repo.close(state_id)
```

---

## 🚀 FLOW EXECUTOR PSEUDOCODE (Semana 3)

```python
class FlowExecutorService:
    async def execute(self, flow, state, user_message=None):
        responses = []
        current_node_id = state.current_node_id or "start"
        variables = state.variables or {}
        awaiting_input = False
        
        for _ in range(100):  # MAX_FLOW_ITERATIONS
            node = flow.get_node(current_node_id)
            
            if node.type == "start":
                current_node_id = flow.get_next_node(current_node_id)
            
            elif node.type == "message":
                content = node.data.get("content")
                content = self._substitute(content, variables)
                responses.append(content)
                current_node_id = flow.get_next_node(current_node_id)
            
            elif node.type == "question":
                if user_message is None:
                    awaiting_input = True
                    break
                
                var_name = node.data.get("variableName")
                variables[var_name] = user_message
                current_node_id = flow.get_next_node(current_node_id)
                user_message = None
            
            elif node.type == "condition":
                condition = node.data.get("condition")
                if self._evaluate(variables, condition):
                    current_node_id = node.data.get("trueNodeId")
                else:
                    current_node_id = node.data.get("falseNodeId")
            
            elif node.type == "end":
                content = node.data.get("content", "")
                content = self._substitute(content, variables)
                responses.append(content)
                break
        
        return ExecutionResult(
            responses=responses,
            current_node_id=current_node_id,
            variables=variables,
            awaiting_input=awaiting_input
        )
```

---

## 📊 DATABASE QUERY PATTERN (Multi-tenancy)

```python
# ❌ WRONG - Vaza dados entre orgs
conversations = await db.query(ConversationState).all()

# ✅ CORRECT - Filtra por organization_id
conversations = await db.query(ConversationState).filter(
    ConversationState.organization_id == org_id
).all()

# ✅ Pattern: SEMPRE adicionar filtro org_id
query = db.query(ConversationState)
query = query.filter(ConversationState.organization_id == org_id)
query = query.filter(ConversationState.is_active == True)
result = await query.all()
```

---

## 🧪 TEST TEMPLATE

```python
# backend/tests/test_whatsapp.py

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

@pytest.mark.asyncio
async def test_webhook_verification():
    """Test GET /webhook"""
    response = client.get(
        "/api/v1/whatsapp/webhook",
        params={
            "hub.mode": "subscribe",
            "hub.verify_token": "seu_token",
            "hub.challenge": "123456"
        }
    )
    
    assert response.status_code == 200
    assert response.text == "123456"

@pytest.mark.asyncio
async def test_webhook_receive():
    """Test POST /webhook"""
    payload = {
        "entry": [{
            "changes": [{
                "value": {
                    "messages": [{
                        "from": "5511999999999",
                        "text": {"body": "Hello"}
                    }]
                }
            }]
        }]
    }
    
    response = client.post("/api/v1/whatsapp/webhook", json=payload)
    
    assert response.status_code == 200
    assert response.json()["status"] == "received"
```

---

## 🔑 ENVIRONMENT VARIABLES

```bash
# .env

# WhatsApp / Meta
WEBHOOK_VERIFY_TOKEN=seu_token_aleatorio_32_chars_aqui
META_GRAPH_API_BASE=https://graph.instagram.com/v18.0
META_PHONE_NUMBER_ID=seu_phone_id_aqui
META_ACCESS_TOKEN=seu_bearer_token_longo_aqui

# Flow Execution
FLOW_EXECUTION_TIMEOUT_MS=30000
MAX_FLOW_ITERATIONS=100
CONVERSATION_SESSION_TTL_HOURS=24

# Background Jobs (escolher um)
# Celery
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/0

# Database
DATABASE_URL=postgresql://user:pass@postgres:5432/pytake

# JWT
SECRET_KEY=sua_chave_secreta_aqui
```

---

## 📞 DEBUGGING

```bash
# Ver logs da aplicação
podman compose logs -f backend

# Entrar no container
podman exec -it pytake-backend bash

# Conectar ao PostgreSQL
psql -h localhost -U pytake_user -d pytake

# Verificar tabelas criadas
SELECT * FROM information_schema.tables WHERE table_schema='public';

# Ver conversation_states
SELECT * FROM conversation_states LIMIT 5;

# Testar webhook com curl
curl -X POST http://localhost:8000/api/v1/whatsapp/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "entry": [{
      "changes": [{
        "value": {
          "messages": [{
            "from": "5511999999999",
            "text": {"body": "Test"}
          }]
        }
      }]
    }]
  }'
```

---

## 📋 SEMANA-POR-SEMANA

### Semana 1 (Monday-Friday)
```
Monday:   Migration + Webhook GET
Tuesday:  Webhook POST + Signature validation
Wednesday: Repositories
Thursday:  Testes unitários
Friday:    PR review + merge develop
```

### Semana 2 (Monday-Friday)
```
Monday:   Background job setup (Celery/APScheduler)
Tuesday:  WhatsAppRouterService
Wednesday: ConversationStateService
Thursday:  Integração (background task)
Friday:    E2E teste webhook → state saved
```

### Semana 3 (Monday-Friday)
```
Monday:   FlowExecutorService skeleton
Tuesday:  Node handlers (START, MESSAGE, QUESTION)
Wednesday: Node handlers (CONDITION, END)
Thursday:  Variable substitution
Friday:    Testes fluxo completo
```

### Semana 4 (Monday-Friday)
```
Monday:   MessageSenderService
Tuesday:  Meta API integration + Retry logic
Wednesday: Analytics endpoints
Thursday:  E2E completo (webhook → resposta enviada)
Friday:    Integração + PR
```

### Semana 5 (Monday-Friday)
```
Monday:   Testes unitários (80%+ coverage)
Tuesday:  Testes E2E
Wednesday: Rate limiting + RBAC
Thursday:  Documentação API (Swagger)
Friday:    Frontend adaptation + Final PR
```

---

## ✅ DAILY CHECKLIST

```
Toda manhã:
[ ] git pull origin develop
[ ] Abrir: .agent_plans/IMPLEMENTATION_CHECKLIST.md
[ ] Identificar: task do dia
[ ] Começar a codificar

Fim do dia:
[ ] Rodou testes? (pytest)
[ ] Funciona localmente?
[ ] Commit com mensagem descriptiva?
[ ] Push para seu branch?

Antes de PR:
[ ] Todos testes passam?
[ ] No merge conflicts?
[ ] Documentation updated?
[ ] Code review com colega?
```

---

**Autor:** Kayo Carvalho Fernandes  
**Version:** 1.0  
**Last Updated:** 12 de dezembro de 2025  
**Quick Links:**
- START_HERE.md - Início
- IMPLEMENTATION_ROADMAP.md - Timeline
- IMPLEMENTATION_CHECKLIST.md - Tasks
- API_SPECIFICATION.md - APIs exatas
