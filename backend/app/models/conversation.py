"""
Conversation and Message models for chat/inbox
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
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship, synonym, column_property
from sqlalchemy.sql import text

from app.models.base import Base, SoftDeleteMixin, TimestampMixin


class Conversation(Base, TimestampMixin, SoftDeleteMixin):
    """
    Conversation model - Represents a chat conversation with a contact
    """

    __tablename__ = "conversations"

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

    contact_id = Column(
        UUID(as_uuid=True),
        ForeignKey("contacts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    whatsapp_number_id = Column(
        UUID(as_uuid=True),
        ForeignKey("whatsapp_numbers.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Agent Assignment
    current_agent_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Backwards compatibility: older code references assigned_agent_id
    # We'll expose it as a synonym to avoid mapping the same Column twice

    department_id = Column(
        UUID(as_uuid=True),
        ForeignKey("departments.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    queue_id = Column(
        UUID(as_uuid=True),
        ForeignKey("queues.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Chatbot
    active_chatbot_id = Column(
        UUID(as_uuid=True),
        ForeignKey("chatbots.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    active_flow_id = Column(
        UUID(as_uuid=True),
        ForeignKey("flows.id", ondelete="SET NULL"),
        nullable=True,
    )

    current_node_id = Column(
        UUID(as_uuid=True),
        ForeignKey("nodes.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Status
    # open, active, queued, closed, archived
    status = Column(
        String(50),
        nullable=False,
        default="open",
        server_default="open",
        index=True,
    )

    # Channel: whatsapp, instagram, facebook, telegram (future)
    channel = Column(
        String(50),
        nullable=False,
        default="whatsapp",
        server_default="whatsapp",
        index=True,
    )

    # Bot vs Human
    is_bot_active = Column(
        Boolean, default=True, server_default="true", nullable=False
    )  # Bot is handling conversation
    is_human_requested = Column(
        Boolean, default=False, server_default="false", nullable=False
    )  # Contact requested human
    handoff_at = Column(
        DateTime(timezone=True), nullable=True
    )  # When handed off to human

    # Queue Management
    queued_at = Column(DateTime(timezone=True), nullable=True, index=True)
    queue_position = Column(Integer, nullable=True)
    queue_priority = Column(
        Integer, default=0, server_default="0"
    )  # Higher = more priority

    # Timing
    first_message_at = Column(DateTime(timezone=True), nullable=True)
    last_message_at = Column(DateTime(timezone=True), nullable=True, index=True)
    last_message_from_contact_at = Column(DateTime(timezone=True), nullable=True)
    last_message_from_agent_at = Column(DateTime(timezone=True), nullable=True)
    closed_at = Column(DateTime(timezone=True), nullable=True)
    archived_at = Column(DateTime(timezone=True), nullable=True)

    # 24-hour window tracking (WhatsApp policy)
    # last_user_message_at: When customer last sent a message (triggers 24h window)
    # window_expires_at: When 24h window expires (last_user_message_at + 24h)
    last_inbound_message_at = Column(
        DateTime(timezone=True), nullable=True, index=True
    )
    last_user_message_at = Column(
        DateTime(timezone=True), nullable=True, index=True
    )  # Track last message FROM customer (for 24h window calculation)
    window_expires_at = Column(DateTime(timezone=True), nullable=True, index=True)

    # Metrics
    total_messages = Column(Integer, default=0, server_default="0")
    messages_from_contact = Column(Integer, default=0, server_default="0")
    messages_from_agent = Column(Integer, default=0, server_default="0")
    messages_from_bot = Column(Integer, default=0, server_default="0")

    # Response times (in seconds)
    first_response_time_seconds = Column(Integer, nullable=True)
    average_response_time_seconds = Column(Integer, nullable=True)

    # Duration
    duration_seconds = Column(Integer, nullable=True)  # Total conversation duration

    # Context Variables (from chatbot execution)
    # Stores variables collected during bot flow
    context_variables = Column(
        JSONB,
        nullable=False,
        default={},
        server_default=text("'{}'::jsonb"),
    )

    # Internal Notes (visible only to agents)
    internal_notes = Column(Text, nullable=True)

    # Rating/Feedback
    rating = Column(Integer, nullable=True)  # 1-5 stars
    rating_comment = Column(Text, nullable=True)
    rated_at = Column(DateTime(timezone=True), nullable=True)

    # Tags for categorization
    tags = Column(
        JSONB,
        nullable=False,
        default=[],
        server_default=text("'[]'::jsonb"),
    )

    # Extra Data
    extra_data = Column(
        JSONB,
        nullable=False,
        default={},
        server_default=text("'{}'::jsonb"),
    )

    # Relationships
    organization = relationship("Organization", back_populates="conversations")
    contact = relationship("Contact", back_populates="conversations")
    whatsapp_number = relationship("WhatsAppNumber", back_populates="conversations")
    current_agent = relationship("User", foreign_keys=[current_agent_id])
    # NOTE: older code referenced `assigned_agent_id` / `assigned_agent`.
    # We removed direct duplicate mappings to avoid SQLAlchemy SAWarnings.
    # Use `current_agent_id` and `current_agent` going forward.
    # Keep assigned_at timestamp (some services expect this column)
    assigned_at = Column(DateTime(timezone=True), nullable=True)
    department = relationship("Department")
    queue = relationship("Queue")
    active_chatbot = relationship("Chatbot")
    active_flow = relationship("Flow")
    current_node = relationship("Node")
    messages = relationship(
        "Message", back_populates="conversation", cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<Conversation(id={self.id}, contact_id={self.contact_id}, status='{self.status}')>"

    @property
    def is_open(self) -> bool:
        """Check if conversation is open"""
        return self.status == "open"

    @property
    def is_queued(self) -> bool:
        """Check if conversation is in queue"""
        return self.status == "queued"

    @property
    def is_active(self) -> bool:
        """Check if conversation is active (has agent)"""
        return self.status == "active"

    @property
    def is_closed(self) -> bool:
        """Check if conversation is closed"""
        return self.status == "closed"

    @property
    def has_agent(self) -> bool:
        """Check if conversation has assigned agent"""
        return self.current_agent_id is not None

    @property
    def is_within_24h_window(self) -> bool:
        """Check if conversation is within WhatsApp's 24-hour window"""
        if not self.window_expires_at:
            return False
        from datetime import datetime

        return datetime.utcnow() < self.window_expires_at
    
    @property
    def can_send_free_message(self) -> bool:
        """Check if free-form message can be sent (no template required)"""
        return self.is_within_24h_window
    
    @property
    def template_required(self) -> bool:
        """Check if template is required (outside 24h window)"""
        return not self.can_send_free_message

    def update_user_message_window(self):
        """Update 24h window when user sends a message"""
        from datetime import datetime, timedelta
        
        now = datetime.utcnow()
        self.last_user_message_at = now
        self.window_expires_at = now + timedelta(hours=24)
        self.last_inbound_message_at = now

    def assign_to_agent(self, agent_id: UUID, department_id: UUID = None):
        """Assign conversation to an agent"""
        from datetime import datetime

        self.current_agent_id = agent_id
        self.department_id = department_id
        self.status = "active"
        self.queued_at = None
        self.queue_position = None

    def add_to_queue(self, department_id: UUID = None, queue_id: UUID = None, priority: int = 0):
        """Add conversation to queue"""
        from datetime import datetime

        self.status = "queued"
        self.queued_at = datetime.utcnow()
        self.queue_priority = priority
        self.department_id = department_id
        self.queue_id = queue_id

    def close_conversation(self):
        """Close the conversation"""
        from datetime import datetime

        self.status = "closed"
        self.closed_at = datetime.utcnow()

    def reopen_conversation(self):
        """Reopen closed conversation"""
        self.status = "open"
        self.closed_at = None


class Message(Base, TimestampMixin, SoftDeleteMixin):
    """
    Message model - Individual message in a conversation
    """

    __tablename__ = "messages"

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

    conversation_id = Column(
        UUID(as_uuid=True),
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    whatsapp_number_id = Column(
        UUID(as_uuid=True),
        ForeignKey("whatsapp_numbers.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Sender
    # Direction: inbound (from contact), outbound (to contact)
    direction = Column(
        String(20), nullable=False, default="outbound", index=True
    )  # inbound, outbound

    # Source: contact, agent, bot, system, api
    sender_type = Column(String(50), nullable=False, index=True)

    # If sent by agent
    sender_user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # WhatsApp Message Info
    whatsapp_message_id = Column(String(255), nullable=True, unique=True, index=True)
    whatsapp_timestamp = Column(Integer, nullable=True)  # Unix timestamp from Meta

    # Message Type: text, image, video, audio, document, location, contact, interactive, template, sticker
    message_type = Column(String(50), nullable=False, default="text", index=True)

    # Content (flexible JSONB based on message_type)
    # For text: {text: "message content"}
    # For image: {image: {url: "...", caption: "..."}}
    # For interactive: {interactive: {type: "button", body: "...", buttons: [...]}}
    # For template: {template: {name: "...", language: "...", components: [...]}}
    content = Column(
        JSONB,
        nullable=False,
        default={},
        server_default=text("'{}'::jsonb"),
    )

    # Media (if applicable)
    media_url = Column(Text, nullable=True)
    media_mime_type = Column(String(100), nullable=True)
    media_filename = Column(String(255), nullable=True)
    media_size_bytes = Column(Integer, nullable=True)

    # Status (for outbound messages)
    # pending, sent, delivered, read, failed
    status = Column(
        String(50),
        nullable=False,
        default="pending",
        server_default="pending",
        index=True,
    )

    sent_at = Column(DateTime(timezone=True), nullable=True)
    delivered_at = Column(DateTime(timezone=True), nullable=True)
    read_at = Column(DateTime(timezone=True), nullable=True)
    failed_at = Column(DateTime(timezone=True), nullable=True)

    # Error info (if failed)
    error_code = Column(String(100), nullable=True)
    error_message = Column(Text, nullable=True)

    # Template info (if template message)
    template_id = Column(
        UUID(as_uuid=True),
        ForeignKey("whatsapp_templates.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Reply/Quote info
    reply_to_message_id = Column(
        UUID(as_uuid=True),
        ForeignKey("messages.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Internal message flag (not sent to WhatsApp, only visible to agents)
    is_internal_note = Column(
        Boolean, default=False, server_default="false", nullable=False
    )

    # Extra Data
    extra_data = Column(
        JSONB,
        nullable=False,
        default={},
        server_default=text("'{}'::jsonb"),
    )

    # Relationships
    organization = relationship("Organization")
    conversation = relationship("Conversation", back_populates="messages")
    whatsapp_number = relationship("WhatsAppNumber", back_populates="messages")
    sender_user = relationship("User", foreign_keys=[sender_user_id])
    template = relationship("WhatsAppTemplate")
    reply_to = relationship("Message", remote_side=[id])

    def __repr__(self):
        return f"<Message(id={self.id}, type='{self.message_type}', direction='{self.direction}')>"

    @property
    def is_inbound(self) -> bool:
        """Check if message is inbound (from contact)"""
        return self.direction == "inbound"

    @property
    def is_outbound(self) -> bool:
        """Check if message is outbound (to contact)"""
        return self.direction == "outbound"

    @property
    def is_from_contact(self) -> bool:
        """Check if message is from contact"""
        return self.sender_type == "contact"

    @property
    def is_from_agent(self) -> bool:
        """Check if message is from agent"""
        return self.sender_type == "agent"

    @property
    def is_from_bot(self) -> bool:
        """Check if message is from bot"""
        return self.sender_type == "bot"

    @property
    def is_delivered(self) -> bool:
        """Check if message was delivered"""
        return self.status in ["delivered", "read"]

    @property
    def is_read(self) -> bool:
        """Check if message was read"""
        return self.status == "read"

    @property
    def is_failed(self) -> bool:
        """Check if message failed"""
        return self.status == "failed"

    @property
    def text_content(self) -> str:
        """Extract text content from message"""
        if self.message_type == "text" and isinstance(self.content, dict):
            return self.content.get("text", "")
        return ""

    def mark_as_sent(self):
        """Mark message as sent"""
        from datetime import datetime

        self.status = "sent"
        self.sent_at = datetime.utcnow()

    def mark_as_delivered(self):
        """Mark message as delivered"""
        from datetime import datetime

        self.status = "delivered"
        self.delivered_at = datetime.utcnow()

    def mark_as_read(self):
        """Mark message as read"""
        from datetime import datetime

        self.status = "read"
        self.read_at = datetime.utcnow()

    def mark_as_failed(self, error_code: str = None, error_message: str = None):
        """Mark message as failed"""
        from datetime import datetime

        self.status = "failed"
        self.failed_at = datetime.utcnow()
        self.error_code = error_code
        self.error_message = error_message
