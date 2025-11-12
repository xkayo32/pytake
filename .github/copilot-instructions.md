## Copilot / agentes — instruções essenciais (curto & prático)

Este arquivo dá ao agente (Copilot/assistente) o contexto mínimo para ser produtivo neste repositório.

- Arquitetura rápida: backend em Python (FastAPI + SQLAlchemy + Alembic), frontend em Next.js (App Router + TypeScript). Infra: Postgres, Redis, MongoDB, Nginx. Tudo orquestrado por Podman/Docker Compose.
- Regra nº1: container-first. Use Podman (preferido). Evite instruir a instalar serviços localmente a não ser que explicitamente solicitado.

Essenciais que você deve conhecer e links rápidos:
- Start (repositório raiz): copy env, levantar serviços e aplicar migrations:
  - cp .env.example .env
  - podman compose up -d  (ou podman-compose up -d)
  - podman exec pytake-backend alembic upgrade head
  - Logs: podman compose logs -f backend frontend
- Entrypoints úteis:
  - Backend app: `backend/app/main.py` (FastAPI - app object: `app.main:app`)
  - Frontend app: `frontend/src/app/page.tsx` (Next.js App Router)

Padrões e convenções relevantes para automações e mudanças de código:
- Multi-tenancy: quase todo dado é escopado por `organization_id` — sempre filtrar por organização em queries.
- RBAC: roles = `super_admin`, `org_admin`, `agent`, `viewer`. Ver `frontend/src/lib/auth/roleGuard.tsx` e rotas em `frontend/src/app/(admin|agent)`.
- Backend layering: `api (routes) → services (business) → repositories (data access)`; siga essa ordem ao adicionar lógica.
- Migrations: gerar com `alembic revision --autogenerate -m "msg"` e revisar antes de aplicar. NUNCA editar migrations aplicadas.

Front-end patterns que quebram facilmente (copie quando for alterar):
- Protected routes: sempre verificar `isLoading` antes de `isAuthenticated` (use `authLoading` no hook). Ver `frontend` protected route examples.
- API client: `frontend/src/lib/api.ts` tem interceptors que NÃO devem tentar refresh em endpoints de auth (/auth/login, /auth/register).

Comandos de desenvolvimento/testes (dentro dos containers):
- Backend tests: podman exec pytake-backend pytest
- Frontend dev/build: podman exec pytake-frontend npm run dev | npm run build

Portas/variáveis importantes:
- Frontend: exposto em 3001 (host) → container 3000
- Backend: 8000 (docs em /api/v1/docs)
- Nginx proxy: 8080
- MongoDB: mapeado em 27018 (note a diferença)
- Arquivo de configuração podman: `backend/.env.podman` (use este quando trabalhar com compose)

## 🔀 GitFlow & CI/CD - LEIA OBRIGATORIAMENTE

**⚠️ NUNCA commitar ou fazer push em `main` ou `develop` diretamente.**
- Sempre criar branch: `feature/TICKET-XXX-description` (a partir de `develop`)
- Ou `hotfix/TICKET-XXX-description` (a partir de `main` para bugs críticos)
- Usar Conventional Commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`

📚 **Referências obrigatórias:**
1. `.github/GIT_WORKFLOW.md` - Workflow completo de GitFlow
2. `.github/AGENT_INSTRUCTIONS.md` - Instruções passo-a-passo para agentes
3. GitHub Actions workflows em `.github/workflows/` - CI/CD automático

Boas práticas de commit/PR (curto):
- Commits frequentes, mensagens no formato: `feat:`, `fix:`, `refactor:`, `docs:`. Pequenos commits por unidade lógica.
- **SEMPRE fazer**: `git fetch origin && git pull origin develop/main` antes de começar
- **SEMPRE verificar**: `git branch` - deve estar em feature/*, hotfix/*, release/*, NÃO em main/develop

Arquivos para checar rapidamente ao fazer mudanças:
- Backend routers: `backend/app/api/v1/router.py` e `backend/app/api/v1/endpoints/*`
- Services/repositories: `backend/app/services/`, `backend/app/repositories/`
- Migrations: `backend/alembic/versions/`
- Frontend pages: `frontend/src/app/admin/*` e `frontend/src/app/agent/*`
- API client / auth: `frontend/src/lib/api.ts`, `frontend/src/lib/auth/roleGuard.tsx`

Ao final: seja conservador com mudanças expansivas. Prefira PRs pequenos, descreva como validar manualmente (ex.: endpoints Swagger, rota do frontend) e inclua comandos Podman para validar. Se algo não puder ser testado sem acesso a infra, descreva as pré-condições claras.

Se quiser, faço uma versão ainda mais curta (10 linhas) ou incluo exemplos de comandos de debug adicionais. Qual formato prefere?
