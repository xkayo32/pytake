"""
SAML 2.0 Endpoints
REST endpoints for SAML authentication flows (SP side).

Endpoints:
- GET /metadata - Service Provider metadata (for IdP discovery)
- POST /login - Initiate SAML AuthnRequest
- POST /acs - Assertion Consumer Service (IdP callback)
- POST /logout - Single Logout request
"""

from uuid import UUID
from fastapi import APIRouter, Depends, Request
from fastapi.responses import RedirectResponse, JSONResponse
from starlette.datastructures import FormData

from app.api.deps import get_current_user, get_db
from app.schemas.saml_schemas import TokenResponse
from app.services.saml_service import SAMLService
from app.core.exceptions import UnauthorizedException, NotFoundException, BadRequestException
from app.models import User
from sqlalchemy.ext.asyncio import AsyncSession


router = APIRouter(prefix="/saml", tags=["saml"])


@router.get("/{organization_id}/metadata")
async def get_saml_metadata(
    organization_id: UUID,
    provider_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """
    Get Service Provider (SP) SAML metadata.
    
    IdPs use this endpoint to discover SP configuration for SAML integration.
    Returns XML metadata describing our SP endpoints and certificates.
    
    Args:
        organization_id: Organization ID
        provider_id: OAuth provider (SAML IdP) ID
        
    Returns:
        XML metadata document (application/xml)
    """
    service = SAMLService(db)
    
    try:
        # TODO: Generate SP metadata XML from provider configuration
        # This is typically static or cached metadata describing:
        # - SP entityID
        # - ACS endpoint URL
        # - SLO endpoint URL
        # - SP certificate (public key)
        # - NameID format supported
        # - Attributes requested
        
        metadata_xml = """<?xml version="1.0" encoding="UTF-8"?>
<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata"
    entityID="https://api.pytake.net/saml/metadata">
    <SPSSODescriptor 
        AuthnRequestsSigned="true"
        WantAssertionsSigned="true"
        protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
        <AssertionConsumerService 
            Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
            Location="https://api.pytake.net/api/v1/saml/{organization_id}/acs"
            index="1" isDefault="true"/>
        <SingleLogoutService
            Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
            Location="https://api.pytake.net/api/v1/saml/{organization_id}/slo"/>
    </SPSSODescriptor>
</EntityDescriptor>"""
        
        return JSONResponse(
            content={"metadata": metadata_xml},
            media_type="application/xml"
        )
        
    except Exception as e:
        return JSONResponse(
            status_code=400,
            content={"error": str(e)}
        )


@router.post("/{organization_id}/login")
async def initiate_saml_login(
    organization_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Initiate SAML authentication flow.
    
    Generates SAML AuthnRequest and redirects user to IdP for login.
    
    Query Parameters:
        - provider_id (required): OAuth provider configuration ID
        - relay_state (optional): URL to redirect to after successful login
        
    Returns:
        302 Redirect to IdP login URL
    """
    service = SAMLService(db)
    
    try:
        provider_id_param = request.query_params.get("provider_id")
        if not provider_id_param:
            raise ValidationError("Missing required parameter: provider_id")
        
        provider_id = UUID(provider_id_param)
        relay_state = request.query_params.get("relay_state")
        
        login_url = await service.get_sso_login_url(
            organization_id=organization_id,
            provider_id=provider_id,
            relay_state=relay_state,
        )
        
        return RedirectResponse(url=login_url, status_code=302)
        
    except BadRequestException as e:
        return JSONResponse(status_code=400, content={"error": str(e)})
    except NotFoundException as e:
        return JSONResponse(status_code=404, content={"error": str(e)})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": "Internal server error"})


@router.post("/{organization_id}/acs")
async def saml_assertion_consumer_service(
    organization_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Assertion Consumer Service (ACS) endpoint.
    
    IdP POSTs signed assertion here after user authenticates.
    Validates assertion, creates/links user identity, and returns JWT tokens.
    
    Form Parameters:
        - SAMLResponse (required): Base64-encoded signed SAML assertion
        - RelayState (optional): State from AuthnRequest
        
    Returns:
        - Success: JSON with access_token and refresh_token
        - Failure: JSON error message
    """
    service = SAMLService(db)
    
    try:
        # Get form data
        form_data = await request.form()
        saml_response = form_data.get("SAMLResponse")
        relay_state = form_data.get("RelayState")
        provider_id_param = form_data.get("provider_id")  # Could be in query or form
        
        if not saml_response:
            raise ValidationError("Missing required parameter: SAMLResponse")
        
        if not provider_id_param:
            provider_id_param = request.query_params.get("provider_id")
            if not provider_id_param:
                raise ValidationError("Missing required parameter: provider_id")
        
        provider_id = UUID(provider_id_param)
        
        # Extract client context for audit
        client_ip = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "unknown")
        
        # Process SAML response
        acs_response = {
            "SAMLResponse": saml_response,
            "RelayState": relay_state,
            "ip_address": client_ip,
            "user_agent": user_agent,
        }
        
        access_token, refresh_token = await service.process_acs_response(
            organization_id=organization_id,
            provider_id=provider_id,
            acs_response=acs_response,
            relay_state=relay_state,
        )
        
        # Return tokens (client stores in localStorage/sessionStorage)
        return JSONResponse(
            status_code=200,
            content={
                "access_token": access_token,
                "refresh_token": refresh_token,
                "token_type": "bearer",
                "expires_in": 900,  # 15 minutes
            }
        )
        
    except BadRequestException as e:
        return JSONResponse(status_code=400, content={"error": str(e)})
    except UnauthorizedException as e:
        return JSONResponse(status_code=401, content={"error": str(e)})
    except NotFoundException as e:
        return JSONResponse(status_code=404, content={"error": str(e)})
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": "Internal server error"}
        )


@router.post("/{organization_id}/slo")
async def saml_single_logout(
    organization_id: UUID,
    current_user: User = Depends(get_current_user),
    request: Request = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Single Logout (SLO) endpoint.
    
    Initiates SAML logout request to IdP. Used when user clicks "Logout" in UI.
    Also blacklists the current session token.
    
    Query Parameters:
        - provider_id (required): OAuth provider configuration ID
        
    Returns:
        302 Redirect to IdP logout confirmation or
        JSON response with logout success
    """
    service = SAMLService(db)
    
    try:
        provider_id_param = request.query_params.get("provider_id")
        if not provider_id_param:
            raise BadRequestException("Missing required parameter: provider_id")
        
        provider_id = UUID(provider_id_param)
        
        # Extract client context
        client_ip = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "unknown")
        
        # Get current token and blacklist it
        auth_header = request.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]  # Remove "Bearer " prefix
            from app.services.session_manager import SessionManager
            # Blacklist token for 15 minutes (default access token TTL)
            await SessionManager.blacklist_token(
                user_id=current_user.id,
                token=token,
                expires_in=900,  # 15 minutes
            )
        
        logout_url = await service.process_logout_request(
            organization_id=organization_id,
            provider_id=provider_id,
            user_id=current_user.id,
            ip_address=client_ip,
            user_agent=user_agent,
        )
        
        # Redirect to IdP for SLO
        return RedirectResponse(url=logout_url, status_code=302)
        
    except BadRequestException as e:
        return JSONResponse(status_code=400, content={"error": str(e)})
    except NotFoundException as e:
        return JSONResponse(status_code=404, content={"error": str(e)})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": "Internal server error"})


@router.get("/{organization_id}/health")
async def saml_health_check(
    organization_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Health check for SAML service (for monitoring)."""
    return JSONResponse(
        status_code=200,
        content={
            "status": "healthy",
            "service": "saml",
            "organization_id": str(organization_id),
        }
    )
