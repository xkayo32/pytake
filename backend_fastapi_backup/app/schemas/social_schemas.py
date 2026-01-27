"""
Social Login API Schemas
Request/response models for OAuth endpoints.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# OAuth Initiation

class SocialLoginStartRequest(BaseModel):
    """Start OAuth flow."""
    redirect_uri: Optional[str] = Field(None, description="Where to redirect after OAuth")


class SocialLoginStartResponse(BaseModel):
    """OAuth authorization URL for client."""
    authorization_url: str = Field(..., description="URL to redirect user for OAuth authorization")
    state: str = Field(..., description="State token for CSRF prevention")
    challenge: Optional[str] = Field(None, description="PKCE challenge (if using PKCE)")


# OAuth Callback

class SocialLoginCallbackRequest(BaseModel):
    """OAuth callback with authorization code."""
    code: str = Field(..., description="Authorization code from provider")
    state: str = Field(..., description="State token from authorization URL")
    error: Optional[str] = Field(None, description="Error code if authorization failed")
    error_description: Optional[str] = Field(None, description="Error description")


class SocialLoginCallbackResponse(BaseModel):
    """Successful OAuth callback response."""
    user_id: str = Field(..., description="Authenticated user UUID")
    access_token: str = Field(..., description="JWT access token")
    refresh_token: str = Field(..., description="JWT refresh token")
    token_type: str = Field(default="bearer", description="Token type")
    expires_in: int = Field(..., description="Token expiry in seconds")
    linked_account: bool = Field(..., description="True if social account was linked to existing user")
    message: str = Field(default="OAuth authentication successful")


# Social Identity Management

class SocialIdentityResponse(BaseModel):
    """Linked social account info."""
    id: str = Field(..., description="Social identity UUID")
    provider: str = Field(..., description="OAuth provider (google|github|microsoft)")
    email: str = Field(..., description="Email from social provider")
    name: str = Field(..., description="Display name")
    avatar_url: Optional[str] = Field(None, description="Profile picture URL")
    linked_at: str = Field(..., description="When account was linked (ISO 8601)")
    last_login_at: Optional[str] = Field(None, description="Last OAuth login (ISO 8601)")


class SocialIdentitiesListResponse(BaseModel):
    """List of linked social accounts."""
    identities: List[SocialIdentityResponse] = Field(..., description="List of linked social accounts")
    total: int = Field(..., description="Total count of linked accounts")


class SocialUnlinkRequest(BaseModel):
    """Request to unlink social account."""
    password: Optional[str] = Field(None, description="User password (for security, optional)")


class SocialUnlinkResponse(BaseModel):
    """Social account unlinked successfully."""
    provider: str = Field(..., description="Provider that was unlinked")
    message: str = Field(default="Social account unlinked successfully")


# Health Check

class SocialHealthResponse(BaseModel):
    """Social login service health."""
    status: str = Field(..., description="Health status")
    providers: List[str] = Field(..., description="Enabled OAuth providers")
    message: str = Field(..., description="Status message")
