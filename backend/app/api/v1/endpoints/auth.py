"""
Authentication endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.api.deps import get_auth_service, get_current_active_user
from app.models.user import User
from app.schemas.auth import (
    RefreshTokenRequest,
    Token,
    UserLogin,
    UserRegister,
)
from app.schemas.base import SuccessResponse
from app.schemas.user import User as UserSchema, UserProfile
from app.services.auth_service import AuthService

router = APIRouter()


@router.post("/register", response_model=dict, status_code=status.HTTP_201_CREATED)
async def register(
    data: UserRegister,
    auth_service: AuthService = Depends(get_auth_service),
):
    """
    Register a new user and organization

    Creates a new user account with an associated organization.
    The user will be assigned the 'org_admin' role.

    - **email**: Valid email address
    - **password**: Strong password (min 8 chars, uppercase, lowercase, digit)
    - **full_name**: User's full name
    - **organization_name**: Name of the organization to create
    """
    user, token = await auth_service.register(data)

    return {
        "user": user,
        "token": token,
        "message": "Registration successful. Please verify your email.",
    }


@router.post("/login", response_model=dict)
async def login(
    data: UserLogin,
    request: Request,
    auth_service: AuthService = Depends(get_auth_service),
):
    """
    Authenticate user and get access token

    - **email**: User email
    - **password**: User password

    Returns access token and refresh token for subsequent requests.
    """
    # Get client IP
    ip_address = request.client.host if request.client else None

    user, token = await auth_service.login(data, ip_address)

    return {
        "user": user,
        "token": token,
        "message": "Login successful",
    }


@router.post("/refresh", response_model=Token)
async def refresh_token(
    data: RefreshTokenRequest,
    auth_service: AuthService = Depends(get_auth_service),
):
    """
    Refresh access token

    Use refresh token to get a new access token when the current one expires.

    - **refresh_token**: Valid refresh token from login response
    """
    token = await auth_service.refresh_access_token(data.refresh_token)
    return token


@router.post("/logout", response_model=SuccessResponse)
async def logout(
    data: RefreshTokenRequest,
    current_user: User = Depends(get_current_active_user),
    auth_service: AuthService = Depends(get_auth_service),
):
    """
    Logout user

    Revokes the refresh token to prevent future token refreshes.

    - **refresh_token**: Refresh token to revoke
    """
    await auth_service.logout(current_user.id, data.refresh_token)

    return SuccessResponse(message="Logout successful")


@router.get("/me", response_model=UserProfile)
async def get_current_user_profile(
    current_user: User = Depends(get_current_active_user),
):
    """
    Get current user profile

    Returns the authenticated user's profile information.
    """
    return UserProfile.model_validate(current_user)


@router.get("/verify-token", response_model=dict)
async def verify_token(
    current_user: User = Depends(get_current_active_user),
):
    """
    Verify if access token is valid

    Returns basic user info if token is valid.
    """
    return {
        "valid": True,
        "user_id": str(current_user.id),
        "organization_id": str(current_user.organization_id),
        "role": current_user.role,
    }
