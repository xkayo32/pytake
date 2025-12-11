"""
Chatbot, Flow, and Node schemas
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ============================================
# NODE SCHEMAS
# ============================================

class NodeBase(BaseModel):
    """Base schema for Node"""

    node_id: str = Field(..., description="React Flow node ID")
    node_type: str = Field(..., description="Node type: start, message, question, condition, action, etc.")
    label: Optional[str] = Field(None, max_length=255)
    position_x: int = Field(default=0)
    position_y: int = Field(default=0)
    data: dict = Field(default_factory=dict, description="Node configuration based on type")
    order: Optional[int] = None


class NodeCreate(NodeBase):
    """Schema for creating a node"""
    pass


class NodeUpdate(BaseModel):
    """Schema for updating a node"""

    node_id: Optional[str] = None
    node_type: Optional[str] = None
    label: Optional[str] = None
    position_x: Optional[int] = None
    position_y: Optional[int] = None
    data: Optional[dict] = None
    order: Optional[int] = None


class NodeInDB(NodeBase):
    """Schema for node in database"""

    id: UUID
    organization_id: UUID
    flow_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================
# FLOW SCHEMAS
# ============================================

class FlowBase(BaseModel):
    """Base schema for Flow"""

    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    is_main: bool = Field(default=False, description="Is this the main entry flow?")
    is_fallback: bool = Field(default=False, description="Is this a fallback flow?")
    canvas_data: dict = Field(default_factory=lambda: {"nodes": [], "edges": []})
    variables: dict = Field(default_factory=dict)
    is_active: bool = True


class FlowCreate(FlowBase):
    """Schema for creating a flow"""
    chatbot_id: UUID


class FlowUpdate(BaseModel):
    """Schema for updating a flow"""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    is_main: Optional[bool] = None
    is_fallback: Optional[bool] = None
    canvas_data: Optional[dict] = None
    variables: Optional[dict] = None
    is_active: Optional[bool] = None


class FlowInDB(FlowBase):
    """Schema for flow in database"""

    id: UUID
    organization_id: UUID
    chatbot_id: UUID
    version: int
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class FlowWithNodes(FlowInDB):
    """Flow with nodes included"""

    nodes: List[NodeInDB] = []


# ============================================
# CHATBOT SCHEMAS
# ============================================

class ChatbotBase(BaseModel):
    """Base schema for Chatbot"""

    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    avatar_url: Optional[str] = None
    whatsapp_number_id: Optional[UUID] = Field(None, description="WhatsApp number linked to this chatbot")
    is_active: bool = False
    is_published: bool = False
    global_variables: dict = Field(default_factory=dict)
    settings: dict = Field(default_factory=dict)


class ChatbotCreate(ChatbotBase):
    """Schema for creating a chatbot"""
    pass


class ChatbotUpdate(BaseModel):
    """Schema for updating a chatbot"""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    avatar_url: Optional[str] = None
    whatsapp_number_id: Optional[UUID] = None
    is_active: Optional[bool] = None
    is_published: Optional[bool] = None
    global_variables: Optional[dict] = None
    settings: Optional[dict] = None


class ChatbotInDB(ChatbotBase):
    """Schema for chatbot in database"""

    id: UUID
    organization_id: UUID
    total_conversations: int = 0
    total_messages_sent: int = 0
    total_messages_received: int = 0
    version: int = 1
    published_version: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime] = None
    
    # WhatsApp connection info (populated by endpoint logic)
    whatsapp_connection_type: Optional[str] = Field(None, description="Connection type: official, qrcode, etc")
    whatsapp_phone_number: Optional[str] = Field(None, description="Phone number of linked WhatsApp")
    available_node_types: Optional[List[str]] = Field(None, description="Available node types for this chatbot")

    class Config:
        from_attributes = True


class ChatbotWithFlows(ChatbotInDB):
    """Chatbot with flows included"""

    flows: List[FlowInDB] = []


class ChatbotStats(BaseModel):
    """Chatbot statistics"""

    total_conversations: int
    total_messages_sent: int
    total_messages_received: int
    total_flows: int
    total_nodes: int
    is_active: bool
    is_published: bool


# ============================================
# RESPONSE SCHEMAS
# ============================================

class ChatbotListResponse(BaseModel):
    """Response for chatbot list"""

    total: int
    items: List[ChatbotInDB]


class FlowListResponse(BaseModel):
    """Response for flow list"""

    total: int
    items: List[FlowInDB]


class NodeListResponse(BaseModel):
    """Response for node list"""

    total: int
    items: List[NodeInDB]
