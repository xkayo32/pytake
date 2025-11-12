# 🔄 Guia de Migração: Monorepo → Múltiplos Repositórios

## 📋 Visão Geral

Este guia detalha a migração do monorepo `pytake` para uma arquitetura de múltiplos repositórios:
- `pytake-backend`: API FastAPI (Python)
- `pytake-frontend`: App Next.js (TypeScript)

**Status:** 🟡 Em Progresso (Fase 1/2)

---

## 🎯 Objetivos

- ✅ Deploys independentes (backend e frontend podem ser atualizados separadamente)
- ✅ CI/CD otimizado (pipelines específicos por stack)
- ✅ Escalabilidade de times (back-end team e front-end team trabalhando em paralelo)
- ✅ Versionamento independente (semver por projeto)
- ✅ Rollback cirúrgico (problema no front não reverte back)

---

## 📅 Cronograma

### Fase 1: Preparação (Semana 1) - ✅ Em andamento
- [x] Documentar contrato de API (v1)
- [ ] Mapear dependências entre backend/frontend
- [ ] Validar OpenAPI/Swagger docs completas
- [ ] Criar guia de migração (este documento)

### Fase 2: Criação dos Repositórios (Semana 2)
- [ ] Criar `pytake-backend` via git subtree split
- [ ] Criar `pytake-frontend` via git subtree split
- [ ] Configurar CI básico em cada repo
- [ ] Testar build/deploy local

### Fase 3: CI/CD & Staging (Semana 3-4)
- [ ] Adicionar workflows de CD para staging
- [ ] Configurar auto-deploy develop → staging
- [ ] Validar staging funcionando 100%
- [ ] Documentar processo de deploy

### Fase 4: Produção (Mês 2)
- [ ] Adicionar CD para produção (tags v*)
- [ ] Migrar produção para novos repos
- [ ] Descontinuar monorepo gradualmente

---

## 🏗️ Arquitetura Nova

```
┌─────────────────────────────────────────────────────┐
│  ANTES (Monorepo)                                    │
├─────────────────────────────────────────────────────┤
│  pytake/                                             │
│  ├── backend/                                        │
│  ├── frontend/                                       │
│  └── .github/workflows/ (tudo junto)                │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  DEPOIS (Multi-repo)                                 │
├─────────────────────────────────────────────────────┤
│  pytake-backend/                                     │
│  ├── app/                                            │
│  ├── alembic/                                        │
│  ├── requirements.txt                                │
│  ├── Dockerfile                                      │
│  └── .github/workflows/                              │
│      ├── ci.yml (tests, build)                       │
│      ├── cd-staging.yml                              │
│      └── cd-production.yml                           │
│                                                       │
│  pytake-frontend/                                    │
│  ├── app/                                            │
│  ├── components/                                     │
│  ├── lib/                                            │
│  ├── package.json                                    │
│  ├── Dockerfile                                      │
│  └── .github/workflows/                              │
│      ├── ci.yml (typecheck, lint, build)             │
│      ├── cd-staging.yml                              │
│      └── cd-production.yml                           │
└─────────────────────────────────────────────────────┘
```

---

## 🚀 Como Criar os Novos Repositórios

### Opção A: Git Subtree Split (Recomendado - Mantém Histórico)

```bash
# 1. Criar workspace temporário
cd /tmp
git clone https://github.com/xkayo32/pytake pytake-split
cd pytake-split

# 2. Extrair backend com histórico
git subtree split --prefix=backend -b backend-only

# 3. Criar repo backend no GitHub
gh repo create xkayo32/pytake-backend --public --description "PyTake Backend - FastAPI"

# 4. Push do histórico
git push https://github.com/xkayo32/pytake-backend.git backend-only:main

# 5. Repetir para frontend
git checkout develop
git subtree split --prefix=frontend -b frontend-only
gh repo create xkayo32/pytake-frontend --public --description "PyTake Frontend - Next.js"
git push https://github.com/xkayo32/pytake-frontend.git frontend-only:main

# 6. Limpar
cd ..
rm -rf pytake-split
```

### Opção B: Clone Simples (Mais Rápido - Histórico Novo)

```bash
# Backend
cd /tmp
git clone https://github.com/xkayo32/pytake pytake-backend
cd pytake-backend
rm -rf frontend .github certbot migrations scripts *.sh *.conf
git remote set-url origin https://github.com/xkayo32/pytake-backend.git
git add -A
git commit -m "chore: initialize backend repository"
git push -u origin main

# Frontend
cd /tmp
git clone https://github.com/xkayo32/pytake pytake-frontend
cd pytake-frontend
rm -rf backend .github certbot migrations scripts *.sh *.conf init-db.sql
git remote set-url origin https://github.com/xkayo32/pytake-frontend.git
git add -A
git commit -m "chore: initialize frontend repository"
git push -u origin main
```

---

## 🔧 Setup de Desenvolvimento Local

### Antes (Monorepo)
```bash
git clone https://github.com/xkayo32/pytake
cd pytake
cp .env.example .env
docker-compose up -d
```

### Depois (Multi-repo)

**Opção 1: Clone manual (para desenvolvimento completo)**
```bash
# Criar workspace
mkdir pytake-workspace
cd pytake-workspace

# Clonar repos
git clone https://github.com/xkayo32/pytake-backend backend
git clone https://github.com/xkayo32/pytake-frontend frontend

# Setup backend
cd backend
cp .env.example .env
docker-compose up -d postgres redis

# Setup frontend (em outro terminal)
cd ../frontend
npm install
npm run dev
```

**Opção 2: Docker Compose orquestrado (recomendado)**
```bash
# Criar docker-compose.dev.yml na raiz do workspace
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    # ... (mesma config do monorepo)

  redis:
    image: redis:7-alpine
    # ... (mesma config)

  backend:
    build:
      context: ./backend
    volumes:
      - ./backend:/app
    ports:
      - "8000:8000"

  frontend:
    build:
      context: ./frontend
    volumes:
      - ./frontend:/app
      - /app/node_modules
    ports:
      - "3000:3000"

# Subir tudo
docker-compose -f docker-compose.dev.yml up
```

---

## 📦 Estrutura de Arquivos

### pytake-backend/
```
pytake-backend/
├── .github/
│   └── workflows/
│       ├── ci.yml
│       ├── cd-staging.yml
│       └── cd-production.yml
├── alembic/
│   └── versions/
├── app/
│   ├── api/
│   ├── core/
│   ├── models/
│   ├── repositories/
│   ├── schemas/
│   └── services/
├── .env.example
├── .gitignore
├── alembic.ini
├── Dockerfile
├── README.md
└── requirements.txt
```

### pytake-frontend/
```
pytake-frontend/
├── .github/
│   └── workflows/
│       ├── ci.yml
│       ├── cd-staging.yml
│       └── cd-production.yml
├── app/
├── components/
├── lib/
├── public/
├── .env.example
├── .eslintrc.json
├── .gitignore
├── Dockerfile
├── next.config.ts
├── package.json
├── README.md
├── tailwind.config.ts
└── tsconfig.json
```

---

## 🔄 Workflow de Desenvolvimento

### Branch Strategy

**Backend e Frontend seguem o mesmo GitFlow:**

```
main (production)
  ├── release/v1.0.0
  └── develop (staging)
       ├── feature/TICKET-123-add-auth
       ├── feature/TICKET-124-ui-improvements
       └── hotfix/TICKET-125-fix-bug
```

**Regras:**
- `main`: Somente via PR de `develop` ou `hotfix/*`
- `develop`: Merge de `feature/*` após CI passar
- Tags: `v*` em `main` triggam deploy em produção

### Exemplo: Adicionar Nova Feature

**Backend:**
```bash
cd backend
git checkout develop
git pull origin develop
git checkout -b feature/TICKET-456-add-notifications

# Desenvolver...
# Commitar com Conventional Commits
git add .
git commit -m "feat(notifications): add push notification service"
git push origin feature/TICKET-456-add-notifications

# Abrir PR via gh CLI
gh pr create --base develop --title "feat: add push notifications"
```

**Frontend (dependente do backend):**
```bash
cd frontend
git checkout develop
git pull origin develop
git checkout -b feature/TICKET-456-notifications-ui

# Atualizar contrato de API em lib/api.ts
# Desenvolver UI...
git add .
git commit -m "feat(ui): add notifications center component"
git push origin feature/TICKET-456-notifications-ui

gh pr create --base develop --title "feat: notifications UI"
```

---

## 🔐 Sincronização de API

### Versionamento

**API v1 (atual):**
- Base URL: `/api/v1/`
- Contrato: Ver `.github/API_CONTRACT.md`
- Breaking changes: **PROIBIDOS** em v1

**Quando criar v2:**
- Mudanças breaking necessárias
- Manter v1 funcionando por 3+ meses
- Comunicar com 1 mês de antecedência

### Comunicação entre Times

**Mudanças non-breaking (permitidas em v1):**
- Adicionar campos opcionais
- Novos endpoints
- Deprecar endpoints (com período de transição)

**Processo:**
1. Backend adiciona campo opcional `display_name?: string`
2. Atualiza OpenAPI docs
3. Frontend pode usar quando disponível (feature flag)

**Mudanças breaking (requerem v2):**
- Renomear/remover campos obrigatórios
- Mudar tipos de dados
- Alterar regras de validação existentes

---

## 🚀 Deploy & CI/CD

### CI (Continuous Integration)

**Backend (`pytake-backend/.github/workflows/ci.yml`):**
```yaml
name: Backend CI

on:
  pull_request:
    branches: [develop, main]
  push:
    branches: [develop, main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: pip install -r requirements.txt
      - run: pytest
      
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: docker build -t pytake-backend:test .
```

**Frontend (`pytake-frontend/.github/workflows/ci.yml`):**
```yaml
name: Frontend CI

on:
  pull_request:
    branches: [develop, main]
  push:
    branches: [develop, main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build
```

### CD (Continuous Deployment)

**Staging (auto-deploy develop):**
```yaml
# cd-staging.yml
on:
  push:
    branches: [develop]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build & Push to Registry
        run: |
          docker build -t ghcr.io/xkayo32/pytake-backend:staging .
          docker push ghcr.io/xkayo32/pytake-backend:staging
      - name: Deploy to Staging
        run: |
          ssh deploy@staging-server << 'EOF'
            cd /app
            docker-compose pull backend
            docker-compose up -d backend
          EOF
```

**Production (deploy via tags):**
```yaml
# cd-production.yml
on:
  push:
    tags: ['v*']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build & Push
        run: |
          docker build -t ghcr.io/xkayo32/pytake-backend:${{ github.ref_name }} .
          docker push ghcr.io/xkayo32/pytake-backend:${{ github.ref_name }}
      - name: Deploy to Production
        run: |
          ssh deploy@prod-server << 'EOF'
            cd /app
            docker pull ghcr.io/xkayo32/pytake-backend:${{ github.ref_name }}
            docker-compose up -d backend
          EOF
```

---

## 📊 Vantagens vs. Desvantagens

| Aspecto | Monorepo | Multi-repo |
|---------|----------|------------|
| **Setup inicial** | ✅ Simples (1 clone) | ⚠️ Complexo (2+ clones) |
| **CI/CD** | ⚠️ Workflow único | ✅ Pipelines otimizados |
| **Deploy** | ❌ Acoplado | ✅ Independente |
| **Versionamento** | ❌ Versão única | ✅ Semver independente |
| **Team scale** | ❌ Conflitos PRs | ✅ Times paralelos |
| **Rollback** | ❌ Tudo junto | ✅ Cirúrgico |
| **API sync** | ✅ Sempre sync | ⚠️ Requer coordenação |

---

## 🔗 Recursos

- [API Contract](./API_CONTRACT.md) - Contrato de API v1
- [Backend README](https://github.com/xkayo32/pytake-backend) - Setup backend
- [Frontend README](https://github.com/xkayo32/pytake-frontend) - Setup frontend
- [GitFlow Workflow](./.github/GIT_WORKFLOW.md) - Processo de branches

---

## ❓ FAQ

### Como faço para trabalhar em uma feature full-stack?

1. Criar branch no backend primeiro
2. Implementar endpoint e testar (Swagger)
3. Abrir PR no backend
4. Criar branch no frontend
5. Consumir novo endpoint
6. Abrir PR no frontend
7. Mergear backend primeiro, depois frontend

### E se o backend quebrar o contrato de API?

- **Solução imediata**: Revert commit no backend
- **Longo prazo**: Adicionar testes de contrato (Pact, OpenAPI validators)

### Como testar integração localmente?

```bash
# Opção 1: Apontar frontend para backend local
cd frontend
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
npm run dev

# Opção 2: Docker Compose orquestrado (recomendado)
docker-compose -f docker-compose.dev.yml up
```

### Quando fazer deploy em produção?

1. Validar em staging por 24-48h
2. Criar tag `v1.x.x` em `main`
3. CD automático faz deploy
4. Monitorar logs/métricas

---

## 📝 Checklist de Migração

- [ ] Fase 1: Documentação
  - [x] API Contract criado
  - [x] Guia de migração criado
  - [ ] OpenAPI validado
  - [ ] Dependências mapeadas

- [ ] Fase 2: Criar Repos
  - [ ] pytake-backend criado
  - [ ] pytake-frontend criado
  - [ ] CI configurado
  - [ ] Build local validado

- [ ] Fase 3: Staging
  - [ ] CD staging configurado
  - [ ] Auto-deploy testado
  - [ ] Validação manual OK

- [ ] Fase 4: Produção
  - [ ] CD prod configurado
  - [ ] Deploy via tags testado
  - [ ] Monorepo descontinuado
