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
    Initialize TOTP MFA setup.
    
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
    Verify TOTP code and enable MFA.
    
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
    
    Args:
        phone_number: Phone number to send SMS codes to
    
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
    
    Returns:
        JSON array of MFA methods.
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
    
    Args:
        mfa_method_id: UUID of MFA method to validate against
        code: TOTP or SMS code
    
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
