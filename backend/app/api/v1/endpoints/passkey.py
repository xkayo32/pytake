"""
Passkey (WebAuthn) API Endpoints
Passwordless authentication via FIDO2 credentials.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user, get_organization_id
from app.models.user import User
from app.services.passkey_service import PasskeyService
from app.schemas.passkey_schemas import (
    PasskeyRegistrationStartRequest,
    PasskeyRegistrationStartResponse,
    PasskeyRegistrationCompleteRequest,
    PasskeyRegistrationCompleteResponse,
    PasskeyAuthenticationStartResponse,
    PasskeyAuthenticationCompleteRequest,
    PasskeyAuthenticationCompleteResponse,
    PasskeyListResponse,
    PasskeyCredentialResponse,
    PasskeyRenameRequest,
    PasskeyRenameResponse,
    PasskeyDeleteResponse,
    PasskeySetPrimaryRequest,
    PasskeySetPrimaryResponse,
    PasskeyHealthResponse,
)
from app.core.exceptions import HTTPException


router = APIRouter(prefix="/passkeys", tags=["Passwordless"])


@router.post(
    "/registration/start",
    response_model=PasskeyRegistrationStartResponse,
    summary="Start Passkey Registration",
    tags=["Passwordless"],
)
async def start_passkey_registration(
    request_data: PasskeyRegistrationStartRequest,
    current_user: User = Depends(get_current_user),
    organization_id: UUID = Depends(get_organization_id),
    db: AsyncSession = Depends(get_db),
) -> PasskeyRegistrationStartResponse:
    """
    Initiate WebAuthn credential registration.
    Returns challenge and configuration for client.
    """
    service = PasskeyService(db)
    result = await service.initiate_registration(current_user.id, organization_id)
    
    return PasskeyRegistrationStartResponse(**result)


@router.post(
    "/registration/complete",
    response_model=PasskeyRegistrationCompleteResponse,
    summary="Complete Passkey Registration",
    tags=["Passwordless"],
)
async def complete_passkey_registration(
    request_data: PasskeyRegistrationCompleteRequest,
    current_user: User = Depends(get_current_user),
    organization_id: UUID = Depends(get_organization_id),
    db: AsyncSession = Depends(get_db),
) -> PasskeyRegistrationCompleteResponse:
    """
    Complete WebAuthn credential registration.
    Validates challenge and stores credential.
    """
    service = PasskeyService(db)
    
    try:
        challenge_uuid = UUID(request_data.challenge_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid challenge_id format")
    
    credential = await service.complete_registration(
        user_id=current_user.id,
        organization_id=organization_id,
        challenge_id=challenge_uuid,
        credential_id_b64=request_data.credential_id,
        public_key_b64=request_data.public_key,
        transports=request_data.transports,
        device_name=request_data.device_name or request_data.credential_id[:20],
        attestation_object=request_data.attestation_object,
    )
    
    return PasskeyRegistrationCompleteResponse(
        id=str(credential.id),
        device_name=credential.device_name,
        transports=credential.transports,
        is_primary=credential.is_primary,
        created_at=credential.created_at.isoformat(),
    )


@router.post(
    "/authentication/start",
    response_model=PasskeyAuthenticationStartResponse,
    summary="Start Passkey Authentication",
    tags=["Passwordless"],
)
async def start_passkey_authentication(
    organization_id: UUID = Depends(get_organization_id),
    db: AsyncSession = Depends(get_db),
) -> PasskeyAuthenticationStartResponse:
    """
    Initiate WebAuthn authentication (login).
    Returns challenge for client to sign with credential.
    """
    service = PasskeyService(db)
    result = await service.initiate_authentication(organization_id)
    
    return PasskeyAuthenticationStartResponse(**result)


@router.post(
    "/authentication/complete",
    response_model=PasskeyAuthenticationCompleteResponse,
    summary="Complete Passkey Authentication",
    tags=["Passwordless"],
)
async def complete_passkey_authentication(
    request_data: PasskeyAuthenticationCompleteRequest,
    organization_id: UUID = Depends(get_organization_id),
    db: AsyncSession = Depends(get_db),
) -> PasskeyAuthenticationCompleteResponse:
    """
    Complete WebAuthn authentication.
    Verifies credential and returns authenticated user.
    """
    service = PasskeyService(db)
    
    credential, user = await service.complete_authentication(
        organization_id=organization_id,
        credential_id_b64=request_data.credential_id,
        counter=request_data.counter,
        signature=request_data.signature,
    )
    
    return PasskeyAuthenticationCompleteResponse(
        user_id=str(user.id),
        device_name=credential.device_name,
    )


@router.get(
    "",
    response_model=PasskeyListResponse,
    summary="List My Passkeys",
    tags=["Passwordless"],
)
async def list_passkeys(
    current_user: User = Depends(get_current_user),
    organization_id: UUID = Depends(get_organization_id),
    db: AsyncSession = Depends(get_db),
) -> PasskeyListResponse:
    """List all passkeys registered by user."""
    service = PasskeyService(db)
    credentials_data = await service.list_credentials(current_user.id, organization_id)
    
    return PasskeyListResponse(
        credentials=[PasskeyCredentialResponse(**c) for c in credentials_data],
        total=len(credentials_data),
    )


@router.post(
    "/{credential_id}/rename",
    response_model=PasskeyRenameResponse,
    summary="Rename Passkey",
    tags=["Passwordless"],
)
async def rename_passkey(
    credential_id: UUID,
    request_data: PasskeyRenameRequest,
    current_user: User = Depends(get_current_user),
    organization_id: UUID = Depends(get_organization_id),
    db: AsyncSession = Depends(get_db),
) -> PasskeyRenameResponse:
    """Rename a passkey device."""
    service = PasskeyService(db)
    
    credential = await service.rename_credential(
        credential_id=credential_id,
        user_id=current_user.id,
        organization_id=organization_id,
        new_name=request_data.new_name,
    )
    
    return PasskeyRenameResponse(
        id=str(credential.id),
        device_name=credential.device_name,
    )


@router.delete(
    "/{credential_id}",
    response_model=PasskeyDeleteResponse,
    summary="Delete Passkey",
    tags=["Passwordless"],
)
async def delete_passkey(
    credential_id: UUID,
    current_user: User = Depends(get_current_user),
    organization_id: UUID = Depends(get_organization_id),
    db: AsyncSession = Depends(get_db),
) -> PasskeyDeleteResponse:
    """Delete a passkey."""
    service = PasskeyService(db)
    
    success = await service.delete_credential(
        credential_id=credential_id,
        user_id=current_user.id,
        organization_id=organization_id,
    )
    
    if not success:
        raise HTTPException(status_code=404, detail="Credential not found")
    
    return PasskeyDeleteResponse()


@router.post(
    "/{credential_id}/set-primary",
    response_model=PasskeySetPrimaryResponse,
    summary="Set Primary Passkey",
    tags=["Passwordless"],
)
async def set_primary_passkey(
    credential_id: UUID,
    request_data: PasskeySetPrimaryRequest,
    current_user: User = Depends(get_current_user),
    organization_id: UUID = Depends(get_organization_id),
    db: AsyncSession = Depends(get_db),
) -> PasskeySetPrimaryResponse:
    """Set a passkey as primary."""
    service = PasskeyService(db)
    
    credential = await service.set_primary_credential(
        credential_id=credential_id,
        user_id=current_user.id,
        organization_id=organization_id,
    )
    
    return PasskeySetPrimaryResponse(
        id=str(credential.id),
        is_primary=credential.is_primary,
    )


@router.get(
    "/health",
    response_model=PasskeyHealthResponse,
    summary="Passkey Service Health",
    tags=["Passwordless"],
    include_in_schema=False,
)
async def passkey_health(
    db: AsyncSession = Depends(get_db),
) -> PasskeyHealthResponse:
    """Health check for passwordless service."""
    try:
        service = PasskeyService(db)
        return PasskeyHealthResponse(
            status="healthy",
            passkey_enabled=True,
            message="Passkey service is operational",
        )
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Service unavailable: {str(e)}")
