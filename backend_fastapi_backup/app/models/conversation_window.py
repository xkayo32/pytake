"""
ConversationWindow model - Tracks WhatsApp 24-hour message window for conversations.

WhatsApp's 24-hour policy:
- Free-form messages can only be sent within 24 hours of the last customer message
- Outside the 24-hour window, a template message must be used
- Customer messages reset the window
"""

from datetime import datetime, timedelta
from uuid import UUID

from sqlalchemy import Column, DateTime, ForeignKey, String, Text, Boolean
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import text

from app.models.base import Base, SoftDeleteMixin, TimestampMixin


class ConversationWindow(Base, TimestampMixin, SoftDeleteMixin):
    """
    Conversation Window model - Tracks WhatsApp's 24-hour message window.
    
    One window per conversation, automatically created when conversation is created.
    Window is reset/extended when customer sends a message.
    """

    __tablename__ = "conversation_windows"

    # Primary Key
    id = Column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )

    # Foreign Keys
    organization_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    conversation_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )

    # Window Timing
    started_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("NOW()"),
        index=True,
    )

    ends_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("NOW() + INTERVAL '24 hours'"),
        index=True,
    )

    # Status
    is_active = Column(
        Boolean,
        default=True,
        server_default="true",
        nullable=False,
        index=True,
    )

    # Status: active, expired, manually_extended, closed
    status = Column(
        String(50),
        default="active",
        server_default="active",
        nullable=False,
        index=True,
    )

    # Reason for closing (if closed)
    close_reason = Column(String(255), nullable=True)

    # Notes
    notes = Column(Text, nullable=True)

    # Relationships
    organization = relationship("Organization", back_populates="conversation_windows")
    conversation = relationship("Conversation", foreign_keys=[conversation_id])

    def __repr__(self):
        return (
            f"<ConversationWindow(id={self.id}, conversation_id={self.conversation_id}, "
            f"status='{self.status}')>"
        )

    @property
    def is_within_window(self) -> bool:
        """Check if current time is within the 24-hour window."""
        if not self.is_active:
            return False
        return datetime.utcnow() < self.ends_at

    @property
    def hours_remaining(self) -> float:
        """Calculate hours remaining in the window. Returns 0 if expired."""
        if not self.is_within_window:
            return 0.0
        delta = self.ends_at - datetime.utcnow()
        return delta.total_seconds() / 3600

    @property
    def minutes_remaining(self) -> float:
        """Calculate minutes remaining in the window. Returns 0 if expired."""
        if not self.is_within_window:
            return 0.0
        delta = self.ends_at - datetime.utcnow()
        return delta.total_seconds() / 60

    @property
    def time_until_expiry(self) -> dict:
        """Get human-readable time until expiry."""
        if not self.is_within_window:
            return {"expired": True, "hours": 0, "minutes": 0, "seconds": 0}

        delta = self.ends_at - datetime.utcnow()
        total_seconds = int(delta.total_seconds())
        hours = total_seconds // 3600
        minutes = (total_seconds % 3600) // 60
        seconds = total_seconds % 60

        return {
            "expired": False,
            "hours": hours,
            "minutes": minutes,
            "seconds": seconds,
            "total_seconds": total_seconds,
        }

    def reset_window(self) -> None:
        """Reset the window start time (when customer sends a message)."""
        now = datetime.utcnow()
        self.started_at = now
        self.ends_at = now + timedelta(hours=24)
        self.is_active = True
        self.status = "active"
        self.updated_at = now

    def extend_window(self, hours: int = 24) -> None:
        """Manually extend the window by specified hours."""
        self.ends_at = datetime.utcnow() + timedelta(hours=hours)
        self.is_active = True
        self.status = "manually_extended"
        self.updated_at = datetime.utcnow()

    def close_window(self, reason: str = None) -> None:
        """Close/expire the window."""
        self.is_active = False
        self.status = "expired"
        self.close_reason = reason or "Window expired"
        self.updated_at = datetime.utcnow()

    def to_dict(self) -> dict:
        """Convert to dictionary for API responses."""
        return {
            "id": str(self.id),
            "conversation_id": str(self.conversation_id),
            "organization_id": str(self.organization_id),
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "ends_at": self.ends_at.isoformat() if self.ends_at else None,
            "is_active": self.is_active,
            "is_within_window": self.is_within_window,
            "status": self.status,
            "hours_remaining": self.hours_remaining,
            "minutes_remaining": self.minutes_remaining,
            "time_until_expiry": self.time_until_expiry,
        }
