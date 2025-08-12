# PyTake Backend - Deployment Guide

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose installed
- Domain name pointing to your server (api.pytake.net)
- SSL certificates (automatic with Let's Encrypt)
- Minimum 2GB RAM, 20GB disk space

### Initial Setup

1. **Clone the repository**
```bash
git clone https://github.com/pytake/pytake-backend.git
cd pytake-backend
```

2. **Configure environment variables**
```bash
cp .env.example .env
# Edit .env with your production values
nano .env
```

3. **Make deploy script executable**
```bash
chmod +x deploy.sh
```

4. **Deploy the application**
```bash
./deploy.sh deploy
```

5. **Setup SSL certificates**
```bash
./deploy.sh setup-ssl
```

## 📦 Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Nginx     │────▶│  Go Backend │────▶│  PostgreSQL │
│  (Reverse   │     │   (API)     │     │  (Database) │
│   Proxy)    │     └─────────────┘     └─────────────┘
└─────────────┘            │                    
       │                   ▼                    
       │            ┌─────────────┐     ┌─────────────┐
       │            │    Redis    │     │    MinIO    │
       └───────────▶│   (Cache)   │     │  (Storage)  │
                    └─────────────┘     └─────────────┘
```

## 🛠️ Deployment Commands

### Basic Operations
```bash
# Build Docker images
./deploy.sh build

# Start all services
./deploy.sh up

# Stop all services
./deploy.sh down

# Restart services
./deploy.sh restart

# View logs
./deploy.sh logs
./deploy.sh logs backend  # Specific service
```

### Database Operations
```bash
# Run migrations
./deploy.sh migrate

# Create backup
./deploy.sh backup

# Restore from backup
./deploy.sh restore backups/pytake_backup_20250112_120000.sql.gz
```

### SSL/TLS Management
```bash
# Initial SSL setup
./deploy.sh setup-ssl

# Renew certificates
./deploy.sh renew-ssl
```

### Updates and Maintenance
```bash
# Update application (pull, build, migrate, restart)
./deploy.sh update

# Check health status
./deploy.sh health

# Clean up Docker resources
./deploy.sh cleanup
```

## 🔒 Security Configuration

### Environment Variables
Required environment variables in `.env`:

```env
# Database
DB_PASSWORD=<strong-password>

# Redis
REDIS_PASSWORD=<strong-password>

# JWT
JWT_SECRET=<256-bit-secret>

# MinIO
MINIO_SECRET_KEY=<strong-secret>

# WhatsApp API
WHATSAPP_ACCESS_TOKEN=<your-token>
WHATSAPP_WEBHOOK_SECRET=<webhook-secret>

# OpenAI
OPENAI_API_KEY=<your-api-key>
```

### Generate Secure Secrets
```bash
# Generate JWT secret
openssl rand -base64 64

# Generate database password
openssl rand -base64 32

# Generate MinIO secret
openssl rand -hex 32
```

## 🌐 Domain Configuration

### DNS Settings
Point your domain to the server IP:
```
Type    Name    Value           TTL
A       api     <server-ip>     300
A       www     <server-ip>     300
```

### Nginx Configuration
The Nginx configuration handles:
- SSL termination
- Rate limiting
- CORS headers
- WebSocket proxying
- Static file serving
- Security headers

## 📊 Monitoring

### With Monitoring Stack
```bash
# Deploy with Prometheus & Grafana
./deploy.sh deploy-monitoring
```

Access points:
- API: https://api.pytake.net
- Grafana: https://grafana.pytake.net
- Metrics: https://api.pytake.net/metrics (restricted)

### Health Checks
- Backend: https://api.pytake.net/health
- Database: Port 5432
- Redis: Port 6379
- MinIO: Port 9000

## 🔧 Troubleshooting

### Common Issues

1. **Port conflicts**
```bash
# Check ports in use
sudo netstat -tulpn | grep -E ':(80|443|8080|5432|6379)'
```

2. **Container issues**
```bash
# View container status
docker-compose ps

# Restart specific service
docker-compose restart backend

# View detailed logs
docker-compose logs -f --tail=100 backend
```

3. **Database connection issues**
```bash
# Test database connection
docker-compose exec postgres pg_isready -U pytake

# Access database shell
docker-compose exec postgres psql -U pytake
```

4. **SSL certificate issues**
```bash
# Check certificate status
docker-compose exec nginx nginx -t

# Force renew certificates
./deploy.sh renew-ssl
```

## 📈 Performance Tuning

### PostgreSQL
Edit `docker-compose.yml` to add:
```yaml
postgres:
  environment:
    POSTGRES_MAX_CONNECTIONS: 200
    POSTGRES_SHARED_BUFFERS: 256MB
    POSTGRES_EFFECTIVE_CACHE_SIZE: 1GB
```

### Nginx
Adjust in `nginx/nginx.conf`:
```nginx
worker_processes auto;
worker_connections 2048;
keepalive_timeout 65;
```

### Go Backend
Set in `.env`:
```env
DB_MAX_CONNECTIONS=50
DB_IDLE_CONNECTIONS=10
REDIS_POOL_SIZE=20
```

## 🔄 Backup Strategy

### Automated Backups
Add to crontab:
```bash
# Daily backup at 2 AM
0 2 * * * /path/to/pytake-backend/deploy.sh backup

# Weekly cleanup of old backups (keep 30 days)
0 3 * * 0 find /path/to/pytake-backend/backups -name "*.gz" -mtime +30 -delete
```

### Manual Backup
```bash
# Create backup
./deploy.sh backup

# List backups
ls -lh backups/

# Restore specific backup
./deploy.sh restore backups/pytake_backup_20250112_120000.sql.gz
```

## 🚦 Production Checklist

- [ ] Configure all environment variables in `.env`
- [ ] Set strong passwords for all services
- [ ] Configure domain DNS records
- [ ] Setup SSL certificates
- [ ] Run database migrations
- [ ] Configure firewall rules
- [ ] Setup monitoring (optional)
- [ ] Configure backup strategy
- [ ] Test health endpoints
- [ ] Verify WebSocket connectivity
- [ ] Test WhatsApp webhook
- [ ] Configure rate limiting
- [ ] Review security headers

## 📞 Support

For issues or questions:
- GitHub Issues: https://github.com/pytake/pytake-backend/issues
- Documentation: https://docs.pytake.net
- Email: support@pytake.net

## 📝 License

Copyright © 2025 PyTake. All rights reserved.