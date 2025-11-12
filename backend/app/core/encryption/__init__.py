"""
Encryption module - Modular encryption system for secrets

Supports multiple encryption providers:
- Fernet (default): Internal symmetric encryption
- AWS KMS: AWS Key Management Service
- HashiCorp Vault: External secrets management

Usage:
    from app.core.encryption import encryption_service, EncryptionProvider

    # Encrypt with default provider (Fernet)
    encrypted = encryption_service.encrypt("my-secret-value")

    # Decrypt
    decrypted = encryption_service.decrypt(encrypted)

    # Use specific provider
    from app.core.encryption.factory import get_encryption_provider
    provider = get_encryption_provider(EncryptionProvider.AWS_KMS)
    encrypted = provider.encrypt("my-secret-value")
"""

from app.core.encryption.base import BaseEncryptionProvider
from app.core.encryption.fernet_provider import FernetEncryptionProvider
from app.core.encryption.factory import get_encryption_provider, encryption_service
from app.models.secret import EncryptionProvider

__all__ = [
    'BaseEncryptionProvider',
    'FernetEncryptionProvider',
    'get_encryption_provider',
    'encryption_service',
    'EncryptionProvider',
]
