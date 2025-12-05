"""
OpenAPI Schema Configuration for Swagger Documentation
Provides rich documentation with examples, response codes, and detailed descriptions
"""

from typing import Dict, Any
from fastapi import FastAPI


def get_openapi_schema() -> Dict[str, Any]:
    """
    Generate OpenAPI schema with custom configuration
    """
    return {
        "info": {
            "title": "PyTake API",
            "description": """
# PyTake - WhatsApp Automation Platform API

Complete API documentation for PyTake, a powerful WhatsApp automation platform.

## 🚀 Quick Start

1. **Register** (`POST /auth/register`) to create your account
2. **Login** (`POST /auth/login`) to get access tokens
3. **Create WhatsApp Connection** (`POST /whatsapp/connections`) 
4. **Setup Webhooks** to receive incoming messages
5. **Manage Contacts** and automate conversations

## 🔐 Authentication

Most endpoints require JWT authentication:

```
Authorization: Bearer <access_token>
```

Get tokens from:
- `POST /auth/login` - Get access & refresh tokens
- `POST /auth/refresh` - Refresh expired access token

## 📊 Rate Limiting

API requests are rate-limited based on endpoint:
- **Auth endpoints**: 5/minute (login), 3/hour (register)
- **Standard endpoints**: 100/minute
- **Search endpoints**: 50/minute

Rate limit info in response headers:
- `X-RateLimit-Limit`: Max requests allowed
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Unix timestamp when limit resets

## 🔍 Response Format

All responses follow a consistent format:

**Success Response:**
```json
{
  "data": { /* response data */ },
  "status": "success",
  "code": 200,
  "message": "Operation successful"
}
```

**Error Response:**
```json
{
  "detail": "Error message",
  "status": "error",
  "code": 400
}
```

## 📚 Main Endpoints

### Authentication
- `POST /auth/register` - Create new account
- `POST /auth/login` - Login and get tokens
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout

### Contacts
- `GET /contacts` - List all contacts
- `POST /contacts` - Create new contact
- `GET /contacts/{id}` - Get contact details
- `PUT /contacts/{id}` - Update contact
- `DELETE /contacts/{id}` - Delete contact

### Conversations
- `GET /conversations` - List conversations
- `GET /conversations/{id}` - Get conversation details
- `POST /conversations/{id}/messages` - Send message
- `GET /conversations/{id}/messages` - Get messages

### Flows (Automation)
- `GET /flows` - List automation flows
- `POST /flows` - Create new flow
- `PUT /flows/{id}` - Update flow
- `DELETE /flows/{id}` - Delete flow

### WhatsApp
- `POST /whatsapp/connections` - Create connection
- `GET /whatsapp/connections` - List connections
- `POST /whatsapp/webhook` - Webhook endpoint (public)

## 🔗 Webhooks

Configure webhooks to receive real-time updates:

**Webhook Payload Example:**
```json
{
  "event": "message.received",
  "timestamp": "2025-11-30T10:30:00Z",
  "organization_id": "123e4567-e89b-12d3-a456-426614174000",
  "data": {
    "conversation_id": "456e7890-f01c-34e5-b789-739725285111",
    "message": {
      "id": "789f1234-5678-90ab-cdef-123456789012",
      "text": "Hello!",
      "from_number": "5511987654321",
      "timestamp": "2025-11-30T10:29:55Z"
    }
  }
}
```

**Supported Events:**
- `message.received` - New message received
- `message.sent` - Message sent successfully
- `contact.created` - New contact created
- `contact.updated` - Contact information updated
- `conversation.started` - New conversation started
- `flow.executed` - Automation flow executed

## 🛠️ Common Use Cases

### Send a Message
```bash
curl -X POST http://localhost:8000/api/v1/conversations/{id}/messages \\
  -H "Authorization: Bearer <token>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "text": "Hello!",
    "media_url": null
  }'
```

### Create an Automation Flow
```bash
curl -X POST http://localhost:8000/api/v1/flows \\
  -H "Authorization: Bearer <token>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Welcome Flow",
    "description": "Send welcome message to new contacts",
    "trigger": "contact_created",
    "actions": [
      {
        "type": "send_message",
        "text": "Welcome to our service!"
      }
    ],
    "enabled": true
  }'
```

### Search Contacts
```bash
curl -X GET "http://localhost:8000/api/v1/contacts?query=john&skip=0&limit=10" \\
  -H "Authorization: Bearer <token>"
```

## ⚠️ Error Handling

API returns standard HTTP status codes:

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 429 | Too Many Requests |
| 500 | Server Error |

**Error Response Example:**
```json
{
  "detail": "Contact not found",
  "code": 404,
  "status": "error"
}
```

## 🔄 Pagination

List endpoints support pagination:

```
GET /api/v1/contacts?skip=0&limit=10
```

**Query Parameters:**
- `skip` (int, default=0) - Number of items to skip
- `limit` (int, default=10) - Number of items to return (max=100)
- `query` (string, optional) - Search query

**Response Headers:**
- `X-Total-Count` - Total items available
- `X-Page` - Current page
- `X-Per-Page` - Items per page

## 📖 API Versioning

Current version: **v1**

API endpoints are versioned in the URL path:
```
GET /api/v1/contacts  <- Version 1
```

Previous versions will be supported for 6 months after deprecation.

## 🚨 Troubleshooting

### 401 Unauthorized
- Token is expired or invalid
- Solution: Call `POST /auth/refresh` to get new token

### 429 Too Many Requests
- Rate limit exceeded
- Solution: Wait for rate limit to reset (see X-RateLimit-Reset header)

### 404 Not Found
- Resource doesn't exist or wrong ID
- Solution: Verify the resource ID is correct

### 500 Internal Server Error
- Server encountered unexpected error
- Solution: Check server logs and contact support

## 📞 Support

For API support and questions:
- Email: support@pytake.net
- Documentation: https://docs.pytake.net
- Status: https://status.pytake.net

---
**Version:** 1.0.0 | **Last Updated:** November 2025
            """,
            "version": "1.0.0",
            "contact": {
                "name": "PyTake Support",
                "email": "support@pytake.net",
                "url": "https://pytake.net",
            },
            "license": {
                "name": "Proprietary",
                "url": "https://pytake.net/license",
            },
        },
        "servers": [
            {
                "url": "http://localhost:8000/api/v1",
                "description": "Local Development",
                "variables": {},
            },
            {
                "url": "https://api-dev.pytake.net/api/v1",
                "description": "Development Environment",
            },
            {
                "url": "https://api-staging.pytake.net/api/v1",
                "description": "Staging Environment",
            },
            {
                "url": "https://api.pytake.net/api/v1",
                "description": "Production Environment",
            },
        ],
        "x-logo": {
            "url": "https://pytake.net/logo.png",
            "altText": "PyTake Logo",
        },
    }


def custom_openapi(app: FastAPI, original_openapi=None):
    """
    Generate custom OpenAPI schema with enhanced documentation
    """
    if app.openapi_schema:
        return app.openapi_schema

    # Get base schema using original openapi method to avoid recursion
    if original_openapi:
        openapi_schema = original_openapi()
    else:
        # Fallback: build schema manually from FastAPI
        from fastapi.openapi.utils import get_openapi
        openapi_schema = get_openapi(
            title=app.title,
            version=app.version,
            description=app.description,
            routes=app.routes,
        )

    # Update with custom schema
    custom = get_openapi_schema()
    openapi_schema["info"] = custom["info"]
    openapi_schema["servers"] = custom["servers"]
    openapi_schema["x-logo"] = custom.get("x-logo")

    # Add security scheme for JWT
    if "components" not in openapi_schema:
        openapi_schema["components"] = {}
    if "securitySchemes" not in openapi_schema["components"]:
        openapi_schema["components"]["securitySchemes"] = {}

    openapi_schema["components"]["securitySchemes"]["bearerAuth"] = {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT",
        "description": "JWT access token obtained from /auth/login or /auth/refresh",
    }

    # Add common response schemas
    if "schemas" not in openapi_schema["components"]:
        openapi_schema["components"]["schemas"] = {}

    openapi_schema["components"]["schemas"]["ErrorResponse"] = {
        "type": "object",
        "properties": {
            "detail": {"type": "string", "example": "Resource not found"},
            "status": {"type": "string", "enum": ["error"], "example": "error"},
            "code": {"type": "integer", "example": 404},
        },
        "required": ["detail", "status", "code"],
    }

    openapi_schema["components"]["schemas"]["SuccessResponse"] = {
        "type": "object",
        "properties": {
            "data": {"type": "object"},
            "status": {"type": "string", "enum": ["success"], "example": "success"},
            "code": {"type": "integer", "example": 200},
            "message": {"type": "string"},
        },
    }

    openapi_schema["components"]["schemas"]["PaginatedResponse"] = {
        "type": "object",
        "properties": {
            "data": {"type": "array"},
            "status": {"type": "string", "example": "success"},
            "code": {"type": "integer", "example": 200},
            "pagination": {
                "type": "object",
                "properties": {
                    "total": {"type": "integer", "example": 100},
                    "skip": {"type": "integer", "example": 0},
                    "limit": {"type": "integer", "example": 10},
                    "pages": {"type": "integer", "example": 10},
                },
            },
        },
    }

    # Add enhanced tag descriptions
    openapi_schema["tags"] = [
        {
            "name": "Authentication",
            "description": "🔐 User authentication, registration, and session management. Includes JWT token generation and refresh.",
        },
        {
            "name": "Organizations",
            "description": "🏢 Multi-tenant organization management. Configure company settings, plans, and limits.",
        },
        {
            "name": "Users",
            "description": "👥 User management within organizations. Manage agents, admins, and user roles.",
        },
        {
            "name": "Contacts",
            "description": "📇 Contact (customer) management. Store and organize customer information, tags, and custom fields.",
        },
        {
            "name": "Conversations",
            "description": "💬 Conversation and messaging management. Handle WhatsApp conversations, messages, and chat history.",
        },
        {
            "name": "Queue",
            "description": "📋 Conversation queue management. Distribute conversations to agents and manage workload.",
        },
        {
            "name": "Queues",
            "description": "🎯 Queue configuration. Create and manage multiple queues per department with priorities and SLA.",
        },
        {
            "name": "Departments",
            "description": "🏬 Department and team management. Organize agents into departments (Sales, Support, Finance).",
        },
        {
            "name": "WhatsApp",
            "description": "📱 WhatsApp Business integration. Connect numbers, manage templates, and handle webhooks.",
        },
        {
            "name": "Chatbots",
            "description": "🤖 AI chatbot management. Create visual flows, nodes, and automated conversation logic.",
        },
        {
            "name": "Campaigns",
            "description": "📢 Bulk messaging campaigns. Schedule and send messages to contact segments.",
        },
        {
            "name": "Analytics",
            "description": "📊 Analytics and reporting. Track metrics, performance, and conversation statistics.",
        },
        {
            "name": "Dashboard",
            "description": "📈 Dashboard summaries. Get aggregated metrics for admin dashboards.",
        },
        {
            "name": "Flow Automations",
            "description": "⚙️ Automated workflow execution. Schedule and trigger automated flows.",
        },
        {
            "name": "Secrets",
            "description": "🔒 Encrypted secrets management. Store API keys, passwords, and sensitive data securely.",
        },
        {
            "name": "Database",
            "description": "🗄️ Database utilities. Execute queries and manage database connections.",
        },
        {
            "name": "AI Assistant",
            "description": "🧠 AI-powered features. Generate flows, get suggestions, and manage AI models (OpenAI, Anthropic).",
        },
        {
            "name": "Agent Skills",
            "description": "⭐ Agent capabilities. Define and manage agent skills and proficiency levels.",
        },
        {
            "name": "WebSocket",
            "description": "🔌 Real-time communication. WebSocket connections for live updates and notifications.",
        },
        {
            "name": "Notifications",
            "description": "🔔 Notification management. Configure preferences and view notification history.",
        },
        {
            "name": "Health",
            "description": "❤️ Service health checks. Monitor API and service status.",
        },
        {
            "name": "Webhooks",
            "description": "🔗 Webhook endpoints. Receive events from external services (Meta, Evolution API).",
        },
    ]

    app.openapi_schema = openapi_schema
    return app.openapi_schema
