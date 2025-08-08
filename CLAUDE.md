# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PyTake is a WhatsApp Business API integration platform built with Rust. It provides a production-ready backend for managing WhatsApp conversations, messages, and business workflows.

## Architecture

The backend follows a modular architecture with workspace crates:
- **pytake-api**: Main API server with REST endpoints and WebSocket support
- **pytake-core**: Core business logic and domain entities
- **pytake-db**: Database layer with Sea-ORM entities and migrations
- **pytake-whatsapp**: WhatsApp API client and webhook handling
- **pytake-flow**: Conversation flow engine
- **simple_api**: Simplified API with Swagger documentation

## Development Commands

### Building and Running
```bash
# Run from backend directory
cd backend

# Build all crates
cargo build

# Run the API server
cargo run --package simple_api

# Check compilation without building
cargo check

# Format code
cargo fmt

# Run linter
cargo clippy
```

### Testing
```bash
# Run all tests
cargo test

# Run specific test suite
cargo test auth_tests
cargo test whatsapp_tests
cargo test websocket_tests
cargo test conversation_tests
cargo test flow_tests

# Run integration tests
cargo test --test integration_tests

# Run with output
cargo test -- --nocapture

# Run tests from simple_api directory
cd backend/simple_api/tests
./run_tests.sh
```

### Database Operations
```bash
# Run migrations (requires Sea-ORM CLI)
sea-orm-cli migrate up

# Generate entity from database
sea-orm-cli generate entity -o src/entities
```

### Docker Deployment
```bash
# Deploy with Docker Compose
./deploy.sh deploy

# View logs
./deploy.sh logs

# Stop services
./deploy.sh stop

# Restart services
./deploy.sh restart

# Check status
./deploy.sh status

# Setup SSL
./deploy.sh ssl

# Create backup
./deploy.sh backup
```

## API Documentation

The API includes interactive documentation:
- Swagger UI: http://localhost:8080/docs
- ReDoc: http://localhost:8080/redoc
- OpenAPI JSON: http://localhost:8080/api-docs/openapi.json

## Key API Endpoints

### Authentication
- `POST /api/v1/auth/login` - Login with email/password
- `POST /api/v1/auth/register` - Register new user
- `GET /api/v1/auth/me` - Get current user

### WhatsApp Configuration
- `GET/POST /api/v1/whatsapp-configs` - Manage WhatsApp configurations
- `POST /api/v1/whatsapp-configs/{id}/test` - Test configuration

### WhatsApp Operations
- `POST /api/v1/whatsapp/send` - Send WhatsApp message
- `GET/POST /api/v1/whatsapp/webhook` - WhatsApp webhook handler

### WebSocket
- `WS /ws` - WebSocket connection for real-time updates
- `GET /api/v1/ws/stats` - WebSocket statistics

## Environment Configuration

Required environment variables (see .env.development):
```env
DATABASE_URL=postgres://pytake:password@localhost:5432/pytake
REDIS_URL=redis://default:password@localhost:6379
JWT_SECRET=your-secret-key
WHATSAPP_PHONE_NUMBER_ID=your-phone-id
WHATSAPP_ACCESS_TOKEN=your-access-token
WHATSAPP_WEBHOOK_VERIFY_TOKEN=verify-token
```

## Database Schema

The project uses PostgreSQL with Sea-ORM. Key tables:
- `users` - User authentication and profiles
- `whatsapp_configs` - WhatsApp configuration management
- `messages` - Message history
- `conversations` - Conversation threads
- `flows` - Automated conversation flows

## Testing Credentials

Development credentials:
- Admin login: admin@pytake.com / admin123
- Test WhatsApp: +5561994013828

## Code Organization

When implementing features:
1. Domain logic goes in `pytake-core/src/services/`
2. Database entities in `pytake-db/src/entities/`
3. API handlers in `simple_api/src/` or `pytake-api/src/handlers/`
4. WebSocket logic in `websocket_improved.rs` or `websocket.rs`
5. WhatsApp integration in `whatsapp_handlers.rs` or `whatsapp_evolution.rs`

## Important Patterns

1. **Error Handling**: Use Result types with custom errors
2. **Authentication**: JWT tokens with Bearer auth
3. **Database**: Sea-ORM with async operations
4. **WebSocket**: ActixWeb WebSocket with connection manager
5. **Configuration**: Database-driven WhatsApp configs (not env vars)

## Security Considerations

- JWT tokens expire after 24 hours
- Passwords are hashed with argon2
- CORS is permissive in development, restrictive in production
- WhatsApp webhooks require verify token validation
- SSL/TLS required for production deployment

## Common Development Tasks

### Adding a New API Endpoint
1. Define handler in appropriate module
2. Add route in `main.rs` configuration
3. Update OpenAPI documentation with `#[utoipa::path]`
4. Add integration test

### Modifying Database Schema
1. Create migration in `pytake-db/src/migration/`
2. Update entities in `pytake-db/src/entities/`
3. Run migration with Sea-ORM CLI
4. Update repository methods if needed

### Implementing WhatsApp Features
1. Add handler in `whatsapp_handlers.rs`
2. Update webhook processing if needed
3. Test with WhatsApp Business API sandbox
4. Verify webhook signature in production

## Performance Considerations

- Use connection pooling for PostgreSQL
- Redis for caching and message queues
- WebSocket connection manager for efficient broadcasting
- Async/await for non-blocking I/O
- Rate limiting on API endpoints

## Deployment Notes

Production deployment requires:
- PostgreSQL 15+
- Redis 7+
- Nginx for SSL termination and reverse proxy
- Let's Encrypt for SSL certificates
- Docker and Docker Compose
- Valid WhatsApp Business API credentials

## Production Readiness Status

✅ **Backend API** - Complete and ready for production
✅ **Database Layer** - PostgreSQL with Sea-ORM, migrations ready
✅ **Authentication** - JWT-based with role management
✅ **WhatsApp Integration** - Official API and Evolution API support
✅ **WebSocket** - Real-time messaging implemented
✅ **API Documentation** - OpenAPI/Swagger configured (paths need utoipa::path attributes)
✅ **Local Installation** - Successfully compiles and runs locally
✅ **Docker** - Multi-stage builds optimized for Rust (ready for deployment)
🔄 **Frontend** - React dashboard exists but needs API connection
🔄 **Testing** - Basic structure exists, needs expansion

## Recent Updates (2025-08-07)

### Fixed Compilation Issues
- Added ToSchema derives to all API request/response structs
- Added serde_yaml dependency for OpenAPI YAML generation
- Temporarily disabled path documentation in OpenAPI (requires utoipa::path attributes)
- Fixed unused variable warnings in websocket_improved.rs
- Removed unused imports from agent_conversations.rs

### Local Installation Verified
```bash
# Successfully tested with:
cargo check --package simple_api  # ✅ No errors
cargo build --package simple_api  # ✅ Builds successfully
cargo run --package simple_api    # ✅ Runs successfully
```

### Docker Configuration Updated
- All ports and hosts now use environment variables (no hardcoded values)
- Domain configured as api.pytake.net
- Uses standard ports 80/443 for direct domain access
- Nginx configured with dynamic template for environment variables