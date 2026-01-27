"""
Base Encryption Provider - Abstract interface for all encryption providers
"""

from abc import ABC, abstractmethod
from typing import Optional, Dict, Any


class BaseEncryptionProvider(ABC):
    """
    Abstract base class for encryption providers.

    All encryption providers must implement encrypt() and decrypt() methods.
    Providers can optionally override rotate_key() for key rotation support.
    """

    @abstractmethod
    def encrypt(self, plaintext: str, key_id: Optional[str] = None) -> str:
        """
        Encrypt plaintext string.

        Args:
            plaintext: String to encrypt
            key_id: Optional key identifier (for KMS, Vault, etc.)

        Returns:
            Base64-encoded encrypted string

        Raises:
            EncryptionError: If encryption fails
        """
        pass

    @abstractmethod
    def decrypt(
        self,
        encrypted_text: str,
        key_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Decrypt encrypted string.

        Args:
            encrypted_text: Base64-encoded encrypted string
            key_id: Optional key identifier (for KMS, Vault, etc.)
            metadata: Optional provider-specific metadata

        Returns:
            Decrypted plaintext string

        Raises:
            DecryptionError: If decryption fails
        """
        pass

    def rotate_key(
        self,
        encrypted_text: str,
        old_key_id: str,
        new_key_id: str
    ) -> str:
        """
        Rotate encryption key (re-encrypt with new key).

        Default implementation: decrypt with old key, encrypt with new key.
        Providers can override for more efficient rotation.

        Args:
            encrypted_text: Currently encrypted value
            old_key_id: Current key identifier
            new_key_id: New key identifier

        Returns:
            Re-encrypted value with new key

        Raises:
            EncryptionError: If rotation fails
        """
        # Default implementation
        plaintext = self.decrypt(encrypted_text, key_id=old_key_id)
        return self.encrypt(plaintext, key_id=new_key_id)

    def validate_key(self, key_id: Optional[str] = None) -> bool:
        """
        Validate that encryption key is accessible and valid.

        Args:
            key_id: Optional key identifier

        Returns:
            True if key is valid, False otherwise
        """
        # Default implementation: assume valid
        return True


class EncryptionError(Exception):
    """Raised when encryption fails"""
    pass


class DecryptionError(Exception):
    """Raised when decryption fails"""
    pass
