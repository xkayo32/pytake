"""
Repositories for RBAC - Database access layer
"""

from typing import List, Optional
from uuid import UUID

from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import NotFoundException, BadRequestException
from app.models.role import Permission, Role, RolePermission


class PermissionRepository:
    """Repository for Permission operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: dict) -> Permission:
        """Create a new permission"""
        permission = Permission(**data)
        self.db.add(permission)
        await self.db.flush()
        return permission

    async def get(self, permission_id: UUID) -> Optional[Permission]:
        """Get permission by ID"""
        stmt = select(Permission).where(Permission.id == permission_id)
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def get_by_name(self, name: str, organization_id: Optional[UUID] = None) -> Optional[Permission]:
        """Get permission by name (system-wide or org-scoped)"""
        stmt = select(Permission).where(
            and_(
                Permission.name == name,
                Permission.organization_id == organization_id
            )
        )
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def list_by_organization(self, organization_id: Optional[UUID] = None) -> List[Permission]:
        """List permissions for organization (None = system-wide)"""
        stmt = select(Permission).where(
            Permission.organization_id == organization_id
        ).order_by(Permission.category, Permission.name)
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def list_by_category(self, category: str, organization_id: Optional[UUID] = None) -> List[Permission]:
        """List permissions by category"""
        stmt = select(Permission).where(
            and_(
                Permission.category == category,
                Permission.organization_id == organization_id
            )
        ).order_by(Permission.name)
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def update(self, permission_id: UUID, data: dict) -> Permission:
        """Update permission"""
        permission = await self.get(permission_id)
        if not permission:
            raise NotFoundException(f"Permission {permission_id} not found")

        for key, value in data.items():
            if hasattr(permission, key):
                setattr(permission, key, value)

        await self.db.flush()
        return permission

    async def delete(self, permission_id: UUID):
        """Delete permission"""
        permission = await self.get(permission_id)
        if not permission:
            raise NotFoundException(f"Permission {permission_id} not found")

        await self.db.delete(permission)
        await self.db.flush()


class RoleRepository:
    """Repository for Role operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: dict) -> Role:
        """Create a new role"""
        role = Role(**data)
        self.db.add(role)
        await self.db.flush()
        # Eager-load permissions to avoid lazy-loading issues
        await self.db.refresh(role, ["permissions"])
        return role

    async def get(self, role_id: UUID) -> Optional[Role]:
        """Get role by ID with permissions"""
        stmt = select(Role).where(Role.id == role_id).options(
            selectinload(Role.permissions)
        )
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def get_by_name(self, name: str, organization_id: Optional[UUID] = None) -> Optional[Role]:
        """Get role by name (system-wide or org-scoped)"""
        stmt = select(Role).where(
            and_(
                Role.name == name,
                Role.organization_id == organization_id
            )
        ).options(selectinload(Role.permissions))
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def list_by_organization(self, organization_id: Optional[UUID] = None) -> List[Role]:
        """List roles for organization (includes system roles + custom org roles)"""
        stmt = select(Role).where(
            or_(
                Role.organization_id == organization_id,  # Custom org roles
                Role.organization_id.is_(None)  # System roles (NULL organization_id)
            )
        ).order_by(Role.is_system.desc(), Role.name).options(
            selectinload(Role.permissions)
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def list_system_roles(self) -> List[Role]:
        """List system-wide roles (NULL organization_id)"""
        return await self.list_by_organization(None)

    async def update(self, role_id: UUID, data: dict) -> Role:
        """Update role"""
        role = await self.get(role_id)
        if not role:
            raise NotFoundException(f"Role {role_id} not found")

        if role.is_system and "name" in data:
            raise BadRequestException("Cannot modify name of system role")

        for key, value in data.items():
            if hasattr(role, key) and key not in ["id", "created_at"]:
                setattr(role, key, value)

        await self.db.flush()
        return role

    async def delete(self, role_id: UUID):
        """Delete role (only if not system)"""
        role = await self.get(role_id)
        if not role:
            raise NotFoundException(f"Role {role_id} not found")

        if role.is_system:
            raise BadRequestException("Cannot delete system role")

        await self.db.delete(role)
        await self.db.flush()

    async def add_permission(self, role_id: UUID, permission_id: UUID) -> RolePermission:
        """Add permission to role"""
        role = await self.get(role_id)
        if not role:
            raise NotFoundException(f"Role {role_id} not found")

        # Check if permission already exists
        stmt = select(RolePermission).where(
            and_(
                RolePermission.role_id == role_id,
                RolePermission.permission_id == permission_id
            )
        )
        result = await self.db.execute(stmt)
        if result.scalars().first():
            raise BadRequestException("Permission already assigned to role")

        rp = RolePermission(role_id=role_id, permission_id=permission_id)
        self.db.add(rp)
        await self.db.flush()
        return rp

    async def remove_permission(self, role_id: UUID, permission_id: UUID):
        """Remove permission from role"""
        stmt = select(RolePermission).where(
            and_(
                RolePermission.role_id == role_id,
                RolePermission.permission_id == permission_id
            )
        )
        result = await self.db.execute(stmt)
        rp = result.scalars().first()
        if not rp:
            raise NotFoundException("Permission not found in role")

        await self.db.delete(rp)
        await self.db.flush()

    async def assign_permissions(self, role_id: UUID, permission_ids: List[UUID]):
        """Replace all permissions for role"""
        role = await self.get(role_id)
        if not role:
            raise NotFoundException(f"Role {role_id} not found")

        # Delete existing
        stmt = select(RolePermission).where(RolePermission.role_id == role_id)
        result = await self.db.execute(stmt)
        for rp in result.scalars().all():
            await self.db.delete(rp)

        # Add new
        for permission_id in permission_ids:
            rp = RolePermission(role_id=role_id, permission_id=permission_id)
            self.db.add(rp)

        await self.db.flush()
