"""
Authentication endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address

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

# Rate limiter instance
limiter = Limiter(key_func=get_remote_address)


@router.post("/register", response_model=dict, status_code=status.HTTP_201_CREATED)
@limiter.limit("3/hour")  # 3 registrations per hour per IP
async def register(
    request: Request,
    data: UserRegister,
    auth_service: AuthService = Depends(get_auth_service),
):
    """
    Register a new user and organization
    
    **Description:** Creates a new user account with an associated organization. The user will be assigned the 'org_admin' role.
    
    **Request Body:**
    - `email` (string, required): Valid email address (must be unique)
    - `password` (string, required): Strong password (min 8 chars, uppercase, lowercase, digit, special)
    - `full_name` (string, required): User's full name
    - `organization_name` (string, required): Name of the organization to create
    
    **Returns:** User profile and authentication tokens
    
    **Rate Limit:** 3 registrations per hour per IP
    
    **Possible Errors:**
    - `400`: Invalid data (weak password, invalid email format)
    - `409`: Email already registered
    - `429`: Rate limit exceeded (too many registration attempts)
    - `500`: Internal server error
    """
    user, token = await auth_service.register(data)

    return {
        "user": user,
        "token": token,
        "message": "Registration successful. Please verify your email.",
    }


@router.post("/login", response_model=dict)
@limiter.limit("5/minute")  # 5 login attempts per minute per IP
async def login(
    request: Request,
    data: UserLogin,
    auth_service: AuthService = Depends(get_auth_service),
):
    """
    Authenticate user and get access token
    
    **Description:** Authenticates user with email and password, returns JWT access and refresh tokens.
    
    **Request Body:**
    - `email` (string, required): User email address
    - `password` (string, required): User password
    
    **Returns:** User profile, access token, and refresh token
    
    **Token Details:**
    - Access token: Valid for 30 minutes (short-lived)
    - Refresh token: Valid for 30 days (use to get new access tokens)
    
    **Rate Limit:** 5 login attempts per minute per IP
    
    **Possible Errors:**
    - `400`: Missing email or password
    - `401`: Invalid credentials
    - `429`: Rate limit exceeded (too many login attempts)
    - `500`: Internal server error
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
@limiter.limit("10/minute")  # 10 refresh requests per minute
async def refresh_token(
    request: Request,
    data: RefreshTokenRequest,
    auth_service: AuthService = Depends(get_auth_service),
):
    """
    Refresh access token
    
    **Description:** Uses refresh token to get a new access token when the current one expires.
    
    **Request Body:**
    - `refresh_token` (string, required): Valid refresh token from login response
    
    **Returns:** New access token and refresh token
    
    **Rate Limit:** 10 refresh requests per minute per IP
    
    **Possible Errors:**
    - `400`: Missing refresh token
    - `401`: Invalid or expired refresh token
    - `429`: Rate limit exceeded
    - `500`: Internal server error
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
    
    **Description:** Revokes the refresh token to prevent future token refreshes. User must re-login to continue.
    
    **Request Body:**
    - `refresh_token` (string, required): Refresh token to revoke (from login response)
    
    **Returns:** Success confirmation
    
    **Permissions Required:** Authenticated user
    
    **Possible Errors:**
    - `400`: Missing refresh token
    - `401`: User not authenticated
    - `500`: Internal server error
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
