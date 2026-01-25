"""
Token Refresh Endpoint for SAML/OAuth authenticated users.

This is a utility/example of how to implement token refresh with session validation.
Can be added to saml.py or auth.py endpoints.
"""

from datetime import timedelta
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse

from app.api.deps import get_current_user, get_db, get_token_from_header
from app.models import User
from app.core.security import (
    create_access_token,
    decode_token,
    validate_token_not_blacklisted,
)
from sqlalchemy.ext.asyncio import AsyncSession


# Example router (can be included in saml.py or created separately)
router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/refresh")
async def refresh_access_token(
    current_user: User = Depends(get_current_user),
    token: str = Depends(get_token_from_header),
):
    """
    Refresh access token using existing token.
    
    Validates that current token is not blacklisted before issuing new one.
    
    Args:
        current_user: Current authenticated user
        token: Current JWT token (for blacklist validation)
        
    Returns:
        New access token with 15 min expiry
        
    Raises:
        HTTPException: If token is revoked or user not found
    """
    try:
        # Validate token is not blacklisted
        is_valid = await validate_token_not_blacklisted(
            user_id=str(current_user.id),
            token=token,
        )
        
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has been revoked (logged out)"
            )
        
        # Decode current token to get claims
        payload = decode_token(token)
        organization_id = payload.get("organization_id")
        
        if not organization_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid token: missing organization_id"
            )
        
        # Generate new access token with same organization_id
        new_access_token = create_access_token(
            subject=str(current_user.id),
            additional_claims={"organization_id": organization_id},
            expires_delta=timedelta(minutes=15),
        )
        
        return JSONResponse(
            status_code=200,
            content={
                "access_token": new_access_token,
                "token_type": "bearer",
                "expires_in": 900,  # 15 minutes
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": "Failed to refresh token"}
        )
