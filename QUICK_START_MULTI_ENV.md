# 🎬 QUICK START - Multi-Environment PyTake

**Status:** ✅ Production Ready

---

## 🚀 Iniciar Todos os 3 Ambientes

```bash
# From repository root
bash ./startup-all.sh
```

Isso vai:
- ✅ Iniciar pytake-prod (6 containers)
- ✅ Iniciar pytake-staging (5 containers)
- ✅ Iniciar pytake-dev (5 containers)
- ✅ Conectar todos à rede Nginx
- ✅ Executar health checks

**Tempo:** ~2 minutos

---

## 🛑 Parar Todos os Ambientes

```bash
bash ./shutdown-all.sh
```

---

## 📡 Acessar Ambientes

| Ambiente | API | Frontend | Notes |
|----------|-----|----------|-------|
| **Prod** | https://api.pytake.net | https://app.pytake.net | Production |
| **Staging** | https://api-staging.pytake.net | https://app-staging.pytake.net | Pre-production |
| **Dev** | https://api-dev.pytake.net | https://app-dev.pytake.net | Local development |

---

## 🧪 Testar Endpoints

```bash
# Test all APIs
curl -k https://api.pytake.net/api/v1/health
curl -k https://api-staging.pytake.net/api/v1/health
curl -k https://api-dev.pytake.net/api/v1/health

# Expected response
{"status":"ok"}
```

---

## 🔍 Monitorar Status

```bash
# See all containers
podman ps --filter "name=pytake" -a

# See specific environment
podman ps --filter "label=com.docker.compose.project=pytake-prod" -a
podman ps --filter "label=com.docker.compose.project=pytake-staging" -a
podman ps --filter "label=com.docker.compose.project=pytake-dev" -a

# See logs
podman logs pytake-nginx -f          # Nginx
podman logs pytake-backend-prod -f   # Backend prod
podman logs pytake-frontend-prod -f  # Frontend prod
```

---

## 🔧 Configuração

### Environment Variables

**Production:**
- `NEXT_PUBLIC_API_URL=https://api.pytake.net`
- `NODE_ENV=production`

**Staging:**
- `NEXT_PUBLIC_API_URL=https://api-staging.pytake.net`
- `NODE_ENV=production`

**Dev:**
- `NEXT_PUBLIC_API_URL=https://api-dev.pytake.net`
- `NODE_ENV=development`

### Database Ports

| Environment | Postgres | Redis | MongoDB |
|------------|----------|-------|---------|
| Production | 5433 | 6380 | 27017 |
| Staging | 5434 | 6381 | 27018 |
| Dev | 5435 | 6382 | 27020 |

---

## 🐛 Troubleshooting

### Nginx Returns 502 Bad Gateway

```bash
# 1. Check if backend is running
podman ps | grep backend

# 2. Check nginx logs
podman logs pytake-nginx | grep error

# 3. Check if containers are connected to same network
podman inspect pytake-nginx --format='{{.NetworkSettings.Networks}}'
podman inspect pytake-backend-staging --format='{{.NetworkSettings.Networks}}'

# 4. Reconnect if needed
podman network connect pytake-prod_pytake-network pytake-backend-staging
```

### Frontend Shows 502

```bash
# Check if frontend is running
podman ps | grep frontend

# Check logs
podman logs pytake-frontend-prod

# If still building, wait 2-5 minutes for Next.js build to complete
```

### Containers Not Starting

```bash
# Clean everything
podman system prune -af

# Restart startup script
bash ./startup-all.sh
```

---

## 📊 Architecture

```
┌──────────────────────────────────────────┐
│     NGINX Reverse Proxy (ports 80/443)   │
│         (Single shared instance)         │
└────────────┬─────────────────────────────┘
             │
   ┌─────────┼─────────┐
   │         │         │
   ▼         ▼         ▼
[PROD]   [STAGING]   [DEV]
 ▼         ▼         ▼
API       API       API  ← Backend services
FE        FE        FE   ← Frontend services
DB        DB        DB   ← Isolated databases
```

---

## 🚨 Important Notes

- ⚠️ Each environment has **isolated databases** (different ports)
- ⚠️ Single **shared Nginx** reverse proxy for all 3
- ⚠️ Staging/Dev containers **connected to prod network** (for DNS resolution)
- ✅ All **SSL certificates** auto-managed by Certbot
- ✅ All **APIs fully functional** (100% health)

---

## 📚 More Info

- `NGINX_ROUTING_COMPLETE.md` - Detailed nginx configuration
- `NGINX_FINAL_STATUS.md` - Final validation report
- `docker-compose.prod.yml` - Production stack
- `docker-compose.staging.yml` - Staging stack
- `docker-compose.dev.yml` - Development stack
- `nginx.conf` - Nginx configuration

---

**Version:** v1.0  
**Last Updated:** 18/11/2025  
**Author:** Kayo Carvalho Fernandes
