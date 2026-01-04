"""
Campaign models for bulk messaging
"""

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import text

from app.models.base import Base, SoftDeleteMixin, TimestampMixin


class Campaign(Base, TimestampMixin, SoftDeleteMixin):
    """
    Campaign model - Bulk message campaigns
    """

    __tablename__ = "campaigns"

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

    created_by_user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    whatsapp_number_id = Column(
        UUID(as_uuid=True),
        ForeignKey("whatsapp_numbers.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Template (if using WhatsApp template)
    template_id = Column(
        UUID(as_uuid=True),
        ForeignKey("whatsapp_templates.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Campaign Info
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)

    # Campaign Type: broadcast, drip, trigger
    campaign_type = Column(
        String(50),
        nullable=False,
        default="broadcast",
        server_default="broadcast",
        index=True,
    )

    # Status: draft, scheduled, running, paused, completed, failed, cancelled
    status = Column(
        String(50),
        nullable=False,
        default="draft",
        server_default="draft",
        index=True,
    )

    # Scheduling
    scheduled_at = Column(DateTime(timezone=True), nullable=True, index=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    paused_at = Column(DateTime(timezone=True), nullable=True)
    cancelled_at = Column(DateTime(timezone=True), nullable=True)

    # Message Content
    # If not using template
    message_type = Column(
        String(50), nullable=False, default="text"
    )  # text, image, etc.
    message_content = Column(
        JSONB,
        nullable=False,
        default={},
        server_default=text("'{}'::jsonb"),
    )

    # Template Variables (if using template)
    # Global variables applied to all recipients
    template_variables = Column(
        JSONB,
        nullable=False,
        default={},
        server_default=text("'{}'::jsonb"),
    )

    # Audience Targeting
    # Method: all_contacts, segment, tags, custom_list, uploaded_file
    audience_type = Column(
        String(50),
        nullable=False,
        default="all_contacts",
        server_default="all_contacts",
    )

    # Tag IDs for targeting
    target_tag_ids = Column(
        ARRAY(UUID(as_uuid=True)),
        nullable=False,
        default=[],
        server_default=text("ARRAY[]::uuid[]"),
    )

    # Contact IDs for custom list
    target_contact_ids = Column(
        ARRAY(UUID(as_uuid=True)),
        nullable=False,
        default=[],
        server_default=text("ARRAY[]::uuid[]"),
    )

    # Segment filters (JSONB query)
    segment_filters = Column(
        JSONB,
        nullable=False,
        default={},
        server_default=text("'{}'::jsonb"),
    )

    # Sending Configuration
    # Messages per hour (rate limiting)
    messages_per_hour = Column(Integer, default=100, server_default="100")

    # Delay between messages (seconds)
    delay_between_messages_seconds = Column(Integer, default=2, server_default="2")

    # Respect opt-out
    respect_opt_out = Column(
        Boolean, default=True, server_default="true", nullable=False
    )

    # Skip contacts with active conversations
    skip_active_conversations = Column(
        Boolean, default=False, server_default="false", nullable=False
    )

    # Statistics
    total_recipients = Column(Integer, default=0, server_default="0")
    messages_sent = Column(Integer, default=0, server_default="0")
    messages_delivered = Column(Integer, default=0, server_default="0")
    messages_read = Column(Integer, default=0, server_default="0")
    messages_failed = Column(Integer, default=0, server_default="0")
    messages_pending = Column(Integer, default=0, server_default="0")

    # Engagement
    replies_count = Column(Integer, default=0, server_default="0")
    unique_replies_count = Column(Integer, default=0, server_default="0")
    opt_outs_count = Column(Integer, default=0, server_default="0")

    # Rates
    delivery_rate = Column(Float, nullable=True)  # percentage 0-100
    read_rate = Column(Float, nullable=True)  # percentage 0-100
    reply_rate = Column(Float, nullable=True)  # percentage 0-100

    # Cost tracking (if applicable)
    estimated_cost = Column(Float, nullable=True)
    actual_cost = Column(Float, nullable=True)

    # Error tracking
    error_count = Column(Integer, default=0, server_default="0")
    last_error_message = Column(Text, nullable=True)
    
    # Advanced retry tracking (NEW)
    errors = Column(
        JSONB,
        nullable=False,
        default=[],
        server_default=text("'[]'::jsonb"),
        comment='Array of retry attempt details'
    )
    
    message_statuses = Column(
        JSONB,
        nullable=False,
        default={},
        server_default=text("'{}'::jsonb"),
        comment='Status tracking per contact'
    )
    
    # Retry configuration (NEW)
    retry_max_attempts = Column(
        Integer,
        nullable=False,
        default=3,
        server_default="3",
        comment='Maximum retry attempts per failed message'
    )
    
    retry_base_delay = Column(
        Integer,
        nullable=False,
        default=60,
        server_default="60",
        comment='Base delay in seconds for exponential backoff'
    )
    
    retry_max_delay = Column(
        Integer,
        nullable=False,
        default=3600,
        server_default="3600",
        comment='Maximum delay in seconds for exponential backoff'
    )

    # Settings
    settings = Column(
        JSONB,
        nullable=False,
        default={},
        server_default=text("'{}'::jsonb"),
    )

    # Relationships
    organization = relationship("Organization", back_populates="campaigns")
    created_by_user = relationship("User", foreign_keys=[created_by_user_id])
    whatsapp_number = relationship("WhatsAppNumber")
    template = relationship("WhatsAppTemplate")
    # messages = relationship("CampaignMessage", back_populates="campaign", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Campaign(id={self.id}, name='{self.name}', status='{self.status}')>"

    @property
    def is_draft(self) -> bool:
        """Check if campaign is in draft"""
        return self.status == "draft"

    @property
    def is_scheduled(self) -> bool:
        """Check if campaign is scheduled"""
        return self.status == "scheduled"

    @property
    def is_running(self) -> bool:
        """Check if campaign is running"""
        return self.status == "running"

    @property
    def is_completed(self) -> bool:
        """Check if campaign is completed"""
        return self.status == "completed"

    @property
    def is_paused(self) -> bool:
        """Check if campaign is paused"""
        return self.status == "paused"

    @property
    def progress_percentage(self) -> float:
        """Calculate campaign progress percentage"""
        if self.total_recipients == 0:
            return 0.0
        sent = self.messages_sent + self.messages_failed
        return (sent / self.total_recipients) * 100

    @property
    def success_rate(self) -> float:
        """Calculate success rate (delivered / sent)"""
        if self.messages_sent == 0:
            return 0.0
        return (self.messages_delivered / self.messages_sent) * 100

    def start(self):
        """Start the campaign"""
        from datetime import datetime

        self.status = "running"
        self.started_at = datetime.utcnow()

    def pause(self):
        """Pause the campaign"""
        from datetime import datetime

        self.status = "paused"
        self.paused_at = datetime.utcnow()

    def resume(self):
        """Resume paused campaign"""
        self.status = "running"
        self.paused_at = None

    def complete(self):
        """Mark campaign as completed"""
        from datetime import datetime

        self.status = "completed"
        self.completed_at = datetime.utcnow()

        # Calculate final rates
        if self.messages_sent > 0:
            self.delivery_rate = (self.messages_delivered / self.messages_sent) * 100
            self.read_rate = (self.messages_read / self.messages_sent) * 100
            self.reply_rate = (self.replies_count / self.messages_sent) * 100

    def cancel(self):
        """Cancel the campaign"""
        from datetime import datetime

        self.status = "cancelled"
        self.cancelled_at = datetime.utcnow()


# Note: CampaignMessage could be a separate model to track individual messages
# For now, we'll track them in Message model with campaign_id reference
