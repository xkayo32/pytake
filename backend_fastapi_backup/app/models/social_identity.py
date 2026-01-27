"""
Social Identity Model
Tracks linked social accounts (Google, GitHub, Microsoft) per user.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4

from sqlalchemy import String, Boolean, DateTime, ForeignKey, Index, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, SoftDeleteMixin


class SocialIdentity(Base, TimestampMixin, SoftDeleteMixin):
    """
    Linked social account for OAuth login.
    Stores OAuth credentials and user info from social providers.
    
    Fields:
        - id: Unique identity ID
        - user_id: FK to User (who owns this social identity)
        - organization_id: FK to Organization (multi-tenancy)
        - provider: OAuth provider (google|github|microsoft)
        - social_user_id: User ID from social provider
        - email: Email from social provider
        - name: Display name from social provider
        - avatar_url: Profile picture URL
        - access_token: Current OAuth access token (encrypted)
        - refresh_token: OAuth refresh token for token renewal (encrypted)
        - expires_at: When access token expires
        - linked_at: When account was linked
        - last_login_at: Last OAuth login timestamp
    """
    __tablename__ = "social_identities"
    
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organization.id", ondelete="CASCADE"), nullable=False)
    provider: Mapped[str] = mapped_column(String(20), nullable=False)  # "google" | "github" | "microsoft"
    social_user_id: Mapped[str] = mapped_column(String(255), nullable=False)  # ID from provider
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(2048), nullable=True)
    access_token: Mapped[str] = mapped_column(Text, nullable=False)  # Encrypted
    refresh_token: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # Encrypted, optional
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    linked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Indexes
    __table_args__ = (
        Index("idx_social_identity_user_provider", "user_id", "provider"),
        Index("idx_social_identity_org_provider", "organization_id", "provider"),
        Index("idx_social_identity_social_user", "social_user_id"),
    )
    
    def __repr__(self) -> str:
        return f"<SocialIdentity id={self.id} user_id={self.user_id} provider={self.provider}>"
