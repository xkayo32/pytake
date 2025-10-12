"""
WhatsApp Number and Template models
"""

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import text

from app.models.base import Base, SoftDeleteMixin, TimestampMixin


class WhatsAppNumber(Base, TimestampMixin, SoftDeleteMixin):
    """
    WhatsApp Number model - Organizations can have multiple WhatsApp numbers
    Each number has its own credentials and configuration
    """

    __tablename__ = "whatsapp_numbers"

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

    # Connection Type
    connection_type = Column(
        String(20), nullable=False, default="official", server_default="official"
    )  # official or qrcode

    # WhatsApp Info
    phone_number = Column(String(20), nullable=False, index=True)
    display_name = Column(String(255), nullable=True)
    about = Column(Text, nullable=True)
    profile_picture_url = Column(Text, nullable=True)

    # Meta Cloud API Credentials (Official)
    phone_number_id = Column(String(255), nullable=True)  # Meta's phone number ID
    whatsapp_business_account_id = Column(
        String(255), nullable=True
    )  # Meta's WABA ID
    access_token = Column(Text, nullable=True)  # Meta API access token
    app_secret = Column(Text, nullable=True)  # Meta App Secret for webhook signature verification
    webhook_verify_token = Column(String(255), nullable=True)

    # Evolution API Credentials (QR Code)
    evolution_instance_name = Column(String(255), nullable=True, unique=True)
    evolution_api_url = Column(Text, nullable=True)  # URL da Evolution API
    evolution_api_key = Column(Text, nullable=True)  # API Key global

    # Status
    is_active = Column(Boolean, default=True, server_default="true", nullable=False)
    is_verified = Column(
        Boolean, default=False, server_default="false", nullable=False
    )
    verified_at = Column(DateTime(timezone=True), nullable=True)

    # Meta Quality Rating
    quality_rating = Column(
        String(50), nullable=True
    )  # GREEN, YELLOW, RED, FLAGGED
    messaging_limit_tier = Column(
        String(50), nullable=True
    )  # TIER_50, TIER_250, TIER_1K, TIER_10K, TIER_100K, TIER_UNLIMITED

    # Configuration
    # Default chatbot to activate for new conversations
    default_chatbot_id = Column(
        UUID(as_uuid=True),
        ForeignKey("chatbots.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Department to route conversations
    default_department_id = Column(
        UUID(as_uuid=True),
        ForeignKey("departments.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Business hours (JSONB with schedule)
    business_hours = Column(
        JSONB,
        nullable=False,
        default={},
        server_default=text("'{}'::jsonb"),
    )

    # Auto-responses
    away_message = Column(Text, nullable=True)
    welcome_message = Column(Text, nullable=True)

    # Settings (flexible JSONB)
    settings = Column(
        JSONB,
        nullable=False,
        default={},
        server_default=text("'{}'::jsonb"),
    )

    # Webhooks
    webhook_url = Column(Text, nullable=True)  # Custom webhook for this number

    # Relationships
    organization = relationship("Organization", back_populates="whatsapp_numbers")
    templates = relationship("WhatsAppTemplate", back_populates="whatsapp_number", cascade="all, delete-orphan")
    conversations = relationship("Conversation", back_populates="whatsapp_number")
    messages = relationship("Message", back_populates="whatsapp_number")
    chatbots = relationship("Chatbot", back_populates="whatsapp_number", foreign_keys="Chatbot.whatsapp_number_id")

    def __repr__(self):
        return f"<WhatsAppNumber(id={self.id}, phone='{self.phone_number}', org_id={self.organization_id})>"

    @property
    def formatted_number(self) -> str:
        """Format phone number for display"""
        # Simple formatting, can be improved
        if self.phone_number.startswith("+"):
            return self.phone_number
        return f"+{self.phone_number}"

    @property
    def is_quality_good(self) -> bool:
        """Check if quality rating is good"""
        return self.quality_rating in ["GREEN", "YELLOW", None]


class WhatsAppTemplate(Base, TimestampMixin, SoftDeleteMixin):
    """
    WhatsApp Template model - Message templates approved by Meta
    Templates are required for sending messages outside 24-hour window
    """

    __tablename__ = "whatsapp_templates"

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

    whatsapp_number_id = Column(
        UUID(as_uuid=True),
        ForeignKey("whatsapp_numbers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Template Info
    name = Column(String(255), nullable=False, index=True)  # Template name (slug)
    language = Column(String(10), nullable=False, default="pt_BR")  # Language code
    category = Column(
        String(50), nullable=False
    )  # MARKETING, UTILITY, AUTHENTICATION

    # Meta's template ID
    meta_template_id = Column(String(255), nullable=True)

    # Status
    # DRAFT, PENDING, APPROVED, REJECTED, DISABLED, DELETED
    status = Column(
        String(50),
        nullable=False,
        default="DRAFT",
        server_default="DRAFT",
        index=True,
    )

    # Meta approval/rejection info
    rejected_reason = Column(Text, nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    rejected_at = Column(DateTime(timezone=True), nullable=True)

    # Template Content
    # Header (optional): TEXT, IMAGE, VIDEO, DOCUMENT
    header_type = Column(String(50), nullable=True)
    header_text = Column(Text, nullable=True)
    header_variables_count = Column(Integer, default=0, server_default="0")

    # Body (required)
    body_text = Column(Text, nullable=False)
    body_variables_count = Column(Integer, default=0, server_default="0")

    # Footer (optional)
    footer_text = Column(Text, nullable=True)

    # Buttons (optional)
    # Array of buttons: QUICK_REPLY, CALL_TO_ACTION (URL or PHONE)
    buttons = Column(
        JSONB,
        nullable=False,
        default=[],
        server_default=text("'[]'::jsonb"),
    )

    # Variables placeholders (for reference)
    # Example: ["{{1}}", "{{2}}"] for body variables
    variables = Column(
        JSONB,
        nullable=False,
        default=[],
        server_default=text("'[]'::jsonb"),
    )

    # Usage tracking
    sent_count = Column(Integer, default=0, server_default="0")
    delivered_count = Column(Integer, default=0, server_default="0")
    read_count = Column(Integer, default=0, server_default="0")
    failed_count = Column(Integer, default=0, server_default="0")

    # System flags
    is_system_template = Column(
        Boolean, default=False, server_default="false"
    )  # System templates cannot be deleted
    is_enabled = Column(
        Boolean, default=True, server_default="true"
    )  # Can be disabled by user

    # Relationships
    organization = relationship("Organization")
    whatsapp_number = relationship("WhatsAppNumber", back_populates="templates")

    def __repr__(self):
        return f"<WhatsAppTemplate(id={self.id}, name='{self.name}', status='{self.status}')>"

    @property
    def is_approved(self) -> bool:
        """Check if template is approved by Meta"""
        return self.status == "APPROVED"

    @property
    def can_be_used(self) -> bool:
        """Check if template can be used for sending messages"""
        return self.is_approved and self.is_enabled and not self.is_deleted

    @property
    def total_variables(self) -> int:
        """Total number of variables in template"""
        return self.header_variables_count + self.body_variables_count

    def get_preview_text(self, variables: dict = None) -> str:
        """
        Get preview of template with variables replaced
        Args:
            variables: Dict with variable values, e.g., {"1": "John", "2": "Product"}
        """
        text = self.body_text

        if variables:
            for key, value in variables.items():
                text = text.replace(f"{{{{{key}}}}}", str(value))

        return text
