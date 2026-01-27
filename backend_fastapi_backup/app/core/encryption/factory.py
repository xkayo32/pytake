"""
Encryption Provider Factory

Factory pattern to instantiate the correct encryption provider
based on configuration.

Usage:
    from app.core.encryption import get_encryption_provider, encryption_service
    from app.models.secret import EncryptionProvider

    # Get Fernet provider (default)
    provider = get_encryption_provider(EncryptionProvider.FERNET)

    # Get AWS KMS provider
    provider = get_encryption_provider(EncryptionProvider.AWS_KMS)

    # Use default service (Fernet)
    encrypted = encryption_service.encrypt("my-secret")
    decrypted = encryption_service.decrypt(encrypted)
"""

import logging
from typing import Optional

from app.models.secret import EncryptionProvider
from app.core.encryption.base import BaseEncryptionProvider
from app.core.encryption.fernet_provider import FernetEncryptionProvider
from app.core.encryption.aws_kms_provider import AWSKMSEncryptionProvider
from app.core.encryption.vault_provider import VaultEncryptionProvider

logger = logging.getLogger(__name__)


def get_encryption_provider(
    provider_type: EncryptionProvider,
    **kwargs
) -> BaseEncryptionProvider:
    """
    Factory function to get encryption provider instance.

    Args:
        provider_type: Type of encryption provider
        **kwargs: Provider-specific configuration

    Returns:
        Encryption provider instance

    Raises:
        ValueError: If provider type is invalid

    Examples:
        # Fernet (default)
        provider = get_encryption_provider(EncryptionProvider.FERNET)

        # AWS KMS
        provider = get_encryption_provider(
            EncryptionProvider.AWS_KMS,
            region='us-east-1'
        )

        # Vault
        provider = get_encryption_provider(
            EncryptionProvider.VAULT,
            vault_addr='https://vault.example.com',
            token='s.xxxxx'
        )
    """
    if provider_type == EncryptionProvider.FERNET:
        return FernetEncryptionProvider(**kwargs)

    elif provider_type == EncryptionProvider.AWS_KMS:
        return AWSKMSEncryptionProvider(**kwargs)

    elif provider_type == EncryptionProvider.VAULT:
        return VaultEncryptionProvider(**kwargs)

    else:
        raise ValueError(f"Unknown encryption provider: {provider_type}")


# Global default encryption service (Fernet)
# This is the primary service used throughout the application
try:
    encryption_service = FernetEncryptionProvider()
    logger.info("Default encryption service initialized (Fernet)")
except Exception as e:
    logger.error(f"Failed to initialize default encryption service: {str(e)}")
    encryption_service = None


__all__ = [
    'get_encryption_provider',
    'encryption_service',
]
