"""
Chatbot, Flow, and Node models for the bot builder
"""

from datetime import datetime
from uuid import uuid4

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import text

from app.models.base import Base, SoftDeleteMixin, TimestampMixin


class Chatbot(Base, TimestampMixin, SoftDeleteMixin):
    """
    Chatbot model - Container for bot flows and configuration
    """

    __tablename__ = "chatbots"

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

    # Basic Info
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    avatar_url = Column(Text, nullable=True)

    # Status
    is_active = Column(Boolean, default=False, server_default="false", nullable=False)
    is_published = Column(
        Boolean, default=False, server_default="false", nullable=False
    )

    # Multi-binding Configuration
    # Fallback flow: usado como rota padrão para números não mapeados
    is_fallback = Column(Boolean, default=False, server_default="false", nullable=False)
    
    # Quando foi vinculado pela última vez
    linked_at = Column(DateTime(timezone=True), nullable=True)

    # A/B Testing Configuration
    ab_test_enabled = Column(Boolean, default=False, server_default="false", nullable=False)
    
    # Array de {flow_id, weight, variant_name}
    ab_test_flows = Column(
        JSONB,
        nullable=False,
        default=[],
        server_default=text("'[]'::jsonb"),
    )

    # Configuration
    # Global variables available to all flows
    global_variables = Column(
        JSONB,
        nullable=False,
        default={},
        server_default=text("'{}'::jsonb"),
    )

    # Settings (fallback messages, timeout, etc.)
    settings = Column(
        JSONB,
        nullable=False,
        default={},
        server_default=text("'{}'::jsonb"),
    )

    # Statistics
    total_conversations = Column(Integer, default=0, server_default="0")
    total_messages_sent = Column(Integer, default=0, server_default="0")
    total_messages_received = Column(Integer, default=0, server_default="0")

    # Versioning
    version = Column(Integer, default=1, server_default="1", nullable=False)
    published_version = Column(Integer, nullable=True)

    # Relationships
    organization = relationship("Organization", back_populates="chatbots")
    flows = relationship(
        "Flow", back_populates="chatbot", cascade="all, delete-orphan"
    )
    
    # Multi-binding relationships
    number_links = relationship(
        "ChatbotNumberLink",
        back_populates="chatbot",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    
    linking_history = relationship(
        "ChatbotLinkingHistory",
        back_populates="chatbot",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    # Constraints: apenas um fallback por organização
    __table_args__ = (
        Index(
            "ix_chatbots_org_fallback_unique",
            "organization_id",
            postgresql_where=text("is_fallback = true AND deleted_at IS NULL"),
            unique=True,
        ),
    )

    def __repr__(self):
        return f"<Chatbot(id={self.id}, name='{self.name}', active={self.is_active})>"

    @property
    def main_flow(self):
        """Get the main (entry) flow"""
        return next((f for f in self.flows if f.is_main), None)


class Flow(Base, TimestampMixin, SoftDeleteMixin):
    """
    Flow model - Conversation flow within a chatbot
    Contains nodes and edges (graph structure)
    """

    __tablename__ = "flows"

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

    chatbot_id = Column(
        UUID(as_uuid=True),
        ForeignKey("chatbots.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Basic Info
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    # Flow Type
    is_main = Column(
        Boolean, default=False, server_default="false", nullable=False
    )  # Main entry flow
    is_fallback = Column(
        Boolean, default=False, server_default="false", nullable=False
    )  # Fallback flow for errors

    # Canvas Data (React Flow format)
    # Stores nodes, edges, and viewport state
    canvas_data = Column(
        JSONB,
        nullable=False,
        default={"nodes": [], "edges": []},
        server_default=text("'{\"nodes\": [], \"edges\": []}'::jsonb"),
    )

    # Flow Variables (scoped to this flow)
    variables = Column(
        JSONB,
        nullable=False,
        default={},
        server_default=text("'{}'::jsonb"),
    )

    # Status
    is_active = Column(Boolean, default=True, server_default="true", nullable=False)

    # Inactivity Settings (can override global defaults)
    # Structure: {
    #   "enabled": true,
    #   "timeout_minutes": 60,
    #   "send_warning_at_minutes": null,
    #   "warning_message": null,
    #   "action": "transfer|close|send_reminder|fallback_flow",
    #   "fallback_flow_id": null
    # }
    inactivity_settings = Column(
        JSONB,
        nullable=False,
        default={
            "enabled": True,
            "timeout_minutes": 60,
            "send_warning_at_minutes": None,
            "warning_message": None,
            "action": "transfer",
            "fallback_flow_id": None,
        },
        server_default=text(
            "'{\"enabled\": true, \"timeout_minutes\": 60, \"action\": \"transfer\", \"send_warning_at_minutes\": null, \"warning_message\": null, \"fallback_flow_id\": null}'::jsonb"
        ),
    )

    # WhatsApp 24h Window Expiry Settings
    # Configuração do que fazer quando janela de 24h do WhatsApp expirar
    # {
    #   "action": "transfer|send_template|wait_customer",
    #   "template_name": null,
    #   "send_warning": false,
    #   "warning_at_hours": 22,
    #   "warning_template_name": null
    # }
    window_expiry_settings = Column(
        JSONB,
        nullable=True,
        default=None,
        server_default=None,
    )

    # Versioning
    version = Column(Integer, default=1, server_default="1", nullable=False)

    # Relationships
    organization = relationship("Organization")
    chatbot = relationship("Chatbot", back_populates="flows")
    nodes = relationship("Node", back_populates="flow", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Flow(id={self.id}, name='{self.name}', chatbot_id={self.chatbot_id})>"

    @property
    def start_node(self):
        """Get the start node of the flow"""
        return next((n for n in self.nodes if n.node_type == "start"), None)

    @property
    def total_nodes(self) -> int:
        """Total number of nodes in flow"""
        return len(self.nodes)


class Node(Base, TimestampMixin):
    """
    Node model - Individual node in a flow
    Stores node configuration and data
    """

    __tablename__ = "nodes"

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

    flow_id = Column(
        UUID(as_uuid=True),
        ForeignKey("flows.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Node Info
    # React Flow node ID (for frontend sync)
    node_id = Column(String(255), nullable=False, index=True)

    # Node Type: start, message, question, condition, action, api_call, ai_prompt, jump, end, handoff
    node_type = Column(String(50), nullable=False, index=True)

    # Position on canvas
    position_x = Column(Integer, default=0, server_default="0")
    position_y = Column(Integer, default=0, server_default="0")

    # Node Configuration (flexible JSONB based on node_type)
    # For message node: {content: {text: "...", buttons: [...]}}
    # For question node: {question: "...", variable: "name", validation: {...}}
    # For condition node: {variable: "x", operator: "==", value: "y", branches: {...}}
    # For api_call node: {url: "...", method: "POST", headers: {...}, body: {...}}
    # For ai_prompt node: {provider: "openai", model: "gpt-4", prompt: "...", temperature: 0.7}
    data = Column(
        JSONB,
        nullable=False,
        default={},
        server_default=text("'{}'::jsonb"),
    )

    # Label/Name
    label = Column(String(255), nullable=True)

    # Execution order (optional, for optimization)
    order = Column(Integer, nullable=True)

    # Relationships
    organization = relationship("Organization")
    flow = relationship("Flow", back_populates="nodes")

    def __repr__(self):
        return f"<Node(id={self.id}, type='{self.node_type}', flow_id={self.flow_id})>"

    @property
    def is_start_node(self) -> bool:
        """Check if this is a start node"""
        return self.node_type == "start"

    @property
    def is_end_node(self) -> bool:
        """Check if this is an end node"""
        return self.node_type == "end"

    @property
    def is_decision_node(self) -> bool:
        """Check if this node makes decisions (condition, question)"""
        return self.node_type in ["condition", "question"]


class ChatbotNumberLink(Base, TimestampMixin):
    """
    ChatbotNumberLink model - N:N relationship between Chatbot and WhatsApp Numbers
    Permite que um chatbot seja vinculado a múltiplos números
    """

    __tablename__ = "chatbot_number_links"

    # Primary Key
    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
        server_default=text("gen_random_uuid()"),
    )

    # Foreign Keys
    chatbot_id = Column(
        UUID(as_uuid=True),
        ForeignKey("chatbots.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    organization_id = Column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # WhatsApp Number ID (string, não UUID)
    whatsapp_number_id = Column(String(50), nullable=False, index=True)

    # When it was linked
    linked_at = Column(DateTime(timezone=True), nullable=False)

    # Relationships
    chatbot = relationship(
        "Chatbot",
        back_populates="number_links",
        foreign_keys=[chatbot_id],
    )

    # Constraints: unique pair
    __table_args__ = (
        UniqueConstraint(
            "chatbot_id",
            "whatsapp_number_id",
            name="uq_chatbot_number_link",
        ),
        Index(
            "ix_chatbot_number_links_org_number",
            "organization_id",
            "whatsapp_number_id",
        ),
    )

    def __repr__(self) -> str:
        return f"<ChatbotNumberLink(chatbot_id={self.chatbot_id}, number_id={self.whatsapp_number_id})>"


class ChatbotLinkingHistory(Base, TimestampMixin):
    """
    ChatbotLinkingHistory model - Auditoria de vinculações
    Registra todas as ações de linked/unlinked com timestamp e usuário
    """

    __tablename__ = "chatbot_linking_history"

    # Primary Key
    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
        server_default=text("gen_random_uuid()"),
    )

    # Foreign Keys
    chatbot_id = Column(
        UUID(as_uuid=True),
        ForeignKey("chatbots.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    organization_id = Column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Action timestamp (ISO 8601)
    timestamp = Column(DateTime(timezone=True), nullable=False)

    # Action: 'linked' ou 'unlinked'
    action = Column(String(20), nullable=False)

    # WhatsApp Number ID affected
    whatsapp_number_id = Column(String(50), nullable=False)

    # User email who made the change
    changed_by = Column(String(255), nullable=False)

    # Relationships
    chatbot = relationship(
        "Chatbot",
        back_populates="linking_history",
        foreign_keys=[chatbot_id],
    )

    # Constraints and indexes
    __table_args__ = (
        Index(
            "ix_chatbot_linking_history_chatbot_timestamp",
            "chatbot_id",
            timestamp.desc(),
        ),
    )

    def __repr__(self) -> str:
        return f"<ChatbotLinkingHistory(chatbot_id={self.chatbot_id}, action={self.action}, number_id={self.whatsapp_number_id})>"

