"""
Chatbot, Flow, and Node schemas
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


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
    is_active: bool = False
    is_published: bool = False
    is_fallback: bool = Field(default=False, description="Is this a fallback flow?")
    whatsapp_number_ids: Optional[List[str]] = Field(
        None,
        description="List of WhatsApp numbers linked to this chatbot"
    )
    ab_test_enabled: bool = Field(default=False, description="Enable A/B testing?")
    ab_test_flows: Optional[List[dict]] = Field(
        None,
        description="A/B test configurations [{'flow_id': '...', 'weight': 60, 'variant_name': '...'}]"
    )
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
    is_active: Optional[bool] = None
    is_published: Optional[bool] = None
    is_fallback: Optional[bool] = Field(None, description="Is this a fallback flow?")
    whatsapp_number_ids: Optional[List[str]] = Field(
        None,
        description="List of WhatsApp numbers linked to this chatbot"
    )
    whatsapp_number_id: Optional[str] = Field(
        None,
        description="(Deprecated) Single WhatsApp number - will be converted to whatsapp_number_ids"
    )
    ab_test_enabled: Optional[bool] = Field(None, description="Enable A/B testing?")
    ab_test_flows: Optional[List[dict]] = Field(
        None,
        description="A/B test configurations"
    )
    global_variables: Optional[dict] = None
    settings: Optional[dict] = None

    @field_validator('whatsapp_number_ids', mode='before')
    @classmethod
    def normalize_whatsapp_numbers(cls, v, info):
        """
        Normalize whatsapp_number_ids:
        - If whatsapp_number_id (singular) is provided, convert to array
        - If whatsapp_number_ids (plural) is provided, use as-is
        """
        # Get the singular value if available
        singular = info.data.get('whatsapp_number_id')
        
        # If singular is provided, prioritize it
        if singular:
            return [singular]
        
        # Otherwise use the plural value as-is
        return v


class ChatbotInDB(ChatbotBase):
    """Schema for chatbot in database"""

    id: UUID
    organization_id: UUID
    total_conversations: int = 0
    total_messages_sent: int = 0
    total_messages_received: int = 0
    version: int = 1
    published_version: Optional[int] = None
    linked_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime] = None
    
    # Linked history (populated on demand)
    linked_history: Optional[List[dict]] = Field(None, description="History of linking/unlinking actions")

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


# ============================================
# CHATBOT NUMBER LINK SCHEMAS
# ============================================

class ChatbotNumberLinkBase(BaseModel):
    """Base schema for ChatbotNumberLink"""

    whatsapp_number_id: str = Field(..., min_length=1, max_length=50)


class ChatbotNumberLinkCreate(ChatbotNumberLinkBase):
    """Schema for creating a number link"""

    chatbot_id: UUID


class ChatbotNumberLinkInDB(ChatbotNumberLinkBase):
    """Schema for number link in database"""

    id: UUID
    chatbot_id: UUID
    organization_id: UUID
    linked_at: datetime
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================
# CHATBOT LINKING HISTORY SCHEMAS
# ============================================

class ChatbotLinkingHistoryBase(BaseModel):
    """Base schema for ChatbotLinkingHistory"""

    action: str = Field(..., description="'linked' or 'unlinked'")
    whatsapp_number_id: str = Field(..., min_length=1, max_length=50)
    changed_by: str = Field(..., description="Email of user who made the change")
    timestamp: datetime = Field(..., description="ISO 8601 timestamp")


class ChatbotLinkingHistoryCreate(ChatbotLinkingHistoryBase):
    """Schema for creating a linking history entry"""

    chatbot_id: UUID


class ChatbotLinkingHistoryInDB(ChatbotLinkingHistoryBase):
    """Schema for linking history in database"""

    id: UUID
    chatbot_id: UUID
    organization_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

