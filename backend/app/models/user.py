"""
User and authentication models
"""

from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, INET, JSONB, UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import text

from app.models.base import Base, SoftDeleteMixin, TimestampMixin


class User(Base, TimestampMixin, SoftDeleteMixin):
    """
    User model - represents users within an organization
    """

    __tablename__ = "users"

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
        nullable=False,
        index=True,
    )

    # Authentication
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    email_verified = Column(Boolean, default=False, server_default="false")
    email_verified_at = Column(DateTime(timezone=True), nullable=True)
    verification_token = Column(String(255), nullable=True)

    # Profile
    full_name = Column(String(255), nullable=False)
    avatar_url = Column(Text, nullable=True)
    phone_number = Column(String(20), nullable=True)
    bio = Column(Text, nullable=True)

    # Role & Permissions
    # FK to dynamic role system
    role_id = Column(
        UUID(as_uuid=True),
        ForeignKey("roles.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    
    # Legacy: Keep for backwards compatibility during migration
    role = Column(
        String(50),
        nullable=True,
        default=None,
        index=True,
    )
    
    # Direct permissions (for edge cases, normally managed via role)
    permissions = Column(
        ARRAY(String),
        nullable=False,
        default=[],
        server_default=text("ARRAY[]::varchar[]"),
    )

    # Status
    is_active = Column(Boolean, default=True, server_default="true", nullable=False)
    is_online = Column(Boolean, default=False, server_default="false", nullable=False)
    last_seen_at = Column(DateTime(timezone=True), nullable=True)

    # Security
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    last_login_ip = Column(INET, nullable=True)
    failed_login_attempts = Column(
        Integer, default=0, server_default="0", nullable=False
    )
    locked_until = Column(DateTime(timezone=True), nullable=True)
    password_changed_at = Column(DateTime(timezone=True), nullable=True)
    reset_password_token = Column(String(255), nullable=True)
    reset_password_expires = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    skills = relationship(
        "AgentSkill",
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    # Agent-specific fields
    # Department assignment for agents
    department_ids = Column(
        ARRAY(UUID(as_uuid=True)),
        nullable=False,
        default=[],
        server_default=text("ARRAY[]::uuid[]"),
    )

    # Agent availability status
    agent_status = Column(
        String(50),
        nullable=True,
    )  # available, busy, away, offline

    # Automatic greeting message when agent picks conversation from queue
    agent_greeting_message = Column(Text, nullable=True)

    # Preferences (flexible JSONB)
    preferences = Column(
        JSONB,
        nullable=False,
        default={},
        server_default=text("'{}'::jsonb"),
    )

    # Relationships
    organization = relationship("Organization", back_populates="users")
    role_obj = relationship("Role", back_populates="users", foreign_keys=[role_id])
    refresh_tokens = relationship(
        "RefreshToken", back_populates="user", cascade="all, delete-orphan"
    )
    # conversations_as_agent = relationship("Conversation", foreign_keys="Conversation.current_agent_id", back_populates="current_agent")
    # messages_sent = relationship("Message", back_populates="sender_user")

    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}', role='{self.role}')>"

    @property
    def is_locked(self) -> bool:
        """Check if user account is locked"""
        if self.locked_until:
            return datetime.utcnow() < self.locked_until
        return False

    @property
    def is_super_admin(self) -> bool:
        """Check if user is super admin"""
        return self.role == "super_admin"

    @property
    def is_org_admin(self) -> bool:
        """Check if user is organization admin"""
        return self.role == "org_admin"

    @property
    def is_agent(self) -> bool:
        """Check if user is an agent"""
        return self.role == "agent"

    @property
    def can_manage_users(self) -> bool:
        """Check if user can manage other users (requires super_admin or org_admin role)"""
        # Supports both legacy string roles and new database-driven RBAC
        return self.role in ["super_admin", "org_admin"]

    @property
    def can_manage_chatbots(self) -> bool:
        """Check if user can manage chatbots (requires super_admin or org_admin role)"""
        # Supports both legacy string roles and new database-driven RBAC
        return self.role in ["super_admin", "org_admin"]

    @property
    def can_access_conversations(self) -> bool:
        """Check if user can access conversations (requires super_admin, org_admin, or agent role)"""
        # Supports both legacy string roles and new database-driven RBAC
        return self.role in ["super_admin", "org_admin", "agent"]

    def has_permission(self, permission: str) -> bool:
        """Check if user has specific permission"""
        return permission in self.permissions or self.is_super_admin

    def record_login(self, ip_address: str = None):
        """Record successful login"""
        self.last_login_at = datetime.utcnow()
        self.last_login_ip = ip_address
        self.failed_login_attempts = 0
        self.locked_until = None

    def record_failed_login(self):
        """Record failed login attempt"""
        self.failed_login_attempts += 1
        # Lock account after 5 failed attempts for 30 minutes
        if self.failed_login_attempts >= 5:
            from datetime import timedelta

            self.locked_until = datetime.utcnow() + timedelta(minutes=30)

    def reset_failed_attempts(self):
        """Reset failed login attempts"""
        self.failed_login_attempts = 0
        self.locked_until = None


class RefreshToken(Base, TimestampMixin):
    """
    Refresh token model for JWT authentication
    """

    __tablename__ = "refresh_tokens"

    # Primary Key
    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )

    # Foreign Keys
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Token Info
    token_hash = Column(String(255), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)

    # Status
    revoked = Column(Boolean, default=False, server_default="false", nullable=False)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    revoked_reason = Column(String(255), nullable=True)

    # Metadata
    user_agent = Column(Text, nullable=True)
    ip_address = Column(INET, nullable=True)

    # Relationships
    user = relationship("User", back_populates="refresh_tokens")

    def __repr__(self):
        return f"<RefreshToken(id={self.id}, user_id={self.user_id}, revoked={self.revoked})>"

    @property
    def is_expired(self) -> bool:
        """Check if token is expired"""
        return datetime.utcnow() > self.expires_at

    @property
    def is_valid(self) -> bool:
        """Check if token is valid (not expired and not revoked)"""
        return not self.is_expired and not self.revoked

    def revoke(self, reason: str = None):
        """Revoke the refresh token"""
        self.revoked = True
        self.revoked_at = datetime.utcnow()
        self.revoked_reason = reason
