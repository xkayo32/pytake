# 🌐 Frontend Routes - Multi-Environment Configuration

## Overview

O frontend PyTake (Next.js) precisa estar configurado com as URLs corretas da API para cada ambiente:
- **Production:** `app.pytake.net`
- **Staging:** `app-staging.pytake.net` (recomendado)
- **Development:** `app-dev.pytake.net` ou `localhost:3000`

> 📖 **Para configuração completa de múltiplos frontends simultaneamente**, veja [MULTI_FRONTEND_SETUP.md](./MULTI_FRONTEND_SETUP.md)

---

## 📋 Frontend URLs por Ambiente

| Ambiente | Frontend URL | Backend API | WebSocket | Porta |
|----------|-------------|------------|-----------|-------|
| **Production** | `https://app.pytake.net` | `https://api.pytake.net` | `wss://api.pytake.net` | 3000 |
| **Staging** | `https://app-staging.pytake.net` | `https://api-staging.pytake.net` | `wss://api-staging.pytake.net` | 3001 |
| **Development** | `http://localhost:3000` | `http://localhost:8000` | `ws://localhost:8000` | 3000 |

---

## 🔧 Configuração Docker Compose

### Production Frontend (porta 3000)

```yaml
# docker-compose.yml
frontend:
  image: node:20-alpine
  container_name: pytake-frontend
  ports:
    - "3000:3000"
  environment:
    NODE_ENV: production
    NEXT_PUBLIC_API_URL: https://api.pytake.net
    NEXT_PUBLIC_WS_URL: wss://api.pytake.net
    NEXT_PUBLIC_APP_URL: https://app.pytake.net
  command: npm run build && npm run start
```

### Staging Frontend (porta 3001)

```yaml
# docker-compose.yml (separado ou mesmo arquivo com override)
frontend-staging:
  image: node:20-alpine
  container_name: pytake-frontend-staging
  ports:
    - "3001:3000"  # Mapear 3000 do container para 3001 do host
  environment:
    NODE_ENV: production
    NEXT_PUBLIC_API_URL: https://staging-api.pytake.net
    NEXT_PUBLIC_WS_URL: wss://staging-api.pytake.net
    NEXT_PUBLIC_APP_URL: https://app-staging.pytake.net
  command: npm run build && npm run start
```

### Development Frontend (porta 3000)

```yaml
# docker-compose.yml (dev mode com hot-reload)
frontend:
  image: node:20-alpine
  container_name: pytake-frontend-dev
  ports:
    - "3000:3000"
  environment:
    NODE_ENV: development
    NEXT_PUBLIC_API_URL: http://localhost:8000
    NEXT_PUBLIC_WS_URL: ws://localhost:8000
    NEXT_PUBLIC_APP_URL: http://localhost:3000
  volumes:
    - ./frontend:/app
    - /app/node_modules
  command: npm install && npm run dev
```

---

## 🌐 Nginx Configuration para Frontend

### Production (app.pytake.net → localhost:3000)

```nginx
server {
    listen 443 ssl http2;
    server_name app.pytake.net;

    ssl_certificate /etc/letsencrypt/live/api.pytake.net/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.pytake.net/privkey.pem;
    
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
    }

    # Next.js static files cache
    location /_next/static {
        proxy_pass http://localhost:3000;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # WebSocket support for Next.js HMR (if dev mode)
    location /_next/webpack-hmr {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### Staging (app-staging.pytake.net → localhost:3001)

```nginx
server {
    listen 443 ssl http2;
    server_name app-staging.pytake.net;

    ssl_certificate /etc/letsencrypt/live/api.pytake.net/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.pytake.net/privkey.pem;
    
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains" always;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
    }

    location /_next/static {
        proxy_pass http://localhost:3001;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location /_next/webpack-hmr {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### Development (localhost:3000)

Não precisa de Nginx, acesso direto:

```bash
# Local development
curl http://localhost:3000
```

---

## 🔐 Environment Variables (Frontend)

### next.config.mjs

```javascript
const nextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  },
  
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    return [
      {
        source: '/api/v1/:path*',
        destination: `${apiUrl}/api/v1/:path*`,
      },
    ]
  },
}
```

### .env.production (Production)

```bash
NEXT_PUBLIC_API_URL=https://api.pytake.net
NEXT_PUBLIC_WS_URL=wss://api.pytake.net
NEXT_PUBLIC_APP_URL=https://app.pytake.net
```

### .env.staging (Staging)

```bash
NEXT_PUBLIC_API_URL=https://staging-api.pytake.net
NEXT_PUBLIC_WS_URL=wss://staging-api.pytake.net
NEXT_PUBLIC_APP_URL=https://app-staging.pytake.net
```

### .env.development (Development)

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 🚀 Como Usar em Docker Compose

### Build para Production

```bash
# Build frontend para production
NEXT_PUBLIC_API_URL=https://api.pytake.net \
NEXT_PUBLIC_WS_URL=wss://api.pytake.net \
docker-compose build frontend

# Iniciar
docker-compose up -d frontend
```

### Build para Staging

```bash
# Build frontend para staging (porta 3001)
NEXT_PUBLIC_API_URL=https://staging-api.pytake.net \
NEXT_PUBLIC_WS_URL=wss://staging-api.pytake.net \
docker-compose up -d frontend-staging
```

### Development (Hot Reload)

```bash
# Development com watch mode
NEXT_PUBLIC_API_URL=http://localhost:8000 \
docker-compose up -d frontend
```

---

## 📝 Exemplo: docker-compose.yml Completo (3 Frontends)

```yaml
version: '3.8'

services:
  # ... backend services (postgres, redis, mongodb, backend)

  # Production Frontend (porta 3000)
  frontend-prod:
    image: node:20-alpine
    container_name: pytake-frontend-prod
    restart: unless-stopped
    working_dir: /app
    ports:
      - "3000:3000"
    volumes:
      - ./frontend:/app
    environment:
      NODE_ENV: production
      NEXT_PUBLIC_API_URL: https://api-dev.pytake.net
      NEXT_PUBLIC_WS_URL: wss://api-dev.pytake.net
      NEXT_PUBLIC_APP_URL: https://app-dev.pytake.net
    command: sh -c "npm install && npm run build && npm run start"
    networks:
      - pytake-network

  # Staging Frontend (porta 3001)
  frontend-staging:
    image: node:20-alpine
    container_name: pytake-frontend-staging
    restart: unless-stopped
    working_dir: /app
    ports:
      - "3001:3000"
    volumes:
      - ./frontend:/app
    environment:
      NODE_ENV: production
      NEXT_PUBLIC_API_URL: https://api-staging.pytake.net
      NEXT_PUBLIC_WS_URL: wss://api-staging.pytake.net
      NEXT_PUBLIC_APP_URL: https://app-staging.pytake.net
    command: sh -c "npm install && npm run build && npm run start"
    networks:
      - pytake-network

  # Development Frontend (porta 3000, hot-reload)
  frontend-dev:
    image: node:20-alpine
    container_name: pytake-frontend-dev
    restart: unless-stopped
    working_dir: /app
    ports:
      - "3002:3000"  # Porta 3002 no host para não conflitar
    volumes:
      - ./frontend:/app
      - /app/node_modules
    environment:
      NODE_ENV: development
      NEXT_PUBLIC_API_URL: http://localhost:8000
      NEXT_PUBLIC_WS_URL: ws://localhost:8000
      NEXT_PUBLIC_APP_URL: http://localhost:3002
    command: sh -c "npm install && npm run dev"
    networks:
      - pytake-network

networks:
  pytake-network:
    driver: bridge
```

---

## 🌍 DNS Setup para Frontend

```bash
# Production
app.pytake.net → seu_servidor_ip

# Staging
app-staging.pytake.net → seu_servidor_ip

# Development (local)
localhost:3000 ou localhost:3002
```

---

## 🔗 Referências de URLs Completas

### Production
```
Frontend:   https://app.pytake.net
API:        https://api.pytake.net
Docs:       https://api.pytake.net/api/v1/docs
WebSocket:  wss://api.pytake.net
```

### Staging
```
Frontend:   https://app-staging.pytake.net
API:        https://staging-api.pytake.net
Docs:       https://staging-api.pytake.net/api/v1/docs
WebSocket:  wss://staging-api.pytake.net
```

### Development
```
Frontend:   http://localhost:3000
API:        http://localhost:8000
Docs:       http://localhost:8000/api/v1/docs
WebSocket:  ws://localhost:8000
```

---

## 🧪 Testando as Rotas

### Frontend Connectivity Test

```bash
# Production
curl -I https://app.pytake.net

# Staging
curl -I https://app-staging.pytake.net

# Development
curl -I http://localhost:3000
```

### API Connectivity from Frontend

```bash
# Dentro do container frontend
curl http://backend:8000/api/v1/health  # Production
curl https://staging-api.pytake.net/api/v1/health  # Staging
```

### WebSocket Connectivity

```bash
# Test WebSocket connection
websocat wss://api.pytake.net/ws
websocat wss://staging-api.pytake.net/ws
websocat ws://localhost:8000/ws
```

---

## 📊 Frontend Routing Map

```
┌────────────────────────────────────────────────────────┐
│                  FRONTEND ROUTING                      │
├────────────────────────────────────────────────────────┤
│                                                        │
│  Production                                           │
│  ├─ https://app.pytake.net                           │
│  ├─ Backend: https://api.pytake.net                  │
│  ├─ WebSocket: wss://api.pytake.net                  │
│  └─ Nginx: localhost:3000                            │
│                                                        │
│  Staging                                              │
│  ├─ https://app-staging.pytake.net                   │
│  ├─ Backend: https://staging-api.pytake.net          │
│  ├─ WebSocket: wss://staging-api.pytake.net          │
│  └─ Nginx: localhost:3001                            │
│                                                        │
│  Development                                          │
│  ├─ http://localhost:3000 (hot-reload)               │
│  ├─ Backend: http://localhost:8000                   │
│  ├─ WebSocket: ws://localhost:8000                   │
│  └─ Next.js Dev: Direct                              │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## ⚠️ Importante

1. **Certificados SSL:** O certificado `/etc/letsencrypt/live/api.pytake.net/` é compartilhado por todos os domínios (wildcard ou SAN)

2. **WebSocket:** Não esquecer de configurar o proxy WebSocket no Nginx com:
   ```nginx
   proxy_set_header Upgrade $http_upgrade;
   proxy_set_header Connection "upgrade";
   ```

3. **CORS:** O backend precisa ter CORS configurado para aceitar requisições do frontend
   ```python
   CORS_ORIGINS=https://app.pytake.net,https://app-staging.pytake.net,http://localhost:3000
   ```

4. **Environment Variables:** Sempre usar `NEXT_PUBLIC_` como prefix para variáveis visíveis no browser

---

**Última atualização:** 2025-11-18  
**Status:** Documentação completa de rotas frontend multi-ambiente  
