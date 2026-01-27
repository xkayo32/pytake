"""
Flow Automation GraphQL Types
"""

from datetime import datetime, time
from typing import List, Optional

import strawberry


# ============================================
# FLOW AUTOMATION TYPES
# ============================================

@strawberry.type
class FlowAutomationType:
    """Flow Automation type for GraphQL"""

    id: strawberry.ID
    organization_id: strawberry.ID
    name: str
    description: Optional[str] = None
    chatbot_id: strawberry.ID
    flow_id: strawberry.ID
    whatsapp_number_id: strawberry.ID
    trigger_type: str
    trigger_config: strawberry.scalars.JSON
    audience_type: str
    audience_config: strawberry.scalars.JSON
    variable_mapping: strawberry.scalars.JSON
    status: str
    is_active: bool
    max_concurrent_executions: int
    rate_limit_per_hour: int
    retry_failed: bool
    max_retries: int
    execution_window_start: Optional[time] = None
    execution_window_end: Optional[time] = None
    execution_timezone: str
    total_executions: int
    total_sent: int
    total_delivered: int
    total_read: int
    total_replied: int
    total_completed: int
    total_failed: int
    last_executed_at: Optional[datetime] = None
    next_scheduled_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


@strawberry.input
class FlowAutomationCreateInput:
    """Input for creating flow automation"""

    name: str
    description: Optional[str] = None
    chatbot_id: strawberry.ID
    flow_id: strawberry.ID
    whatsapp_number_id: strawberry.ID
    trigger_type: str = "manual"
    trigger_config: strawberry.scalars.JSON = strawberry.field(default_factory=dict)
    audience_type: str = "custom"
    audience_config: strawberry.scalars.JSON = strawberry.field(default_factory=dict)
    variable_mapping: strawberry.scalars.JSON = strawberry.field(default_factory=dict)
    max_concurrent_executions: int = 50
    rate_limit_per_hour: int = 100
    retry_failed: bool = True
    max_retries: int = 3
    execution_window_start: Optional[time] = None
    execution_window_end: Optional[time] = None
    execution_timezone: str = "America/Sao_Paulo"


@strawberry.input
class FlowAutomationUpdateInput:
    """Input for updating flow automation"""

    name: Optional[str] = None
    description: Optional[str] = None
    chatbot_id: Optional[strawberry.ID] = None
    flow_id: Optional[strawberry.ID] = None
    whatsapp_number_id: Optional[strawberry.ID] = None
    trigger_type: Optional[str] = None
    trigger_config: Optional[strawberry.scalars.JSON] = None
    audience_type: Optional[str] = None
    audience_config: Optional[strawberry.scalars.JSON] = None
    variable_mapping: Optional[strawberry.scalars.JSON] = None
    status: Optional[str] = None
    is_active: Optional[bool] = None
    max_concurrent_executions: Optional[int] = None
    rate_limit_per_hour: Optional[int] = None
    retry_failed: Optional[bool] = None
    max_retries: Optional[int] = None
    execution_window_start: Optional[time] = None
    execution_window_end: Optional[time] = None
    execution_timezone: Optional[str] = None


# ============================================
# FLOW AUTOMATION EXECUTION TYPES
# ============================================

@strawberry.type
class FlowAutomationExecutionType:
    """Flow Automation Execution type for GraphQL"""

    id: strawberry.ID
    automation_id: strawberry.ID
    organization_id: strawberry.ID
    execution_type: str
    triggered_by_user_id: Optional[strawberry.ID] = None
    triggered_by_event: Optional[str] = None
    status: str
    total_recipients: int
    messages_sent: int
    messages_delivered: int
    messages_read: int
    messages_replied: int
    messages_completed: int
    messages_failed: int
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    paused_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    error_message: Optional[str] = None
    errors: strawberry.scalars.JSON
    created_at: datetime
    updated_at: datetime


@strawberry.input
class FlowAutomationExecutionCreateInput:
    """Input for creating flow automation execution"""

    automation_id: strawberry.ID
    execution_type: str = "manual"
    triggered_by_event: Optional[str] = None


# ============================================
# FLOW AUTOMATION RECIPIENT TYPES
# ============================================

@strawberry.type
class FlowAutomationRecipientType:
    """Flow Automation Recipient type for GraphQL"""

    id: strawberry.ID
    execution_id: strawberry.ID
    organization_id: strawberry.ID
    contact_id: strawberry.ID
    phone_number: str
    variables: strawberry.scalars.JSON
    status: str
    conversation_id: Optional[strawberry.ID] = None
    attempts: int
    last_attempt_at: Optional[datetime] = None
    flow_completed: bool
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


# ============================================
# STATISTICS TYPES
# ============================================

@strawberry.type
class FlowAutomationStatsType:
    """Flow Automation statistics"""

    total_executions: int
    total_sent: int
    total_delivered: int
    total_read: int
    total_replied: int
    total_completed: int
    total_failed: int
    delivery_rate: Optional[float] = None
    read_rate: Optional[float] = None
    reply_rate: Optional[float] = None
    completion_rate: Optional[float] = None
    last_execution_id: Optional[strawberry.ID] = None
    last_execution_status: Optional[str] = None
    last_executed_at: Optional[datetime] = None
    next_scheduled_at: Optional[datetime] = None


@strawberry.type
class FlowAutomationExecutionStatsType:
    """Execution-specific statistics"""

    execution_id: strawberry.ID
    status: str
    progress_percentage: float
    total_recipients: int
    messages_sent: int
    messages_delivered: int
    messages_read: int
    messages_replied: int
    messages_completed: int
    messages_failed: int
    started_at: Optional[datetime] = None
    estimated_completion_time: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    average_response_time: Optional[float] = None
    messages_per_minute: Optional[float] = None


# ============================================
# ACTION INPUTS
# ============================================

@strawberry.input
class FlowAutomationStartInput:
    """Input for starting flow automation manually"""

    test_mode: bool = False
    test_contact_ids: Optional[List[strawberry.ID]] = None


@strawberry.input
class FlowAutomationPauseInput:
    """Input for pausing execution"""

    reason: Optional[str] = None


@strawberry.input
class FlowAutomationCancelInput:
    """Input for canceling execution"""

    reason: Optional[str] = None
