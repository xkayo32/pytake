# PyTake Backend - WhatsApp Business API Platform

<div align="center">

![PyTake Logo](https://img.shields.io/badge/PyTake-Backend-green?style=for-the-badge)
![Go Version](https://img.shields.io/badge/Go-1.23-00ADD8?style=for-the-badge&logo=go)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker)
![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)

**Enterprise-grade WhatsApp Business API automation platform built with Go**

[Features](#-features) • [Quick Start](#-quick-start) • [Documentation](#-documentation) • [API](#-api-endpoints) • [Deploy](#-deployment)

</div>

---

## 🚀 Features

### Core Capabilities
- ✅ **Multi-tenant Architecture** - Complete isolation between tenants
- ✅ **WhatsApp Integration** - Official Business API + Evolution API
- ✅ **AI-Powered Responses** - ChatGPT/Claude integration
- ✅ **Visual Flow Builder** - Drag-and-drop conversation flows
- ✅ **Campaign Management** - Bulk messaging with segmentation
- ✅ **ERP Integrations** - HubSoft, IxcSoft, MKSolutions, SisGP
- ✅ **Real-time WebSocket** - Live updates and notifications
- ✅ **Dynamic Configuration** - Database-driven settings management
- ✅ **Comprehensive API** - 150+ RESTful endpoints
- ✅ **Production Ready** - Docker, monitoring, logging, backups

### Technical Stack
- **Language:** Go 1.23
- **Framework:** Gin Web Framework
- **Database:** PostgreSQL 15 with GORM
- **Cache:** Redis 7
- **Storage:** MinIO (S3-compatible)
- **Queue:** Redis-based job queue
- **WebSocket:** Real-time bidirectional communication
- **Monitoring:** Prometheus + Grafana
- **Deployment:** Docker + Docker Compose

## 📋 Prerequisites

### Development
- Go 1.23+
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose (optional)

### Production
- Docker & Docker Compose
- Domain with DNS access
- SSL certificates (automated with Let's Encrypt)
- Minimum 2GB RAM, 20GB storage

## 🔧 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/xkayo32/pytake-backend.git
cd pytake-backend
```

### 2. Development Setup

#### Option A: Local Development
```bash
# Navigate to Go backend
cd pytake-go

# Copy environment template
cp .env.template .env.development

# Install dependencies
go mod download

# Run database migrations
go run cmd/migrate/main.go up

# Start the server
go run cmd/api/main.go
```

#### Option B: Docker Development
```bash
# Start all services
docker-compose -f pytake-go/docker-compose.dev.yml up

# API will be available at http://localhost:8080
```

### 3. Production Deployment
```bash
# Configure environment
cp .env.example .env
# Edit .env with production values

# Deploy with Docker
chmod +x deploy.sh
./deploy.sh deploy

# Setup SSL certificates
./deploy.sh setup-ssl
```

## 📚 Documentation

### Key Documents
- **[SYSTEM_REQUIREMENTS_COMPLETE.md](./SYSTEM_REQUIREMENTS_COMPLETE.md)** - Complete system specifications
- **[API_ROUTES_COMPLETE.md](./API_ROUTES_COMPLETE.md)** - All 150+ API endpoints documented
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Production deployment guide
- **[CLAUDE.md](./CLAUDE.md)** - Development instructions for AI assistance

### Project Structure
```
pytake-backend/
├── pytake-go/               # Go backend application
│   ├── cmd/                 # Application entrypoints
│   │   ├── api/            # Main API server
│   │   └── migrate/        # Database migration tool
│   ├── internal/           # Private application code
│   │   ├── auth/          # Authentication & JWT
│   │   ├── whatsapp/      # WhatsApp integration
│   │   ├── conversation/  # Chat management
│   │   ├── flow/          # Flow engine
│   │   ├── campaign/      # Campaign system
│   │   ├── ai/            # AI integrations
│   │   ├── erp/           # ERP connectors
│   │   ├── settings/      # Dynamic configuration
│   │   └── ...           # Other modules
│   ├── migrations/         # Database migrations
│   ├── tests/             # Test suites
│   └── docs/              # API documentation
├── nginx/                  # Nginx configuration
├── monitoring/            # Prometheus & Grafana
├── docker-compose.yml     # Production compose
└── deploy.sh             # Deployment script
```

### Environment Configuration

Create `.env` file with the following variables:

```env
# Application
APP_ENV=production
APP_PORT=8080

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=pytake
DB_USER=pytake
DB_PASSWORD=secure_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=secure_password

# JWT
JWT_SECRET=your-256-bit-secret

# WhatsApp Business API
WHATSAPP_PHONE_NUMBER_ID=your-phone-id
WHATSAPP_ACCESS_TOKEN=your-access-token
WHATSAPP_WEBHOOK_VERIFY_TOKEN=verify-token
WHATSAPP_WEBHOOK_SECRET=webhook-secret

# OpenAI
OPENAI_API_KEY=your-openai-key

# SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email
SMTP_PASSWORD=app-password
```

## 🔌 API Endpoints

### Authentication
```http
POST   /api/v1/auth/register     # Register new user
POST   /api/v1/auth/login        # Login
POST   /api/v1/auth/refresh      # Refresh token
POST   /api/v1/auth/logout       # Logout
GET    /api/v1/auth/me          # Current user
```

### WhatsApp
```http
POST   /api/v1/whatsapp/send              # Send message
GET    /api/v1/whatsapp/configs           # List configurations
POST   /api/v1/whatsapp/configs           # Create configuration
PUT    /api/v1/whatsapp/configs/:id       # Update configuration
DELETE /api/v1/whatsapp/configs/:id       # Delete configuration
POST   /api/v1/whatsapp/configs/:id/test  # Test configuration
```

### Conversations
```http
GET    /api/v1/conversations         # List conversations
POST   /api/v1/conversations         # Create conversation
GET    /api/v1/conversations/:id     # Get conversation
PUT    /api/v1/conversations/:id     # Update conversation
DELETE /api/v1/conversations/:id     # Delete conversation
POST   /api/v1/conversations/:id/read # Mark as read
```

### Campaigns
```http
GET    /api/v1/campaigns          # List campaigns
POST   /api/v1/campaigns          # Create campaign
GET    /api/v1/campaigns/:id      # Get campaign
PUT    /api/v1/campaigns/:id      # Update campaign
DELETE /api/v1/campaigns/:id      # Delete campaign
POST   /api/v1/campaigns/:id/start # Start campaign
POST   /api/v1/campaigns/:id/stop  # Stop campaign
GET    /api/v1/campaigns/:id/stats # Campaign statistics
```

### WebSocket
```http
WS     /ws                        # WebSocket connection
GET    /api/v1/ws/stats          # WebSocket statistics
```

### Interactive API Documentation
- Swagger UI: http://localhost:8080/docs
- ReDoc: http://localhost:8080/redoc
- OpenAPI JSON: http://localhost:8080/api-docs/openapi.json

## 🚢 Deployment

### Docker Deployment

1. **Prepare Environment**
```bash
# Clone repository
git clone https://github.com/xkayo32/pytake-backend.git
cd pytake-backend

# Configure environment
cp .env.example .env
nano .env  # Edit with production values
```

2. **Deploy Services**
```bash
# Make script executable
chmod +x deploy.sh

# Full deployment
./deploy.sh deploy

# Or step by step:
./deploy.sh build    # Build images
./deploy.sh up       # Start services
./deploy.sh migrate  # Run migrations
```

3. **SSL Configuration**
```bash
# Setup Let's Encrypt SSL
./deploy.sh setup-ssl

# Renew certificates
./deploy.sh renew-ssl
```

4. **Management Commands**
```bash
# View logs
./deploy.sh logs
./deploy.sh logs backend

# Restart services
./deploy.sh restart

# Create backup
./deploy.sh backup

# Restore backup
./deploy.sh restore backups/pytake_backup_20250112.sql.gz

# Check health
./deploy.sh health
```

### Production URLs
- API: https://api.pytake.net
- Docs: https://api.pytake.net/docs
- Health: https://api.pytake.net/health
- Metrics: https://api.pytake.net/metrics
- Grafana: https://grafana.pytake.net (optional)

## 🧪 Testing

### Run Tests
```bash
cd pytake-go

# Unit tests
go test ./...

# Integration tests
go test -tags=integration ./tests/integration

# With coverage
go test -cover ./...

# Specific package
go test ./internal/auth
```

### API Testing
```bash
# Import Postman collection
tests/postman/PyTake_API.postman_collection.json

# Or use curl
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@pytake.com","password":"admin123"}'
```

## 📊 Monitoring

### Prometheus Metrics
- Endpoint: http://localhost:8080/metrics
- Request rate, latency, errors
- Business metrics (messages, campaigns, etc.)

### Grafana Dashboards
- Deploy with monitoring: `./deploy.sh deploy-monitoring`
- Access: https://grafana.pytake.net
- Default credentials in `.env`

### Health Checks
```bash
# API health
curl http://localhost:8080/health

# Liveness probe
curl http://localhost:8080/health/live

# Readiness probe
curl http://localhost:8080/health/ready
```

## 🔒 Security

### Features
- JWT RS256 authentication
- Refresh token rotation
- Rate limiting per IP/user
- CORS configuration
- Request validation
- SQL injection prevention
- XSS protection
- CSRF tokens
- Webhook signature validation
- Password hashing (Argon2id)
- SSL/TLS enforcement
- Security headers

### Best Practices
- Use strong passwords
- Rotate JWT secrets regularly
- Enable SSL in production
- Configure firewall rules
- Regular security updates
- Audit logs enabled
- Backup encryption

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

### Development Guidelines
- Follow Go best practices
- Write tests for new features
- Update documentation
- Use conventional commits
- Run linters before commit

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

- **Documentation:** [https://docs.pytake.net](https://docs.pytake.net)
- **Issues:** [GitHub Issues](https://github.com/xkayo32/pytake-backend/issues)
- **Email:** support@pytake.net
- **Discord:** [Join our community](https://discord.gg/pytake)

## 🙏 Acknowledgments

- WhatsApp Business API Team
- Go community
- Open source contributors
- All our users and supporters

---

<div align="center">

**Built with ❤️ by PyTake Team**

[Website](https://pytake.net) • [Documentation](https://docs.pytake.net) • [API Reference](https://api.pytake.net/docs)

</div>