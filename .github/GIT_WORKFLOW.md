# 🔀 GitFlow Workflow & CI/CD Pipeline

## 📋 Padrão de Branching (GitFlow)

```
main (production)
  ↑ merge de release-* via PR + tag
  ↑ merge de hotfix-* via PR
  
develop (staging/qa)
  ↑ merge de feature-* via PR
  ↑ merge de release-* após finalizado
  
feature/* (desenvolvimento)
develop → feature/TICKET-description
exemplo: feature/TICKET-123-login-refresh-token

release/* (preparação de release)
develop → release/v1.2.0
testes, ajustes, bumps de versão

hotfix/* (correção emergencial)
main → hotfix/TICKET-456-critical-bug
após merge: volta para develop
```

---

## ⚙️ Regras Essenciais

### 1️⃣ NUNCA commitar direto em `main` ou `develop`
- ❌ PROIBIDO: `git push origin main`
- ❌ PROIBIDO: `git commit --amend && git push -f`
- ✅ OBRIGATÓRIO: Criar PR, passar por review, CI/CD passar

### 2️⃣ Nomenclatura de Branches
```
feature/JIRA-123-short-description
fix/JIRA-456-bug-description
docs/update-readme
refactor/optimize-api-layer
test/add-integration-tests
chore/update-dependencies
```

### 3️⃣ Política de PRs (Pull Requests)

**ANTES de criar PR:**
```bash
git fetch origin
git rebase origin/develop  # ou main se for hotfix
```

**Checklist obrigatória:**
- [ ] Branch criado de `develop` (ou `main` para hotfix)
- [ ] Commit messages em formato: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`
- [ ] Testes locais passando: `npm run test` (frontend), `pytest` (backend)
- [ ] Sem console.log ou código comentado
- [ ] CHANGELOG.md atualizado (se relevante)
- [ ] Sem merge commits (rebase quando necessário)

**Após abrir PR:**
- GitHub Actions rodará automaticamente (lint, testes, build)
- Mínimo 1 aprovação antes de merge
- CI/CD deve estar ✅ verde antes de qualquer merge

### 4️⃣ Commits - Padrão Conventional

```
feat: add new feature description
fix: correct bug in XYZ
refactor: reorganize authentication layer
docs: update API documentation
test: add unit tests for UserService
chore: update dependencies
perf: optimize database queries

# Exemplos reais:
feat: implement refresh token rotation for JWT
fix: resolve 500 error in transfer endpoint
refactor: extract WebSocket logic into separate service
docs: add GitFlow workflow guide
test: add tests for conversation transfer
```

---

## 🚀 Fluxo por Tipo de Trabalho

### Scenario 1: Desenvolver uma Feature
```bash
# 1. Sincronizar com develop
git checkout develop
git fetch origin
git pull origin develop

# 2. Criar branch de feature
git checkout -b feature/JIRA-789-new-api-endpoint

# 3. Fazer commits com padrão Conventional
git add .
git commit -m "feat: add POST /conversations/{id}/reassign endpoint"
git commit -m "test: add tests for reassign endpoint"

# 4. Push para remote
git push origin feature/JIRA-789-new-api-endpoint

# 5. Abrir PR no GitHub (destination: develop)
# - Title: "feat: add conversation reassign endpoint"
# - Description: explique o que foi feito, por que, e como testar
# - Marque reviewers

# 6. Após aprovação e CI/CD passar:
# - GitHub faz merge automático (squash recomendado)
# - Branch é deletado
```

### Scenario 2: Corrigir Bug em Produção (Hotfix)
```bash
# 1. Criar branch de hotfix a partir de main
git checkout main
git fetch origin
git pull origin main
git checkout -b hotfix/JIRA-999-critical-sql-injection

# 2. Fazer fix
git add .
git commit -m "fix: sanitize SQL queries in search endpoint"
git commit -m "test: add regression test for SQL injection"

# 3. Push e abrir PR (destination: main)
git push origin hotfix/JIRA-999-critical-sql-injection

# 4. Após merge em main:
# - Tag de release automática é criada (v1.2.1)
# - Também faz merge automático em develop

# 5. Deploy automático para produção
```

### Scenario 3: Preparar Release
```bash
# 1. Criar branch de release quando develop está pronto
git checkout develop
git fetch origin
git pull origin develop
git checkout -b release/v1.3.0

# 2. Fazer último ajustes (versões, CHANGELOG)
# - Editar package.json, backend/app/core/config.py
# - Atualizar CHANGELOG.md
# - Fazer commit: "chore: bump version to 1.3.0"

git add .
git commit -m "chore: bump version to 1.3.0"

# 3. Push e abrir PR (destination: main)
git push origin release/v1.3.0

# 4. Após merge em main:
# - Tag v1.3.0 criada automaticamente
# - Merge automático para develop
# - Deploy de produção acionado
```

---

## ✅ CI/CD Checks Automáticos

Todos os checks abaixo rodam ANTES de qualquer merge:

### Backend
- ✅ Lint (pylint, flake8)
- ✅ Tests (pytest com cobertura mínima 80%)
- ✅ Build Docker image
- ✅ Security scan (bandit)

### Frontend
- ✅ Lint (ESLint)
- ✅ Type check (TypeScript strict mode)
- ✅ Tests (Jest, coverage 70%)
- ✅ Build Next.js
- ✅ Lighthouse performance check

### Infrastructure
- ✅ Docker Compose syntax validation
- ✅ YAML linting (nginx.conf, etc)
- ✅ Secret scanning (não commitamos .env)

---

## 📝 CHANGELOG.md

Manter atualizado em cada PR/release:

```markdown
## [1.3.0] - 2025-11-12

### Added
- New reassign endpoint for conversations
- Refresh token rotation for better security
- Dark mode toggle for admin panel

### Fixed
- SQL injection vulnerability in search
- WebSocket token expiration issue
- Memory leak in message polling

### Changed
- Updated dependencies to latest stable
- Refactored authentication middleware

### Removed
- Legacy alert() notifications (replaced with toasts)
```

---

## 🛡️ Proteção de Branches

### `main` branch
- ✅ Requer 1+ approvals
- ✅ Requer CI/CD passar
- ✅ Requer dismiss stale reviews
- ❌ NÃO permite force push
- ❌ NÃO permite commits diretos
- ✅ Auto-delete branch após merge

### `develop` branch
- ✅ Requer 1 approval
- ✅ Requer CI/CD passar
- ❌ NÃO permite force push
- ❌ NÃO permite commits diretos
- ✅ Auto-delete branch após merge

---

## 🤖 Instruções para Agente (GitHub Copilot)

Toda vez que fazer mudanças de código:

1. **VERIFICAR branch atual:**
   ```
   git branch → NÃO deve ser main ou develop
   ```

2. **ESTRATÉGIA de edits:**
   - Fazer pequenos commits por unidade lógica
   - Mensagens em Conventional Commits
   - Máximo 2-3 commits por PR (squash se necessário)

3. **ANTES de considerar "pronto":**
   - ✅ Rodar testes locais
   - ✅ Verificar lint sem erros
   - ✅ Atualizar CHANGELOG.md
   - ✅ Sugerir descrição de PR clara

4. **NÃO fazer:**
   - ❌ Merge direto (apenas sugerir)
   - ❌ Force push
   - ❌ Rebase sem avisar
   - ❌ Deletar branches remotas
   - ❌ Commitar secrets (.env, keys)

5. **COMUNICAR:**
   - Sempre informar qual branch está trabalhando
   - Sugerir estrutura de PR antes de criar
   - Avisar quando CI/CD não passar

---

## 📚 Referências Úteis

- [Git SCM - GitFlow](https://git-scm.com/book/pt-BR/v2)
- [GitHub Flow vs GitFlow](https://www.atlassian.com/git/tutorials/comparing-workflows/gitflow-workflow)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)

---

## 🎯 Checklist Setup Inicial

- [ ] Proteger branch `main` no GitHub
- [ ] Proteger branch `develop` no GitHub
- [ ] Criar regra para auto-delete branches
- [ ] Configurar branch default como `develop`
- [ ] Ativar GitHub Actions workflows
- [ ] Adicionar esta documentação ao wiki
- [ ] Fazer onboarding da equipe
