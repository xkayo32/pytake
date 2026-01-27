"""
Multi-Factor Authentication (MFA) Models
Supports TOTP and SMS based two-factor authentication.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4

from sqlalchemy import String, Boolean, Integer, DateTime, ForeignKey, Index, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, SoftDeleteMixin


class MFAMethod(Base, TimestampMixin, SoftDeleteMixin):
    """
    MFA method configuration for a user.
    Stores TOTP secrets and phone numbers for SMS.
    
    Fields:
        - id: Unique method ID
        - user_id: FK to User
        - organization_id: FK to Organization (multi-tenancy)
        - method_type: "totp" or "sms"
        - secret: Encrypted TOTP secret or phone number
        - is_verified: Whether method has been verified
        - is_primary: Whether this is the primary MFA method
        - backup_codes_generated: Count of backup codes generated
        - last_used_at: Last successful MFA verification
    """
    __tablename__ = "mfa_methods"
    
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organization.id", ondelete="CASCADE"), nullable=False)
    method_type: Mapped[str] = mapped_column(String(20), nullable=False)  # "totp" | "sms"
    secret: Mapped[str] = mapped_column(String(500), nullable=False)  # Encrypted
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    backup_codes_generated: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_used_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Indexes
    __table_args__ = (
        Index("idx_mfa_methods_user_org", "user_id", "organization_id"),
        Index("idx_mfa_methods_org_type", "organization_id", "method_type"),
        Index("idx_mfa_methods_user_verified", "user_id", "is_verified"),
    )
    
    def __repr__(self) -> str:
        return f"<MFAMethod id={self.id} user_id={self.user_id} type={self.method_type}>"


class MFAChallenge(Base, TimestampMixin):
    """
    MFA verification challenge (code attempt tracking).
    Used for rate limiting and tracking MFA verification attempts.
    
    Fields:
        - id: Unique challenge ID
        - user_id: FK to User
        - organization_id: FK to Organization
        - method_id: FK to MFAMethod
        - code: Encrypted verification code (for SMS)
        - challenge_token: Unique token linking code to request
        - attempts: Number of verification attempts
        - expires_at: When challenge expires
        - verified_at: When successfully verified
    """
    __tablename__ = "mfa_challenges"
    
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organization.id", ondelete="CASCADE"), nullable=False)
    method_id: Mapped[UUID] = mapped_column(ForeignKey("mfa_methods.id", ondelete="CASCADE"), nullable=False)
    code: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)  # Encrypted SMS code
    challenge_token: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)  # Unique challenge token
    attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Indexes
    __table_args__ = (
        Index("idx_mfa_challenges_user_org", "user_id", "organization_id"),
        Index("idx_mfa_challenges_token", "challenge_token"),
        Index("idx_mfa_challenges_expires", "expires_at"),
    )
    
    def __repr__(self) -> str:
        return f"<MFAChallenge id={self.id} user_id={self.user_id}>"


class MFABackupCode(Base, TimestampMixin):
    """
    One-time recovery codes for MFA account recovery.
    Generated when user enables MFA, can be used instead of MFA code.
    
    Fields:
        - id: Unique code ID
        - user_id: FK to User
        - organization_id: FK to Organization
        - code: Encrypted backup code
        - is_used: Whether code has been used
        - used_at: When code was used
    """
    __tablename__ = "mfa_backup_codes"
    
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organization.id", ondelete="CASCADE"), nullable=False)
    code: Mapped[str] = mapped_column(String(255), nullable=False)  # Encrypted
    is_used: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    used_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Indexes
    __table_args__ = (
        Index("idx_mfa_backup_codes_user", "user_id"),
        Index("idx_mfa_backup_codes_org", "organization_id"),
    )
    
    def __repr__(self) -> str:
        return f"<MFABackupCode id={self.id} is_used={self.is_used}>"
