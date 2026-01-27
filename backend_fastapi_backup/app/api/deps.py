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
    Dependency to check if user has required role (supports both string role and role_id)
    
    This dependency works with:
    1. Legacy string role (user.role = "org_admin", "agent", etc)
    2. New dynamic RBAC (user.role_id = UUID pointing to Role table)
    
    Args:
        allowed_roles: List of allowed role names (e.g., ["org_admin", "super_admin"])
    Returns:
        Dependency function
    """

    async def role_checker(
        current_user: User = Depends(get_current_active_user),
        db: AsyncSession = Depends(get_db),
    ):
        # Check legacy string role first (backwards compatibility)
        if current_user.role in allowed_roles:
            return current_user

        # Check new RBAC system (role_id with database lookup)
        if current_user.role_id:
            from app.repositories.role_repository import RoleRepository

            role_repo = RoleRepository(db)
            role = await role_repo.get(current_user.role_id)
            if role and role.name in allowed_roles:
                return current_user

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Insufficient permissions. Required roles: {', '.join(allowed_roles)}",
        )

    return role_checker


async def get_current_admin(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Get current admin user (super_admin or org_admin)
    Supports both legacy string role and new RBAC system
    
    Args:
        current_user: Current user
        db: Database session
    Returns:
        Admin user
    Raises:
        HTTPException: If user is not an admin
    """
    admin_roles = ["super_admin", "org_admin"]
    
    # Check legacy string role first
    if current_user.role in admin_roles:
        return current_user

    # Check new RBAC system
    if current_user.role_id:
        from app.repositories.role_repository import RoleRepository

        role_repo = RoleRepository(db)
        role = await role_repo.get(current_user.role_id)
        if role and role.name in admin_roles:
            return current_user

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Admin access required",
    )


async def get_current_super_admin(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Get current super admin user
    Supports both legacy string role and new RBAC system
    
    Args:
        current_user: Current user
        db: Database session
    Returns:
        Super admin user
    Raises:
        HTTPException: If user is not a super admin
    """
    # Check legacy string role first
    if current_user.role == "super_admin":
        return current_user

    # Check new RBAC system
    if current_user.role_id:
        from app.repositories.role_repository import RoleRepository

        role_repo = RoleRepository(db)
        role = await role_repo.get(current_user.role_id)
        if role and role.name == "super_admin":
            return current_user

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Super admin access required",
    )


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
    Dependency to check if user has specific permission (LEGACY - uses User.permissions array)
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


def require_permission_dynamic(required_permission: str):
    """
    Dependency to check if user has permission via dynamic RBAC system.
    Reads from database (Role + RolePermission) instead of hardcoded roles.
    
    Args:
        required_permission: Permission string (e.g., "create_chatbot", "manage_users")
        
    Returns:
        Dependency function
        
    Usage:
        @router.post("/", dependencies=[Depends(require_permission_dynamic("create_chatbot"))])
        async def create_chatbot(...):
            ...
    """
    async def permission_checker(
        current_user: User = Depends(get_current_active_user),
        db: AsyncSession = Depends(get_db),
    ):
        from app.services.role_service import RoleService
        from sqlalchemy import select
        from sqlalchemy.orm import selectinload
        
        # Load user with role and permissions
        stmt = select(User).where(User.id == current_user.id).options(
            selectinload(User.role_obj).selectinload(type(User.role_obj).permissions)
        )
        result = await db.execute(stmt)
        user_with_role = result.scalars().first()

        if not user_with_role or not user_with_role.role_obj:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No role assigned to user",
            )

        # Check permission using RoleService
        if not RoleService.has_permission(user_with_role.role_obj, required_permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required: {required_permission}",
            )

        return user_with_role

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


# ============= SESSION MANAGEMENT DEPENDENCIES =============

async def get_token_from_header(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> str:
    """
    Extract JWT token from Authorization header.
    
    Used for session blacklist validation.
    
    Args:
        credentials: HTTPAuthorizationCredentials from Bearer token
        
    Returns:
        JWT token string
        
    Raises:
        HTTPException: If token is missing or invalid
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization token"
        )
    return credentials.credentials


async def validate_token_not_revoked(
    current_user: User = Depends(get_current_user),
    token: str = Depends(get_token_from_header),
) -> User:
    """
    Validate JWT token is not revoked (blacklisted).
    
    Used as a dependency for endpoints that need logout protection.
    Checks Redis blacklist for revoked tokens.
    
    Args:
        current_user: Current authenticated user
        token: JWT token from Authorization header
        
    Returns:
        User if token is valid and not revoked
        
    Raises:
        HTTPException: If token is blacklisted (logged out)
        
    Example:
        @router.get("/protected")
        async def protected_endpoint(
            current_user: User = Depends(validate_token_not_revoked),
        ):
            return {"message": f"Hello {current_user.email}"}
    """
    from app.core.security import validate_token_not_blacklisted
    
    is_valid = await validate_token_not_blacklisted(
        user_id=str(current_user.id),
        token=token,
    )
    
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked (logged out)"
        )
    
    return current_user
