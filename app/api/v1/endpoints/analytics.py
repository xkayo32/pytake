"""
Analytics endpoints - Metrics, reports, and business intelligence
"""

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.analytics import (
    AgentMetrics,
    CampaignMetrics,
    ChatbotMetrics,
    ContactMetrics,
    ConversationMetrics,
    FullReport,
    MessageMetrics,
    OverviewMetrics,
    TimeSeriesData,
)
from app.services.analytics_service import AnalyticsService

router = APIRouter()


# ============================================
# OVERVIEW DASHBOARD
# ============================================


@router.get("/overview", response_model=OverviewMetrics)
async def get_overview_metrics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get overview dashboard metrics

    Returns high-level metrics for the organization dashboard.
    """
    service = AnalyticsService(db)
    metrics = await service.get_overview_metrics(current_user.organization_id)
    return metrics


# ============================================
# SPECIFIC METRICS
# ============================================


@router.get("/conversations", response_model=ConversationMetrics)
async def get_conversation_metrics(
    start_date: datetime = Query(None, description="Start date (defaults to 30 days ago)"),
    end_date: datetime = Query(None, description="End date (defaults to now)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get conversation analytics

    Returns detailed conversation metrics for the specified period.
    """
    if not end_date:
        end_date = datetime.utcnow()
    if not start_date:
        start_date = end_date - timedelta(days=30)

    service = AnalyticsService(db)
    metrics = await service.get_conversation_metrics(
        current_user.organization_id, start_date, end_date
    )
    return metrics


@router.get("/agents", response_model=AgentMetrics)
async def get_agent_metrics(
    start_date: datetime = Query(None, description="Start date (defaults to 30 days ago)"),
    end_date: datetime = Query(None, description="End date (defaults to now)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get agent performance analytics

    Returns agent metrics including top performers.
    """
    if not end_date:
        end_date = datetime.utcnow()
    if not start_date:
        start_date = end_date - timedelta(days=30)

    service = AnalyticsService(db)
    metrics = await service.get_agent_metrics(
        current_user.organization_id, start_date, end_date
    )
    return metrics


@router.get("/campaigns", response_model=CampaignMetrics)
async def get_campaign_metrics(
    start_date: datetime = Query(None, description="Start date (defaults to 30 days ago)"),
    end_date: datetime = Query(None, description="End date (defaults to now)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get campaign analytics

    Returns campaign performance metrics including delivery and engagement rates.
    """
    if not end_date:
        end_date = datetime.utcnow()
    if not start_date:
        start_date = end_date - timedelta(days=30)

    service = AnalyticsService(db)
    metrics = await service.get_campaign_metrics(
        current_user.organization_id, start_date, end_date
    )
    return metrics


@router.get("/contacts", response_model=ContactMetrics)
async def get_contact_metrics(
    start_date: datetime = Query(None, description="Start date (defaults to 30 days ago)"),
    end_date: datetime = Query(None, description="End date (defaults to now)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get contact analytics

    Returns contact growth and segmentation metrics.
    """
    if not end_date:
        end_date = datetime.utcnow()
    if not start_date:
        start_date = end_date - timedelta(days=30)

    service = AnalyticsService(db)
    metrics = await service.get_contact_metrics(
        current_user.organization_id, start_date, end_date
    )
    return metrics


@router.get("/chatbots", response_model=ChatbotMetrics)
async def get_chatbot_metrics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get chatbot analytics

    Returns chatbot performance and usage metrics.
    """
    service = AnalyticsService(db)
    metrics = await service.get_chatbot_metrics(current_user.organization_id)
    return metrics


@router.get("/messages", response_model=MessageMetrics)
async def get_message_metrics(
    start_date: datetime = Query(None, description="Start date (defaults to 30 days ago)"),
    end_date: datetime = Query(None, description="End date (defaults to now)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get message analytics

    Returns message volume and delivery metrics.
    """
    if not end_date:
        end_date = datetime.utcnow()
    if not start_date:
        start_date = end_date - timedelta(days=30)

    service = AnalyticsService(db)
    metrics = await service.get_message_metrics(
        current_user.organization_id, start_date, end_date
    )
    return metrics


# ============================================
# TIME SERIES
# ============================================


@router.get("/time-series/messages", response_model=TimeSeriesData)
async def get_messages_time_series(
    start_date: datetime = Query(..., description="Start date"),
    end_date: datetime = Query(..., description="End date"),
    granularity: str = Query("day", description="Granularity: hour, day, week, month"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get message volume time series

    Returns message count over time with specified granularity.
    """
    service = AnalyticsService(db)
    time_series = await service.get_messages_time_series(
        current_user.organization_id, start_date, end_date, granularity
    )
    return time_series


# ============================================
# REPORTS
# ============================================


@router.get("/reports/full", response_model=FullReport)
async def generate_full_report(
    start_date: datetime = Query(None, description="Start date (defaults to 30 days ago)"),
    end_date: datetime = Query(None, description="End date (defaults to now)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Generate comprehensive analytics report

    Returns complete analytics report with all metrics for the specified period.
    """
    if not end_date:
        end_date = datetime.utcnow()
    if not start_date:
        start_date = end_date - timedelta(days=30)

    service = AnalyticsService(db)
    report = await service.generate_full_report(
        current_user.organization_id, start_date, end_date
    )
    return report
