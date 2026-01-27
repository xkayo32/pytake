"""
Passwordless Authentication Models (WebAuthn / FIDO2)
Supports FIDO2 credential-based login without passwords.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4

from sqlalchemy import String, Boolean, Integer, DateTime, ForeignKey, Index, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, SoftDeleteMixin


class PasskeyCredential(Base, TimestampMixin, SoftDeleteMixin):
    """
    WebAuthn credential for passwordless login.
    Stores FIDO2 public key and counter for replay attack prevention.
    
    Fields:
        - id: Unique credential ID
        - user_id: FK to User
        - organization_id: FK to Organization (multi-tenancy)
        - credential_id: Unique credential ID from WebAuthn (base64)
        - public_key: Public key for signature verification (base64)
        - counter: Counter for replay attack detection (increments on use)
        - transports: Supported transports (usb, nfc, ble, internal)
        - device_name: User-friendly name (e.g., "iPhone Face ID", "YubiKey")
        - is_primary: Whether this is the primary passwordless method
        - last_used_at: Last successful authentication timestamp
    """
    __tablename__ = "passkey_credentials"
    
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organization.id", ondelete="CASCADE"), nullable=False)
    credential_id: Mapped[str] = mapped_column(String(1000), nullable=False, unique=True)  # base64
    public_key: Mapped[str] = mapped_column(Text, nullable=False)  # base64 encoded
    counter: Mapped[int] = mapped_column(Integer, default=0, nullable=False)  # Replay prevention
    transports: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)  # comma-separated: usb,nfc,ble,internal
    device_name: Mapped[str] = mapped_column(String(255), nullable=False)  # e.g., "iPhone Face ID"
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    last_used_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Indexes
    __table_args__ = (
        Index("idx_passkey_credentials_user_org", "user_id", "organization_id"),
        Index("idx_passkey_credentials_credential_id", "credential_id"),
        Index("idx_passkey_credentials_primary", "user_id", "is_primary"),
    )
    
    def __repr__(self) -> str:
        return f"<PasskeyCredential id={self.id} user_id={self.user_id} device={self.device_name}>"


class PasskeyChallenge(Base, TimestampMixin):
    """
    WebAuthn challenge for registration or authentication.
    Used to prevent replay attacks (one-time challenge).
    
    Fields:
        - id: Unique challenge ID
        - user_id: FK to User (may be None for registration flows)
        - organization_id: FK to Organization
        - challenge: Challenge string (base64)
        - challenge_type: "registration" or "authentication"
        - expires_at: When challenge expires (typically 10 minutes)
        - is_used: Whether challenge has been used
        - used_at: When challenge was successfully used
    """
    __tablename__ = "passkey_challenges"
    
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    user_id: Mapped[Optional[UUID]] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organization.id", ondelete="CASCADE"), nullable=False)
    challenge: Mapped[str] = mapped_column(String(500), nullable=False)  # base64
    challenge_type: Mapped[str] = mapped_column(String(20), nullable=False)  # "registration" | "authentication"
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    is_used: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    used_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Indexes
    __table_args__ = (
        Index("idx_passkey_challenges_user_org", "user_id", "organization_id"),
        Index("idx_passkey_challenges_challenge", "challenge"),
        Index("idx_passkey_challenges_expires", "expires_at"),
    )
    
    def __repr__(self) -> str:
        return f"<PasskeyChallenge id={self.id} type={self.challenge_type}>"
