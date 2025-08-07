# PyTake API Reference Documentation

## Base URL
- **Development**: `http://localhost:8080`
- **Production**: `https://api.pytake.com`

## Authentication
All authenticated endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

---

## 📚 Complete API Reference

### Health Check
#### `GET /health`
Health check endpoint to verify service availability.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-07T10:00:00Z",
  "service": "pytake-api"
}
```

---

### Authentication Endpoints

#### `POST /api/v1/auth/register`
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "John Doe"
}
```

**Response (201):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "John Doe",
    "roles": ["user"],
    "created_at": "2025-01-07T10:00:00Z"
  }
}
```

#### `POST /api/v1/auth/login`
Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "John Doe",
    "roles": ["user"],
    "last_login": "2025-01-07T10:00:00Z"
  }
}
```

#### `GET /api/v1/auth/me`
Get current authenticated user information.

**Headers Required:**
- `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "id": "user_123",
  "email": "user@example.com",
  "name": "John Doe",
  "roles": ["user"],
  "created_at": "2025-01-07T10:00:00Z"
}
```

---

### WhatsApp Configuration Management

#### `GET /api/v1/whatsapp-configs`
List all WhatsApp configurations.

**Query Parameters:**
- `active` (boolean, optional): Filter by active status
- `provider` (string, optional): Filter by provider (official/evolution)

**Response (200):**
```json
{
  "configs": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Production WhatsApp",
      "provider": "official",
      "phone_number_id": "123456789",
      "is_active": true,
      "is_default": true,
      "health_status": "healthy",
      "last_health_check": "2025-01-07T09:55:00Z",
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-07T09:55:00Z"
    }
  ],
  "total": 1
}
```

#### `POST /api/v1/whatsapp-configs`
Create a new WhatsApp configuration.

**Request Body (Official Provider):**
```json
{
  "name": "Production WhatsApp",
  "provider": "official",
  "phone_number_id": "123456789",
  "access_token": "EAAJLLK95RIU...",
  "webhook_verify_token": "verify_token_123",
  "app_secret": "app_secret_key",
  "business_account_id": "987654321",
  "is_active": true,
  "is_default": false
}
```

**Request Body (Evolution Provider):**
```json
{
  "name": "Evolution Instance",
  "provider": "evolution",
  "evolution_url": "https://evolution.example.com",
  "evolution_api_key": "evolution_api_key_123",
  "instance_name": "my-instance",
  "webhook_verify_token": "verify_token_123",
  "is_active": true,
  "is_default": false
}
```

**Response (201):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Production WhatsApp",
  "provider": "official",
  "phone_number_id": "123456789",
  "is_active": true,
  "is_default": false,
  "health_status": "unknown",
  "created_at": "2025-01-07T10:00:00Z",
  "updated_at": "2025-01-07T10:00:00Z",
  "created_by": "admin@pytake.com"
}
```

#### `GET /api/v1/whatsapp-configs/{id}`
Get a specific WhatsApp configuration.

**Path Parameters:**
- `id` (UUID, required): Configuration ID

**Response (200):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Production WhatsApp",
  "provider": "official",
  "phone_number_id": "123456789",
  "webhook_verify_token": "verify_token_123",
  "business_account_id": "987654321",
  "is_active": true,
  "is_default": true,
  "health_status": "healthy",
  "last_health_check": "2025-01-07T09:55:00Z",
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-07T09:55:00Z",
  "created_by": "admin@pytake.com"
}
```

#### `PUT /api/v1/whatsapp-configs/{id}`
Update a WhatsApp configuration.

**Path Parameters:**
- `id` (UUID, required): Configuration ID

**Request Body (Partial Update):**
```json
{
  "name": "Updated Name",
  "is_active": false,
  "access_token": "new_token_value"
}
```

**Response (200):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Updated Name",
  "provider": "official",
  "phone_number_id": "123456789",
  "is_active": false,
  "is_default": true,
  "health_status": "inactive",
  "updated_at": "2025-01-07T10:05:00Z"
}
```

#### `DELETE /api/v1/whatsapp-configs/{id}`
Delete a WhatsApp configuration.

**Path Parameters:**
- `id` (UUID, required): Configuration ID

**Response (200):**
```json
{
  "message": "Configuration deleted successfully",
  "config_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### `POST /api/v1/whatsapp-configs/{id}/test`
Test a WhatsApp configuration connectivity.

**Path Parameters:**
- `id` (UUID, required): Configuration ID

**Response (200 - Success):**
```json
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

**Response (400 - Failure):**
```json
{
  "success": false,
  "error": "Configuration test failed",
  "message": "API returned status: 401 Unauthorized",
  "config_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### `GET /api/v1/whatsapp-configs/default`
Get the default WhatsApp configuration.

**Response (200):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Default Official API",
  "provider": "official",
  "phone_number_id": "574293335763643",
  "is_active": true,
  "is_default": true,
  "health_status": "healthy"
}
```

#### `POST /api/v1/whatsapp-configs/{id}/set-default`
Set a configuration as the default.

**Path Parameters:**
- `id` (UUID, required): Configuration ID

**Response (200):**
```json
{
  "message": "Default configuration updated successfully",
  "config": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Production WhatsApp",
    "is_default": true
  }
}
```

---

### WhatsApp Messaging Operations

#### `POST /api/v1/whatsapp/send`
Send a WhatsApp message.

**Request Body (Text Message):**
```json
{
  "to": "+5561999999999",
  "message": "Hello from PyTake!",
  "message_type": "text",
  "instance_name": "default"
}
```

**Request Body (Template Message):**
```json
{
  "to": "+5561999999999",
  "message_type": "template",
  "template_name": "welcome_message",
  "template_language": "pt_BR",
  "template_parameters": [
    {"type": "text", "text": "John Doe"}
  ],
  "instance_name": "default"
}
```

**Response (200):**
```json
{
  "success": true,
  "message_id": "wamid.HBgNNTU2MTk5OTk5OTk5OQ",
  "status": "sent",
  "timestamp": "2025-01-07T10:00:00Z"
}
```

#### `POST /api/v1/whatsapp/instance/create`
Create a new WhatsApp instance (Evolution API only).

**Request Body:**
```json
{
  "instance_name": "my-business",
  "token": "instance_token_123",
  "qrcode": true
}
```

**Response (201):**
```json
{
  "instance": {
    "instance_name": "my-business",
    "status": "created",
    "qr_code": "data:image/png;base64,..."
  }
}
```

#### `GET /api/v1/whatsapp/instance/{name}/status`
Get WhatsApp instance status.

**Path Parameters:**
- `name` (string, required): Instance name

**Response (200):**
```json
{
  "instance_name": "my-business",
  "status": "connected",
  "phone_number": "+5561999999999",
  "connected_at": "2025-01-07T09:00:00Z"
}
```

#### `GET /api/v1/whatsapp/instance/{name}/qrcode`
Get QR code for WhatsApp instance connection.

**Path Parameters:**
- `name` (string, required): Instance name

**Response (200):**
```json
{
  "qr_code": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA...",
  "expires_at": "2025-01-07T10:05:00Z"
}
```

---

### WebSocket Connections

#### `WS /ws`
WebSocket connection for real-time communication.

**Connection URL:**
```
ws://localhost:8080/ws
```

**Authentication:**
Send authentication message after connection:
```json
{
  "type": "auth",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Message Types:**

**Incoming Message:**
```json
{
  "type": "message",
  "data": {
    "from": "+5561999999999",
    "message": "Hello!",
    "timestamp": "2025-01-07T10:00:00Z"
  }
}
```

**Status Update:**
```json
{
  "type": "status",
  "data": {
    "message_id": "wamid.HBgNNTU2MTk5OTk5OTk5OQ",
    "status": "delivered",
    "timestamp": "2025-01-07T10:00:05Z"
  }
}
```

#### `GET /api/v1/ws/stats`
Get WebSocket connection statistics.

**Response (200):**
```json
{
  "total_connections": 42,
  "active_connections": 15,
  "authenticated_connections": 12,
  "uptime_seconds": 3600,
  "messages_sent": 1250,
  "messages_received": 980
}
```

---

### Agent Conversations

#### `GET /api/v1/conversations/agent`
Get conversations assigned to agents.

**Query Parameters:**
- `agent_id` (string, optional): Filter by agent ID
- `status` (string, optional): Filter by status (pending/active/resolved)
- `limit` (integer, optional): Limit results (default: 50)
- `offset` (integer, optional): Pagination offset

**Response (200):**
```json
{
  "conversations": [
    {
      "id": "conv_123",
      "customer_phone": "+5561999999999",
      "agent_id": "agent_456",
      "status": "active",
      "started_at": "2025-01-07T09:00:00Z",
      "last_message_at": "2025-01-07T09:55:00Z",
      "message_count": 15
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```

---

### Dashboard Analytics

#### `GET /api/v1/dashboard/metrics`
Get dashboard metrics overview.

**Query Parameters:**
- `period` (string, optional): Time period (today/week/month/year)
- `timezone` (string, optional): Timezone (default: UTC)

**Response (200):**
```json
{
  "metrics": {
    "total_messages": 5420,
    "total_conversations": 342,
    "active_conversations": 28,
    "average_response_time": 120,
    "satisfaction_rate": 4.5
  },
  "period": "today",
  "updated_at": "2025-01-07T10:00:00Z"
}
```

---

### Flow Management

#### `GET /api/v1/flows`
List all conversation flows.

**Query Parameters:**
- `active` (boolean, optional): Filter by active status
- `category` (string, optional): Filter by category

**Response (200):**
```json
{
  "flows": [
    {
      "id": "flow_123",
      "name": "Welcome Flow",
      "description": "Initial customer greeting flow",
      "category": "greeting",
      "is_active": true,
      "trigger": "new_conversation",
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-07T08:00:00Z"
    }
  ],
  "total": 1
}
```

#### `POST /api/v1/flows`
Create a new conversation flow.

**Request Body:**
```json
{
  "name": "Support Flow",
  "description": "Customer support automation",
  "category": "support",
  "trigger": "keyword",
  "trigger_value": "help",
  "steps": [
    {
      "type": "message",
      "content": "How can I help you today?",
      "options": ["Technical Issue", "Billing", "General Question"]
    },
    {
      "type": "condition",
      "conditions": [
        {
          "if": "Technical Issue",
          "then": "transfer_to_tech"
        }
      ]
    }
  ],
  "is_active": true
}
```

**Response (201):**
```json
{
  "id": "flow_456",
  "name": "Support Flow",
  "description": "Customer support automation",
  "category": "support",
  "is_active": true,
  "created_at": "2025-01-07T10:00:00Z"
}
```

---

## Error Response Format

All error responses follow a consistent format:

```json
{
  "error": "error_type",
  "message": "Detailed error message",
  "code": 400,
  "details": {
    "field": "email",
    "reason": "Invalid email format"
  }
}
```

### Common Error Codes
- `400` - Bad Request: Invalid request parameters
- `401` - Unauthorized: Missing or invalid authentication
- `403` - Forbidden: Insufficient permissions
- `404` - Not Found: Resource not found
- `409` - Conflict: Resource already exists
- `422` - Unprocessable Entity: Validation errors
- `429` - Too Many Requests: Rate limit exceeded
- `500` - Internal Server Error: Server error
- `503` - Service Unavailable: Service temporarily unavailable

---

## Rate Limiting

API endpoints are rate-limited to prevent abuse:

- **Authentication endpoints**: 5 requests per minute
- **Message sending**: 100 requests per minute
- **Configuration management**: 30 requests per minute
- **General endpoints**: 1000 requests per hour

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704624060
```

---

## Webhooks

### WhatsApp Webhook
Configure your WhatsApp webhook URL to receive incoming messages and status updates.

**Webhook URL:**
```
https://api.pytake.com/api/v1/whatsapp/webhook
```

**Verification (GET):**
WhatsApp will verify your webhook with a GET request:
```
GET /api/v1/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=verify_token_123&hub.challenge=challenge_string
```

**Incoming Message (POST):**
```json
{
  "entry": [
    {
      "id": "ENTRY_ID",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "15551234567",
              "phone_number_id": "123456789"
            },
            "messages": [
              {
                "from": "5561999999999",
                "id": "wamid.ID",
                "timestamp": "1704624000",
                "text": {
                  "body": "Hello!"
                },
                "type": "text"
              }
            ]
          }
        }
      ]
    }
  ]
}
```

---

## SDKs and Client Libraries

Official SDKs are available for:
- **JavaScript/TypeScript**: `npm install @pytake/client`
- **Python**: `pip install pytake-client`
- **Go**: `go get github.com/pytake/go-client`
- **Rust**: Add to Cargo.toml: `pytake-client = "1.0"`

---

## Changelog

### Version 1.0.0 (2025-01-07)
- Initial release with WhatsApp integration
- Database-driven configuration management
- JWT authentication
- WebSocket support
- Agent conversation management
- Dashboard analytics
- Flow builder

---

## Support

For API support and questions:
- Email: api-support@pytake.com
- Documentation: https://docs.pytake.com
- GitHub Issues: https://github.com/pytake/api/issues