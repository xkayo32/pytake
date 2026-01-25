"""
Passkey API Schemas
Request/response models for WebAuthn endpoints.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


# Registration Flow

class PasskeyRegistrationStartRequest(BaseModel):
    """Start passkey registration."""
    device_name: str = Field(..., description="User-friendly name for device (e.g., 'iPhone Face ID')", min_length=1, max_length=255)


class PasskeyRegistrationStartResponse(BaseModel):
    """Challenge and config for registration."""
    challenge: str = Field(..., description="Base64-encoded challenge")
    challenge_id: str = Field(..., description="Challenge UUID for tracking")
    rp: Dict[str, Any] = Field(..., description="Relying Party configuration")
    user: Dict[str, Any] = Field(..., description="User information for registration")
    pubKeyCredParams: List[Dict[str, Any]] = Field(..., description="Supported algorithm parameters")
    attestation: str = Field(..., description="Attestation conveyance preference")
    timeout: int = Field(..., description="Timeout in milliseconds")


class PasskeyRegistrationCompleteRequest(BaseModel):
    """Complete passkey registration with credential."""
    challenge_id: str = Field(..., description="Challenge UUID from registration/start")
    credential_id: str = Field(..., description="Base64-encoded credential ID from authenticator")
    public_key: str = Field(..., description="Base64-encoded public key from authenticator")
    transports: Optional[str] = Field(None, description="Comma-separated transports (usb,nfc,ble,internal)")
    attestation_object: Optional[str] = Field(None, description="Base64-encoded attestation object")


class PasskeyCredentialResponse(BaseModel):
    """Single passkey credential info."""
    id: str = Field(..., description="Credential UUID")
    device_name: str = Field(..., description="Device name")
    transports: Optional[str] = Field(None, description="Supported transports")
    is_primary: bool = Field(..., description="Is primary passkey")
    last_used_at: Optional[str] = Field(None, description="Last authentication timestamp")
    created_at: str = Field(..., description="Created timestamp")


class PasskeyRegistrationCompleteResponse(BaseModel):
    """Successful registration response."""
    id: str = Field(..., description="Credential UUID")
    device_name: str = Field(..., description="Device name")
    transports: Optional[str] = Field(None, description="Supported transports")
    is_primary: bool = Field(..., description="Is primary passkey")
    created_at: str = Field(..., description="Created timestamp")
    message: str = Field(default="Passkey registered successfully")


# Authentication Flow

class PasskeyAuthenticationStartResponse(BaseModel):
    """Challenge for authentication."""
    challenge: str = Field(..., description="Base64-encoded challenge")
    challenge_id: str = Field(..., description="Challenge UUID for tracking")
    rp: Dict[str, Any] = Field(..., description="Relying Party configuration")
    timeout: int = Field(..., description="Timeout in milliseconds")
    userVerification: str = Field(..., description="User verification preference")


class PasskeyAuthenticationCompleteRequest(BaseModel):
    """Complete passkey authentication."""
    credential_id: str = Field(..., description="Base64-encoded credential ID from authenticator")
    counter: int = Field(..., description="Counter value for replay attack prevention")
    signature: Optional[str] = Field(None, description="Base64-encoded signature from authenticator")


class PasskeyAuthenticationCompleteResponse(BaseModel):
    """Successful authentication response."""
    user_id: str = Field(..., description="Authenticated user UUID")
    device_name: str = Field(..., description="Device used for authentication")
    message: str = Field(default="Authentication successful")


# Credential Management

class PasskeyListResponse(BaseModel):
    """List of passkeys for user."""
    credentials: List[PasskeyCredentialResponse] = Field(..., description="List of passkeys")
    total: int = Field(..., description="Total count")


class PasskeyRenameRequest(BaseModel):
    """Rename a passkey."""
    new_name: str = Field(..., description="New device name", min_length=1, max_length=255)


class PasskeyRenameResponse(BaseModel):
    """Rename result."""
    id: str = Field(..., description="Credential UUID")
    device_name: str = Field(..., description="Updated device name")
    message: str = Field(default="Passkey renamed successfully")


class PasskeyDeleteResponse(BaseModel):
    """Delete result."""
    message: str = Field(default="Passkey deleted successfully")


class PasskeySetPrimaryRequest(BaseModel):
    """Set credential as primary."""
    pass  # No additional fields needed


class PasskeySetPrimaryResponse(BaseModel):
    """Set primary result."""
    id: str = Field(..., description="Credential UUID")
    is_primary: bool = Field(default=True, description="Is now primary")
    message: str = Field(default="Passkey set as primary successfully")


class PasskeyHealthResponse(BaseModel):
    """Passkey service health check."""
    status: str = Field(..., description="Health status")
    passkey_enabled: bool = Field(..., description="Passwordless auth enabled")
    message: str = Field(..., description="Status message")
