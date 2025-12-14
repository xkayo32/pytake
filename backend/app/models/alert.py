"""
Alert models for template status monitoring and escalation
"""

import enum
from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, Enum, Text, Boolean, Index
from sqlalchemy.dialects.postgresql import UUID as PGUUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import text

from app.models.base import Base, TimestampMixin, SoftDeleteMixin


class AlertType(str, enum.Enum):
    """Types of alerts that can be generated"""
    TEMPLATE_DISABLED = "template_disabled"  # Meta disabled the template
    TEMPLATE_PAUSED = "template_paused"  # Meta paused the template
    QUALITY_DEGRADED = "quality_degraded"  # Quality score changed to RED/YELLOW
    APPROVAL_REJECTED = "approval_rejected"  # Template approval was rejected
    SEND_FAILURE_HIGH = "send_failure_high"  # High failure rate (>10%)
    DELIVERY_FAILURE = "delivery_failure"  # Low delivery rate
    TEMPLATE_EXPIRED = "template_expired"  # Template not used in 30+ days


class AlertSeverity(str, enum.Enum):
    """Alert severity levels"""
    INFO = "info"  # Informational
    WARNING = "warning"  # Needs attention
    CRITICAL = "critical"  # Urgent


class AlertStatus(str, enum.Enum):
    """Alert lifecycle status"""
    OPEN = "open"  # Not yet acknowledged
    ACKNOWLEDGED = "acknowledged"  # User has seen but not resolved
    RESOLVED = "resolved"  # Issue is fixed
    ESCALATED = "escalated"  # Escalated to higher level


class Alert(Base, TimestampMixin, SoftDeleteMixin):
    """
    Alert model for tracking template status issues and escalations
    
    Alerts are generated when:
    1. Meta disables or pauses a template
    2. Template quality score drops to RED
    3. Approval is rejected
    4. Send failure rate exceeds threshold
    """

    __tablename__ = "alerts"

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

    whatsapp_template_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("whatsapp_templates.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Alert Classification
    alert_type = Column(Enum(AlertType), nullable=False, index=True)
    severity = Column(Enum(AlertSeverity), nullable=False, default=AlertSeverity.WARNING)

    # Alert Status
    status = Column(
        Enum(AlertStatus),
        nullable=False,
        default=AlertStatus.OPEN,
        server_default="open",
        index=True,
    )

    # Alert Details
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    # Acknowledgment
    acknowledged_by_user_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    acknowledged_at = Column(DateTime(timezone=True), nullable=True)
    acknowledgment_notes = Column(Text, nullable=True)

    # Escalation Tracking
    escalation_level = Column(Integer, default=1, server_default="1")  # 1, 2, 3
    escalated_to_admin = Column(Boolean, default=False, server_default="false")
    escalated_at = Column(DateTime(timezone=True), nullable=True)

    # Auto-Resolution
    auto_resolved = Column(Boolean, default=False, server_default="false")
    auto_resolved_at = Column(DateTime(timezone=True), nullable=True)
    auto_resolved_reason = Column(Text, nullable=True)

    # Metadata & Context
    alert_metadata = Column(
        JSONB,
        nullable=False,
        default={},
        server_default=text("'{}'::jsonb"),
    )
    # Example alert_metadata:
    # {
    #   "quality_score_before": "GREEN",
    #   "quality_score_after": "RED",
    #   "failure_count": 45,
    #   "sent_count": 100,
    #   "failure_rate": 0.45,
    #   "rejection_reason": "MESSAGE_QUALITY_ISSUE",
    #   "previous_alert_id": "uuid-of-related-alert"
    # }

    # Notification Status
    notification_sent = Column(Boolean, default=False, server_default="false")
    notification_sent_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    organization = relationship("Organization", back_populates="alerts")
    whatsapp_template = relationship("WhatsAppTemplate")
    acknowledged_by_user = relationship("User", foreign_keys=[acknowledged_by_user_id])
    alert_notifications = relationship("AlertNotification", back_populates="alert", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_alert_org_status", "organization_id", "status"),
        Index("ix_alert_template_status", "whatsapp_template_id", "status"),
        Index("ix_alert_severity", "severity"),
        Index("ix_alert_created_at", "created_at"),
        Index("ix_alert_escalation", "escalation_level", "status"),
    )

    def __repr__(self):
        return f"<Alert(id={self.id}, type={self.alert_type}, status={self.status}, severity={self.severity})>"

    @property
    def is_open(self) -> bool:
        """Check if alert is still open"""
        return self.status == AlertStatus.OPEN

    @property
    def is_critical(self) -> bool:
        """Check if alert is critical severity"""
        return self.severity == AlertSeverity.CRITICAL

    @property
    def can_escalate(self) -> bool:
        """Check if alert can be escalated further"""
        return self.escalation_level < 3 and self.status != AlertStatus.RESOLVED

    @property
    def time_since_creation(self) -> int:
        """Get hours since alert was created"""
        from datetime import datetime as dt
        if self.created_at:
            delta = dt.now(self.created_at.tzinfo) - self.created_at
            return int(delta.total_seconds() / 3600)
        return 0

    @property
    def time_since_acknowledged(self) -> Optional[int]:
        """Get hours since alert was acknowledged"""
        if not self.acknowledged_at:
            return None
        from datetime import datetime as dt
        delta = dt.now(self.acknowledged_at.tzinfo) - self.acknowledged_at
        return int(delta.total_seconds() / 3600)
