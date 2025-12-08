"""
Analytics service - Business intelligence and reporting
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.campaign import Campaign
from app.models.chatbot import Chatbot
from app.models.contact import Contact
from app.models.conversation import Conversation
from app.models.user import User
from app.schemas.analytics import (
    AgentMetrics,
    AgentPerformance,
    CampaignMetrics,
    ChatbotMetrics,
    ContactMetrics,
    ConversationMetrics,
    FullReport,
    MessageMetrics,
    OverviewMetrics,
    ReportPeriod,
    TimeSeriesData,
    TimeSeriesDataPoint,
)


class AnalyticsService:
    """Service for analytics and reporting"""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ============================================
    # OVERVIEW METRICS
    # ============================================

    async def get_overview_metrics(self, organization_id: UUID) -> OverviewMetrics:
        """
        Get overview dashboard metrics

        Args:
            organization_id: Organization UUID

        Returns:
            Overview metrics
        """
        now = datetime.utcnow()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = today_start - timedelta(days=7)
        month_start = today_start - timedelta(days=30)

        # Contacts
        total_contacts = await self._count_model(Contact, organization_id)
        new_contacts_today = await self._count_model(
            Contact, organization_id, created_after=today_start
        )
        new_contacts_week = await self._count_model(
            Contact, organization_id, created_after=week_start
        )
        new_contacts_month = await self._count_model(
            Contact, organization_id, created_after=month_start
        )

        # Conversations
        total_conversations = await self._count_model(Conversation, organization_id)
        active_conversations = await self._count_conversations_by_status(
            organization_id, "open"
        )
        new_conversations_today = await self._count_model(
            Conversation, organization_id, created_after=today_start
        )

        # Messages
        total_messages_sent = await self._sum_field(
            Contact, "total_messages_sent", organization_id
        )
        total_messages_received = await self._sum_field(
            Contact, "total_messages_received", organization_id
        )
        # TODO: Implement when Message model is created
        messages_sent_today = 0
        messages_received_today = 0

        # Campaigns
        total_campaigns = await self._count_model(Campaign, organization_id)
        active_campaigns = await self._count_campaigns_by_status(organization_id, "running")
        scheduled_campaigns = await self._count_campaigns_by_status(
            organization_id, "scheduled"
        )

        # Chatbots
        total_chatbots = await self._count_model(Chatbot, organization_id)
        active_chatbots = await self._count_active_chatbots(organization_id)

        # Agents
        total_agents = await self._count_agents(organization_id)
        agents_online = await self._count_online_agents(organization_id)

        # Calculate average response time
        avg_response_time = await self._calculate_avg_response_time(organization_id)

        return OverviewMetrics(
            total_contacts=total_contacts,
            new_contacts_today=new_contacts_today,
            new_contacts_this_week=new_contacts_week,
            new_contacts_this_month=new_contacts_month,
            total_conversations=total_conversations,
            active_conversations=active_conversations,
            new_conversations_today=new_conversations_today,
            avg_response_time_seconds=avg_response_time,
            total_messages_sent=total_messages_sent or 0,
            total_messages_received=total_messages_received or 0,
            messages_sent_today=messages_sent_today,
            messages_received_today=messages_received_today,
            total_campaigns=total_campaigns,
            active_campaigns=active_campaigns,
            scheduled_campaigns=scheduled_campaigns,
            total_chatbots=total_chatbots,
            active_chatbots=active_chatbots,
            total_agents=total_agents,
            agents_online=agents_online,
        )

    # ============================================
    # CONVERSATION METRICS
    # ============================================

    async def get_conversation_metrics(
        self, organization_id: UUID, start_date: datetime, end_date: datetime
    ) -> ConversationMetrics:
        """Get conversation analytics"""

        total_conversations = await self._count_model(
            Conversation, organization_id, created_after=start_date, created_before=end_date
        )

        active_conversations = await self._count_conversations_by_status(
            organization_id, "open"
        )

        closed_conversations = await self._count_conversations_by_status(
            organization_id, "closed"
        )

        # Get conversations by status
        conversations_by_status = await self._group_conversations_by_status(
            organization_id, start_date, end_date
        )

        return ConversationMetrics(
            total_conversations=total_conversations,
            active_conversations=active_conversations,
            closed_conversations=closed_conversations,
            conversations_by_status=conversations_by_status,
        )

    # ============================================
    # AGENT METRICS
    # ============================================

    async def get_agent_metrics(
        self, organization_id: UUID, start_date: datetime, end_date: datetime
    ) -> AgentMetrics:
        """Get agent analytics"""

        total_agents = await self._count_agents(organization_id)
        agents_online = await self._count_online_agents(organization_id)

        # Get top performers
        top_performers = await self._get_top_agents(organization_id, start_date, end_date)

        return AgentMetrics(
            total_agents=total_agents,
            agents_online=agents_online,
            agents_away=0,  # TODO: implement away status
            agents_offline=total_agents - agents_online,
            top_performers=top_performers,
        )

    # ============================================
    # CAMPAIGN METRICS
    # ============================================

    async def get_campaign_metrics(
        self, organization_id: UUID, start_date: datetime, end_date: datetime
    ) -> CampaignMetrics:
        """Get campaign analytics"""

        result = await self.db.execute(
            select(
                func.count(Campaign.id).label("total"),
                func.sum(Campaign.messages_sent).label("sent"),
                func.sum(Campaign.messages_delivered).label("delivered"),
                func.sum(Campaign.messages_read).label("read"),
                func.sum(Campaign.messages_failed).label("failed"),
                func.avg(Campaign.delivery_rate).label("avg_delivery"),
                func.avg(Campaign.read_rate).label("avg_read"),
                func.avg(Campaign.reply_rate).label("avg_reply"),
            )
            .where(Campaign.organization_id == organization_id)
            .where(Campaign.created_at >= start_date)
            .where(Campaign.created_at <= end_date)
            .where(Campaign.deleted_at.is_(None))
        )
        row = result.first()

        active_campaigns = await self._count_campaigns_by_status(organization_id, "running")
        completed_campaigns = await self._count_campaigns_by_status(
            organization_id, "completed"
        )

        return CampaignMetrics(
            total_campaigns=row.total or 0,
            active_campaigns=active_campaigns,
            completed_campaigns=completed_campaigns,
            total_messages_sent=row.sent or 0,
            total_messages_delivered=row.delivered or 0,
            total_messages_read=row.read or 0,
            total_messages_failed=row.failed or 0,
            avg_delivery_rate=row.avg_delivery,
            avg_read_rate=row.avg_read,
            avg_reply_rate=row.avg_reply,
        )

    # ============================================
    # CONTACT METRICS
    # ============================================

    async def get_contact_metrics(
        self, organization_id: UUID, start_date: datetime, end_date: datetime
    ) -> ContactMetrics:
        """Get contact analytics"""

        now = datetime.utcnow()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = today_start - timedelta(days=7)
        month_start = today_start - timedelta(days=30)

        total_contacts = await self._count_model(Contact, organization_id)
        new_contacts_today = await self._count_model(
            Contact, organization_id, created_after=today_start
        )
        new_contacts_week = await self._count_model(
            Contact, organization_id, created_after=week_start
        )
        new_contacts_month = await self._count_model(
            Contact, organization_id, created_after=month_start
        )

        # Count blocked and opted out
        blocked_result = await self.db.execute(
            select(func.count(Contact.id))
            .where(Contact.organization_id == organization_id)
            .where(Contact.is_blocked == True)
            .where(Contact.deleted_at.is_(None))
        )
        blocked_contacts = blocked_result.scalar() or 0

        return ContactMetrics(
            total_contacts=total_contacts,
            new_contacts_today=new_contacts_today,
            new_contacts_this_week=new_contacts_week,
            new_contacts_this_month=new_contacts_month,
            blocked_contacts=blocked_contacts,
        )

    # ============================================
    # CHATBOT METRICS
    # ============================================

    async def get_chatbot_metrics(self, organization_id: UUID) -> ChatbotMetrics:
        """Get chatbot analytics"""

        total_chatbots = await self._count_model(Chatbot, organization_id)
        active_chatbots = await self._count_active_chatbots(organization_id)

        result = await self.db.execute(
            select(
                func.sum(Chatbot.total_conversations).label("bot_conversations"),
                func.sum(Chatbot.total_messages_sent).label("bot_messages"),
            )
            .where(Chatbot.organization_id == organization_id)
            .where(Chatbot.deleted_at.is_(None))
        )
        row = result.first()

        return ChatbotMetrics(
            total_chatbots=total_chatbots,
            active_chatbots=active_chatbots,
            total_bot_conversations=row.bot_conversations or 0,
            total_bot_messages=row.bot_messages or 0,
        )

    # ============================================
    # MESSAGE METRICS
    # ============================================

    async def get_message_metrics(
        self, organization_id: UUID, start_date: datetime, end_date: datetime
    ) -> MessageMetrics:
        """Get message analytics"""

        sent_count = await self._count_messages(
            organization_id, direction="outgoing", created_after=start_date, created_before=end_date
        )

        received_count = await self._count_messages(
            organization_id, direction="incoming", created_after=start_date, created_before=end_date
        )

        return MessageMetrics(
            total_messages_sent=sent_count,
            total_messages_received=received_count,
        )

    # ============================================
    # TIME SERIES
    # ============================================

    async def get_messages_time_series(
        self, organization_id: UUID, start_date: datetime, end_date: datetime, granularity: str = "day"
    ) -> TimeSeriesData:
        """Get message count time series"""

        # TODO: Implement proper time series aggregation
        # This is a placeholder implementation

        return TimeSeriesData(
            metric_name="messages_sent",
            data_points=[],
            total=0.0,
            average=0.0,
        )

    async def get_conversations_time_series(
        self, organization_id: UUID, start_date: datetime, end_date: datetime, granularity: str = "hour"
    ) -> TimeSeriesData:
        """Get conversation count time series by hour or day"""

        # TODO: Implement proper time series aggregation
        # This is a placeholder implementation with mock data

        return TimeSeriesData(
            metric_name="conversations",
            data_points=[],
            total=0.0,
            average=0.0,
        )

    # ============================================
    # FULL REPORT
    # ============================================

    async def generate_full_report(
        self, organization_id: UUID, start_date: datetime, end_date: datetime
    ) -> FullReport:
        """Generate complete analytics report"""

        period = ReportPeriod(
            start_date=start_date, end_date=end_date, period_type="custom"
        )

        overview = await self.get_overview_metrics(organization_id)
        conversations = await self.get_conversation_metrics(
            organization_id, start_date, end_date
        )
        agents = await self.get_agent_metrics(organization_id, start_date, end_date)
        campaigns = await self.get_campaign_metrics(organization_id, start_date, end_date)
        contacts = await self.get_contact_metrics(organization_id, start_date, end_date)
        chatbots = await self.get_chatbot_metrics(organization_id)
        messages = await self.get_message_metrics(organization_id, start_date, end_date)

        return FullReport(
            period=period,
            overview=overview,
            conversations=conversations,
            agents=agents,
            campaigns=campaigns,
            contacts=contacts,
            chatbots=chatbots,
            messages=messages,
        )

    # ============================================
    # HELPER METHODS
    # ============================================

    async def _count_model(
        self,
        model,
        organization_id: UUID,
        created_after: Optional[datetime] = None,
        created_before: Optional[datetime] = None,
    ) -> int:
        """Count records for a model"""
        query = select(func.count(model.id)).where(
            model.organization_id == organization_id
        )

        if hasattr(model, "deleted_at"):
            query = query.where(model.deleted_at.is_(None))

        if created_after:
            query = query.where(model.created_at >= created_after)

        if created_before:
            query = query.where(model.created_at <= created_before)

        result = await self.db.execute(query)
        return result.scalar() or 0

    async def _sum_field(
        self, model, field_name: str, organization_id: UUID
    ) -> Optional[int]:
        """Sum a field for a model"""
        field = getattr(model, field_name)
        query = select(func.sum(field)).where(model.organization_id == organization_id)

        if hasattr(model, "deleted_at"):
            query = query.where(model.deleted_at.is_(None))

        result = await self.db.execute(query)
        return result.scalar()

    async def _count_conversations_by_status(
        self, organization_id: UUID, status: str
    ) -> int:
        """Count conversations by status"""
        result = await self.db.execute(
            select(func.count(Conversation.id))
            .where(Conversation.organization_id == organization_id)
            .where(Conversation.status == status)
            .where(Conversation.deleted_at.is_(None))
        )
        return result.scalar() or 0

    async def _count_campaigns_by_status(
        self, organization_id: UUID, status: str
    ) -> int:
        """Count campaigns by status"""
        result = await self.db.execute(
            select(func.count(Campaign.id))
            .where(Campaign.organization_id == organization_id)
            .where(Campaign.status == status)
            .where(Campaign.deleted_at.is_(None))
        )
        return result.scalar() or 0

    async def _count_active_chatbots(self, organization_id: UUID) -> int:
        """Count active chatbots"""
        result = await self.db.execute(
            select(func.count(Chatbot.id))
            .where(Chatbot.organization_id == organization_id)
            .where(Chatbot.is_active == True)
            .where(Chatbot.deleted_at.is_(None))
        )
        return result.scalar() or 0

    async def _count_agents(self, organization_id: UUID) -> int:
        """Count agents in organization"""
        result = await self.db.execute(
            select(func.count(User.id))
            .where(User.organization_id == organization_id)
            .where(User.role.in_(["org_admin", "agent"]))
            .where(User.deleted_at.is_(None))
        )
        return result.scalar() or 0

    async def _count_online_agents(self, organization_id: UUID) -> int:
        """Count online agents"""
        result = await self.db.execute(
            select(func.count(User.id))
            .where(User.organization_id == organization_id)
            .where(User.role.in_(["org_admin", "agent"]))
            .where(User.is_online == True)
            .where(User.deleted_at.is_(None))
        )
        return result.scalar() or 0

    async def _count_messages(
        self,
        organization_id: UUID,
        direction: Optional[str] = None,
        created_after: Optional[datetime] = None,
        created_before: Optional[datetime] = None,
    ) -> int:
        """Count messages"""
        query = select(func.count(Message.id)).where(
            Message.organization_id == organization_id
        )

        if direction:
            query = query.where(Message.direction == direction)

        if created_after:
            query = query.where(Message.created_at >= created_after)

        if created_before:
            query = query.where(Message.created_at <= created_before)

        result = await self.db.execute(query)
        return result.scalar() or 0

    async def _calculate_avg_response_time(self, organization_id: UUID) -> Optional[float]:
        """Calculate average response time"""
        result = await self.db.execute(
            select(func.avg(Contact.average_response_time_seconds))
            .where(Contact.organization_id == organization_id)
            .where(Contact.average_response_time_seconds.is_not(None))
            .where(Contact.deleted_at.is_(None))
        )
        return result.scalar()

    async def _group_conversations_by_status(
        self, organization_id: UUID, start_date: datetime, end_date: datetime
    ) -> Dict[str, int]:
        """Group conversations by status"""
        result = await self.db.execute(
            select(Conversation.status, func.count(Conversation.id))
            .where(Conversation.organization_id == organization_id)
            .where(Conversation.created_at >= start_date)
            .where(Conversation.created_at <= end_date)
            .where(Conversation.deleted_at.is_(None))
            .group_by(Conversation.status)
        )

        return {row[0]: row[1] for row in result.all()}

    async def _get_top_agents(
        self, organization_id: UUID, start_date: datetime, end_date: datetime, limit: int = 10
    ) -> List[AgentPerformance]:
        """Get top performing agents"""

        # Get agents with conversation counts
        result = await self.db.execute(
            select(
                User.id,
                User.full_name,
                func.count(Conversation.id).label("conv_count"),
            )
            .join(Conversation, Conversation.current_agent_id == User.id, isouter=True)
            .where(User.organization_id == organization_id)
            .where(User.role.in_(["org_admin", "agent"]))
            .where(User.deleted_at.is_(None))
            .group_by(User.id, User.full_name)
            .order_by(func.count(Conversation.id).desc())
            .limit(limit)
        )

        top_agents = []
        for row in result.all():
            top_agents.append(
                AgentPerformance(
                    agent_id=str(row.id),
                    agent_name=row.full_name or "Unknown",
                    total_conversations=row.conv_count or 0,
                )
            )

        return top_agents
