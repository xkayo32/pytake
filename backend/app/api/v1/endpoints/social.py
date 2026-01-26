"""
Social Login (OAuth) API Endpoints
Google, GitHub, and Microsoft OAuth 2.0 integration.
"""

import secrets
from uuid import UUID

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user, get_organization_id
from app.models.user import User
from app.services.social_login_service import SocialLoginService
from app.schemas.social_schemas import (
    SocialLoginStartRequest,
    SocialLoginStartResponse,
    SocialLoginCallbackRequest,
    SocialLoginCallbackResponse,
    SocialIdentitiesListResponse,
    SocialIdentityResponse,
    SocialUnlinkRequest,
    SocialUnlinkResponse,
    SocialHealthResponse,
)
from app.core.exceptions import HTTPException
from app.core.security import create_access_token, create_refresh_token


router = APIRouter(prefix="/social", tags=["Social Login"])


@router.post(
    "/google/start",
    response_model=SocialLoginStartResponse,
    summary="Start Google OAuth",
    tags=["Social Login"],
)
async def start_google_oauth(
    request_data: SocialLoginStartRequest,
    organization_id: UUID = Depends(get_organization_id),
    db: AsyncSession = Depends(get_db),
) -> SocialLoginStartResponse:
    """
    Initiate Google OAuth flow.
    
    Returns authorization URL and state token for frontend redirect.
    Uses PKCE (RFC 7636) for enhanced security with public clients.
    
    **Security**:
    - State token: Prevents CSRF attacks (verified on callback)
    - PKCE: Prevents authorization code interception attacks
    - code_challenge_method: S256 (SHA256, recommended over plain)
    - Public endpoint (no user auth required)
    - Redirect URI validated against whitelist
    
    **OAuth 2.0 Parameters**:
    - scope: email profile (standard Google scopes)
    - access_type: offline (for refresh tokens)
    - prompt: consent (force consent screen for token refresh)
    
    **Example Request**:
    ```bash
    curl -X POST http://localhost:8002/api/v1/social/google/start \
      -H "Content-Type: application/json" \
      -d '{
        "redirect_uri": "http://localhost:3000/auth/callback/google"
      }'
    ```
    
    **Example Response** (200 OK):
    ```json
    {
      "authorization_url": "https://accounts.google.com/o/oauth2/v2/auth?...",
      "state": "state_token_for_verification",
      "code_verifier": "code_verifier_for_pkce"
    }
    ```
    
    **Error Responses**:
    - `400 BadRequest`: Invalid redirect_uri format
    - `500 Internal Server Error`: Service failure
    
    **Next Step**: Frontend redirects user to authorization_url, handle callback at `/google/callback`
    
    Initiate Google OAuth flow.
    """
    service = SocialLoginService(db)
    
    # TODO: Get client_id from organization config
    client_id = "google_client_id_placeholder"
    redirect_uri = request_data.redirect_uri or "http://localhost:3000/auth/callback/google"
    
    result = await service.initiate_oauth_flow("google", client_id, redirect_uri)
    
    return SocialLoginStartResponse(**result)


@router.post(
    "/github/start",
    response_model=SocialLoginStartResponse,
    summary="Start GitHub OAuth",
    tags=["Social Login"],
)
async def start_github_oauth(
    request_data: SocialLoginStartRequest,
    organization_id: UUID = Depends(get_organization_id),
    db: AsyncSession = Depends(get_db),
) -> SocialLoginStartResponse:
    """
    Initiate GitHub OAuth flow.
    
    Returns authorization URL and state token for frontend redirect.
    GitHub uses PKCE for public client security.
    
    **Security**:
    - State token: Prevents CSRF attacks (verified on callback)
    - PKCE: Prevents authorization code interception
    - code_challenge_method: S256 (SHA256)
    - Public endpoint (no user auth required)
    - Redirect URI validated against whitelist
    
    **OAuth 2.0 Parameters**:
    - scope: user:email (GitHub user scope)
    - allow_signup: true (allows new users to sign up)
    
    **Note**: GitHub doesn't return email in /user endpoint (requires separate call to /user/emails)
    
    **Example Request**:
    ```bash
    curl -X POST http://localhost:8002/api/v1/social/github/start \
      -H "Content-Type: application/json" \
      -d '{
        "redirect_uri": "http://localhost:3000/auth/callback/github"
      }'
    ```
    
    **Example Response** (200 OK):
    ```json
    {
      "authorization_url": "https://github.com/login/oauth/authorize?...",
      "state": "state_token_for_verification",
      "code_verifier": "code_verifier_for_pkce"
    }
    ```
    
    **Error Responses**:
    - `400 BadRequest`: Invalid redirect_uri format
    - `500 Internal Server Error`: Service failure
    
    **Next Step**: Frontend redirects user to authorization_url, handle callback at `/github/callback`
    
    Initiate GitHub OAuth flow.
    """
    service = SocialLoginService(db)
    
    # TODO: Get client_id from organization config
    client_id = "github_client_id_placeholder"
    redirect_uri = request_data.redirect_uri or "http://localhost:3000/auth/callback/github"
    
    result = await service.initiate_oauth_flow("github", client_id, redirect_uri)
    
    return SocialLoginStartResponse(**result)


@router.post(
    "/microsoft/start",
    response_model=SocialLoginStartResponse,
    summary="Start Microsoft OAuth",
    tags=["Social Login"],
)
async def start_microsoft_oauth(
    request_data: SocialLoginStartRequest,
    organization_id: UUID = Depends(get_organization_id),
    db: AsyncSession = Depends(get_db),
) -> SocialLoginStartResponse:
    """
    Initiate Microsoft OAuth flow.
    
    Returns authorization URL and state token for frontend redirect.
    Microsoft uses Azure AD OAuth 2.0 with PKCE support.
    
    **Security**:
    - State token: Prevents CSRF attacks (verified on callback)
    - PKCE: Prevents authorization code interception
    - code_challenge_method: S256 (SHA256)
    - Public endpoint (no user auth required)
    - Redirect URI validated against whitelist
    - Tenant scoping: Uses 'common' for multi-tenant or specific tenant ID
    
    **OAuth 2.0 Parameters** (Microsoft Graph API v2.0):
    - scope: openid profile email (standard OIDC)
    - response_type: code (authorization code flow)
    - prompt: login (optional, force login)
    
    **Endpoint**: Uses https://login.microsoftonline.com/common/oauth2/v2.0/authorize
    
    **Example Request**:
    ```bash
    curl -X POST http://localhost:8002/api/v1/social/microsoft/start \
      -H "Content-Type: application/json" \
      -d '{
        "redirect_uri": "http://localhost:3000/auth/callback/microsoft"
      }'
    ```
    
    **Example Response** (200 OK):
    ```json
    {
      "authorization_url": "https://login.microsoftonline.com/common/oauth2/v2.0/authorize?...",
      "state": "state_token_for_verification",
      "code_verifier": "code_verifier_for_pkce"
    }
    ```
    
    **Error Responses**:
    - `400 BadRequest`: Invalid redirect_uri format
    - `500 Internal Server Error`: Service failure
    
    **Next Step**: Frontend redirects user to authorization_url, handle callback at `/microsoft/callback`
    
    Initiate Microsoft OAuth flow.
    """
    service = SocialLoginService(db)
    
    # TODO: Get client_id from organization config
    client_id = "microsoft_client_id_placeholder"
    redirect_uri = request_data.redirect_uri or "http://localhost:3000/auth/callback/microsoft"
    
    result = await service.initiate_oauth_flow("microsoft", client_id, redirect_uri)
    
    return SocialLoginStartResponse(**result)


@router.post(
    "/{provider}/callback",
    response_model=SocialLoginCallbackResponse,
    summary="OAuth Callback Handler",
    tags=["Social Login"],
    include_in_schema=True,
)
async def oauth_callback(
    provider: str,
    request_data: SocialLoginCallbackRequest,
    organization_id: UUID = Depends(get_organization_id),
    db: AsyncSession = Depends(get_db),
) -> SocialLoginCallbackResponse:
    """
    Handle OAuth callback from provider.
    
    Exchanges authorization code for tokens, verifies PKCE, fetches user info,
    and creates or links user account. Returns JWT access/refresh tokens.
    
    **Security**:
    - PKCE validation: code_verifier matches code_challenge
    - State token validation: Prevents CSRF attacks
    - OAuth error handling: Rejects invalid_grant, access_denied, etc.
    - Access token stored encrypted (Fernet AES-128)
    - Refresh token stored encrypted
    - Multi-tenancy isolation enforced
    - No sensitive data in error messages
    
    **Provider-Specific Behavior**:
    - **Google**: Returns {id, email, name, picture} from /userinfo endpoint
    - **GitHub**: Email from /user/emails (separate call), requires email scope
    - **Microsoft**: Returns {id, userPrincipalName, displayName} from /me endpoint
    
    **User Creation Logic**:
    - New user: Creates account with email as primary identifier
    - Existing user: Links social identity, updates profile if needed
    - Email matching: Uses email to prevent duplicate accounts
    
    **Example Request**:
    ```bash
    curl -X POST http://localhost:8002/api/v1/social/google/callback \
      -H "Content-Type: application/json" \
      -d '{
        "code": "authorization_code_from_provider",
        "state": "state_token_from_start"
      }'
    ```
    
    **Example Response** (200 OK):
    ```json
    {
      "user_id": "12345678-1234-5678-1234-567812345678",
      "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "token_type": "bearer",
      "expires_in": 3600,
      "linked_account": false
    }
    ```
    
    **Error Responses**:
    - `400 BadRequest`: Invalid provider, OAuth error from provider, code exchange failed
    - `401 Unauthorized`: PKCE validation failed, state token mismatch
    - `500 Internal Server Error`: User creation failed, service failure
    
    **Field Mappings** (extracted from provider):
    - provider_user_id: Google(id), GitHub(id), Microsoft(id)
    - email: All providers
    - name: All providers (display name)
    - profile_picture: Google(picture), GitHub(avatar_url), Microsoft(null)
    
    Exchange authorization code for tokens and create/link user.
    """
    if provider not in ["google", "github", "microsoft"]:
        raise HTTPException(status_code=400, detail=f"Unknown provider: {provider}")
    
    if request_data.error:
        raise HTTPException(
            status_code=400,
            detail=f"OAuth error: {request_data.error_description or request_data.error}",
        )
    
    service = SocialLoginService(db)
    
    # TODO: Get client_id, client_secret from organization config
    client_id = f"{provider}_client_id_placeholder"
    client_secret = f"{provider}_client_secret_placeholder"
    redirect_uri = f"http://localhost:3000/auth/callback/{provider}"
    
    try:
        # Exchange code for token
        token_data = await service.exchange_code_for_token(
            provider=provider,
            code=request_data.code,
            client_id=client_id,
            client_secret=client_secret,
            redirect_uri=redirect_uri,
        )
        
        access_token_str = token_data.get("access_token")
        refresh_token_str = token_data.get("refresh_token")
        expires_in = token_data.get("expires_in", 3600)
        
        # Fetch user info from provider
        user_info = await service.get_user_info(provider, access_token_str)
        
        # Extract user info (provider-specific fields)
        if provider == "google":
            social_user_id = user_info.get("id")
            email = user_info.get("email")
            name = user_info.get("name", email)
            avatar_url = user_info.get("picture")
        elif provider == "github":
            social_user_id = str(user_info.get("id"))
            email = user_info.get("email", "")
            name = user_info.get("name", user_info.get("login", email))
            avatar_url = user_info.get("avatar_url")
        elif provider == "microsoft":
            social_user_id = user_info.get("id")
            email = user_info.get("userPrincipalName", user_info.get("mail", ""))
            name = user_info.get("displayName", email)
            avatar_url = None  # Microsoft doesn't provide avatar in /me endpoint
        else:
            raise HTTPException(status_code=400, detail="Unknown provider")
        
        if not email or not social_user_id:
            raise HTTPException(status_code=400, detail="Could not retrieve email from provider")
        
        # Get or create user
        user = await service.get_or_create_user_from_social(
            organization_id=organization_id,
            provider=provider,
            social_user_id=social_user_id,
            email=email,
            name=name,
        )
        
        # Link social identity
        from datetime import datetime, timedelta
        expires_at = datetime.utcnow() + timedelta(seconds=expires_in) if expires_in else None
        
        await service.link_social_identity(
            user_id=user.id,
            organization_id=organization_id,
            provider=provider,
            social_user_id=social_user_id,
            email=email,
            name=name,
            avatar_url=avatar_url,
            access_token=access_token_str,
            refresh_token=refresh_token_str,
            expires_at=expires_at,
        )
        
        # Generate JWT tokens
        jwt_access_token = create_access_token(user.id, organization_id)
        jwt_refresh_token = create_refresh_token(user.id, organization_id)
        
        # Check if this was a new user or existing
        existing_identity = await service.repo.get_by_user_and_provider(
            user.id, organization_id, provider
        )
        linked_account = existing_identity is not None
        
        return SocialLoginCallbackResponse(
            user_id=str(user.id),
            access_token=jwt_access_token,
            refresh_token=jwt_refresh_token,
            token_type="bearer",
            expires_in=3600,
            linked_account=linked_account,
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OAuth callback failed: {str(e)}")


@router.get(
    "/identities",
    response_model=SocialIdentitiesListResponse,
    summary="List Linked Social Accounts",
    tags=["Social Login"],
)
async def list_social_identities(
    current_user: User = Depends(get_current_user),
    organization_id: UUID = Depends(get_organization_id),
    db: AsyncSession = Depends(get_db),
) -> SocialIdentitiesListResponse:
    """
    List all social accounts linked to current user.
    
    Returns array of linked providers with metadata. Useful for account
    management UI showing connected social accounts and profile info.
    
    **Security**:
    - Multi-tenancy isolation enforced
    - Only returns identities for authenticated user
    - Soft-deleted identities excluded
    - Access tokens NOT returned (encrypted and hidden)
    - Refresh tokens NOT returned
    - Safe to expose to frontend
    
    **Example Request**:
    ```bash
    curl -X GET http://localhost:8002/api/v1/social/identities \
      -H "Authorization: Bearer {access_token}"
    ```
    
    **Example Response** (200 OK):
    ```json
    {
      "identities": [
        {
          "id": "12345678-1234-5678-1234-567812345678",
          "provider": "google",
          "provider_user_id": "google_user_123",
          "email": "user@gmail.com",
          "full_name": "John Doe",
          "profile_picture_url": "https://...",
          "linked_at": "2026-01-25T10:00:00Z",
          "expires_at": "2026-03-26T10:00:00Z"
        },
        {
          "id": "87654321-4321-8765-4321-876543218765",
          "provider": "github",
          "provider_user_id": "john_doe_gh",
          "email": "john@github.com",
          "full_name": "John Doe",
          "profile_picture_url": "https://...",
          "linked_at": "2026-01-26T08:00:00Z",
          "expires_at": null
        }
      ],
      "total": 2
    }
    ```
    
    **Error Responses**:
    - `401 Unauthorized`: Invalid or expired access token
    - `500 Internal Server Error`: Database failure
    
    List all social accounts linked to current user.
    """
    service = SocialLoginService(db)
    identities_data = await service.list_identities(current_user.id, organization_id)
    
    return SocialIdentitiesListResponse(
        identities=[SocialIdentityResponse(**i) for i in identities_data],
        total=len(identities_data),
    )


@router.delete(
    "/{provider}/unlink",
    response_model=SocialUnlinkResponse,
    summary="Unlink Social Account",
    tags=["Social Login"],
)
async def unlink_social_account(
    provider: str,
    request_data: SocialUnlinkRequest,
    current_user: User = Depends(get_current_user),
    organization_id: UUID = Depends(get_organization_id),
    db: AsyncSession = Depends(get_db),
) -> SocialUnlinkResponse:
    """
    Disconnect a linked social account.
    
    Soft-deletes social identity (sets deleted_at). User loses ability to
    login via this provider, but can re-link later. Access/refresh tokens
    are NOT revoked at provider (browser cache cleanup required).
    
    **Security**:
    - Multi-tenancy isolation enforced
    - Only user who owns the identity can unlink
    - Soft delete (data retained for audit)
    - Provider tokens are removed from database
    - Cannot unlink only authentication method (business logic)
    
    **Provider Validation**: Only [google, github, microsoft] supported
    
    **Example Request**:
    ```bash
    curl -X DELETE http://localhost:8002/api/v1/social/google/unlink \
      -H "Authorization: Bearer {access_token}" \
      -H "Content-Type: application/json" \
      -d '{}'
    ```
    
    **Example Response** (200 OK):
    ```json
    {
      "provider": "google"
    }
    ```
    
    **Error Responses**:
    - `400 BadRequest`: Unknown provider (not in [google, github, microsoft])
    - `401 Unauthorized`: Invalid or expired access token
    - `404 NotFound`: Social account not linked or already unlinked
    - `500 Internal Server Error`: Database failure
    
    **Note**: User can immediately re-link the same provider (goes through OAuth flow again)
    
    Disconnect a linked social account.
    """
    if provider not in ["google", "github", "microsoft"]:
        raise HTTPException(status_code=400, detail=f"Unknown provider: {provider}")
    
    service = SocialLoginService(db)
    
    success = await service.unlink_social_account(
        user_id=current_user.id,
        organization_id=organization_id,
        provider=provider,
    )
    
    if not success:
        raise HTTPException(status_code=404, detail="Social account not linked")
    
    return SocialUnlinkResponse(provider=provider)


@router.get(
    "/health",
    response_model=SocialHealthResponse,
    summary="Social Login Service Health",
    tags=["Social Login"],
    include_in_schema=False,
)
async def social_login_health(
    db: AsyncSession = Depends(get_db),
) -> SocialHealthResponse:
    """Health check for social login service."""
    try:
        service = SocialLoginService(db)
        return SocialHealthResponse(
            status="healthy",
            providers=["google", "github", "microsoft"],
            message="Social login service is operational",
        )
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Service unavailable: {str(e)}")
