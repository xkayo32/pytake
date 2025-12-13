## Copilot Instructions — PyTake

**PyTake** = WhatsApp Business Automation Platform com flow builder visual, chatbots inteligentes, gestão de conversas e integração WhatsApp. Backend Python: FastAPI + SQLAlchemy + Alembic. Infra: Postgres, Redis, MongoDB, tudo containerizado (Docker/Podman).

---

## 🚨 REGRA CRÍTICA: NUNCA RESETAR BANCO DE DADOS

❌ **JAMAIS execute `docker compose down -v`**  
❌ **JAMAIS execute `docker compose down` SEM AVISO EXPLÍCITO DO USUÁRIO**  
❌ **NUNCA apague volumes com `-v` sem confirmação**  

**Isso apaga TODOS os dados permanentemente!** Se o usuário não pediu explicitamente para limpar/resetar, NÃO FAÇA.

**O que fazer em vez disso:**
- Se banco está corrompido → avisar usuário e pedir confirmação
- Se precisa de backup → fazer dump SQL antes
- Se migration falhou → revisar e corrigir a migration, não resetar

---

## 🏗️ Arquitetura & Data Flow

### Layering Estrito (NÃO pule camadas)
```
Routes (app/api/v1/endpoints/)
  ↓ validação, auth, serialização
Services (app/services/)
  ↓ lógica de negócio, orquestração
Repositories (app/repositories/)
  ↓ CRUD puro no banco
Models (app/models/)
```
**Regra crítica**: Routes nunca acessam Repositories diretamente. Exemplo: `ConversationRepository.get_by_id()` deve ser chamado via `ConversationService`, não diretamente em endpoints.

### Multi-Tenancy (CRÍTICO)
**TODA query DEVE filtrar por `organization_id`** — sem exceção. Violação = data leak.
```python
# ❌ ERRADO
stmt = select(Conversation)

# ✅ CORRETO
stmt = select(Conversation).where(Conversation.organization_id == org_id)
```
- Modelos multi-tenant: `Organization`, `User`, `Conversation`, `Flow`, `ChatBot`, `Contact`, `Department`, `Queue`, `Campaign`, etc.
- Padrão em repositories: `async def get_by_id(self, id: UUID, organization_id: UUID)`

### Flow Execution Pipeline
1. **FlowExecutor** (`flow_executor.py`): Orquestra execução de nós sequencialmente
2. **NodeExecutor** (`node_executor.py`): Executa um nó individual, retorna resposta + próximo nó
3. **ConversationState**: Mantém estado (variáveis coletadas, nó atual, histórico)
4. **Node Types**: `text`, `question`, `condition`, `api_call`, `assignment`, `end`, `jump_to_flow`

Fluxo típico: mensagem de usuário → FlowExecutor carrega ConversationState → itera nós → atualiza estado → retorna resposta.

---

## 🔐 Auth & RBAC

### JWT + Dependency Injection
- Token format: Bearer token em header `Authorization`
- Verificação: `get_current_user(credentials)` → `AuthService.get_current_user(token)` → retorna `User`
- Dependency: `Depends(get_current_user)` em rotas protegidas

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
docker exec pytake-backend alembic revision --autogenerate -m "descricao"
docker exec pytake-backend alembic upgrade head

# 3. Logs & testes
docker compose logs -f backend
docker exec pytake-backend pytest
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

## ✅ Migrations & Database

### Alembic Rules
```bash
# Gerar migration automática (SQLAlchemy detecta mudanças)
docker exec pytake-backend alembic revision --autogenerate -m "add_field_to_user"

# Aplicar migrations
docker exec pytake-backend alembic upgrade head

# Voltar uma versão (em dev apenas)
docker exec pytake-backend alembic downgrade -1
```
- **NUNCA** editar migrations aplicadas (produção)
- **SEMPRE** revisar `alembic/versions/*.py` antes de aplicar

---

## 🔑 Secrets & Environment

- **NUNCA** commit `.env` ou hardcode secrets
- **SEMPRE** usar GitHub Secrets para CI/CD
- **Em dev**: `.env.example` é template público
- Keys principais: `DATABASE_URL`, `REDIS_URL`, `MONGODB_URL`, `WHATSAPP_ACCESS_TOKEN`, `WEBHOOK_VERIFY_TOKEN`

---

## 📝 GitFlow

**REGRA**: Nunca commit direto em `main` ou `develop`

```bash
# Antes de começar
git fetch origin && git pull origin develop

# Criar branch
git branch feature/TICKET-123-description
git checkout feature/TICKET-123-description

# Commits
git commit -m "feat: description | Author: Kayo Carvalho Fernandes"

# Submeter PR para develop (não main)
```

**Branch pattern**:
- Feature: `feature/TICKET-XXX-description`
- Fix: `fix/TICKET-XXX-description`
- Hotfix: `hotfix/TICKET-XXX-description` (só de main, crítico)

---

## 🧪 Testing

```bash
# Rodar testes
docker exec pytake-backend pytest

# Arquivo específico
docker exec pytake-backend pytest tests/test_conversation.py

# Verbose
docker exec pytake-backend pytest -v --tb=short
```

---

## 📊 APIs

- **REST/OpenAPI**: `/api/v1/docs` (Swagger) | 217+ endpoints
- **GraphQL**: `/graphql` (Strawberry) | 15+ modules
- **WebSocket**: `/socket.io` (Socket.IO) | Real-time

---

## ⚡ Common Gotchas

1. **Missing `organization_id` filter** → Data leak. Sempre filtrar.
2. **Skipping layering** → Services calling Repositories directly without Service layer → difícil de testar
3. **Soft deletes**: Não esquecer `.where(Model.deleted_at.is_(None))`
4. **JWT Expiry**: Access tokens curtos (~15min), refresh tokens longos
5. **Async/await**: Toda operação DB é `async`. Não esquecer `await`
6. **Encryption**: WhatsApp tokens guardados com Fernet encryption

---

**Autor**: Kayo Carvalho Fernandes