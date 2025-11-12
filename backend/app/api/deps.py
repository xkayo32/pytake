"""
FastAPI dependencies for dependency injection
"""

from typing import AsyncGenerator, Optional
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session
from app.models.user import User
from app.services.auth_service import AuthService

# HTTP Bearer token security
security = HTTPBearer()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Database session dependency
    Yields:
        AsyncSession: Database session
    """
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()


async def get_auth_service(db: AsyncSession = Depends(get_db)) -> AuthService:
    """
    Get auth service instance
    Args:
        db: Database session
    Returns:
        AuthService instance
    """
    return AuthService(db)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    auth_service: AuthService = Depends(get_auth_service),
) -> User:
    """
    Get current authenticated user from JWT token
    Args:
        credentials: HTTP Authorization header
        auth_service: Auth service instance
    Returns:
        Current user
    Raises:
        HTTPException: If token is invalid or user not found
    """
    token = credentials.credentials
    user = await auth_service.get_current_user(token)
    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Get current active user
    Args:
        current_user: Current user
    Returns:
        Active user
    Raises:
        HTTPException: If user is not active
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not active",
        )
    if current_user.deleted_at:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account has been deleted",
        )
    return current_user


def require_role(allowed_roles: list[str]):
    """
    Dependency to check if user has required role
    Args:
        allowed_roles: List of allowed roles
    Returns:
        Dependency function
    """

    async def role_checker(current_user: User = Depends(get_current_active_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required roles: {', '.join(allowed_roles)}",
            )
        return current_user

    return role_checker


async def get_current_admin(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """
    Get current admin user (super_admin or org_admin)
    Args:
        current_user: Current user
    Returns:
        Admin user
    Raises:
        HTTPException: If user is not an admin
    """
    if current_user.role not in ["super_admin", "org_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


async def get_current_super_admin(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """
    Get current super admin user
    Args:
        current_user: Current user
    Returns:
        Super admin user
    Raises:
        HTTPException: If user is not a super admin
    """
    if current_user.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin access required",
        )
    return current_user


def get_organization_id(current_user: User = Depends(get_current_active_user)) -> UUID:
    """
    Get organization ID from current user
    Args:
        current_user: Current user
    Returns:
        Organization UUID
    """
    return current_user.organization_id


def require_permission(permission: str):
    """
    Dependency to check if user has specific permission
    Args:
        permission: Required permission
    Returns:
        Dependency function
    """

    async def permission_checker(current_user: User = Depends(get_current_active_user)):
        if not current_user.has_permission(permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required: {permission}",
            )
        return current_user

    return permission_checker


# Optional auth (for public endpoints that can work with or without auth)
async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(
        HTTPBearer(auto_error=False)
    ),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    """
    Get current user if token is provided, otherwise return None
    Args:
        credentials: HTTP Authorization header (optional)
        db: Database session
    Returns:
        User or None
    """
    if not credentials:
        return None

    try:
        auth_service = AuthService(db)
        user = await auth_service.get_current_user(credentials.credentials)
        return user
    except:
        return None
