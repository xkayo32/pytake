"""
MFA (Multi-Factor Authentication) Endpoints
Handles TOTP and SMS MFA setup and verification.
"""

from uuid import UUID
from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse

from app.api.deps import get_current_user, get_db
from app.services.mfa_service import MFAService
from app.core.exceptions import BadRequestException, UnauthorizedException, NotFoundException
from app.models import User
from sqlalchemy.ext.asyncio import AsyncSession


router = APIRouter(prefix="/mfa", tags=["mfa"])


@router.post("/setup-totp")
async def setup_totp_mfa(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Initialize TOTP (Time-based One-Time Password) MFA setup.
    
    Generates a secret key and returns a QR code URL for scanning with
    authenticator apps (Google Authenticator, Authy, Microsoft Authenticator, etc.).
    
    **Security**: 
    - Secret is encrypted before storage (Fernet AES-128)
    - Multi-tenancy isolation enforced (org_id filtering)
    - No rate limiting on setup (safe operation)
    
    **Example Request**:
    ```bash
    curl -X POST http://localhost:8002/api/v1/mfa/setup-totp \
      -H "Authorization: Bearer {access_token}" \
      -H "Content-Type: application/json"
    ```
    
    **Example Response** (200 OK):
    ```json
    {
      "secret": "JBSWY3DPEBLW64TMMQ======",
      "qr_code_url": "otpauth://totp/PyTake:user@example.com?secret=...",
      "message": "Scan QR code with authenticator app, then verify with 6-digit code"
    }
    ```
    
    **Error Responses**:
    - `400 BadRequest`: User already has TOTP enabled or invalid state
    - `401 Unauthorized`: Invalid or expired access token
    - `500 Internal Server Error`: Database or service failure
    
    **Next Step**: Call `/verify-totp` with the 6-digit code from app
    
    Returns:
        JSON with secret and QR code URL for scanning.
    """
    try:
        service = MFAService(db)
        secret, qr_code_url = await service.setup_totp_mfa(
            organization_id=current_user.organization_id,
            user_id=current_user.id,
        )
        
        return JSONResponse(
            status_code=200,
            content={
                "secret": secret,
                "qr_code_url": qr_code_url,
                "message": "Scan QR code with authenticator app, then verify with 6-digit code",
            }
        )
    except BadRequestException as e:
        return JSONResponse(status_code=400, content={"error": str(e)})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": "Internal server error"})


@router.post("/verify-totp")
async def verify_totp_mfa(
    code: str,
    set_as_primary: bool = True,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Verify TOTP code and enable MFA for the user.
    
    Validates the 6-digit TOTP code, generates backup codes, and marks
    MFA as active. Backup codes serve as recovery mechanism if user loses
    access to authenticator app.
    
    **Security**:
    - Rate limited: 3 failed attempts per 15-minute window
    - Time-window validation: ±30 seconds for clock drift
    - Backup codes are single-use and encrypted
    - Multi-tenancy isolation enforced
    - TOTP codes are time-based and cannot be replayed
    
    **Example Request**:
    ```bash
    curl -X POST http://localhost:8002/api/v1/mfa/verify-totp \
      -H "Authorization: Bearer {access_token}" \
      -H "Content-Type: application/json" \
      -d '{"code": "123456", "set_as_primary": true}'
    ```
    
    **Example Response** (200 OK):
    ```json
    {
      "message": "TOTP MFA enabled successfully",
      "backup_codes": ["CODE-1234-5678", "CODE-1234-5679", ...],
      "note": "Save these backup codes in a secure location. You can use them if you lose access to your authenticator."
    }
    ```
    
    **Error Responses**:
    - `400 BadRequest`: Invalid TOTP code, already MFA enabled, or code expired
    - `401 Unauthorized`: Invalid or expired access token
    - `429 Too Many Requests`: Rate limit exceeded (3 attempts per 15 min)
    - `500 Internal Server Error`: Database or service failure
    
    **Backup Codes Usage**: Use codes from `/backup-codes` endpoint if TOTP unavailable
    
    Args:
        code: 6-digit TOTP code from authenticator app
        set_as_primary: If true, set as primary MFA method
    
    Returns:
        JSON with backup codes and success message.
    """
    try:
        service = MFAService(db)
        
        # Verify TOTP code
        await service.verify_totp_mfa(
            organization_id=current_user.organization_id,
            user_id=current_user.id,
            code=code,
            set_as_primary=set_as_primary,
        )
        
        # Get backup codes
        backup_codes = await service.get_backup_codes(
            organization_id=current_user.organization_id,
            user_id=current_user.id,
        )
        
        return JSONResponse(
            status_code=200,
            content={
                "message": "TOTP MFA enabled successfully",
                "backup_codes": backup_codes,
                "note": "Save these backup codes in a secure location. You can use them if you lose access to your authenticator.",
            }
        )
    except UnauthorizedException as e:
        return JSONResponse(status_code=401, content={"error": str(e)})
    except BadRequestException as e:
        return JSONResponse(status_code=400, content={"error": str(e)})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": "Internal server error"})


@router.post("/setup-sms")
async def setup_sms_mfa(
    phone_number: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Initialize SMS MFA setup.
    
    Sends a one-time code to the provided phone number. User must verify
    the code within 10 minutes to complete SMS MFA activation.
    
    **Security**:
    - SMS codes are encrypted (Fernet AES-128) before storage
    - Challenge tokens are short-lived (10 minute expiry)
    - Multi-tenancy isolation enforced
    - Phone number validation (E.164 format recommended)
    - Delivery confirmation not guaranteed by SMS providers
    
    **Example Request**:
    ```bash
    curl -X POST http://localhost:8002/api/v1/mfa/setup-sms \
      -H "Authorization: Bearer {access_token}" \
      -H "Content-Type: application/json" \
      -d '{"phone_number": "+1234567890"}'
    ```
    
    **Example Response** (200 OK):
    ```json
    {
      "challenge_token": "chal_1234567890abcdef",
      "message": "SMS code sent to phone number. Verify with code from SMS."
    }
    ```
    
    **Error Responses**:
    - `400 BadRequest`: Invalid phone number format or SMS already enabled
    - `401 Unauthorized`: Invalid or expired access token
    - `500 Internal Server Error`: SMS delivery failed or database error
    
    **Next Step**: Call `/verify-sms` with challenge_token and code received
    
    Args:
        phone_number: Phone number to send SMS codes to (E.164 format: +[country code][number])
    
    Returns:
        JSON with challenge token for verification.
    """
    try:
        service = MFAService(db)
        
        challenge_token = await service.setup_sms_mfa(
            organization_id=current_user.organization_id,
            user_id=current_user.id,
            phone_number=phone_number,
        )
        
        return JSONResponse(
            status_code=200,
            content={
                "challenge_token": challenge_token,
                "message": "SMS code sent to phone number. Verify with code from SMS.",
            }
        )
    except BadRequestException as e:
        return JSONResponse(status_code=400, content={"error": str(e)})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": "Internal server error"})


@router.post("/verify-sms")
async def verify_sms_mfa(
    challenge_token: str,
    code: str,
    set_as_primary: bool = True,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Verify SMS code and enable MFA.
    
    Validates the SMS code received by user and activates SMS-based MFA.
    Generates backup codes for account recovery.
    
    **Security**:
    - Rate limited: 3 failed verification attempts per 15-minute window
    - Codes expire after 10 minutes
    - Challenge tokens are single-use
    - Backup codes are encrypted and single-use
    - Multi-tenancy isolation enforced
    - SMS codes cannot be replayed after first verification
    
    **Example Request**:
    ```bash
    curl -X POST http://localhost:8002/api/v1/mfa/verify-sms \
      -H "Authorization: Bearer {access_token}" \
      -H "Content-Type: application/json" \
      -d '{
        "challenge_token": "chal_1234567890abcdef",
        "code": "123456",
        "set_as_primary": true
      }'
    ```
    
    **Example Response** (200 OK):
    ```json
    {
      "message": "SMS MFA enabled successfully",
      "backup_codes": ["CODE-1234-5678", "CODE-1234-5679", ...],
      "note": "Save these backup codes in a secure location."
    }
    ```
    
    **Error Responses**:
    - `400 BadRequest`: Invalid code, expired challenge, or SMS already enabled
    - `401 Unauthorized`: Invalid or expired access token
    - `404 NotFound`: Challenge token not found
    - `429 Too Many Requests`: Rate limit exceeded (3 attempts per 15 min)
    - `500 Internal Server Error`: Database or service failure
    
    Args:
        challenge_token: Challenge token from setup endpoint
        code: SMS code received
        set_as_primary: If true, set as primary MFA method
    
    Returns:
        JSON with backup codes and success message.
    """
    try:
        service = MFAService(db)
        
        # Verify SMS code
        await service.verify_sms_code(
            organization_id=current_user.organization_id,
            challenge_token=challenge_token,
            code=code,
            set_as_primary=set_as_primary,
        )
        
        # Get backup codes
        backup_codes = await service.get_backup_codes(
            organization_id=current_user.organization_id,
            user_id=current_user.id,
        )
        
        return JSONResponse(
            status_code=200,
            content={
                "message": "SMS MFA enabled successfully",
                "backup_codes": backup_codes,
                "note": "Save these backup codes in a secure location.",
            }
        )
    except UnauthorizedException as e:
        return JSONResponse(status_code=401, content={"error": str(e)})
    except BadRequestException as e:
        return JSONResponse(status_code=400, content={"error": str(e)})
    except NotFoundException as e:
        return JSONResponse(status_code=404, content={"error": str(e)})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": "Internal server error"})


@router.get("/methods")
async def list_mfa_methods(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List all MFA methods configured for current user.
    
    Returns active MFA methods (TOTP, SMS, Backup Codes) with metadata.
    Useful for MFA management dashboard and account recovery flows.
    
    **Security**:
    - Multi-tenancy isolation enforced
    - Only returns methods for authenticated user
    - Soft-deleted methods are excluded
    - Sensitive data (secrets) never exposed
    
    **Example Request**:
    ```bash
    curl -X GET http://localhost:8002/api/v1/mfa/methods \
      -H "Authorization: Bearer {access_token}"
    ```
    
    **Example Response** (200 OK):
    ```json
    {
      "methods": [
        {
          "id": "12345678-1234-5678-1234-567812345678",
          "type": "totp",
          "is_verified": true,
          "is_primary": true,
          "created_at": "2026-01-25T10:00:00Z",
          "last_used_at": "2026-01-26T09:15:00Z"
        },
        {
          "id": "87654321-4321-8765-4321-876543218765",
          "type": "sms",
          "is_verified": true,
          "is_primary": false,
          "created_at": "2026-01-26T08:00:00Z",
          "last_used_at": null
        }
      ]
    }
    ```
    
    **Error Responses**:
    - `401 Unauthorized`: Invalid or expired access token
    - `500 Internal Server Error`: Database failure
    
    Returns:
        JSON array of MFA methods with metadata.
    """
    try:
        service = MFAService(db)
        mfa_repo = service.mfa_method_repo
        
        methods = await mfa_repo.get_by_user(
            user_id=current_user.id,
            organization_id=current_user.organization_id,
        )
        
        return JSONResponse(
            status_code=200,
            content={
                "methods": [
                    {
                        "id": str(m.id),
                        "type": m.method_type,
                        "is_verified": m.is_verified,
                        "is_primary": m.is_primary,
                        "created_at": m.created_at.isoformat() if m.created_at else None,
                        "last_used_at": m.last_used_at.isoformat() if m.last_used_at else None,
                    }
                    for m in methods
                ]
            }
        )
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": "Internal server error"})


@router.delete("/methods/{method_id}")
async def disable_mfa_method(
    method_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Disable/remove MFA method for current user.
    
    Soft-deletes the MFA method (sets deleted_at timestamp). User can
    re-enable the same method by going through setup again. All associated
    challenges and backup codes are also soft-deleted.
    
    **Security**:
    - Multi-tenancy isolation enforced
    - Only user who owns the method can disable it
    - Soft delete (data retained for audit)
    - No method_id exposed in responses (UUIDs only)
    
    **Example Request**:
    ```bash
    curl -X DELETE http://localhost:8002/api/v1/mfa/methods/12345678-1234-5678-1234-567812345678 \
      -H "Authorization: Bearer {access_token}"
    ```
    
    **Example Response** (200 OK):
    ```json
    {
      "message": "MFA method disabled successfully"
    }
    ```
    
    **Error Responses**:
    - `400 BadRequest`: Invalid method_id UUID format
    - `401 Unauthorized`: Invalid or expired access token
    - `404 NotFound`: Method not found or already deleted
    - `500 Internal Server Error`: Database failure
    
    **Note**: Cannot disable if it's the only MFA method (should fail at business logic level)
    
    Args:
        method_id: UUID of MFA method to disable
    
    Returns:
        JSON with success message.
    """
    try:
        service = MFAService(db)
        
        method_uuid = UUID(method_id)
        deleted = await service.disable_mfa(
            organization_id=current_user.organization_id,
            user_id=current_user.id,
            mfa_method_id=method_uuid,
        )
        
        if not deleted:
            return JSONResponse(status_code=404, content={"error": "MFA method not found"})
        
        return JSONResponse(
            status_code=200,
            content={"message": "MFA method disabled successfully"}
        )
    except ValueError:
        return JSONResponse(status_code=400, content={"error": "Invalid method ID format"})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": "Internal server error"})


@router.get("/backup-codes")
async def get_backup_codes(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get unused backup codes for current user.
    
    Returns array of backup codes that haven't been used yet. These are
    recovery codes for account access if primary MFA method is unavailable.
    
    **Security**:
    - Multi-tenancy isolation enforced
    - Only returns UNUSED codes (is_used = false)
    - Codes are encrypted in database, displayed plain text here for user
    - Should only be called over HTTPS
    - User should store codes securely (password manager, printed, etc.)
    
    **Example Request**:
    ```bash
    curl -X GET http://localhost:8002/api/v1/mfa/backup-codes \
      -H "Authorization: Bearer {access_token}"
    ```
    
    **Example Response** (200 OK):
    ```json
    {
      "backup_codes": [
        "CODE-1234-5678",
        "CODE-1234-5679",
        "CODE-1234-5680",
        "CODE-1234-5681",
        "CODE-1234-5682"
      ],
      "count": 5
    }
    ```
    
    **Error Responses**:
    - `401 Unauthorized`: Invalid or expired access token
    - `500 Internal Server Error`: Database failure
    
    **Important**: Each code can only be used once. After use, is_used flag is set.
    
    Returns:
        JSON array of unused backup codes.
    """
    try:
        service = MFAService(db)
        
        codes = await service.get_backup_codes(
            organization_id=current_user.organization_id,
            user_id=current_user.id,
        )
        
        return JSONResponse(
            status_code=200,
            content={
                "backup_codes": codes,
                "count": len(codes),
            }
        )
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": "Internal server error"})


@router.post("/validate-mfa")
async def validate_mfa_code(
    mfa_method_id: str,
    code: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Validate MFA code during login.
    
    Verifies TOTP, SMS, or backup codes. Returns MFA token (JWT claim) 
    that proves user has passed MFA verification. Used in login flow to
    upgrade access token with mfa_verified claim.
    
    **Security**:
    - Rate limited: 3 failed attempts per 15-minute window
    - Time-window validation for TOTP: ±30 seconds
    - Backup codes: single-use (marked as used after validation)
    - SMS codes: single-use, time-limited (10 min)
    - Multi-tenancy isolation enforced
    - No timing attacks (constant-time comparison)
    
    **Example Request**:
    ```bash
    curl -X POST http://localhost:8002/api/v1/mfa/validate-mfa \
      -H "Authorization: Bearer {access_token_without_mfa}" \
      -H "Content-Type: application/json" \
      -d '{
        "mfa_method_id": "12345678-1234-5678-1234-567812345678",
        "code": "123456"
      }'
    ```
    
    **Example Response** (200 OK):
    ```json
    {
      "mfa_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "message": "MFA verification successful"
    }
    ```
    
    **Error Responses**:
    - `400 BadRequest`: Invalid code format or method_id UUID format
    - `401 Unauthorized`: Code verification failed, invalid token
    - `404 NotFound`: MFA method not found
    - `429 Too Many Requests`: Rate limit exceeded (3 attempts per 15 min)
    - `500 Internal Server Error`: Database or service failure
    
    **MFA Flow**: After successful validation, upgrade JWT to include mfa_verified claim
    
    Args:
        mfa_method_id: UUID of MFA method to validate against
        code: TOTP (6 digits), SMS (6 digits), or backup code (8 chars)
    
    Returns:
        JSON with MFA challenge token for JWT claim.
    """
    try:
        service = MFAService(db)
        
        method_uuid = UUID(mfa_method_id)
        mfa_token = await service.validate_mfa_challenge(
            organization_id=current_user.organization_id,
            user_id=current_user.id,
            mfa_method_id=method_uuid,
            code=code,
        )
        
        return JSONResponse(
            status_code=200,
            content={
                "mfa_token": mfa_token,
                "message": "MFA verification successful",
            }
        )
    except UnauthorizedException as e:
        return JSONResponse(status_code=401, content={"error": str(e)})
    except NotFoundException as e:
        return JSONResponse(status_code=404, content={"error": str(e)})
    except ValueError:
        return JSONResponse(status_code=400, content={"error": "Invalid method ID format"})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": "Internal server error"})


@router.post("/health")
async def mfa_health_check():
    """Health check for MFA service."""
    return JSONResponse(
        status_code=200,
        content={
            "status": "healthy",
            "service": "mfa",
        }
    )
