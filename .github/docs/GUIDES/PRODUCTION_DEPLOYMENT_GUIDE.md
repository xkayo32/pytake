# 🚀 CI/CD & Production Deployment Guide

**Data:** 18 de Novembro de 2025  
**Status:** ✅ Pronto para Produção  
**Implementado por:** Kayo Carvalho Fernandes

---

## 📋 Índice

1. [CI/CD Current State](#ci-cd-current-state)
2. [Adjustments Needed](#adjustments-needed)
3. [Production Deployment](#production-deployment)
4. [Repository Replication](#repository-replication)

---

## 🔄 CI/CD Current State

### Workflows Existentes

```
✅ build.yml                    → Build e lint
✅ test.yml                     → Testes unitários
✅ deploy.yml                   → Deploy genérico
✅ deploy-production.yml        → Deploy em produção (main branch)
✅ deploy-staging.yml           → Deploy em staging
✅ test-domain-routing.yml      → Testes de roteamento
✅ release.yml                  → Gerenciamento de releases
```

### Triggers Atuais

| Workflow | Trigger | Branch |
|----------|---------|--------|
| deploy-production.yml | Push + workflow_dispatch | `main` e tags `v*.*.*` |
| deploy-staging.yml | Push + workflow_dispatch | `develop` |
| test.yml | Todos os PRs e pushes | `develop`, `main`, `feature/*` |

---

## ⚙️ Adjustments Needed in CI/CD

### 1️⃣ **Simplify for Dev-Only Environment**

Como mudamos para **dev-only** localmente, o CI/CD ainda referencia prod/staging. Duas abordagens:

#### **Opção A: Manter CI/CD Multi-Ambiente (Recomendado)**
```
✅ PRs em develop → test.yml
✅ Merge em develop → deploy-staging.yml (seu servidor staging)
✅ Merge em main → deploy-production.yml (seu servidor prod)
```

**Vantagem:** Pode manter prod/staging em outro servidor  
**Desvantagem:** Mais complexo agora

#### **Opção B: Simplificar para Dev-Only**
```
✅ Qualquer PR/push → test.yml
❌ Remove deploy-staging.yml
❌ Remove deploy-production.yml
```

**Vantagem:** Simples, rápido  
**Desvantagem:** Sem pipeline de produção automático

### 2️⃣ **Suggested CI/CD Adjustments**

Se manter multi-ambiente, atualize:

**`.github/workflows/deploy-production.yml`:**
```yaml
name: 🌍 Deploy to Production

on:
  push:
    branches:
      - main
  workflow_dispatch:
    inputs:
      server:
        description: 'Target Server'
        required: true
        type: choice
        options:
          - production
          - staging
```

**`.github/workflows/build.yml`:**
```yaml
name: Build & Test

on:
  push:
    branches:
      - develop
      - main
      - 'feature/**'
  pull_request:
    branches:
      - develop
      - main
```

---

## 🌍 Production Deployment

### ✅ Sim, Funcionaria! Mas com Cuidados

Se você replicar o repositório em **outro servidor** e rodar em produção, funcionaria com ajustes:

### 📦 Requirements para Produção

```
✅ Docker/Podman
✅ Docker Compose
✅ .env configurado com secrets
✅ SSL/TLS (Certbot ou similar)
✅ Nginx reverso proxy
✅ Firewall configurado
✅ Backup strategy
```

### 🔧 Passos para Production em Novo Servidor

#### **1. Clone o Repositório**
```bash
git clone https://github.com/xkayo32/pytake.git
cd pytake
git checkout main  # ou develop, conforme política
```

#### **2. Configure Environment**
```bash
cp .env.example .env
# Edite .env com valores de produção:
# - POSTGRES_PASSWORD (seguro!)
# - JWT_SECRET
# - WHATSAPP_API_TOKEN
# - REDIS_PASSWORD
# - SECRET_KEY
```

#### **3. Prepare docker-compose.yml para Produção**

O arquivo atual (`docker-compose.yml`) é **DEV ONLY**.

Para produção, use `docker-compose.prod.yml`:

```bash
# Se ainda existir (caso contrário, criar)
podman compose -f docker-compose.prod.yml up -d
```

Ou configure um novo `docker-compose.yml` para produção:

```yaml
version: "3.9"
name: pytake-production

services:
  # Postgres com volume persistente
  postgres:
    image: postgres:15-alpine
    container_name: pytake-postgres-prod
    restart: always
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init-db.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - pytake-network

  # Redis
  redis:
    image: redis:7-alpine
    container_name: pytake-redis-prod
    restart: always
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    networks:
      - pytake-network

  # Backend FastAPI
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: pytake-backend-prod
    restart: always
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      REDIS_URL: redis://default:${REDIS_PASSWORD}@redis:6379
      NODE_ENV: production
      SECRET_KEY: ${SECRET_KEY}
      JWT_SECRET_KEY: ${JWT_SECRET_KEY}
    ports:
      - "8000:8000"
    depends_on:
      - postgres
      - redis
    networks:
      - pytake-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/v1/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Frontend Next.js
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        NODE_ENV: production
    container_name: pytake-frontend-prod
    restart: always
    environment:
      NODE_ENV: production
      NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL}
    ports:
      - "3000:3000"
    depends_on:
      - backend
    networks:
      - pytake-network

  # Nginx Reverso Proxy
  nginx:
    image: nginx:alpine
    container_name: pytake-nginx-prod
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certbot/conf:/etc/letsencrypt:ro
      - ./certbot/www:/var/www/certbot:ro
    depends_on:
      - backend
      - frontend
    networks:
      - pytake-network

volumes:
  postgres_data:
  redis_data:

networks:
  pytake-network:
    driver: bridge
```

#### **4. Initialize Database**
```bash
podman exec pytake-backend-prod alembic upgrade head
```

#### **5. Setup SSL (Certbot)**
```bash
podman run -it --rm \
  -v /home/ubuntu/pytake/certbot/conf:/etc/letsencrypt \
  -v /home/ubuntu/pytake/certbot/www:/var/www/certbot \
  certbot/certbot certonly --webroot \
  -w /var/www/certbot \
  -d seu-dominio.com \
  -d api.seu-dominio.com
```

#### **6. Configure Firewall**
```bash
# UFW (Ubuntu)
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

#### **7. Start Production**
```bash
podman compose -f docker-compose.prod.yml up -d
podman compose -f docker-compose.prod.yml logs -f
```

---

## 🔄 Repository Replication Checklist

### ✅ Antes de Replicar

- [ ] Clone do repositório finalizado
- [ ] `.env` configurado com secrets **diferentes** por servidor
- [ ] Docker/Podman instalado
- [ ] Domínios apontando para o novo servidor
- [ ] Certificados SSL preparados (ou criar com Certbot)
- [ ] Backups strategy definida
- [ ] Monitoramento setup (logs, alertas)

### 📋 Checklist de Deployment

**Servidor A (Dev/Staging):**
```bash
git checkout develop
docker compose up -d

# Verificar
curl http://localhost:8002/api/v1/health
curl http://localhost:3002
```

**Servidor B (Production):**
```bash
git clone https://github.com/xkayo32/pytake.git
cd pytake
git checkout main

# Setup
cp .env.example .env
# EDITAR .env com valores seguros

# Deploy
docker compose -f docker-compose.prod.yml up -d

# Verificar
curl http://sua-api.com/api/v1/health
curl http://seu-app.com
```

---

## 🔐 Security Considerations for Production

### 1. **Secrets Management**

❌ **NUNCA** commit `.env` com valores reais  
✅ **USE** GitHub Secrets para CI/CD:

```bash
# Via gh CLI
gh secret set DATABASE_URL -b "postgresql://user:pass@host:5432/db"
gh secret set JWT_SECRET -b "seu-secret-seguro"
gh secret set REDIS_PASSWORD -b "sua-senha-redis"
```

### 2. **Environment Separation**

```
.env (ignorado)              ← Valores locais de dev
.env.example                 ← Template de variáveis
.env.production              ← Valores de produção (NÃO COMMIT)
GitHub Secrets               ← Para CI/CD
Docker env_file              ← Em produção via arquivo
```

### 3. **Database Backups**

```bash
# Backup diário
0 2 * * * docker exec pytake-postgres-prod pg_dump -U ${POSTGRES_USER} ${POSTGRES_DB} > /backups/db_$(date +\%Y\%m\%d).sql

# Restore
docker exec -i pytake-postgres-prod psql -U ${POSTGRES_USER} ${POSTGRES_DB} < /backups/db_20251118.sql
```

### 4. **Monitoring & Logging**

```yaml
# docker-compose.prod.yml
services:
  # ... outros serviços
  
  # Logs centralizados (opcional)
  # - ELK Stack
  # - Prometheus + Grafana
  # - Datadog
```

---

## 📝 CI/CD Recommendation Summary

### 🎯 Minha Sugestão:

**Mantenha o setup multi-ambiente** (dev local, staging + prod remoto):

1. **Localmente:** Use `docker-compose.yml` (dev-only) ✅
2. **CI/CD:** Mantenha workflows para prod/staging
3. **Outro servidor:** Clone + `docker-compose.prod.yml`

```
GitHub (main/develop)
    ↓
GitHub Actions (CI/CD)
    ↓
Docker Registry (ghcr.io)
    ↓
Servidor Produção (pull + run)
```

### 📊 Commands Cheat Sheet

```bash
# LOCAL DEV
podman compose up -d
podman compose down

# PRODUCTION
podman compose -f docker-compose.prod.yml up -d
podman compose -f docker-compose.prod.yml logs -f backend

# Backups
podman exec pytake-postgres-prod pg_dump -U pytake_user pytake > backup.sql

# Health Check
curl http://localhost:8002/api/v1/health
```

---

## 🚀 Próximos Passos

1. **Decidir:** Multi-env (recomendado) vs. Dev-only
2. **Atualizar CI/CD:** Se necessário
3. **Preparar servidor produção:** DNS + SSL + .env
4. **Testar deploy:** Staging → Produção
5. **Monitoramento:** Setup alerts e logs

---

**Implementado por:** Kayo Carvalho Fernandes  
**Data:** 18 de Novembro de 2025  
**Versão:** 1.0-prod-ready
