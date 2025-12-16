"""
Expense Tracking Endpoints - Phase 3.3

Author: Kayo Carvalho Fernandes
Date: 16/12/2025
"""

from uuid import UUID
from typing import Optional, List
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models import User
from app.services.expense_tracking_service import ExpenseTrackingService


router = APIRouter(prefix="/expenses", tags=["expenses"])


class GenericResponse(BaseModel):
    """Generic response wrapper"""
    success: bool = True
    message: str
    data: Optional[dict] = None


@router.get(
    "/organization",
    response_model=GenericResponse,
    summary="Get organization expense dashboard",
    description="Get aggregated expense dashboard for entire organization",
)
async def get_organization_expense_dashboard(
    days: int = Query(30, ge=1, le=365),
    category: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get organization-wide expense dashboard.
    
    **Parameters:**
    - `days`: Analysis period in days (1-365, default: 30)
    - `category`: Filter by template category - optional
    
    **Returns:**
    - Organization expense summary
    - Breakdown by category and template
    - Cost limits and alerts
    
    **Example:**
    ```
    GET /api/v1/expenses/organization?days=30&category=MARKETING
    ```
    """
    try:
        expense_service = ExpenseTrackingService(db)
        result = await expense_service.get_organization_expenses(
            organization_id=current_user.organization_id,
            period_days=days,
            category_filter=category,
        )
        
        return GenericResponse(
            success=True,
            message="Organization expense dashboard retrieved",
            data=result,
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve expense dashboard: {str(e)}",
        )


@router.get(
    "/templates/{template_id}",
    response_model=GenericResponse,
    summary="Get template expense history",
    description="Get expense history for a specific template",
)
async def get_template_expense_history(
    template_id: UUID,
    days: int = Query(90, ge=1, le=365),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get expense history for a specific template.
    
    **Parameters:**
    - `template_id`: UUID of the template
    - `days`: Historical period (1-365, default: 90)
    
    **Returns:**
    - Template expense history
    - Weekly breakdown
    - Trends and cost per message
    
    **Example:**
    ```
    GET /api/v1/expenses/templates/550e8400-e29b-41d4-a716-446655440000?days=90
    ```
    """
    try:
        expense_service = ExpenseTrackingService(db)
        result = await expense_service.get_template_expense_history(
            template_id=template_id,
            organization_id=current_user.organization_id,
            days=days,
        )
        
        return GenericResponse(
            success=True,
            message=f"Template expense history for {days} days",
            data=result,
        )
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve template expense history",
        )


@router.get(
    "/optimization",
    response_model=GenericResponse,
    summary="Get optimization suggestions",
    description="Get cost optimization recommendations",
)
async def get_optimization_suggestions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get cost optimization suggestions based on expense patterns.
    
    **Returns:**
    - List of optimization recommendations
    - Priority levels (high, medium, low)
    - Detailed suggestions for reducing costs
    
    **Example:**
    ```
    GET /api/v1/expenses/optimization
    ```
    """
    try:
        expense_service = ExpenseTrackingService(db)
        result = await expense_service.calculate_optimization_suggestions(
            organization_id=current_user.organization_id,
        )
        
        return GenericResponse(
            success=True,
            message="Optimization suggestions retrieved",
            data=result,
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to calculate optimization suggestions",
        )


@router.post(
    "/alerts/check",
    response_model=GenericResponse,
    summary="Check cost limits and alerts",
    description="Check if organization has exceeded cost limits",
)
async def check_cost_limits(
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None, ge=2024),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Check organization cost limits and generate alerts if needed.
    
    **Parameters:**
    - `month`: Month to check (1-12, default: current month)
    - `year`: Year to check (default: current year)
    
    **Returns:**
    - Cost limit status
    - Current spending vs limit
    - Alert status (within_limits, threshold_exceeded, limit_exceeded)
    
    **Example:**
    ```
    POST /api/v1/expenses/alerts/check?month=12&year=2025
    ```
    """
    try:
        expense_service = ExpenseTrackingService(db)
        result = await expense_service.check_cost_limits(
            organization_id=current_user.organization_id,
            current_month=month,
            current_year=year,
        )
        
        # Determine response message based on status
        status_messages = {
            "within_limits": "Organization spending is within limits",
            "threshold_exceeded": "Alert: Organization spending exceeded threshold",
            "limit_exceeded": "Critical: Organization cost limit exceeded",
            "no_limit_set": "No cost limit configured for organization",
        }
        
        message = status_messages.get(result.get("status"), "Cost check completed")
        
        return GenericResponse(
            success=True,
            message=message,
            data=result,
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to check cost limits",
        )
