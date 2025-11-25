"""Notification API endpoints"""

from fastapi import APIRouter, Depends, HTTPException
from app.schemas.notification import (
    NotificationPreferenceResponse,
    NotificationPreferenceUpdate,
    NotificationLogResponse
)
from app.services.notification_service import NotificationService
from app.repositories.notification import NotificationPreferenceRepository, NotificationLogRepository
from app.core.database import get_db
from typing import List
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/preferences", response_model=NotificationPreferenceResponse)
async def get_preferences(
    user_id: str,
    org_id: str,
    db = Depends(get_db)
):
    """Get user notification preferences"""
    repo = NotificationPreferenceRepository(db)
    pref = await repo.get_or_create(user_id, org_id)
    return pref


@router.put("/preferences", response_model=NotificationPreferenceResponse)
async def update_preferences(
    user_id: str,
    org_id: str,
    data: NotificationPreferenceUpdate,
    db = Depends(get_db)
):
    """Update notification preferences"""
    repo = NotificationPreferenceRepository(db)
    pref = await repo.get_or_create(user_id, org_id)

    update_data = data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(pref, key, value)

    await repo.update(pref)
    return pref


@router.get("/logs", response_model=List[NotificationLogResponse])
async def get_logs(
    org_id: str,
    skip: int = 0,
    limit: int = 50,
    db = Depends(get_db)
):
    """Get notification logs for organization"""
    repo = NotificationLogRepository(db)
    logs = await repo.get_by_org(org_id, skip, limit)
    return logs
