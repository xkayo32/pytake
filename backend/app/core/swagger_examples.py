"""
FastAPI endpoint decorators for enhanced Swagger documentation
Provides examples, response codes, and detailed descriptions
"""

from typing import Dict, Any, List, Optional
from fastapi import status
from pydantic import BaseModel


class ResponseExample:
    """Helper class for defining response examples in OpenAPI schema"""

    @staticmethod
    def success_response(
        summary: str,
        example: Dict[str, Any],
        status_code: int = 200,
    ) -> Dict[str, Any]:
        """Generate success response example"""
        return {
            status_code: {
                "description": summary,
                "content": {
                    "application/json": {
                        "example": example,
                    }
                },
            }
        }

    @staticmethod
    def error_response(
        status_code: int,
        message: str,
        example: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Generate error response example"""
        if example is None:
            example = {
                "detail": message,
                "status": "error",
                "code": status_code,
            }

        return {
            status_code: {
                "description": message,
                "content": {
                    "application/json": {
                        "example": example,
                    }
                },
            }
        }


# ============================================
# RESPONSE EXAMPLES
# ============================================

AUTH_EXAMPLES = {
    "login_success": {
        "user": {
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "email": "user@example.com",
            "full_name": "John Doe",
            "organization_id": "660e8400-e29b-41d4-a716-446655440000",
            "role": "org_admin",
            "is_active": True,
            "created_at": "2025-11-30T10:00:00Z",
        },
        "token": {
            "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            "token_type": "bearer",
            "expires_in": 3600,
        },
        "message": "Login successful",
    },
    "register_success": {
        "user": {
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "email": "newuser@example.com",
            "full_name": "Jane Doe",
            "organization_id": "660e8400-e29b-41d4-a716-446655440000",
            "role": "org_admin",
            "is_active": True,
            "created_at": "2025-11-30T10:00:00Z",
        },
        "token": {
            "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            "token_type": "bearer",
            "expires_in": 3600,
        },
        "message": "Registration successful. Please verify your email.",
    },
    "invalid_credentials": {
        "detail": "Invalid email or password",
        "status": "error",
        "code": 401,
    },
    "user_not_found": {
        "detail": "User not found",
        "status": "error",
        "code": 404,
    },
}

CONTACT_EXAMPLES = {
    "contact_created": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "organization_id": "660e8400-e29b-41d4-a716-446655440000",
        "whatsapp_id": "5511987654321",
        "name": "John Doe",
        "email": "john@example.com",
        "phone_number": "+55 11 98765-4321",
        "company": "ACME Corp",
        "job_title": "Manager",
        "notes": "Important contact",
        "avatar_url": "https://example.com/avatar.jpg",
        "lifecycle_stage": "customer",
        "opt_in": True,
        "is_blocked": False,
        "is_vip": False,
        "assigned_agent_id": None,
        "assigned_department_id": None,
        "created_at": "2025-11-30T10:00:00Z",
        "updated_at": "2025-11-30T10:00:00Z",
        "tags": ["customer", "important"],
    },
    "contacts_list": [
        {
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "whatsapp_id": "5511987654321",
            "name": "John Doe",
            "email": "john@example.com",
            "company": "ACME Corp",
            "lifecycle_stage": "customer",
            "is_vip": False,
            "created_at": "2025-11-30T10:00:00Z",
        },
        {
            "id": "550e8400-e29b-41d4-a716-446655440001",
            "whatsapp_id": "5511987654322",
            "name": "Jane Smith",
            "email": "jane@example.com",
            "company": "Tech Inc",
            "lifecycle_stage": "lead",
            "is_vip": True,
            "created_at": "2025-11-29T15:30:00Z",
        },
    ],
    "contact_not_found": {
        "detail": "Contact not found",
        "status": "error",
        "code": 404,
    },
}

CONVERSATION_EXAMPLES = {
    "conversation_created": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "organization_id": "660e8400-e29b-41d4-a716-446655440000",
        "contact_id": "770e8400-e29b-41d4-a716-446655440000",
        "whatsapp_number_id": "880e8400-e29b-41d4-a716-446655440000",
        "status": "active",
        "assigned_agent_id": None,
        "assigned_department_id": None,
        "last_message_at": "2025-11-30T10:00:00Z",
        "unread_count": 0,
        "created_at": "2025-11-30T10:00:00Z",
        "updated_at": "2025-11-30T10:00:00Z",
    },
    "conversations_list": [
        {
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "contact_id": "770e8400-e29b-41d4-a716-446655440000",
            "contact": {"name": "John Doe", "whatsapp_id": "5511987654321"},
            "status": "active",
            "unread_count": 3,
            "last_message_at": "2025-11-30T10:00:00Z",
        },
    ],
}

MESSAGE_EXAMPLES = {
    "message_sent": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "conversation_id": "770e8400-e29b-41d4-a716-446655440000",
        "sender": "agent",
        "text": "Hello! How can I help you?",
        "media_url": None,
        "media_type": None,
        "direction": "outbound",
        "status": "delivered",
        "read_at": None,
        "created_at": "2025-11-30T10:00:00Z",
    },
    "message_received": {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "conversation_id": "770e8400-e29b-41d4-a716-446655440000",
        "sender": "contact",
        "text": "Hi! I need help with my order",
        "media_url": None,
        "media_type": None,
        "direction": "inbound",
        "status": "received",
        "read_at": None,
        "created_at": "2025-11-30T09:55:00Z",
    },
}

FLOW_EXAMPLES = {
    "flow_created": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "organization_id": "660e8400-e29b-41d4-a716-446655440000",
        "name": "Welcome Flow",
        "description": "Send welcome message to new contacts",
        "trigger": "contact_created",
        "conditions": [],
        "actions": [
            {
                "id": "action_1",
                "type": "send_message",
                "text": "Welcome to our service!",
                "delay_seconds": 0,
            }
        ],
        "enabled": True,
        "execution_count": 0,
        "created_at": "2025-11-30T10:00:00Z",
        "updated_at": "2025-11-30T10:00:00Z",
    },
    "flows_list": [
        {
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "name": "Welcome Flow",
            "trigger": "contact_created",
            "enabled": True,
            "execution_count": 25,
        },
        {
            "id": "550e8400-e29b-41d4-a716-446655440001",
            "name": "Support Flow",
            "trigger": "message_received",
            "enabled": True,
            "execution_count": 143,
        },
    ],
}

WHATSAPP_EXAMPLES = {
    "connection_created": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "organization_id": "660e8400-e29b-41d4-a716-446655440000",
        "phone_number": "5511987654321",
        "business_account_id": "123456789",
        "access_token": "EAA***",
        "webhook_token": "secure_token_xyz",
        "status": "connected",
        "is_primary": True,
        "message_count_monthly": 0,
        "message_count_limit": 1000,
        "connected_at": "2025-11-30T10:00:00Z",
        "last_activity_at": "2025-11-30T10:00:00Z",
    },
    "webhook_received": {
        "object": "whatsapp_business_account",
        "entry": [
            {
                "id": "123456789",
                "changes": [
                    {
                        "value": {
                            "messages": [
                                {
                                    "from": "5511987654321",
                                    "id": "wamid.xxx",
                                    "timestamp": "1630701234",
                                    "text": {"body": "Hello!"},
                                    "type": "text",
                                }
                            ],
                            "metadata": {
                                "display_phone_number": "5511987654322",
                                "phone_number_id": "123456789",
                            },
                        },
                        "field": "messages",
                    }
                ],
            }
        ],
    },
}

ERROR_EXAMPLES = {
    "unauthorized": {
        "detail": "Not authenticated",
        "status": "error",
        "code": 401,
    },
    "forbidden": {
        "detail": "Not authorized to access this resource",
        "status": "error",
        "code": 403,
    },
    "not_found": {
        "detail": "Resource not found",
        "status": "error",
        "code": 404,
    },
    "rate_limit": {
        "detail": "Too many requests. Please try again later.",
        "status": "error",
        "code": 429,
        "retry_after": 60,
    },
    "validation_error": {
        "detail": "Validation failed",
        "status": "error",
        "code": 422,
        "errors": [
            {
                "loc": ["body", "email"],
                "msg": "Invalid email address",
                "type": "value_error",
            }
        ],
    },
    "server_error": {
        "detail": "Internal server error",
        "status": "error",
        "code": 500,
    },
}
