"""
Role Management Endpoints - RBAC REST API

Endpoints for managing roles and permissions dynamically.
Requires org_admin or super_admin role.
"""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db, require_role
from app.models.user import User
from app.models.role import Role, Permission
from app.services.role_service import RoleService
from app.core.exceptions import NotFoundException, BadRequestException

router = APIRouter()


# ============================================
# SCHEMAS (inline for simplicity)
# ============================================

class PermissionSchema:
    """Permission response schema"""
    id: UUID
    name: str
    description: str
    category: str
    is_active: bool


class RoleSchema:
    """Role response schema"""
    id: UUID
    name: str
    description: str
    is_system: bool
    is_custom: bool
    is_active: bool
    permissions: List[PermissionSchema] = []


# ============================================
# ROLE ENDPOINTS
# ============================================


@router.post(
    "/roles",
    response_model=dict,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role(["org_admin", "super_admin"]))],
    summary="Create new role",
    description="Create a custom role for the organization",
    tags=["Roles"],
)
async def create_role(
    name: str = Query(..., min_length=1, max_length=100),
    description: str = Query("", max_length=500),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new custom role in the organization
    
    **Parameters:**
    - `name` (string, required): Role name (unique per org)
    - `description` (string, optional): Role description
    
    **Returns:** Created role object
    
    **Permissions Required:** org_admin or super_admin
    """
    service = RoleService(db)
    role = await service.create_role(name, description, current_user.organization_id)
    
    return {
        "id": str(role.id),
        "name": role.name,
        "description": role.description,
        "is_system": role.is_system,
        "is_custom": role.is_custom,
        "is_active": role.is_active,
    }


@router.get(
    "/roles",
    response_model=list,
    dependencies=[Depends(require_role(["org_admin", "super_admin"]))],
    summary="List roles",
    description="List all roles for organization",
    tags=["Roles"],
)
async def list_roles(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List all roles for the organization
    
    **Permissions Required:** org_admin or super_admin
    
    **Returns:** List of role objects with permissions
    """
    service = RoleService(db)
    roles = await service.list_roles(current_user.organization_id)
    
    return [
        {
            "id": str(role.id),
            "name": role.name,
            "description": role.description,
            "is_system": role.is_system,
            "is_custom": role.is_custom,
            "is_active": role.is_active,
            "permissions": [{"id": str(p.id), "name": p.name, "category": p.category} for p in role.permissions],
        }
        for role in roles
    ]


@router.get(
    "/roles/{role_id}",
    response_model=dict,
    dependencies=[Depends(require_role(["org_admin", "super_admin"]))],
    summary="Get role",
    description="Get detailed role information",
    tags=["Roles"],
)
async def get_role(
    role_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get detailed information about a role
    
    **Permissions Required:** org_admin or super_admin
    """
    service = RoleService(db)
    role = await service.get_role(role_id)
    
    return {
        "id": str(role.id),
        "name": role.name,
        "description": role.description,
        "is_system": role.is_system,
        "is_custom": role.is_custom,
        "is_active": role.is_active,
        "permissions": [{"id": str(p.id), "name": p.name, "category": p.category} for p in role.permissions],
    }


@router.patch(
    "/roles/{role_id}",
    response_model=dict,
    dependencies=[Depends(require_role(["org_admin", "super_admin"]))],
    summary="Update role",
    description="Update role properties",
    tags=["Roles"],
)
async def update_role(
    role_id: UUID,
    name: str = Query(None, min_length=1, max_length=100),
    description: str = Query(None, max_length=500),
    is_active: bool = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update role properties
    
    **Permissions Required:** org_admin or super_admin
    """
    service = RoleService(db)
    update_data = {}
    if name is not None:
        update_data["name"] = name
    if description is not None:
        update_data["description"] = description
    if is_active is not None:
        update_data["is_active"] = is_active

    role = await service.update_role(role_id, update_data)
    
    return {
        "id": str(role.id),
        "name": role.name,
        "description": role.description,
        "is_active": role.is_active,
    }


@router.delete(
    "/roles/{role_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_role(["org_admin", "super_admin"]))],
    summary="Delete role",
    description="Delete custom role (system roles cannot be deleted)",
    tags=["Roles"],
)
async def delete_role(
    role_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Delete a custom role
    
    **Permissions Required:** org_admin or super_admin
    
    **Note:** System roles (super_admin, org_admin, agent, viewer) cannot be deleted
    """
    service = RoleService(db)
    await service.delete_role(role_id)


# ============================================
# ROLE PERMISSIONS ENDPOINTS
# ============================================


@router.post(
    "/roles/{role_id}/permissions",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_role(["org_admin", "super_admin"]))],
    summary="Assign permissions to role",
    description="Replace all permissions for a role",
    tags=["Roles"],
)
async def assign_permissions(
    role_id: UUID,
    permission_ids: List[UUID] = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Assign/replace permissions for a role
    
    **Parameters:**
    - `permission_ids` (list of UUIDs): Permission IDs to assign
    
    **Permissions Required:** org_admin or super_admin
    
    **Note:** This replaces all existing permissions for the role
    """
    service = RoleService(db)
    role = await service.assign_permissions(role_id, permission_ids)
    
    return {
        "id": str(role.id),
        "name": role.name,
        "permissions": [{"id": str(p.id), "name": p.name} for p in role.permissions],
    }


@router.post(
    "/roles/{role_id}/permissions/{permission_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_role(["org_admin", "super_admin"]))],
    summary="Add permission to role",
    description="Add single permission to role",
    tags=["Roles"],
)
async def add_permission(
    role_id: UUID,
    permission_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Add a single permission to a role
    
    **Permissions Required:** org_admin or super_admin
    """
    service = RoleService(db)
    await service.add_permission_to_role(role_id, permission_id)
    
    role = await service.get_role(role_id)
    return {
        "role_id": str(role_id),
        "permission_id": str(permission_id),
        "message": "Permission added successfully",
    }


@router.delete(
    "/roles/{role_id}/permissions/{permission_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_role(["org_admin", "super_admin"]))],
    summary="Remove permission from role",
    description="Remove a permission from a role",
    tags=["Roles"],
)
async def remove_permission(
    role_id: UUID,
    permission_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Remove a permission from a role
    
    **Permissions Required:** org_admin or super_admin
    """
    service = RoleService(db)
    await service.remove_permission_from_role(role_id, permission_id)


# ============================================
# PERMISSIONS ENDPOINTS
# ============================================


@router.get(
    "/permissions",
    response_model=list,
    dependencies=[Depends(require_role(["org_admin", "super_admin"]))],
    summary="List permissions",
    description="List all available permissions",
    tags=["Permissions"],
)
async def list_permissions(
    category: str = Query(None, description="Filter by category"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List all permissions for the organization
    
    **Query Parameters:**
    - `category` (string, optional): Filter by permission category (chatbots, users, conversations, etc)
    
    **Permissions Required:** org_admin or super_admin
    """
    from app.repositories.role_repository import PermissionRepository
    
    repo = PermissionRepository(db)
    
    if category:
        permissions = await repo.list_by_category(category, current_user.organization_id)
    else:
        permissions = await repo.list_by_organization(current_user.organization_id)
    
    return [
        {
            "id": str(p.id),
            "name": p.name,
            "description": p.description,
            "category": p.category,
            "is_active": p.is_active,
        }
        for p in permissions
    ]


@router.get(
    "/permissions/categories",
    response_model=list,
    dependencies=[Depends(require_role(["org_admin", "super_admin"]))],
    summary="List permission categories",
    description="Get all available permission categories",
    tags=["Permissions"],
)
async def list_permission_categories(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get all available permission categories
    
    **Permissions Required:** org_admin or super_admin
    """
    # Return from RoleService.SYSTEM_PERMISSIONS
    categories = list(RoleService.SYSTEM_PERMISSIONS.keys())
    return [{"category": cat, "permissions": RoleService.SYSTEM_PERMISSIONS[cat]} for cat in categories]


# ============================================
# INITIALIZATION ENDPOINT
# ============================================


@router.post(
    "/roles/init",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_role(["super_admin"]))],
    summary="Initialize system roles",
    description="Initialize default system roles for organization",
    tags=["Roles"],
)
async def initialize_system_roles(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Initialize system roles for the organization
    
    Creates default roles (org_admin, agent, viewer) with default permissions.
    Can only be called if no roles exist yet.
    
    **Permissions Required:** super_admin
    """
    service = RoleService(db)
    await service.initialize_system_roles(current_user.organization_id)
    
    return {
        "message": "System roles initialized successfully",
        "organization_id": str(current_user.organization_id),
    }
