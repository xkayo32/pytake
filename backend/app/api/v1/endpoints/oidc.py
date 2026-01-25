"""
OIDC (OpenID Connect) Endpoints
REST endpoints for OpenID Connect / OAuth 2.0 authentication flows.

Endpoints:
- GET /.well-known/openid-configuration - OIDC discovery document
- GET /authorize - Initiate authorization code flow
- POST /token - Exchange authorization code for tokens
- GET /userinfo - Get user information
- POST /logout - OIDC logout request
"""

from uuid import UUID
from fastapi import APIRouter, Depends, Request, Query
from fastapi.responses import RedirectResponse, JSONResponse

from app.api.deps import get_current_user, get_db
from app.services.oidc_service import OIDCService
from app.core.exceptions import UnauthorizedException, NotFoundException, BadRequestException
from app.models import User
from sqlalchemy.ext.asyncio import AsyncSession


router = APIRouter(prefix="/oidc", tags=["oidc"])


@router.get("/.well-known/openid-configuration")
async def oidc_discovery(
    organization_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """
    Get OIDC discovery document.
    
    Describes OIDC endpoints, supported scopes, grant types, algorithms, etc.
    Standard OIDC endpoint used for client discovery and configuration.
    
    Args:
        organization_id: Organization ID
        
    Returns:
        JSON OIDC discovery document
    """
    service = OIDCService(db)
    
    try:
        discovery_doc = await service.get_discovery_document(organization_id)
        return JSONResponse(
            status_code=200,
            content=discovery_doc,
        )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": "Failed to fetch discovery document"}
        )


@router.get("/{organization_id}/authorize")
async def oidc_authorize(
    organization_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Initiate OIDC authorization code flow.
    
    Generates authorization URL and redirects user to OIDC provider for login.
    
    Query Parameters:
        - provider_id (required): OAuth provider configuration ID
        - redirect_uri (required): Callback URL (must match provider config)
        - state (optional): CSRF protection state
        - nonce (optional): Nonce for ID token validation
        - scope (optional): Requested scopes (default: openid profile email)
        
    Returns:
        302 Redirect to OIDC provider authorization URL
    """
    service = OIDCService(db)
    
    try:
        provider_id_param = request.query_params.get("provider_id")
        redirect_uri = request.query_params.get("redirect_uri")
        state = request.query_params.get("state")
        nonce = request.query_params.get("nonce")
        scope_param = request.query_params.get("scope")
        
        if not provider_id_param:
            raise BadRequestException("Missing required parameter: provider_id")
        if not redirect_uri:
            raise BadRequestException("Missing required parameter: redirect_uri")
        
        provider_id = UUID(provider_id_param)
        scopes = scope_param.split() if scope_param else None
        
        auth_url = await service.get_authorization_url(
            organization_id=organization_id,
            provider_id=provider_id,
            redirect_uri=redirect_uri,
            state=state,
            nonce=nonce,
            scopes=scopes,
        )
        
        return RedirectResponse(url=auth_url, status_code=302)
        
    except BadRequestException as e:
        return JSONResponse(status_code=400, content={"error": str(e)})
    except NotFoundException as e:
        return JSONResponse(status_code=404, content={"error": str(e)})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": "Internal server error"})


@router.post("/{organization_id}/token")
async def oidc_token(
    organization_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Token endpoint - Exchange authorization code for tokens.
    
    Implements OAuth 2.0 authorization code grant with OIDC extensions.
    
    Form Parameters:
        - grant_type (required): Must be "authorization_code"
        - code (required): Authorization code from authorize endpoint
        - redirect_uri (required): Must match original redirect_uri
        - client_id (required): OAuth provider ID (from PyTake)
        - client_secret (required): OAuth provider secret (from PyTake)
        
    Returns:
        JSON with access_token, id_token (JWT), expires_in, token_type
    """
    service = OIDCService(db)
    
    try:
        form_data = await request.form()
        grant_type = form_data.get("grant_type")
        code = form_data.get("code")
        redirect_uri = form_data.get("redirect_uri")
        client_id_param = form_data.get("client_id")
        client_secret = form_data.get("client_secret")
        
        # Validate grant type
        if grant_type != "authorization_code":
            raise BadRequestException(f"Unsupported grant_type: {grant_type}")
        
        if not code:
            raise BadRequestException("Missing required parameter: code")
        if not redirect_uri:
            raise BadRequestException("Missing required parameter: redirect_uri")
        if not client_id_param:
            raise BadRequestException("Missing required parameter: client_id")
        
        provider_id = UUID(client_id_param)
        
        # Extract client context
        client_ip = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "unknown")
        
        # Exchange code for tokens
        access_token, refresh_token = await service.exchange_code_for_tokens(
            organization_id=organization_id,
            provider_id=provider_id,
            authorization_code=code,
            redirect_uri=redirect_uri,
            client_ip=client_ip,
            user_agent=user_agent,
        )
        
        return JSONResponse(
            status_code=200,
            content={
                "access_token": access_token,
                "refresh_token": refresh_token,
                "token_type": "bearer",
                "expires_in": 900,  # 15 minutes
                "id_token": access_token,  # In real OIDC, separate JWT with user claims
            }
        )
        
    except BadRequestException as e:
        return JSONResponse(status_code=400, content={"error": str(e)})
    except UnauthorizedException as e:
        return JSONResponse(status_code=401, content={"error": str(e)})
    except NotFoundException as e:
        return JSONResponse(status_code=404, content={"error": str(e)})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": "Internal server error"})


@router.get("/{organization_id}/userinfo")
async def oidc_userinfo(
    organization_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    UserInfo endpoint - Get authenticated user information.
    
    Standard OIDC endpoint returning user claims.
    
    Returns:
        JSON with user claims (sub, email, name, etc.)
    """
    service = OIDCService(db)
    
    try:
        userinfo = await service.get_userinfo(
            organization_id=organization_id,
            user_id=current_user.id,
        )
        
        return JSONResponse(
            status_code=200,
            content=userinfo,
        )
        
    except NotFoundException as e:
        return JSONResponse(status_code=404, content={"error": str(e)})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": "Internal server error"})


@router.post("/{organization_id}/logout")
async def oidc_logout(
    organization_id: UUID,
    current_user: User = Depends(get_current_user),
    request: Request = None,
    db: AsyncSession = Depends(get_db),
):
    """
    OIDC logout endpoint.
    
    Terminates user session and invalidates tokens.
    
    Query Parameters:
        - id_token_hint (optional): Hint about ID token being logged out
        - post_logout_redirect_uri (optional): URL to redirect after logout
        
    Returns:
        Redirect to post_logout_redirect_uri or JSON logout confirmation
    """
    service = OIDCService(db)
    
    try:
        client_ip = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "unknown")
        
        # Get optional redirect URI
        post_logout_redirect_uri = request.query_params.get("post_logout_redirect_uri")
        
        # Process logout
        await service.process_logout(
            organization_id=organization_id,
            user_id=current_user.id,
            ip_address=client_ip,
            user_agent=user_agent,
        )
        
        # Get token from header and blacklist it
        auth_header = request.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
            from app.services.session_manager import SessionManager
            await SessionManager.blacklist_token(
                user_id=current_user.id,
                token=token,
                expires_in=900,
            )
        
        # Redirect or return JSON
        if post_logout_redirect_uri:
            return RedirectResponse(url=post_logout_redirect_uri, status_code=302)
        else:
            return JSONResponse(
                status_code=200,
                content={"message": "Logout successful"}
            )
        
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": "Internal server error"})


@router.get("/{organization_id}/health")
async def oidc_health_check(
    organization_id: UUID,
):
    """Health check for OIDC service (for monitoring)."""
    return JSONResponse(
        status_code=200,
        content={
            "status": "healthy",
            "service": "oidc",
            "organization_id": str(organization_id),
        }
    )
