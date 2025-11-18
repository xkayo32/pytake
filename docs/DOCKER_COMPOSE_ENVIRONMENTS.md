# 🚀 Docker Compose - Ambientes (Prod, Staging, Dev)

## 📋 Resumo Executivo

Agora você tem **3 docker-compose separados**, cada um otimizado para seu ambiente:

| Ambiente | Arquivo | Frontend | Backend | Portas |
|----------|---------|----------|---------|--------|
| **Produção** | `docker-compose.prod.yml` | `npm run build && npm start` | `npm start` | 3000, 8000 |
| **Staging** | `docker-compose.staging.yml` | `npm run build && npm start` | `npm start` | 3001, 8001 |
| **Desenvolvimento** | `docker-compose.yml` ou `docker-compose.dev.yml` | `npm run dev` | `npm start` | 3002, 8002 |

---

## 🎯 Por Que Mudar?

✅ **Produção** deve rodar com `npm run build && npm start` (otimizado, sem hot-reload)  
✅ **Staging** deve rodar com `npm run build && npm start` (espelha produção)  
✅ **Desenvolvimento** roda com `npm run dev` (hot-reload, debug)

---

## 📦 Estrutura de Portas

### Produção
```bash
Frontend:  localhost:3000  → https://app.pytake.net
Backend:   localhost:8000  → https://api.pytake.net
Database:  localhost:5433  → PostgreSQL
Cache:     localhost:6380  → Redis
Logs:      localhost:27017 → MongoDB
```

### Staging
```bash
Frontend:  localhost:3001  → https://app-staging.pytake.net
Backend:   localhost:8001  → https://api-staging.pytake.net
Database:  localhost:5434  → PostgreSQL
Cache:     localhost:6381  → Redis
Logs:      localhost:27018 → MongoDB
```

### Desenvolvimento
```bash
Frontend:  localhost:3002  → https://api-dev.pytake.net
Backend:   localhost:8002  → https://api-dev.pytake.net
Database:  localhost:5435  → PostgreSQL
Cache:     localhost:6382  → Redis
Logs:      localhost:27020 → MongoDB
```

---

## 🎬 Como Usar

### Levantar Produção
```bash
podman-compose -f docker-compose.prod.yml up -d
# ou
docker-compose -f docker-compose.prod.yml up -d
```

### Levantar Staging
```bash
podman-compose -f docker-compose.staging.yml up -d
# ou
docker-compose -f docker-compose.staging.yml up -d
```

### Levantar Desenvolvimento (padrão)
```bash
podman-compose up -d
# ou
podman-compose -f docker-compose.dev.yml up -d
```

### Parar Ambiente
```bash
# Parar tudo
podman-compose -f docker-compose.prod.yml down

# Ver logs
podman-compose -f docker-compose.prod.yml logs -f backend
```

---

## 🔧 Variáveis de Ambiente

Cada ambiente herda do `.env`:

```bash
# Banco de dados (compartilhado entre todos)
POSTGRES_USER=pytake_user
POSTGRES_PASSWORD=Odc7/ffNnTnG4hkbwV+Sx2ZgK61rXW2r9U2o7Rd25DU=
POSTGRES_DB=pytake

# Redis
REDIS_PASSWORD=gOe7JRn+i8iWY5UAvYt3mJxBFJnAf9+jo/VZM3UN4xw=

# MongoDB
MONGO_USER=pytake_user
MONGO_PASSWORD=pytake_mongo_password
```

---

## 🛠️ Problemas Comuns

### "Porta 3000 já está em uso"
```bash
# Verificar qual processo está usando
lsof -i :3000

# Parar containers antigos
podman stop pytake-frontend-prod
podman stop pytake-frontend-staging
podman stop pytake-frontend-dev
```

### "Nginx não está roteando corretamente"
```bash
# Verificar configuração do Nginx
podman exec pytake-nginx-prod nginx -T

# Testar endpoint
curl -k https://api.pytake.net/api/v1/health
```

### "Frontend não conecta ao backend"
Verifique se `NEXT_PUBLIC_API_URL` está correto:
- Prod: `https://api.pytake.net`
- Staging: `https://api-staging.pytake.net`
- Dev: `https://api-dev.pytake.net`

---

## 🎨 Diferenças Principais

### Frontend (Next.js)

**Produção & Staging:**
```yaml
command: sh -c "npm install && npm run build && npm start"
environment:
  NODE_ENV: production
```
- Build otimizado
- Sem hot-reload
- Melhor performance
- Produção pronta

**Desenvolvimento:**
```yaml
command: sh -c "npm install && npm run dev"
environment:
  NODE_ENV: development
  WATCHPACK_POLLING: true
  CHOKIDAR_USEPOLLING: true
```
- Hot-reload ativado
- Compilação rápida
- Debug via devtools
- Desenvolvimento rápido

### Backend (FastAPI)

**Todos os ambientes:**
- Mesmo Dockerfile
- Mesma porta interna (8000)
- Diferentes ports externos (8000, 8001, 8002)
- ENVIRONMENT varia: `production`, `staging`, `development`

---

## 📝 URLs de Teste

### Produção
```bash
curl -k https://app.pytake.net/login
curl -k https://api.pytake.net/api/v1/health
```

### Staging
```bash
curl -k https://app-staging.pytake.net/login
curl -k https://api-staging.pytake.net/api/v1/health
```

### Desenvolvimento
```bash
curl -k https://app-dev.pytake.net/login
curl -k https://api-dev.pytake.net/api/v1/health
```

---

## 🔐 Certificados SSL

Todos os ambientes compartilham o Certbot:
- Certificados em: `./certbot/conf/live/`
- Renovação automática a cada 12h
- Válido para todos os 6 domínios

---

## 📊 Checklist de Implementação

- [x] `docker-compose.prod.yml` criado
- [x] `docker-compose.staging.yml` criado
- [x] `docker-compose.dev.yml` criado
- [x] `docker-compose.yml` atualizado para dev
- [x] Frontend: prod/staging com `npm run build && npm start`
- [x] Frontend: dev com `npm run dev`
- [x] Portas separadas para cada ambiente
- [x] Variáveis de ambiente corretas
- [x] Documentação

---

## 🚀 Próximas Etapas

1. **Testar cada ambiente:**
   ```bash
   podman-compose -f docker-compose.prod.yml up -d
   podman-compose -f docker-compose.staging.yml up -d
   podman-compose -f docker-compose.dev.yml up -d
   ```

2. **Validar endpoints:**
   ```bash
   bash scripts/test-domains-routing.sh
   ```

3. **Fazer commit:**
   ```bash
   git add docker-compose.*.yml docker-compose.yml
   git commit -m "chore: separate docker-compose for prod/staging/dev environments"
   git push origin feature/INFRA-002-flow-automation-system
   ```

---

**Implementado por:** Kayo Carvalho Fernandes  
**Data:** Novembro 18, 2025  
**Versão:** 1.0  
**Status:** ✅ COMPLETO

