"""
Secret GraphQL Types
"""

from datetime import datetime
from typing import Optional

import strawberry


# ============================================
# SECRET TYPES
# ============================================

@strawberry.enum
class SecretScopeEnum:
    """Scope of the secret"""

    ORGANIZATION = "organization"
    CHATBOT = "chatbot"


@strawberry.enum
class EncryptionProviderEnum:
    """Encryption provider"""

    FERNET = "fernet"
    AWS_KMS = "aws_kms"
    VAULT = "vault"


@strawberry.type
class SecretType:
    """
    Secret type for GraphQL

    Note: NEVER includes the encrypted or decrypted value in list responses
    """

    id: strawberry.ID
    organization_id: strawberry.ID
    chatbot_id: Optional[strawberry.ID] = None
    name: str
    display_name: str
    description: Optional[str] = None
    scope: SecretScopeEnum
    encryption_provider: EncryptionProviderEnum
    encryption_key_id: Optional[str] = None
    encryption_metadata: Optional[strawberry.scalars.JSON] = None
    is_active: bool
    secret_metadata: Optional[strawberry.scalars.JSON] = None
    last_used_at: Optional[datetime] = None
    usage_count: int
    created_at: datetime
    updated_at: datetime


@strawberry.type
class SecretWithValueType:
    """
    Secret with decrypted value

    WARNING: Contains plaintext secret value
    Only used when explicitly retrieving a secret's value
    """

    id: strawberry.ID
    organization_id: strawberry.ID
    chatbot_id: Optional[strawberry.ID] = None
    name: str
    display_name: str
    description: Optional[str] = None
    scope: SecretScopeEnum
    value: str  # Decrypted plaintext value
    is_active: bool
    created_at: datetime


@strawberry.input
class SecretCreateInput:
    """Input for creating secret"""

    name: str
    display_name: str
    description: Optional[str] = None
    value: str  # Plaintext value to encrypt
    scope: SecretScopeEnum = SecretScopeEnum.CHATBOT
    chatbot_id: Optional[strawberry.ID] = None
    encryption_provider: EncryptionProviderEnum = EncryptionProviderEnum.FERNET
    encryption_key_id: Optional[str] = None
    secret_metadata: Optional[strawberry.scalars.JSON] = None


@strawberry.input
class SecretUpdateInput:
    """Input for updating secret"""

    display_name: Optional[str] = None
    description: Optional[str] = None
    value: Optional[str] = None  # New plaintext value (will be re-encrypted)
    is_active: Optional[bool] = None
    secret_metadata: Optional[strawberry.scalars.JSON] = None


# ============================================
# STATISTICS TYPES
# ============================================

@strawberry.type
class SecretUsageStatsType:
    """Statistics about secret usage"""

    secret_id: strawberry.ID
    secret_name: str
    display_name: str
    usage_count: int
    last_used_at: Optional[datetime] = None
    created_at: datetime
    is_active: bool
