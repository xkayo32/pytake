"""
Fernet Encryption Provider - Internal symmetric encryption

Uses cryptography.Fernet for secure symmetric encryption.
This is the default provider for PyTake secrets.

Features:
- Symmetric encryption (same key encrypts and decrypts)
- Built on AES-128-CBC with HMAC authentication
- Time-based expiration support
- No external dependencies
- Fast and secure

Key Generation:
    from cryptography.fernet import Fernet
    key = Fernet.generate_key()
    print(key.decode())  # Save this to ENCRYPTION_KEY env var

Environment Variables:
    ENCRYPTION_KEY: Base64-encoded Fernet key (required)
"""

import base64
import logging
from typing import Optional, Dict, Any

from cryptography.fernet import Fernet, InvalidToken

from app.core.encryption.base import (
    BaseEncryptionProvider,
    EncryptionError,
    DecryptionError
)
from app.core.config import settings

logger = logging.getLogger(__name__)


class FernetEncryptionProvider(BaseEncryptionProvider):
    """
    Fernet symmetric encryption provider.

    Uses a single encryption key stored in ENCRYPTION_KEY environment variable.
    Key must be a valid Fernet key (32 URL-safe base64-encoded bytes).

    Usage:
        provider = FernetEncryptionProvider()
        encrypted = provider.encrypt("my-secret-value")
        decrypted = provider.decrypt(encrypted)
    """

    def __init__(self, encryption_key: Optional[str] = None):
        """
        Initialize Fernet provider.

        Args:
            encryption_key: Base64-encoded Fernet key. If None, uses settings.ENCRYPTION_KEY

        Raises:
            ValueError: If encryption key is invalid or missing
        """
        self.encryption_key = encryption_key or getattr(settings, 'ENCRYPTION_KEY', None)

        if not self.encryption_key:
            raise ValueError(
                "ENCRYPTION_KEY not configured. Generate one with: "
                "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
            )

        try:
            # Ensure key is bytes
            key_bytes = self.encryption_key.encode() if isinstance(self.encryption_key, str) else self.encryption_key
            self.cipher = Fernet(key_bytes)
        except Exception as e:
            raise ValueError(f"Invalid Fernet encryption key: {str(e)}")

    def encrypt(self, plaintext: str, key_id: Optional[str] = None) -> str:
        """
        Encrypt plaintext using Fernet.

        Args:
            plaintext: String to encrypt
            key_id: Ignored for Fernet (uses configured key)

        Returns:
            Base64-encoded encrypted string

        Raises:
            EncryptionError: If encryption fails
        """
        if not plaintext:
            raise EncryptionError("Cannot encrypt empty string")

        try:
            # Convert to bytes
            plaintext_bytes = plaintext.encode('utf-8')

            # Encrypt
            encrypted_bytes = self.cipher.encrypt(plaintext_bytes)

            # Encode to base64 for storage
            encrypted_b64 = base64.b64encode(encrypted_bytes).decode('utf-8')

            logger.debug(f"Successfully encrypted value (length: {len(plaintext)})")
            return encrypted_b64

        except Exception as e:
            logger.error(f"Encryption failed: {str(e)}")
            raise EncryptionError(f"Failed to encrypt value: {str(e)}")

    def decrypt(
        self,
        encrypted_text: str,
        key_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Decrypt Fernet-encrypted string.

        Args:
            encrypted_text: Base64-encoded encrypted string
            key_id: Ignored for Fernet
            metadata: Ignored for Fernet

        Returns:
            Decrypted plaintext string

        Raises:
            DecryptionError: If decryption fails
        """
        if not encrypted_text:
            raise DecryptionError("Cannot decrypt empty string")

        try:
            # Decode from base64
            encrypted_bytes = base64.b64decode(encrypted_text.encode('utf-8'))

            # Decrypt
            decrypted_bytes = self.cipher.decrypt(encrypted_bytes)

            # Convert back to string
            plaintext = decrypted_bytes.decode('utf-8')

            logger.debug(f"Successfully decrypted value (length: {len(plaintext)})")
            return plaintext

        except InvalidToken:
            logger.error("Invalid token - decryption failed (wrong key or corrupted data)")
            raise DecryptionError("Invalid encryption token - key may have changed or data is corrupted")

        except Exception as e:
            logger.error(f"Decryption failed: {str(e)}")
            raise DecryptionError(f"Failed to decrypt value: {str(e)}")

    def validate_key(self, key_id: Optional[str] = None) -> bool:
        """
        Validate Fernet encryption key by attempting a test encryption/decryption.

        Returns:
            True if key is valid
        """
        try:
            test_value = "test-encryption-validation"
            encrypted = self.encrypt(test_value)
            decrypted = self.decrypt(encrypted)
            return decrypted == test_value
        except Exception as e:
            logger.error(f"Key validation failed: {str(e)}")
            return False
