# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start

```bash
# 1. Start all services with Docker Compose
docker-compose up -d

# 2. Access the application
# - Frontend: http://localhost:3001
# - Backend API Docs: http://localhost:8000/docs
# - Default login: admin@pytake.com / Admin123

# 3. Local development (without Docker)
# Terminal 1 - Backend
cd backend
python -m venv venv
venv\Scripts\activate  # Windows (or source venv/bin/activate on Unix)
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload

# Terminal 2 - Frontend
cd frontend
npm install
npm run dev
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

### Backend Setup

```bash
cd backend

# Create virtualenv and install dependencies
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
pip install -r requirements-dev.txt

# Run server (from backend directory)
uvicorn app.main:app --reload --port 8000

# Or use the venv directly (Unix/Mac)
./venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Windows (PowerShell)
venv\Scripts\uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Database migrations (from backend directory)
alembic upgrade head                           # Apply migrations
alembic revision --autogenerate -m "description"  # Auto-generate migration
alembic revision -m "description"              # Create empty migration
alembic downgrade -1                           # Rollback one migration
alembic current                                # Show current revision
alembic history                                # Show migration history

# Using venv directly (Unix/Mac)
./venv/bin/alembic upgrade head
./venv/bin/alembic revision --autogenerate -m "initial_migration"

# Windows (PowerShell)
venv\Scripts\alembic upgrade head
venv\Scripts\alembic revision --autogenerate -m "initial_migration"

# Celery workers
celery -A app.tasks.celery_app worker --loglevel=info
celery -A app.tasks.celery_app beat --loglevel=info
celery -A app.tasks.celery_app flower --port=5555  # Optional monitoring

# Testing
pytest                            # Run all tests
pytest tests/unit                 # Unit tests only
pytest tests/integration          # Integration tests only
pytest -v --cov=app              # With coverage

# Code quality
black app/                        # Format code
isort app/                        # Sort imports
flake8 app/                       # Lint
mypy app/                         # Type checking
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Development
npm run dev                      # Dev server with Turbopack (port 3000)
npm run build                    # Build for production with Turbopack
npm start                        # Start production server
npm run lint                     # ESLint check
```

### Database Services

PostgreSQL, Redis, and MongoDB must be running. Use Docker Compose (recommended):

```bash
# Start all services (PostgreSQL, Redis, MongoDB, Backend, Frontend)
docker-compose up -d

# Start only databases
docker-compose up -d postgres redis mongodb

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

**Important Notes:**
- Frontend runs on port **3001** in Docker (port 3000 locally)
- MongoDB is mapped to port **27018** (not default 27017) to avoid conflicts
- Backend uses `.env.docker` when running in Docker (not `.env`)

Or run individual containers:

```bash
docker run -d -p 5432:5432 -e POSTGRES_USER=pytake -e POSTGRES_PASSWORD=pytake_dev_password -e POSTGRES_DB=pytake_dev postgres:15-alpine
docker run -d -p 6379:6379 redis:7-alpine
docker run -d -p 27018:27017 mongo:7  # Note: MongoDB mapped to port 27018
```

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

Visual drag-and-drop editor with these node types:
- Start, Message, Question, Condition, Action, API Call, AI Prompt, Jump, End, Handoff

Flow data (nodes + edges) stored as JSONB in `flows.canvas_data`. Bot execution engine in `app/services/chatbot_service.py` processes nodes sequentially based on edges.

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

## Windows Development Notes

When developing on Windows, use these platform-specific commands:

```powershell
# Backend - Activate virtualenv
cd backend
venv\Scripts\activate

# Run uvicorn
venv\Scripts\uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Run alembic
venv\Scripts\alembic upgrade head

# Or install globally and use directly
pip install uvicorn fastapi
uvicorn app.main:app --reload
```

**Windows-specific notes:**
- Use `\` instead of `/` for venv paths
- PowerShell requires different script execution policies - if you get errors, run: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`
- Git bash works well for Unix-style commands
- Docker Desktop required for docker-compose

## Additional Documentation

Comprehensive documentation available:

### Architecture & Development
- [ARCHITECTURE.md](ARCHITECTURE.md) - Detailed system architecture
- [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) - Detailed development guide
- [docs/DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md) - Complete database schema
- [docs/FEATURES.md](docs/FEATURES.md) - Feature specifications
- [docs/API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md) - API reference

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
