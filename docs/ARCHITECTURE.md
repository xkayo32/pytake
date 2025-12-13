# 🏗️ PyTake - Arquitetura do Projeto

**Data:** 13 de dezembro de 2025  
**Versão:** 1.0  
**Autor:** Kayo Carvalho Fernandes

---

## 📌 O que é PyTake?

**PyTake** é uma plataforma de automação WhatsApp Business com:
- 🤖 Chatbots inteligentes com flow builder visual
- 💬 Gestão avançada de conversas
- 📊 Integração nativa com WhatsApp Cloud API
- 🔐 Multi-tenancy robusto com RBAC granular
- ⚡ Arquitetura containerizada (Docker/Podman)

---

## 🏗️ Stack Tecnológico

### Backend
- **Framework:** FastAPI (Python 3.12+)
- **ORM:** SQLAlchemy v2 (async)
- **Migrations:** Alembic
- **Banco de Dados:** PostgreSQL 15+
- **Cache:** Redis
- **NoSQL:** MongoDB
- **Real-time:** Socket.IO
- **API GraphQL:** Strawberry
- **Auth:** JWT + Argon2 (bcrypt)
- **Encryption:** Fernet (secrets)

### Frontend
- **Framework:** Next.js 14+
- **Linguagem:** TypeScript
- **Styling:** Tailwind CSS
- **State Management:** Zustand
- **API Client:** Axios com interceptors
- **Real-time:** Socket.IO client
- **UI Components:** Customizados + Shadcn

### Infraestrutura
- **Containerização:** Docker/Podman
- **Orquestração:** Docker Compose
- **Reverse Proxy:** Nginx
- **SSL:** Let's Encrypt (Certbot)
- **CI/CD:** GitHub Actions
- **Ambientes:** Development, Staging, Production

---

## 📂 Estrutura de Diretórios

```
pytake/
├── backend/
│   ├── app/
│   │   ├── main.py                    # FastAPI app + lifespan
│   │   ├── api/
│   │   │   ├── v1/
│   │   │   │   ├── endpoints/         # REST routes (217+ endpoints)
│   │   │   │   ├── router.py          # API router
│   │   │   ├── deps.py                # Dependency injection
│   │   │   ├── webhooks/
│   │   │       └── meta.py            # Meta Cloud API webhook
│   │   ├── services/                  # Business logic (30+ services)
│   │   ├── repositories/              # Data access layer (CRUD)
│   │   ├── models/                    # SQLAlchemy ORM
│   │   ├── schemas/                   # Pydantic validation
│   │   ├── graphql/                   # Strawberry GraphQL
│   │   ├── core/
│   │   │   ├── database.py            # SQLAlchemy setup
│   │   │   ├── security.py            # JWT, hashing, encryption
│   │   │   └── config.py              # Settings/env vars
│   │   ├── utils/                     # Utilitários
│   │   ├── integrations/              # Integrações externas
│   │   ├── tasks/                     # Background tasks (Celery)
│   │   └── websocket/                 # Socket.IO handlers
│   ├── alembic/
│   │   ├── env.py
│   │   └── versions/                  # Migrations SQL
│   ├── tests/                         # Testes unitários
│   ├── requirements.txt
│   ├── Dockerfile
│   └── alembic.ini
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── (admin)/               # Admin pages
│   │   │   ├── (agent)/               # Agent pages
│   │   │   ├── auth/                  # Auth pages
│   │   │   └── layout.tsx
│   │   ├── components/                # Reusable components
│   │   ├── lib/
│   │   │   ├── api.ts                 # API client
│   │   │   ├── auth/                  # Auth utilities
│   │   │   └── hooks/                 # Custom React hooks
│   │   ├── stores/                    # Zustand stores
│   │   ├── types/                     # TypeScript types
│   │   └── styles/
│   ├── public/                        # Static assets
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
├── nginx/
│   ├── nginx.conf                     # Config reverso proxy
│   └── nginx-subdomains.conf
├── certbot/                           # SSL certificates
├── alembic/                           # Shared migrations
├── scripts/
│   ├── create_admin.py                # Admin setup
│   └── init_rbac_system.py            # RBAC initialization
├── docker-compose.yml                 # Prod
├── docker-compose.dev.yml             # Dev
├── docker-compose.staging.yml         # Staging
└── docs/
    ├── README.md                      # Documentação principal
    └── ARCHITECTURE.md                # Este arquivo
```

---

## 🔐 Arquitetura de Segurança & Multi-Tenancy

### Multi-Tenancy (CRÍTICO)

**Regra de Ouro:** TODA query DEVE filtrar por `organization_id`

```python
# ❌ ERRADO - Data leak!
stmt = select(Conversation)

# ✅ CORRETO
stmt = select(Conversation).where(
    Conversation.organization_id == org_id
)
```

**Modelos Multi-tenant:**
- `Organization` (root)
- `User` (FK → Organization)
- `Conversation` (FK → Organization)
- `Flow` (FK → Organization)
- `ChatBot` (FK → Organization)
- `Contact`, `Department`, `Queue`, `Campaign`, etc.

### RBAC (Role-Based Access Control)

**Roles disponíveis:**
```
- super_admin     # Total access
- org_admin       # Organization management
- agent           # Handle conversations
- viewer          # Read-only access
```

**Verificação em rotas:**
```python
@router.get("/conversations/")
async def list_conversations(
    current_user: User = Depends(get_current_user),
    require_role: bool = Depends(require_role(["org_admin", "agent"]))
):
    # Only org_admin or agent can access
```

### JWT & Autenticação

```
Access Token:  15 minutos (curto)
Refresh Token: 7 dias (longo)
Algorithm:     HS256
Secret:        JWTKEY (GitHub secret)
```

**Flow:**
1. User faz login com email/senha
2. Backend valida com Argon2 (bcrypt)
3. Retorna `{access_token, refresh_token}`
4. Frontend armazena em localStorage
5. Todas requisições enviam `Authorization: Bearer {access_token}`

---

## 🔄 Layering Arquitetural (STRICT)

```
┌─────────────────────────────────────┐
│ Routes (app/api/v1/endpoints/)      │ ← Validação, auth, serialização
├─────────────────────────────────────┤
│ Services (app/services/)            │ ← Lógica de negócio, orquestração
├─────────────────────────────────────┤
│ Repositories (app/repositories/)    │ ← CRUD puro no banco
├─────────────────────────────────────┤
│ Models (app/models/)                │ ← SQLAlchemy ORM
├─────────────────────────────────────┤
│ Database (PostgreSQL + Redis)       │ ← Storage
└─────────────────────────────────────┘
```

**Regra crítica:** Routes NUNCA acessam Repositories diretamente!

```python
# ❌ ERRADO
@router.get("/conversations/{id}")
async def get_conversation(id: UUID):
    return await ConversationRepository.get_by_id(id)

# ✅ CORRETO
@router.get("/conversations/{id}")
async def get_conversation(id: UUID, service: ConversationService = Depends()):
    return await service.get_by_id(id)
```

---

## 📊 Data Flow: Webhook → Chat → Flow Execution

### 1. Webhook (WhatsApp Cloud API)

```
WhatsApp Cloud API
       ↓
POST /webhooks/meta
       ↓
Verify HMAC signature
       ↓
Parse mensagem recebida
       ↓
Save em Message table
       ↓
Broadcast via WebSocket
       ↓
Route para FlowExecutor (se ativo)
```

### 2. Flow Execution Pipeline

```
Entrada: mensagem do usuário
       ↓
FlowExecutor carrega ConversationState
       ↓
NodeExecutor executa nó atual (text, question, condition, api_call, etc)
       ↓
Atualiza ConversationState (variáveis, histórico)
       ↓
Retorna resposta + próximo nó
       ↓
Envia resposta via WhatsApp
```

**Node Types:**
- `text` - Texto simples
- `question` - Captura input
- `condition` - Lógica condicional
- `api_call` - Chamadas externas
- `assignment` - Atribuir a agente
- `jump_to_flow` - Redirecionar flow
- `end` - Finalizar conversa

---

## 🗄️ Padrões de Banco de Dados

### Base Repository Pattern

```python
class BaseRepository(Generic[ModelType]):
    async def get_by_id(self, id: UUID, org_id: UUID) -> Optional[ModelType]
    async def get_multi(self, org_id: UUID, skip: int, limit: int) -> List[ModelType]
    async def create(self, org_id: UUID, obj_in: dict) -> ModelType
    async def update(self, id: UUID, org_id: UUID, obj_in: dict) -> Optional[ModelType]
    async def delete(self, id: UUID, org_id: UUID) -> Optional[ModelType]
```

### Soft Delete Pattern

Modelos com `SoftDeleteMixin` possuem coluna `deleted_at`:

```python
# Queries filtram automaticamente deleted_at
stmt = select(Model).where(Model.deleted_at.is_(None))
```

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

## 🚀 CI/CD & Deployments

### GitHub Actions (DEV ONLY)

**Workflows ativados:**
- ✅ `test.yml` - Testes unitários
- ✅ `build.yml` - Build de imagens Docker

**Workflows DESATIVADOS:**
- ❌ `staging.yml`
- ❌ `production.yml`

### Ambientes

| Ambiente | Docker Compose | Database | Redis | Swagger |
|----------|---|---|---|---|
| **Development** | `docker-compose.dev.yml` | localhost:5432 | localhost:6379 | `localhost:8000/api/v1/docs` |
| **Staging** | `docker-compose.staging.yml` | RDS | ElastiCache | `staging.pytake.net/api/v1/docs` |
| **Production** | `docker-compose.yml` | RDS | ElastiCache | `app.pytake.net/api/v1/docs` |

### Migrations (Alembic)

```bash
# Gerar migration automática
alembic revision --autogenerate -m "add_field_to_user"

# Aplicar migrations
alembic upgrade head

# Voltar uma versão (dev only)
alembic downgrade -1
```

**Regra:** NUNCA editar migrations aplicadas. Criar nova migration em vez disso.

---

## 📡 APIs & Documentação

### REST API (217+ endpoints)
- **Documentação:** `http://localhost:8000/api/v1/docs` (Swagger)
- **Versão:** v1
- **Auth:** Bearer JWT
- **Content-Type:** application/json

### GraphQL (15+ modules)
- **Endpoint:** `http://localhost:8000/graphql`
- **Playground:** `http://localhost:8000/graphql` (GraphQL IDE)
- **Auth:** Bearer JWT em header

### WebSocket (Real-time)
- **Endpoint:** `ws://localhost:8000/socket.io`
- **Protocol:** Socket.IO v4
- **Namespaces:** organization, conversation, user

---

## 🔑 Secrets & Environment

### GitHub Secrets (obrigatório)
```
JWTKEY
DATABASE_URL
REDIS_URL
MONGODB_URL
WHATSAPP_ACCESS_TOKEN
WEBHOOK_VERIFY_TOKEN
ENCRYPTION_KEY
```

### `.env` Local (nunca commit)
```
DATABASE_URL=postgresql://user:pass@localhost:5432/pytake
REDIS_URL=redis://localhost:6379
MONGODB_URL=mongodb://localhost:27017
WHATSAPP_ACCESS_TOKEN=...
WEBHOOK_VERIFY_TOKEN=...
JWTKEY=...
```

**Regra:** NUNCA comitar `.env` ou hardcodear secrets.

---

## ✅ Convenções de Código

### Naming Conventions

| Tipo | Padrão | Exemplo |
|------|--------|---------|
| Classes | PascalCase | `ConversationService` |
| Functions | snake_case | `get_conversations()` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRY_ATTEMPTS` |
| Database | snake_case | `organization_id` |
| API routes | kebab-case | `/api/v1/conversations/` |
| Files | snake_case | `conversation_service.py` |

### Git Workflow

```bash
# Branch naming
feature/TICKET-123-description
fix/TICKET-123-description
refactor/TICKET-123-description

# Commit format
type: description | Author: Kayo Carvalho Fernandes

# Branching
develop (padrão) ← feature branches
main    (produção) ← releases
```

### Code Style

- **Backend:** Black formatter, isort imports, flake8 linting
- **Frontend:** Prettier, ESLint
- **Docstrings:** Google style

---

## 📈 Performance & Scaling

### Database Indexes
```sql
CREATE INDEX idx_conversation_org_id ON conversations(organization_id);
CREATE INDEX idx_conversation_status ON conversations(status);
CREATE INDEX idx_message_conversation_id ON messages(conversation_id);
```

### Caching (Redis)
```python
# Padrão: cache_key = f"{model}:{id}:{org_id}"
cache_key = f"conversation:{conversation_id}:{org_id}"
await redis.setex(cache_key, 3600, json.dumps(data))
```

### Pagination
```python
# Sempre usar skip/limit
skip = (page - 1) * limit
stmt = select(Model).offset(skip).limit(limit)
```

---

## 🧪 Testing

### Backend (pytest)
```bash
# Rodar todos os testes
docker exec pytake-backend pytest

# Arquivo específico
docker exec pytake-backend pytest tests/test_conversation.py

# Verbose
docker exec pytake-backend pytest -v --tb=short

# Coverage
docker exec pytake-backend pytest --cov=app
```

### Frontend (Jest/Vitest)
```bash
npm test
npm test -- --coverage
```

---

## 🐛 Troubleshooting Comum

### Erro: Multi-tenancy data leak
**Causa:** Query sem filtro `organization_id`  
**Solução:** Adicionar `.where(Model.organization_id == org_id)` em todas queries

### Erro: JWT token expirado
**Causa:** Access token com TTL curto  
**Solução:** Usar refresh token para renovar

### Erro: WebSocket não conecta
**Causa:** Socket.IO URL relativa ou sem auth  
**Solução:** Usar `getApiUrl()` + `getAuthHeaders()` no frontend

### Erro: Migration conflict
**Causa:** Múltiplas migrations simultâneas  
**Solução:** Rodar `alembic current` antes de commitar

---

## 📚 Referências Importantes

- **Copilot Instructions:** `.github/copilot-instructions.md`
- **README Principal:** `docs/README.md`
- **API Swagger:** `http://localhost:8000/api/v1/docs`
- **GraphQL IDE:** `http://localhost:8000/graphql`

---

**Versão:** 1.0  
**Data:** 13 de dezembro de 2025  
**Autor:** Kayo Carvalho Fernandes  
**Status:** ✅ Pronto para Produção

