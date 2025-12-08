"""
Analytics GraphQL Types
"""

from datetime import datetime
from typing import Dict, List, Optional

import strawberry


# ============================================
# OVERVIEW METRICS
# ============================================

@strawberry.type
class OverviewMetricsType:
    """Overview dashboard metrics"""

    # Contacts
    total_contacts: int
    new_contacts_today: int
    new_contacts_this_week: int
    new_contacts_this_month: int

    # Conversations
    total_conversations: int
    active_conversations: int
    new_conversations_today: int
    avg_response_time_seconds: Optional[float] = None

    # Messages
    total_messages_sent: int
    total_messages_received: int
    messages_sent_today: int
    messages_received_today: int

    # Campaigns
    total_campaigns: int
    active_campaigns: int
    scheduled_campaigns: int

    # Chatbots
    total_chatbots: int
    active_chatbots: int

    # Agents
    total_agents: int
    agents_online: int


# ============================================
# TIME SERIES DATA
# ============================================

@strawberry.type
class TimeSeriesDataPointType:
    """Single data point in time series"""

    timestamp: datetime
    value: float
    label: Optional[str] = None


@strawberry.type
class TimeSeriesDataType:
    """Time series data"""

    metric_name: str
    data_points: List[TimeSeriesDataPointType]
    total: Optional[float] = None
    average: Optional[float] = None


# ============================================
# CONVERSATION METRICS
# ============================================

@strawberry.type
class ConversationMetricsType:
    """Conversation analytics"""

    total_conversations: int
    active_conversations: int
    closed_conversations: int
    avg_conversation_duration_seconds: Optional[float] = None
    avg_messages_per_conversation: Optional[float] = None
    avg_response_time_seconds: Optional[float] = None
    first_response_time_seconds: Optional[float] = None
    resolution_rate: Optional[float] = None
    conversations_by_status: strawberry.scalars.JSON
    conversations_by_channel: strawberry.scalars.JSON
    peak_hours: List[int]


# ============================================
# AGENT METRICS
# ============================================

@strawberry.type
class AgentPerformanceType:
    """Individual agent performance metrics"""

    agent_id: strawberry.ID
    agent_name: str
    total_conversations: int
    active_conversations: int
    closed_conversations: int
    avg_response_time_seconds: Optional[float] = None
    avg_resolution_time_seconds: Optional[float] = None
    satisfaction_score: Optional[float] = None
    messages_sent: int
    online_time_hours: Optional[float] = None


@strawberry.type
class AgentMetricsType:
    """Agent analytics"""

    total_agents: int
    agents_online: int
    agents_away: int
    agents_offline: int
    top_performers: List[AgentPerformanceType]
    avg_conversations_per_agent: Optional[float] = None
    avg_response_time_seconds: Optional[float] = None


# ============================================
# CAMPAIGN METRICS
# ============================================

@strawberry.type
class CampaignMetricsType:
    """Campaign analytics"""

    total_campaigns: int
    active_campaigns: int
    completed_campaigns: int
    total_messages_sent: int
    total_messages_delivered: int
    total_messages_read: int
    total_messages_failed: int
    avg_delivery_rate: Optional[float] = None
    avg_read_rate: Optional[float] = None
    avg_reply_rate: Optional[float] = None
    total_cost: Optional[float] = None
    roi: Optional[float] = None


# ============================================
# CONTACT METRICS
# ============================================

@strawberry.type
class ContactMetricsType:
    """Contact analytics"""

    total_contacts: int
    new_contacts_today: int
    new_contacts_this_week: int
    new_contacts_this_month: int
    active_contacts: int
    blocked_contacts: int
    opted_out_contacts: int
    contacts_by_source: strawberry.scalars.JSON
    contacts_by_lifecycle_stage: strawberry.scalars.JSON
    avg_engagement_score: Optional[float] = None
    top_tags: strawberry.scalars.JSON


# ============================================
# CHATBOT METRICS
# ============================================

@strawberry.type
class ChatbotMetricsType:
    """Chatbot analytics"""

    total_chatbots: int
    active_chatbots: int
    total_bot_conversations: int
    total_bot_messages: int
    avg_completion_rate: Optional[float] = None
    handoff_rate: Optional[float] = None
    top_intents: strawberry.scalars.JSON
    avg_conversation_steps: Optional[float] = None


# ============================================
# MESSAGE METRICS
# ============================================

@strawberry.type
class MessageMetricsType:
    """Message analytics"""

    total_messages_sent: int
    total_messages_received: int
    messages_by_type: strawberry.scalars.JSON
    avg_messages_per_day: Optional[float] = None
    peak_messaging_hours: List[int]
    message_delivery_rate: Optional[float] = None
    message_read_rate: Optional[float] = None


# ============================================
# REPORTS
# ============================================

@strawberry.type
class ReportPeriodType:
    """Report time period"""

    start_date: datetime
    end_date: datetime
    period_type: str


@strawberry.type
class FullReportType:
    """Complete analytics report"""

    period: ReportPeriodType
    overview: OverviewMetricsType
    conversations: ConversationMetricsType
    agents: AgentMetricsType
    campaigns: CampaignMetricsType
    contacts: ContactMetricsType
    chatbots: ChatbotMetricsType
    messages: MessageMetricsType
    generated_at: datetime
