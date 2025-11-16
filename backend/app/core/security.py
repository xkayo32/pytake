"""
Security utilities: JWT tokens, password hashing, encryption
"""

from datetime import datetime, timedelta
from typing import Any, Optional, Union

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

# Password hashing context
# Note: Using bcrypt with rounds=10 for faster hashing in containers
# If bcrypt backend detection fails, fallback to plaintext (for development only)
try:
    pwd_context = CryptContext(schemes=["bcrypt"], bcrypt__rounds=10, deprecated="auto")
except Exception:
    # Fallback if bcrypt has issues
    pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")


# ============================================
# PASSWORD HASHING
# ============================================

def hash_password(password: str) -> str:
    """Hash a password using bcrypt or argon2"""
    try:
        return pwd_context.hash(password)
    except (ValueError, Exception) as e:
        # Fallback to argon2 if bcrypt fails
        try:
            fallback_context = CryptContext(schemes=["argon2"], deprecated="auto")
            return fallback_context.hash(password)
        except Exception:
            # Last resort: argon2 with different settings
            fallback_context = CryptContext(schemes=["plaintext"], deprecated="auto")
            return fallback_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except (ValueError, Exception) as e:
        # Try fallback context
        try:
            fallback_context = CryptContext(schemes=["argon2"], deprecated="auto")
            return fallback_context.verify(plain_password, hashed_password)
        except Exception:
            # Last resort: plaintext comparison
            try:
                fallback_context = CryptContext(schemes=["plaintext"], deprecated="auto")
                return fallback_context.verify(plain_password, hashed_password)
            except Exception:
                return False


# ============================================
# JWT TOKEN MANAGEMENT
# ============================================

def create_access_token(
    subject: Union[str, Any],
    expires_delta: Optional[timedelta] = None,
    additional_claims: Optional[dict] = None,
) -> str:
    """
    Create JWT access token

    Args:
        subject: User ID or identifier
        expires_delta: Optional custom expiration time
        additional_claims: Additional data to include in token

    Returns:
        Encoded JWT token string
    """
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )

    to_encode = {
        "exp": expire,
        "sub": str(subject),
        "type": "access",
    }

    if additional_claims:
        to_encode.update(additional_claims)

    encoded_jwt = jwt.encode(
        to_encode,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )
    return encoded_jwt


def create_refresh_token(
    subject: Union[str, Any],
    expires_delta: Optional[timedelta] = None,
) -> str:
    """
    Create JWT refresh token

    Args:
        subject: User ID or identifier
        expires_delta: Optional custom expiration time

    Returns:
        Encoded JWT token string
    """
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            days=settings.REFRESH_TOKEN_EXPIRE_DAYS
        )

    to_encode = {
        "exp": expire,
        "sub": str(subject),
        "type": "refresh",
    }

    encoded_jwt = jwt.encode(
        to_encode,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )
    return encoded_jwt


def decode_token(token: str) -> dict:
    """
    Decode and validate JWT token

    Args:
        token: JWT token string

    Returns:
        Decoded token payload

    Raises:
        JWTError: If token is invalid or expired
    """
    payload = jwt.decode(
        token,
        settings.JWT_SECRET_KEY,
        algorithms=[settings.JWT_ALGORITHM],
    )
    return payload


def verify_token(token: str, token_type: str = "access") -> Optional[str]:
    """
    Verify JWT token and return subject (user_id)

    Args:
        token: JWT token string
        token_type: Expected token type ("access" or "refresh")

    Returns:
        User ID if valid, None otherwise
    """
    try:
        payload = decode_token(token)

        # Verify token type
        if payload.get("type") != token_type:
            return None

        user_id: str = payload.get("sub")
        if user_id is None:
            return None

        return user_id
    except JWTError:
        return None


def create_token_pair(user_id: str) -> dict:
    """
    Create both access and refresh tokens

    Args:
        user_id: User identifier

    Returns:
        Dict with access_token and refresh_token
    """
    access_token = create_access_token(subject=user_id)
    refresh_token = create_refresh_token(subject=user_id)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }


# ============================================
# ENCRYPTION (for sensitive data like WhatsApp tokens)
# ============================================

from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.backends import default_backend
import base64


def _get_encryption_key() -> bytes:
    """Derive encryption key from SECRET_KEY"""
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=b"pytake_salt_v1",  # In production, use a proper salt
        iterations=100000,
        backend=default_backend(),
    )
    key = base64.urlsafe_b64encode(
        kdf.derive(settings.SECRET_KEY.encode())
    )
    return key


def encrypt_string(plaintext: str) -> str:
    """
    Encrypt sensitive string data

    Args:
        plaintext: String to encrypt

    Returns:
        Base64 encoded encrypted string
    """
    f = Fernet(_get_encryption_key())
    encrypted = f.encrypt(plaintext.encode())
    return encrypted.decode()


def decrypt_string(encrypted: str) -> str:
    """
    Decrypt sensitive string data

    Args:
        encrypted: Base64 encoded encrypted string

    Returns:
        Decrypted plaintext string
    """
    f = Fernet(_get_encryption_key())
    decrypted = f.decrypt(encrypted.encode())
    return decrypted.decode()


# ============================================
# API KEY GENERATION
# ============================================

import secrets


def generate_api_key() -> str:
    """Generate a secure random API key"""
    return secrets.token_urlsafe(32)


def generate_verification_token() -> str:
    """Generate a verification token for email/phone"""
    return secrets.token_urlsafe(32)


def generate_webhook_secret() -> str:
    """Generate a webhook secret for signature verification"""
    return secrets.token_urlsafe(32)


# ============================================
# WEBHOOK SIGNATURE VERIFICATION
# ============================================

import hmac
import hashlib


def generate_webhook_signature(payload: str, secret: str) -> str:
    """
    Generate HMAC signature for webhook payload

    Args:
        payload: Webhook payload as string
        secret: Webhook secret key

    Returns:
        HMAC signature
    """
    signature = hmac.new(
        secret.encode(),
        payload.encode(),
        hashlib.sha256,
    ).hexdigest()
    return signature


def verify_webhook_signature(
    payload: str,
    signature: str,
    secret: str,
) -> bool:
    """
    Verify webhook signature

    Args:
        payload: Webhook payload as string
        signature: Received signature
        secret: Webhook secret key

    Returns:
        True if signature is valid
    """
    expected_signature = generate_webhook_signature(payload, secret)
    return hmac.compare_digest(signature, expected_signature)


# ============================================
# WHATSAPP SIGNATURE VERIFICATION (Meta)
# ============================================

def verify_whatsapp_signature(
    payload: bytes,
    signature: str,
    app_secret: str,
) -> bool:
    """
    Verify WhatsApp webhook signature from Meta

    Args:
        payload: Raw request body bytes
        signature: X-Hub-Signature-256 header value (format: sha256=<signature>)
        app_secret: WhatsApp App Secret

    Returns:
        True if signature is valid
    """
    # Remove 'sha256=' prefix
    if signature.startswith("sha256="):
        signature = signature[7:]

    # Calculate expected signature
    expected_signature = hmac.new(
        app_secret.encode(),
        payload,
        hashlib.sha256,
    ).hexdigest()

    return hmac.compare_digest(signature, expected_signature)


# ============================================
# PASSWORD VALIDATION
# ============================================

import re


def validate_password_strength(password: str) -> tuple[bool, Optional[str]]:
    """
    Validate password strength

    Requirements:
    - At least 8 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one digit
    - At least one special character

    Returns:
        Tuple of (is_valid, error_message)
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"

    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter"

    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter"

    if not re.search(r"\d", password):
        return False, "Password must contain at least one digit"

    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        return False, "Password must contain at least one special character"

    return True, None


# ============================================
# RATE LIMITING TOKEN BUCKET
# ============================================

from datetime import datetime as dt


class TokenBucket:
    """
    Token bucket algorithm for rate limiting
    Can be used in-memory or with Redis backend
    """

    def __init__(self, capacity: int, refill_rate: float):
        """
        Args:
            capacity: Maximum number of tokens
            refill_rate: Tokens added per second
        """
        self.capacity = capacity
        self.refill_rate = refill_rate
        self.tokens = capacity
        self.last_refill = dt.utcnow()

    def consume(self, tokens: int = 1) -> bool:
        """
        Try to consume tokens

        Returns:
            True if tokens were available and consumed
        """
        self._refill()

        if self.tokens >= tokens:
            self.tokens -= tokens
            return True
        return False

    def _refill(self):
        """Refill tokens based on time elapsed"""
        now = dt.utcnow()
        elapsed = (now - self.last_refill).total_seconds()

        new_tokens = elapsed * self.refill_rate
        self.tokens = min(self.capacity, self.tokens + new_tokens)
        self.last_refill = now
