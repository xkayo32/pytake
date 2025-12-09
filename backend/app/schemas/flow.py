"""
Flow schemas for Flow Builder
"""

from datetime import datetime
from typing import Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class FlowNodeData(BaseModel):
    """React Flow node data"""
    id: str = Field(..., description="Node ID")
    type: str = Field(..., description="Node type (message, action, etc)")
    data: Dict = Field(default_factory=dict, description="Node data")
    position: Dict = Field(default_factory=dict, description="Node position {x, y}")


class FlowEdgeData(BaseModel):
    """React Flow edge data"""
    id: str = Field(..., description="Edge ID")
    source: str = Field(..., description="Source node ID")
    target: str = Field(..., description="Target node ID")
    data: Optional[Dict] = Field(default_factory=dict, description="Edge data")


class CanvasData(BaseModel):
    """Flow canvas data (React Flow format)"""
    nodes: List[FlowNodeData] = Field(default_factory=list, description="Canvas nodes")
    edges: List[FlowEdgeData] = Field(default_factory=list, description="Canvas edges")
    viewport: Optional[Dict] = Field(default_factory=dict, description="Viewport state")


class FlowBase(BaseModel):
    """Base Flow schema"""
    name: str = Field(..., min_length=1, max_length=255, description="Flow name")
    description: Optional[str] = Field(None, description="Flow description")
    is_main: Optional[bool] = Field(False, description="Is main entry flow")
    is_fallback: Optional[bool] = Field(False, description="Is fallback flow for errors")


class FlowCreate(FlowBase):
    """Schema for creating a flow"""
    chatbot_id: UUID = Field(..., description="Chatbot ID this flow belongs to")
    canvas_data: Optional[CanvasData] = Field(
        default_factory=CanvasData,
        description="Canvas data (React Flow format)"
    )


class FlowUpdate(BaseModel):
    """Schema for updating a flow"""
    name: Optional[str] = Field(None, min_length=1, max_length=255, description="Flow name")
    description: Optional[str] = Field(None, description="Flow description")
    is_main: Optional[bool] = Field(None, description="Is main entry flow")
    is_fallback: Optional[bool] = Field(None, description="Is fallback flow for errors")
    canvas_data: Optional[CanvasData] = Field(None, description="Canvas data (React Flow format)")


class FlowInDB(FlowBase):
    """Flow model from database"""
    id: UUID
    organization_id: UUID
    chatbot_id: UUID
    canvas_data: CanvasData = Field(default_factory=CanvasData, description="Canvas data")
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class Flow(FlowInDB):
    """Public Flow schema"""
    pass


class FlowList(BaseModel):
    """Flow list response"""
    flows: List[Flow]
    total: int = Field(..., description="Total count")
    page: int = Field(..., description="Current page")
    per_page: int = Field(..., description="Items per page")
