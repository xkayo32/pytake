"""
SAML Request/Response Schemas
Pydantic schemas for SAML authentication endpoints.
"""

from typing import Optional
from pydantic import BaseModel, Field


class SAMLLoginRequest(BaseModel):
    """Request to initiate SAML login."""
    
    provider_id: str = Field(..., description="OAuth provider configuration ID")
    relay_state: Optional[str] = Field(
        None,
        description="Optional state to preserve (URL to redirect after login)"
    )


class SAMLAssertionRequest(BaseModel):
    """SAML assertion from IdP (ACS callback)."""
    
    SAMLResponse: str = Field(..., description="Base64-encoded signed SAML assertion")
    RelayState: Optional[str] = Field(None, description="State from AuthnRequest")
    provider_id: str = Field(..., description="OAuth provider ID")


class SAMLLogoutRequest(BaseModel):
    """Request to initiate SAML logout."""
    
    provider_id: str = Field(..., description="OAuth provider configuration ID")


class TokenResponse(BaseModel):
    """JWT tokens returned after successful authentication."""
    
    access_token: str = Field(..., description="JWT access token (15 min expiry)")
    refresh_token: str = Field(..., description="JWT refresh token (7 day expiry)")
    token_type: str = Field("bearer", description="Token type")
    expires_in: int = Field(900, description="Access token expiry in seconds")


class SAMLErrorResponse(BaseModel):
    """Error response from SAML endpoints."""
    
    error: str = Field(..., description="Error message")
    error_code: Optional[str] = Field(None, description="Error code (e.g., 'invalid_assertion')")
    details: Optional[dict] = Field(None, description="Additional error details")
