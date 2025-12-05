"""
Notification API endpoints
Manages user notification preferences and notification history
"""

import logging
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.services.notification_service import NotificationService
from app.schemas.notification import (
    NotificationPreferenceResponse,
    NotificationPreferenceUpdate,
    NotificationLogResponse,
)

router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"],
)
logger = logging.getLogger(__name__)


# ==================== Preferences ====================

@router.get(
    "/preferences",
    response_model=NotificationPreferenceResponse,
    summary="Get notification preferences",
    description="Get notification preferences for the current user in the organization",
)
async def get_preferences(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get notification preferences for current user"""
    service = NotificationService(db)
    return await service.get_preferences(current_user.id, current_user.organization_id)


@router.put(
    "/preferences",
    response_model=NotificationPreferenceResponse,
    summary="Update notification preferences",
    description="Update notification preferences for the current user",
)
async def update_preferences(
    data: NotificationPreferenceUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update notification preferences"""
    service = NotificationService(db)
    return await service.update_preferences(
        current_user.id,
        current_user.organization_id,
        data,
    )


# ==================== Notifications ====================

@router.get(
    "",
    response_model=list[NotificationLogResponse],
    summary="List notifications",
    description="Get list of notifications for the current user",
)
async def list_notifications(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status: Optional[str] = Query(None, description="Filter by status (sent, read, failed)"),
    channel: Optional[str] = Query(None, description="Filter by channel (email, websocket, in_app)"),
    current_user: User = Depends(get_current_user),
    
    db: AsyncSession = Depends(get_db),
):
    """List notifications with optional filters"""
    service = NotificationService(db)
    return await service.list_notifications(
        user_id=current_user.id,
        organization_id=current_user.organization_id,
        skip=skip,
        limit=limit,
        status=status,
        channel=channel,
    )


@router.get(
    "/unread-count",
    summary="Get unread notification count",
    description="Get count of unread notifications for the current user",
)
async def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get unread notification count"""
    service = NotificationService(db)
    count = await service.get_unread_count(current_user.id, current_user.organization_id)
    return {"unread_count": count}


@router.get(
    "/{notification_id}",
    response_model=NotificationLogResponse,
    summary="Get notification by ID",
    description="Get a specific notification by its ID",
)
async def get_notification(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get single notification"""
    service = NotificationService(db)
    return await service.get_notification(
        notification_id,
        current_user.id,
        current_user.organization_id,
    )


@router.post(
    "/{notification_id}/read",
    response_model=NotificationLogResponse,
    summary="Mark notification as read",
    description="Mark a specific notification as read",
)
async def mark_as_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark notification as read"""
    service = NotificationService(db)
    return await service.mark_as_read(
        notification_id,
        current_user.id,
        current_user.organization_id,
    )


@router.post(
    "/read-all",
    summary="Mark all notifications as read",
    description="Mark all unread notifications as read for the current user",
)
async def mark_all_as_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark all notifications as read"""
    service = NotificationService(db)
    count = await service.mark_all_as_read(current_user.id, current_user.organization_id)
    return {"marked_as_read": count}


@router.delete(
    "/{notification_id}",
    summary="Delete notification",
    description="Delete a specific notification",
)
async def delete_notification(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete notification"""
    service = NotificationService(db)
    await service.delete_notification(
        notification_id,
        current_user.id,
        current_user.organization_id,
    )
    return {"deleted": True}
