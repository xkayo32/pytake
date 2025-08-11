# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current Repository Status

**IMPORTANT**: This repository currently contains comprehensive documentation and specifications for the PyTake system. The actual Rust codebase is not yet present - this is a blueprint for complete system reconstruction.

## Project Overview

PyTake is a multi-tenant WhatsApp Business API automation platform built with Rust. It provides enterprise-grade backend for managing WhatsApp conversations, automated flows, marketing campaigns, and ERP integrations.

## Architecture

The system uses a Rust workspace with modular crates:
- **simple_api**: Main API server entry point with REST, WebSocket, and GraphQL
- **pytake-core**: Core business logic and domain entities
- **pytake-db**: Database layer with Sea-ORM entities and migrations
- **pytake-whatsapp**: WhatsApp API client (Official API + Evolution API)
- **pytake-flow**: Conversation flow engine with visual builder support

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
- `users` - User authentication and profiles with multi-tenant support
- `whatsapp_configs` - WhatsApp configuration management per tenant
- `messages` - Message history with full media support
- `conversations` - Conversation threads with AI context
- `flows` - Automated conversation flows with visual builder
- `campaigns` - Marketing campaigns with segmentation
- `contacts` - CRM with custom fields and tags
- `templates` - WhatsApp message templates

## Code Organization

When implementing features:
1. API handlers in `simple_api/src/` modules
2. Business logic in `pytake-core/src/services/`
3. Database entities in `pytake-db/src/entities/`
4. WhatsApp integration in `pytake-whatsapp/src/`
5. Flow engine logic in `pytake-flow/src/`

## Important Patterns

1. **Error Handling**: Result<T, AppError> with detailed error variants
2. **Authentication**: JWT RS256 with refresh tokens
3. **Multi-tenancy**: UUID tenant_id isolation at database level
4. **Database**: Sea-ORM with connection pooling and transactions
5. **Configuration**: Database-driven configs per tenant
6. **Real-time**: WebSocket with ActixWeb actors
7. **Rate Limiting**: 10 req/sec per IP, configurable per tenant

## Security Considerations

- JWT RS256 tokens with 24h expiration, 7d refresh tokens
- Passwords hashed with argon2id
- CORS configured per environment
- WhatsApp webhook signature validation (X-Hub-Signature-256)
- Mandatory SSL/TLS in production
- LGPD/GDPR compliance with data encryption and audit logs

## Key Features to Implement

### Multi-tenant Architecture
- Tenant isolation with UUID tenant_id
- Per-tenant WhatsApp configurations
- Separate rate limits and quotas
- Custom branding support

### WhatsApp Integration
- Official WhatsApp Business API
- Evolution API for unofficial features
- Webhook processing with signature validation
- Media handling (images, documents, audio, video)
- Template message management

### Conversation Automation
- Visual flow builder with drag-and-drop
- AI-powered responses with ChatGPT/Claude
- Context-aware conversation handling
- Multi-language support

### ERP Integrations
- HubSoft, IxcSoft, MkSolutions, SisGP
- Webhooks for real-time sync
- Billing and invoice automation
- Customer data synchronization

## Deployment Notes

Production deployment requires:
- PostgreSQL 15+
- Redis 7+
- Nginx for SSL termination and reverse proxy
- Let's Encrypt for SSL certificates
- Docker and Docker Compose
- Valid WhatsApp Business API credentials

## Implementation Status

**Current State**: Documentation and specifications repository for system reconstruction

### Documented Components
✅ **API Specification** - 150+ routes across 17 categories documented
✅ **Database Schema** - Complete with all tables and relationships
✅ **Architecture Design** - Modular workspace structure defined
✅ **Security Specs** - Authentication, authorization, LGPD compliance
✅ **Docker Configuration** - Multi-stage Rust builds ready
✅ **Environment Setup** - All configuration files present

### Implementation Required
🔄 **Rust Codebase** - Full implementation needed based on specs
🔄 **Database Migrations** - Sea-ORM migrations to be created
🔄 **API Endpoints** - All 150+ routes to be implemented
🔄 **WhatsApp Integration** - Both Official and Evolution API
🔄 **Flow Engine** - Visual builder and execution engine
🔄 **Testing Suite** - Unit, integration, and E2E tests

## Reference Documentation

Key specification files in repository:
- `SYSTEM_REQUIREMENTS_COMPLETE.md` - Full technical specifications
- `API_ROUTES_COMPLETE.md` - All 150+ API endpoints documented
- `README.md` - Project overview and setup instructions
- `.env.development` - Development environment template
- `.env.docker` - Docker deployment configuration