"""
Secret Model - Encrypted storage for API keys, passwords, and sensitive data
"""

from datetime import datetime
from enum import Enum
from sqlalchemy import Column, String, UUID, Boolean, Text, Integer, DateTime, ForeignKey
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import text

from app.models.base import Base, TimestampMixin, JSONBCompatible


class SecretScope(str, Enum):
    """Scope of the secret - where it can be used"""
    ORGANIZATION = "organization"  # Available across entire organization
    CHATBOT = "chatbot"            # Only for specific chatbot


class EncryptionProvider(str, Enum):
    """Encryption provider used to encrypt the secret"""
    FERNET = "fernet"      # Internal symmetric encryption (default)
    AWS_KMS = "aws_kms"    # AWS Key Management Service
    VAULT = "vault"        # HashiCorp Vault


class Secret(Base, TimestampMixin):
    """
    Encrypted storage for sensitive data like API keys, passwords, tokens.

    Supports multiple encryption providers:
    - Fernet (default): Internal symmetric encryption
    - AWS KMS: External key management via AWS
    - Vault: External key management via HashiCorp Vault

    Usage:
        # Create secret with Fernet (default)
        secret = Secret(
            organization_id=org_id,
            name="openai_api_key",
            display_name="OpenAI Production Key",
            encrypted_value=encrypted_value,
            scope=SecretScope.ORGANIZATION
        )

        # Create secret with AWS KMS
        secret = Secret(
            organization_id=org_id,
            name="database_password",
            encrypted_value=kms_encrypted_value,
            encryption_provider=EncryptionProvider.AWS_KMS,
            encryption_key_id="arn:aws:kms:us-east-1:123456789012:key/abcd-1234",
            scope=SecretScope.ORGANIZATION
        )
    """

    __tablename__ = "secrets"

    # Primary identification
    id = Column(UUID, primary_key=True, server_default=text("gen_random_uuid()"))
    organization_id = Column(
        UUID,
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    chatbot_id = Column(
        UUID,
        ForeignKey("chatbots.id", ondelete="CASCADE"),
        nullable=True,
        index=True
    )

    # Identification & Description
    name = Column(String(255), nullable=False, index=True)  # Internal name (snake_case)
    display_name = Column(String(255), nullable=False)      # User-friendly name
    description = Column(Text, nullable=True)               # Optional description

    # Encrypted Value
    encrypted_value = Column(Text, nullable=False)  # Base64-encoded encrypted value

    # Encryption Configuration
    encryption_provider = Column(
        SQLEnum(EncryptionProvider, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        server_default=EncryptionProvider.FERNET.value,
        index=True
    )
    encryption_key_id = Column(String(255), nullable=True)  # For AWS KMS ARN, Vault path, etc.
    encryption_metadata = Column(JSONBCompatible, nullable=True)      # Provider-specific metadata

    # Scope & Status
    scope = Column(
        SQLEnum(SecretScope, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        server_default=SecretScope.CHATBOT.value
    )
    is_active = Column(Boolean, nullable=False, server_default=text("true"), index=True)

    # Metadata (note: using 'secret_metadata' to avoid conflict with SQLAlchemy's metadata attribute)
    secret_metadata = Column("metadata", JSONB, nullable=True)  # Tags, categories, etc.

    # Audit & Usage Tracking
    last_used_at = Column(DateTime, nullable=True)
    usage_count = Column(Integer, nullable=False, server_default=text("0"))

    def __repr__(self):
        return f"<Secret(id={self.id}, name={self.name}, provider={self.encryption_provider})>"

    def increment_usage(self):
        """Increment usage counter and update last used timestamp"""
        self.usage_count += 1
        self.last_used_at = datetime.utcnow()
