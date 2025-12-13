## Copilot Instructions — PyTake

Backend Python: FastAPI + SQLAlchemy + Alembic. Infra: Postgres, Redis, MongoDB. Tudo em Docker Compose.

### Setup Rápido
```bash
cp .env.example .env
docker compose up -d
docker exec pytake-backend alembic upgrade head
docker compose logs -f backend
```

### Regras Críticas

**Container-First**
- Sempre Docker, nunca instalar serviços localmente

**Multi-Tenancy**
- TODO dado é escopado por `organization_id` — sempre filtrar em queries

**RBAC**
- Roles: `super_admin`, `org_admin`, `agent`, `viewer`
- Verificar em rotas e resolvers

**Backend Layering**
- Routes → Services → Repositories (ordem estrita)

**Migrations**
```bash
docker exec pytake-backend alembic revision --autogenerate -m "message"
```
- Revisar antes de aplicar
- NUNCA editar migrations aplicadas

**Secrets**
- GitHub Secrets APENAS
- NUNCA no código, .env commitado, ou logs

### GitFlow

**NUNCA commit direto em `main` ou `develop`**

Branches:
- Feature: `feature/TICKET-XXX-description` (de develop)
- Fix: `fix/TICKET-XXX-description` (de develop)
- Hotfix: `hotfix/TICKET-XXX-description` (de main, só críticos)

Commits: `feat: description | Author: Kayo Carvalho Fernandes`

Antes de começar:
```bash
git fetch origin && git pull origin develop
git branch  # confirmar que NÃO está em main/develop
```

### Entrypoint
- Backend: `backend/app/main.py`

### Testes
```bash
docker exec pytake-backend pytest
```

### Autor
- SEMPRE: Kayo Carvalho Fernandes
- NUNCA: IA, Copilot, Assistente