"""
Analytics and Reports schemas
"""

from datetime import datetime
from typing import Dict, List, Optional

from pydantic import BaseModel, Field


# ============================================
# OVERVIEW METRICS
# ============================================

class OverviewMetrics(BaseModel):
    """Overview dashboard metrics"""

    # Contacts
    total_contacts: int = 0
    new_contacts_today: int = 0
    new_contacts_this_week: int = 0
    new_contacts_this_month: int = 0

    # Conversations
    total_conversations: int = 0
    active_conversations: int = 0
    new_conversations_today: int = 0
    avg_response_time_seconds: Optional[float] = None

    # Messages
    total_messages_sent: int = 0
    total_messages_received: int = 0
    messages_sent_today: int = 0
    messages_received_today: int = 0

    # Campaigns
    total_campaigns: int = 0
    active_campaigns: int = 0
    scheduled_campaigns: int = 0

    # Chatbots
    total_chatbots: int = 0
    active_chatbots: int = 0

    # Agents
    total_agents: int = 0
    agents_online: int = 0


# ============================================
# TIME SERIES DATA
# ============================================

class TimeSeriesDataPoint(BaseModel):
    """Single data point in time series"""

    timestamp: datetime
    value: float
    label: Optional[str] = None


class TimeSeriesData(BaseModel):
    """Time series data"""

    metric_name: str
    data_points: List[TimeSeriesDataPoint] = Field(default_factory=list)
    total: Optional[float] = None
    average: Optional[float] = None


# ============================================
# CONVERSATION METRICS
# ============================================

class ConversationMetrics(BaseModel):
    """Conversation analytics"""

    total_conversations: int = 0
    active_conversations: int = 0
    closed_conversations: int = 0
    avg_conversation_duration_seconds: Optional[float] = None
    avg_messages_per_conversation: Optional[float] = None
    avg_response_time_seconds: Optional[float] = None
    first_response_time_seconds: Optional[float] = None
    resolution_rate: Optional[float] = None  # percentage
    conversations_by_status: Dict[str, int] = Field(default_factory=dict)
    conversations_by_channel: Dict[str, int] = Field(default_factory=dict)
    peak_hours: List[int] = Field(default_factory=list)


# ============================================
# AGENT METRICS
# ============================================

class AgentPerformance(BaseModel):
    """Individual agent performance metrics"""

    agent_id: str
    agent_name: str
    total_conversations: int = 0
    active_conversations: int = 0
    closed_conversations: int = 0
    avg_response_time_seconds: Optional[float] = None
    avg_resolution_time_seconds: Optional[float] = None
    satisfaction_score: Optional[float] = None
    messages_sent: int = 0
    online_time_hours: Optional[float] = None


class AgentMetrics(BaseModel):
    """Agent analytics"""

    total_agents: int = 0
    agents_online: int = 0
    agents_away: int = 0
    agents_offline: int = 0
    top_performers: List[AgentPerformance] = Field(default_factory=list)
    avg_conversations_per_agent: Optional[float] = None
    avg_response_time_seconds: Optional[float] = None


# ============================================
# CAMPAIGN METRICS
# ============================================

class CampaignMetrics(BaseModel):
    """Campaign analytics"""

    total_campaigns: int = 0
    active_campaigns: int = 0
    completed_campaigns: int = 0
    total_messages_sent: int = 0
    total_messages_delivered: int = 0
    total_messages_read: int = 0
    total_messages_failed: int = 0
    avg_delivery_rate: Optional[float] = None
    avg_read_rate: Optional[float] = None
    avg_reply_rate: Optional[float] = None
    total_cost: Optional[float] = None
    roi: Optional[float] = None  # Return on Investment


# ============================================
# CONTACT METRICS
# ============================================

class ContactMetrics(BaseModel):
    """Contact analytics"""

    total_contacts: int = 0
    new_contacts_today: int = 0
    new_contacts_this_week: int = 0
    new_contacts_this_month: int = 0
    active_contacts: int = 0
    blocked_contacts: int = 0
    opted_out_contacts: int = 0
    contacts_by_source: Dict[str, int] = Field(default_factory=dict)
    contacts_by_lifecycle_stage: Dict[str, int] = Field(default_factory=dict)
    avg_engagement_score: Optional[float] = None
    top_tags: List[Dict[str, int]] = Field(default_factory=list)


# ============================================
# CHATBOT METRICS
# ============================================

class ChatbotMetrics(BaseModel):
    """Chatbot analytics"""

    total_chatbots: int = 0
    active_chatbots: int = 0
    total_bot_conversations: int = 0
    total_bot_messages: int = 0
    avg_completion_rate: Optional[float] = None
    handoff_rate: Optional[float] = None  # percentage of bot conversations handed to agents
    top_intents: List[Dict[str, int]] = Field(default_factory=list)
    avg_conversation_steps: Optional[float] = None


# ============================================
# MESSAGE METRICS
# ============================================

class MessageMetrics(BaseModel):
    """Message analytics"""

    total_messages_sent: int = 0
    total_messages_received: int = 0
    messages_by_type: Dict[str, int] = Field(default_factory=dict)
    avg_messages_per_day: Optional[float] = None
    peak_messaging_hours: List[int] = Field(default_factory=list)
    message_delivery_rate: Optional[float] = None
    message_read_rate: Optional[float] = None


# ============================================
# REPORTS
# ============================================

class ReportPeriod(BaseModel):
    """Report time period"""

    start_date: datetime
    end_date: datetime
    period_type: str = Field(description="daily, weekly, monthly, custom")


class ConversationReport(BaseModel):
    """Detailed conversation report"""

    period: ReportPeriod
    metrics: ConversationMetrics
    time_series: List[TimeSeriesData] = Field(default_factory=list)


class AgentReport(BaseModel):
    """Detailed agent report"""

    period: ReportPeriod
    metrics: AgentMetrics
    agent_performance: List[AgentPerformance] = Field(default_factory=list)


class CampaignReport(BaseModel):
    """Detailed campaign report"""

    period: ReportPeriod
    metrics: CampaignMetrics
    top_campaigns: List[Dict] = Field(default_factory=list)


class ContactReport(BaseModel):
    """Detailed contact report"""

    period: ReportPeriod
    metrics: ContactMetrics
    growth_trend: List[TimeSeriesDataPoint] = Field(default_factory=list)


class FullReport(BaseModel):
    """Complete analytics report"""

    period: ReportPeriod
    overview: OverviewMetrics
    conversations: ConversationMetrics
    agents: AgentMetrics
    campaigns: CampaignMetrics
    contacts: ContactMetrics
    chatbots: ChatbotMetrics
    messages: MessageMetrics
    generated_at: datetime = Field(default_factory=datetime.utcnow)


# ============================================
# EXPORT OPTIONS
# ============================================

class ExportRequest(BaseModel):
    """Request for exporting analytics data"""

    report_type: str = Field(description="overview, conversations, agents, campaigns, contacts, full")
    start_date: datetime
    end_date: datetime
    format: str = Field(default="json", description="json, csv, pdf")
    include_charts: bool = Field(default=False)
