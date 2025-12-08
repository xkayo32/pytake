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
    Get dashboard summary metrics for organization.

    Returns aggregated metrics for the organization dashboard, including
    conversation statistics, messaging volume, agent activity, and recent trends.

    **Path Parameters:** None

    **Query Parameters:** None

    **Returns:**
    - total_conversations (int): Total conversations in organization
    - total_messages (int): Total messages across all conversations
    - active_agents (int): Number of agents currently active
    - active_conversations (int): Conversations with status 'active'
    - pending_conversations (int): Conversations awaiting assignment
    - messages_today (int): Messages sent today
    - avg_response_time (float): Average agent response time in seconds
    - avg_resolution_time (float): Average conversation resolution time
    - customer_satisfaction (float): Average CSAT score (0-5)
    - last_updated (datetime): Timestamp of metrics calculation

    **Example Request:**
    ```
    GET /api/v1/analytics/dashboard/summary
    Authorization: Bearer eyJhbGc...
    ```

    **Example Response:**
    ```json
    {
        "total_conversations": 15487,
        "total_messages": 523891,
        "active_agents": 12,
        "active_conversations": 247,
        "pending_conversations": 43,
        "messages_today": 8923,
        "avg_response_time": 127.5,
        "avg_resolution_time": 3421.8,
        "customer_satisfaction": 4.6,
        "last_updated": "2025-01-15T14:32:00Z"
    }
    ```

    **Permissions:**
    - Requires: Authenticated user (any role)
    - Scoped to: Organization (organization_id from current user)
    - Note: All organization members can view dashboard metrics

    **Error Codes:**
    - 401: Unauthorized (invalid or missing token)
    - 403: Forbidden (user not in organization)
    - 500: Server error (analytics calculation failure)

    **Performance Notes:**
    - Response cached for 60 seconds to reduce database load
    - Suitable for real-time dashboard display
    - Metrics updated every 5 minutes in background

    **Author:** Kayo Carvalho Fernandes
    """
    service = AnalyticsService(db)
    metrics = await service.get_overview_metrics(current_user.organization_id)
    return metrics
