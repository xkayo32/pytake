"""
Test Fixtures and Utilities for Advanced Authentication Features

Provides reusable fixtures, helpers, and mocks for testing MFA, Passkey, and Social Login.
These utilities simplify test implementation across integration, E2E, and security test suites.
"""

import pytest
import base64
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import uuid4

import pyotp


# ============================================================================
# TOTP UTILITIES
# ============================================================================

class TOTPGenerator:
    """Generate valid TOTP codes for testing."""
    
    @staticmethod
    def generate_secret() -> str:
        """Generate a valid base32-encoded TOTP secret."""
        return pyotp.random_base32()
    
    @staticmethod
    def get_current_code(secret: str) -> str:
        """Get the current valid TOTP code for a secret."""
        totp = pyotp.TOTP(secret)
        return totp.now()
    
    @staticmethod
    def get_code_for_time(secret: str, timestamp: float) -> str:
        """Get TOTP code for a specific timestamp."""
        totp = pyotp.TOTP(secret)
        return totp.at(timestamp)
    
    @staticmethod
    def get_previous_code(secret: str) -> str:
        """Get the TOTP code from previous 30-second window."""
        totp = pyotp.TOTP(secret)
        return totp.at(int(__import__('time').time()) - 30)
    
    @staticmethod
    def get_next_code(secret: str) -> str:
        """Get the TOTP code from next 30-second window."""
        totp = pyotp.TOTP(secret)
        return totp.at(int(__import__('time').time()) + 30)
    
    @staticmethod
    def verify_code(secret: str, code: str) -> bool:
        """Verify a TOTP code against a secret."""
        totp = pyotp.TOTP(secret)
        return totp.verify(code, valid_window=1)


# ============================================================================
# PASSKEY UTILITIES
# ============================================================================

class PasskeyGenerator:
    """Generate mock passkey credentials for testing."""
    
    @staticmethod
    def generate_credential_id() -> str:
        """Generate a base64-encoded credential ID (32 bytes)."""
        return base64.b64encode(secrets.token_bytes(32)).decode()
    
    @staticmethod
    def generate_public_key() -> str:
        """Generate a mock base64-encoded public key (64 bytes)."""
        return base64.b64encode(secrets.token_bytes(64)).decode()
    
    @staticmethod
    def create_credential_data(
        device_name: str = "Test Device",
        is_primary: bool = True,
        transports: str = "usb"
    ) -> dict:
        """Create a complete passkey credential data structure."""
        return {
            "credential_id": PasskeyGenerator.generate_credential_id(),
            "public_key": PasskeyGenerator.generate_public_key(),
            "counter": 0,
            "transports": transports,
            "device_name": device_name,
            "is_primary": is_primary,
        }
    
    @staticmethod
    def generate_challenge_data() -> str:
        """Generate a base64-encoded challenge (32 bytes)."""
        return base64.b64encode(secrets.token_bytes(32)).decode()


# ============================================================================
# OAUTH UTILITIES
# ============================================================================

class OAuthMockProvider:
    """Mock OAuth provider for testing OAuth flows."""
    
    @staticmethod
    def generate_state_token() -> str:
        """Generate a random state token (32 bytes base64)."""
        return base64.b64encode(secrets.token_bytes(32)).decode()
    
    @staticmethod
    def generate_authorization_code() -> str:
        """Generate a mock authorization code."""
        return f"auth_code_{uuid4().hex[:16]}"
    
    @staticmethod
    def generate_access_token() -> str:
        """Generate a mock access token."""
        return f"access_token_{uuid4().hex[:16]}"
    
    @staticmethod
    def generate_refresh_token() -> str:
        """Generate a mock refresh token."""
        return f"refresh_token_{uuid4().hex[:16]}"
    
    @staticmethod
    def generate_pkce_pair() -> dict:
        """Generate PKCE code_verifier and code_challenge pair."""
        import hashlib
        code_verifier = base64.urlsafe_b64encode(secrets.token_bytes(32)).decode().rstrip("=")
        code_challenge = base64.urlsafe_b64encode(
            hashlib.sha256(code_verifier.encode()).digest()
        ).decode().rstrip("=")
        return {
            "code_verifier": code_verifier,
            "code_challenge": code_challenge,
        }
    
    @staticmethod
    def create_oauth_user_profile(provider: str) -> dict:
        """Create a mock OAuth user profile for different providers."""
        email = f"user_{uuid4().hex[:8]}@example.com"
        
        profiles = {
            "google": {
                "sub": f"google_{uuid4().hex[:16]}",
                "email": email,
                "name": "Google User",
                "picture": "https://example.com/google.jpg",
            },
            "github": {
                "id": uuid4().hex[:16],
                "login": f"github_user_{uuid4().hex[:8]}",
                "email": email,
                "name": "GitHub User",
                "avatar_url": "https://example.com/github.jpg",
            },
            "microsoft": {
                "id": uuid4().hex[:16],
                "userPrincipalName": email,
                "displayName": "Microsoft User",
                "mail": email,
            },
        }
        return profiles.get(provider, profiles["google"])


# ============================================================================
# TOKEN UTILITIES
# ============================================================================

class TokenHelper:
    """Utilities for creating and validating tokens."""
    
    @staticmethod
    def create_jwt_token(
        user_id: str,
        org_id: str,
        expires_in_minutes: int = 15,
        include_mfa: bool = True,
    ) -> dict:
        """
        Create a mock JWT token structure (for testing validation logic).
        
        Args:
            user_id: User UUID
            org_id: Organization UUID
            expires_in_minutes: Token lifetime
            include_mfa: Whether token has MFA claim
            
        Returns:
            JWT payload dict with claims
        """
        now = datetime.now(timezone.utc)
        return {
            "sub": user_id,
            "org_id": org_id,
            "iat": now.timestamp(),
            "exp": (now + timedelta(minutes=expires_in_minutes)).timestamp(),
            "type": "access",
            "mfa_verified": include_mfa,
        }
    
    @staticmethod
    def create_refresh_token_payload(
        user_id: str,
        org_id: str,
        expires_in_days: int = 7,
    ) -> dict:
        """Create a mock refresh token payload."""
        now = datetime.now(timezone.utc)
        return {
            "sub": user_id,
            "org_id": org_id,
            "iat": now.timestamp(),
            "exp": (now + timedelta(days=expires_in_days)).timestamp(),
            "type": "refresh",
        }
    
    @staticmethod
    def create_backup_code_token(backup_code: str) -> dict:
        """Create a token payload for backup code usage."""
        now = datetime.now(timezone.utc)
        return {
            "type": "backup_code",
            "code_hash": secrets.token_hex(16),
            "iat": now.timestamp(),
            "exp": (now + timedelta(hours=24)).timestamp(),
        }


# ============================================================================
# TIME MOCKING UTILITIES
# ============================================================================

class TimeHelper:
    """Utilities for testing time-dependent operations."""
    
    @staticmethod
    def get_time_in_future(minutes: int = 30) -> datetime:
        """Get a datetime N minutes in the future."""
        return datetime.now(timezone.utc) + timedelta(minutes=minutes)
    
    @staticmethod
    def get_time_in_past(minutes: int = 30) -> datetime:
        """Get a datetime N minutes in the past."""
        return datetime.now(timezone.utc) - timedelta(minutes=minutes)
    
    @staticmethod
    def get_time_in_past_hours(hours: int = 1) -> datetime:
        """Get a datetime N hours in the past."""
        return datetime.now(timezone.utc) - timedelta(hours=hours)
    
    @staticmethod
    def get_time_in_past_days(days: int = 7) -> datetime:
        """Get a datetime N days in the past."""
        return datetime.now(timezone.utc) - timedelta(days=days)
    
    @staticmethod
    def is_expired(expires_at: datetime) -> bool:
        """Check if a timestamp has expired."""
        return expires_at < datetime.now(timezone.utc)
    
    @staticmethod
    def is_valid(expires_at: datetime) -> bool:
        """Check if a timestamp is still valid (not expired)."""
        return expires_at > datetime.now(timezone.utc)


# ============================================================================
# DATA GENERATION UTILITIES
# ============================================================================

class TestDataGenerator:
    """Generate test data structures."""
    
    @staticmethod
    def create_mfa_method_data(
        user_id: str = None,
        org_id: str = None,
        method_type: str = "totp",
    ) -> dict:
        """Create MFA method data."""
        return {
            "user_id": user_id or str(uuid4()),
            "organization_id": org_id or str(uuid4()),
            "method_type": method_type,
            "secret": TOTPGenerator.generate_secret() if method_type == "totp" else "+11234567890",
            "is_verified": False,
        }
    
    @staticmethod
    def create_passkey_data(
        user_id: str = None,
        org_id: str = None,
        device_name: str = "Test Device",
        is_primary: bool = True,
    ) -> dict:
        """Create passkey credential data."""
        pk_gen = PasskeyGenerator()
        return {
            "user_id": user_id or str(uuid4()),
            "organization_id": org_id or str(uuid4()),
            "credential_id": pk_gen.generate_credential_id(),
            "public_key": pk_gen.generate_public_key(),
            "counter": 0,
            "transports": "usb,nfc",
            "device_name": device_name,
            "is_primary": is_primary,
        }
    
    @staticmethod
    def create_social_identity_data(
        user_id: str = None,
        org_id: str = None,
        provider: str = "google",
        email: str = None,
    ) -> dict:
        """Create social identity data."""
        if not email:
            email = f"user_{uuid4().hex[:8]}@example.com"
        
        return {
            "user_id": user_id or str(uuid4()),
            "organization_id": org_id or str(uuid4()),
            "provider": provider,
            "provider_user_id": f"{provider}_{uuid4().hex[:16]}",
            "email": email,
            "full_name": f"{provider.title()} User",
        }
    
    @staticmethod
    def create_backup_code(value: str = None) -> str:
        """Create a backup code."""
        if value:
            return value
        return f"BACKUP-{secrets.randbelow(10**6):06d}"
    
    @staticmethod
    def create_backup_codes(count: int = 10) -> list:
        """Create multiple backup codes."""
        return [f"BACKUP-{i:03d}-{secrets.randbelow(10**4):04d}" for i in range(count)]


# ============================================================================
# PYTEST FIXTURES (to be used in test files)
# ============================================================================

# Note: These are provided as reference. Actual fixtures should be defined in conftest.py
# based on the project's specific test database setup.

"""
FIXTURE TEMPLATES (add to conftest.py):

@pytest.fixture
def totp_generator() -> TOTPGenerator:
    '''Provides TOTP code generation utility.'''
    return TOTPGenerator()

@pytest.fixture
def passkey_generator() -> PasskeyGenerator:
    '''Provides passkey mock generation utility.'''
    return PasskeyGenerator()

@pytest.fixture
def oauth_provider() -> OAuthMockProvider:
    '''Provides OAuth mock provider utility.'''
    return OAuthMockProvider()

@pytest.fixture
def token_helper() -> TokenHelper:
    '''Provides JWT and token utilities.'''
    return TokenHelper()

@pytest.fixture
def time_helper() -> TimeHelper:
    '''Provides time manipulation utilities.'''
    return TimeHelper()

@pytest.fixture
def test_data() -> TestDataGenerator:
    '''Provides test data generation utility.'''
    return TestDataGenerator()
"""


# ============================================================================
# USAGE EXAMPLES
# ============================================================================

"""
USAGE IN TESTS:

Example 1: TOTP Verification Test
----------------------------------
def test_totp_code_verification():
    secret = TOTPGenerator.generate_secret()
    code = TOTPGenerator.get_current_code(secret)
    assert TOTPGenerator.verify_code(secret, code)

Example 2: Passkey Creation Test
---------------------------------
def test_create_passkey():
    cred_data = PasskeyGenerator.create_credential_data(
        device_name="iPhone",
        is_primary=True,
    )
    # Use cred_data to create PasskeyCredential in DB

Example 3: OAuth Flow Test
---------------------------
def test_oauth_state_token():
    state = OAuthMockProvider.generate_state_token()
    assert len(state) > 0
    pkce = OAuthMockProvider.generate_pkce_pair()
    assert pkce["code_verifier"]
    assert pkce["code_challenge"]

Example 4: Expired Token Test
------------------------------
def test_expired_token():
    expires_at = TimeHelper.get_time_in_past(minutes=30)
    assert TimeHelper.is_expired(expires_at)
    
    valid_until = TimeHelper.get_time_in_future(minutes=30)
    assert TimeHelper.is_valid(valid_until)

Example 5: Test Data Generation
--------------------------------
def test_with_mock_data():
    mfa_data = TestDataGenerator.create_mfa_method_data()
    passkey_data = TestDataGenerator.create_passkey_data()
    social_data = TestDataGenerator.create_social_identity_data()
"""
