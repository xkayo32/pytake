"""
Template Analytics Endpoints - Phase 3.2

Author: Kayo Carvalho Fernandes
Date: 16/12/2025
"""

from uuid import UUID
from typing import Optional, List, Any
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models import User
from app.services.template_analytics_service import TemplateAnalyticsService


router = APIRouter(prefix="/templates", tags=["templates-analytics"])


class GenericResponse(BaseModel):
    """Generic response wrapper"""
    success: bool = True
    message: str
    data: Optional[Any] = None


class TemplateMetricsResponse(GenericResponse):
    """Template metrics response"""
    template_id: UUID
    template_name: str
    category: str
    status: str
    period_days: int


class DashboardSummaryResponse(GenericResponse):
    """Organization dashboard summary response"""
    organization_id: UUID
    period_days: int
    total_templates: int
    active_templates: int


@router.get(
    "/{template_id}/analytics/metrics",
    response_model=TemplateMetricsResponse,
    summary="Get template analytics metrics",
    description="Get detailed metrics and analytics for a specific template",
)
async def get_template_analytics_metrics(
    template_id: UUID,
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get comprehensive analytics metrics for a template.
    
    **Parameters:**
    - `template_id`: UUID of the template
    - `days`: Analysis period in days (1-365, default: 30)
    
    **Returns:**
    - Template metrics for last N days
    - Success rate, cost, recipients
    - Trends and growth indicators
    
    **Example:**
    ```
    GET /api/v1/templates/550e8400-e29b-41d4-a716-446655440000/analytics/metrics?days=30
    ```
    """
    try:
        analytics = TemplateAnalyticsService(db)
        result = await analytics.get_template_metrics(
            template_id=template_id,
            organization_id=current_user.organization_id,
            days=days
        )
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Template not found",
            )
        
        return TemplateMetricsResponse(
            success=True,
            message=f"Analytics metrics for {days} days",
            template_id=result["template_id"],
            template_name=result["template_name"],
            category=result["category"],
            status=result["status"],
            period_days=result["period_days"],
            data=result,  # Include full metrics in response
        )
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve analytics metrics",
        )


@router.get(
    "/analytics/dashboard",
    response_model=DashboardSummaryResponse,
    summary="Get organization dashboard",
    description="Get aggregated analytics dashboard for entire organization",
)
async def get_organization_analytics_dashboard(
    days: int = Query(30, ge=1, le=365),
    category: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get organization-wide analytics dashboard.
    
    **Parameters:**
    - `days`: Analysis period in days (1-365, default: 30)
    - `category`: Filter by template category (MARKETING, UTILITY, etc) - optional
    - `status`: Filter by template status (APPROVED, PAUSED, etc) - optional
    
    **Returns:**
    - Organization summary metrics
    - Breakdown by category
    - Top and bottom performing templates
    - Comparative analysis
    
    **Example:**
    ```
    GET /api/v1/templates/analytics/dashboard?days=30&category=MARKETING
    ```
    """
    try:
        analytics = TemplateAnalyticsService(db)
        result = await analytics.get_organization_dashboard(
            organization_id=current_user.organization_id,
            days=days,
            category_filter=category,
            status_filter=status
        )
        
        return DashboardSummaryResponse(
            success=True,
            message="Organization dashboard retrieved",
            organization_id=result["organization_id"],
            period_days=result["period_days"],
            total_templates=result["summary"]["total_templates"],
            active_templates=result["summary"]["active_templates"],
            data=result,  # Include full dashboard
        )
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve organization dashboard",
        )


@router.post(
    "/analytics/compare",
    summary="Compare templates",
    description="Compare multiple templates side-by-side",
)
async def compare_templates(
    template_ids: List[UUID] = Query(..., min_items=2, max_items=10),
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Compare multiple templates side-by-side.
    
    **Parameters:**
    - `template_ids`: List of template UUIDs (2-10 templates)
    - `days`: Analysis period in days (1-365, default: 30)
    
    **Returns:**
    - Side-by-side comparison metrics
    - Best and worst performers
    - Relative efficiency analysis
    
    **Example:**
    ```
    POST /api/v1/templates/analytics/compare?template_ids=<id1>&template_ids=<id2>&days=30
    ```
    """
    try:
        if len(template_ids) < 2:
            raise ValueError("At least 2 templates required for comparison")
        
        if len(template_ids) > 10:
            raise ValueError("Maximum 10 templates allowed for comparison")
        
        analytics = TemplateAnalyticsService(db)
        result = await analytics.compare_templates(
            template_ids=template_ids,
            organization_id=current_user.organization_id,
            days=days
        )
        
        return GenericResponse(
            success=True,
            message=f"Comparison of {len(template_ids)} templates",
            data=result,
        )
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to compare templates",
        )
