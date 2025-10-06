# 🚀 Guia de Deploy - PyTake

## 📋 Índice
- [Pré-requisitos](#pré-requisitos)
- [Deploy em Produção](#deploy-em-produção)
- [Docker Deploy](#docker-deploy)
- [CI/CD com GitHub Actions](#cicd-com-github-actions)
- [Monitoramento](#monitoramento)
- [Backup e Recuperação](#backup-e-recuperação)

---

## 🔧 Pré-requisitos

### Infraestrutura Necessária

**Servidores:**
- **App Server**: 2 vCPU, 4GB RAM (mínimo)
- **Database Server**: 2 vCPU, 4GB RAM, SSD
- **Cache/Queue**: 1 vCPU, 2GB RAM

**Serviços Externos:**
- PostgreSQL 15+ (RDS, Cloud SQL, ou managed)
- Redis 7+ (ElastiCache, Redis Cloud)
- MongoDB 7+ (Atlas ou managed)
- S3 ou equivalente (mídia files)

**Domínios:**
- `app.seudominio.com` - Frontend
- `api.seudominio.com` - Backend API
- `cdn.seudominio.com` - CDN (opcional)

**Certificados SSL:**
- Let's Encrypt (gratuito) ou certificado válido

---

## 🌐 Deploy em Produção

### Opção 1: VPS (DigitalOcean, AWS EC2, etc)

#### 1. Preparar Servidor

```bash
# Conectar ao servidor
ssh root@seu-servidor.com

# Atualizar sistema
apt update && apt upgrade -y

# Instalar dependências
apt install -y python3.11 python3-pip python3-venv \
  nginx postgresql-client redis-tools git curl

# Instalar Docker & Docker Compose
curl -fsSL https://get.docker.com | sh
apt install -y docker-compose

# Criar usuário deploy
adduser deploy
usermod -aG sudo deploy
usermod -aG docker deploy

# Trocar para usuário deploy
su - deploy
```

#### 2. Clonar Projeto

```bash
cd /home/deploy
git clone https://github.com/your-org/pytake.git
cd pytake
```

#### 3. Configurar Variáveis de Ambiente

```bash
# Backend
cp backend/.env.example backend/.env
nano backend/.env
```

**backend/.env:**
```env
# App
ENVIRONMENT=production
SECRET_KEY=gerar_chave_segura_aqui
DEBUG=False
ALLOWED_HOSTS=api.seudominio.com

# Database
DATABASE_URL=postgresql://user:pass@db-host:5432/pytake_prod
REDIS_URL=redis://redis-host:6379/0
MONGODB_URL=mongodb://mongo-host:27017/pytake_prod

# WhatsApp API
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
WHATSAPP_VERIFY_TOKEN=seu_token_verify

# Storage
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_S3_BUCKET=pytake-media
AWS_REGION=us-east-1

# Email
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your_sendgrid_api_key

# Sentry (error tracking)
SENTRY_DSN=https://xxx@sentry.io/xxx
```

```bash
# Frontend
cp frontend/.env.example frontend/.env.production
nano frontend/.env.production
```

**frontend/.env.production:**
```env
NEXT_PUBLIC_API_URL=https://api.seudominio.com/v1
NEXT_PUBLIC_WS_URL=wss://api.seudominio.com/ws
NEXT_PUBLIC_ENVIRONMENT=production
```

#### 4. Build Aplicações

**Backend:**
```bash
cd backend

# Criar virtualenv
python3 -m venv venv
source venv/bin/activate

# Instalar dependências
pip install -r requirements.txt

# Rodar migrations
alembic upgrade head

# Coletar static files (se houver)
python scripts/collect_static.py

# Criar superuser
python scripts/create_superuser.py
```

**Frontend:**
```bash
cd ../frontend

# Instalar dependências
npm install -g pnpm
pnpm install

# Build
pnpm build
```

#### 5. Configurar Nginx

```bash
sudo nano /etc/nginx/sites-available/pytake
```

```nginx
# Backend API
upstream backend {
    server 127.0.0.1:8000;
}

# Frontend Next.js
upstream frontend {
    server 127.0.0.1:3000;
}

# API Server
server {
    listen 80;
    server_name api.seudominio.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.seudominio.com;

    ssl_certificate /etc/letsencrypt/live/api.seudominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.seudominio.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Logs
    access_log /var/log/nginx/api_access.log;
    error_log /var/log/nginx/api_error.log;

    # Max body size (para uploads)
    client_max_body_size 100M;

    # Proxy para backend
    location / {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}

# Frontend Server
server {
    listen 80;
    server_name app.seudominio.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name app.seudominio.com;

    ssl_certificate /etc/letsencrypt/live/app.seudominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.seudominio.com/privkey.pem;

    access_log /var/log/nginx/frontend_access.log;
    error_log /var/log/nginx/frontend_error.log;

    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Ativar site
sudo ln -s /etc/nginx/sites-available/pytake /etc/nginx/sites-enabled/

# Testar configuração
sudo nginx -t

# Recarregar nginx
sudo systemctl reload nginx
```

#### 6. Configurar SSL (Let's Encrypt)

```bash
# Instalar certbot
sudo apt install -y certbot python3-certbot-nginx

# Gerar certificados
sudo certbot --nginx -d api.seudominio.com
sudo certbot --nginx -d app.seudominio.com

# Auto-renewal (já configurado automaticamente)
sudo certbot renew --dry-run
```

#### 7. Configurar Systemd Services

**Backend (Gunicorn/Uvicorn):**
```bash
sudo nano /etc/systemd/system/pytake-backend.service
```

```ini
[Unit]
Description=PyTake Backend API
After=network.target

[Service]
Type=notify
User=deploy
Group=deploy
WorkingDirectory=/home/deploy/pytake/backend
Environment="PATH=/home/deploy/pytake/backend/venv/bin"
ExecStart=/home/deploy/pytake/backend/venv/bin/gunicorn app.main:app \
    --workers 4 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 127.0.0.1:8000 \
    --access-logfile /var/log/pytake/backend-access.log \
    --error-logfile /var/log/pytake/backend-error.log
Restart=always

[Install]
WantedBy=multi-user.target
```

**Frontend (Next.js):**
```bash
sudo nano /etc/systemd/system/pytake-frontend.service
```

```ini
[Unit]
Description=PyTake Frontend
After=network.target

[Service]
Type=simple
User=deploy
Group=deploy
WorkingDirectory=/home/deploy/pytake/frontend
Environment="NODE_ENV=production"
Environment="PORT=3000"
ExecStart=/usr/bin/pnpm start
Restart=always

[Install]
WantedBy=multi-user.target
```

**Celery Worker:**
```bash
sudo nano /etc/systemd/system/pytake-celery.service
```

```ini
[Unit]
Description=PyTake Celery Worker
After=network.target redis.service

[Service]
Type=forking
User=deploy
Group=deploy
WorkingDirectory=/home/deploy/pytake/backend
Environment="PATH=/home/deploy/pytake/backend/venv/bin"
ExecStart=/home/deploy/pytake/backend/venv/bin/celery -A app.tasks.celery_app worker \
    --loglevel=info \
    --pidfile=/var/run/celery/worker.pid \
    --logfile=/var/log/pytake/celery-worker.log
Restart=always

[Install]
WantedBy=multi-user.target
```

**Celery Beat:**
```bash
sudo nano /etc/systemd/system/pytake-celery-beat.service
```

```ini
[Unit]
Description=PyTake Celery Beat
After=network.target redis.service

[Service]
Type=simple
User=deploy
Group=deploy
WorkingDirectory=/home/deploy/pytake/backend
Environment="PATH=/home/deploy/pytake/backend/venv/bin"
ExecStart=/home/deploy/pytake/backend/venv/bin/celery -A app.tasks.celery_app beat \
    --loglevel=info \
    --logfile=/var/log/pytake/celery-beat.log
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
# Criar diretórios de log
sudo mkdir -p /var/log/pytake
sudo mkdir -p /var/run/celery
sudo chown deploy:deploy /var/log/pytake /var/run/celery

# Habilitar e iniciar serviços
sudo systemctl daemon-reload
sudo systemctl enable pytake-backend pytake-frontend pytake-celery pytake-celery-beat
sudo systemctl start pytake-backend pytake-frontend pytake-celery pytake-celery-beat

# Verificar status
sudo systemctl status pytake-backend
sudo systemctl status pytake-frontend
sudo systemctl status pytake-celery
```

---

## 🐳 Docker Deploy

### docker-compose.prod.yml

```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    restart: always
    env_file:
      - ./backend/.env
    depends_on:
      - db
      - redis
      - mongo
    ports:
      - "8000:8000"
    volumes:
      - ./backend:/app
    command: gunicorn app.main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
    restart: always
    env_file:
      - ./frontend/.env.production
    ports:
      - "3000:3000"
    depends_on:
      - backend

  celery:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    restart: always
    env_file:
      - ./backend/.env
    depends_on:
      - redis
      - db
    command: celery -A app.tasks.celery_app worker --loglevel=info

  celery-beat:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    restart: always
    env_file:
      - ./backend/.env
    depends_on:
      - redis
      - db
    command: celery -A app.tasks.celery_app beat --loglevel=info

  db:
    image: postgres:15-alpine
    restart: always
    environment:
      POSTGRES_DB: pytake_prod
      POSTGRES_USER: pytake
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    restart: always
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"

  mongo:
    image: mongo:7
    restart: always
    environment:
      MONGO_INITDB_ROOT_USERNAME: pytake
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
    volumes:
      - mongo_data:/data/db
    ports:
      - "27017:27017"

  nginx:
    image: nginx:alpine
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
      - /etc/letsencrypt:/etc/letsencrypt
    depends_on:
      - backend
      - frontend

volumes:
  postgres_data:
  redis_data:
  mongo_data:
```

### Dockerfile.prod (Backend)

```dockerfile
# backend/Dockerfile.prod
FROM python:3.11-slim

WORKDIR /app

# Instalar dependências do sistema
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements
COPY requirements.txt .

# Instalar dependências Python
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código
COPY . .

# Criar usuário não-root
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

CMD ["gunicorn", "app.main:app", "--workers", "4", "--worker-class", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000"]
```

### Dockerfile.prod (Frontend)

```dockerfile
# frontend/Dockerfile.prod
FROM node:18-alpine AS builder

WORKDIR /app

# Copiar package files
COPY package.json pnpm-lock.yaml ./

# Instalar pnpm
RUN npm install -g pnpm

# Instalar dependências
RUN pnpm install --frozen-lockfile

# Copiar código
COPY . .

# Build
RUN pnpm build

# Production image
FROM node:18-alpine

WORKDIR /app

RUN npm install -g pnpm

# Copiar build
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

CMD ["pnpm", "start"]
```

### Deploy com Docker

```bash
# Build e deploy
docker-compose -f docker-compose.prod.yml up -d --build

# Ver logs
docker-compose -f docker-compose.prod.yml logs -f

# Restart serviços
docker-compose -f docker-compose.prod.yml restart

# Parar tudo
docker-compose -f docker-compose.prod.yml down
```

---

## 🔄 CI/CD com GitHub Actions

### .github/workflows/deploy.yml

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt
          pip install -r requirements-dev.txt

      - name: Run tests
        run: |
          cd backend
          pytest

      - name: Run linting
        run: |
          cd backend
          flake8 app/
          black --check app/

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
      - uses: actions/checkout@v3

      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /home/deploy/pytake
            git pull origin main

            # Backend
            cd backend
            source venv/bin/activate
            pip install -r requirements.txt
            alembic upgrade head
            sudo systemctl restart pytake-backend pytake-celery

            # Frontend
            cd ../frontend
            pnpm install
            pnpm build
            sudo systemctl restart pytake-frontend

      - name: Notify Slack
        if: always()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

---

## 📊 Monitoramento

### Sentry (Error Tracking)

**Backend:**
```python
# app/core/config.py
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

if settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        integrations=[FastApiIntegration()],
        environment=settings.ENVIRONMENT,
        traces_sample_rate=0.1
    )
```

**Frontend:**
```typescript
// app/layout.tsx
import * as Sentry from "@sentry/nextjs"

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NEXT_PUBLIC_ENVIRONMENT,
    tracesSampleRate: 0.1
  })
}
```

### Prometheus + Grafana

**Métricas expostas:**
- Request rate (req/s)
- Error rate (%)
- Response time (p50, p95, p99)
- Database connections
- Celery queue size
- Memory/CPU usage

### Logs Centralizados

**Opções:**
- **ELK Stack** (Elasticsearch, Logstash, Kibana)
- **Loki + Grafana**
- **CloudWatch Logs** (AWS)

---

## 💾 Backup e Recuperação

### Backup Automático PostgreSQL

```bash
# Script: scripts/backup_postgres.sh
#!/bin/bash

BACKUP_DIR="/backups/postgres"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/pytake_$TIMESTAMP.sql.gz"

# Criar backup
pg_dump -h localhost -U pytake pytake_prod | gzip > $BACKUP_FILE

# Upload para S3
aws s3 cp $BACKUP_FILE s3://pytake-backups/postgres/

# Manter apenas últimos 30 dias localmente
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "Backup concluído: $BACKUP_FILE"
```

**Cron:**
```bash
# Rodar diariamente às 2am
0 2 * * * /home/deploy/pytake/scripts/backup_postgres.sh
```

### Restore

```bash
# Download do S3
aws s3 cp s3://pytake-backups/postgres/pytake_20251003_020000.sql.gz .

# Restore
gunzip pytake_20251003_020000.sql.gz
psql -h localhost -U pytake -d pytake_prod < pytake_20251003_020000.sql
```

---

**Versão:** 1.0.0
**Última atualização:** 2025-10-03
