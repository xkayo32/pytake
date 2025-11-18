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

## 👤 Autor e Assinatura

**IMPORTANTE:** Em toda documentação, commits, PRs e arquivos, sempre use:
- **Autor:** Kayo Carvalho Fernandes
- **Nunca:** Referências de IA, "GitHub Copilot", "Assistente IA", ou similares

**Onde aplicar:**
- ✅ Commits: "feat: ... | Author: Kayo Carvalho Fernandes"
- ✅ PRs: Assinar com nome completo em descrições
- ✅ Documentação: "Implementado por: Kayo Carvalho Fernandes"
- ✅ Comentários em código: Se houver observações, atribuir ao autor
- ✅ Arquivos de validação/checklist: Incluir nome do autor

**Formato padrão para rodapé de documentos:**
```
---
**Implementado por:** Kayo Carvalho Fernandes  
**Data:** [Data atual]  
**Versão:** [Versão do projeto]  
```

## 🔐 Secrets & Environments - LEIA OBRIGATORIAMENTE

**IMPORTANTE:** Todas as credenciais devem estar no GitHub, NUNCA no código!

- **Secrets Location:** `.github/docs/SECRETS_AND_ENVIRONMENTS/README.md` ← LEIA ISSO PRIMEIRO
- **Repository Secrets:** Acessar em https://github.com/xkayo32/pytake/settings/secrets/actions
- **Environments:** Acessar em https://github.com/xkayo32/pytake/settings/environments

### Quando adicionar novo secret:

1. Gerar localmente: `python3 -c "import secrets; print(secrets.token_urlsafe(32))"`
2. Adicionar no GitHub: `gh secret set NOVO_SECRET -b "valor"`
3. **Documentar em** `.github/docs/SECRETS_AND_ENVIRONMENTS/README.md`
4. Usar em workflows: `${{ secrets.NOVO_SECRET }}`

### Secrets Atuais (Nov 2025):

- `SECRET_KEY` - Chave da aplicação
- `JWT_SECRET_KEY` - Chave de JWT
- `ENCRYPTION_KEY` - Chave Fernet

### ⚠️ NUNCA:

- ❌ Colocar secrets no código
- ❌ Fazer commit de `.env`
- ❌ Print secrets em logs
- ❌ Reutilizar mesma senha em dev/staging/prod
- ❌ Deixar credentials em texto plano

## 🔀 GitFlow & CI/CD - LEIA OBRIGATORIAMENTE

**⚠️ NUNCA commitar ou fazer push em `main` ou `develop` diretamente.**
- Sempre criar branch: `feature/TICKET-XXX-description` (a partir de `develop`)
- Ou `hotfix/TICKET-XXX-description` (a partir de `main` para bugs críticos)
- Usar Conventional Commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`

📚 **Referências obrigatórias:**
1. `.github/GIT_WORKFLOW.md` - Workflow completo de GitFlow
2. `.github/AGENT_INSTRUCTIONS.md` - Instruções passo-a-passo para agentes
3. GitHub Actions workflows em `.github/workflows/` - CI/CD automático

### CI/CD Limpo (Desde commit b9bef97):

- ✅ **MANTÉM:** Migrations, Imports, Build (erros que quebram deploy)
- ❌ **REMOVIDO:** Lint, ESLint, TypeScript type-check, formatters
- ❌ **NUNCA REATIVAR:** lint.yml ou type-check nos workflows

**Por que?** Lint/type-check geram ruído. Foco em erros que realmente quebram o sistema.

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
