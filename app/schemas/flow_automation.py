"""
Flow Automation schemas
"""

from datetime import datetime, time
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ============================================
# FLOW AUTOMATION SCHEMAS
# ============================================

class FlowAutomationBase(BaseModel):
    """Base schema for FlowAutomation"""

    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    chatbot_id: UUID
    flow_id: UUID
    whatsapp_number_id: UUID
    trigger_type: str = Field(default="manual", description="manual, scheduled, cron, webhook, event")
    trigger_config: dict = Field(default_factory=dict)
    audience_type: str = Field(default="custom", description="all, segment, tags, custom, uploaded")
    audience_config: dict = Field(default_factory=dict)
    variable_mapping: dict = Field(default_factory=dict)
    max_concurrent_executions: int = Field(default=50, ge=1, le=500)
    rate_limit_per_hour: int = Field(default=100, ge=1, le=1000)
    retry_failed: bool = True
    max_retries: int = Field(default=3, ge=1, le=10)
    execution_window_start: Optional[time] = None
    execution_window_end: Optional[time] = None
    execution_timezone: str = Field(default="America/Sao_Paulo")


class FlowAutomationCreate(FlowAutomationBase):
    """Schema for creating a flow automation"""
    pass


class FlowAutomationUpdate(BaseModel):
    """Schema for updating a flow automation"""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    chatbot_id: Optional[UUID] = None
    flow_id: Optional[UUID] = None
    whatsapp_number_id: Optional[UUID] = None
    trigger_type: Optional[str] = None
    trigger_config: Optional[dict] = None
    audience_type: Optional[str] = None
    audience_config: Optional[dict] = None
    variable_mapping: Optional[dict] = None
    status: Optional[str] = None
    is_active: Optional[bool] = None
    max_concurrent_executions: Optional[int] = Field(None, ge=1, le=500)
    rate_limit_per_hour: Optional[int] = Field(None, ge=1, le=1000)
    retry_failed: Optional[bool] = None
    max_retries: Optional[int] = Field(None, ge=1, le=10)
    execution_window_start: Optional[time] = None
    execution_window_end: Optional[time] = None
    execution_timezone: Optional[str] = None


class FlowAutomationInDB(FlowAutomationBase):
    """Schema for flow automation in database"""

    id: UUID
    organization_id: UUID
    status: str = "draft"
    is_active: bool = False
    total_executions: int = 0
    total_sent: int = 0
    total_delivered: int = 0
    total_read: int = 0
    total_replied: int = 0
    total_completed: int = 0
    total_failed: int = 0
    last_executed_at: Optional[datetime] = None
    next_scheduled_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class FlowAutomationResponse(FlowAutomationInDB):
    """Schema for flow automation response with relationships"""

    # Relationships podem ser incluídas opcionalmente
    chatbot_name: Optional[str] = None
    flow_name: Optional[str] = None
    whatsapp_number_name: Optional[str] = None


class FlowAutomationList(BaseModel):
    """Schema for paginated list of flow automations"""

    items: List[FlowAutomationResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# ============================================
# FLOW AUTOMATION EXECUTION SCHEMAS
# ============================================

class FlowAutomationExecutionBase(BaseModel):
    """Base schema for FlowAutomationExecution"""

    execution_type: str = Field(..., description="manual, scheduled, trigger")
    triggered_by_event: Optional[str] = None


class FlowAutomationExecutionCreate(FlowAutomationExecutionBase):
    """Schema for creating a flow automation execution"""
    automation_id: UUID


class FlowAutomationExecutionInDB(FlowAutomationExecutionBase):
    """Schema for flow automation execution in database"""

    id: UUID
    automation_id: UUID
    organization_id: UUID
    triggered_by_user_id: Optional[UUID] = None
    status: str = "queued"
    total_recipients: int = 0
    messages_sent: int = 0
    messages_delivered: int = 0
    messages_read: int = 0
    messages_replied: int = 0
    messages_completed: int = 0
    messages_failed: int = 0
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    paused_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    error_message: Optional[str] = None
    errors: List[dict] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class FlowAutomationExecutionResponse(FlowAutomationExecutionInDB):
    """Schema for flow automation execution response"""

    # Adiciona nome da automação e outros dados úteis
    automation_name: Optional[str] = None
    triggered_by_user_name: Optional[str] = None

    # Estatísticas calculadas
    progress_percentage: Optional[float] = None
    estimated_completion_time: Optional[datetime] = None


class FlowAutomationExecutionList(BaseModel):
    """Schema for paginated list of executions"""

    items: List[FlowAutomationExecutionResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# ============================================
# FLOW AUTOMATION RECIPIENT SCHEMAS
# ============================================

class FlowAutomationRecipientBase(BaseModel):
    """Base schema for FlowAutomationRecipient"""

    contact_id: UUID
    phone_number: str
    variables: dict = Field(default_factory=dict)


class FlowAutomationRecipientCreate(FlowAutomationRecipientBase):
    """Schema for creating a flow automation recipient"""
    execution_id: UUID


class FlowAutomationRecipientInDB(FlowAutomationRecipientBase):
    """Schema for flow automation recipient in database"""

    id: UUID
    execution_id: UUID
    organization_id: UUID
    conversation_id: Optional[UUID] = None
    status: str = "pending"
    attempts: int = 0
    last_attempt_at: Optional[datetime] = None
    flow_completed: bool = False
    flow_current_node: Optional[str] = None
    flow_outcome: Optional[str] = None
    sent_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    read_at: Optional[datetime] = None
    replied_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class FlowAutomationRecipientResponse(FlowAutomationRecipientInDB):
    """Schema for flow automation recipient response"""

    # Adiciona nome do contato
    contact_name: Optional[str] = None


class FlowAutomationRecipientList(BaseModel):
    """Schema for paginated list of recipients"""

    items: List[FlowAutomationRecipientResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# ============================================
# ACTION SCHEMAS
# ============================================

class FlowAutomationStartRequest(BaseModel):
    """Schema for starting a flow automation manually"""

    # Permite sobrescrever audiência para teste
    test_mode: bool = Field(default=False)
    test_contact_ids: Optional[List[UUID]] = None


class FlowAutomationPauseRequest(BaseModel):
    """Schema for pausing a running automation execution"""

    reason: Optional[str] = None


class FlowAutomationCancelRequest(BaseModel):
    """Schema for canceling a running automation execution"""

    reason: Optional[str] = None


# ============================================
# STATISTICS SCHEMAS
# ============================================

class FlowAutomationStats(BaseModel):
    """Schema for flow automation statistics"""

    total_executions: int
    total_sent: int
    total_delivered: int
    total_read: int
    total_replied: int
    total_completed: int
    total_failed: int
    
    # Taxas calculadas
    delivery_rate: Optional[float] = None  # delivered / sent
    read_rate: Optional[float] = None      # read / delivered
    reply_rate: Optional[float] = None     # replied / sent
    completion_rate: Optional[float] = None # completed / sent
    
    # Última execução
    last_execution_id: Optional[UUID] = None
    last_execution_status: Optional[str] = None
    last_executed_at: Optional[datetime] = None
    
    # Próxima execução (se agendada)
    next_scheduled_at: Optional[datetime] = None


class FlowAutomationExecutionStats(BaseModel):
    """Schema for execution-specific statistics"""

    execution_id: UUID
    status: str
    progress_percentage: float
    total_recipients: int
    messages_sent: int
    messages_delivered: int
    messages_read: int
    messages_replied: int
    messages_completed: int
    messages_failed: int
    
    # Timing
    started_at: Optional[datetime] = None
    estimated_completion_time: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    # Performance
    average_response_time: Optional[float] = None  # segundos
    messages_per_minute: Optional[float] = None
