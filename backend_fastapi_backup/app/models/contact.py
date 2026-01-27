"""
Contact and Tag models for CRM
"""

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Table,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import text

from app.models.base import Base, SoftDeleteMixin, TimestampMixin

# Many-to-many relationship table for contacts and tags
contact_tags = Table(
    "contact_tags",
    Base.metadata,
    Column(
        "contact_id",
        UUID(as_uuid=True),
        ForeignKey("contacts.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "tag_id",
        UUID(as_uuid=True),
        ForeignKey("tags.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


class Contact(Base, TimestampMixin, SoftDeleteMixin):
    """
    Contact model - Represents a person/lead in the CRM
    """

    __tablename__ = "contacts"

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

    # WhatsApp Info (unique identifier)
    whatsapp_id = Column(String(20), nullable=False, index=True)  # Phone number
    whatsapp_name = Column(String(255), nullable=True)  # Name from WhatsApp profile

    # Basic Info
    name = Column(String(255), nullable=True, index=True)
    email = Column(String(255), nullable=True, index=True)
    phone_number = Column(String(20), nullable=True)  # Alternative phone
    avatar_url = Column(Text, nullable=True)

    # Additional Info
    company = Column(String(255), nullable=True)
    job_title = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)

    # Address
    address_street = Column(String(255), nullable=True)
    address_city = Column(String(100), nullable=True)
    address_state = Column(String(100), nullable=True)
    address_country = Column(String(100), nullable=True)
    address_zipcode = Column(String(20), nullable=True)

    # Custom Attributes (flexible JSONB for any custom fields)
    # Example: {"birthdate": "1990-01-01", "customer_id": "12345", "preferences": {...}}
    attributes = Column(
        JSONB,
        nullable=False,
        default={},
        server_default=text("'{}'::jsonb"),
    )

    # Segmentation & Scoring
    # Lead source: organic, campaign, chatbot, import, api, etc.
    source = Column(String(100), nullable=True, index=True)
    lead_score = Column(Integer, default=0, server_default="0")

    # Status
    # Lifecycle stage: lead, customer, vip, churned, etc.
    lifecycle_stage = Column(String(50), nullable=True, index=True)

    # Opt-in for marketing messages
    opt_in = Column(Boolean, default=True, server_default="true", nullable=False)
    opt_in_date = Column(DateTime(timezone=True), nullable=True)
    opt_out_date = Column(DateTime(timezone=True), nullable=True)

    # Blocking
    is_blocked = Column(Boolean, default=False, server_default="false", nullable=False)
    blocked_at = Column(DateTime(timezone=True), nullable=True)
    blocked_reason = Column(Text, nullable=True)

    # VIP Status
    is_vip = Column(Boolean, default=False, server_default="false", nullable=False, index=True)

    # Activity Tracking
    last_message_at = Column(DateTime(timezone=True), nullable=True, index=True)
    last_message_received_at = Column(DateTime(timezone=True), nullable=True)
    last_message_sent_at = Column(DateTime(timezone=True), nullable=True)

    # Message counts
    total_messages_sent = Column(Integer, default=0, server_default="0")
    total_messages_received = Column(Integer, default=0, server_default="0")
    total_conversations = Column(Integer, default=0, server_default="0")

    # Engagement metrics
    average_response_time_seconds = Column(Integer, nullable=True)
    last_engagement_score = Column(Integer, default=0, server_default="0")

    # Assigned agent/department
    assigned_agent_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    assigned_department_id = Column(
        UUID(as_uuid=True),
        ForeignKey("departments.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Table constraints
    __table_args__ = (
        UniqueConstraint('organization_id', 'whatsapp_id', name='uq_contacts_organization_whatsapp_id'),
    )

    # Relationships
    organization = relationship("Organization", back_populates="contacts")
    tags = relationship("Tag", secondary=contact_tags, back_populates="contacts")
    assigned_agent = relationship("User", foreign_keys=[assigned_agent_id])
    assigned_department = relationship("Department")
    conversations = relationship("Conversation", back_populates="contact", cascade="all, delete-orphan")
    # campaigns_sent = relationship("CampaignMessage", back_populates="contact")

    def __repr__(self):
        return f"<Contact(id={self.id}, name='{self.name}', whatsapp='{self.whatsapp_id}')>"

    @property
    def display_name(self) -> str:
        """Get display name (prefers custom name, fallback to WhatsApp name or phone)"""
        return self.name or self.whatsapp_name or self.whatsapp_id

    @property
    def is_active(self) -> bool:
        """Check if contact is active (not blocked, has opt-in)"""
        return not self.is_blocked and self.opt_in and not self.is_deleted

    @property
    def can_receive_marketing(self) -> bool:
        """Check if contact can receive marketing messages"""
        return self.opt_in and not self.is_blocked and not self.is_deleted

    def block(self, reason: str = None):
        """Block the contact"""
        from datetime import datetime

        self.is_blocked = True
        self.blocked_at = datetime.utcnow()
        self.blocked_reason = reason

    def unblock(self):
        """Unblock the contact"""
        self.is_blocked = False
        self.blocked_at = None
        self.blocked_reason = None

    def opt_out(self):
        """Opt out from marketing messages"""
        from datetime import datetime

        self.opt_in = False
        self.opt_out_date = datetime.utcnow()

    def opt_in_marketing(self):
        """Opt in to marketing messages"""
        from datetime import datetime

        self.opt_in = True
        self.opt_in_date = datetime.utcnow()
        self.opt_out_date = None


class Tag(Base, TimestampMixin):
    """
    Tag model - Labels for organizing and segmenting contacts
    """

    __tablename__ = "tags"

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

    # Tag Info
    name = Column(String(100), nullable=False, index=True)
    slug = Column(String(100), nullable=False, index=True)  # URL-friendly name
    description = Column(Text, nullable=True)

    # Color for UI
    color = Column(String(7), default="#3B82F6", server_default="#3B82F6")  # Hex color

    # System tag (cannot be deleted)
    is_system = Column(Boolean, default=False, server_default="false", nullable=False)

    # Usage count (updated periodically)
    contacts_count = Column(Integer, default=0, server_default="0")

    # Relationships
    organization = relationship("Organization")
    contacts = relationship("Contact", secondary=contact_tags, back_populates="tags")

    def __repr__(self):
        return f"<Tag(id={self.id}, name='{self.name}', org_id={self.organization_id})>"
