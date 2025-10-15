"""
Secret Service - Business logic for secrets management

Handles encryption/decryption using the configured provider and
manages the lifecycle of secrets.
"""

import logging
from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.secret import SecretRepository
from app.models.secret import Secret, SecretScope, EncryptionProvider
from app.core.encryption import get_encryption_provider
from app.core.encryption.base import EncryptionError, DecryptionError

logger = logging.getLogger(__name__)


class SecretService:
    """
    Service for managing encrypted secrets.

    Provides high-level operations for creating, updating, and retrieving secrets
    with automatic encryption/decryption.
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repository = SecretRepository(Secret, db)

    async def create_secret(
        self,
        organization_id: UUID,
        name: str,
        display_name: str,
        value: str,
        scope: SecretScope = SecretScope.CHATBOT,
        chatbot_id: Optional[UUID] = None,
        description: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        encryption_provider: EncryptionProvider = EncryptionProvider.FERNET,
        encryption_key_id: Optional[str] = None
    ) -> Secret:
        """
        Create a new secret with encrypted value.

        Args:
            organization_id: Organization UUID
            name: Internal name (snake_case)
            display_name: User-friendly name
            value: Plaintext value to encrypt
            scope: Secret scope (organization or chatbot)
            chatbot_id: Chatbot UUID (required if scope is CHATBOT)
            description: Optional description
            metadata: Optional metadata dict
            encryption_provider: Provider to use for encryption
            encryption_key_id: Optional key ID for external providers

        Returns:
            Created secret (without decrypted value)

        Raises:
            ValueError: If validation fails
            EncryptionError: If encryption fails
        """
        # Validation
        if not value:
            raise ValueError("Secret value cannot be empty")

        if scope == SecretScope.CHATBOT and not chatbot_id:
            raise ValueError("chatbot_id required for chatbot-scoped secrets")

        # Check if name already exists
        existing = await self.repository.exists_with_name(
            organization_id,
            name,
            chatbot_id
        )
        if existing:
            raise ValueError(f"Secret with name '{name}' already exists")

        # Get encryption provider
        provider = get_encryption_provider(encryption_provider)

        # Encrypt value
        try:
            encrypted_value = provider.encrypt(value, key_id=encryption_key_id)
        except Exception as e:
            logger.error(f"Failed to encrypt secret: {str(e)}")
            raise EncryptionError(f"Failed to encrypt secret: {str(e)}")

        # Create secret
        secret_data = {
            "organization_id": organization_id,
            "chatbot_id": chatbot_id,
            "name": name,
            "display_name": display_name,
            "description": description,
            "encrypted_value": encrypted_value,
            "encryption_provider": encryption_provider,
            "encryption_key_id": encryption_key_id,
            "scope": scope,
            "secret_metadata": metadata or {},
            "is_active": True,
            "usage_count": 0
        }

        secret = await self.repository.create(secret_data)
        logger.info(f"Created secret: {secret.name} (id={secret.id})")
        return secret

    async def get_decrypted_value(
        self,
        secret_id: UUID,
        organization_id: UUID,
        track_usage: bool = True
    ) -> str:
        """
        Get decrypted secret value.

        Args:
            secret_id: Secret UUID
            organization_id: Organization UUID (for authorization)
            track_usage: Whether to increment usage counter

        Returns:
            Decrypted plaintext value

        Raises:
            ValueError: If secret not found or unauthorized
            DecryptionError: If decryption fails
        """
        # Get secret
        secret = await self.repository.get(secret_id)

        if not secret:
            raise ValueError("Secret not found")

        if secret.organization_id != organization_id:
            raise ValueError("Unauthorized access to secret")

        if not secret.is_active:
            raise ValueError("Secret is inactive")

        # Get encryption provider
        provider = get_encryption_provider(secret.encryption_provider)

        # Decrypt value
        try:
            plaintext = provider.decrypt(
                secret.encrypted_value,
                key_id=secret.encryption_key_id,
                metadata=secret.encryption_metadata
            )
        except Exception as e:
            logger.error(f"Failed to decrypt secret {secret_id}: {str(e)}")
            raise DecryptionError(f"Failed to decrypt secret: {str(e)}")

        # Track usage
        if track_usage:
            await self.repository.increment_usage(secret_id)

        return plaintext

    async def list_secrets(
        self,
        organization_id: UUID,
        chatbot_id: Optional[UUID] = None,
        scope: Optional[SecretScope] = None,
        is_active: bool = True
    ) -> List[Secret]:
        """
        List secrets available for a context.

        Args:
            organization_id: Organization UUID
            chatbot_id: Optional chatbot UUID
            scope: Optional scope filter
            is_active: Filter by active status

        Returns:
            List of secrets (without decrypted values)
        """
        return await self.repository.list_available(
            organization_id,
            chatbot_id,
            scope,
            is_active
        )

    async def get_secret(
        self,
        secret_id: UUID,
        organization_id: UUID
    ) -> Optional[Secret]:
        """
        Get secret by ID (without decrypted value).

        Args:
            secret_id: Secret UUID
            organization_id: Organization UUID (for authorization)

        Returns:
            Secret if found and authorized, None otherwise
        """
        secret = await self.repository.get(secret_id)

        if not secret or secret.organization_id != organization_id:
            return None

        return secret

    async def update_secret(
        self,
        secret_id: UUID,
        organization_id: UUID,
        display_name: Optional[str] = None,
        description: Optional[str] = None,
        value: Optional[str] = None,
        is_active: Optional[bool] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Secret:
        """
        Update secret.

        Args:
            secret_id: Secret UUID
            organization_id: Organization UUID (for authorization)
            display_name: New display name
            description: New description
            value: New plaintext value (will be re-encrypted)
            is_active: New active status
            metadata: New metadata

        Returns:
            Updated secret

        Raises:
            ValueError: If secret not found or unauthorized
            EncryptionError: If re-encryption fails
        """
        # Get existing secret
        secret = await self.repository.get(secret_id)

        if not secret:
            raise ValueError("Secret not found")

        if secret.organization_id != organization_id:
            raise ValueError("Unauthorized access to secret")

        # Build update dict
        update_data = {}

        if display_name is not None:
            update_data["display_name"] = display_name

        if description is not None:
            update_data["description"] = description

        if is_active is not None:
            update_data["is_active"] = is_active

        if metadata is not None:
            update_data["secret_metadata"] = metadata

        # If new value provided, re-encrypt
        if value is not None:
            provider = get_encryption_provider(secret.encryption_provider)
            try:
                encrypted_value = provider.encrypt(
                    value,
                    key_id=secret.encryption_key_id
                )
                update_data["encrypted_value"] = encrypted_value
            except Exception as e:
                logger.error(f"Failed to re-encrypt secret: {str(e)}")
                raise EncryptionError(f"Failed to re-encrypt secret: {str(e)}")

        # Update
        updated_secret = await self.repository.update(secret_id, update_data)
        logger.info(f"Updated secret: {secret.name} (id={secret_id})")
        return updated_secret

    async def delete_secret(
        self,
        secret_id: UUID,
        organization_id: UUID,
        soft_delete: bool = True
    ) -> bool:
        """
        Delete secret.

        Args:
            secret_id: Secret UUID
            organization_id: Organization UUID (for authorization)
            soft_delete: If True, deactivate. If False, hard delete.

        Returns:
            True if deleted, False if not found

        Raises:
            ValueError: If unauthorized
        """
        # Get secret
        secret = await self.repository.get(secret_id)

        if not secret:
            return False

        if secret.organization_id != organization_id:
            raise ValueError("Unauthorized access to secret")

        if soft_delete:
            result = await self.repository.deactivate(secret_id)
        else:
            result = await self.repository.delete(secret_id)

        if result:
            logger.info(f"Deleted secret: {secret.name} (id={secret_id}, soft={soft_delete})")

        return result

    async def rotate_secret_key(
        self,
        secret_id: UUID,
        organization_id: UUID,
        new_encryption_provider: Optional[EncryptionProvider] = None,
        new_key_id: Optional[str] = None
    ) -> Secret:
        """
        Rotate encryption key for a secret.

        Decrypts with old key/provider, re-encrypts with new key/provider.

        Args:
            secret_id: Secret UUID
            organization_id: Organization UUID (for authorization)
            new_encryption_provider: New provider to use (optional)
            new_key_id: New key ID (optional)

        Returns:
            Updated secret

        Raises:
            ValueError: If secret not found or unauthorized
            EncryptionError: If rotation fails
        """
        # Get secret
        secret = await self.repository.get(secret_id)

        if not secret:
            raise ValueError("Secret not found")

        if secret.organization_id != organization_id:
            raise ValueError("Unauthorized access to secret")

        # Decrypt with old provider/key
        old_provider = get_encryption_provider(secret.encryption_provider)
        try:
            plaintext = old_provider.decrypt(
                secret.encrypted_value,
                key_id=secret.encryption_key_id
            )
        except Exception as e:
            logger.error(f"Failed to decrypt for rotation: {str(e)}")
            raise DecryptionError(f"Failed to decrypt for rotation: {str(e)}")

        # Encrypt with new provider/key
        new_provider_type = new_encryption_provider or secret.encryption_provider
        new_provider = get_encryption_provider(new_provider_type)

        try:
            new_encrypted_value = new_provider.encrypt(
                plaintext,
                key_id=new_key_id
            )
        except Exception as e:
            logger.error(f"Failed to re-encrypt for rotation: {str(e)}")
            raise EncryptionError(f"Failed to re-encrypt for rotation: {str(e)}")

        # Update secret
        update_data = {
            "encrypted_value": new_encrypted_value,
            "encryption_provider": new_provider_type,
            "encryption_key_id": new_key_id
        }

        updated_secret = await self.repository.update(secret_id, update_data)
        logger.info(f"Rotated key for secret: {secret.name} (id={secret_id})")
        return updated_secret

    async def validate_secret(
        self,
        secret_id: UUID,
        organization_id: UUID
    ) -> bool:
        """
        Validate that a secret can be decrypted.

        Args:
            secret_id: Secret UUID
            organization_id: Organization UUID

        Returns:
            True if valid and can be decrypted, False otherwise
        """
        try:
            await self.get_decrypted_value(
                secret_id,
                organization_id,
                track_usage=False
            )
            return True
        except Exception as e:
            logger.warning(f"Secret validation failed for {secret_id}: {str(e)}")
            return False
