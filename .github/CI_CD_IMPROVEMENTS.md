# 🚀 PyTake CI/CD Pipeline

Documentação dos workflows de CI/CD implementados para PyTake.

## Workflows

### 1. **Lint & Type Check** (`lint.yml`)
- **Trigger**: Push para `main`/`develop`, Pull Requests
- **Funções**:
  - ✅ Backend linting (pylint, flake8, bandit)
  - ✅ Code formatting checks (black, isort)
  - ✅ Frontend linting (ESLint, TypeScript)
  - ✅ Markdown validation
  - ✅ **ENFORCEMENT**: Falha se pylint score < 8.0

**Resultado**: PRs que não passam em lint são rejeitadas ❌

---

### 2. **Tests** (`test.yml`)
- **Trigger**: Push para `main`/`develop`, Pull Requests
- **Funções**:
  - ✅ Backend tests com PostgreSQL + Redis
  - ✅ Frontend tests/type-check
  - ✅ Alembic migrations validation
  - ✅ Coverage reports (upload para Codecov)
  - ✅ **ENFORCEMENT**: Coverage deve ser >= 70%

**Resultado**: Testes com cobertura < 70% são rejeitados ❌

**Ambiente de teste**:
```yaml
PostgreSQL: localhost:5432 (pytake/pytake_test)
Redis:      localhost:6379
```

---

### 3. **Build & Push Docker** (`build-images.yml`)
- **Trigger**: Push para `main`/`develop`, Tags semânticas (v*)
- **Funções**:
  - 🐳 Build backend Docker image
  - 🐳 Build frontend Docker image
  - 📦 Push para GitHub Container Registry (GHCR)
  - 🏷️ Automatic tagging (branch, semver, SHA, latest)
  - ⚡ GitHub Actions cache para builds rápidos

**Resultado**: Imagens disponíveis em:
```
ghcr.io/xkayo32/pytake-backend:develop
ghcr.io/xkayo32/pytake-backend:v1.0.0
ghcr.io/xkayo32/pytake-backend:latest

ghcr.io/xkayo32/pytake-frontend:develop
ghcr.io/xkayo32/pytake-frontend:v1.0.0
ghcr.io/xkayo32/pytake-frontend:latest
```

---

### 4. **Deploy** (`deploy.yml`)
- **Trigger**: Manual (Workflow Dispatch via GitHub UI)
- **Funções**:
  - 📌 Create semantic version tags
  - ✅ Pre-deployment validation
  - 🚀 Deploy to staging/production (template)
  - 🏥 Health checks
  - 📢 GitHub Releases
  - 🔔 Notifications

**Uso**:
1. Ir para GitHub Actions → "Deploy (Manual Release)"
2. Clicar em "Run workflow"
3. Selecionar ambiente (staging/production)
4. Opcional: Especificar versão

---

## Melhorias Implementadas

### ✅ Lint Enforcement
```yaml
# ANTES: pylint app/ --disable=C0111,W0212 --fail-under=8.0 || true
# DEPOIS: pylint app/ --disable=C0111,W0212 --fail-under=8.0
```
**Impacto**: PRs com qualidade ruim são rejeitadas automaticamente

---

### ✅ Coverage Requirement
```yaml
# ANTES: --cov-fail-under=0 (nenhum requisito)
# DEPOIS: --cov-fail-under=70 (70% mínimo)
```
**Impacto**: Força testes mais robustos

---

### ✅ Docker Image Building
- Imagens automaticamente construídas em push/tag
- Cache otimizado com GitHub Actions
- Multi-stage builds para frontend (otimização)

---

### ✅ Release Management
- Versioning automático
- GitHub Releases criadas automaticamente
- Suporte para hotfixes e features

---

## Status do Pipeline

### Score de Saúde: **8/10** 📈

| Componente | Score | Status |
|-----------|-------|--------|
| Build/Test | ✅ 8/10 | Funciona com enforcement |
| Lint/Quality | ✅ 9/10 | Agora enforçado |
| Docker Build | ✅ 10/10 | Novo - Funcionando |
| Deploy | ⚠️ 6/10 | Template pronto (SSH pendente) |
| Notifications | ⚠️ 4/10 | Precisa de Slack/Discord |

---

## Próximos Passos

### Curto Prazo (1-2 semanas)
- [ ] Adicionar notificações Slack em falhas
- [ ] Implementar SSH deployment para staging
- [ ] Adicionar performance benchmarks

### Médio Prazo (2-4 semanas)
- [ ] Production deployment (com approval manual)
- [ ] Database migrations em CI/CD
- [ ] Load tests antes de deploy
- [ ] Rollback automático em falhas

### Longo Prazo (1-3 meses)
- [ ] Kubernetes deployment (ArgoCD/Flux)
- [ ] Canary deployments
- [ ] Feature flags management
- [ ] SLA monitoring

---

## Troubleshooting

### ❌ Lint falha em PR

**Solução**: Executar localmente
```bash
cd backend
pylint app/ --disable=C0111,W0212 --fail-under=8.0
black app/
isort app/
```

### ❌ Coverage < 70%

**Solução**: Adicionar testes
```bash
cd backend
pytest tests/ -v --cov=app --cov-report=html
# Verificar coverage report em htmlcov/index.html
```

### ❌ Docker build falha

**Solução**: Verificar Dockerfile
```bash
podman build -f backend/Dockerfile ./backend
```

---

## Referências

- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Docker Build Action](https://github.com/docker/build-push-action)
- [Codecov Integration](https://about.codecov.io/)
