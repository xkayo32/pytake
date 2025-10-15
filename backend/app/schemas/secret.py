"""
Secret Schemas - Pydantic models for API requests/responses
"""

from datetime import datetime
from typing import Optional, Dict, Any
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.models.secret import SecretScope, EncryptionProvider


class SecretBase(BaseModel):
    """Base schema with common fields"""
    name: str = Field(
        ...,
        min_length=1,
        max_length=255,
        pattern="^[a-z0-9_]+$",
        description="Internal name (snake_case, alphanumeric + underscore only)"
    )
    display_name: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="User-friendly display name"
    )
    description: Optional[str] = Field(
        None,
        description="Optional description"
    )
    scope: SecretScope = Field(
        default=SecretScope.CHATBOT,
        description="Secret scope (organization or chatbot)"
    )
    secret_metadata: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Optional metadata (tags, categories, etc.)"
    )

    @field_validator('name')
    @classmethod
    def validate_name(cls, v: str) -> str:
        """Ensure name is lowercase snake_case"""
        if not v.replace('_', '').replace('-', '').isalnum():
            raise ValueError("Name must contain only letters, numbers, and underscores")
        return v.lower()


class SecretCreate(SecretBase):
    """Schema for creating a new secret"""
    value: str = Field(
        ...,
        min_length=1,
        description="Plaintext value to encrypt (never stored unencrypted)"
    )
    chatbot_id: Optional[UUID] = Field(
        None,
        description="Chatbot UUID (required if scope is CHATBOT)"
    )
    encryption_provider: EncryptionProvider = Field(
        default=EncryptionProvider.FERNET,
        description="Encryption provider to use"
    )
    encryption_key_id: Optional[str] = Field(
        None,
        description="External key ID (for AWS KMS, Vault, etc.)"
    )

    @field_validator('chatbot_id')
    @classmethod
    def validate_chatbot_id(cls, v: Optional[UUID], info) -> Optional[UUID]:
        """Ensure chatbot_id is provided when scope is CHATBOT"""
        values = info.data
        if values.get('scope') == SecretScope.CHATBOT and not v:
            raise ValueError("chatbot_id required when scope is CHATBOT")
        return v


class SecretUpdate(BaseModel):
    """Schema for updating a secret"""
    display_name: Optional[str] = Field(
        None,
        min_length=1,
        max_length=255,
        description="New display name"
    )
    description: Optional[str] = Field(
        None,
        description="New description"
    )
    value: Optional[str] = Field(
        None,
        min_length=1,
        description="New plaintext value (will be re-encrypted)"
    )
    is_active: Optional[bool] = Field(
        None,
        description="Active status"
    )
    secret_metadata: Optional[Dict[str, Any]] = Field(
        None,
        description="New metadata"
    )


class SecretRotateKey(BaseModel):
    """Schema for rotating encryption key"""
    new_encryption_provider: Optional[EncryptionProvider] = Field(
        None,
        description="New encryption provider (optional)"
    )
    new_key_id: Optional[str] = Field(
        None,
        description="New key ID (optional)"
    )


class SecretInDB(SecretBase):
    """Schema for secret in database (includes system fields, no decrypted value)"""
    id: UUID
    organization_id: UUID
    chatbot_id: Optional[UUID] = None

    # Encryption configuration
    encryption_provider: EncryptionProvider
    encryption_key_id: Optional[str] = None
    encryption_metadata: Optional[Dict[str, Any]] = None

    # Status
    is_active: bool

    # Audit
    last_used_at: Optional[datetime] = None
    usage_count: int

    # Timestamps
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SecretWithoutValue(SecretInDB):
    """
    Public schema for listing secrets.

    Never includes the encrypted_value or decrypted value.
    Used in list endpoints and responses.
    """
    pass


class SecretWithDecryptedValue(SecretInDB):
    """
    Schema with decrypted value (only used internally, never in API responses).

    Used temporarily when retrieving decrypted value for use in flows.
    """
    decrypted_value: str = Field(
        ...,
        description="Decrypted plaintext value (INTERNAL USE ONLY)"
    )


class SecretListResponse(BaseModel):
    """Response for listing secrets"""
    items: list[SecretWithoutValue]
    total: int


class SecretValidationResponse(BaseModel):
    """Response for secret validation"""
    is_valid: bool
    message: Optional[str] = None


class SecretUsageStats(BaseModel):
    """Statistics about secret usage"""
    secret_id: UUID
    secret_name: str
    display_name: str
    usage_count: int
    last_used_at: Optional[datetime]
    created_at: datetime
    is_active: bool


# Export all schemas
__all__ = [
    'SecretBase',
    'SecretCreate',
    'SecretUpdate',
    'SecretRotateKey',
    'SecretInDB',
    'SecretWithoutValue',
    'SecretWithDecryptedValue',
    'SecretListResponse',
    'SecretValidationResponse',
    'SecretUsageStats',
]
