"""
Dashboard endpoints - Summary and statistics for main dashboard
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.analytics import OverviewMetrics
from app.services.analytics_service import AnalyticsService

router = APIRouter()


@router.get("/summary", response_model=OverviewMetrics)
async def get_dashboard_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get dashboard summary metrics

    Returns aggregated metrics for the organization dashboard.
    This endpoint provides:
    - Total conversations
    - Total messages
    - Active agents
    - Recent activity

    Author: Kayo Carvalho Fernandes
    """
    service = AnalyticsService(db)
    metrics = await service.get_overview_metrics(current_user.organization_id)
    return metrics
