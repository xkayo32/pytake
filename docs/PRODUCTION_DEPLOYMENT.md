# 🚀 Production Deployment Guide

Complete guide to setup production deployment for PyTake.

## Prerequisites

### 1. Production Server Requirements

- **OS**: Ubuntu 22.04 LTS (ou similar)
- **Specs**: 2vCPU min, 4GB RAM, 20GB storage
- **Tools**: Docker, Docker Compose, Git
- **Network**: SSH access, ports 80/443 open

### 2. GitHub Secrets Setup

Navigate to: **Settings → Secrets and variables → Actions**

Add these secrets:

#### a) Production Server Access
```
PROD_HOST=your.production.domain.com
PROD_USER=deploy
PROD_SSH_KEY=<private key content>
PROD_SSH_KNOWN_HOSTS=<ssh-keyscan output>
```

#### b) Container Registry
```
GHCR_USERNAME=<github username>
GHCR_TOKEN=<github token with read:packages>
```

#### c) Environment Variables
```
PROD_DATABASE_URL=postgresql://user:pass@host/db
PROD_JWT_SECRET=<long random string>
PROD_SECRET_KEY=<long random string>
```

---

## Step 1: Generate SSH Key Pair

### On your local machine:

```bash
# Generate SSH key for CI/CD (no passphrase)
ssh-keygen -t ed25519 -f ~/.ssh/pytake_deploy -C "pytake-deploy" -N ""

# Display private key (copy to GitHub Secret)
cat ~/.ssh/pytake_deploy

# Display public key (copy to server)
cat ~/.ssh/pytake_deploy.pub
```

---

## Step 2: Configure Production Server

### SSH into your production server:

```bash
ssh root@your.production.domain.com
```

### Create deploy user:

```bash
# Create user
sudo useradd -m -s /bin/bash deploy

# Add SSH key
sudo mkdir -p /home/deploy/.ssh
echo "PASTE_PUBLIC_KEY_HERE" | sudo tee /home/deploy/.ssh/authorized_keys
sudo chmod 700 /home/deploy/.ssh
sudo chmod 600 /home/deploy/.ssh/authorized_keys
sudo chown -R deploy:deploy /home/deploy/.ssh

# Give sudoers access (for Docker)
sudo usermod -aG sudo deploy
echo "deploy ALL=(ALL) NOPASSWD:/usr/bin/docker" | sudo tee /etc/sudoers.d/deploy-docker
```

### Install Docker & Docker Compose:

```bash
# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add deploy user to docker group
sudo usermod -aG docker deploy

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify
docker --version
docker-compose --version
```

### Setup application directory:

```bash
# Create app directory
sudo mkdir -p /opt/pytake
sudo chown deploy:deploy /opt/pytake

# Create logs directory
sudo mkdir -p /var/log/pytake
sudo chown deploy:deploy /var/log/pytake
```

### Get SSH known hosts:

```bash
# Run from CI/CD machine
ssh-keyscan -t ed25519 your.production.domain.com

# Copy output to PROD_SSH_KNOWN_HOSTS secret
```

---

## Step 3: Update deploy.yml Workflow

The workflow now includes SSH deployment:

```yaml
deploy-to-server:
  runs-on: ubuntu-latest
  environment: production
  
  steps:
    - name: Deploy via SSH
      uses: appleboy/ssh-action@master
      with:
        host: ${{ secrets.PROD_HOST }}
        username: ${{ secrets.PROD_USER }}
        key: ${{ secrets.PROD_SSH_KEY }}
        known_hosts: ${{ secrets.PROD_SSH_KNOWN_HOSTS }}
        script: |
          cd /opt/pytake
          git pull origin main
          docker-compose pull
          docker-compose up -d
          docker-compose exec -T backend alembic upgrade head
```

---

## Step 4: Manual Deployment Test

### From production server:

```bash
# Clone repository
cd /opt/pytake
git clone https://github.com/xkayo32/pytake.git .

# Setup environment
cp .env.example .env
nano .env  # Edit with production values

# Start services
docker-compose up -d

# Check health
sleep 10
curl http://localhost:8000/api/v1/health
```

---

## Step 5: Configure Nginx for SSL

### On production server:

```bash
# Use certbot for Let's Encrypt
sudo apt-get install certbot python3-certbot-nginx

# Get certificate
sudo certbot certonly --standalone -d your.production.domain.com

# Configure Nginx (same as dev setup)
sudo cp nginx.conf /etc/nginx/conf.d/default.conf
sudo systemctl restart nginx
```

---

## Step 6: Automated Health Checks

After deployment, the workflow validates:

```bash
# API Health
curl https://api.pytake.net/api/v1/health

# Frontend Status  
curl -I https://app.pytake.net/

# Database Connection
docker-compose exec -T backend python -c "
  from app.core.database import SessionLocal
  SessionLocal().execute('SELECT 1')
  print('✓ Database OK')
"
```

---

## Step 7: Rollback Strategy

If deployment fails, automatic rollback:

```bash
# On failure, revert to previous Docker image
docker-compose down
git checkout HEAD~1
docker-compose pull
docker-compose up -d
```

---

## GitHub Actions Deployment Flow

```
Manual Trigger (Actions UI)
         ↓
Pre-deployment checks
         ↓
Build Docker images
         ↓
SSH to production
         ↓
Pull latest code
         ↓
Run migrations
         ↓
Start containers
         ↓
Health checks
         ↓
Success/Failure notification
```

---

## Troubleshooting

### SSH Connection Fails

```bash
# Test SSH locally
ssh -i ~/.ssh/pytake_deploy deploy@your.production.domain.com

# Check GitHub secret format (private key)
cat ~/.ssh/pytake_deploy | wc -l
# Should output private key lines
```

### Docker Image Pull Fails

```bash
# Ensure GHCR token is valid
docker login ghcr.io -u USERNAME -p TOKEN

# Check image exists
docker pull ghcr.io/xkayo32/pytake-backend:latest
```

### Database Migration Fails

```bash
# Check database connection
docker-compose exec -T backend psql $DATABASE_URL -c "SELECT 1"

# View migration logs
docker-compose logs backend | grep -i alembic
```

### Health Check Fails

```bash
# Check container logs
docker-compose logs backend
docker-compose logs frontend
docker-compose logs nginx

# Restart specific service
docker-compose restart backend
```

---

## Monitoring & Logs

### View logs:

```bash
# Backend logs
docker-compose logs -f backend

# Frontend logs
docker-compose logs -f frontend

# All logs
docker-compose logs -f

# System logs
journalctl -u docker -f
```

### Setup log rotation:

```bash
# Create logrotate config
sudo tee /etc/logrotate.d/pytake > /dev/null <<EOF
/var/log/pytake/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 0640 deploy deploy
    sharedscripts
}
EOF
```

---

## Security Checklist

- [ ] SSH key is not passphrase protected ✓
- [ ] GitHub secrets are encrypted ✓
- [ ] SSL/TLS certificates installed ✓
- [ ] Firewall only allows 80/443 ✓
- [ ] Database password is strong ✓
- [ ] JWT secret is random ✓
- [ ] Health checks are monitoring ✓
- [ ] Logs are being rotated ✓

---

## Cost Optimization

### Production Recommendations:

1. **Server**: AWS EC2 t3.medium (~$35/mo)
2. **Database**: AWS RDS PostgreSQL (~$50/mo)
3. **CDN**: Cloudflare (free tier)
4. **Monitoring**: Grafana Cloud (free tier)
5. **SSL**: Let's Encrypt (free)

**Total**: ~$85/mo

---

## Next Steps

1. ✅ Setup production server
2. ✅ Add GitHub secrets
3. ✅ Test SSH connection
4. ✅ Run manual deployment
5. ✅ Configure automated deploys
6. ⏭️ Setup monitoring (Prometheus/Grafana)
7. ⏭️ Setup alerting (Slack/PagerDuty)

---

## Support

For issues, check:
- GitHub Actions logs: Actions → Recent runs
- Server logs: `docker-compose logs -f`
- SSH access: `ssh deploy@host -v`
