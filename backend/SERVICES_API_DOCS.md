# Services API Documentation

## Overview

REST API endpoints for accessing MongoDB data:
- Audit logs (user actions, compliance)
- Analytics metrics (daily/hourly stats)
- Message history (WhatsApp conversations, search)

All endpoints require JWT authentication and organization context.

---

## Audit Logs API

### List Audit Logs

```
GET /api/v1/audit-logs/
```

**Parameters:**
- `limit` (int, default: 100) - Number of logs to return
- `user_id` (string, optional) - Filter by user ID
- `action` (string, optional) - Filter by action (create, update, delete, etc)

**Response:**
```json
{
  "success": true,
  "count": 25,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "organization_id": "550e8400-e29b-41d4-a716-446655440000",
      "user_id": "660e8400-e29b-41d4-a716-446655440001",
      "action": "execute",
      "resource_type": "campaign",
      "resource_id": "770e8400-e29b-41d4-a716-446655440002",
      "changes": {
        "status": "executed"
      },
      "ip_address": "192.168.1.100",
      "user_agent": "Mozilla/5.0...",
      "created_at": "2026-01-27T10:30:00.000000+00:00"
    }
  ]
}
```

### Get User Activity

```
GET /api/v1/audit-logs/user-activity/
```

**Parameters:**
- `user_id` (string, default: current user) - User to get activity for
- `days` (int, default: 7) - Days to look back
- `limit` (int, default: 100) - Max results

**Response:**
```json
{
  "success": true,
  "user_id": "660e8400-e29b-41d4-a716-446655440001",
  "days": 7,
  "count": 45,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "action": "create",
      "resource_type": "campaign",
      "resource_id": "770e8400-e29b-41d4-a716-446655440002",
      "created_at": "2026-01-27T10:30:00.000000+00:00"
    }
  ]
}
```

### Get Resource History

```
GET /api/v1/audit-logs/resource-history/
```

**Parameters:**
- `resource_id` (string, required) - Resource to get history for
- `limit` (int, default: 50) - Max results

**Example:**
```
GET /api/v1/audit-logs/resource-history/?resource_id=770e8400-e29b-41d4-a716-446655440002
```

**Response:**
```json
{
  "success": true,
  "resource_id": "770e8400-e29b-41d4-a716-446655440002",
  "count": 12,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "action": "create",
      "user_id": "660e8400-e29b-41d4-a716-446655440001",
      "changes": { "status": "draft" },
      "created_at": "2026-01-27T08:00:00.000000+00:00"
    },
    {
      "_id": "507f1f77bcf86cd799439012",
      "action": "update",
      "user_id": "660e8400-e29b-41d4-a716-446655440001",
      "changes": { "status": "published" },
      "created_at": "2026-01-27T09:00:00.000000+00:00"
    }
  ]
}
```

---

## Analytics API

### Get Daily Stats

```
GET /api/v1/analytics/daily/
```

**Parameters:**
- `metric_type` (string, default: messages_sent) - Metric to get stats for
- `days` (int, default: 30) - Number of days to aggregate

**Available Metrics:**
- `messages_sent` - Total WhatsApp messages sent
- `campaigns_executed` - Total campaigns executed
- `conversations_closed` - Total conversations closed
- `contacts_created` - Total new contacts created
- `agents_online` - Number of online agents

**Example:**
```
GET /api/v1/analytics/daily/?metric_type=messages_sent&days=30
```

**Response:**
```json
{
  "success": true,
  "metric_type": "messages_sent",
  "period": "last_30_days",
  "count": 30,
  "data": [
    {
      "date": "2025-12-28",
      "total": 1500,
      "count": 12,
      "average": 125.0
    },
    {
      "date": "2025-12-29",
      "total": 2300,
      "count": 18,
      "average": 127.78
    }
  ]
}
```

### Get Hourly Stats

```
GET /api/v1/analytics/hourly/
```

**Parameters:**
- `metric_type` (string, default: campaigns_executed) - Metric to get stats for
- `hours` (int, default: 24) - Number of hours to aggregate

**Example:**
```
GET /api/v1/analytics/hourly/?metric_type=campaigns_executed&hours=24
```

**Response:**
```json
{
  "success": true,
  "metric_type": "campaigns_executed",
  "period": "last_24_hours",
  "count": 24,
  "data": [
    {
      "hour": "2026-01-26 23:00",
      "total": 45
    },
    {
      "hour": "2026-01-27 00:00",
      "total": 62
    }
  ]
}
```

### Get Available Metrics

```
GET /api/v1/analytics/metrics/
```

**Response:**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "id": "messages_sent",
      "label": "Messages Sent",
      "description": "Total WhatsApp messages sent",
      "type": "counter"
    },
    {
      "id": "campaigns_executed",
      "label": "Campaigns Executed",
      "description": "Total campaigns executed",
      "type": "counter"
    },
    {
      "id": "conversations_closed",
      "label": "Conversations Closed",
      "description": "Total conversations closed",
      "type": "gauge"
    },
    {
      "id": "contacts_created",
      "label": "Contacts Created",
      "description": "Total new contacts created",
      "type": "counter"
    },
    {
      "id": "agents_online",
      "label": "Agents Online",
      "description": "Number of online agents",
      "type": "gauge"
    }
  ]
}
```

---

## Message History API

### Get Conversation History

```
GET /api/v1/message-history/conversation/
```

**Parameters:**
- `conversation_id` (string, required) - Conversation to get history for
- `limit` (int, default: 50) - Max messages to return

**Example:**
```
GET /api/v1/message-history/conversation/?conversation_id=880e8400-e29b-41d4-a716-446655440003
```

**Response:**
```json
{
  "success": true,
  "conversation_id": "880e8400-e29b-41d4-a716-446655440003",
  "count": 50,
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "sender_id": "660e8400-e29b-41d4-a716-446655440001",
      "receiver_id": "990e8400-e29b-41d4-a716-446655440004",
      "content": "Hello, how can I help?",
      "type": "text",
      "status": "delivered",
      "media_url": null,
      "created_at": "2026-01-27T10:30:00.000000+00:00"
    },
    {
      "id": "507f1f77bcf86cd799439012",
      "sender_id": "990e8400-e29b-41d4-a716-446655440004",
      "receiver_id": "660e8400-e29b-41d4-a716-446655440001",
      "content": "I need help with my order",
      "type": "text",
      "status": "read",
      "media_url": null,
      "created_at": "2026-01-27T10:31:00.000000+00:00"
    }
  ]
}
```

### Search Messages

```
GET /api/v1/message-history/search/
```

**Parameters:**
- `q` (string, required) - Search query (supports AND, OR, NOT operators)
- `limit` (int, default: 20) - Max results

**Example:**
```
GET /api/v1/message-history/search/?q=help%20OR%20support&limit=20
```

**Response:**
```json
{
  "success": true,
  "query": "help OR support",
  "count": 18,
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "conversation_id": "880e8400-e29b-41d4-a716-446655440003",
      "content": "I need help with my order",
      "type": "text",
      "created_at": "2026-01-27T10:31:00.000000+00:00",
      "score": 1.25
    },
    {
      "id": "507f1f77bcf86cd799439012",
      "conversation_id": "880e8400-e29b-41d4-a716-446655440003",
      "content": "Please provide support for this issue",
      "type": "text",
      "created_at": "2026-01-27T11:00:00.000000+00:00",
      "score": 1.15
    }
  ]
}
```

---

## Common Response Format

All endpoints follow this response format:

**Success:**
```json
{
  "success": true,
  "data": { /* endpoint-specific data */ },
  /* additional fields per endpoint */
}
```

**Error:**
```json
{
  "success": false,
  "message": "Error description"
}
```

---

## Authentication

All endpoints require JWT token in `Authorization` header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

To get a token:
```bash
curl -X POST http://localhost:8000/api/v1/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

---

## Examples

### Get campaigns executed in last 7 days

```bash
curl http://localhost:8000/api/v1/analytics/daily/ \
  -H "Authorization: Bearer $TOKEN" \
  -d 'metric_type=campaigns_executed&days=7'
```

### Get user's activity in last 30 days

```bash
curl http://localhost:8000/api/v1/audit-logs/user-activity/ \
  -H "Authorization: Bearer $TOKEN" \
  -d 'days=30&limit=100'
```

### Get conversation history

```bash
curl http://localhost:8000/api/v1/message-history/conversation/ \
  -H "Authorization: Bearer $TOKEN" \
  -d 'conversation_id=880e8400-e29b-41d4-a716-446655440003&limit=50'
```

### Search messages

```bash
curl http://localhost:8000/api/v1/message-history/search/ \
  -H "Authorization: Bearer $TOKEN" \
  -G -d 'q=help&limit=20'
```

---

## Error Handling

### Missing Required Parameter

```json
{
  "success": false,
  "message": "conversation_id is required"
}
```

Status: `400 Bad Request`

### MongoDB Connection Error

```json
{
  "success": false,
  "message": "[Errno 111] Connection refused"
}
```

Status: `500 Internal Server Error`

### Unauthorized

```json
{
  "detail": "Authentication credentials were not provided."
}
```

Status: `401 Unauthorized`

---

## Rate Limiting

APIs are subject to rate limiting:
- **Per User**: 100 requests/hour
- **Per Organization**: 10,000 requests/hour
- **Per Endpoint**: Custom limits per endpoint

Rate limit info in response headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 85
X-RateLimit-Reset: 1642070400
```

