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


@router.get(
    "/overview",
    response_model=OverviewMetrics,
    summary="Métricas do dashboard",
    description="Retorna métricas de alto nível para o dashboard da organização.",
    responses={
        200: {"description": "Métricas de overview"},
        401: {"description": "Não autenticado"}
    }
)
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


@router.get(
    "/conversations",
    response_model=ConversationMetrics,
    summary="Métricas de conversas",
    description="Retorna métricas detalhadas de conversas para o período especificado.",
    responses={
        200: {"description": "Métricas de conversas"},
        401: {"description": "Não autenticado"}
    }
)
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


@router.get(
    "/agents",
    response_model=AgentMetrics,
    summary="Métricas de agentes",
    description="Retorna métricas de performance dos agentes incluindo top performers.",
    responses={
        200: {"description": "Métricas de agentes"},
        401: {"description": "Não autenticado"}
    }
)
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


@router.get(
    "/campaigns",
    response_model=CampaignMetrics,
    summary="Métricas de campanhas",
    description="Retorna métricas de performance das campanhas incluindo taxas de entrega e engajamento.",
    responses={
        200: {"description": "Métricas de campanhas"},
        401: {"description": "Não autenticado"}
    }
)
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


@router.get(
    "/contacts",
    response_model=ContactMetrics,
    summary="Métricas de contatos",
    description="Retorna métricas de crescimento e segmentação de contatos.",
    responses={
        200: {"description": "Métricas de contatos"},
        401: {"description": "Não autenticado"}
    }
)
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


@router.get(
    "/chatbots",
    response_model=ChatbotMetrics,
    summary="Métricas de chatbots",
    description="Retorna métricas de performance e uso dos chatbots.",
    responses={
        200: {"description": "Métricas de chatbots"},
        401: {"description": "Não autenticado"}
    }
)
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


@router.get(
    "/messages",
    response_model=MessageMetrics,
    summary="Métricas de mensagens",
    description="Retorna métricas de volume e entrega de mensagens.",
    responses={
        200: {"description": "Métricas de mensagens"},
        401: {"description": "Não autenticado"}
    }
)
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


@router.get(
    "/time-series/messages",
    response_model=TimeSeriesData,
    summary="Série temporal de mensagens",
    description="Retorna contagem de mensagens ao longo do tempo com granularidade especificada.",
    responses={
        200: {"description": "Dados de série temporal"},
        401: {"description": "Não autenticado"}
    }
)
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


@router.get(
    "/reports/full",
    response_model=FullReport,
    summary="Relatório completo",
    description="Gera relatório analítico completo com todas as métricas para o período especificado.",
    responses={
        200: {"description": "Relatório completo"},
        401: {"description": "Não autenticado"}
    }
)
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
