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
    
    **Returns:** High-level metrics for the organization dashboard
    
    **Metrics Included:**
    - Total conversations
    - Total messages sent/received
    - Active agents
    - Connected WhatsApp numbers
    - Average response time
    
    **Example Response:**
    ```json
    {
      "total_conversations": 150,
      "total_messages": 3500,
      "active_agents": 5,
      "connected_channels": 2,
      "avg_response_time_seconds": 45.5
    }
    ```
    """
    service = AnalyticsService(db)
    metrics = await service.get_overview_metrics(current_user.organization_id)
    return metrics


# ============================================
# SPECIFIC METRICS
# ============================================


@router.get("/conversations", response_model=ConversationMetrics)
async def get_conversation_metrics(
    start_date: datetime = Query(
        None, 
        description="Data de início (padrão: 30 dias atrás). Formato: ISO 8601 (ex: 2025-12-08T00:00:00Z)"
    ),
    end_date: datetime = Query(
        None,
        description="Data de fim (padrão: agora). Formato: ISO 8601 (ex: 2025-12-08T23:59:59Z)"
    ),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get conversation analytics with detailed metrics
    
    **Query Parameters:**
    - `start_date` (datetime, optional): Data inicial (padrão: 30 dias atrás). Formato: ISO 8601
    - `end_date` (datetime, optional): Data final (padrão: agora). Formato: ISO 8601
    
    **Returns:** Detailed conversation metrics for the specified period
    
    **Metrics Included:**
    - Total conversations
    - Conversations by status (open, pending, resolved, closed)
    - Average resolution time
    - Conversation volume trends
    
    **Example Request:**
    ```
    GET /api/v1/analytics/conversations?start_date=2025-11-08T00:00:00Z&end_date=2025-12-08T23:59:59Z
    ```
    
    **Example Response:**
    ```json
    {
      "period": {
        "start_date": "2025-11-08T00:00:00Z",
        "end_date": "2025-12-08T23:59:59Z"
      },
      "total": 150,
      "by_status": {
        "open": 25,
        "pending": 10,
        "resolved": 100,
        "closed": 15
      },
      "avg_resolution_time_minutes": 125
    }
    ```
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


@router.get("/conversations/hourly", response_model=TimeSeriesData)
async def get_conversations_hourly(
    granularity: str = Query(
        "hour", 
        description="Granularidade temporal: 'hour' (horária) ou 'day' (diária)"
    ),
    start_date: datetime = Query(
        None, 
        description="Data de início (padrão: 24 horas atrás). Formato: ISO 8601"
    ),
    end_date: datetime = Query(
        None,
        description="Data de fim (padrão: agora). Formato: ISO 8601"
    ),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get conversation volume time series by hour or day
    
    **Query Parameters:**
    - `granularity` (string, default: "hour"): Intervalo de tempo: "hour" (horária) ou "day" (diária)
    - `start_date` (datetime, optional): Data inicial (padrão: 24 horas atrás)
    - `end_date` (datetime, optional): Data final (padrão: agora)
    
    **Returns:** Time series data with conversation counts per period
    
    **Example Request:**
    ```
    GET /api/v1/analytics/conversations/hourly?granularity=hour&start_date=2025-12-08T00:00:00Z&end_date=2025-12-09T00:00:00Z
    ```
    
    **Example Response:**
    ```json
    {
      "metric_name": "conversations",
      "data_points": [
        {
          "timestamp": "2025-12-08T00:00:00Z",
          "value": 12
        },
        {
          "timestamp": "2025-12-08T01:00:00Z",
          "value": 18
        }
      ],
      "total": 200,
      "average": 15.5
    }
    ```
    """
    if not end_date:
        end_date = datetime.utcnow()
    if not start_date:
        start_date = end_date - timedelta(days=1)

    service = AnalyticsService(db)
    time_series = await service.get_conversations_time_series(
        current_user.organization_id, start_date, end_date, granularity
    )
    return time_series


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
