# 🌍 Multi-Environment Deployment Guide

## Overview

PyTake uses a **subdomain-based multi-environment architecture** with the following setup:

| Environment | Subdomain | Backend Port | Frontend Port | Status |
|------------|-----------|--------------|---------------|--------|
| **Production** | `api.pytake.net` | 8000 | 3000 | 🟢 Public |
| **Staging** | `staging-api.pytake.net` | 8001 | 3001 | 🟡 Internal |
| **Development** | `dev-api.pytake.net` | 8002 | 3002 | 🔴 Local Only |

---

## 📋 Prerequisites

Before deploying, ensure you have:

- Domain: `pytake.net` (with DNS pointing to your server)
- SSL certificates (automated via certbot)
- Docker & Docker Compose
- Nginx reverse proxy (configured)
- GitHub Actions secrets configured

---

## 🔧 Setup Instructions

### Phase 1: DNS Configuration

1. **Point subdomains to your server:**
   ```bash
   api.pytake.net           → your_server_ip
   staging-api.pytake.net   → your_server_ip
   dev-api.pytake.net       → your_server_ip (optional, local only)
   app.pytake.net           → your_server_ip (frontend)
   ```

2. **Verify DNS resolution:**
   ```bash
   nslookup api.pytake.net
   nslookup staging-api.pytake.net
   ```

---

### Phase 2: SSL/TLS Certificates

#### Option A: Unified Certificate (Recommended)

Generate a single wildcard or multi-domain certificate:

```bash
# Install certbot if not present
sudo apt update && sudo apt install -y certbot python3-certbot-nginx

# Generate unified certificate
sudo certbot certonly --standalone \
  -d api.pytake.net \
  -d staging-api.pytake.net \
  -d dev-api.pytake.net \
  -d app.pytake.net \
  --agree-tos \
  --email admin@pytake.net \
  --non-interactive
```

**Certificate location:** `/etc/letsencrypt/live/api.pytake.net/`
- `fullchain.pem` - Full certificate chain
- `privkey.pem` - Private key
- Expires in 90 days (auto-renewal: `sudo certbot renew`)

#### Option B: Individual Certificates

```bash
sudo certbot certonly --standalone -d api.pytake.net
sudo certbot certonly --standalone -d staging-api.pytake.net
sudo certbot certonly --standalone -d dev-api.pytake.net
sudo certbot certonly --standalone -d app.pytake.net
```

#### Auto-Renewal

```bash
# Enable auto-renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Test renewal dry-run
sudo certbot renew --dry-run
```

---

### Phase 3: Nginx Configuration

1. **Copy Nginx config:**
   ```bash
   sudo cp nginx/nginx-subdomains.conf /etc/nginx/sites-available/pytake
   sudo ln -sf /etc/nginx/sites-available/pytake /etc/nginx/sites-enabled/pytake
   ```

2. **Verify Nginx syntax:**
   ```bash
   sudo nginx -t
   ```

3. **Restart Nginx:**
   ```bash
   sudo systemctl restart nginx
   ```

4. **Test reverse proxy:**
   ```bash
   # Should return API docs
   curl -k https://api.pytake.net/api/v1/docs
   curl -k https://staging-api.pytake.net/api/v1/docs
   
   # Should return frontend
   curl -k https://app.pytake.net
   ```

---

### Phase 4: Docker Compose Setup

1. **Ensure containers are running on correct ports:**
   ```yaml
   # docker-compose.yml
   services:
     # Production (port 8000)
     backend:
       ports:
         - "8000:8000"
     
     # Staging (port 8001) - if using separate compose files
     # or use BACKEND_PORT environment variable
   ```

2. **Start containers:**
   ```bash
   docker-compose up -d
   ```

3. **Verify services:**
   ```bash
   docker ps
   ```

---

### Phase 5: Backend Configuration

Update `.env` with environment-specific URLs:

```bash
# Production
ENVIRONMENT=production
PUBLIC_API_URL=https://api.pytake.net
WHATSAPP_WEBHOOK_URL=https://api.pytake.net/api/v1/whatsapp/webhook

# Staging
ENVIRONMENT=staging
PUBLIC_API_URL=https://staging-api.pytake.net
WHATSAPP_WEBHOOK_URL=https://staging-api.pytake.net/api/v1/whatsapp/webhook

# Development (local)
ENVIRONMENT=development
PUBLIC_API_URL=http://localhost:8002  # or ngrok URL
WHATSAPP_WEBHOOK_URL=http://localhost:8002/api/v1/whatsapp/webhook
```

---

## 🚀 Deployment

### Manual Deployment

```bash
# Deploy to staging
./deploy.sh staging

# Deploy to production
./deploy.sh production
```

The deployment script will:
1. ✅ Pull latest code from GitHub
2. ✅ Build Docker images
3. ✅ Setup/verify SSL certificates
4. ✅ Start/restart containers
5. ✅ Run database migrations
6. ✅ Perform health checks

### Automatic Deployment (CI/CD)

#### Staging (automatic on `develop` push)
```bash
# Create PR to develop → Merge → GitHub Actions deploys automatically
git push origin feature/my-feature
# Create PR to develop
# Once merged → Staging deployment starts
```

#### Production (automatic on `main` push)
```bash
# Merge to main → GitHub Actions deploys automatically
git checkout main && git merge develop
git push origin main
# Deployment starts automatically
```

---

## 🐳 Development with ngrok

For local development with Meta webhooks:

### 1. Install ngrok

```bash
# macOS
brew install ngrok

# Linux
wget https://bin.equinox.io/c/4VmDzA7iaHb/ngrok-stable-linux-amd64.zip
unzip ngrok-stable-linux-amd64.zip
sudo mv ngrok /usr/local/bin/
```

### 2. Start ngrok tunnel

```bash
# Expose port 8002 (dev backend)
ngrok http 8002

# Output:
# Web Interface                 http://127.0.0.1:4040
# Forwarding                    https://abc123.ngrok.io -> http://localhost:8002
```

### 3. Update .env for development

```bash
ENVIRONMENT=development
PUBLIC_API_URL=https://abc123.ngrok.io
WHATSAPP_WEBHOOK_URL=https://abc123.ngrok.io/api/v1/whatsapp/webhook
```

### 4. Configure Meta webhook

In Meta Business Manager:
- **Callback URL:** `https://abc123.ngrok.io/api/v1/whatsapp/webhook`
- **Verify Token:** (match `META_WEBHOOK_VERIFY_TOKEN` in backend)

---

## 📊 Health Checks

### Endpoint Health

```bash
# Production
curl https://api.pytake.net/api/v1/health

# Staging
curl https://staging-api.pytake.net/api/v1/health

# Development (local)
curl http://localhost:8002/api/v1/health
```

### Container Status

```bash
# View all containers
docker ps

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f nginx

# Check specific container
docker inspect pytake-backend
```

### Database Connectivity

```bash
# Test database connection
docker exec pytake-backend python -c "from app.core.database import engine; print('DB OK')"

# Check migrations status
docker exec pytake-backend alembic current
docker exec pytake-backend alembic heads
```

---

## 🔐 Environment Secrets (GitHub Actions)

Configure the following secrets in GitHub:

### Repository Secrets

```bash
# Repository → Settings → Secrets and variables → Actions

SECRET_KEY              # FastAPI secret key
JWT_SECRET_KEY         # JWT signing key
ENCRYPTION_KEY         # Fernet encryption key
```

### Environment Secrets

**Staging Environment:**
```bash
DEPLOY_KEY             # SSH private key for deployment
DEPLOY_HOST            # Staging server IP/hostname
DEPLOY_USER            # SSH user (e.g., pytake)
SLACK_WEBHOOK          # Slack notification URL
```

**Production Environment:**
```bash
DEPLOY_KEY             # SSH private key for deployment
DEPLOY_HOST            # Production server IP/hostname
DEPLOY_USER            # SSH user (e.g., pytake)
SLACK_WEBHOOK          # Slack notification URL
```

---

## 📈 Monitoring & Logs

### Real-time Logs

```bash
# All containers
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend

# Last 100 lines
docker-compose logs -f --tail=100 backend
```

### Nginx Logs

```bash
# Real-time access logs
sudo tail -f /var/log/nginx/api.pytake.net.access.log

# Real-time error logs
sudo tail -f /var/log/nginx/api.pytake.net.error.log

# Search for errors
sudo grep -i error /var/log/nginx/api.pytake.net.error.log | tail -20
```

### SSL Certificate Monitoring

```bash
# Check certificate expiration
sudo certbot certificates

# View certificate details
openssl x509 -in /etc/letsencrypt/live/api.pytake.net/fullchain.pem -text -noout

# Days until expiration
sudo certbot renew --dry-run --quiet && echo "Certificate renewal works"
```

---

## 🐛 Troubleshooting

### 502 Bad Gateway (Nginx → Backend)

```bash
# Check if backend is running
docker ps | grep backend

# Check backend logs
docker-compose logs backend | tail -50

# Test backend directly
curl http://localhost:8000/api/v1/health
```

### SSL Certificate Errors

```bash
# Verify certificate chain
openssl s_client -connect api.pytake.net:443

# Check Nginx SSL config
sudo nginx -T | grep ssl

# Test SSL/TLS
curl -v https://api.pytake.net
```

### DNS Resolution Issues

```bash
# Check DNS
nslookup api.pytake.net
dig api.pytake.net

# Test from container
docker exec pytake-backend nslookup api.pytake.net
```

### Webhook Not Being Called

```bash
# Check Meta webhook configuration
# 1. Go to Meta Business Manager
# 2. Apps → Your App → Configuration
# 3. Verify Callback URL matches PUBLIC_API_URL/api/v1/whatsapp/webhook
# 4. Verify Verify Token matches META_WEBHOOK_VERIFY_TOKEN

# Test webhook endpoint
curl -X POST https://api.pytake.net/api/v1/whatsapp/webhook \
  -H "Content-Type: application/json" \
  -d '{"object":"whatsapp_business_account"}'
```

---

## 🔄 CI/CD Pipeline Status

Check GitHub Actions:

```bash
# View all workflow runs
gh run list -L 20

# View specific workflow
gh run view <run_id>

# Get logs
gh run view <run_id> --log
```

---

## 📝 Deployment Checklist

Before deploying to production:

- [ ] Code reviewed and approved
- [ ] All tests passing (CI/CD green)
- [ ] Migrations tested on staging
- [ ] SSL certificates valid (not expiring)
- [ ] Nginx configuration tested
- [ ] Environment variables configured
- [ ] Database backup created
- [ ] Webhook URLs verified in Meta
- [ ] Slack notifications configured
- [ ] Rollback plan documented

---

## 🆘 Support

For issues or questions:

1. Check logs: `docker-compose logs -f backend`
2. Review this guide
3. Check GitHub Actions workflow runs
4. Contact the team

---

**Last Updated:** 2025-11-18  
**Version:** 1.0.0  
