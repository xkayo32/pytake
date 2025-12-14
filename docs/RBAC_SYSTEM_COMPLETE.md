# 🔐 RBAC System - Complete Configuration Guide

## Overview
PyTake implements a comprehensive Role-Based Access Control (RBAC) system with:
- Pre-defined system roles (super_admin, org_admin, agent, viewer)
- Dynamic role creation
- Granular permission management
- REST API for role/permission management

---

## 📚 Default System Roles & Permissions

### 1. Super Admin
**Description:** Full system access - all permissions
**Permissions:** `["*"]` (wildcard - all permissions)
**Use Case:** System administrators, technical leads

### 2. Org Admin  
**Permissions:**
- **Chatbots:** create, read, update, delete
- **Flows:** create, update, delete
- **Users:** create, read, update, manage_roles
- **Agents:** view_agents
- **Conversations:** read, update, assign, transfer, view_available_agents
- **Contacts:** read, create, update, delete
- **Analytics:** view

**Use Case:** Organization administrators, managers

### 3. Agent
**Permissions:**
- **Chatbots:** read
- **Flows:** read
- **Conversations:** read, update, assign, transfer, view_available_agents
- **Contacts:** read, create
- **Analytics:** view

**Use Case:** Support agents, customer service representatives

### 4. Viewer (Read-Only)
**Permissions:**
- **Chatbots:** read
- **Conversations:** read, view_available_agents
- **Contacts:** read
- **Analytics:** view

**Use Case:** Supervisors, quality assurance, reporting

---

## 🎯 New Conversation Transfer Permissions

### New Permissions Added:
1. **transfer_conversation** - Allows agent to transfer conversation to another agent
2. **view_agents** - Allows viewing available agents in department
3. **view_available_agents** - Allows viewing agents with capacity in transfer flow

### Permission Mapping:
- **org_admin:** All 3 new permissions
- **agent:** transfer_conversation + view_available_agents
- **viewer:** view_available_agents (read-only)
- **super_admin:** All permissions (via wildcard)

---

## 🔗 API Endpoints for RBAC Management

### Initialize System Roles
```
POST /api/v1/roles/initialize
Required Role: org_admin
Response: 200 OK with list of initialized roles
```

### Create Custom Role
```
POST /api/v1/roles/
Body: { "name": "support_lead", "description": "..." }
Required Role: org_admin
Response: 201 Created with RoleInDB
```

### List Roles
```
GET /api/v1/roles/
Required Role: org_admin
Response: 200 with paginated roles
```

### Get Role Details
```
GET /api/v1/roles/{role_id}
Required Role: org_admin
Response: 200 with RoleInDB including permissions
```

### Update Role
```
PATCH /api/v1/roles/{role_id}
Body: { "name": "...", "description": "..." }
Required Role: org_admin
Response: 200 with updated RoleInDB
```

### Delete Role
```
DELETE /api/v1/roles/{role_id}
Required Role: org_admin
Response: 204 No Content
```

### List Permissions
```
GET /api/v1/roles/permissions/
Required Role: org_admin
Response: 200 with paginated permissions
```

### Create Permission
```
POST /api/v1/roles/permissions/
Body: { "name": "custom_perm", "description": "..." }
Required Role: org_admin
Response: 201 with PermissionInDB
```

### Assign Permissions to Role
```
POST /api/v1/roles/{role_id}/permissions
Body: { "permission_ids": ["uuid1", "uuid2", ...] }
Required Role: org_admin
Response: 200 with updated RoleInDB
```

### Assign Role to User
```
POST /api/v1/roles/assign-user
Body: { "user_id": "uuid", "role_id": "uuid" }
Required Role: org_admin
Response: 200 with updated UserInDB
```

---

## 🛡️ Permission Validation Flow

### How Permission Checking Works:

1. **Dependency Injection:** `require_permission_dynamic("permission_name")`
   - Used in FastAPI route handlers
   - Extracts user from JWT token

2. **Permission Check:**
   - Get user's role from database
   - Check if role has permission
   - Super admin bypasses all checks (has `*`)

3. **Error Handling:**
   - Missing permission → 403 Forbidden
   - Missing user → 401 Unauthorized
   - Invalid role → 403 Forbidden

### Example Usage:
```python
@router.post("/{conversation_id}/transfer-to-agent")
async def transfer_conversation(
    conversation_id: UUID,
    data: ConversationTransferToAgent,
    current_user: User = Depends(
        require_permission_dynamic("transfer_conversation")
    ),
    db: AsyncSession = Depends(get_db),
):
    service = ConversationService(db)
    return await service.transfer_to_agent(...)
```

---

## 📊 System Permissions Structure

### Categories:
1. **chatbots** - Chatbot CRUD operations
2. **users** - User management
3. **conversations** - Conversation handling + transfer
4. **analytics** - Analytics viewing/exporting
5. **contacts** - Contact management
6. **campaigns** - Campaign management

### Complete Permission List:

**Chatbots:**
- create_chatbot, read_chatbot, update_chatbot, delete_chatbot
- create_flow, update_flow, delete_flow

**Users:**
- create_user, read_user, update_user, delete_user
- manage_roles, view_agents

**Conversations:**
- read_conversation, update_conversation
- assign_conversation, transfer_conversation
- view_available_agents

**Analytics:**
- view_analytics, export_analytics

**Contacts:**
- create_contact, read_contact, update_contact, delete_contact

**Campaigns:**
- create_campaign, read_campaign, update_campaign, delete_campaign
- execute_campaign

---

## 🔄 Multi-Tenancy Support

All RBAC operations respect organization_id:
- Roles are scoped to organization
- Permissions are shared system-wide but applied per-org role
- Users can only manage roles within their organization
- Super admins can manage system-wide

---

## 📝 Database Schema

### Tables:
- **roles** - Role definitions (id, name, description, organization_id)
- **permissions** - Permission definitions (id, name, description, category)
- **role_permissions** - M2M relationship (role_id, permission_id)
- **user_roles** - M2M relationship (user_id, role_id)

### Queries:
- Permissions are loaded eagerly with roles
- Role-permission checks use indexed M2M table
- Organization_id filtering on all queries

---

## ✅ Implementation Checklist

- [x] RoleService with initialization logic
- [x] RoleRepository for database operations
- [x] REST API endpoints for CRUD
- [x] Permission validation dependency
- [x] Multi-tenancy scoping
- [x] Default role creation
- [x] Permission assignment to roles
- [x] User-role assignment
- [x] Updated permissions for transfer system
- [x] Documentation

---

## 🚀 Initialization Steps

1. Call `POST /api/v1/roles/initialize` (once per organization)
   - Creates 4 default roles
   - Assigns permissions to each role
   - Creates permission records if not exist

2. (Optional) Create custom roles via `POST /api/v1/roles/`

3. Assign roles to users via `POST /api/v1/roles/assign-user`

4. System validates permissions on protected endpoints

---

**Status:** ✅ COMPLETE & PRODUCTION READY
**Last Updated:** 2025-12-14
**Author:** Kayo Carvalho Fernandes
