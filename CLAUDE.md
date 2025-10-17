# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start

**⚠️ IMPORTANT: This project ALWAYS runs in Docker. Do not attempt local development outside of containers.**

```bash
# 1. Start all services with Docker Compose (REQUIRED)
docker-compose up -d

# 2. Verify all services are running
docker ps

# 3. View logs if needed
docker-compose logs -f backend
docker-compose logs -f frontend

# 4. Access the application
# - Frontend: http://localhost:3001
# - Backend API Docs: http://localhost:8000/docs
# - Nginx Proxy: http://localhost:8080
# - Default login: admin@pytake.com / Admin123

# 5. Stop all services
docker-compose down

# 6. Restart a specific service after code changes
docker-compose restart backend
docker-compose restart frontend
```

## Project Overview

**PyTake** is a WhatsApp Business automation platform (SaaS) built with Python/FastAPI backend and Next.js frontend. It provides chatbot builder, live chat, CRM, campaigns, and analytics for WhatsApp automation - similar to Blip and Fortics.

### Tech Stack

**Backend:**
- Python 3.12+, FastAPI, SQLAlchemy 2.0 (async with asyncpg), Pydantic v2
- PostgreSQL 15+ (primary data), Redis 7+ (cache/queues), MongoDB 7+ (logs/analytics)
- Celery (background tasks), Socket.io (WebSocket)
- Alembic (migrations with async support)

**Frontend:**
- Next.js 15 (App Router with Turbopack), React 19, TypeScript 5
- Tailwind CSS 4, Radix UI (select components)
- Zustand (state management), React Hook Form + Zod (forms)
- Axios (HTTP client with interceptors)
- Framer Motion (animations)

## Development Commands

**All commands must be executed inside Docker containers using `docker exec`.**

### Docker Management

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# Rebuild containers after dependency changes
docker-compose up -d --build

# View logs
docker-compose logs -f                    # All services
docker-compose logs -f backend            # Backend only
docker-compose logs -f frontend           # Frontend only

# Restart a service
docker-compose restart backend
docker-compose restart frontend

# Access container shell
docker exec -it pytake-backend bash       # Backend container
docker exec -it pytake-frontend sh        # Frontend container

# Check container status
docker ps                                 # Running containers
docker-compose ps                         # All project containers
```

### Backend Commands (Inside Container)

```bash
# Execute commands in backend container
docker exec -it pytake-backend bash

# Database migrations (inside container)
alembic upgrade head                           # Apply migrations
alembic revision --autogenerate -m "description"  # Auto-generate migration
alembic revision -m "description"              # Create empty migration
alembic downgrade -1                           # Rollback one migration
alembic current                                # Show current revision
alembic history                                # Show migration history

# Or run directly from host
docker exec pytake-backend alembic upgrade head
docker exec pytake-backend alembic revision --autogenerate -m "add_new_field"

# Testing (inside container)
docker exec pytake-backend pytest                            # All tests
docker exec pytake-backend pytest tests/unit                 # Unit tests
docker exec pytake-backend pytest tests/integration          # Integration tests
docker exec pytake-backend pytest -v --cov=app              # With coverage

# Code quality (inside container)
docker exec pytake-backend black app/                        # Format code
docker exec pytake-backend isort app/                        # Sort imports
docker exec pytake-backend flake8 app/                       # Lint
docker exec pytake-backend mypy app/                         # Type checking
```

### Frontend Commands (Inside Container)

```bash
# Execute commands in frontend container
docker exec -it pytake-frontend sh

# Inside container
npm install                      # Install new dependencies (after package.json changes)
npm run build                    # Build for production
npm run lint                     # ESLint check

# Or run directly from host
docker exec pytake-frontend npm install
docker exec pytake-frontend npm run build
docker exec pytake-frontend npm run lint
```

### Database Access

```bash
# PostgreSQL
docker exec -it pytake-postgres psql -U pytake -d pytake

# Redis
docker exec -it pytake-redis redis-cli

# MongoDB
docker exec -it pytake-mongodb mongosh pytake_logs
```

**Important Notes:**
- Frontend runs on port **3001** in Docker
- MongoDB is mapped to port **27018** (not default 27017) to avoid conflicts with other local MongoDB instances
- Backend uses `backend/.env.docker` for configuration (not `.env`)
- Root `.env` file controls Docker Compose port mappings
- All file changes on host are synced to containers via volume mounts (hot reload enabled)
- **API Access**: Two options available:
  - Direct frontend access (port 3001): Uses `NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1`
  - Via Nginx proxy (port 8080): Uses `NEXT_PUBLIC_API_URL=/api/v1` (relative URL)

## Architecture

### Backend Structure (Clean Architecture/DDD)

```
backend/
├── app/
│   ├── api/
│   │   ├── deps.py          # Shared dependencies (auth, db session)
│   │   └── v1/
│   │       ├── endpoints/   # FastAPI routers
│   │       │   ├── auth.py
│   │       │   ├── organizations.py
│   │       │   ├── users.py
│   │       │   ├── contacts.py
│   │       │   ├── conversations.py
│   │       │   ├── chatbots.py
│   │       │   ├── campaigns.py
│   │       │   ├── analytics.py
│   │       │   └── whatsapp.py
│   │       └── router.py    # Main API router
│   ├── core/                # Core functionality
│   │   ├── config.py        # Pydantic settings
│   │   ├── database.py      # SQLAlchemy async engine
│   │   ├── security.py      # JWT, password hashing
│   │   ├── redis.py         # Redis client
│   │   └── mongodb.py       # MongoDB client
│   ├── models/              # SQLAlchemy ORM models
│   ├── schemas/             # Pydantic request/response schemas
│   ├── services/            # Business logic layer
│   ├── repositories/        # Data access layer (Repository pattern)
│   ├── tasks/               # Celery background tasks
│   ├── integrations/        # External APIs (WhatsApp, etc.)
│   ├── utils/               # Utilities
│   └── main.py              # FastAPI app entry point
├── alembic/                 # Database migrations
│   ├── versions/            # Migration files
│   └── env.py               # Alembic config (async-enabled)
├── tests/
│   ├── unit/                # Unit tests
│   └── integration/         # Integration tests
├── requirements.txt         # Production dependencies
├── requirements-dev.txt     # Development dependencies
└── .env                     # Environment variables (gitignored)
```

### Multi-tenancy

All data is scoped by `organization_id`. Every model (except `organizations` and `users`) has an `organization_id` foreign key. Always filter queries by organization context.

### Role-Based Access Control (RBAC)

The system implements role-based routing and access control:

**User Roles:**
- `super_admin`: Platform-wide administration (future use)
- `org_admin`: Organization administrator - full access to admin panel
- `agent`: Customer service agent - access to agent panel
- `viewer`: Read-only access (uses agent panel)

**Frontend Route Structure:**
```
/admin/*        → Admin dashboard (org_admin, super_admin only)
  ├── /admin              - Admin dashboard with org metrics
  ├── /admin/conversations - All conversations
  ├── /admin/contacts     - Contact management
  ├── /admin/chatbots     - Chatbot builder
  ├── /admin/campaigns    - Campaign management
  ├── /admin/users        - User/agent management
  ├── /admin/queues       - Queue configuration
  ├── /admin/analytics    - Analytics & reports
  ├── /admin/whatsapp     - WhatsApp config
  └── /admin/settings     - Organization settings

/agent/*        → Agent dashboard (agent, viewer only)
  ├── /agent              - Agent dashboard with personal metrics
  ├── /agent/queue        - Queue (pick conversations)
  ├── /agent/conversations - Active conversations
  ├── /agent/history      - Conversation history
  ├── /agent/completed    - Completed conversations
  └── /agent/profile      - Agent profile

/dashboard      → Smart redirect based on user role
```

**Role Guard Component:**
Use `RoleGuard` to protect specific routes:
```tsx
import { RoleGuard } from '@/lib/auth/roleGuard';

<RoleGuard allowedRoles={['org_admin', 'super_admin']} fallbackPath="/agent">
  <AdminContent />
</RoleGuard>
```

**Role Hooks:**
```tsx
import { useHasRole, useIsAdmin, useIsAgent } from '@/lib/auth/roleGuard';

const isAdmin = useIsAdmin(); // true for org_admin or super_admin
const isAgent = useIsAgent(); // true for agent role
const canManage = useHasRole(['org_admin', 'super_admin']);
```

**Login Flow:**
1. User enters credentials
2. Backend validates and returns user with role
3. Frontend redirects based on role:
   - `org_admin`/`super_admin` → `/admin`
   - `agent`/`viewer` → `/agent`

### Key Design Patterns

1. **Repository Pattern**: Data access abstracted via repositories
2. **Service Layer**: Business logic separated from API endpoints
3. **Dependency Injection**: Use FastAPI's `Depends()` for services/repos
4. **Async/Await**: All database operations and external calls are async

### Current API Endpoints

The backend implements these modules:
- **Authentication** (`/api/v1/auth`) - Login, register, token refresh
- **Organizations** (`/api/v1/organizations`) - Multi-tenant organization management
- **Users** (`/api/v1/users`) - User management with RBAC
- **Contacts** (`/api/v1/contacts`) - Contact management with tags
- **Conversations** (`/api/v1/conversations`) - Conversation and message handling
- **Chatbots** (`/api/v1/chatbots`) - Flow-based chatbot management
- **Campaigns** (`/api/v1/campaigns`) - Bulk messaging campaigns
- **WhatsApp** (`/api/v1/whatsapp`) - WhatsApp number configuration
- **Analytics** (`/api/v1/analytics`) - Metrics and reporting

See [backend/API.md](backend/API.md) for complete endpoint documentation.

### Database Strategy (Polyglot Persistence)

- **PostgreSQL**: Transactional data (users, chatbots, contacts, conversations)
- **MongoDB**: Logs (API requests, errors), message history, analytics aggregations
- **Redis**: Session cache, rate limiting, Celery broker/backend

## Important Conventions

### Backend Code Style

- **Line length**: 100 characters max
- **Type hints**: Required for all function signatures
- **Docstrings**: Use for public functions/classes
- **Imports**: Sorted with `isort`
- **Format**: Use `black` for formatting

### Database Models

- All models inherit from `Base` and `TimestampMixin`
- Primary keys: `UUID` with `server_default=text("gen_random_uuid()")`
- Timestamps: `created_at`, `updated_at` (auto-managed)
- Soft deletes: Use `deleted_at` field (nullable)
- JSONB fields: For flexible attributes (`settings`, `metadata`, `attributes`)

Example model structure:
```python
from sqlalchemy import Column, String, UUID, ForeignKey, JSONB, Boolean
from app.models.base import Base, TimestampMixin

class Contact(Base, TimestampMixin):
    __tablename__ = "contacts"

    id = Column(UUID, primary_key=True, server_default=text("gen_random_uuid()"))
    organization_id = Column(UUID, ForeignKey("organizations.id"), nullable=False)
    whatsapp_id = Column(String(20), nullable=False, index=True)
    name = Column(String(255))
    # ... other fields
```

### API Endpoints Pattern

1. Define Pydantic schemas in `app/schemas/` (request/response models)
2. Create repository in `app/repositories/` (data access layer)
3. Create service in `app/services/` (business logic, uses repositories)
4. Create endpoint in `app/api/v1/endpoints/` (FastAPI router)
5. Register router in `app/api/v1/router.py`
6. Use dependency injection from `app/api/deps.py` for auth and DB session

Example endpoint structure:
```python
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.contact import Contact, ContactCreate
from app.services.contact_service import ContactService

router = APIRouter()

@router.get("/", response_model=List[Contact])
async def list_contacts(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    query: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List contacts with optional filters"""
    service = ContactService(db)
    return await service.list_contacts(
        organization_id=current_user.organization_id,
        query=query,
        skip=skip,
        limit=limit,
    )
```

### Alembic Migrations

- **Never** edit applied migrations
- **Always** review generated migrations before applying
- Use descriptive names: `alembic revision -m "add_contact_tags_column"`
- Include indexes in migrations for foreign keys and frequently queried fields

### WhatsApp Integration

PyTake supports **two types** of WhatsApp connections:

#### 1. Official API (Meta Cloud API) 🔵
Integration via Meta Cloud API (graph.facebook.com). Key concepts:
- **Webhook validation**: HMAC SHA256 signature verification required
- **Message types**: Text, image, video, document, audio, interactive (buttons/lists), templates
- **24-hour window**: Can only send template messages outside of 24h window
- **Best for**: Large enterprises, verified businesses
- **Cost**: Free tier, then paid based on conversations

#### 2. QR Code (Evolution API) 🟢
Integration via [Evolution API](https://github.com/EvolutionAPI/evolution-api) (Baileys/WhatsApp Web). Key concepts:
- **Connection**: QR Code scan (like WhatsApp Web)
- **No approval needed**: Instant setup
- **Free**: 100% free, no usage limits
- **Best for**: SMBs, startups, testing
- **Implementation**: See `app/integrations/evolution_api.py`

**Architecture:**
- Both types share same `whatsapp_numbers` table
- `connection_type` enum: `'official'` or `'qrcode'`
- Official uses: `phone_number_id`, `access_token`, `webhook_verify_token`
- QR Code uses: `evolution_instance_name`, `evolution_api_url`, `evolution_api_key`
- Multiple numbers: Organizations can have unlimited WhatsApp numbers (mixed types)

**Documentation:**
- Official setup: See `WHATSAPP_SETUP_COMPLETE.md`
- Evolution setup: See `EVOLUTION_API_INTEGRATION.md`

## Key Features Architecture

### Chatbot Builder (React Flow)

Visual drag-and-drop editor with comprehensive node types for building sophisticated WhatsApp automation flows.

#### Node Types

**Core Nodes:**
- **Start** - Entry point of the flow
- **Message** - Send text messages to users
- **Question** - Ask for user input and store response in variable
- **Condition** - Branch flow based on variable values
- **End** - Terminate conversation flow

**Advanced Nodes:**
- **Action** - Execute actions (save contact, send email, webhook, update CRM)
- **API Call** - Make HTTP requests to external APIs
- **AI Prompt** - Interact with AI models (GPT, Claude, etc.)
- **Script** - Execute JavaScript or Python code for data processing
- **Database Query** - Query databases (PostgreSQL, MySQL, MongoDB, SQLite)
- **Jump** - Navigate to another node or flow
- **Handoff** - Transfer conversation to human agent
- **Delay** - Add timed delays in flow execution

**WhatsApp-Specific Nodes:**
- **WhatsApp Template** - Send official WhatsApp message templates
- **Interactive Buttons** - Send messages with action buttons
- **Interactive List** - Send selection lists to users

#### Script Node (JavaScript & Python)

The Script node allows executing custom code for data transformation and processing.

**Supported Languages:**
- **JavaScript** - Native browser execution (fast, ~0ms load time)
- **Python** - Via Pyodide/WebAssembly (~10MB initial download)

**Python Libraries Available:**
```python
import pandas as pd      # Data analysis (~15MB)
import numpy as np       # Numerical computing (~8MB)
import scipy            # Scientific computing (~30MB)
from sklearn import *   # Machine Learning (~35MB)
import matplotlib       # Visualization (~20MB)
import regex            # Regular expressions (~1MB)
import pytz             # Timezone handling (~500KB)
```

**Example Use Cases:**

1. **Process Database Results:**
```python
import pandas as pd
df = pd.DataFrame(database_result)
df['preco'].sum()  # Calculate total price
```

2. **Statistical Analysis:**
```python
import numpy as np
precos = [item['preco'] for item in database_result]
np.mean(precos), np.std(precos)  # Mean and standard deviation
```

3. **Transform API Response:**
```javascript
// Extract nested data from API
return api_response.data.user.name.toUpperCase();
```

4. **Format Data for WhatsApp:**
```javascript
// Create formatted list
return database_result.map(item =>
  `${item.name}: R$ ${item.preco}`
).join('\n');
```

**Script Node Features:**
- ✅ Fullscreen editor mode (95vw x 95vh modal)
- ✅ Syntax highlighting and code formatting
- ✅ Test execution with sample data
- ✅ Variable substitution support
- ✅ Output variable configuration
- ✅ Timeout protection (configurable, default 5s)
- ✅ Error handling (continues flow on error)
- ✅ Python package selection UI

#### PropertyModal Component

Generic fullscreen modal for all property editors (reusable pattern).

**Usage Pattern:**
```tsx
import PropertyModal, { PropertyModalTrigger } from './PropertyModal';

// 1. Add state
const [isModalOpen, setIsModalOpen] = useState(false);

// 2. Create reusable editor
const YourEditor = ({ isFullscreen = false }) => (
  <textarea rows={isFullscreen ? 25 : 12} />
);

// 3. Add trigger button
<PropertyModalTrigger onClick={() => setIsModalOpen(true)} />

// 4. Render modal
<PropertyModal
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  title="Your Editor"
>
  <YourEditor isFullscreen />
</PropertyModal>
```

**Components Using PropertyModal:**
- ✅ ScriptProperties (implemented)
- 🔄 APICallProperties (recommended for JSON editing)
- 🔄 DatabaseQueryProperties (recommended for SQL queries)
- 🔄 WhatsAppTemplateProperties (recommended for long messages)
- 🔄 AIPromptProperties (recommended for complex prompts)

See [PROPERTY_MODAL_USAGE_EXAMPLE.md](PROPERTY_MODAL_USAGE_EXAMPLE.md) for complete implementation guide.

#### Flow Storage & Execution

- **Storage**: Flow data (nodes + edges) stored as JSONB in `flows.canvas_data`
- **Execution**: Bot execution engine in `app/services/chatbot_service.py` processes nodes sequentially based on edges
- **Variables**: Support for variable substitution using `{{variable_name}}` syntax
- **Simulator**: Real-time flow testing with FlowSimulator component

#### Builder UI Design (LangFlow-Style)

The chatbot builder features a clean, minimal design inspired by LangFlow for professional appearance and optimal UX.

**Design Principles:**
- Clean and minimal aesthetics
- Subtle interactions without excessive animations
- Professional appearance suitable for enterprise use
- Optimized handle sizes for easy connection creation

**Node Styling:**
- Rounded corners (rounded-lg) for modern look
- Thin borders (1.5px) for clean appearance
- Single-layer subtle shadow for depth
- Background colors matching node type (message=blue, question=purple, etc.)
- Hover effect: Slightly elevated shadow
- Selected state: Colored ring (2px) without excessive emphasis

**Handle (Connector) Styling:**
- Small size (8px) for clean, unobtrusive appearance
- White border (2px) for visibility against any background
- Hover: Minimal growth to 10px
- Positioned at top (input) and bottom (output) of nodes
- Color-coded to match parent node type

**Connection Lines (Edges):**
- Thin stroke (2px) for clean appearance
- Hover: Subtle thickness increase to 2.5px
- Selected: 3px stroke width
- Smooth step curves for natural flow visualization

**Critical CSS Files:**
- `frontend/src/app/builder/[id]/builder.css` - Custom overrides for React Flow defaults
- Removes default React Flow backgrounds and wrappers
- Applies LangFlow-inspired minimal design

**Key Fixes Applied:**
1. **Double border bug** - Removed inline styles from node creation that conflicted with CustomNode styles
2. **Background wrapper bug** - Removed extra `<div>` wrapper, using Fragment (`<>`) instead
3. **React Flow defaults** - Override default node backgrounds, padding, and borders with transparent/minimal values

**Component:** `frontend/src/components/admin/builder/CustomNode.tsx` - Renders individual nodes with consistent styling

**Page:** `frontend/src/app/builder/[id]/page.tsx` - Main builder canvas with React Flow integration

### Queue System

Conversations can be in queue for agent pickup:
- Status: `queued` → `active` (when agent picks up)
- Queue management in `app/services/queue_service.py`
- Agents "pull" conversations from queue via `/queue/pull` endpoint

### Departments

Teams/departments organize agents and conversations:
- Conversations can be routed to departments
- Agents belong to departments
- Queue filtering by department

### Campaign System

Bulk message sending via Celery tasks:
- Campaign created → Celery task scheduled
- Task processes contacts in batches
- Rate limiting to avoid Meta API blocks
- Status tracking: draft, scheduled, running, completed, failed

## Environment Configuration

Key environment variables in `backend/.env`:

```bash
# Application
ENVIRONMENT=development
DEBUG=True
SECRET_KEY=<32+ char secret - generate with: openssl rand -hex 32>

# Server
HOST=0.0.0.0
PORT=8000

# Database - PostgreSQL (auto-assembled from components)
POSTGRES_SERVER=localhost
POSTGRES_PORT=5432
POSTGRES_USER=pytake
POSTGRES_PASSWORD=pytake_dev_password
POSTGRES_DB=pytake_dev
# Or use full URL directly:
# DATABASE_URL=postgresql://pytake:pytake_dev_password@localhost:5432/pytake_dev

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# MongoDB
MONGODB_URL=mongodb://localhost:27017
MONGODB_DB=pytake_logs

# Security - JWT
JWT_SECRET_KEY=<32+ char secret - different from SECRET_KEY>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# WhatsApp (Meta Cloud API) - Per organization in DB
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
WHATSAPP_API_VERSION=v18.0

# Celery
CELERY_BROKER_URL=redis://localhost:6379/1
CELERY_RESULT_BACKEND=redis://localhost:6379/2

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# Testing
TESTING=False
```

Frontend environment variables in `frontend/.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

**Critical Notes:**
- Frontend API URL **must** include `/api/v1` path
- When using Docker Compose, backend uses `backend/.env.docker` instead of `backend/.env`
- Root `.env` file controls Docker Compose port mappings and API URL configuration
- See `backend/.env.example` for complete list of 100+ config options (AWS S3, SMTP, Sentry, rate limiting, subscription plans, etc.)

## Default Credentials

For local development and testing, use these credentials:

**Admin User (org_admin role):**
```
Email: admin@pytake.com
Password: Admin123
Role: org_admin
Access: /admin dashboard
Features: Gestão completa da organização, configuração de chatbots, campanhas, usuários
```

**Agent User (agent role):**
```
Email: agente@pytake.com
Password: Agente123
Role: agent
Access: /agent dashboard
Features: Atendimento ao cliente, fila, conversas ativas, métricas pessoais
```

**Testing the Role-Based Routing:**
1. Login com `admin@pytake.com` → Redireciona para `/admin` (dashboard roxo)
2. Logout e login com `agente@pytake.com` → Redireciona para `/agent` (dashboard verde)
3. Tentar acessar `/admin` com usuário agente → Redireciona automaticamente para `/agent`
4. Tentar acessar `/agent` com usuário admin → Redireciona automaticamente para `/admin`

**Important:**
- Default credentials are ready for immediate testing
- Change in production!
- After login, users are automatically redirected to the appropriate dashboard based on their role

See [CREDENTIALS.md](CREDENTIALS.md) and [ROLE_BASED_ROUTING.md](ROLE_BASED_ROUTING.md) for full details.

## Testing Strategy

Testing infrastructure is set up but tests need to be implemented.

- **Unit tests**: Test services and business logic in isolation (`backend/tests/unit/`)
- **Integration tests**: Test API endpoints with test database (`backend/tests/integration/`)
- **E2E tests**: Full flow tests (planned)

Use pytest fixtures for database sessions, test client, and authenticated users.

```bash
# Run tests
cd backend
pytest                                    # All tests
pytest tests/unit                         # Unit tests only
pytest tests/integration                  # Integration tests only
pytest -v --cov=app                       # With coverage report
pytest -k test_authentication             # Run specific test pattern
```

## Common Pitfalls

### Backend

1. **Forgetting organization_id filter**: Always scope queries by organization
2. **N+1 queries**: Use `selectinload()` or `joinedload()` for relationships
3. **Blocking I/O in async functions**: Use `httpx` not `requests`, always await DB calls
4. **Missing indexes**: Add indexes for foreign keys and frequently filtered columns
5. **Webhook signature validation**: Always validate Meta webhooks before processing
6. **24-hour window**: Remember template-only restriction outside conversation window
7. **bcrypt version**: Use bcrypt==4.0.1 (not 4.1.1) for passlib compatibility
8. **MongoDB boolean checks**: Use `if mongodb_client.db is None:` NOT `if not mongodb_client.db:`
9. **Repository initialization**: Repositories only accept `db` parameter, NOT model class
   ```python
   # ❌ WRONG
   ChatbotRepository(Chatbot, db)
   FlowRepository(Flow, db)

   # ✅ CORRECT
   ChatbotRepository(db)
   FlowRepository(db)
   ```

### Frontend

1. **Protected route timing**: Always check `isLoading` BEFORE `isAuthenticated` in useEffect
2. **API interceptor on auth endpoints**: Don't attempt token refresh on `/auth/login` or `/auth/register`
3. **Form submissions**: Avoid `<form>` elements if handling submit manually - use `<div>` with `type="button"`
4. **localStorage in try-catch**: Wrap all localStorage operations in try-catch blocks
5. **State updates in error handlers**: Always wrap `set()` calls in try-catch within error handlers

## Frontend Structure

```
frontend/
├── src/                        # Source directory
│   ├── app/                    # Next.js App Router
│   │   ├── admin/              # Admin dashboard (org_admin, super_admin)
│   │   │   ├── layout.tsx      # Admin layout with sidebar
│   │   │   ├── page.tsx        # Admin dashboard
│   │   │   ├── conversations/  # All conversations
│   │   │   ├── contacts/       # Contact management
│   │   │   ├── chatbots/       # Chatbot builder
│   │   │   ├── campaigns/      # Campaign management
│   │   │   ├── users/          # User/agent management
│   │   │   ├── queues/         # Queue configuration
│   │   │   ├── analytics/      # Analytics & reports
│   │   │   ├── whatsapp/       # WhatsApp configuration
│   │   │   └── settings/       # Organization settings
│   │   ├── agent/              # Agent dashboard (agent, viewer)
│   │   │   ├── layout.tsx      # Agent layout with sidebar
│   │   │   ├── page.tsx        # Agent dashboard
│   │   │   ├── queue/          # Queue (pick conversations)
│   │   │   ├── conversations/  # Active conversations
│   │   │   ├── history/        # Conversation history
│   │   │   ├── completed/      # Completed conversations
│   │   │   └── profile/        # Agent profile
│   │   ├── login/              # Login page
│   │   ├── register/           # Registration page
│   │   ├── dashboard/          # Smart redirect based on role
│   │   ├── terms/              # Terms of service
│   │   ├── privacy/            # Privacy policy
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Landing page
│   │   └── globals.css         # Global styles
│   ├── components/             # Reusable UI components
│   │   ├── layouts/            # Layout components
│   │   │   ├── AdminSidebar.tsx  # Admin navigation
│   │   │   └── AgentSidebar.tsx  # Agent navigation
│   │   └── ui/                 # Base UI components
│   ├── lib/                    # Utilities
│   │   ├── auth/               # Auth utilities
│   │   │   └── roleGuard.tsx   # Role-based access control
│   │   ├── api.ts              # API client (axios with interceptors)
│   │   └── utils.ts            # Utility functions
│   ├── store/                  # Zustand stores
│   │   └── authStore.ts        # Authentication state
│   ├── contexts/               # React contexts
│   ├── utils/                  # Additional utilities
│   └── middleware.ts           # Next.js middleware (route protection)
├── public/                     # Static files
├── package.json
├── tsconfig.json
├── tailwind.config.js          # Tailwind v4 config
├── next.config.ts              # Next.js config
└── eslint.config.mjs           # ESLint configuration
```

### Frontend Critical Patterns

#### Protected Routes Pattern

**ALWAYS** follow this pattern for any protected page to avoid authentication timing issues:

```typescript
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export default function ProtectedPage() {
  const router = useRouter();
  // CRITICAL: Destructure isLoading as authLoading for clarity
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();

  useEffect(() => {
    // STEP 1: ALWAYS check authLoading FIRST
    if (authLoading) {
      return; // Wait for checkAuth() to complete
    }

    // STEP 2: THEN check authentication
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // STEP 3: FINALLY load protected data
    loadProtectedData();
  }, [isAuthenticated, authLoading, router]); // Include authLoading in deps

  // Show loading while checking auth
  if (authLoading) {
    return <div>Verificando autenticação...</div>;
  }

  return (/* Your protected content */);
}
```

**Why this order matters:**
- On page load, `checkAuth()` runs in authStore which sets `isLoading=true`
- During this check, `isAuthenticated` is still `false`
- If you check `!isAuthenticated` before `authLoading`, you redirect before token validation completes
- This prevents session persistence after login

#### API Interceptor Pattern

The axios instance in `lib/api.ts` has critical interceptors:

```typescript
// Response interceptor handles token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      // CRITICAL: Don't refresh on auth endpoints
      const isAuthEndpoint = originalRequest.url?.includes('/auth/login') ||
                            originalRequest.url?.includes('/auth/register');

      if (isAuthEndpoint) {
        return Promise.reject(error); // Just reject, don't refresh
      }

      // For other endpoints, try token refresh
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');

      if (!refreshToken) {
        // Only redirect if NOT already on login page
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      // Attempt refresh...
    }

    return Promise.reject(error);
  }
);
```

**Critical points:**
- Never attempt token refresh on login/register endpoints (causes page reload)
- Never redirect to /login if already on /login (causes infinite loop)
- Always check for refresh token before attempting refresh

#### Error Handling in Zustand Stores

All state mutations must be wrapped in try-catch:

```typescript
login: async (email: string, password: string) => {
  try {
    // Validate inputs
    if (!email || !password) {
      set({ user: null, isAuthenticated: false });
      throw new Error('Email e senha são obrigatórios');
    }

    const response = await authAPI.login({ email, password });

    // Validate response
    if (!response?.data) {
      set({ user: null, isAuthenticated: false });
      throw new Error('Resposta inválida do servidor');
    }

    // Protected localStorage operations
    try {
      localStorage.setItem('access_token', token.access_token);
      localStorage.setItem('refresh_token', token.refresh_token);
    } catch (storageError) {
      set({ user: null, isAuthenticated: false });
      throw new Error('Erro ao salvar credenciais');
    }

    set({ user, isAuthenticated: true });
  } catch (error) {
    // Protected error handling
    try {
      set({ user: null, isAuthenticated: false });
    } catch (setState) {
      // Fail silently if even set() fails
    }
    throw error;
  }
}
```

## Platform Notes

This project is being developed on **Windows** but runs entirely in Docker containers, making it platform-agnostic.

**Windows Requirements:**
- Docker Desktop installed and running
- Git for Windows (or Git Bash)
- Any code editor (VS Code recommended)

**All platforms:**
- Docker and Docker Compose are the only requirements
- No need for Python, Node.js, or database installations on host
- All development happens inside containers
- Hot reload works across all platforms via volume mounts

## Recent Implementation Status

### Live Chat / Atendimento System (October 2025)

**Phase 1: Inbox - COMPLETED ✅**
- **Components:** `ConversationList.tsx`, `ConversationItem.tsx`, `ConversationFilters.tsx`
- **Pages:** `/admin/conversations` (purple theme), `/agent/conversations` (green theme)
- **Features:** Auto-refresh (5s), search, filters (status, assigned to me), role-based access
- **Testing:** Fully tested with browser automation (Playwright MCP)
- **Fix:** Backend schema validation error resolved (`priority` field optional)
- **Documentation:** [LIVE_CHAT_PLAN.md](LIVE_CHAT_PLAN.md) - Complete implementation plan

**Phase 2: Queue System - COMPLETED ✅**
- **Backend:** Queue endpoints (`GET /api/v1/queue/`, `POST /api/v1/queue/pull`)
- **Service:** `get_queue()` and `pull_from_queue()` methods in ConversationService
- **Components:** `QueueList.tsx` (8.5 KB), `QueueItem.tsx` (6.1 KB)
- **Page:** `/agent/queue` with green theme, auto-refresh (5s)
- **Features:** Priority system (Urgent/High/Medium/Low), time in queue, "⚡ Pegar Próxima" button
- **Testing:** Fully tested with browser automation (Playwright MCP)
- **Fix:** Parameter mismatch resolved (`assigned_department_id`)

**Phase 3: Quick Actions - COMPLETED ✅**
- **Backend:** Action schemas (`ConversationAssign`, `ConversationTransfer`, `ConversationClose`)
- **Backend:** Service methods (`assign_to_agent()`, `transfer_to_department()`, `close_conversation()`)
- **Backend:** Endpoints (`POST /conversations/{id}/assign`, `/transfer`, `/close`)
- **Frontend:** API functions in `conversationsAPI` (assign, transfer, close)
- **Component:** `ChatActions.tsx` (292 lines) with dropdown menus
- **Integration:** Integrated in admin and agent chat pages
- **Features:**
  - Assign to agent with agent selection dropdown
  - Transfer to department with note field (max 500 chars)
  - Close conversation with reason and resolved checkbox
  - Loading states, error handling, auto-refresh after actions
  - Transfer history saved in `extra_data`
- **Commits:** `a1c928c`, `e6dce2a`, `b38ab28`

**Phase 4: Real-time Indicators - COMPLETED ✅**
- **Typing Indicators - COMPLETED ✅**
  - Backend WebSocket events (`typing_start`, `typing_stop`)
  - Frontend: Visual typing indicator with 3 animated dots
  - Auto-stop after 3 seconds of inactivity
  - Integrated in MessageList and MessageInput components
  - **Commits:** `96a38a0`, `837a686`
- **Status Online/Offline - COMPLETED ✅**
  - Backend: `user:status` event on connect/disconnect
  - Organization room for broadcast org-wide
  - Helper functions: `emit_to_organization()`, `update_unread_count()`
  - Frontend: `useUserStatus` hook for state management
  - `UserStatusIndicator` component (green/gray dot)
  - Integrated in ConversationItem component
  - **Commit:** `53abd20`
- **Unread Count Badges - COMPLETED ✅**
  - `useUnreadCount` hook with real-time updates via WebSocket
  - Red badge on sidebar (AdminSidebar and AgentSidebar)
  - Dynamic updates on new inbound messages
  - **Commit:** `95358ff`

**Status:** Live Chat system COMPLETE! 🎉 All 4 phases implemented.

### AI Assistant & Models System (October 2025)

**COMPLETED ✅ - Dynamic AI Models with Custom Support**

A comprehensive system for managing AI models (OpenAI GPT & Anthropic Claude) with custom model support, usage tracking, and cost analytics.

#### Features Implemented

**1. Predefined Models Database (16 models)**
- **OpenAI (8 models):** GPT-5, GPT-4o, GPT-4o mini, o4-mini, o3, GPT-4 Turbo, GPT-4, GPT-3.5 Turbo
- **Anthropic (8 models):** Claude Sonnet 4.5, Claude Opus 4.1, Claude Sonnet 4, Claude Haiku 4.5, Claude 3.7 Sonnet, Claude 3.5 Sonnet/Haiku, Claude 3 Opus (deprecated)
- Models updated: October 2025
- Includes pricing, context windows, capabilities (vision, tools)
- Location: `backend/app/data/ai_models.py`

**2. Custom Models (User-Added)**
- Organizations can add their own models (fine-tuned, new providers, etc.)
- Database: `ai_custom_models` table with full tracking
- Fields: model_id, provider, name, description, context_window, max_output_tokens, pricing, capabilities
- Multi-tenant: Each organization has isolated custom models
- Unique constraint: `organization_id + model_id`

**3. Usage & Cost Tracking**
- Automatic tracking: `usage_count`, `total_input_tokens`, `total_output_tokens`, `total_cost`
- Per-model analytics
- Per-organization aggregated stats
- Cost calculation: `(tokens / 1_000_000) * cost_per_million`
- Method: `increment_usage(input_tokens, output_tokens)` updates all metrics

**4. API Endpoints**
```bash
# List all models (predefined + custom)
GET /api/v1/ai-assistant/models
    ?provider=openai|anthropic
    &recommended=true|false
    &include_deprecated=true|false

# Get model details
GET /api/v1/ai-assistant/models/{model_id}

# Create custom model (org_admin only)
POST /api/v1/ai-assistant/models/custom
{
  "model_id": "gpt-5-company-finetuned",
  "provider": "openai",
  "name": "GPT-5 Company Fine-tuned",
  "description": "Fine-tuned for customer support",
  "context_window": 128000,
  "max_output_tokens": 16384,
  "input_cost_per_million": 35.0,
  "output_cost_per_million": 100.0,
  "supports_vision": true,
  "supports_tools": true
}

# AI Assistant Settings
GET  /api/v1/ai-assistant/settings
POST /api/v1/ai-assistant/settings
POST /api/v1/ai-assistant/test
```

**5. Frontend UI**
- Page: `/admin/settings/ai-assistant`
- Dynamic model selection with pricing inline
- Example: `GPT-4o (Omni) - $2.50/$10.00 por 1M tokens`
- Badge indicators: `(Customizado)`, `(Recomendado)`, `(DEPRECATED)`
- Modal: **AddCustomModelModal** - Complete form for adding custom models
  - Validations with Zod
  - Cost preview: Estimated cost per request
  - Capabilities checkboxes (vision, tools)
  - Auto-reload after success

**6. Architecture**
```
Backend:
├── app/data/ai_models.py              # 16 predefined models
├── app/models/ai_custom_model.py      # ORM model with tracking
├── app/repositories/ai_custom_model.py # Repository with 5 methods
├── app/schemas/ai_assistant.py        # Pydantic schemas
└── app/api/v1/endpoints/ai_assistant.py # REST endpoints

Frontend:
├── src/app/admin/settings/ai-assistant/page.tsx  # Settings page
├── src/components/AddCustomModelModal.tsx         # Custom model form
└── src/lib/api.ts                                # API client functions
```

**7. Database Schema**
```sql
CREATE TABLE ai_custom_models (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  model_id VARCHAR(255) NOT NULL,
  provider VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  context_window INTEGER NOT NULL,
  max_output_tokens INTEGER NOT NULL,
  input_cost_per_million FLOAT NOT NULL,
  output_cost_per_million FLOAT NOT NULL,
  supports_vision BOOLEAN DEFAULT FALSE,
  supports_tools BOOLEAN DEFAULT TRUE,
  release_date VARCHAR(10),
  is_active BOOLEAN DEFAULT TRUE,
  usage_count INTEGER DEFAULT 0,
  total_input_tokens BIGINT DEFAULT 0,
  total_output_tokens BIGINT DEFAULT 0,
  total_cost FLOAT DEFAULT 0.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(organization_id, model_id)
);
```

**8. Key Features**
- ✅ Multi-tenant model management
- ✅ Automatic cost tracking
- ✅ Production-ready (indexes, constraints, soft-delete)
- ✅ RBAC (org_admin only for custom models)
- ✅ Flexible: Supports any provider/model
- ✅ Analytics-ready: Per-model and org-wide stats
- ✅ Future-proof: Easy to add new providers

**9. Usage Example**
```python
# Track model usage
from app.repositories.ai_custom_model import AICustomModelRepository

repo = AICustomModelRepository(db)
await repo.increment_usage(
    model_id=model_uuid,
    input_tokens=1500,
    output_tokens=800
)

# Get org stats
stats = await repo.get_usage_stats(organization_id)
# Returns: {
#   "total_models": 3,
#   "active_models": 3,
#   "total_usage_count": 150,
#   "total_cost": 2.45,
#   "total_input_tokens": 75000,
#   "total_output_tokens": 40000,
#   "total_tokens": 115000
# }
```

**Status:** Fully implemented and production-ready! 🚀

See [AI_MODELS.md](AI_MODELS.md) for complete documentation.

---

### AI Flow Assistant (October 2025)

**COMPLETED ✅ - Intelligent Flow Generation with Advanced Features**

An AI-powered conversational assistant that generates complete chatbot flows from natural language descriptions, with smart component selection based on WhatsApp type.

#### Core Features Implemented

**1. Conversational Flow Generation**
- **Natural Language Processing**: Describe flows in plain language (Portuguese or English)
- **Smart WhatsApp Detection**: Automatically detects chatbot's WhatsApp type (Official API vs QR Code)
- **Intelligent Component Selection**:
  - **Official API (Meta Cloud)**: Generates `interactive_buttons` and `interactive_list` nodes
  - **QR Code (Evolution)**: Generates text-based numbered options (e.g., "1 - Cliente\n2 - Suporte")
- **Industry Context**: Optional industry/sector selection for better context

**2. Clarification Questions UI** ✅
- **Interactive Question Form**: `ClarificationForm.tsx` component with radio buttons and text inputs
- **Multiple Choice Support**: Radio button selection for predefined options
- **Free Text Input**: Text fields for open-ended clarifications
- **Multi-Round Clarifications**: Supports iterative clarification process
- **Answer Persistence**: Stores last description and sends with clarifications

**3. Visual Flow Preview** ✅
- **Graph Miniature**: React Flow-powered visual preview of generated flow
- **Toggle View**: "Ver Preview Visual" button to show/hide thumbnail
- **Read-Only Preview**: Non-interactive visualization (no drag, zoom, or selection)
- **200px Height Canvas**: Compact preview with fitView for optimal display
- **Background Grid**: Visual background for professional appearance

**4. Markdown Support in Messages** ✅
- **Rich Formatting**: Supports **bold**, lists (ordered/unordered), and `inline code`
- **Assistant-Only**: Markdown rendering only for AI responses
- **Custom Styling**: Tailwind prose classes with custom component overrides
- **Compact Display**: Optimized spacing for chat interface

#### Technical Architecture

**Backend:**
```
backend/app/
├── services/flow_generator_service.py      # Core AI flow generation service
│   ├── generate_flow_from_description()    # Main generation method
│   ├── suggest_improvements()              # Flow improvement suggestions
│   ├── _build_system_prompt()              # Dynamic prompt based on WhatsApp type
│   └── _call_anthropic() / _call_openai()  # AI provider integration
├── schemas/ai_assistant.py                 # Pydantic schemas
│   ├── GenerateFlowRequest
│   ├── GenerateFlowResponse
│   ├── ClarificationQuestion
│   └── FlowImprovement
└── api/v1/endpoints/ai_assistant.py        # REST endpoints
    ├── POST /generate-flow                 # Generate flow from description
    └── POST /suggest-improvements          # Analyze and suggest improvements
```

**Frontend:**
```
frontend/src/components/admin/ai-assistant/
├── AIFlowAssistant.tsx          # Main assistant modal component
├── ClarificationForm.tsx        # NEW: Interactive clarification UI
├── FlowPreview.tsx              # Enhanced with visual graph preview
├── ChatMessage.tsx              # Enhanced with Markdown support
├── IndustrySelect.tsx           # Industry/sector selection
└── ExamplesModal.tsx            # Pre-built example prompts
```

#### API Endpoints

```bash
# Generate flow from description
POST /api/v1/ai-assistant/generate-flow
{
  "description": "Crie um chatbot de vendas...",
  "industry": "E-commerce",
  "language": "pt-BR",
  "chatbot_id": "uuid-here",        # NEW: For WhatsApp type detection
  "clarifications": {                # NEW: Clarification answers
    "field1": "answer1",
    "field2": "answer2"
  }
}

# Response types:
# 1. Success with flow
{
  "status": "success",
  "flow_data": {
    "name": "Flow de Vendas",
    "description": "...",
    "canvas_data": {
      "nodes": [...],
      "edges": [...]
    }
  }
}

# 2. Needs clarification
{
  "status": "needs_clarification",
  "clarification_questions": [
    {
      "question": "Qual tipo de produtos você vende?",
      "options": ["Físicos", "Digitais", "Serviços"],
      "field": "product_type"
    }
  ]
}
```

#### Key Improvements (Latest)

**🔧 Bug Fixes:**
- **JSX Label Fix** (`e782b8e`): Fixed 500 error when saving flows - labels were being saved as JSX objects instead of strings
  - Added `sanitizeNodesForSave()` function to convert JSX labels → text
  - Applied to both admin and non-admin builders

**🎯 Smart Component Selection** (`73aaae5`):
- **WhatsApp Type Detection**: Automatically detects Official API vs QR Code
- **Dynamic Prompts**: AI receives different instructions based on WhatsApp type
- **Component Optimization**:
  - Official → `interactive_buttons` (≤3 options) or `interactive_list` (4+ options)
  - QR Code → Text messages with numbered options (1 - Option, 2 - Option)

**✨ UX Enhancements** (`cc56648`):
- **Clarification Questions**: Complete interactive form with validation
- **Visual Preview**: Graph miniature with React Flow
- **Markdown Rendering**: Rich text formatting in AI responses

#### Usage Flow

```
1. User describes desired flow in natural language
   ↓
2. Frontend sends description + chatbot_id to backend
   ↓
3. Backend detects WhatsApp type (official/qrcode) from chatbot
   ↓
4. AI generates flow with appropriate components
   ↓
5. If unclear → Shows clarification form
   ↓
6. User answers questions → Re-generates with clarifications
   ↓
7. Shows visual preview + import button
   ↓
8. User imports flow to chatbot builder
```

#### Dependencies

- **Backend**: `openai==1.54.5`, `anthropic==0.39.0`
- **Frontend**: `react-markdown@9`, `@xyflow/react` (React Flow)

#### Future Enhancements

- [ ] Template selection with industry-specific flows
- [ ] Multi-language flow generation (beyond pt-BR)
- [ ] Flow version history and comparison
- [ ] Collaborative flow editing with AI suggestions
- [ ] Export/Import flows as JSON templates

**Status:** Fully functional with intelligent component selection! 🤖✨

---

## Additional Documentation

Comprehensive documentation available:

### Architecture & Development
- [ARCHITECTURE.md](ARCHITECTURE.md) - Detailed system architecture
- [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) - Detailed development guide
- [docs/DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md) - Complete database schema
- [docs/FEATURES.md](docs/FEATURES.md) - Feature specifications
- [docs/API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md) - API reference
- [LIVE_CHAT_PLAN.md](LIVE_CHAT_PLAN.md) - Live Chat implementation plan & progress

### Deployment & Infrastructure
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) - Production deployment guide
- [docs/DOCKER_SETUP.md](docs/DOCKER_SETUP.md) - Docker setup guide
- [docs/INTEGRATION_GUIDE.md](docs/INTEGRATION_GUIDE.md) - External integrations

### Frontend Critical Fixes
- [ERROR_HANDLING.md](ERROR_HANDLING.md) - Comprehensive error handling patterns
- [AUTH_SESSION_FIX.md](AUTH_SESSION_FIX.md) - Protected route authentication timing
- [FINAL_FIX_RELOAD.md](FINAL_FIX_RELOAD.md) - API interceptor configuration
- [CREDENTIALS.md](CREDENTIALS.md) - Default login credentials

Refer to these files for deep dives into specific areas.

## Development Guidelines for AI Assistants

### Core Principles

- **Docker-First:** This project ALWAYS runs in Docker. Never suggest local Python/Node.js installations or running services outside containers.
- **No Automated Testing:** DO NOT use MCP tools (Playwright, browser automation, etc.) for testing. The developer handles ALL testing manually.
- **Windows Paths:** This project is developed on Windows (D:\pytake\) but all paths inside containers use Unix format.
- **Code Changes Only:** Focus on code implementation, architecture, and bug fixes. Leave testing and validation to the developer.

### Git Workflow

**IMPORTANT: Commit after EVERY completed task/step.**

When working on a feature or bug fix:
1. Complete a logical unit of work (e.g., create a component, add an endpoint, fix a bug)
2. Immediately create a Git commit with a descriptive message
3. Move to the next task
4. Repeat

**Commit Message Format:**
```bash
# Use conventional commits format
git add .
git commit -m "feat: add user profile component"
git commit -m "fix: resolve authentication token refresh issue"
git commit -m "refactor: improve database query performance"
git commit -m "docs: update API documentation for new endpoints"
```

**Commit Prefixes:**
- `feat:` - New feature
- `fix:` - Bug fix
- `refactor:` - Code refactoring (no functional changes)
- `docs:` - Documentation changes
- `style:` - Formatting, missing semicolons, etc.
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

**Example Workflow:**
```bash
# Task 1: Create UserProfile component
# ... write code ...
git add frontend/src/components/UserProfile.tsx
git commit -m "feat: add UserProfile component with avatar and bio"

# Task 2: Add API endpoint
# ... write code ...
git add backend/app/api/v1/endpoints/profile.py
git commit -m "feat: add GET /api/v1/profile endpoint"

# Task 3: Fix bug
# ... write code ...
git add backend/app/services/auth_service.py
git commit -m "fix: resolve token expiration validation issue"
```

**Why commit frequently:**
- Makes it easier to review changes
- Allows rolling back specific changes if needed
- Creates a clear history of development progress
- Each commit represents a working state

**DO NOT:**
- Wait until all tasks are complete to commit
- Create massive commits with multiple unrelated changes
- Commit broken or untested code (verify basics before committing)