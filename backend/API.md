# PyTake API Documentation

## Base URL
```
http://localhost:8000/api/v1
```

## Authentication

All endpoints (except register and login) require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <access_token>
```

---

## 1. Authentication Endpoints

### Register
```http
POST /auth/register
Content-Type: application/json

{
  "email": "admin@company.com",
  "password": "SecurePass123!",
  "full_name": "Admin User",
  "organization_name": "My Company"
}
```

**Response:**
```json
{
  "user": { "id": "...", "email": "...", "role": "org_admin" },
  "token": {
    "access_token": "eyJ...",
    "refresh_token": "eyJ...",
    "token_type": "bearer",
    "expires_in": 900
  }
}
```

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "admin@company.com",
  "password": "SecurePass123!"
}
```

### Refresh Token
```http
POST /auth/refresh
Content-Type: application/json

{
  "refresh_token": "eyJ..."
}
```

### Get Current User
```http
GET /auth/me
Authorization: Bearer <token>
```

---

## 2. Organizations Endpoints

### Get My Organization
```http
GET /organizations/me
Authorization: Bearer <token>
```

### Update My Organization
```http
PUT /organizations/me
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Company Name",
  "website": "https://company.com"
}
```

### Update Organization Settings
```http
PUT /organizations/me/settings
Authorization: Bearer <token>
Content-Type: application/json

{
  "business_hours": {
    "monday": { "start": "09:00", "end": "18:00" }
  },
  "timezone": "America/Sao_Paulo"
}
```

---

## 3. Users Endpoints

### List Users
```http
GET /users/?skip=0&limit=100
Authorization: Bearer <token>
```

**Query Parameters:**
- `skip` (optional): Pagination offset
- `limit` (optional): Max 100
- `role` (optional): Filter by role (org_admin, agent, viewer)
- `is_active` (optional): Filter by active status

### Create User
```http
POST /users/
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "agent@company.com",
  "password": "SecurePass123!",
  "full_name": "Agent Name",
  "role": "agent"
}
```

### Get User
```http
GET /users/{user_id}
Authorization: Bearer <token>
```

### Update User
```http
PUT /users/{user_id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "full_name": "Updated Name",
  "role": "org_admin"
}
```

### Deactivate User
```http
POST /users/{user_id}/deactivate
Authorization: Bearer <token>
```

---

## 4. Contacts Endpoints

### List Contacts
```http
GET /contacts/?skip=0&limit=100
Authorization: Bearer <token>
```

**Query Parameters:**
- `query` (optional): Search by name, email, phone, company
- `assigned_agent_id` (optional): Filter by assigned agent
- `is_blocked` (optional): Filter blocked contacts

### Create Contact
```http
POST /contacts/
Authorization: Bearer <token>
Content-Type: application/json

{
  "whatsapp_id": "+5511999887766",
  "name": "João Silva",
  "email": "joao@email.com",
  "company": "Test Corp"
}
```

### Get Contact
```http
GET /contacts/{contact_id}
Authorization: Bearer <token>
```

### Update Contact
```http
PUT /contacts/{contact_id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Name",
  "company": "New Company"
}
```

### Block Contact
```http
POST /contacts/{contact_id}/block?reason=Spam
Authorization: Bearer <token>
```

### Add Tags
```http
POST /contacts/{contact_id}/tags
Authorization: Bearer <token>
Content-Type: application/json

["tag-id-1", "tag-id-2"]
```

---

## 5. Tags Endpoints

### List Tags
```http
GET /contacts/tags/
Authorization: Bearer <token>
```

### Create Tag
```http
POST /contacts/tags/
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "VIP",
  "color": "#FF5733"
}
```

---

## 6. Conversations Endpoints

### List Conversations
```http
GET /conversations/?skip=0&limit=100
Authorization: Bearer <token>
```

**Query Parameters:**
- `status` (optional): open, pending, resolved, closed
- `assigned_to_me` (optional): true/false

### Create Conversation
```http
POST /conversations/
Authorization: Bearer <token>
Content-Type: application/json

{
  "contact_id": "contact-uuid",
  "whatsapp_number_id": "whatsapp-uuid",
  "initial_message": {
    "content": "Hello! How can I help you?"
  }
}
```

### Get Conversation
```http
GET /conversations/{conversation_id}
Authorization: Bearer <token>
```

### Update Conversation
```http
PUT /conversations/{conversation_id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "resolved",
  "assigned_agent_id": "agent-uuid"
}
```

### Get Messages
```http
GET /conversations/{conversation_id}/messages?skip=0&limit=100
Authorization: Bearer <token>
```

### Send Message
```http
POST /conversations/{conversation_id}/messages
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Thank you for contacting us!",
  "media_url": null
}
```

### Mark as Read
```http
POST /conversations/{conversation_id}/read
Authorization: Bearer <token>
```

---

## 7. WhatsApp Numbers Endpoints

### List WhatsApp Numbers
```http
GET /whatsapp/
Authorization: Bearer <token>
```

### Register WhatsApp Number
```http
POST /whatsapp/
Authorization: Bearer <token>
Content-Type: application/json

{
  "phone_number": "+5511987654321",
  "display_name": "Support Line",
  "business_profile": {
    "description": "Customer Support"
  }
}
```

### Get WhatsApp Number
```http
GET /whatsapp/{number_id}
Authorization: Bearer <token>
```

### Update WhatsApp Number
```http
PUT /whatsapp/{number_id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "display_name": "Updated Name",
  "is_active": true
}
```

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "error": {
    "code": 404,
    "message": "Resource not found",
    "type": "http_error"
  }
}
```

**Common Status Codes:**
- `200` - Success
- `201` - Created
- `204` - No Content
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `422` - Validation Error
- `500` - Internal Server Error

---

## Rate Limiting

Currently no rate limiting is enforced. In production, implement rate limiting per organization/user.

---

## Pagination

All list endpoints support pagination:
- `skip`: Number of records to skip (default: 0)
- `limit`: Max records to return (default: 100, max: 100)

---

## Multi-tenancy

All data is scoped by `organization_id`. Users can only access data within their organization.

---

## Roles & Permissions

- **super_admin**: Full access to all organizations
- **org_admin**: Full access within their organization
- **agent**: Can manage contacts, conversations, messages
- **viewer**: Read-only access

---

## WebSocket (Coming Soon)

Real-time updates for conversations and messages will be available via WebSocket connection.

```
ws://localhost:8000/ws/conversations?token=<access_token>
```
