"""
RBAC Models - Dynamic Role-Based Access Control

Tabelas:
- Role: Definição de roles (super_admin, org_admin, agent, viewer, ou customizadas)
- Permission: Permissões granulares (create_chatbot, edit_flow, etc)
- RolePermission: Mapeamento N:N entre roles e permissions
"""

from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship
from sqlalchemy.sql import text

from app.models.base import Base, TimestampMixin


class Permission(Base, TimestampMixin):
    """
    Permission model - Represents a specific action/resource permission
    
    Examples:
    - create_chatbot
    - edit_flow
    - delete_contact
    - manage_users
    - view_analytics
    """

    __tablename__ = "permissions"

    # Primary Key
    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )

    # Foreign Keys
    organization_id = Column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=True,  # NULL = system-wide permission
        index=True,
    )

    # Permission Details
    name = Column(String(100), nullable=False, index=True)  # e.g., "create_chatbot"
    description = Column(Text, nullable=True)
    category = Column(
        String(50),
        nullable=False,
        default="general",
        index=True,
    )  # e.g., "chatbots", "users", "analytics"

    # Status
    is_active = Column(Boolean, default=True, server_default="true", nullable=False)

    # Relationships
    role_permissions = relationship(
        "RolePermission",
        back_populates="permission",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    roles = relationship(
        "Role",
        secondary="role_permissions",
        back_populates="permissions",
        overlaps="role_permissions",
    )

    # Constraint: name must be unique per organization
    __table_args__ = (UniqueConstraint("organization_id", "name", name="uq_permission_org_name"),)

    def __repr__(self) -> str:
        return f"<Permission(id={self.id}, name='{self.name}', category='{self.category}')>"


class Role(Base, TimestampMixin):
    """
    Role model - Represents a collection of permissions
    
    System roles:
    - super_admin: Full system access
    - org_admin: Organization admin
    - agent: Agent/operator
    - viewer: Read-only access
    
    Custom roles: Per organization
    """

    __tablename__ = "roles"

    # Primary Key
    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )

    # Foreign Keys
    organization_id = Column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=True,  # NULL = system role (super_admin, org_admin, etc)
        index=True,
    )

    # Role Details
    name = Column(String(100), nullable=False, index=True)  # e.g., "org_admin", "support_agent"
    description = Column(Text, nullable=True)

    # Flags
    is_system = Column(Boolean, default=False, server_default="false")  # True = cannot be deleted
    is_custom = Column(Boolean, default=True, server_default="true")  # False = predefined
    is_active = Column(Boolean, default=True, server_default="true", nullable=False)

    # Relationships
    permissions = relationship(
        "Permission",
        secondary="role_permissions",
        back_populates="roles",
        overlaps="role_permissions",
    )

    role_permissions = relationship(
        "RolePermission",
        back_populates="role",
        cascade="all, delete-orphan",
        passive_deletes=True,
        overlaps="permissions",
    )

    users = relationship(
        "User",
        back_populates="role_obj",
        foreign_keys="User.role_id",
    )

    # Constraint: name must be unique per organization
    __table_args__ = (UniqueConstraint("organization_id", "name", name="uq_role_org_name"),)

    def __repr__(self) -> str:
        return f"<Role(id={self.id}, name='{self.name}', org_id={self.organization_id})>"

    @property
    def permission_names(self) -> list[str]:
        """Get list of permission names for this role"""
        return [perm.name for perm in self.permissions]


class RolePermission(Base, TimestampMixin):
    """
    RolePermission model - N:N relationship between Role and Permission
    """

    __tablename__ = "role_permissions"

    # Primary Key (composite)
    role_id = Column(
        UUID(as_uuid=True),
        ForeignKey("roles.id", ondelete="CASCADE"),
        primary_key=True,
        index=True,
    )

    permission_id = Column(
        UUID(as_uuid=True),
        ForeignKey("permissions.id", ondelete="CASCADE"),
        primary_key=True,
        index=True,
    )

    # Relationships
    role = relationship("Role", back_populates="role_permissions", overlaps="role_permissions")
    permission = relationship("Permission", back_populates="role_permissions", overlaps="role_permissions")

    def __repr__(self) -> str:
        return f"<RolePermission(role_id={self.role_id}, permission_id={self.permission_id})>"
