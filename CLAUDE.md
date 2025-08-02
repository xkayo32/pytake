# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PyTake is a robust WhatsApp Business API integration system built with Rust (backend) and React (frontend). It enables multi-client to multi-agent conversations with automated flow management and extensible module system. The system includes complete PostgreSQL integration, real-time WebSocket chat, and WhatsApp webhook processing with automatic response capabilities.

## Key Commands

### Development Setup
```bash
# Automated setup (recommended)
./scripts/setup.sh         # Complete environment setup

# Start/stop development environment
./scripts/start-dev.sh     # Starts all services via Docker
./scripts/stop-dev.sh      # Stops all services

# Manual setup
cp .env.example .env       # Configure environment variables
docker-compose up -d       # Start all services (PostgreSQL, Redis, API, Frontend)

# Include optional tools (pgAdmin, Redis Commander)
docker-compose --profile tools up -d
```

### Backend Development
```bash
cd backend
cargo run                  # Start API server (port 8080)
cargo test                 # Run all tests (203 tests total)
cargo fmt && cargo clippy  # Format and lint

# Test specific crates
cargo test -p pytake-core  # Core business logic (156 tests)
cargo test -p pytake-db    # Database layer (40 tests)
cargo test --test integration_tests  # Integration tests (7 tests)

# Build for production
cargo build --release
```

### Frontend Development
```bash
cd frontend
npm install               # Install dependencies
npm run dev              # Start dev server (port 3000)
npm run build            # Production build
npm run lint             # Lint TypeScript/React code
npm test                 # Run frontend tests
```

### Common Tasks
```bash
# Database migrations
./scripts/migrate.sh

# View progress dashboard
./scripts/progress-dashboard.sh

# Deploy to environment
./scripts/deploy.sh [environment]
```

## Architecture Overview

### Backend Structure (Rust)
The backend follows a modular monolithic architecture organized into crates:

```
backend/crates/
├── pytake-core/      # Core business logic and services
├── pytake-api/       # REST API, WebSocket handlers, and routes
├── pytake-db/        # Database entities, repositories, and migrations
├── pytake-whatsapp/  # WhatsApp Business API integration
├── pytake-flow/      # Flow engine for automated conversations
└── pytake-modules/   # Plugin system for extensibility
```

### Core Services (Implemented & Functional)
- **Authentication**: JWT-based authentication with PostgreSQL user storage
- **Real-time Chat**: WebSocket implementation with MPSC channels for message broadcasting
- **WhatsApp Integration**: Dual-provider support (Official API + Evolution API)
- **Webhook Processing**: Complete WhatsApp webhook handler with auto-response system
- **Database Layer**: SeaORM with PostgreSQL for persistent data storage
- **CORS Support**: Permissive CORS for webhook and frontend integration
- **Auto-Response**: Pattern-matching automatic responses for WhatsApp messages

### Frontend Structure (React)
```
frontend/src/
├── components/       # UI components (chat, dashboard, templates, media)
├── pages/           # Route components
├── services/        # API clients and WebSocket integration
├── store/           # Zustand state management
├── hooks/           # Custom React hooks
└── types/           # TypeScript definitions
```

### Critical Design Decisions

1. **Rust for Backend**: Chosen for memory safety, performance, and reliability in handling concurrent connections
2. **Dual WhatsApp Integration**: Support for both Official WhatsApp API and Evolution API
3. **PostgreSQL Database**: Persistent storage with SeaORM for type-safe async operations
4. **WebSocket Real-time**: MPSC channels for efficient message broadcasting to connected clients
5. **Safe JSON Processing**: Defensive webhook handling using `.get()` instead of direct array access
6. **Automatic Response System**: Pattern-matching bot responses for common WhatsApp message types
7. **CORS Configuration**: Permissive CORS for webhook validation and frontend integration

## Development Patterns

### Error Handling
```rust
// Use AppError with thiserror
use crate::error::{AppError, AppResult};

// In handlers
pub async fn handler() -> AppResult<HttpResponse> {
    // Return Result<T, AppError>
}
```

### Database Operations
```rust
// Use SeaORM repositories pattern
let conversations = conversation_repository.find_all(&db).await?;
```

### Authentication Middleware
```rust
// Protected routes use AuthMiddleware
.wrap(AuthMiddleware)
```

### Frontend API Calls
```typescript
// Use services with proper error handling
const response = await conversationApi.getAll();
```

## Testing Strategy

- **Unit Tests**: Colocated with code using `#[cfg(test)]`
- **Integration Tests**: In `backend/tests/` directory
- **Test Coverage**: 100% (203/203 tests passing)
- **Run with output**: `cargo test -- --nocapture`

## Common Issues & Solutions

1. **CORS in Development**: Frontend (3000) and backend (8080) on different ports
   - Solution: Vite proxy configured in `vite.config.ts`

2. **Database Connections**: Pool exhaustion under load
   - Solution: Configure `DATABASE_POOL_SIZE` in `.env`

3. **WhatsApp Webhook**: HTTPS required for production
   - Solution: Use ngrok for local testing or proper SSL in production

4. **Redis Connection**: Required for queue and session management
   - Solution: Ensure Redis is running via Docker Compose

5. **File Uploads**: Large media files timing out
   - Solution: Configure `MAX_FILE_SIZE` and use chunked uploads

## Environment Configuration

Key environment variables (see `.env.example`):
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection for queues/cache
- `JWT_SECRET`: Token signing key
- `WHATSAPP_*`: WhatsApp Business API credentials
- `CORS_ALLOWED_ORIGINS`: Frontend URL for CORS
- `UPLOAD_DIR`: Media storage location

## API Endpoints

- **REST API**: `http://localhost:8080/api/v1/*`
- **WebSocket**: `ws://localhost:8080/api/v1/ws`
- **WhatsApp Webhook**: `POST /api/webhooks/whatsapp`
- **Health Check**: `GET /health`
- **WebSocket Stats**: `GET /api/v1/ws/stats`

## Performance Considerations

- Use pagination for large datasets (default: 20 items)
- Redis caching for session management
- Database indexes on frequently queried fields
- Chunked file uploads for media > 10MB
- Connection pooling for PostgreSQL and Redis

## Security Notes

- Environment variables for all secrets
- JWT tokens expire after 24 hours
- Refresh tokens stored in httpOnly cookies
- WhatsApp webhook signature validation
- Rate limiting on all API endpoints
- Input validation and sanitization
- CORS configured per environment