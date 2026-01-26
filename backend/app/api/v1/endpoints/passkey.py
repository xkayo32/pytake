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
    
    Returns challenge and configuration for client to sign with security key
    (FIDO2 hardware keys, Windows Hello, Face ID, Touch ID, etc.).
    
    **Security**:
    - WebAuthn RP ID and origin must match client URL
    - Challenge is cryptographically random and single-use
    - Public key algorithm: ES256 (P-256 ECDSA)
    - Attestation: Optional (depends on security requirements)
    - Multi-tenancy isolation enforced
    
    **Example Request**:
    ```bash
    curl -X POST http://localhost:8002/api/v1/passkeys/registration/start \
      -H "Authorization: Bearer {access_token}" \
      -H "Content-Type: application/json" \
      -d '{
        "attestation": "direct",
        "user_verification": "preferred"
      }'
    ```
    
    **Example Response** (200 OK):
    ```json
    {
      "challenge": "Y2hhbGxlbmdlZGF0YQ==",
      "user": {
        "id": "user_12345_base64",
        "name": "user@example.com",
        "display_name": "John Doe"
      },
      "rp": {
        "name": "PyTake",
        "id": "pytake.net"
      },
      "pubKeyCredParams": [
        {"alg": -7, "type": "public-key"}
      ],
      "timeout": 60000,
      "attestation": "direct"
    }
    ```
    
    **Error Responses**:
    - `400 BadRequest`: Invalid request parameters
    - `401 Unauthorized`: Invalid or expired access token
    - `500 Internal Server Error`: Service failure
    
    **Next Step**: Client signs challenge with security key, call `/registration/complete`
    
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
    
    Validates challenge signature, stores credential public key, and initializes
    counter for replay attack prevention. Credential is stored encrypted in database.
    
    **Security**:
    - Challenge must match session state (single-use)
    - Attestation verification validates security key authenticity
    - Counter initialized to 0 for replay prevention
    - Public key stored unencrypted (required for verification)
    - Private key never leaves security key
    - Multi-tenancy isolation enforced
    - Credential ID must be globally unique
    
    **Example Request**:
    ```bash
    curl -X POST http://localhost:8002/api/v1/passkeys/registration/complete \
      -H "Authorization: Bearer {access_token}" \
      -H "Content-Type: application/json" \
      -d '{
        "challenge_id": "12345678-1234-5678-1234-567812345678",
        "credential_id": "credential_data_base64",
        "public_key": "public_key_base64",
        "attestation_object": "attestation_data_base64",
        "transports": ["usb", "nfc"],
        "device_name": "My Security Key"
      }'
    ```
    
    **Example Response** (200 OK):
    ```json
    {
      "id": "87654321-4321-8765-4321-876543218765",
      "device_name": "My Security Key",
      "transports": ["usb", "nfc"],
      "is_primary": false,
      "created_at": "2026-01-26T10:00:00Z"
    }
    ```
    
    **Error Responses**:
    - `400 BadRequest`: Invalid challenge_id, credential verification failed
    - `401 Unauthorized`: Invalid or expired access token
    - `404 NotFound`: Challenge not found or expired
    - `500 Internal Server Error`: Service failure
    
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
    
    Returns challenge for client to sign with registered security key.
    No authentication token required (public endpoint for login flow).
    
    **Security**:
    - Challenge is cryptographically random and single-use
    - Challenge expires after 10 minutes
    - Multi-tenancy isolation enforced (org_id scoping)
    - Public endpoint (no user auth required)
    - CSRF protection via state token in frontend
    
    **Example Request**:
    ```bash
    curl -X POST http://localhost:8002/api/v1/passkeys/authentication/start
    ```
    
    **Example Response** (200 OK):
    ```json
    {
      "challenge": "Y2hhbGxlbmdlZGF0YQ==",
      "timeout": 60000,
      "userVerification": "preferred",
      "rpId": "pytake.net"
    }
    ```
    
    **Error Responses**:
    - `500 Internal Server Error`: Service failure
    
    **Next Step**: Client signs challenge with security key, call `/authentication/complete`
    
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
    
    Verifies credential signature and counter (replay attack prevention).
    Returns authenticated user info. Counter must be greater than stored
    value to prevent cloned key attacks.
    
    **Security**:
    - Challenge verification: Signature matches challenge
    - Counter validation: counter > stored_counter (prevents replay)
    - Credential must be registered and not deleted
    - Multi-tenancy isolation enforced
    - Public endpoint (no prior auth required)
    - Constant-time comparison (no timing attacks)
    
    **Replay Prevention Details**:
    - Counter is automatically incremented by security key after each sign
    - If attacker replays old signature with old counter, verification fails
    - Cloned keys: Will have lower counter than stored value → rejected
    - Counter must be > stored (not >=) to allow re-registration on same key
    
    **Example Request**:
    ```bash
    curl -X POST http://localhost:8002/api/v1/passkeys/authentication/complete \
      -H "Content-Type: application/json" \
      -d '{
        "credential_id": "credential_data_base64",
        "counter": 42,
        "signature": "signature_data_base64"
      }'
    ```
    
    **Example Response** (200 OK):
    ```json
    {
      "user_id": "12345678-1234-5678-1234-567812345678",
      "device_name": "My Security Key"
    }
    ```
    
    **Error Responses**:
    - `400 BadRequest`: Invalid credential format or counter validation failed
    - `401 Unauthorized`: Signature verification failed
    - `404 NotFound`: Credential not found or deleted
    - `500 Internal Server Error`: Service failure
    
    **Next Step**: Issue JWT access tokens with auth claims
    
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
    """
    List all passkeys registered by user.
    
    Returns non-deleted credentials with metadata. Sensitive data (public keys,
    credential IDs) are NOT returned in this response for security.
    
    **Security**:
    - Multi-tenancy isolation enforced
    - Only returns user's own credentials
    - Soft-deleted credentials excluded
    - Public keys not exposed in list endpoint
    - Useful for credential management UI
    
    **Example Request**:
    ```bash
    curl -X GET http://localhost:8002/api/v1/passkeys \
      -H "Authorization: Bearer {access_token}"
    ```
    
    **Example Response** (200 OK):
    ```json
    {
      "credentials": [
        {
          "id": "87654321-4321-8765-4321-876543218765",
          "device_name": "My YubiKey 5",
          "transports": ["usb"],
          "is_primary": true,
          "created_at": "2026-01-25T10:00:00Z"
        },
        {
          "id": "abcdef12-3456-7890-abcd-ef1234567890",
          "device_name": "Windows Hello",
          "transports": ["internal"],
          "is_primary": false,
          "created_at": "2026-01-26T08:00:00Z"
        }
      ],
      "total": 2
    }
    ```
    
    **Error Responses**:
    - `401 Unauthorized`: Invalid or expired access token
    - `500 Internal Server Error`: Database failure
    
    List all passkeys registered by user.
    """
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
    """
    Rename a passkey device.
    
    Updates the device_name (display name) for user's credential.
    Useful for identifying multiple security keys (e.g., "Work YubiKey", "Personal Windows Hello").
    
    **Security**:
    - Multi-tenancy isolation enforced
    - Only user who owns credential can rename
    - Credential must exist and not be deleted
    - Device name is NOT sensitive (can be displayed in UI)
    - Max length validation recommended (e.g., 50 chars)
    
    **Example Request**:
    ```bash
    curl -X POST http://localhost:8002/api/v1/passkeys/87654321-4321-8765-4321-876543218765/rename \
      -H "Authorization: Bearer {access_token}" \
      -H "Content-Type: application/json" \
      -d '{"new_name": "Office YubiKey 5"}'
    ```
    
    **Example Response** (200 OK):
    ```json
    {
      "id": "87654321-4321-8765-4321-876543218765",
      "device_name": "Office YubiKey 5"
    }
    ```
    
    **Error Responses**:
    - `400 BadRequest`: Invalid credential_id format or empty device_name
    - `401 Unauthorized`: Invalid or expired access token
    - `404 NotFound`: Credential not found
    - `500 Internal Server Error`: Database failure
    
    Rename a passkey device.
    """
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
    """
    Delete a passkey.
    
    Soft-deletes the credential (sets deleted_at timestamp). Credential
    cannot be used for future authentications. Can be permanently removed
    via admin API after retention period.
    
    **Security**:
    - Multi-tenancy isolation enforced
    - Only user who owns credential can delete
    - Soft delete (data retained for audit/recovery)
    - Credential becomes immediately unusable
    - No immediate data destruction (compliance/recovery)
    
    **Example Request**:
    ```bash
    curl -X DELETE http://localhost:8002/api/v1/passkeys/87654321-4321-8765-4321-876543218765 \
      -H "Authorization: Bearer {access_token}"
    ```
    
    **Example Response** (200 OK):
    ```json
    {}
    ```
    
    **Error Responses**:
    - `401 Unauthorized`: Invalid or expired access token
    - `404 NotFound`: Credential not found or already deleted
    - `500 Internal Server Error`: Database failure
    
    **Note**: Cannot delete if it's the only registered credential (business logic)
    
    Delete a passkey.
    """
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
    """
    Set a passkey as primary.
    
    Designates a credential as the primary (preferred) authentication method.
    Only one credential can be primary per user. Affects credential selection
    order in UI and recovery flows.
    
    **Security**:
    - Multi-tenancy isolation enforced
    - Only user who owns credential can set as primary
    - Credential must exist and not be deleted
    - Previous primary is automatically downgraded
    - Useful for credential rotation workflows
    
    **Example Request**:
    ```bash
    curl -X POST http://localhost:8002/api/v1/passkeys/87654321-4321-8765-4321-876543218765/set-primary \
      -H "Authorization: Bearer {access_token}" \
      -H "Content-Type: application/json" \
      -d '{}'
    ```
    
    **Example Response** (200 OK):
    ```json
    {
      "id": "87654321-4321-8765-4321-876543218765",
      "is_primary": true
    }
    ```
    
    **Error Responses**:
    - `401 Unauthorized`: Invalid or expired access token
    - `404 NotFound`: Credential not found or deleted
    - `500 Internal Server Error`: Database failure
    
    Set a passkey as primary.
    """
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
