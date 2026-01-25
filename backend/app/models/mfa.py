"""
Multi-Factor Authentication (MFA) Models
Supports TOTP (Time-based OTP) and SMS verification.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4

from sqlalchemy import String, Boolean, Integer, DateTime, ForeignKey, Index, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, SoftDeleteMixin


class MFAMethod(Base, TimestampMixin, SoftDeleteMixin):
    """
    MFA method configuration per user.
    Stores TOTP secrets and SMS phone numbers.
    
    Fields:
        - id: Unique MFA method ID
        - user_id: FK to User
        - organization_id: FK to Organization (multi-tenancy)
        - method_type: "totp" or "sms"
        - secret: TOTP secret (encrypted) or phone number
        - is_verified: Whether this method has been verified
        - is_primary: Whether this is the primary MFA method
        - backup_codes_generated: Number of backup codes generated
        - last_used_at: Last successful MFA verification timestamp
    """
    __tablename__ = "mfa_methods"
    
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("user.id", ondelete="CASCADE"), nullable=False)
    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organization.id", ondelete="CASCADE"), nullable=False)
    method_type: Mapped[str] = mapped_column(String(20), nullable=False)  # "totp" | "sms"
    secret: Mapped[str] = mapped_column(String(500), nullable=False)  # Encrypted TOTP secret or phone
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    backup_codes_generated: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_used_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Indexes for performance
    __table_args__ = (
        Index("idx_mfa_methods_user_org", "user_id", "organization_id"),
        Index("idx_mfa_methods_org_method", "organization_id", "method_type"),
        Index("idx_mfa_methods_verified", "user_id", "is_verified"),
    )
    
    def __repr__(self) -> str:
        return f"<MFAMethod id={self.id} user_id={self.user_id} method={self.method_type}>"


class MFAChallenge(Base, TimestampMixin):
    """
    MFA challenge for code verification.
    Used for TOTP and SMS code validation with expiration.
    
    Fields:
        - id: Unique challenge ID
        - user_id: FK to User
        - organization_id: FK to Organization (multi-tenancy)
        - mfa_method_id: FK to MFAMethod (what method is being challenged)
        - challenge_token: Unique challenge token (for linking code to request)
        - code: Encrypted OTP code or SMS code
        - method_type: "totp" or "sms" (denormalized for query speed)
        - expires_at: When challenge expires
        - attempt_count: Failed attempt count (for rate limiting)
        - max_attempts: Maximum allowed attempts (typically 3)
        - is_used: Whether this challenge has been successfully used
    """
    __tablename__ = "mfa_challenges"
    
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("user.id", ondelete="CASCADE"), nullable=False)
    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organization.id", ondelete="CASCADE"), nullable=False)
    mfa_method_id: Mapped[UUID] = mapped_column(ForeignKey("mfa_methods.id", ondelete="CASCADE"), nullable=False)
    challenge_token: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    code: Mapped[str] = mapped_column(String(255), nullable=False)  # Encrypted
    method_type: Mapped[str] = mapped_column(String(20), nullable=False)  # "totp" | "sms"
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    attempt_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    max_attempts: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    is_used: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    
    # Indexes for performance
    __table_args__ = (
        Index("idx_mfa_challenges_user_org", "user_id", "organization_id"),
        Index("idx_mfa_challenges_token", "challenge_token"),
        Index("idx_mfa_challenges_expires", "expires_at"),
    )
    
    def __repr__(self) -> str:
        return f"<MFAChallenge id={self.id} user_id={self.user_id} method={self.method_type}>"


class MFABackupCode(Base, TimestampMixin):
    """
    Backup codes for MFA account recovery.
    One-time use codes generated when MFA is enabled.
    
    Fields:
        - id: Unique backup code ID
        - user_id: FK to User
        - organization_id: FK to Organization
        - code: Encrypted backup code (one-time use)
        - is_used: Whether code has been used
        - used_at: When code was used for recovery
    """
    __tablename__ = "mfa_backup_codes"
    
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("user.id", ondelete="CASCADE"), nullable=False)
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
        return f"<MFABackupCode user_id={self.user_id} used={self.is_used}>"
