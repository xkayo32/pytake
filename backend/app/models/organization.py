"""
Organization model - Multi-tenancy core
"""

from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import text

from app.models.base import Base, SoftDeleteMixin, TimestampMixin, JSONBCompatible


class Organization(Base, TimestampMixin, SoftDeleteMixin):
    """
    Organization model for multi-tenancy.
    Each organization is a separate tenant with isolated data.
    """

    __tablename__ = "organizations"

    # Primary Key
    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )

    # Basic Info
    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    logo_url = Column(Text, nullable=True)

    # WhatsApp Business Info (DEPRECATED - use whatsapp_numbers table)
    whatsapp_business_id = Column(String(255), nullable=True)
    whatsapp_webhook_verify_token = Column(String(255), nullable=True)

    # Subscription & Plan
    plan_type = Column(
        String(50),
        nullable=False,
        default="free",
        server_default="free",
        index=True,
    )
    plan_starts_at = Column(DateTime(timezone=True), nullable=True)
    plan_expires_at = Column(DateTime(timezone=True), nullable=True)

    # Plan Limits (overrides default from settings)
    max_chatbots = Column(Integer, nullable=True)
    max_whatsapp_numbers = Column(Integer, nullable=True)
    max_contacts = Column(Integer, nullable=True)
    max_agents = Column(Integer, nullable=True)
    max_departments = Column(Integer, nullable=True)
    monthly_message_limit = Column(Integer, nullable=True)

    # Usage Tracking (updated periodically by Celery tasks)
    current_chatbots_count = Column(Integer, default=0, server_default="0")
    current_whatsapp_numbers_count = Column(Integer, default=0, server_default="0")
    current_contacts_count = Column(Integer, default=0, server_default="0")
    current_agents_count = Column(Integer, default=0, server_default="0")
    current_month_messages_sent = Column(Integer, default=0, server_default="0")
    current_month_messages_received = Column(Integer, default=0, server_default="0")

    # Settings (flexible JSONBCompatible for org-specific configs)
    settings = Column(
        JSONBCompatible,
        nullable=False,
        default={},
        server_default=text("'{}'::jsonb"),
    )

    # Status
    is_active = Column(Boolean, default=True, server_default="true", nullable=False)
    is_trial = Column(Boolean, default=True, server_default="true", nullable=False)
    trial_ends_at = Column(DateTime(timezone=True), nullable=True)

    # Billing
    stripe_customer_id = Column(String(255), nullable=True, unique=True)
    stripe_subscription_id = Column(String(255), nullable=True)

    # Relationships
    users = relationship("User", back_populates="organization", cascade="all, delete-orphan")
    whatsapp_numbers = relationship("WhatsAppNumber", back_populates="organization", cascade="all, delete-orphan")
    chatbots = relationship("Chatbot", back_populates="organization", cascade="all, delete-orphan")
    contacts = relationship("Contact", back_populates="organization", cascade="all, delete-orphan")
    conversations = relationship("Conversation", back_populates="organization", cascade="all, delete-orphan")
    campaigns = relationship("Campaign", back_populates="organization", cascade="all, delete-orphan")
    departments = relationship("Department", back_populates="organization", cascade="all, delete-orphan")
    queues = relationship("Queue", back_populates="organization", cascade="all, delete-orphan")
    custom_ai_models = relationship("AICustomModel", back_populates="organization", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Organization(id={self.id}, name='{self.name}', slug='{self.slug}')>"

    @property
    def is_plan_active(self) -> bool:
        """Check if plan is currently active"""
        if not self.is_active:
            return False
        if self.plan_expires_at:
            from datetime import datetime

            return datetime.utcnow() < self.plan_expires_at
        return True

    @property
    def is_within_limits(self) -> bool:
        """Check if organization is within plan limits"""
        from app.core.config import settings

        # Get limits based on plan
        limits = self._get_plan_limits()

        return (
            self.current_chatbots_count <= limits["chatbots"]
            and self.current_whatsapp_numbers_count <= limits["whatsapp_numbers"]
            and self.current_contacts_count <= limits["contacts"]
            and self.current_agents_count <= limits["agents"]
            and self.current_month_messages_sent <= limits["monthly_messages"]
        )

    def _get_plan_limits(self) -> dict:
        """Get plan limits based on plan_type"""
        from app.core.config import settings

        # Use custom limits if set, otherwise use defaults from settings
        if self.plan_type == "free":
            return {
                "chatbots": self.max_chatbots or settings.FREE_PLAN_CHATBOTS,
                "whatsapp_numbers": self.max_whatsapp_numbers
                or settings.FREE_PLAN_WHATSAPP_NUMBERS,
                "contacts": self.max_contacts or settings.FREE_PLAN_CONTACTS,
                "agents": self.max_agents or settings.FREE_PLAN_AGENTS,
                "departments": self.max_departments or settings.FREE_PLAN_DEPARTMENTS,
                "monthly_messages": self.monthly_message_limit
                or settings.FREE_PLAN_MONTHLY_MESSAGES,
            }
        elif self.plan_type == "starter":
            return {
                "chatbots": self.max_chatbots or settings.STARTER_PLAN_CHATBOTS,
                "whatsapp_numbers": self.max_whatsapp_numbers
                or settings.STARTER_PLAN_WHATSAPP_NUMBERS,
                "contacts": self.max_contacts or settings.STARTER_PLAN_CONTACTS,
                "agents": self.max_agents or settings.STARTER_PLAN_AGENTS,
                "departments": self.max_departments
                or settings.STARTER_PLAN_DEPARTMENTS,
                "monthly_messages": self.monthly_message_limit
                or settings.STARTER_PLAN_MONTHLY_MESSAGES,
            }
        else:  # professional, enterprise (unlimited)
            return {
                "chatbots": self.max_chatbots or 999999,
                "whatsapp_numbers": self.max_whatsapp_numbers or 999999,
                "contacts": self.max_contacts or 999999,
                "agents": self.max_agents or 999999,
                "departments": self.max_departments or 999999,
                "monthly_messages": self.monthly_message_limit or 999999,
            }

    def can_add_chatbot(self) -> bool:
        """Check if can add another chatbot"""
        limits = self._get_plan_limits()
        return self.current_chatbots_count < limits["chatbots"]

    def can_add_whatsapp_number(self) -> bool:
        """Check if can add another WhatsApp number"""
        limits = self._get_plan_limits()
        return self.current_whatsapp_numbers_count < limits["whatsapp_numbers"]

    def can_add_contact(self) -> bool:
        """Check if can add another contact"""
        limits = self._get_plan_limits()
        return self.current_contacts_count < limits["contacts"]

    def can_send_message(self) -> bool:
        """Check if can send another message this month"""
        limits = self._get_plan_limits()
        return self.current_month_messages_sent < limits["monthly_messages"]
