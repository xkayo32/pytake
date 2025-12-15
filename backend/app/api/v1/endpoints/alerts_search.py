"""
Advanced Search Endpoints - Using AlertQueryService
- Complex filtering with multiple conditions
- Full-text search
- Sorting and pagination
- Faceted search
"""

from typing import Optional, List
from uuid import UUID

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.services.alert_query_service import (
    AlertQueryService,
    SortField,
    SortOrder,
)
from app.core.rate_limiter import get_rate_limiter
from app.core.cache import get_cache_manager

router = APIRouter(prefix="/api/v1/alerts-search", tags=["alerts-search"])


@router.get(
    "/advanced",
    summary="Advanced Alert Search",
    description="Search alerts with complex filtering, full-text search, sorting",
)
async def advanced_search(
    organization_id: UUID,
    severity: Optional[str] = Query(None, description="Comma-separated severity levels"),
    status: Optional[str] = Query(None, description="Comma-separated statuses"),
    alert_type: Optional[str] = Query(None, description="Comma-separated alert types"),
    template_id: Optional[UUID] = None,
    search: Optional[str] = Query(None, description="Full-text search in title/description"),
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    escalated: bool = False,
    unacknowledged: bool = False,
    sort_by: SortField = SortField.CREATED_AT,
    sort_order: SortOrder = SortOrder.DESC,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Advanced search with:
    - Multi-field filtering (severity, status, type)
    - Full-text search (title + description)
    - Date range filtering
    - Sorting by any field
    - Pagination with facet results
    """
    # Rate limit
    limiter = get_rate_limiter()
    allowed, metadata = await limiter.check_alert_endpoint_limit(str(organization_id))
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded",
            headers={"Retry-After": str(int(metadata['reset_at'].timestamp() - __import__('time').time()))},
        )

    # Parse comma-separated values
    severity_list = [s.strip() for s in severity.split(',')] if severity else None
    status_list = [s.strip() for s in status.split(',')] if status else None
    type_list = [t.strip() for t in alert_type.split(',')] if alert_type else None

    # Parse dates
    import dateutil.parser
    date_from_obj = None
    date_to_obj = None
    try:
        if date_from:
            date_from_obj = dateutil.parser.isoparse(date_from)
        if date_to:
            date_to_obj = dateutil.parser.isoparse(date_to)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid date format: {e}")

    # Perform search
    service = AlertQueryService(db)
    result = await service.search_alerts(
        organization_id=organization_id,
        severity=severity_list,
        status=status_list,
        alert_type=type_list,
        template_id=template_id,
        search_text=search,
        date_from=date_from_obj,
        date_to=date_to_obj,
        escalated=escalated,
        unacknowledged=unacknowledged,
        sort_by=sort_by,
        sort_order=sort_order,
        skip=skip,
        limit=limit,
    )

    return {
        'total': result['total'],
        'returned': result['returned'],
        'skip': skip,
        'limit': limit,
        'alerts': result['alerts'],
        'facets': result['facets'],
    }


@router.get(
    "/timeline",
    summary="Alert Timeline",
    description="Get alert creation timeline for specified days",
)
async def get_timeline(
    organization_id: UUID,
    days: int = Query(7, ge=1, le=90),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get alert creation timeline showing daily breakdown.
    Useful for trend visualization.
    """
    # Check cache first
    cache = get_cache_manager()
    cache_key = f"timeline:{organization_id}:{days}"
    
    # Note: Would need to implement cache.get() for real usage
    # For now, just query database
    
    service = AlertQueryService(db)
    timeline = await service.get_alert_timeline(
        organization_id=organization_id,
        days=days,
    )

    return {
        'organization_id': str(organization_id),
        'days': days,
        'timeline': timeline,
    }


@router.get(
    "/stats",
    summary="Alert Statistics",
    description="Comprehensive alert statistics and rates",
)
async def get_stats(
    organization_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get comprehensive alert statistics:
    - Total counts by status
    - Escalation rate
    - Resolution rate
    - Average response/resolution times
    """
    service = AlertQueryService(db)
    stats = await service.get_alert_stats(organization_id=organization_id)

    return {
        'organization_id': str(organization_id),
        'stats': stats,
    }


@router.get(
    "/{alert_id}/similar",
    summary="Find Similar Alerts",
    description="Find similar alerts based on template, severity, and date",
)
async def get_similar_alerts(
    alert_id: UUID,
    organization_id: UUID,
    limit: int = Query(5, ge=1, le=20),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Find similar alerts based on:
    - Same template
    - Same severity
    - Recent (last 7 days)
    """
    service = AlertQueryService(db)
    similar = await service.find_similar_alerts(
        alert_id=alert_id,
        organization_id=organization_id,
        limit=limit,
    )

    return {
        'alert_id': str(alert_id),
        'similar_count': len(similar),
        'similar_alerts': similar,
    }
