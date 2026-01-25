"""
OAuth Provider configuration models
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, Text, Index
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import text

from app.models.base import Base, TimestampMixin


class OAuthProvider(Base, TimestampMixin):
    """
    OAuth/SAML provider configuration per organization.
    Stores SAML 2.0 and OIDC provider configurations.
    """

    __tablename__ = "oauth_providers"

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

    # Provider Type
    provider_type = Column(
        String(50),
        nullable=False,
        comment="saml2.0, oidc, custom",
    )

    # Configuration
    name = Column(
        String(255),
        nullable=False,
        comment="Display name (e.g., 'Okta', 'Auth0')",
    )

    client_id = Column(
        String(255),
        nullable=False,
        comment="OAuth client ID or SAML entity ID",
    )

    client_secret = Column(
        Text,
        nullable=True,
        comment="OAuth client secret (encrypted) - required for OIDC",
    )

    metadata_url = Column(
        String(500),
        nullable=True,
        comment="SAML IdP metadata URL or OIDC .well-known endpoint",
    )

    entity_id = Column(
        String(500),
        nullable=True,
        comment="SAML IdP entity ID",
    )

    acs_url = Column(
        String(500),
        nullable=True,
        comment="SAML Assertion Consumer Service URL",
    )

    logout_url = Column(
        String(500),
        nullable=True,
        comment="SAML logout URL for SLO",
    )

    sso_url = Column(
        String(500),
        nullable=True,
        comment="SAML SSO URL for IdP login",
    )

    # Configuration JSON
    config = Column(
        JSONB,
        nullable=True,
        comment="Additional provider config (format, scope, etc)",
    )

    # Status
    is_enabled = Column(
        Boolean,
        default=True,
        server_default="true",
        nullable=False,
    )

    is_primary = Column(
        Boolean,
        default=False,
        server_default="false",
        nullable=False,
        comment="Primary provider for this organization",
    )

    # Indexes
    __table_args__ = (
        Index("idx_oauth_providers_org_type", "organization_id", "provider_type"),
        Index("idx_oauth_providers_org_enabled", "organization_id", "is_enabled"),
    )

    # Relationships
    user_identities = relationship(
        "UserIdentity",
        back_populates="oauth_provider",
        cascade="all, delete-orphan",
    )


class UserIdentity(Base, TimestampMixin):
    """
    Maps external OAuth/SAML identities to internal users.
    Enables SSO login + auto-provisioning on first OAuth callback.
    """

    __tablename__ = "user_identities"

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

    oauth_provider_id = Column(
        UUID(as_uuid=True),
        ForeignKey("oauth_providers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # External Identity
    external_id = Column(
        String(500),
        nullable=False,
        comment="SAML NameID or OIDC sub claim (unique per provider)",
    )

    external_email = Column(
        String(255),
        nullable=True,
        comment="Email from OAuth provider (may differ from user.email)",
    )

    # Status
    is_primary = Column(
        Boolean,
        default=False,
        server_default="false",
        nullable=False,
        comment="Primary SSO method for this user",
    )

    last_login_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Last successful OAuth login",
    )

    # Indexes
    __table_args__ = (
        Index("idx_user_identity_external", "oauth_provider_id", "external_id"),
        Index("idx_user_identity_user", "user_id"),
    )

    # Relationships
    user = relationship("User", backref="oauth_identities")
    oauth_provider = relationship("OAuthProvider", back_populates="user_identities")


class SSOAuditLog(Base):
    """
    Immutable audit log for security compliance (HIPAA, GDPR).
    Records all authentication and permission changes.
    """

    __tablename__ = "sso_audit_logs"

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

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        comment="NULL for failed logins or unauthenticated actions",
        index=True,
    )

    # Action Details
    action = Column(
        String(100),
        nullable=False,
        comment="login, logout, permission_change, consent_given, mfa_enabled, etc",
        index=True,
    )

    details = Column(
        JSONB,
        nullable=True,
        comment="Action metadata: {ip, user_agent, provider, status, error_code}",
    )

    # Timestamp (immutable, no updates allowed)
    timestamp = Column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=text("CURRENT_TIMESTAMP"),
        nullable=False,
        index=True,
    )

    # Indexes for querying
    __table_args__ = (
        Index("idx_audit_logs_org_timestamp", "organization_id", "timestamp"),
        Index("idx_audit_logs_user_timestamp", "user_id", "timestamp"),
        Index("idx_audit_logs_action", "action"),
        Index("idx_audit_logs_created", "created_at"),
    )

    @classmethod
    def create_login_event(
        cls,
        organization_id,
        user_id,
        provider: str,
        ip_address: str,
        user_agent: str,
        status: str = "success",
    ):
        """Factory method to create login audit log"""
        return cls(
            organization_id=organization_id,
            user_id=user_id,
            action="login",
            details={
                "provider": provider,
                "ip": ip_address,
                "user_agent": user_agent,
                "status": status,
            },
            timestamp=datetime.utcnow(),
        )

    @classmethod
    def create_logout_event(
        cls,
        organization_id,
        user_id,
        ip_address: str,
        user_agent: str,
    ):
        """Factory method to create logout audit log"""
        return cls(
            organization_id=organization_id,
            user_id=user_id,
            action="logout",
            details={
                "ip": ip_address,
                "user_agent": user_agent,
            },
            timestamp=datetime.utcnow(),
        )

    @classmethod
    def create_permission_change(
        cls,
        organization_id,
        user_id,
        changed_by_user_id,
        changes: dict,
    ):
        """Factory method to create permission change audit log"""
        return cls(
            organization_id=organization_id,
            user_id=user_id,
            action="permission_change",
            details={
                "changed_by": str(changed_by_user_id),
                "changes": changes,
            },
            timestamp=datetime.utcnow(),
        )
