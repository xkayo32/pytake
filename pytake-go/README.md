# PyTake Backend - Go Implementation

## 🚀 Overview

PyTake is a multi-tenant WhatsApp Business API automation platform built with Go. This is a complete rewrite from Rust to Go for better maintainability and faster development.

## 📋 Development Phases

### ✅ Phase 1: Base Setup (Complete)
- [x] Project structure with clean architecture
- [x] Database connection (PostgreSQL + GORM)
- [x] Redis connection for caching
- [x] Middleware (CORS, Logger, Rate Limiter, Request ID)
- [x] Health check endpoints
- [x] Integration test framework
- [x] Docker Compose setup

### 🔄 Phase 2: Authentication (Next)
- [ ] JWT authentication
- [ ] User registration and login
- [ ] Password hashing with bcrypt
- [ ] Refresh tokens
- [ ] Auth middleware

### 📅 Upcoming Phases
- Phase 3: Multi-tenancy
- Phase 4: WhatsApp Core
- Phase 5: Conversations
- Phase 6: WebSocket
- Phase 7: Flows Engine
- Phase 8: Campaigns
- Phase 9: ERP Integration
- Phase 10: AI Assistant

## 🛠️ Tech Stack

- **Language**: Go 1.21+
- **Web Framework**: Gin
- **Database**: PostgreSQL 15+ with GORM
- **Cache**: Redis 7+
- **Authentication**: JWT
- **Testing**: Testify + Integration tests
- **Documentation**: Swagger/OpenAPI

## 📦 Installation

### Prerequisites
- Go 1.21+
- Docker & Docker Compose
- Make (optional)

### Quick Start

1. Clone the repository:
```bash
cd pytake-go
```

2. Copy environment file:
```bash
cp .env.development .env
```

3. Start Docker services:
```bash
docker-compose up -d
# or
make docker-up
```

4. Install dependencies:
```bash
go mod download
# or
make install
```

5. Run the application:
```bash
go run cmd/api/main.go
# or
make run
```

The API will be available at `http://localhost:8080`

## 🧪 Testing

### Run all tests:
```bash
make test
```

### Run integration tests:
```bash
make test-integration
```

### Generate coverage report:
```bash
make test-coverage
```

### Run specific test suite:
```bash
go test -v ./tests/integration -run TestHealthSuite
```

## 📝 Available Commands

```bash
make help          # Show all available commands
make build         # Build the application
make run           # Run the application
make dev           # Start development with hot reload
make test          # Run all tests
make lint          # Run linter
make fmt           # Format code
make docker-up     # Start Docker services
make docker-down   # Stop Docker services
make clean         # Clean build artifacts
```

## 🏗️ Project Structure

```
pytake-go/
├── cmd/
│   └── api/
│       └── main.go           # Application entry point
├── internal/
│   ├── config/               # Configuration management
│   ├── database/             # Database connection and models
│   │   └── models/           # GORM models
│   ├── middleware/           # HTTP middleware
│   ├── routes/               # Route definitions
│   ├── server/               # HTTP server setup
│   ├── logger/               # Logging utilities
│   └── redis/                # Redis client
├── tests/
│   └── integration/          # Integration tests
├── docker-compose.yml        # Docker services
├── Makefile                  # Build commands
└── go.mod                    # Go modules
```

## 🔍 API Endpoints

### Health Check
```bash
GET /health
```
Response:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "database": true,
  "redis": true
}
```

### API Version
```bash
GET /api/v1/
```
Response:
```json
{
  "message": "PyTake API v1",
  "version": "1.0.0"
}
```

## 🐛 Debugging

### View logs:
```bash
docker-compose logs -f
```

### Access PostgreSQL:
```bash
docker exec -it pytake_postgres psql -U pytake -d pytake_db
```

### Access Redis:
```bash
docker exec -it pytake_redis redis-cli -a pytake123
```

### Database GUI:
Open `http://localhost:8081` for Adminer
- System: PostgreSQL
- Server: postgres
- Username: pytake
- Password: pytake123
- Database: pytake_db

## 🔒 Security Features

- Rate limiting (10 requests/second)
- Request ID tracking
- CORS protection
- SQL injection prevention (GORM)
- Environment-based configuration
- Graceful shutdown

## 📊 Performance

- Connection pooling for PostgreSQL
- Redis caching
- Middleware optimizations
- Prepared statements with GORM

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Run tests: `make test`
4. Format code: `make fmt`
5. Create pull request

## 📄 License

MIT License - See LICENSE file for details