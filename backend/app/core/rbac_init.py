"""
RBAC Initialization - Populate permissions and system roles
"""

import logging
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.role import Permission, Role, RolePermission
from app.core.database import get_db
from app.core.rbac_seed import PERMISSIONS_SEED, SYSTEM_ROLES

logger = logging.getLogger(__name__)


async def initialize_rbac(db: AsyncSession) -> None:
    """
    Initialize RBAC system on startup:
    1. Create system-wide permissions
    2. Create system roles
    3. Assign permissions to system roles
    """
    try:
        # 1. Create/update system-wide permissions
        logger.info("📋 Initializing permissions...")
        for perm_data in PERMISSIONS_SEED:
            # Check if permission exists
            stmt = select(Permission).where(
                Permission.name == perm_data["name"],
                Permission.organization_id.is_(None),  # System-wide permission
            )
            result = await db.execute(stmt)
            existing_perm = result.scalar_one_or_none()

            if not existing_perm:
                permission = Permission(
                    name=perm_data["name"],
                    category=perm_data["category"],
                    description=perm_data.get("description", ""),
                    organization_id=None,  # System-wide
                    is_active=True,
                )
                db.add(permission)
                logger.debug(f"✅ Created permission: {perm_data['name']}")
            else:
                logger.debug(f"⏭️  Permission already exists: {perm_data['name']}")

        await db.commit()
        logger.info(f"✅ {len(PERMISSIONS_SEED)} permissions initialized")

        # 2. Create system roles and assign permissions
        logger.info("👥 Initializing system roles...")
        for role_data in SYSTEM_ROLES:
            # Check if role exists
            stmt = select(Role).where(
                Role.name == role_data["name"],
                Role.organization_id.is_(None),  # System role
            )
            result = await db.execute(stmt)
            existing_role = result.scalar_one_or_none()

            if not existing_role:
                role = Role(
                    name=role_data["name"],
                    description=role_data.get("description", ""),
                    organization_id=None,  # System role
                    is_system=True,
                    is_custom=False,
                    is_active=True,
                )
                db.add(role)
                await db.flush()

                # Assign permissions to role
                permission_names = role_data.get("permissions", [])
                for perm_name in permission_names:
                    perm_stmt = select(Permission).where(
                        Permission.name == perm_name,
                        Permission.organization_id.is_(None),
                    )
                    perm_result = await db.execute(perm_stmt)
                    permission = perm_result.scalar_one_or_none()

                    if permission:
                        # Create role_permission mapping
                        role_perm = RolePermission(
                            role_id=role.id,
                            permission_id=permission.id,
                        )
                        db.add(role_perm)

                logger.debug(f"✅ Created role: {role_data['name']} with {len(permission_names)} permissions")
            else:
                logger.debug(f"⏭️  Role already exists: {role_data['name']}")

        await db.commit()
        logger.info(f"✅ {len(SYSTEM_ROLES)} system roles initialized")

    except Exception as e:
        logger.error(f"❌ Error initializing RBAC: {e}")
        await db.rollback()
        raise
