"""
Notification models for email, SMS, WhatsApp, and in-app notifications
"""

import enum
from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Integer, Enum, Text, JSON, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from app.models.base import Base, TimestampMixin


class NotificationChannel(str, enum.Enum):
    """Available notification channels"""
    EMAIL = "email"
    SMS = "sms"
    WHATSAPP = "whatsapp"
    WEBSOCKET = "websocket"
    IN_APP = "in_app"


class NotificationType(str, enum.Enum):
    """Types of notifications that can be sent"""
    CONVERSATION_ASSIGNED = "conversation_assigned"
    SLA_WARNING = "sla_warning"
    CAMPAIGN_FAILED = "campaign_failed"
    NEW_CONTACT = "new_contact"
    CONVERSATION_CLOSED = "conversation_closed"
    AGENT_OFFLINE = "agent_offline"
    CUSTOM = "custom"


class NotificationPreference(Base, TimestampMixin):
    """User notification preferences per organization"""
    __tablename__ = "notification_preferences"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(PGUUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    organization_id = Column(PGUUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    
    # Enabled channels
    email_enabled = Column(Boolean, default=True)
    sms_enabled = Column(Boolean, default=False)
    whatsapp_enabled = Column(Boolean, default=False)
    websocket_enabled = Column(Boolean, default=True)
    in_app_enabled = Column(Boolean, default=True)
    
    # Quiet hours (do not disturb)
    quiet_hours_start = Column(String, nullable=True)  # "18:00"
    quiet_hours_end = Column(String, nullable=True)    # "08:00"
    quiet_hours_enabled = Column(Boolean, default=False)
    
    # Frequency limiting
    max_emails_per_hour = Column(Integer, default=10)
    max_sms_per_hour = Column(Integer, default=5)
    
    __table_args__ = (
        UniqueConstraint('user_id', 'organization_id', name='uq_user_org_notification'),
        Index('ix_notification_preferences_org_id', 'organization_id'),
        Index('ix_notification_preferences_user_id', 'user_id'),
    )


class NotificationLog(Base, TimestampMixin):
    """Audit trail for all notifications sent"""
    __tablename__ = "notification_logs"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(PGUUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    user_id = Column(PGUUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    notification_type = Column(Enum(NotificationType), nullable=False)
    channel = Column(Enum(NotificationChannel), nullable=False)
    
    subject = Column(String(255), nullable=True)
    message = Column(Text, nullable=False)
    recipient = Column(String(255), nullable=False)  # email, phone, etc
    
    status = Column(String(50), default="pending")  # pending, sent, failed, bounced
    error_message = Column(Text, nullable=True)
    
    sent_at = Column(DateTime, nullable=True)
    
    # Metadata for tracking
    notification_metadata = Column(JSON, nullable=True)  # {conversation_id, contact_id, etc}
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)

    __table_args__ = (
        Index('ix_notification_logs_org_id', 'organization_id'),
        Index('ix_notification_logs_user_id', 'user_id'),
        Index('ix_notification_logs_status', 'status'),
        Index('ix_notification_logs_created_at', 'created_at'),
        Index('ix_notification_logs_channel', 'channel'),
    )
