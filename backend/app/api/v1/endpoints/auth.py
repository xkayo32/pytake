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
from app.core.swagger_examples import AUTH_EXAMPLES, ERROR_EXAMPLES

router = APIRouter(tags=["Authentication"])

# Rate limiter instance
limiter = Limiter(key_func=get_remote_address)


@router.post(
    "/register",
    response_model=dict,
    status_code=status.HTTP_201_CREATED,
    summary="Register new user and organization",
    responses={
        201: {
            "description": "User registered successfully",
            "content": {
                "application/json": {
                    "example": AUTH_EXAMPLES["register_success"]
                }
            },
        },
        400: {
            "description": "Validation error or user already exists",
            "content": {
                "application/json": {
                    "example": ERROR_EXAMPLES["validation_error"]
                }
            },
        },
        429: {
            "description": "Rate limit exceeded (3 registrations per hour)",
            "content": {
                "application/json": {
                    "example": ERROR_EXAMPLES["rate_limit"]
                }
            },
        },
    },
)
@limiter.limit("3/hour")
async def register(
    request: Request,
    data: UserRegister,
    auth_service: AuthService = Depends(get_auth_service),
):
    """
    Register a new user and organization

    **Creates a new user account with an associated organization.**

    The user will automatically be assigned the **'org_admin'** role for their organization.

    ### Request Parameters:
    - **email** (string, required): Valid email address. Must be unique.
    - **password** (string, required): Strong password with minimum 8 characters,
      must contain uppercase, lowercase, and at least one digit
    - **full_name** (string, required): User's full name
    - **organization_name** (string, required): Name of the organization to create

    ### Response:
    Returns user object with JWT tokens (access and refresh tokens)

    ### Rate Limit:
    - **3 registrations per hour** per IP address

    ### Errors:
    - `400 Bad Request`: Email already exists or password doesn't meet requirements
    - `429 Too Many Requests`: Rate limit exceeded

    ### Example cURL:
    ```bash
    curl -X POST http://localhost:8000/api/v1/auth/register \\
      -H "Content-Type: application/json" \\
      -d '{
        "email": "user@example.com",
        "password": "SecurePass123",
        "full_name": "John Doe",
        "organization_name": "ACME Corp"
      }'
    ```
    """
    user, token = await auth_service.register(data)

    return {
        "user": user,
        "token": token,
        "message": "Registration successful. Please verify your email.",
    }


@router.post(
    "/login",
    response_model=dict,
    summary="Authenticate user and get tokens",
    responses={
        200: {
            "description": "Login successful",
            "content": {
                "application/json": {
                    "example": AUTH_EXAMPLES["login_success"]
                }
            },
        },
        401: {
            "description": "Invalid credentials",
            "content": {
                "application/json": {
                    "example": AUTH_EXAMPLES["invalid_credentials"]
                }
            },
        },
        404: {
            "description": "User not found",
            "content": {
                "application/json": {
                    "example": AUTH_EXAMPLES["user_not_found"]
                }
            },
        },
        429: {
            "description": "Rate limit exceeded (5 attempts per minute)",
            "content": {
                "application/json": {
                    "example": ERROR_EXAMPLES["rate_limit"]
                }
            },
        },
    },
)
@limiter.limit("5/minute")
async def login(
    request: Request,
    data: UserLogin,
    auth_service: AuthService = Depends(get_auth_service),
):
    """
    Authenticate user and get JWT tokens

    **Authenticates user credentials and returns access/refresh tokens.**

    Use the **access_token** for API requests in the `Authorization: Bearer` header.
    When access token expires, use **refresh_token** to get a new one.

    ### Request Parameters:
    - **email** (string, required): User's email address
    - **password** (string, required): User's password

    ### Response:
    - **user**: User object with profile information
    - **token**: Object containing:
      - `access_token`: JWT token for API requests (valid 1 hour)
      - `refresh_token`: Token to refresh access (valid 30 days)
      - `token_type`: Always "bearer"
      - `expires_in`: Seconds until access token expires

    ### Rate Limit:
    - **5 login attempts per minute** per IP address

    ### Errors:
    - `401 Unauthorized`: Invalid email or password
    - `404 Not Found`: User account doesn't exist
    - `429 Too Many Requests`: Rate limit exceeded

    ### Example cURL:
    ```bash
    curl -X POST http://localhost:8000/api/v1/auth/login \\
      -H "Content-Type: application/json" \\
      -d '{
        "email": "user@example.com",
        "password": "SecurePass123"
      }'
    ```

    ### Using the token:
    ```bash
    curl -X GET http://localhost:8000/api/v1/contacts \\
      -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
    ```
    """
    ip_address = request.client.host if request.client else None
    user, token = await auth_service.login(data, ip_address)

    return {
        "user": user,
        "token": token,
        "message": "Login successful",
    }


@router.post(
    "/refresh",
    response_model=Token,
    summary="Refresh access token",
    responses={
        200: {
            "description": "Token refreshed successfully",
            "content": {
                "application/json": {
                    "example": {
                        "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                        "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                        "token_type": "bearer",
                        "expires_in": 3600,
                    }
                }
            },
        },
        401: {
            "description": "Invalid or expired refresh token",
            "content": {
                "application/json": {
                    "example": ERROR_EXAMPLES["unauthorized"]
                }
            },
        },
    },
)
@limiter.limit("10/minute")
async def refresh_token(
    request: Request,
    data: RefreshTokenRequest,
    auth_service: AuthService = Depends(get_auth_service),
):
    """
    Refresh access token

    **Get a new access token using a valid refresh token.**

    Access tokens expire after 1 hour. Use this endpoint to get a new access token
    without requiring the user to log in again.

    ### Request Parameters:
    - **refresh_token** (string, required): Valid refresh token from login response

    ### Response:
    - **access_token**: New JWT access token
    - **refresh_token**: New refresh token (replaces the old one)
    - **token_type**: Always "bearer"
    - **expires_in**: Seconds until new access token expires (3600)

    ### Rate Limit:
    - **10 refresh requests per minute** per user

    ### Errors:
    - `401 Unauthorized`: Refresh token is invalid or expired
    - `429 Too Many Requests`: Rate limit exceeded

    ### Example cURL:
    ```bash
    curl -X POST http://localhost:8000/api/v1/auth/refresh \\
      -H "Content-Type: application/json" \\
      -d '{
        "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
      }'
    ```
    """
    token = await auth_service.refresh_access_token(data.refresh_token)
    return token


@router.post(
    "/logout",
    response_model=SuccessResponse,
    summary="Logout user",
    responses={
        200: {
            "description": "Logout successful",
            "content": {
                "application/json": {
                    "example": {"message": "Logout successful", "status": "success"}
                }
            },
        },
        401: {
            "description": "Not authenticated",
            "content": {
                "application/json": {
                    "example": ERROR_EXAMPLES["unauthorized"]
                }
            },
        },
    },
)
async def logout(
    data: RefreshTokenRequest,
    current_user: User = Depends(get_current_active_user),
    auth_service: AuthService = Depends(get_auth_service),
):
    """
    Logout user

    **Revokes refresh token to prevent future token refreshes.**

    Calling this endpoint invalidates the provided refresh token,
    effectively logging out the user across all devices using that token.

    ### Request Parameters:
    - **refresh_token** (string, required): Refresh token to revoke

    ### Response:
    - **message**: "Logout successful"
    - **status**: "success"

    ### Authentication:
    Requires valid access token in `Authorization` header

    ### Errors:
    - `401 Unauthorized`: Invalid or missing access token

    ### Example cURL:
    ```bash
    curl -X POST http://localhost:8000/api/v1/auth/logout \\
      -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \\
      -H "Content-Type: application/json" \\
      -d '{
        "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
      }'
    ```
    """
    await auth_service.logout(current_user.id, data.refresh_token)
    return SuccessResponse(message="Logout successful")


@router.get(
    "/me",
    response_model=UserProfile,
    summary="Get current user profile",
    responses={
        200: {
            "description": "User profile retrieved",
            "content": {
                "application/json": {
                    "example": {
                        "id": "550e8400-e29b-41d4-a716-446655440000",
                        "email": "user@example.com",
                        "full_name": "John Doe",
                        "organization_id": "660e8400-e29b-41d4-a716-446655440000",
                        "role": "org_admin",
                        "is_active": True,
                        "created_at": "2025-11-30T10:00:00Z",
                    }
                }
            },
        },
        401: {
            "description": "Not authenticated",
            "content": {
                "application/json": {
                    "example": ERROR_EXAMPLES["unauthorized"]
                }
            },
        },
    },
)
async def get_current_user_profile(
    current_user: User = Depends(get_current_active_user),
):
    """
    Get current user profile

    **Returns the authenticated user's profile information.**

    ### Authentication:
    Requires valid access token in `Authorization` header

    ### Response:
    - **id**: User unique identifier (UUID)
    - **email**: User's email address
    - **full_name**: User's full name
    - **organization_id**: ID of user's organization
    - **role**: User's role (org_admin, agent, support)
    - **is_active**: Whether user account is active
    - **created_at**: Account creation timestamp

    ### Errors:
    - `401 Unauthorized`: Invalid or missing access token

    ### Example cURL:
    ```bash
    curl -X GET http://localhost:8000/api/v1/auth/me \\
      -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
    ```
    """
    return UserProfile.model_validate(current_user)


@router.get(
    "/verify-token",
    response_model=dict,
    summary="Verify access token validity",
    responses={
        200: {
            "description": "Token is valid",
            "content": {
                "application/json": {
                    "example": {
                        "valid": True,
                        "user_id": "550e8400-e29b-41d4-a716-446655440000",
                        "organization_id": "660e8400-e29b-41d4-a716-446655440000",
                        "role": "org_admin",
                    }
                }
            },
        },
        401: {
            "description": "Token is invalid or expired",
            "content": {
                "application/json": {
                    "example": ERROR_EXAMPLES["unauthorized"]
                }
            },
        },
    },
)
async def verify_token(
    current_user: User = Depends(get_current_active_user),
):
    """
    Verify if access token is valid

    **Checks if the provided access token is valid and returns user info.**

    Useful for frontend applications to verify token validity without making
    other API requests.

    ### Authentication:
    Requires valid access token in `Authorization` header

    ### Response:
    - **valid**: Always true if endpoint is reached (invalid tokens get 401)
    - **user_id**: User's unique identifier
    - **organization_id**: User's organization ID
    - **role**: User's current role

    ### Errors:
    - `401 Unauthorized`: Token is invalid or expired

    ### Example cURL:
    ```bash
    curl -X GET http://localhost:8000/api/v1/auth/verify-token \\
      -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
    ```
    """
    return {
        "valid": True,
        "user_id": str(current_user.id),
        "organization_id": str(current_user.organization_id),
        "role": current_user.role,
    }
