"""
AlertNotification model - Tracks notifications sent for alerts
"""

from enum import Enum
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import text

from app.models.base import Base, SoftDeleteMixin, TimestampMixin


class AlertNotificationStatus(str, Enum):
    """Alert notification delivery status"""

    PENDING = "pending"  # Waiting to be sent
    SENT = "sent"  # Successfully sent
    FAILED = "failed"  # Failed to send
    BOUNCED = "bounced"  # Email bounced


class AlertNotification(Base, TimestampMixin, SoftDeleteMixin):
    """
    AlertNotification model - Tracks alert notifications sent to users
    Separate from NotificationPreference/NotificationLog for alert-specific tracking
    """

    __tablename__ = "alert_notifications"

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

    alert_id = Column(
        UUID(as_uuid=True),
        ForeignKey("alerts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Notification Channel
    channel = Column(
        String(20),
        nullable=False,
        default="email",
        server_default="email",
    )  # email, slack, in_app

    # Notification Event Type
    event_type = Column(
        String(50),
        nullable=False,
        index=True,
    )  # alert_created, alert_escalated, alert_stale

    # Delivery Status
    status = Column(
        String(20),
        nullable=False,
        default="pending",
        server_default="pending",
        index=True,
    )  # pending, sent, failed, bounced

    # Content
    subject = Column(String(255), nullable=True)  # For emails
    message = Column(Text, nullable=False)
    message_html = Column(Text, nullable=True)  # HTML version

    # Recipient Info
    recipient_email = Column(String(255), nullable=True, index=True)
    recipient_slack_id = Column(String(255), nullable=True)

    # Delivery Tracking
    sent_at = Column(DateTime(timezone=True), nullable=True)
    failed_reason = Column(Text, nullable=True)  # Why it failed
    retry_count = Column(
        Integer, default=0, server_default="0"
    )  # Number of attempts
    last_retry_at = Column(DateTime(timezone=True), nullable=True)

    # External IDs
    external_message_id = Column(String(255), nullable=True)  # Email ID from SMTP
    external_timestamp = Column(DateTime(timezone=True), nullable=True)

    # Metadata
    alert_metadata = Column(
        JSONB,
        nullable=False,
        default={},
        server_default=text("'{}'::jsonb"),
    )  # alert_severity, template_name, quality_score, escalation_level, etc.

    # Relationships
    organization = relationship("Organization")
    alert = relationship("Alert", back_populates="alert_notifications")
    user = relationship("User")

    def __repr__(self):
        return f"<AlertNotification(id={self.id}, event='{self.event_type}', status='{self.status}')>"

    @property
    def is_pending(self) -> bool:
        """Check if notification is waiting to be sent"""
        return self.status == AlertNotificationStatus.PENDING.value

    @property
    def is_sent(self) -> bool:
        """Check if notification was successfully sent"""
        return self.status == AlertNotificationStatus.SENT.value

    @property
    def is_failed(self) -> bool:
        """Check if notification failed to send"""
        return self.status == AlertNotificationStatus.FAILED.value

    @property
    def should_retry(self) -> bool:
        """Check if notification should be retried (max 3 attempts)"""
        return self.is_failed and self.retry_count < 3
