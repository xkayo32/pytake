# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PyTake is a robust WhatsApp Business API integration system built with Rust (backend) and React (frontend). It enables multi-client to multi-agent conversations with automated flow management and extensible module system.

## Key Commands

### Development
```bash
# Start all services (Docker)
docker-compose up -d

# Backend development
cd backend && cargo run

# Frontend development
cd frontend && npm run dev

# Run tests
cargo test                    # Backend tests
cd frontend && npm test      # Frontend tests

# Database migrations
./scripts/migrate.sh

# Linting and formatting
cargo fmt && cargo clippy    # Backend
cd frontend && npm run lint  # Frontend
```

### Build & Deploy
```bash
# Build for production
cargo build --release        # Backend
cd frontend && npm run build # Frontend

# Deploy to staging/production
./scripts/deploy.sh [environment]
```

## Architecture Overview

The system follows a microservices-inspired monolithic architecture with clear separation of concerns:

- **Backend (Rust/Actix-web)**: Handles WhatsApp API integration, flow engine, authentication, and module system
- **Frontend (React/TypeScript)**: Provides dashboard, flow builder, and real-time chat interface
- **Database (PostgreSQL)**: Stores conversations, flows, users, and configurations
- **Cache/Queue (Redis)**: Manages sessions, message queues, and real-time state

### Critical Design Decisions

1. **Rust for Backend**: Chosen for memory safety, performance, and reliability in handling concurrent connections
2. **Module System**: Plugin architecture allows custom integrations without modifying core
3. **Flow Engine**: State machine-based execution for conversation flows
4. **WebSocket + REST**: Hybrid approach for real-time chat and CRUD operations

## Testing Strategy

- Unit tests: Colocated with code using `#[cfg(test)]`
- Integration tests: In `backend/tests/` directory
- E2E tests: Using Playwright for critical user flows
- Minimum coverage target: 80%

## Important Patterns

### Error Handling
- Use `thiserror` for custom errors
- Return `Result<T, AppError>` from handlers
- Log errors with `tracing`

### Authentication
- JWT tokens with refresh mechanism
- Role-based access control (RBAC)
- Middleware-based authorization

### Module Development
- Implement `Module` trait
- Use `ModuleContext` for accessing system resources
- Return `ModuleResponse` with structured data

## Common Issues & Solutions

1. **WhatsApp Webhook Verification**: Ensure HTTPS and valid certificate
2. **Database Connection Pool**: Configure based on expected load
3. **CORS in Development**: Frontend runs on different port, configure accordingly
4. **Module Loading**: Modules must be in `backend/modules/` directory

## Performance Considerations

- Use Redis for session management
- Implement pagination for large datasets
- Cache WhatsApp media URLs
- Use database indexes on frequently queried fields

## Security Notes

- Never commit `.env` files
- Use environment variables for secrets
- Validate all WhatsApp webhook signatures
- Sanitize user inputs in flows
- Rate limit API endpoints