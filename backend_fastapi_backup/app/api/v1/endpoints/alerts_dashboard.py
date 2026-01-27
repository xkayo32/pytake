"""
Alert Dashboard endpoints - Advanced queries for dashboard UI
Includes: filtering, search, aggregation, trends, charts
"""

from typing import Optional, List
from datetime import datetime, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from sqlalchemy.sql import text

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.core.cache import get_cache_manager
from app.core.rate_limiter import get_rate_limiter
from app.models.alert import Alert, AlertStatus, AlertSeverity, AlertType
from app.services.alert_service import AlertService
from app.schemas.alert import AlertResponse

router = APIRouter(prefix="/api/v1/alerts-dashboard", tags=["alerts-dashboard"])


# ========================
# Advanced Filtering & Search
# ========================

class AlertFilter:
    """Filter model for advanced alert queries"""
    severity: Optional[List[AlertSeverity]] = None
    status: Optional[List[AlertStatus]] = None
    alert_type: Optional[List[AlertType]] = None
    template_id: Optional[UUID] = None
    search_query: Optional[str] = None
    created_after: Optional[datetime] = None
    created_before: Optional[datetime] = None
    acknowledged_only: bool = False
    escalated_only: bool = False


@router.get(
    "/search",
    response_model=dict,
    summary="Search alerts with advanced filters",
    description="Search and filter alerts by severity, status, type, date, and text",
)
async def search_alerts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    severity: Optional[str] = Query(None, description="Comma-separated severities (critical,high,warning,info)"),
    status: Optional[str] = Query(None, description="Comma-separated statuses (open,acknowledged,resolved,escalated)"),
    alert_type: Optional[str] = Query(None, description="Comma-separated alert types"),
    template_id: Optional[UUID] = Query(None, description="Filter by template ID"),
    search: Optional[str] = Query(None, description="Search in title and description"),
    created_after: Optional[datetime] = Query(None, description="Alerts created after this date"),
    created_before: Optional[datetime] = Query(None, description="Alerts created before this date"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
) -> dict:
    """
    Advanced alert search with multiple filters.
    
    Example: GET /api/v1/alerts-dashboard/search?severity=critical,high&status=open&search=template
    """
    stmt = select(Alert).where(
        Alert.organization_id == current_user.organization_id,
        Alert.deleted_at.is_(None)
    )
    
    # Filter by severity
    if severity:
        severity_list = [s.strip().upper() for s in severity.split(",")]
        stmt = stmt.where(Alert.severity.in_(severity_list))
    
    # Filter by status
    if status:
        status_list = [s.strip().upper() for s in status.split(",")]
        stmt = stmt.where(Alert.status.in_(status_list))
    
    # Filter by alert type
    if alert_type:
        type_list = [t.strip().lower() for t in alert_type.split(",")]
        stmt = stmt.where(Alert.alert_type.in_(type_list))
    
    # Filter by template
    if template_id:
        stmt = stmt.where(Alert.whatsapp_template_id == template_id)
    
    # Search in title and description
    if search:
        search_pattern = f"%{search}%"
        stmt = stmt.where(
            (Alert.title.ilike(search_pattern)) |
            (Alert.description.ilike(search_pattern))
        )
    
    # Date range filters
    if created_after:
        stmt = stmt.where(Alert.created_at >= created_after)
    
    if created_before:
        stmt = stmt.where(Alert.created_at <= created_before)
    
    # Order by created_at descending
    stmt = stmt.order_by(Alert.created_at.desc())
    
    # Get total count before pagination
    count_stmt = select(func.count(Alert.id)).where(
        Alert.organization_id == current_user.organization_id,
        Alert.deleted_at.is_(None)
    )
    count_result = await db.execute(count_stmt)
    total = count_result.scalar() or 0
    
    # Apply pagination
    stmt = stmt.offset(skip).limit(limit)
    result = await db.execute(stmt)
    alerts = result.scalars().all()
    
    return {
        "data": [AlertResponse.from_orm(alert) for alert in alerts],
        "total": total,
        "skip": skip,
        "limit": limit,
        "page": skip // limit + 1,
    }


# ========================
# Dashboard Statistics
# ========================

@router.get(
    "/stats/overview",
    response_model=dict,
    summary="Get alert overview statistics",
    description="Returns counts and percentages by severity and status",
)
async def get_alert_stats_overview(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Get high-level alert statistics for dashboard.
    
    Returns:
    - Total alert count
    - Breakdown by severity (critical, high, warning, info)
    - Breakdown by status (open, acknowledged, resolved, escalated)
    - Average time to resolution
    - Escalation rate
    """
    alert_service = AlertService(db)
    org_id = current_user.organization_id
    
    # Get counts by severity
    severity_stmt = select(
        Alert.severity,
        func.count(Alert.id).label("count")
    ).where(
        Alert.organization_id == org_id,
        Alert.deleted_at.is_(None)
    ).group_by(Alert.severity)
    
    severity_result = await db.execute(severity_stmt)
    severity_data = {row[0]: row[1] for row in severity_result}
    
    # Get counts by status
    status_stmt = select(
        Alert.status,
        func.count(Alert.id).label("count")
    ).where(
        Alert.organization_id == org_id,
        Alert.deleted_at.is_(None)
    ).group_by(Alert.status)
    
    status_result = await db.execute(status_stmt)
    status_data = {row[0]: row[1] for row in status_result}
    
    # Get counts by type
    type_stmt = select(
        Alert.alert_type,
        func.count(Alert.id).label("count")
    ).where(
        Alert.organization_id == org_id,
        Alert.deleted_at.is_(None)
    ).group_by(Alert.alert_type)
    
    type_result = await db.execute(type_stmt)
    type_data = {row[0]: row[1] for row in type_result}
    
    # Calculate totals
    total = sum(severity_data.values())
    total_resolved = status_data.get(AlertStatus.RESOLVED, 0)
    total_escalated = status_data.get(AlertStatus.ESCALATED, 0)
    
    return {
        "total": total,
        "by_severity": severity_data,
        "by_status": status_data,
        "by_type": type_data,
        "escalation_rate": (total_escalated / total * 100) if total > 0 else 0,
        "resolution_rate": (total_resolved / total * 100) if total > 0 else 0,
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.get(
    "/stats/trends",
    response_model=dict,
    summary="Get alert trends over time",
    description="Returns alert creation and resolution trends by day",
)
async def get_alert_trends(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    days: int = Query(7, ge=1, le=90, description="Number of days to analyze"),
) -> dict:
    """
    Get alert trends for the last N days.
    
    Returns daily counts of:
    - Alerts created
    - Alerts resolved
    - Alerts escalated
    - Average open time
    """
    org_id = current_user.organization_id
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Group by date and count
    stmt = select(
        func.date(Alert.created_at).label("date"),
        Alert.status,
        func.count(Alert.id).label("count")
    ).where(
        Alert.organization_id == org_id,
        Alert.created_at >= start_date,
        Alert.deleted_at.is_(None)
    ).group_by(
        func.date(Alert.created_at),
        Alert.status
    ).order_by(func.date(Alert.created_at))
    
    result = await db.execute(stmt)
    rows = result.all()
    
    # Reorganize data by date
    trends_dict = {}
    for date, status, count in rows:
        date_str = str(date)
        if date_str not in trends_dict:
            trends_dict[date_str] = {
                "created": 0,
                "resolved": 0,
                "escalated": 0,
                "acknowledged": 0,
                "open": 0,
            }
        
        status_key = status.lower()
        if status_key in trends_dict[date_str]:
            trends_dict[date_str][status_key] = count
    
    # Fill in missing dates
    current_date = start_date.date()
    all_dates = []
    while current_date <= datetime.utcnow().date():
        date_str = str(current_date)
        if date_str not in trends_dict:
            trends_dict[date_str] = {
                "created": 0,
                "resolved": 0,
                "escalated": 0,
                "acknowledged": 0,
                "open": 0,
            }
        all_dates.append(date_str)
        current_date += timedelta(days=1)
    
    return {
        "period_days": days,
        "start_date": start_date.isoformat(),
        "end_date": datetime.utcnow().isoformat(),
        "trends": [
            {
                "date": date,
                **trends_dict[date]
            }
            for date in sorted(trends_dict.keys())
        ],
    }


@router.get(
    "/stats/severity-distribution",
    response_model=dict,
    summary="Get alert severity distribution",
    description="Returns percentage breakdown of alerts by severity",
)
async def get_severity_distribution(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Get severity distribution for pie chart.
    
    Returns percentage of each severity level.
    """
    stmt = select(
        Alert.severity,
        func.count(Alert.id).label("count")
    ).where(
        Alert.organization_id == current_user.organization_id,
        Alert.deleted_at.is_(None)
    ).group_by(Alert.severity)
    
    result = await db.execute(stmt)
    severity_counts = {row[0]: row[1] for row in result}
    
    total = sum(severity_counts.values())
    
    data = [
        {
            "severity": severity,
            "count": count,
            "percentage": (count / total * 100) if total > 0 else 0,
            "color": get_severity_color(severity),
        }
        for severity, count in severity_counts.items()
    ]
    
    return {
        "total": total,
        "distribution": sorted(data, key=lambda x: x["count"], reverse=True),
    }


@router.get(
    "/stats/status-distribution",
    response_model=dict,
    summary="Get alert status distribution",
    description="Returns breakdown of alerts by current status",
)
async def get_status_distribution(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Get status distribution for donut chart.
    
    Returns count of each status.
    """
    stmt = select(
        Alert.status,
        func.count(Alert.id).label("count")
    ).where(
        Alert.organization_id == current_user.organization_id,
        Alert.deleted_at.is_(None)
    ).group_by(Alert.status)
    
    result = await db.execute(stmt)
    status_counts = {row[0]: row[1] for row in result}
    
    total = sum(status_counts.values())
    
    data = [
        {
            "status": status,
            "count": count,
            "percentage": (count / total * 100) if total > 0 else 0,
            "color": get_status_color(status),
        }
        for status, count in status_counts.items()
    ]
    
    return {
        "total": total,
        "distribution": sorted(data, key=lambda x: x["count"], reverse=True),
    }


@router.get(
    "/stats/type-distribution",
    response_model=dict,
    summary="Get alert type distribution",
    description="Returns breakdown of alerts by type",
)
async def get_type_distribution(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Get alert type distribution.
    
    Returns count of each alert type.
    """
    stmt = select(
        Alert.alert_type,
        func.count(Alert.id).label("count")
    ).where(
        Alert.organization_id == current_user.organization_id,
        Alert.deleted_at.is_(None)
    ).group_by(Alert.alert_type)
    
    result = await db.execute(stmt)
    type_counts = {row[0]: row[1] for row in result}
    
    total = sum(type_counts.values())
    
    data = [
        {
            "type": alert_type,
            "count": count,
            "percentage": (count / total * 100) if total > 0 else 0,
        }
        for alert_type, count in type_counts.items()
    ]
    
    return {
        "total": total,
        "distribution": sorted(data, key=lambda x: x["count"], reverse=True),
    }


@router.get(
    "/recent",
    response_model=dict,
    summary="Get recent alerts",
    description="Returns most recently created/updated alerts",
)
async def get_recent_alerts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(10, ge=1, le=50),
) -> dict:
    """
    Get most recent alerts for dashboard feed.
    
    Useful for "Recent Activity" widget.
    """
    stmt = select(Alert).where(
        Alert.organization_id == current_user.organization_id,
        Alert.deleted_at.is_(None)
    ).order_by(
        Alert.updated_at.desc()
    ).limit(limit)
    
    result = await db.execute(stmt)
    alerts = result.scalars().all()
    
    return {
        "data": [AlertResponse.from_orm(alert) for alert in alerts],
        "total": len(alerts),
    }


@router.get(
    "/escalated",
    response_model=dict,
    summary="Get escalated alerts",
    description="Returns alerts that have been escalated",
)
async def get_escalated_alerts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
) -> dict:
    """
    Get escalated alerts for priority view.
    
    Shows alerts that were escalated to higher levels.
    """
    stmt = select(Alert).where(
        Alert.organization_id == current_user.organization_id,
        Alert.status == AlertStatus.ESCALATED,
        Alert.deleted_at.is_(None)
    ).order_by(
        Alert.escalation_level.desc(),
        Alert.created_at.desc()
    )
    
    count_result = await db.execute(
        select(func.count(Alert.id)).where(
            Alert.organization_id == current_user.organization_id,
            Alert.status == AlertStatus.ESCALATED,
            Alert.deleted_at.is_(None)
        )
    )
    total = count_result.scalar() or 0
    
    stmt = stmt.offset(skip).limit(limit)
    result = await db.execute(stmt)
    alerts = result.scalars().all()
    
    return {
        "data": [AlertResponse.from_orm(alert) for alert in alerts],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.get(
    "/unacknowledged",
    response_model=dict,
    summary="Get unacknowledged alerts",
    description="Returns alerts that haven't been acknowledged yet",
)
async def get_unacknowledged_alerts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
) -> dict:
    """
    Get unacknowledged alerts for priority view.
    
    Shows new alerts that need attention.
    """
    stmt = select(Alert).where(
        Alert.organization_id == current_user.organization_id,
        Alert.acknowledged_at.is_(None),
        Alert.deleted_at.is_(None)
    ).order_by(
        Alert.created_at.desc()
    )
    
    count_result = await db.execute(
        select(func.count(Alert.id)).where(
            Alert.organization_id == current_user.organization_id,
            Alert.acknowledged_at.is_(None),
            Alert.deleted_at.is_(None)
        )
    )
    total = count_result.scalar() or 0
    
    stmt = stmt.offset(skip).limit(limit)
    result = await db.execute(stmt)
    alerts = result.scalars().all()
    
    return {
        "data": [AlertResponse.from_orm(alert) for alert in alerts],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


# ========================
# Helper Functions
# ========================

def get_severity_color(severity: str) -> str:
    """Get color code for severity level for charts"""
    colors = {
        AlertSeverity.CRITICAL: "#d32f2f",  # Red
        AlertSeverity.WARNING: "#ff9800",   # Orange
        AlertSeverity.INFO: "#388e3c",      # Green
    }
    return colors.get(severity, "#757575")  # Gray default


def get_status_color(status: str) -> str:
    """Get color code for status for charts"""
    colors = {
        AlertStatus.OPEN: "#ff5722",        # Deep orange
        AlertStatus.ACKNOWLEDGED: "#ff9800", # Orange
        AlertStatus.ESCALATED: "#d32f2f",  # Red
        AlertStatus.RESOLVED: "#388e3c",   # Green
    }
    return colors.get(status, "#757575")    # Gray default
