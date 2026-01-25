## Copilot Instructions — PyTake

**PyTake** = WhatsApp Business Automation Platform com flow builder visual, chatbots inteligentes, gestão de conversas e integração WhatsApp. Backend Python: FastAPI + SQLAlchemy + Alembic. Infra: PostgreSQL 15, Redis 7, MongoDB 7 (containerizados Docker).

---

## ⚠️ REGRA CRÍTICA: NUNCA RESETAR BANCO DE DADOS

**JAMAIS execute** `docker compose down -v` ou `docker compose down` **sem aviso explícito do usuário**.

Se banco está corrompido/migrations falharam: avisar, pedir confirmação, fazer backup SQL antes (`docker exec pytake-postgres-dev pg_dump -U pytake_user pytake > backup.sql`), depois corrigir migrations.

---

## 🏗️ Arquitetura

### Camadas (Separação Estrita)
```
Routes (app/api/v1/endpoints/) → validação, auth, serialização
Services (app/services/)        → lógica de negócio, orquestração
Repositories (app/repositories/) → CRUD puro no banco
Models (app/models/)           → SQLAlchemy ORM
```
**Regra crítica**: Routes NUNCA acessam Repositories diretamente. Ex: `ConversationRepository.get_by_id()` via `ConversationService`.

### Stack Atual
| Componente | Versão | Container |
|--|--|--|
| PostgreSQL | 15 | `pytake-postgres-dev:5435` |
| Redis | 7 | `pytake-redis-dev:6382` |
| MongoDB | 7 | `pytake-mongodb-dev:27020` |
| FastAPI | Backend | `pytake-backend-dev:8002` |

### Multi-Tenancy (CRÍTICO)
**TODA query DEVE filtrar por `organization_id`** — sem exceção (data leak). 
```python
# ❌ ERRADO
stmt = select(Conversation)

# ✅ CORRETO
stmt = select(Conversation).where(Conversation.organization_id == org_id)
```
Modelos multi-tenant: `Organization`, `User`, `Conversation`, `Flow`, `ChatBot`, `Contact`, `Department`, `Queue`, `Campaign`, etc. Padrão: `async def get_by_id(self, id: UUID, organization_id: UUID)`

### Padrões de Banco
- **Soft Delete**: Models com `SoftDeleteMixin` têm `deleted_at`. Sempre filtrar: `.where(Model.deleted_at.is_(None))`
- **Timestamps**: `TimestampMixin` adiciona `created_at`, `updated_at`
- **Multi-tenant Query**: `select(Model).where(Model.id == id).where(Model.organization_id == org_id).where(Model.deleted_at.is_(None))`

---

## 🔐 Auth & RBAC

### JWT + Dependency Injection
- Token format: Bearer token em header `Authorization`
- Verificação: `get_current_user(credentials)` → `AuthService.get_current_user(token)` → retorna `User`
- Dependency: `Depends(get_current_user)` em rotas protegidas
- Tokens curtos (~15min), refresh tokens longos

### Roles Dinâmicas
- Legacy: `user.role = "super_admin"|"org_admin"|"agent"|"viewer"` (string)
- Novo: `user.role_id = UUID` (FK → `Role` table) com permissões granulares
- Verificação: `require_role(["org_admin", "super_admin"])` dependency

---

## 🚀 Quick Start

```bash
# 1. Setup
cp .env.example .env
docker compose up -d

# 2. Migrations (automático no startup, mas manual se precisar)
docker exec pytake-backend-dev alembic revision --autogenerate -m "descricao"
docker exec pytake-backend-dev alembic upgrade head

# 3. Logs & testes
docker compose logs -f backend
docker exec pytake-backend-dev pytest

# 4. Health Check
curl http://localhost:8002/api/v1/health
```

---

## 📁 Key Files & Patterns

| Path | Propósito |
|------|-----------|
| `backend/app/main.py` | FastAPI app + lifespan (startup/shutdown) |
| `backend/app/api/v1/endpoints/` | REST routes (Swagger) |
| `backend/app/api/deps.py` | Dependency injection (DB, auth, roles) |
| `backend/app/services/` | Business logic (30+ services) |
| `backend/app/repositories/` | Data access (organizados por modelo) |
| `backend/app/models/` | SQLAlchemy ORM models |
| `backend/app/graphql/` | Strawberry GraphQL (tipos, queries, mutations) |
| `backend/app/api/webhooks/meta.py` | Meta Cloud API webhook (WhatsApp messages) |
| `backend/app/core/security.py` | JWT, password hashing (Argon2), encryption (Fernet) |
| `backend/app/core/database.py` | SQLAlchemy async session setup |

---

## 💾 Database Patterns

### Base Repository Pattern
```python
class BaseRepository(Generic[ModelType]):
    async def get_by_id(self, id: UUID) -> Optional[ModelType]
    async def get_multi(self, skip: int, limit: int) -> List[ModelType]
    async def create(self, obj_in: dict) -> ModelType
    async def update(self, id: UUID, obj_in: dict) -> Optional[ModelType]
    async def delete(self, id: UUID) -> Optional[ModelType]
```

### Soft Delete Pattern
- Models com `SoftDeleteMixin` têm coluna `deleted_at`
- Queries sempre filtram: `.where(Model.deleted_at.is_(None))`
- Exemplo: `ConversationRepository.get_by_id()`

### Multi-Tenant Query Pattern
```python
async def get_by_id(self, id: UUID, organization_id: UUID):
    return await self.db.execute(
        select(self.model)
        .where(self.model.id == id)
        .where(self.model.organization_id == organization_id)
        .where(self.model.deleted_at.is_(None))  # Se soft delete
    )
```

---

## 🔄 Webhook & Real-time

### Meta Cloud API Webhook (`webhooks/meta.py`)
1. **Verification**: GET com `hub.mode`, `hub.challenge`, `hub.verify_token`
2. **HMAC Validation**: POST with signature in `X-Hub-Signature-256` header
3. **Event Types**: `messages` (incoming), `message_status` (delivery updates)
4. **Flow**: Verify → Parse → Process → Broadcast (WebSocket)

### WebSocket (Socket.IO)
- Manager: `WebSocketManager` em `core/websocket_manager.py`
- Rooms por organization/conversation
- Real-time: updates de agentes, status de mensagens

---

## 🔄 Padrões Críticos

### Flow Execution Pipeline
1. **FlowExecutor** (`app/services/flow_executor.py`): Orquestra execução de nós sequencialmente
2. **NodeExecutor** (`app/services/node_executor.py`): Executa um nó individual, retorna resposta + próximo nó
3. **ConversationState**: Mantém estado (variáveis coletadas, nó atual, histórico)
4. **Node Types**: `text`, `question`, `condition`, `api_call`, `assignment`, `end`, `jump_to_flow`

Fluxo: mensagem usuário → FlowExecutor carrega ConversationState → itera nós → NodeExecutor processa → atualiza estado → retorna resposta.

### Webhook WhatsApp & Security
- **Verificação**: GET com `hub.mode`, `hub.challenge`, `hub.verify_token`
- **HMAC Validation**: POST com `X-Hub-Signature-256` header (app_secret por WhatsAppNumber na DB)
- **Event Types**: `messages` (entrada), `message_status` (delivery)
- **Real-time**: WebSocket broadcast via Socket.IO por organization/conversation

### Variables em Templates WhatsApp
- **Positional**: `{{1}}`, `{{2}}` (tradicional)
- **Named**: `{{nome}}`, `{{codigo}}` (recomendado, mais legível)
- `TemplateService._detect_variable_format()` detecta automaticamente
- `parameter_format` armazena "POSITIONAL" ou "NAMED"
- `named_variables` é array com nomes das variáveis

### Department vs Queue
- **Department**: Unidades organizacionais (Vendas, Suporte, Financeiro)
- **Queue**: Múltiplas filas dentro de um department (VIP, Normal, Técnico)
- Hierarquia: `Organization → Department → Queue(s)`
- Conversas pertencem a `queue_id`, **não** diretamente a department

## 🔑 Secrets & Environment

- **NUNCA** commit `.env` ou hardcode secrets
- **SEMPRE** usar GitHub Secrets para CI/CD
- **Em dev**: `.env.example` é template público
- Keys principais: `DATABASE_URL`, `REDIS_URL`, `MONGODB_URL`, `WHATSAPP_ACCESS_TOKEN`, `WEBHOOK_VERIFY_TOKEN`

---

## � Environment & Secrets

- **NUNCA** commit `.env` ou hardcode secrets
- **SEMPRE** usar GitHub Secrets para CI/CD
- **Em dev**: `.env.example` é template público
- Keys principais: `DATABASE_URL`, `REDIS_URL`, `MONGODB_URL`, `WHATSAPP_ACCESS_TOKEN`, `WEBHOOK_VERIFY_TOKEN`

---

## 📝 GitFlow

**REGRA**: Nunca commit direto em `main` ou `develop`

```bash
# Setup
git fetch origin && git pull origin develop
git checkout -b feature/TICKET-123-description

# Commits  
git commit -m "feat: description | Author: Kayo Carvalho Fernandes"

# Push & PR para develop (nunca main)
git push origin feature/TICKET-123-description
```

**Branch pattern**:
- Feature: `feature/TICKET-XXX-description`
- Fix: `fix/TICKET-XXX-description`
- Hotfix: `hotfix/TICKET-XXX-description` (só de main, crítico)

---

## 🧪 Testing

```bash
# Rodar testes
docker exec pytake-backend-dev pytest

# Arquivo específico
docker exec pytake-backend-dev pytest tests/test_conversation.py

# Verbose
docker exec pytake-backend-dev pytest -v --tb=short
```

---

## 📊 APIs

- **REST/OpenAPI**: `/api/v1/docs` (Swagger)
- **GraphQL**: `/graphql` (Strawberry)
- **WebSocket**: `/socket.io` (Socket.IO) | Real-time

---

## ⚡ Gotchas Comuns

1. **Missing `organization_id`** → Data leak. Filtrar sempre.
2. **Skip layering** → Routes diretos em Repositories são anti-padrão.
3. **Soft deletes** → `.where(Model.deleted_at.is_(None))`
4. **Async/await** → DB é async, não esquecer `await`
5. **Tokens** → Access curtos (~15min), refresh longos
6. **Webhook WhatsApp** → Validar HMAC em `X-Hub-Signature-256` antes de processar

---

## 🔧 Troubleshooting

### Erro: "column does not exist"
**Causa**: Model tem coluna não ainda no banco (migration não criada/aplicada)

```bash
docker exec pytake-backend-dev alembic revision --autogenerate -m "add_missing_columns"
docker exec pytake-backend-dev alembic upgrade head
docker restart pytake-backend-dev
```

### Backend não inicia / Migrations travadas
```bash
docker logs pytake-backend-dev --tail 50
docker exec pytake-backend-dev alembic current
docker exec pytake-backend-dev alembic upgrade head
docker compose down && docker compose up --build -d
```

### Erro 502 do Nginx após restart
**Causa**: IP do backend mudou, Nginx em cache antigo  
**Solução**: `docker restart pytake-nginx-dev`

### Erro ao criar templates WhatsApp
- Nomes de variáveis devem ser exatos entre criação e envio
- Padrão named variables: `[a-zA-Z_][a-zA-Z0-9_]*`
- Nome template: apenas minúsculas e underscore
- Verificar logs: `docker logs pytake-backend-dev 2>&1 | grep "Meta API"`

---

**Autor**: Kayo Carvalho Fernandes. NUNCA mencionar IA, Copilot ou assistente.

**Autor**: Kayo Carvalho Fernandes. NUNCA mencionar IA, Copilot ou assistente.