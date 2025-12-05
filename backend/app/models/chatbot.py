"""
Chatbot, Flow, and Node models for the bot builder
"""

from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import text

from app.models.base import Base, SoftDeleteMixin, TimestampMixin, JSONBCompatible


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

    # WhatsApp Number Association (optional)
    # Each chatbot can be linked to a specific WhatsApp number
    whatsapp_number_id = Column(
        UUID(as_uuid=True),
        ForeignKey("whatsapp_numbers.id", ondelete="SET NULL"),
        nullable=True,
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

    # Configuration
    # Global variables available to all flows
    global_variables = Column(
        JSONBCompatible,
        nullable=False,
        default={},
        server_default=text("'{}'::jsonb"),
    )

    # Settings (fallback messages, timeout, etc.)
    settings = Column(
        JSONBCompatible,
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
    whatsapp_number = relationship(
        "WhatsAppNumber",
        foreign_keys=[whatsapp_number_id],
        back_populates="chatbots"
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
        JSONBCompatible,
        nullable=False,
        default={"nodes": [], "edges": []},
        server_default=text("'{\"nodes\": [], \"edges\": []}'::jsonb"),
    )

    # Flow Variables (scoped to this flow)
    variables = Column(
        JSONBCompatible,
        nullable=False,
        default={},
        server_default=text("'{}'::jsonb"),
    )

    # Status
    is_active = Column(Boolean, default=True, server_default="true", nullable=False)

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
        JSONBCompatible,
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
