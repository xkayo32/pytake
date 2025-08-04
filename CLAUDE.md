# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PyTake is a robust WhatsApp Business API integration system built with Rust (backend) and React (frontend). It enables multi-client to multi-agent conversations with automated flow management, extensible module system, role-based permissions, and comprehensive agent workspace functionality.

## Key Commands

### Development Setup
```bash
# Primary development (Docker-based)
docker-compose up -d       # Start all services (PostgreSQL, Redis, Backend, Frontend)
docker-compose --profile tools up -d  # Include pgAdmin and Redis Commander
docker-compose restart frontend  # Restart frontend after code changes

# Alternative: Development with Evolution API
docker-compose -f docker-compose.dev.yml up -d  # Includes Evolution API for WhatsApp testing

# Environment setup
cp .env.example .env       # Configure environment variables
docker-compose exec backend-simple cargo run  # Initialize database
```

### Backend Development
```bash
# Docker-based development (recommended)
docker-compose exec backend-simple cargo run  # Start API server in container

# Local development (alternative)
cd backend/simple_api
cargo run                  # Start simple API server (port 8080)
cargo test                 # Run all tests
cargo fmt && cargo clippy  # Format and lint code

# Full backend workspace
cd backend
cargo run -p pytake-api    # Start full API server
cargo test -p pytake-core  # Core business logic tests
cargo test -p pytake-db    # Database layer tests
```

### Frontend Development
```bash
# Docker-based development (recommended)
docker-compose restart frontend  # Restart after code changes
docker logs pytake-frontend --tail 50  # View frontend logs

# Local development (alternative)
cd frontend
npm install               # Install dependencies
npm run dev              # Start dev server (port 3000)
npm run build            # Production build
npm run lint             # Run ESLint
```

### Testing & Common Tasks
```bash
# Backend testing (in container)
docker-compose exec backend-simple cargo test

# Frontend TypeScript checking
docker-compose exec frontend npm run build

# WebSocket testing
curl http://localhost:8080/api/v1/ws/stats

# WhatsApp configuration testing
./test-login.html          # Test login endpoints
./backend/test_auth.sh     # Test authentication API

# View application logs
docker logs pytake-backend --tail 50
docker logs pytake-frontend --tail 50
```

## Architecture Overview

### Core Architecture
The system provides comprehensive WhatsApp Business API integration with the following key components:

```
✅ WhatsApp Business API (Official + Evolution API support)
✅ Role-based Authentication (Admin, Supervisor, Agent, Viewer)
✅ Real-time WebSocket Communication
✅ Agent Workspace for Conversation Management
✅ Customizable Permissions System
✅ Multi-client to Multi-agent Routing
```

### Backend Structure
```
backend/
├── simple_api/              # Main API server (currently in use)
│   ├── src/main.rs         # Server entry point with CORS, auth, WebSocket
│   ├── src/auth.rs         # JWT authentication & user management
│   ├── src/whatsapp_config.rs      # WhatsApp API configuration endpoints
│   ├── src/agent_conversations.rs  # Agent workspace functionality
│   └── src/websocket.rs    # Real-time WebSocket connection manager
└── crates/                  # Full workspace (future expansion)
    ├── pytake-core/        # Business logic, services
    ├── pytake-api/         # REST API framework
    └── pytake-db/          # Database entities
```

### Frontend Structure  
```
frontend/src/
├── components/              # Reusable UI components
│   ├── auth/               # RoleBasedRoute, ProtectedRoute
│   ├── layout/             # Layout with permission-based navigation
│   └── ui/                 # Theme toggle, page headers, cards
├── pages/                   # Route-based pages
│   ├── auth/               # LoginPage with quick login buttons
│   ├── agent/              # AgentWorkspace for conversation management
│   ├── admin/              # RoleManagementPage for permissions
│   ├── settings/           # WhatsAppConfigPage for API setup
│   └── dashboard/          # DashboardPage with analytics
├── hooks/                  # Custom React hooks
│   ├── usePermissionsV2.ts # Permission checking system
│   └── useToast.ts         # Toast notifications
├── types/                  # TypeScript definitions
│   ├── permissions.ts      # Permission & role system types
│   └── auth.ts             # Authentication types
└── contexts/               # React contexts
    └── ThemeContext.tsx    # Dark/light theme management
```

### Key Services & Features

**Backend Services (Implemented & Functional)**
- **Authentication**: JWT-based with PostgreSQL user storage
- **Real-time Chat**: WebSocket with MPSC channels for message broadcasting  
- **WhatsApp Integration**: Dual-provider support (Official API + Evolution API)
- **Webhook Processing**: Complete WhatsApp webhook handler with auto-response
- **Database Layer**: SeaORM with PostgreSQL for persistent storage
- **CORS Support**: Permissive CORS for webhook and frontend integration

**Frontend Features (Implemented & Functional)**
- **Role-Based Access Control**: Granular permissions with customizable roles
- **Agent Workspace**: Conversation management, message viewing, assignment system
- **WhatsApp Configuration**: UI for both Official and Evolution API setup
- **Quick Login System**: Development buttons for each user role
- **Permission Management**: Admin interface for creating/editing custom roles
- **Theme Support**: Dark/light mode with persistent preferences

## Development Patterns

### Rust Backend Patterns
```rust
// Error handling with AppError
use crate::error::{AppError, AppResult};

// Repository pattern for database
let users = user_repository.find_all(&db).await?;

// WebSocket message broadcasting
connection_manager.broadcast(message).await;

// Platform-agnostic message processing
processor.process_message(platform, message).await?;
```

### React Frontend Patterns
```typescript
// Permission-based UI hooks
const { showDashboard, canAssignConversation } = usePermissionBasedUI();

// Role-based routing with permissions
<RoleBasedRoute requiredPermissions={['dashboard.view']}>
  <DashboardPage />
</RoleBasedRoute>

// API calls with error handling
const response = await authApi.login(credentials);
const { showToast } = useToast();

// Theme context usage
const { theme, toggleTheme } = useTheme();
```

## API Endpoints

### Core API Endpoints (Implemented)

**Authentication & Health**
- `GET /health` - Health check
- `POST /api/v1/auth/login` - User login (supports quick login for development)
- `GET /api/v1/auth/me` - Current user information
- `POST /api/v1/auth/refresh` - Refresh JWT token

**WebSocket Communication**  
- `WS /api/v1/ws` - Real-time WebSocket connection
- `GET /api/v1/ws/stats` - WebSocket connection statistics

**WhatsApp Configuration**
- `GET /api/v1/whatsapp/config` - Get WhatsApp configuration
- `PUT /api/v1/whatsapp/config` - Update WhatsApp configuration  
- `POST /api/v1/whatsapp/test` - Test WhatsApp API connection
- `POST /api/webhooks/whatsapp` - WhatsApp webhook endpoint

**Agent Workspace**
- `GET /api/v1/conversations` - List conversations for agent
- `POST /api/v1/conversations/:id/assign` - Assign conversation to agent
- `POST /api/v1/conversations/:id/resolve` - Resolve/close conversation
- `POST /api/v1/conversations/:id/messages` - Send message in conversation

## Environment Configuration

Required environment variables:
```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost/pytake
DATABASE_POOL_SIZE=10

# Redis
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=your-secret-key
JWT_EXPIRATION=86400

# WhatsApp APIs
WHATSAPP_EVOLUTION_URL=http://localhost:8084  # Evolution API URL  
WHATSAPP_EVOLUTION_API_KEY=your-api-key       # Evolution API key
WHATSAPP_INSTANCE_NAME=pytake                 # Instance name
WHATSAPP_OFFICIAL_TOKEN=your-official-token   # Official API token
WHATSAPP_PHONE_NUMBER_ID=your-phone-id        # Official API phone number ID

# Server
BIND_ADDRESS=0.0.0.0:8080
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

## Common Development Tasks

### User Authentication & Roles
```bash
# Test different user roles (development)
# Login page has quick buttons for: Admin, Supervisor, Agent, Viewer
# Navigate to: http://localhost:3000/login

# Test authentication API
./backend/test_auth.sh

# Quick login via API
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@pytake.com", "password": "admin123"}'
```

### WhatsApp API Configuration
```bash
# Access WhatsApp configuration via frontend
# Navigate to: http://localhost:3000/app/settings/whatsapp
# Or direct API access:

# Get current configuration
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/v1/whatsapp/config

# Test connection
curl -X POST -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/v1/whatsapp/test
```

### Agent Workspace Testing
```bash
# Access agent workspace via frontend  
# Navigate to: http://localhost:3000/app/agent
# Or direct API access:

# List conversations for agent
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/v1/conversations

# Assign conversation to agent
curl -X POST -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/v1/conversations/123/assign
```

### Permission System Management  
```bash
# Access role management (Admin only)
# Navigate to: http://localhost:3000/app/admin/roles
# Create custom roles with granular permissions for:
# - Dashboard, Conversations, Agents, Analytics, Settings
# - WhatsApp, Users, Roles, Templates, Media modules
```

## Troubleshooting

### TypeScript/Frontend Issues
```bash
# Common fix for type export errors
docker-compose restart frontend
docker logs pytake-frontend --tail 50

# If Vite cache issues persist
docker-compose exec frontend rm -rf node_modules/.vite
docker-compose restart frontend
```

### Authentication Issues
```bash
# Verify JWT token is valid
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/v1/auth/me

# Check backend logs for auth errors
docker logs pytake-backend --tail 50

# Test with development login buttons at http://localhost:3000/login
```

### WebSocket Connection Failed
```bash
# Check WebSocket stats
curl http://localhost:8080/api/v1/ws/stats

# Verify Redis is running
docker-compose ps redis

# Check WebSocket logs
docker logs pytake-backend --tail 50 | grep -i websocket
```

### Database Connection Issues
```bash
# Check PostgreSQL status
docker-compose ps postgres

# View database logs
docker logs pytake-postgres --tail 20

# Verify connection from backend
docker-compose exec backend-simple cargo run
```

### WhatsApp Configuration Issues
```bash
# Test WhatsApp API connection via frontend:
# http://localhost:3000/app/settings/whatsapp

# Check if Evolution API is running (if using dev compose)
docker-compose -f docker-compose.dev.yml ps evolution-api

# Verify webhook URL is reachable
curl -X POST http://localhost:8080/api/webhooks/whatsapp -d '{}'
```

### Docker Container Issues
```bash
# Restart specific services
docker-compose restart frontend backend-simple

# View all container statuses
docker-compose ps

# Clean rebuild if needed
docker-compose down && docker-compose up -d --build
```

## Production Readiness Status

### ✅ System Status: PRODUCTION READY
- **Mock Data**: Completely removed from all components
- **API Integration**: All frontend components connected to real backend APIs
- **Dashboard System**: Role-based dashboards with real-time data
- **Chat Interface**: Real API integration for conversations and messages
- **Empty States**: Proper fallbacks when no data is available
- **Error Handling**: Comprehensive error handling throughout the system