"""
RBAC REST Endpoints - /roles and /permissions

Admin-only endpoints for managing roles and permissions dynamically.
"""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db, require_role
from app.core.exceptions import NotFoundException
from app.models.user import User
from app.schemas.role import (
    PermissionCreate,
    PermissionInDB,
    PermissionListResponse,
    RoleCreate,
    RoleInDB,
    RoleListResponse,
    RolePermissionAssign,
    RoleUpdate,
    UserRoleAssign,
)
from app.services.role_service import RoleService

router = APIRouter(prefix="/roles", tags=["RBAC"])


# ============================================
# INITIALIZATION ENDPOINT
# ============================================


@router.post(
    "/initialize",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_role(["org_admin", "super_admin"]))],
    summary="Initialize system roles",
    description="Initialize default system roles for organization",
)
async def initialize_system_roles(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Initialize default system roles and permissions for organization.
    
    **Required Role:** org_admin
    
    Creates:
    - super_admin role
    - org_admin role
    - agent role
    - viewer role
    
    With their default permissions.
    """
    service = RoleService(db)
    await service.initialize_system_roles(current_user.organization_id)
    await db.commit()  # Commit changes to database
    
    roles = await service.list_roles(current_user.organization_id)
    return {
        "message": "System roles initialized successfully",
        "total_roles": len(roles),
        "roles": roles,
    }


# ============================================
# ROLE ENDPOINTS
# ============================================


@router.post(
    "/",
    response_model=RoleInDB,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role(["org_admin", "super_admin"]))],
    summary="Create custom role",
    description="Create a new custom role for the organization",
)
async def create_role(
    data: RoleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new custom role.
    
    **Required Role:** org_admin
    
    **Request Body:**
    - `name` (string, required): Role name (e.g., "support_lead")
    - `description` (string, optional): Role description
    
    **Returns:** Created RoleInDB object
    """
    service = RoleService(db)
    role = await service.create_role(
        name=data.name,
        description=data.description,
        organization_id=current_user.organization_id,
    )
    await db.commit()  # Persist changes
    return role


@router.get(
    "/",
    response_model=RoleListResponse,
    summary="List roles",
    description="List all roles for organization",
)
async def list_roles(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List all roles for organization (including system and custom roles).
    
    **Required Role:** Any authenticated user
    """
    service = RoleService(db)
    roles = await service.list_roles(current_user.organization_id)
    return RoleListResponse(total=len(roles), items=roles)


@router.get(
    "/{role_id}",
    response_model=RoleInDB,
    summary="Get role",
    description="Get role by ID with permissions",
)
async def get_role(
    role_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get role details including assigned permissions.
    
    **Required Role:** Any authenticated user
    """
    service = RoleService(db)
    role = await service.get_role(role_id)
    
    # Verify role belongs to user's organization
    if role.organization_id and role.organization_id != current_user.organization_id:
        raise NotFoundException("Role not found")
    
    return role


@router.patch(
    "/{role_id}",
    response_model=RoleInDB,
    dependencies=[Depends(require_role(["org_admin", "super_admin"]))],
    summary="Update role",
    description="Update role metadata (name, description)",
)
async def update_role(
    role_id: UUID,
    data: RoleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update role metadata.
    
    **Required Role:** org_admin
    
    **Note:** Cannot modify name of system roles (super_admin, org_admin, etc)
    """
    service = RoleService(db)
    role = await service.get_role(role_id)
    
    # Verify role belongs to user's organization
    if role.organization_id and role.organization_id != current_user.organization_id:
        raise NotFoundException("Role not found")
    
    updated_role = await service.update_role(role_id, data.model_dump(exclude_unset=True))
    await db.commit()  # Persist role updates
    return updated_role


@router.delete(
    "/{role_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_role(["org_admin", "super_admin"]))],
    summary="Delete custom role",
    description="Delete a custom role (cannot delete system roles)",
)
async def delete_role(
    role_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Delete a custom role.
    
    **Required Role:** org_admin
    
    **Note:** Cannot delete system roles (super_admin, org_admin, agent, viewer)
    """
    service = RoleService(db)
    role = await service.get_role(role_id)
    
    # Verify role belongs to user's organization
    if role.organization_id and role.organization_id != current_user.organization_id:
        raise NotFoundException("Role not found")
    
    await service.delete_role(role_id)
    await db.commit()  # Persist role deletion


# ============================================
# ROLE PERMISSIONS ENDPOINTS
# ============================================


@router.post(
    "/{role_id}/permissions",
    response_model=RoleInDB,
    dependencies=[Depends(require_role(["org_admin", "super_admin"]))],
    summary="Assign permissions to role",
    description="Replace all permissions for a role",
)
async def assign_permissions(
    role_id: UUID,
    data: RolePermissionAssign,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Assign a set of permissions to a role (replaces existing permissions).
    
    **Required Role:** org_admin
    
    **Request Body:**
    - `permission_ids` (list of UUID): Permission IDs to assign
    
    **Returns:** Updated RoleInDB with new permissions
    """
    service = RoleService(db)
    role = await service.get_role(role_id)
    
    # Verify role belongs to user's organization
    if role.organization_id and role.organization_id != current_user.organization_id:
        raise NotFoundException("Role not found")
    
    updated_role = await service.assign_permissions(role_id, data.permission_ids)
    await db.commit()  # Persist permission assignments
    return updated_role


@router.get(
    "/{role_id}/permissions",
    response_model=List[PermissionInDB],
    summary="Get role permissions",
    description="List all permissions assigned to a role",
)
async def get_role_permissions(
    role_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get all permissions assigned to a specific role.
    
    **Required Role:** Any authenticated user
    """
    service = RoleService(db)
    role = await service.get_role(role_id)
    
    # Verify role belongs to user's organization
    if role.organization_id and role.organization_id != current_user.organization_id:
        raise NotFoundException("Role not found")
    
    return role.permissions


# ============================================
# PERMISSION ENDPOINTS
# ============================================


permissions_router = APIRouter(prefix="/permissions", tags=["RBAC"])


@permissions_router.post(
    "/",
    response_model=PermissionInDB,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role(["org_admin", "super_admin"]))],
    summary="Create permission",
    description="Create a new permission",
)
async def create_permission(
    data: PermissionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new custom permission.
    
    **Required Role:** org_admin
    
    **Request Body:**
    - `name` (string, required): Permission name (e.g., "manage_templates")
    - `description` (string, optional): Permission description
    - `category` (string, default: "general"): Permission category
    
    **Returns:** Created PermissionInDB object
    """
    from app.services.role_service import RoleService
    
    service = RoleService(db)
    permission_data = {
        **data.model_dump(),
        "organization_id": current_user.organization_id,
    }
    permission = await service.permission_repo.create(permission_data)
    await db.commit()  # Persist new permission
    return permission


@permissions_router.get(
    "/",
    response_model=PermissionListResponse,
    summary="List permissions",
    description="List all permissions for organization",
)
async def list_permissions(
    category: str = Query(None, description="Filter by category"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List all permissions for organization.
    
    **Required Role:** Any authenticated user
    
    **Query Parameters:**
    - `category` (string, optional): Filter by category (e.g., "chatbots", "users")
    """
    from app.services.role_service import RoleService
    
    service = RoleService(db)
    if category:
        permissions = await service.permission_repo.list_by_category(
            category, current_user.organization_id
        )
    else:
        permissions = await service.permission_repo.list_by_organization(
            current_user.organization_id
        )
    
    return PermissionListResponse(total=len(permissions), items=permissions)


@permissions_router.get(
    "/{permission_id}",
    response_model=PermissionInDB,
    summary="Get permission",
    description="Get permission by ID",
)
async def get_permission(
    permission_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get permission details.
    
    **Required Role:** Any authenticated user
    """
    from app.services.role_service import RoleService
    
    service = RoleService(db)
    permission = await service.permission_repo.get(permission_id)
    
    if not permission:
        raise NotFoundException("Permission not found")
    
    # Verify permission belongs to user's organization
    if permission.organization_id and permission.organization_id != current_user.organization_id:
        raise NotFoundException("Permission not found")
    
    return permission


# ============================================
# USER ROLE ASSIGNMENT
# ============================================


@permissions_router.post(
    "/assign-to-user",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_role(["org_admin", "super_admin"]))],
    summary="Assign role to user",
    description="Assign a role to a user in the organization",
)
async def assign_role_to_user(
    data: UserRoleAssign,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Assign a role to a user.
    
    **Required Role:** org_admin
    
    **Request Body:**
    - `user_id` (UUID): User to assign role to
    - `role_id` (UUID): Role to assign
    
    **Returns:** Success message with user details
    """
    from app.repositories.user import UserRepository
    
    # Verify role exists and belongs to org
    service = RoleService(db)
    role = await service.get_role(data.role_id)
    if not role:
        raise NotFoundException(f"Role {data.role_id} not found")
    
    if role.organization_id and role.organization_id != current_user.organization_id:
        raise NotFoundException("Role not found in this organization")
    
    # Verify user exists and belongs to org
    user_repo = UserRepository(db)
    user = await user_repo.get_by_id(data.user_id)
    if not user or user.organization_id != current_user.organization_id:
        raise NotFoundException(f"User {data.user_id} not found")
    
    # Update user with new role_id
    updated_user = await user_repo.update(data.user_id, {"role_id": data.role_id})
    await db.commit()
    
    return {
        "message": f"Role {role.name} assigned to user {updated_user.email}",
        "user_id": str(updated_user.id),
        "role_id": str(role.id),
        "role_name": role.name,
    }
