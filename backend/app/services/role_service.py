"""
RoleService - Business logic for RBAC management

Features:
- Dynamic role CRUD
- Permission assignment
- Role caching with Redis
- System role initialization
- Default role management
"""

import json
import logging
from typing import List, Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequestException, NotFoundException
from app.models.role import Permission, Role
from app.repositories.role_repository import PermissionRepository, RoleRepository

logger = logging.getLogger(__name__)


class RoleService:
    """Service for role and permission management"""

    # System roles (cannot be deleted)
    SYSTEM_ROLES = {
        "super_admin": {
            "name": "super_admin",
            "description": "System administrator with full access",
            "is_system": True,
            "is_custom": False,
        },
        "org_admin": {
            "name": "org_admin",
            "description": "Organization administrator",
            "is_system": False,
            "is_custom": False,
        },
        "agent": {
            "name": "agent",
            "description": "Agent/operator with limited access",
            "is_system": False,
            "is_custom": False,
        },
        "viewer": {
            "name": "viewer",
            "description": "Read-only viewer",
            "is_system": False,
            "is_custom": False,
        },
    }

    # System permissions (baseline)
    SYSTEM_PERMISSIONS = {
        "chatbots": [
            "create_chatbot",
            "read_chatbot",
            "update_chatbot",
            "delete_chatbot",
            "create_flow",
            "update_flow",
            "delete_flow",
        ],
        "users": [
            "create_user",
            "read_user",
            "update_user",
            "delete_user",
            "manage_roles",
            "view_agents",
        ],
        "conversations": [
            "read_conversation",
            "update_conversation",
            "assign_conversation",
            "transfer_conversation",
            "view_available_agents",
        ],
        "analytics": [
            "view_analytics",
            "export_analytics",
        ],
        "contacts": [
            "create_contact",
            "read_contact",
            "update_contact",
            "delete_contact",
        ],
        "campaigns": [
            "create_campaign",
            "read_campaign",
            "update_campaign",
            "delete_campaign",
            "execute_campaign",
        ],
    }

    # Default permission mappings for roles
    DEFAULT_ROLE_PERMISSIONS = {
        "super_admin": ["*"],  # All permissions
        "org_admin": [
            "create_chatbot",
            "read_chatbot",
            "update_chatbot",
            "delete_chatbot",
            "create_flow",
            "update_flow",
            "delete_flow",
            "create_user",
            "read_user",
            "update_user",
            "manage_roles",
            "view_agents",
            "view_analytics",
            "read_conversation",
            "update_conversation",
            "assign_conversation",
            "transfer_conversation",
            "view_available_agents",
            "read_contact",
            "create_contact",
            "update_contact",
            "delete_contact",
        ],
        "agent": [
            "read_chatbot",
            "read_flow",
            "read_conversation",
            "update_conversation",
            "assign_conversation",
            "transfer_conversation",
            "view_available_agents",
            "read_contact",
            "create_contact",
            "view_analytics",
        ],
        "viewer": [
            "read_chatbot",
            "read_conversation",
            "view_available_agents",
            "view_analytics",
            "read_contact",
        ],
    }

    def __init__(self, db: AsyncSession, redis_client=None):
        self.db = db
        self.redis = redis_client
        self.role_repo = RoleRepository(db)
        self.permission_repo = PermissionRepository(db)

    async def initialize_system_roles(self, organization_id: Optional[UUID] = None):
        """
        Initialize system roles for organization.
        
        Args:
            organization_id: If provided, creates org-scoped default roles. If None, creates system roles.
        """
        logger.info(f"Initializing system roles for org={organization_id}")

        # Check if roles already exist
        existing_roles = await self.role_repo.list_by_organization(organization_id)
        if existing_roles:
            logger.info(f"Roles already exist for org={organization_id}, skipping initialization")
            return

        # Create permissions first
        permissions_map = {}
        for category, perm_names in self.SYSTEM_PERMISSIONS.items():
            for perm_name in perm_names:
                perm = await self.permission_repo.create({
                    "name": perm_name,
                    "description": f"{category.title()} - {perm_name.replace('_', ' ').title()}",
                    "category": category,
                    "organization_id": organization_id,
                    "is_active": True,
                })
                permissions_map[perm_name] = perm.id

        # Create roles and assign permissions
        for role_name, role_data in self.SYSTEM_ROLES.items():
            # Adjust is_system flag if org-scoped
            role_data_copy = role_data.copy()
            if organization_id:
                role_data_copy["is_system"] = False

            role = await self.role_repo.create({
                **role_data_copy,
                "organization_id": organization_id,
            })

            # Assign default permissions
            default_perms = self.DEFAULT_ROLE_PERMISSIONS.get(role_name, [])
            if default_perms and "*" not in default_perms:
                perm_ids = [permissions_map[p] for p in default_perms if p in permissions_map]
                await self.role_repo.assign_permissions(role.id, perm_ids)

            logger.info(f"Created role: {role_name} (id={role.id})")

        # Clear cache
        if self.redis:
            await self._clear_cache(organization_id)

    async def create_role(
        self, name: str, description: str, organization_id: UUID, is_custom: bool = True
    ) -> Role:
        """Create a new custom role"""
        # Check if role exists
        existing = await self.role_repo.get_by_name(name, organization_id)
        if existing:
            raise BadRequestException(f"Role '{name}' already exists in this organization")

        role = await self.role_repo.create({
            "name": name,
            "description": description,
            "organization_id": organization_id,
            "is_custom": is_custom,
            "is_active": True,
        })

        await self._clear_cache(organization_id)
        return role

    async def get_role(self, role_id: UUID) -> Role:
        """Get role by ID"""
        role = await self.role_repo.get(role_id)
        if not role:
            raise NotFoundException(f"Role {role_id} not found")
        return role

    async def list_roles(self, organization_id: UUID) -> List[Role]:
        """List all roles for organization"""
        return await self.role_repo.list_by_organization(organization_id)

    async def update_role(self, role_id: UUID, data: dict) -> Role:
        """Update role"""
        role = await self.role_repo.update(role_id, data)
        
        if role.organization_id:
            await self._clear_cache(role.organization_id)
        
        return role

    async def delete_role(self, role_id: UUID):
        """Delete custom role"""
        role = await self.get_role(role_id)
        await self.role_repo.delete(role_id)
        
        if role.organization_id:
            await self._clear_cache(role.organization_id)

    async def assign_permissions(self, role_id: UUID, permission_ids: List[UUID]) -> Role:
        """Assign permissions to role"""
        role = await self.get_role(role_id)
        await self.role_repo.assign_permissions(role_id, permission_ids)

        if role.organization_id:
            await self._clear_cache(role.organization_id)

        return await self.get_role(role_id)

    async def add_permission_to_role(self, role_id: UUID, permission_id: UUID):
        """Add single permission to role"""
        await self.role_repo.add_permission(role_id, permission_id)
        
        role = await self.get_role(role_id)
        if role.organization_id:
            await self._clear_cache(role.organization_id)

    async def remove_permission_from_role(self, role_id: UUID, permission_id: UUID):
        """Remove permission from role"""
        await self.role_repo.remove_permission(role_id, permission_id)
        
        role = await self.get_role(role_id)
        if role.organization_id:
            await self._clear_cache(role.organization_id)

    async def get_role_permissions(self, role_id: UUID) -> List[str]:
        """Get permission names for role"""
        role = await self.get_role(role_id)
        return role.permission_names

    async def user_has_permission(self, user_id: UUID, permission: str) -> bool:
        """
        Check if user has permission
        
        This should be called from auth/dependency layer after loading user with role
        """
        # This is a helper - actual check happens in dependencies layer
        # where we have the user object with role loaded
        pass

    async def _clear_cache(self, organization_id: Optional[UUID]):
        """Clear role cache for organization"""
        if not self.redis:
            return

        try:
            cache_key = f"roles:org:{organization_id}"
            await self.redis.delete(cache_key)
            logger.debug(f"Cleared role cache: {cache_key}")
        except Exception as e:
            logger.error(f"Error clearing role cache: {e}")

    @staticmethod
    def has_permission(user_role: Role, required_permission: str) -> bool:
        """
        Check if user's role has permission
        
        Args:
            user_role: User's Role object (with permissions loaded)
            required_permission: Permission string to check (e.g., "create_chatbot")
            
        Returns:
            True if user has permission or has wildcard (*) permission
        """
        if not user_role:
            return False

        # Super admin always has all permissions
        if user_role.name == "super_admin":
            return True

        # Check for direct permission or wildcard
        permission_names = [p.name for p in user_role.permissions]
        return required_permission in permission_names or "*" in permission_names
