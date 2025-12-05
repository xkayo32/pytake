"""
Analytics Queries
"""

from datetime import datetime, timedelta
from typing import Optional

import strawberry
from strawberry.types import Info

from app.graphql.context import GraphQLContext
from app.graphql.permissions import require_auth
from app.graphql.types.analytics import (
    AgentMetricsType,
    AgentPerformanceType,
    CampaignMetricsType,
    ChatbotMetricsType,
    ContactMetricsType,
    ConversationMetricsType,
    FullReportType,
    MessageMetricsType,
    OverviewMetricsType,
    ReportPeriodType,
    TimeSeriesDataPointType,
    TimeSeriesDataType,
)
from app.services.analytics_service import AnalyticsService


@strawberry.type
class AnalyticsQuery:
    """Analytics-related queries"""

    # ============================================
    # OVERVIEW DASHBOARD
    # ============================================

    @strawberry.field
    @require_auth
    async def overview_metrics(
        self,
        info: Info[GraphQLContext, None],
    ) -> OverviewMetricsType:
        """Get overview dashboard metrics"""
        context: GraphQLContext = info.context

        service = AnalyticsService(context.db)
        metrics = await service.get_overview_metrics(context.organization_id)

        return OverviewMetricsType(
            total_contacts=metrics.total_contacts,
            new_contacts_today=metrics.new_contacts_today,
            new_contacts_this_week=metrics.new_contacts_this_week,
            new_contacts_this_month=metrics.new_contacts_this_month,
            total_conversations=metrics.total_conversations,
            active_conversations=metrics.active_conversations,
            new_conversations_today=metrics.new_conversations_today,
            avg_response_time_seconds=metrics.avg_response_time_seconds,
            total_messages_sent=metrics.total_messages_sent,
            total_messages_received=metrics.total_messages_received,
            messages_sent_today=metrics.messages_sent_today,
            messages_received_today=metrics.messages_received_today,
            total_campaigns=metrics.total_campaigns,
            active_campaigns=metrics.active_campaigns,
            scheduled_campaigns=metrics.scheduled_campaigns,
            total_chatbots=metrics.total_chatbots,
            active_chatbots=metrics.active_chatbots,
            total_agents=metrics.total_agents,
            agents_online=metrics.agents_online,
        )

    # ============================================
    # SPECIFIC METRICS
    # ============================================

    @strawberry.field
    @require_auth
    async def conversation_metrics(
        self,
        info: Info[GraphQLContext, None],
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> ConversationMetricsType:
        """Get conversation analytics"""
        context: GraphQLContext = info.context

        if not end_date:
            end_date = datetime.utcnow()
        if not start_date:
            start_date = end_date - timedelta(days=30)

        service = AnalyticsService(context.db)
        metrics = await service.get_conversation_metrics(
            context.organization_id, start_date, end_date
        )

        return ConversationMetricsType(
            total_conversations=metrics.total_conversations,
            active_conversations=metrics.active_conversations,
            closed_conversations=metrics.closed_conversations,
            avg_conversation_duration_seconds=metrics.avg_conversation_duration_seconds,
            avg_messages_per_conversation=metrics.avg_messages_per_conversation,
            avg_response_time_seconds=metrics.avg_response_time_seconds,
            first_response_time_seconds=metrics.first_response_time_seconds,
            resolution_rate=metrics.resolution_rate,
            conversations_by_status=metrics.conversations_by_status,
            conversations_by_channel=metrics.conversations_by_channel,
            peak_hours=metrics.peak_hours,
        )

    @strawberry.field
    @require_auth
    async def agent_metrics(
        self,
        info: Info[GraphQLContext, None],
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> AgentMetricsType:
        """Get agent performance analytics"""
        context: GraphQLContext = info.context

        if not end_date:
            end_date = datetime.utcnow()
        if not start_date:
            start_date = end_date - timedelta(days=30)

        service = AnalyticsService(context.db)
        metrics = await service.get_agent_metrics(
            context.organization_id, start_date, end_date
        )

        top_performers = [
            AgentPerformanceType(
                agent_id=strawberry.ID(perf.agent_id),
                agent_name=perf.agent_name,
                total_conversations=perf.total_conversations,
                active_conversations=perf.active_conversations,
                closed_conversations=perf.closed_conversations,
                avg_response_time_seconds=perf.avg_response_time_seconds,
                avg_resolution_time_seconds=perf.avg_resolution_time_seconds,
                satisfaction_score=perf.satisfaction_score,
                messages_sent=perf.messages_sent,
                online_time_hours=perf.online_time_hours,
            )
            for perf in metrics.top_performers
        ]

        return AgentMetricsType(
            total_agents=metrics.total_agents,
            agents_online=metrics.agents_online,
            agents_away=metrics.agents_away,
            agents_offline=metrics.agents_offline,
            top_performers=top_performers,
            avg_conversations_per_agent=metrics.avg_conversations_per_agent,
            avg_response_time_seconds=metrics.avg_response_time_seconds,
        )

    @strawberry.field
    @require_auth
    async def campaign_metrics(
        self,
        info: Info[GraphQLContext, None],
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> CampaignMetricsType:
        """Get campaign analytics"""
        context: GraphQLContext = info.context

        if not end_date:
            end_date = datetime.utcnow()
        if not start_date:
            start_date = end_date - timedelta(days=30)

        service = AnalyticsService(context.db)
        metrics = await service.get_campaign_metrics(
            context.organization_id, start_date, end_date
        )

        return CampaignMetricsType(
            total_campaigns=metrics.total_campaigns,
            active_campaigns=metrics.active_campaigns,
            completed_campaigns=metrics.completed_campaigns,
            total_messages_sent=metrics.total_messages_sent,
            total_messages_delivered=metrics.total_messages_delivered,
            total_messages_read=metrics.total_messages_read,
            total_messages_failed=metrics.total_messages_failed,
            avg_delivery_rate=metrics.avg_delivery_rate,
            avg_read_rate=metrics.avg_read_rate,
            avg_reply_rate=metrics.avg_reply_rate,
            total_cost=metrics.total_cost,
            roi=metrics.roi,
        )

    @strawberry.field
    @require_auth
    async def contact_metrics(
        self,
        info: Info[GraphQLContext, None],
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> ContactMetricsType:
        """Get contact analytics"""
        context: GraphQLContext = info.context

        if not end_date:
            end_date = datetime.utcnow()
        if not start_date:
            start_date = end_date - timedelta(days=30)

        service = AnalyticsService(context.db)
        metrics = await service.get_contact_metrics(
            context.organization_id, start_date, end_date
        )

        return ContactMetricsType(
            total_contacts=metrics.total_contacts,
            new_contacts_today=metrics.new_contacts_today,
            new_contacts_this_week=metrics.new_contacts_this_week,
            new_contacts_this_month=metrics.new_contacts_this_month,
            active_contacts=metrics.active_contacts,
            blocked_contacts=metrics.blocked_contacts,
            opted_out_contacts=metrics.opted_out_contacts,
            contacts_by_source=metrics.contacts_by_source,
            contacts_by_lifecycle_stage=metrics.contacts_by_lifecycle_stage,
            avg_engagement_score=metrics.avg_engagement_score,
            top_tags=metrics.top_tags,
        )

    @strawberry.field
    @require_auth
    async def chatbot_metrics(
        self,
        info: Info[GraphQLContext, None],
    ) -> ChatbotMetricsType:
        """Get chatbot analytics"""
        context: GraphQLContext = info.context

        service = AnalyticsService(context.db)
        metrics = await service.get_chatbot_metrics(context.organization_id)

        return ChatbotMetricsType(
            total_chatbots=metrics.total_chatbots,
            active_chatbots=metrics.active_chatbots,
            total_bot_conversations=metrics.total_bot_conversations,
            total_bot_messages=metrics.total_bot_messages,
            avg_completion_rate=metrics.avg_completion_rate,
            handoff_rate=metrics.handoff_rate,
            top_intents=metrics.top_intents,
            avg_conversation_steps=metrics.avg_conversation_steps,
        )

    @strawberry.field
    @require_auth
    async def message_metrics(
        self,
        info: Info[GraphQLContext, None],
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> MessageMetricsType:
        """Get message analytics"""
        context: GraphQLContext = info.context

        if not end_date:
            end_date = datetime.utcnow()
        if not start_date:
            start_date = end_date - timedelta(days=30)

        service = AnalyticsService(context.db)
        metrics = await service.get_message_metrics(
            context.organization_id, start_date, end_date
        )

        return MessageMetricsType(
            total_messages_sent=metrics.total_messages_sent,
            total_messages_received=metrics.total_messages_received,
            messages_by_type=metrics.messages_by_type,
            avg_messages_per_day=metrics.avg_messages_per_day,
            peak_messaging_hours=metrics.peak_messaging_hours,
            message_delivery_rate=metrics.message_delivery_rate,
            message_read_rate=metrics.message_read_rate,
        )

    # ============================================
    # TIME SERIES
    # ============================================

    @strawberry.field
    @require_auth
    async def messages_time_series(
        self,
        info: Info[GraphQLContext, None],
        start_date: datetime,
        end_date: datetime,
        granularity: str = "day",
    ) -> TimeSeriesDataType:
        """Get message volume time series"""
        context: GraphQLContext = info.context

        service = AnalyticsService(context.db)
        time_series = await service.get_messages_time_series(
            context.organization_id, start_date, end_date, granularity
        )

        data_points = [
            TimeSeriesDataPointType(
                timestamp=dp.timestamp,
                value=dp.value,
                label=dp.label,
            )
            for dp in time_series.data_points
        ]

        return TimeSeriesDataType(
            metric_name=time_series.metric_name,
            data_points=data_points,
            total=time_series.total,
            average=time_series.average,
        )

    # ============================================
    # REPORTS
    # ============================================

    @strawberry.field
    @require_auth
    async def full_report(
        self,
        info: Info[GraphQLContext, None],
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> FullReportType:
        """Generate comprehensive analytics report"""
        context: GraphQLContext = info.context

        if not end_date:
            end_date = datetime.utcnow()
        if not start_date:
            start_date = end_date - timedelta(days=30)

        service = AnalyticsService(context.db)
        report = await service.generate_full_report(
            context.organization_id, start_date, end_date
        )

        # Convert period
        period = ReportPeriodType(
            start_date=report.period.start_date,
            end_date=report.period.end_date,
            period_type=report.period.period_type,
        )

        # Convert overview
        overview = OverviewMetricsType(
            total_contacts=report.overview.total_contacts,
            new_contacts_today=report.overview.new_contacts_today,
            new_contacts_this_week=report.overview.new_contacts_this_week,
            new_contacts_this_month=report.overview.new_contacts_this_month,
            total_conversations=report.overview.total_conversations,
            active_conversations=report.overview.active_conversations,
            new_conversations_today=report.overview.new_conversations_today,
            avg_response_time_seconds=report.overview.avg_response_time_seconds,
            total_messages_sent=report.overview.total_messages_sent,
            total_messages_received=report.overview.total_messages_received,
            messages_sent_today=report.overview.messages_sent_today,
            messages_received_today=report.overview.messages_received_today,
            total_campaigns=report.overview.total_campaigns,
            active_campaigns=report.overview.active_campaigns,
            scheduled_campaigns=report.overview.scheduled_campaigns,
            total_chatbots=report.overview.total_chatbots,
            active_chatbots=report.overview.active_chatbots,
            total_agents=report.overview.total_agents,
            agents_online=report.overview.agents_online,
        )

        # Convert conversations
        conversations = ConversationMetricsType(
            total_conversations=report.conversations.total_conversations,
            active_conversations=report.conversations.active_conversations,
            closed_conversations=report.conversations.closed_conversations,
            avg_conversation_duration_seconds=report.conversations.avg_conversation_duration_seconds,
            avg_messages_per_conversation=report.conversations.avg_messages_per_conversation,
            avg_response_time_seconds=report.conversations.avg_response_time_seconds,
            first_response_time_seconds=report.conversations.first_response_time_seconds,
            resolution_rate=report.conversations.resolution_rate,
            conversations_by_status=report.conversations.conversations_by_status,
            conversations_by_channel=report.conversations.conversations_by_channel,
            peak_hours=report.conversations.peak_hours,
        )

        # Convert agents
        top_performers = [
            AgentPerformanceType(
                agent_id=strawberry.ID(perf.agent_id),
                agent_name=perf.agent_name,
                total_conversations=perf.total_conversations,
                active_conversations=perf.active_conversations,
                closed_conversations=perf.closed_conversations,
                avg_response_time_seconds=perf.avg_response_time_seconds,
                avg_resolution_time_seconds=perf.avg_resolution_time_seconds,
                satisfaction_score=perf.satisfaction_score,
                messages_sent=perf.messages_sent,
                online_time_hours=perf.online_time_hours,
            )
            for perf in report.agents.top_performers
        ]

        agents = AgentMetricsType(
            total_agents=report.agents.total_agents,
            agents_online=report.agents.agents_online,
            agents_away=report.agents.agents_away,
            agents_offline=report.agents.agents_offline,
            top_performers=top_performers,
            avg_conversations_per_agent=report.agents.avg_conversations_per_agent,
            avg_response_time_seconds=report.agents.avg_response_time_seconds,
        )

        # Convert campaigns
        campaigns = CampaignMetricsType(
            total_campaigns=report.campaigns.total_campaigns,
            active_campaigns=report.campaigns.active_campaigns,
            completed_campaigns=report.campaigns.completed_campaigns,
            total_messages_sent=report.campaigns.total_messages_sent,
            total_messages_delivered=report.campaigns.total_messages_delivered,
            total_messages_read=report.campaigns.total_messages_read,
            total_messages_failed=report.campaigns.total_messages_failed,
            avg_delivery_rate=report.campaigns.avg_delivery_rate,
            avg_read_rate=report.campaigns.avg_read_rate,
            avg_reply_rate=report.campaigns.avg_reply_rate,
            total_cost=report.campaigns.total_cost,
            roi=report.campaigns.roi,
        )

        # Convert contacts
        contacts = ContactMetricsType(
            total_contacts=report.contacts.total_contacts,
            new_contacts_today=report.contacts.new_contacts_today,
            new_contacts_this_week=report.contacts.new_contacts_this_week,
            new_contacts_this_month=report.contacts.new_contacts_this_month,
            active_contacts=report.contacts.active_contacts,
            blocked_contacts=report.contacts.blocked_contacts,
            opted_out_contacts=report.contacts.opted_out_contacts,
            contacts_by_source=report.contacts.contacts_by_source,
            contacts_by_lifecycle_stage=report.contacts.contacts_by_lifecycle_stage,
            avg_engagement_score=report.contacts.avg_engagement_score,
            top_tags=report.contacts.top_tags,
        )

        # Convert chatbots
        chatbots = ChatbotMetricsType(
            total_chatbots=report.chatbots.total_chatbots,
            active_chatbots=report.chatbots.active_chatbots,
            total_bot_conversations=report.chatbots.total_bot_conversations,
            total_bot_messages=report.chatbots.total_bot_messages,
            avg_completion_rate=report.chatbots.avg_completion_rate,
            handoff_rate=report.chatbots.handoff_rate,
            top_intents=report.chatbots.top_intents,
            avg_conversation_steps=report.chatbots.avg_conversation_steps,
        )

        # Convert messages
        messages = MessageMetricsType(
            total_messages_sent=report.messages.total_messages_sent,
            total_messages_received=report.messages.total_messages_received,
            messages_by_type=report.messages.messages_by_type,
            avg_messages_per_day=report.messages.avg_messages_per_day,
            peak_messaging_hours=report.messages.peak_messaging_hours,
            message_delivery_rate=report.messages.message_delivery_rate,
            message_read_rate=report.messages.message_read_rate,
        )

        return FullReportType(
            period=period,
            overview=overview,
            conversations=conversations,
            agents=agents,
            campaigns=campaigns,
            contacts=contacts,
            chatbots=chatbots,
            messages=messages,
            generated_at=report.generated_at,
        )
