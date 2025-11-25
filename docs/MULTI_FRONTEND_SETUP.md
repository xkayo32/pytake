# Multi-Frontend Setup (3 Environments)

## Overview

This guide explains how to run **3 separate frontend instances simultaneously** for production, staging, and development environments. Each frontend listens on a different port and connects to its respective backend API.

## Architecture

```
Production Frontend (port 3000)
  ├─ Domain: app.pytake.net
  ├─ API: api.pytake.net
  └─ Environment: PROD

Staging Frontend (port 3001)
  ├─ Domain: app-staging.pytake.net
  ├─ API: api-staging.pytake.net
  └─ Environment: STAGING

Development Frontend (port 3002)
  ├─ Domain: app-dev.pytake.net (or localhost:3002 locally)
  ├─ API: api-dev.pytake.net
  └─ Environment: DEV
```

## Docker Compose Configuration

### Complete Multi-Frontend docker-compose.yml

Save this as `docker-compose.yml` or reference it in your existing file:

```yaml
version: '3.9'

services:
  # ============================================================================
  # FRONTEND SERVICES (3 instances)
  # ============================================================================

  # Production Frontend (port 3000) → app.pytake.net
  frontend-prod:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        NEXT_PUBLIC_API_URL: https://api.pytake.net
        NEXT_PUBLIC_WS_URL: wss://api.pytake.net
        NEXT_PUBLIC_APP_URL: https://app.pytake.net
    container_name: pytake-frontend-prod
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      NEXT_PUBLIC_API_URL: https://api.pytake.net
      NEXT_PUBLIC_WS_URL: wss://api.pytake.net
      NEXT_PUBLIC_APP_URL: https://app.pytake.net
    restart: unless-stopped
    networks:
      - pytake-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Staging Frontend (port 3001) → app-staging.pytake.net
  frontend-staging:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        NEXT_PUBLIC_API_URL: https://api-staging.pytake.net
        NEXT_PUBLIC_WS_URL: wss://api-staging.pytake.net
        NEXT_PUBLIC_APP_URL: https://app-staging.pytake.net
    container_name: pytake-frontend-staging
    ports:
      - "3001:3000"  # Container port 3000 → Host port 3001
    environment:
      NODE_ENV: production
      NEXT_PUBLIC_API_URL: https://api-staging.pytake.net
      NEXT_PUBLIC_WS_URL: wss://api-staging.pytake.net
      NEXT_PUBLIC_APP_URL: https://app-staging.pytake.net
    restart: unless-stopped
    networks:
      - pytake-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Development Frontend (port 3002) → app-dev.pytake.net
  frontend-dev:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        NEXT_PUBLIC_API_URL: https://api-dev.pytake.net
        NEXT_PUBLIC_WS_URL: wss://api-dev.pytake.net
        NEXT_PUBLIC_APP_URL: https://app-dev.pytake.net
    container_name: pytake-frontend-dev
    ports:
      - "3002:3000"  # Container port 3000 → Host port 3002
    environment:
      NODE_ENV: production
      NEXT_PUBLIC_API_URL: https://api-dev.pytake.net
      NEXT_PUBLIC_WS_URL: wss://api-dev.pytake.net
      NEXT_PUBLIC_APP_URL: https://app-dev.pytake.net
    restart: unless-stopped
    networks:
      - pytake-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3

  # ============================================================================
  # BACKEND SERVICES (3 instances)
  # ============================================================================

  backend-prod:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: pytake-backend-prod
    ports:
      - "8000:8000"
    environment:
      # Load from .env.prod or .env
      ENV: production
      DATABASE_URL: postgresql://user:password@postgres:5432/pytake_prod
      REDIS_URL: redis://redis:6379/0
    restart: unless-stopped
    networks:
      - pytake-network
    depends_on:
      - postgres
      - redis

  backend-staging:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: pytake-backend-staging
    ports:
      - "8001:8000"
    environment:
      ENV: staging
      DATABASE_URL: postgresql://user:password@postgres:5432/pytake_staging
      REDIS_URL: redis://redis:6379/1
    restart: unless-stopped
    networks:
      - pytake-network
    depends_on:
      - postgres
      - redis

  backend-dev:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: pytake-backend-dev
    ports:
      - "8002:8000"
    environment:
      ENV: development
      DATABASE_URL: postgresql://user:password@postgres:5432/pytake_dev
      REDIS_URL: redis://redis:6379/2
    restart: unless-stopped
    networks:
      - pytake-network
    depends_on:
      - postgres
      - redis

  # ============================================================================
  # INFRASTRUCTURE SERVICES
  # ============================================================================

  postgres:
    image: postgres:15-alpine
    container_name: pytake-postgres
    environment:
      POSTGRES_USER: pytake_user
      POSTGRES_PASSWORD: secure_password
      POSTGRES_INITDB_ARGS: "-c shared_preload_libraries=pg_stat_statements"
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - pytake-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U pytake_user"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: pytake-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - pytake-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  nginx:
    image: nginx:alpine
    container_name: pytake-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx-subdomains.conf:/etc/nginx/nginx.conf:ro
      - ./certbot/conf:/etc/letsencrypt:ro
      - ./certbot/www:/var/www/certbot:ro
      - nginx_logs:/var/log/nginx
    networks:
      - pytake-network
    restart: unless-stopped
    depends_on:
      - frontend-prod
      - frontend-staging
      - frontend-dev
      - backend-prod
      - backend-staging
      - backend-dev

networks:
  pytake-network:
    driver: bridge

volumes:
  postgres_data:
  redis_data:
  nginx_logs:
```

## Build Arguments vs Environment Variables

### Build Arguments (Image Build Time)
Used in `docker build` to set static configuration during image creation:

```yaml
build:
  args:
    NEXT_PUBLIC_API_URL: https://api.pytake.net
```

### Environment Variables (Container Runtime)
Set dynamically when the container starts:

```yaml
environment:
  NEXT_PUBLIC_API_URL: https://api.pytake.net
```

**Best Practice:** Use **environment variables** for runtime configuration so the same image can be reused across environments.

## Port Mapping Strategy

Each frontend runs on **container port 3000** (Next.js default) but is exposed on different host ports:

| Environment | Container | Host Port | Domain |
|-------------|-----------|-----------|--------|
| Production | 3000 | 3000 | app.pytake.net |
| Staging | 3000 | 3001 | app-staging.pytake.net |
| Development | 3000 | 3002 | app-dev.pytake.net |

Nginx then reverse proxies based on domain:
- `app.pytake.net` → `localhost:3000`
- `app-staging.pytake.net` → `localhost:3001`
- `app-dev.pytake.net` → `localhost:3002`

## Environment Variable Reference

Each frontend instance gets unique API URLs:

### Production
```env
NEXT_PUBLIC_API_URL=https://api.pytake.net
NEXT_PUBLIC_WS_URL=wss://api.pytake.net
NEXT_PUBLIC_APP_URL=https://app.pytake.net
```

### Staging
```env
NEXT_PUBLIC_API_URL=https://api-staging.pytake.net
NEXT_PUBLIC_WS_URL=wss://api-staging.pytake.net
NEXT_PUBLIC_APP_URL=https://app-staging.pytake.net
```

### Development
```env
NEXT_PUBLIC_API_URL=https://api-dev.pytake.net
NEXT_PUBLIC_WS_URL=wss://api-dev.pytake.net
NEXT_PUBLIC_APP_URL=https://app-dev.pytake.net
```

## Running the Multi-Frontend Setup

### 1. Start All Services
```bash
# Start all 3 frontends + 3 backends + infrastructure
podman compose up -d

# Or with docker-compose
docker-compose up -d
```

### 2. Verify Services Running
```bash
# Check all containers
podman ps

# Check logs for each frontend
podman logs pytake-frontend-prod
podman logs pytake-frontend-staging
podman logs pytake-frontend-dev
```

### 3. Test Health
```bash
# Frontend availability
curl http://localhost:3000   # Production
curl http://localhost:3001   # Staging
curl http://localhost:3002   # Development

# API availability
curl http://localhost:8000   # Production API
curl http://localhost:8001   # Staging API
curl http://localhost:8002   # Development API
```

## Domain-Based Routing (Nginx)

The Nginx configuration automatically routes to the correct frontend based on domain:

**Local Testing:**
```bash
# Add to /etc/hosts for local testing
127.0.0.1 app.pytake.net
127.0.0.1 app-staging.pytake.net
127.0.0.1 app-dev.pytake.net
```

**Then access:**
```
https://app.pytake.net          → localhost:3000
https://app-staging.pytake.net  → localhost:3001
https://app-dev.pytake.net      → localhost:3002
```

## Independent Scaling

If one frontend needs to be stopped or restarted without affecting others:

```bash
# Restart only staging frontend
podman restart pytake-frontend-staging

# Restart only staging backend
podman restart pytake-backend-staging

# Stop production frontend
podman stop pytake-frontend-prod

# Scale specific frontend if using Kubernetes/Swarm (advanced)
```

## Environment-Specific Considerations

### Production Frontend
- Domain: `app.pytake.net`
- Port: 3000
- API: `api.pytake.net`
- SSL: Enabled (production certificate)
- HSTS: Preload enabled
- Cache: Static assets cached 1 year

### Staging Frontend
- Domain: `app-staging.pytake.net`
- Port: 3001
- API: `api-staging.pytake.net`
- SSL: Enabled (shared certificate)
- HSTS: Enabled (no preload)
- Cache: Static assets cached 1 year
- Purpose: Pre-release testing

### Development Frontend
- Domain: `app-dev.pytake.net`
- Port: 3002
- API: `api-dev.pytake.net`
- SSL: Enabled (shared certificate)
- HSTS: Enabled
- Cache: Minimal caching
- Purpose: Feature development & integration testing

## Database Isolation

Each environment uses a separate Redis database:

- **Production**: Redis DB 0
- **Staging**: Redis DB 1
- **Development**: Redis DB 2

Optional: Use separate PostgreSQL databases:
```bash
CREATE DATABASE pytake_prod;
CREATE DATABASE pytake_staging;
CREATE DATABASE pytake_dev;
```

## WebSocket Support

WebSocket connections are proxied through Nginx with proper header configuration:

```nginx
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection 'upgrade';
```

Verified in `nginx/nginx-subdomains.conf` for all 3 frontend server blocks.

## Debugging Multi-Frontend Issues

### Frontend not loading
```bash
# Check container is running
podman ps | grep frontend

# Check logs
podman logs pytake-frontend-prod

# Check environment variables
podman inspect pytake-frontend-prod | grep -A 20 Env
```

### API connection issues
```bash
# Verify backend is responding
curl -i http://localhost:8000/api/v1/health

# Check Nginx routing
curl -i -H "Host: app.pytake.net" http://localhost:3000
```

### Port conflicts
```bash
# Find what's using a port
lsof -i :3000
lsof -i :3001
lsof -i :3002
```

## Next Steps

1. ✅ Update `docker-compose.yml` with 3 frontend services
2. ✅ Verify Nginx configuration includes all 6 domains
3. 🔄 **Configure DNS for all 6 subdomains**
4. 🔄 **Generate SSL certificate for all 6 domains**
5. 🔄 **Start all containers**: `podman compose up -d`
6. 🔄 **Run deployment tests**
7. 🔄 **Configure GitHub Actions secrets**

## Related Documentation

- [FRONTEND_ROUTES.md](./FRONTEND_ROUTES.md) - Frontend routing architecture
- [SETUP_CHECKLIST.md](../SETUP_CHECKLIST.md) - Complete setup guide
- [DEPLOYMENT_MULTI_ENVIRONMENT.md](./DEPLOYMENT_MULTI_ENVIRONMENT.md) - Backend deployment
- [nginx/nginx-subdomains.conf](../nginx/nginx-subdomains.conf) - Nginx configuration
