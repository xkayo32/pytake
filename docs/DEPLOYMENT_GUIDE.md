# 🚀 Guia de Deployment - PyTake

Estrutura e procedimentos para fazer deploy em production, staging e development.

## 📁 Estrutura de Diretórios

```
/home/administrator/pytake/
├── environments/
│   ├── production/
│   │   ├── docker-compose.yml
│   │   ├── .env-example
│   │   ├── .env.production (não commitar)
│   │   └── data/
│   │       ├── postgres/
│   │       └── redis/
│   ├── staging/
│   │   ├── docker-compose.yml
│   │   ├── .env-example
│   │   ├── .env.staging (não commitar)
│   │   └── data/
│   │       ├── postgres/
│   │       └── redis/
│   └── development/
│       ├── docker-compose.yml
│       ├── .env-example
│       ├── .env.development (não commitar)
│       └── data/
│           ├── postgres/
│           └── redis/
├── nginx/
│   ├── nginx.conf
│   ├── conf.d/
│   └── ssl/
└── docs/
    └── DEPLOYMENT_GUIDE.md
```

## 🔧 Setup Inicial

### 1. Clonar Repo e Preparar Estrutura

```bash
cd /home/administrator/pytake

# Estrutura já criada em environments/
ls -la environments/
```

### 2. Preparar Imagens Docker

```bash
# Build backend
cd /home/administrator/pytake/backend
podman build -t pytake_backend:latest .

# Build frontend
cd /home/administrator/pytake/frontend
podman build -t pytake_frontend:latest .
```

### 3. Configurar Variáveis de Ambiente

Para cada ambiente, copiar `.env-example` e preenchê-lo:

```bash
# Production
cp environments/production/.env-example environments/production/.env.production
# Editar com valores de prod (secrets do GitHub)

# Staging
cp environments/staging/.env-example environments/staging/.env.staging
# Editar com valores de staging

# Development
cp environments/development/.env-example environments/development/.env.development
# Editar com valores locais
```

**IMPORTANTE:** Adicione `.env.*` no `.gitignore`:
```bash
echo "environments/*/.env.*" >> .gitignore
```

## 🚀 Iniciar Ambientes

### Production

```bash
cd /home/administrator/pytake/environments/production

# Carregar variáveis de .env.production
export $(cat .env.production | grep -v '#' | xargs)

# Subir containers
podman-compose -f docker-compose.yml up -d

# Verificar status
podman-compose -f docker-compose.yml ps

# Logs
podman-compose -f docker-compose.yml logs -f backend
```

### Staging

```bash
cd /home/administrator/pytake/environments/staging

# Carregar variáveis
export $(cat .env.staging | grep -v '#' | xargs)

# Subir
podman-compose -f docker-compose.yml up -d

# Verificar
podman-compose -f docker-compose.yml ps
```

### Development

```bash
cd /home/administrator/pytake/environments/development

# Carregar variáveis
export $(cat .env.development | grep -v '#' | xargs)

# Subir
podman-compose -f docker-compose.yml up -d

# Verificar
podman-compose -f docker-compose.yml ps
```

## 🔍 Verificar Saúde dos Ambientes

```bash
# Production
curl -s http://localhost:8000/api/v1/docs | grep -q "swagger" && echo "✅ Production Backend OK" || echo "❌ Production Backend Down"

# Staging
curl -s http://localhost:8001/api/v1/docs | grep -q "swagger" && echo "✅ Staging Backend OK" || echo "❌ Staging Backend Down"

# Development
curl -s http://localhost:8002/api/v1/docs | grep -q "swagger" && echo "✅ Development Backend OK" || echo "❌ Development Backend Down"
```

## 🔄 Migrations

Execute migrations em cada ambiente:

```bash
# Production
podman exec pytake-backend-prod alembic upgrade head

# Staging
podman exec pytake-backend-staging alembic upgrade head

# Development
podman exec pytake-backend-dev alembic upgrade head
```

## 🧹 Parar Ambientes

```bash
# Production
cd /home/administrator/pytake/environments/production && podman-compose down

# Staging
cd /home/administrator/pytake/environments/staging && podman-compose down

# Development
cd /home/administrator/pytake/environments/development && podman-compose down

# Parar todos
for env in production staging development; do
  echo "Parando $env..."
  cd /home/administrator/pytake/environments/$env && podman-compose down
done
```

## 🗑️ Limpar Volumes (Cuidado!)

```bash
# Remover TODOS os volumes (CUIDADO: perderá dados)
podman volume prune -f

# Remover volume específico
podman volume rm pytake-postgres-prod
```

## 📊 Monitoramento

### Ver todos os containers PyTake

```bash
podman ps --filter "name=pytake"
```

### Ver logs em tempo real

```bash
# Production backend
podman logs -f pytake-backend-prod

# Staging backend
podman logs -f pytake-backend-staging

# Development frontend
podman logs -f pytake-frontend-dev
```

### Executar commands dentro de container

```bash
# Production backend bash
podman exec -it pytake-backend-prod bash

# Staging database psql
podman exec -it pytake-postgres-staging psql -U pytake -d pytake_staging

# Development redis cli
podman exec -it pytake-redis-dev redis-cli
```

## 🌐 Nginx Configuration

Copiar `nginx.conf` para local do sistema:

```bash
# Verificar sintaxe
nginx -t -c /home/administrator/pytake/nginx/nginx.conf

# Reload (se já rodando)
nginx -s reload -c /home/administrator/pytake/nginx/nginx.conf

# Ou usando systemd (se nginx como serviço)
sudo systemctl reload nginx
```

## 🔐 GitHub Secrets Setup

Após fazer deploy, configure secrets no GitHub para CI/CD:

```bash
# Repository Secrets (globais para todos envs)
gh secret set SECRET_KEY -b "$(python3 -c 'import secrets; print(secrets.token_urlsafe(32))')"
gh secret set JWT_SECRET_KEY -b "$(python3 -c 'import secrets; print(secrets.token_urlsafe(32))')"
gh secret set ENCRYPTION_KEY -b "$(python3 -c 'import secrets; print(secrets.token_urlsafe(32))')"

# Environment Secrets (production)
gh secret set POSTGRES_PASSWORD -b "your-prod-password" --env production
gh secret set REDIS_PASSWORD -b "your-prod-redis-password" --env production
gh secret set DEBUG -b "false" --env production

# Environment Secrets (staging)
gh secret set POSTGRES_PASSWORD -b "your-staging-password" --env staging
gh secret set REDIS_PASSWORD -b "your-staging-redis-password" --env staging
gh secret set DEBUG -b "true" --env staging

# Environment Secrets (development)
gh secret set POSTGRES_PASSWORD -b "dev-password" --env development
gh secret set REDIS_PASSWORD -b "dev-redis-password" --env development
gh secret set DEBUG -b "true" --env development
```

## 📈 Escalabilidade Futura

Quando precisar separar ambientes em servidores diferentes:

1. Move `/home/administrator/pytake/environments/production` para novo servidor
2. Muda em `docker-compose.yml`:
   ```yaml
   POSTGRES_SERVER: postgres-prod → 10.0.0.1  # IP novo servidor
   REDIS_HOST: redis-prod → 10.0.0.1  # IP novo servidor
   ```
3. Resto do código continua igual ✅

## 🆘 Troubleshooting

### "Connection refused" em POSTGRES_SERVER

Verificar se container está rodando:
```bash
podman ps | grep postgres
```

### Redis authentication failed

Verificar se REDIS_PASSWORD está correto em .env:
```bash
podman logs pytake-redis-prod | grep "password"
```

### Migrations falhando

Verificar banco está vivo:
```bash
podman exec pytake-postgres-prod pg_isready -U pytake
```

### Frontend não conecta no backend

Verificar NEXT_PUBLIC_API_URL no .env do frontend:
```bash
podman logs pytake-frontend-prod | grep "api"
```

---

**Última atualização:** 18/11/2025
