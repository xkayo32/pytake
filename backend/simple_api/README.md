# PyTake Backend API Documentation

## 📚 Complete API Documentation

### Interactive Documentation
After starting the server, you can access the complete interactive API documentation at:

- **Swagger UI**: http://localhost:8080/docs
- **ReDoc**: http://localhost:8080/redoc  
- **RapiDoc**: http://localhost:8080/rapidoc
- **OpenAPI JSON**: http://localhost:8080/api-docs/openapi.json

## 🚀 Quick Start

### Prerequisites
- Rust 1.75+
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose (optional)

### Environment Setup
```bash
# Copy environment file
cp .env.development .env

# Start services with Docker
docker-compose up -d postgres redis

# Or run locally
cargo run
```

## 📍 API Endpoints Overview

### 🏥 Health & Status
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/v1/status` | Service status |
| GET | `/` | API documentation and endpoints list |

### 🔐 Authentication

#### In-Memory Auth (Development)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | User login |
| GET | `/api/v1/auth/me` | Get current user |
| POST | `/api/v1/auth/logout` | Logout user |

#### Database Auth (Production)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth-db/register` | Register new user |
| POST | `/api/v1/auth-db/login` | User login |
| GET | `/api/v1/auth-db/me` | Get current user |
| POST | `/api/v1/auth-db/logout` | Logout user |

### 📱 WhatsApp Configuration Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/whatsapp-configs` | List all configurations |
| POST | `/api/v1/whatsapp-configs` | Create new configuration |
| GET | `/api/v1/whatsapp-configs/{id}` | Get specific configuration |
| PUT | `/api/v1/whatsapp-configs/{id}` | Update configuration |
| DELETE | `/api/v1/whatsapp-configs/{id}` | Delete configuration |
| POST | `/api/v1/whatsapp-configs/{id}/test` | Test configuration |
| GET | `/api/v1/whatsapp-configs/default` | Get default configuration |
| POST | `/api/v1/whatsapp-configs/{id}/set-default` | Set as default |

### 💬 WhatsApp Operations

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/whatsapp/instance/create` | Create WhatsApp instance |
| GET | `/api/v1/whatsapp/instance/{name}/status` | Get instance status |
| GET | `/api/v1/whatsapp/instance/{name}/qrcode` | Get QR code |
| POST | `/api/v1/whatsapp/send` | Send message |
| GET | `/api/v1/whatsapp/instances` | List all instances |
| DELETE | `/api/v1/whatsapp/instance/{name}` | Delete instance |
| GET/POST | `/api/v1/whatsapp/webhook` | Webhook handler |

### 🔌 WebSocket

| Method | Endpoint | Description |
|--------|----------|-------------|
| WS | `/ws` | WebSocket connection |
| GET | `/api/v1/ws/stats` | Connection statistics |

### 🤖 Agent Conversations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/conversations/agent` | Get agent conversations |
| GET | `/api/v1/conversations/{id}/messages` | Get conversation messages |
| POST | `/api/v1/conversations/{id}/assign` | Assign conversation |
| POST | `/api/v1/conversations/{id}/resolve` | Resolve conversation |

### 📊 Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/dashboard/metrics` | Get dashboard metrics |
| GET | `/api/v1/dashboard/analytics` | Get analytics data |
| GET | `/api/v1/dashboard/agent-performance` | Get agent performance |

### 🔄 Flows

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/flows` | List all flows |
| POST | `/api/v1/flows` | Create new flow |
| GET | `/api/v1/flows/{id}` | Get specific flow |
| PUT | `/api/v1/flows/{id}` | Update flow |
| DELETE | `/api/v1/flows/{id}` | Delete flow |
| POST | `/api/v1/flows/{id}/test` | Test flow |

## 📝 Request/Response Examples

### Authentication

#### Register
```json
POST /api/v1/auth/register
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe"
}

Response:
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "123",
    "email": "user@example.com",
    "name": "John Doe",
    "roles": ["user"]
  }
}
```

### WhatsApp Configuration

#### Create Configuration
```json
POST /api/v1/whatsapp-configs
{
  "name": "Production WhatsApp",
  "provider": "official",
  "phone_number_id": "123456789",
  "access_token": "EAAJLLK95RIU...",
  "webhook_verify_token": "verify_token_123",
  "business_account_id": "987654321",
  "is_active": true,
  "is_default": false
}

Response:
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Production WhatsApp",
  "provider": "official",
  "phone_number_id": "123456789",
  "is_active": true,
  "is_default": false,
  "health_status": "unknown",
  "created_at": "2025-01-07T10:00:00Z",
  "updated_at": "2025-01-07T10:00:00Z"
}
```

#### Test Configuration
```json
POST /api/v1/whatsapp-configs/{id}/test

Response:
{
  "success": true,
  "message": "Configuration test successful",
  "config_id": "550e8400-e29b-41d4-a716-446655440000",
  "provider": "official",
  "details": {
    "provider": "official",
    "phone_number_id": "123456789",
    "verified_name": "Business Name",
    "status": "connected"
  }
}
```

### Send WhatsApp Message

```json
POST /api/v1/whatsapp/send
{
  "to": "+5561999999999",
  "message": "Hello from PyTake!",
  "message_type": "text",
  "instance_name": "default"
}

Response:
{
  "success": true,
  "message_id": "wamid.HBgNNTU2MTk5OTk5OTk5OQ",
  "status": "sent"
}
```

## 🔒 Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### Token Expiration
- Access tokens expire after 24 hours
- Refresh tokens can be used to obtain new access tokens

## 🌍 CORS Configuration

The API is configured with permissive CORS for development. In production, update the CORS configuration to specify allowed origins:

```rust
let cors = Cors::default()
    .allowed_origin("https://your-frontend.com")
    .allowed_methods(vec!["GET", "POST", "PUT", "DELETE"])
    .allowed_headers(vec![header::AUTHORIZATION, header::ACCEPT])
    .allowed_header(header::CONTENT_TYPE)
    .max_age(3600);
```

## 📊 Database Schema

### WhatsApp Configurations Table
```sql
CREATE TABLE whatsapp_configs (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    phone_number_id VARCHAR(255),
    access_token TEXT,
    webhook_verify_token VARCHAR(255) NOT NULL,
    business_account_id VARCHAR(255),
    evolution_url VARCHAR(500),
    evolution_api_key VARCHAR(255),
    instance_name VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,
    health_status VARCHAR(20),
    last_health_check TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by VARCHAR(255)
);
```

## 🚨 Error Responses

All error responses follow this format:
```json
{
  "error": "Error type",
  "message": "Detailed error message",
  "code": 400
}
```

### Common HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

## 🔧 Configuration

### Environment Variables
```env
# Database
DATABASE_URL=postgres://user:password@localhost:5432/pytake
POSTGRES_PASSWORD=secure_password

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=redis_password

# JWT
JWT_SECRET=your-secret-key-here

# WhatsApp (now managed via database)
# Legacy environment variables for migration only

# Server
HOST=0.0.0.0
PORT=8080
RUST_LOG=info
```

## 📈 Monitoring

### Health Check
```bash
curl http://localhost:8080/health
```

### Metrics Endpoint
```bash
curl http://localhost:8080/api/v1/dashboard/metrics
```

## 🐳 Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down
```

## 🧪 Testing

### Run Tests
```bash
cargo test
```

### Integration Tests
```bash
cargo test --test integration_tests
```

## 📦 Dependencies

Main dependencies:
- `actix-web` - Web framework
- `sea-orm` - ORM for PostgreSQL
- `redis` - Redis client
- `jsonwebtoken` - JWT authentication
- `utoipa` - OpenAPI documentation
- `reqwest` - HTTP client for WhatsApp API

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 📞 Support

For support, email admin@pytake.com or open an issue on GitHub.