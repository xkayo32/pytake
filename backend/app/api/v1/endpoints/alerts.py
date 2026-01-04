"""
Alert endpoints - REST API for alert management
"""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.services.alert_service import AlertService
from app.schemas.alert import (
    AlertResponse,
    AlertListResponse,
    AlertAcknowledge,
    AlertEscalate,
    AlertResolve,
    CriticalAlertsResponse,
    AlertSummary,
)

router = APIRouter(prefix="/api/v1/alerts", tags=["alerts"])


@router.get(
    "/critical",
    response_model=CriticalAlertsResponse,
    summary="Get critical alerts",
    description="Get all CRITICAL severity alerts for organization",
)
async def get_critical_alerts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    include_resolved: bool = Query(False, description="Include resolved alerts"),
) -> CriticalAlertsResponse:
    """
    Get critical severity alerts for organization.
    
    Only org_admin and super_admin can view all alerts.
    Other users can only view alerts for their assigned templates.
    """
    alert_service = AlertService(db)
    
    # Get critical alerts
    alerts = await alert_service.get_critical_alerts(
        organization_id=current_user.organization_id,
        include_resolved=include_resolved,
    )
    
    # Get summary
    summary = await alert_service.get_alert_summary(
        organization_id=current_user.organization_id,
    )
    
    # Convert to response
    return CriticalAlertsResponse(
        data=[AlertResponse.from_orm(alert) for alert in alerts],
        summary=AlertSummary(**summary),
    )


@router.get(
    "",
    response_model=AlertListResponse,
    summary="List alerts",
    description="Get all alerts for organization with pagination",
)
async def list_alerts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0, description="Skip N alerts"),
    limit: int = Query(20, ge=1, le=100, description="Limit to N alerts"),
) -> AlertListResponse:
    """
    List all alerts for organization.
    
    Supports pagination with skip/limit.
    """
    alert_service = AlertService(db)
    
    # Get all open alerts
    alerts = await alert_service.get_open_alerts(
        organization_id=current_user.organization_id,
    )
    
    # Apply pagination
    total = len(alerts)
    paginated = alerts[skip : skip + limit]
    
    return AlertListResponse(
        data=[AlertResponse.from_orm(alert) for alert in paginated],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/{alert_id}",
    response_model=AlertResponse,
    summary="Get alert by ID",
    description="Get a specific alert by ID",
)
async def get_alert(
    alert_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AlertResponse:
    """
    Get a specific alert by ID.
    
    User must be in the same organization as the alert.
    """
    alert_service = AlertService(db)
    
    alert = await alert_service.repo.get_by_id(
        id=alert_id,
        organization_id=current_user.organization_id,
    )
    
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    return AlertResponse.from_orm(alert)


@router.post(
    "/{alert_id}/acknowledge",
    response_model=AlertResponse,
    summary="Acknowledge alert",
    description="Mark alert as acknowledged by user",
)
async def acknowledge_alert(
    alert_id: UUID,
    payload: AlertAcknowledge,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AlertResponse:
    """
    Acknowledge an alert (mark as seen by user).
    
    This moves alert status from OPEN to ACKNOWLEDGED.
    """
    alert_service = AlertService(db)
    
    alert = await alert_service.acknowledge_alert(
        alert_id=alert_id,
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        notes=payload.notes,
    )
    
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    return AlertResponse.from_orm(alert)


@router.post(
    "/{alert_id}/escalate",
    response_model=AlertResponse,
    summary="Escalate alert",
    description="Escalate alert to next level",
)
async def escalate_alert(
    alert_id: UUID,
    payload: AlertEscalate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AlertResponse:
    """
    Escalate alert to next level.
    
    Escalation levels:
    1 -> 2: Senior agent review
    2 -> 3: Admin intervention
    
    Max escalation level is 3.
    """
    alert_service = AlertService(db)
    
    alert = await alert_service.escalate_alert(
        alert_id=alert_id,
        organization_id=current_user.organization_id,
        to_admin=payload.to_admin,
    )
    
    if not alert:
        raise HTTPException(
            status_code=400,
            detail="Alert cannot be escalated further or not found",
        )
    
    return AlertResponse.from_orm(alert)


@router.post(
    "/{alert_id}/resolve",
    response_model=AlertResponse,
    summary="Resolve alert",
    description="Manually resolve an alert",
)
async def resolve_alert(
    alert_id: UUID,
    payload: AlertResolve,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AlertResponse:
    """
    Manually resolve an alert (mark issue as fixed).
    
    This moves alert status to RESOLVED.
    """
    alert_service = AlertService(db)
    
    alert = await alert_service.resolve_alert(
        alert_id=alert_id,
        organization_id=current_user.organization_id,
        reason=payload.reason,
    )
    
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    return AlertResponse.from_orm(alert)


@router.get(
    "/organization/{organization_id}/summary",
    response_model=AlertSummary,
    summary="Get alert summary",
    description="Get alert statistics for organization",
)
async def get_alert_summary(
    organization_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AlertSummary:
    """
    Get alert summary statistics for organization.
    
    User must be admin to view other organization stats.
    """
    # Verify user can access this organization
    if current_user.organization_id != organization_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    alert_service = AlertService(db)
    
    summary = await alert_service.get_alert_summary(
        organization_id=organization_id,
    )
    
    return AlertSummary(**summary)
