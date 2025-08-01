# PyTake Backend

Robust Rust backend for the PyTake WhatsApp Business API system.

## Architecture

The backend is organized as a Rust workspace with multiple crates:

- **pytake-core**: Core business logic, domain entities, and services
- **pytake-db**: Database models, migrations, and repositories using SeaORM
- **pytake-api**: REST API server using Actix-web
- **pytake-whatsapp**: WhatsApp Cloud API client implementation

## Features

- ✅ **Authentication & Authorization**: JWT-based auth with refresh tokens and RBAC
- ✅ **WhatsApp Integration**: Complete WhatsApp Cloud API client with webhook support
- ✅ **Message Queue**: Redis-based queue system for async message processing
- 🚧 **Flow Engine**: Visual flow builder for customer interactions
- 🚧 **Multi-tenant**: Support for multiple WhatsApp Business accounts
- 🚧 **Real-time Updates**: WebSocket support for live updates

## Quick Start

### Prerequisites

- Rust 1.70+
- PostgreSQL 14+
- Redis 7+ (optional, for queue system)
- WhatsApp Business API credentials

### Environment Setup

```bash
# Copy example environment file
cp .env.example .env

# Edit with your configuration
vim .env
```

Required environment variables:
```env
# Database
DATABASE_URL=postgres://user:password@localhost/pytake

# Redis (optional)
REDIS_URL=redis://localhost:6379

# WhatsApp (optional)
WHATSAPP_ACCESS_TOKEN=your_access_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_verify_token
WHATSAPP_APP_SECRET=your_app_secret

# Server
SERVER_HOST=127.0.0.1
SERVER_PORT=8080
```

### Database Setup

```bash
# Install SeaORM CLI
cargo install sea-orm-cli

# Run migrations
sea-orm-cli migrate up

# Generate entities (if needed)
sea-orm-cli generate entity -o crates/pytake-db/src/entities
```

### Running the Server

```bash
# Development mode with auto-reload
cargo watch -x run

# Production build
cargo build --release
./target/release/pytake-api
```

### Running Tests

```bash
# Run all tests
cargo test

# Run with coverage
cargo tarpaulin --out Html

# Run specific crate tests
cargo test -p pytake-core
```

## API Documentation

### Authentication Endpoints

- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - Logout user
- `GET /api/v1/auth/me` - Get current user

### WhatsApp Endpoints

- `GET /api/v1/whatsapp/webhook` - Webhook verification
- `POST /api/v1/whatsapp/webhook` - Receive webhook events
- `POST /api/v1/whatsapp/send` - Send message
- `POST /api/v1/whatsapp/media` - Upload media

### Health Check

- `GET /health` - Basic health check
- `GET /health/ready` - Readiness check
- `GET /health/live` - Liveness check

## Development

### Project Structure

```
backend/
├── Cargo.toml          # Workspace configuration
├── crates/
│   ├── pytake-core/    # Core business logic
│   ├── pytake-db/      # Database layer
│   ├── pytake-api/     # REST API server
│   └── pytake-whatsapp/# WhatsApp client
├── migrations/         # Database migrations
└── tests/             # Integration tests
```

### Adding a New Feature

1. Define domain entities in `pytake-core`
2. Create database migrations in `migrations/`
3. Implement repository in `pytake-db`
4. Add business logic service in `pytake-core`
5. Create API endpoints in `pytake-api`
6. Write tests for each layer

### Code Quality

```bash
# Format code
cargo fmt

# Run linter
cargo clippy -- -D warnings

# Check dependencies
cargo audit
```

## Deployment

### Docker

```bash
# Build image
docker build -t pytake-api .

# Run container
docker run -p 8080:8080 --env-file .env pytake-api
```

### Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop services
docker-compose down
```

## Performance

The backend is designed for high performance:

- Connection pooling for database
- Redis for caching and queues
- Async/await throughout
- Minimal allocations
- Zero-copy where possible

Benchmarks on a typical server:
- Health check: ~0.1ms
- Auth endpoints: ~5ms
- Message sending: ~50ms (including WhatsApp API call)

## Security

- Argon2id password hashing
- JWT with short-lived access tokens
- HMAC webhook signature verification
- Rate limiting on all endpoints
- CORS configuration
- Security headers

## Monitoring

The API exposes Prometheus metrics at `/metrics`:

- Request count and latency
- Database connection pool stats
- Queue depth and processing time
- WhatsApp API call metrics

## Contributing

1. Fork the repository
2. Create your feature branch
3. Write tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

Copyright 2024 PyTake Team. All rights reserved.