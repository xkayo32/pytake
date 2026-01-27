"""
Phase 2.1 - Template Category Change Detection Endpoints

REST API endpoints for configuring and monitoring category change detection.

Author: Kayo Carvalho Fernandes
"""

from uuid import UUID
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_user, get_db
from app.schemas import UserSchema
from app.services import CategoryChangeDetectionService
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(
    prefix="/api/v1/templates",
    tags=["templates", "category-change"],
)


@router.post(
    "/{template_id}/allow-category-change",
    status_code=status.HTTP_200_OK,
    summary="Configure category change behavior",
)
async def configure_category_change(
    template_id: UUID,
    allow: bool,
    current_user: UserSchema = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Configure whether template category changes should trigger alerts.

    Args:
        template_id: Template UUID
        allow: True to allow changes without alerts, False to alert on changes

    Returns:
        Configuration status
    """
    service = CategoryChangeDetectionService(db)

    success = await service.allow_category_change_for_template(
        template_id, current_user.organization_id, allow
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found",
        )

    return {
        "template_id": str(template_id),
        "allow_category_change": allow,
        "status": "configured",
    }


@router.post(
    "/{template_id}/category-detection",
    status_code=status.HTTP_200_OK,
    summary="Enable/disable category change detection",
)
async def configure_detection(
    template_id: UUID,
    enabled: bool,
    current_user: UserSchema = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Enable or disable automatic category change detection.

    Args:
        template_id: Template UUID
        enabled: True to enable detection, False to disable

    Returns:
        Detection configuration status
    """
    service = CategoryChangeDetectionService(db)

    success = await service.enable_category_change_detection(
        template_id, current_user.organization_id, enabled
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found",
        )

    return {
        "template_id": str(template_id),
        "detection_enabled": enabled,
        "status": "configured",
    }


@router.get(
    "/{template_id}/category-history",
    status_code=status.HTTP_200_OK,
    summary="Get category change history",
)
async def get_category_history(
    template_id: UUID,
    current_user: UserSchema = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Get category change tracking information for a template.

    Returns:
        Category change history and current configuration
    """
    service = CategoryChangeDetectionService(db)

    history = await service.get_category_change_history(
        template_id, current_user.organization_id
    )

    if not history:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found",
        )

    return history


@router.get(
    "/category-change/alerts",
    status_code=status.HTTP_200_OK,
    summary="List category change alerts",
)
async def list_category_alerts(
    current_user: UserSchema = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 20,
) -> dict:
    """
    List all category change alerts for organization.

    Returns:
        List of category change alerts with pagination
    """
    # This would query Alert repository filtered by
    # alert_type="TEMPLATE_CATEGORY_CHANGED"
    return {
        "organization_id": str(current_user.organization_id),
        "alert_type": "TEMPLATE_CATEGORY_CHANGED",
        "items": [],
        "total": 0,
        "skip": skip,
        "limit": limit,
    }
