"""
Template Cost Estimation Endpoints - Phase 3.1

Author: Kayo Carvalho Fernandes
Date: 15/12/2025
"""

from uuid import UUID
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models import User
from app.schemas import GenericResponse
from app.services.template_cost_estimator import TemplateCostEstimator


router = APIRouter(prefix="/templates", tags=["templates-costs"])


class CostEstimateResponse(GenericResponse):
    """Template cost estimate response"""
    template_id: UUID
    template_name: str
    category: str
    complexity: str
    monthly_volume: int
    monthly_cost_estimate_usd: str
    annual_cost_estimate_usd: str


class OrgCostSummaryResponse(GenericResponse):
    """Organization cost summary response"""
    organization_id: UUID
    total_templates: int
    total_monthly_cost_estimate_usd: str
    total_annual_cost_estimate_usd: str


@router.get(
    "/{template_id}/cost-estimate",
    response_model=CostEstimateResponse,
    summary="Get template cost estimate",
    description="Calculate estimated cost for sending messages with this template",
)
async def get_template_cost_estimate(
    template_id: UUID,
    monthly_volume: int = 100,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get cost estimation for a specific template.
    
    **Parameters:**
    - `template_id`: UUID of the template
    - `monthly_volume`: Estimated monthly messages (default: 100)
    
    **Returns:**
    - Template cost estimate with pricing breakdown
    - Annual projection
    - Calculated timestamp
    
    **Example:**
    ```
    GET /api/v1/templates/550e8400-e29b-41d4-a716-446655440000/cost-estimate?monthly_volume=1000
    ```
    """
    try:
        estimator = TemplateCostEstimator(db)
        result = await estimator.get_template_cost_estimate(
            template_id=template_id,
            organization_id=current_user.organization_id,
            monthly_volume=monthly_volume
        )
        
        return CostEstimateResponse(
            success=True,
            message="Cost estimate calculated",
            template_id=result["template_id"],
            template_name=result["template_name"],
            category=result["category"],
            complexity=result["complexity"],
            monthly_volume=result["monthly_volume"],
            monthly_cost_estimate_usd=str(result["monthly_cost_estimate_usd"]),
            annual_cost_estimate_usd=str(result["annual_cost_estimate_usd"]),
        )
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to calculate cost estimate",
        )


@router.get(
    "/organization/cost-summary",
    response_model=OrgCostSummaryResponse,
    summary="Get organization cost summary",
    description="Get total cost estimate for all templates in the organization",
)
async def get_organization_cost_summary(
    monthly_volume_per_template: int = 100,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get cost summary for the entire organization.
    
    **Parameters:**
    - `monthly_volume_per_template`: Estimated volume per template (default: 100)
    
    **Returns:**
    - Total templates count
    - Total monthly and annual cost projections
    - Breakdown by category and complexity
    - Last calculated timestamp
    
    **Example:**
    ```
    GET /api/v1/templates/organization/cost-summary?monthly_volume_per_template=500
    ```
    """
    try:
        estimator = TemplateCostEstimator(db)
        result = await estimator.get_org_cost_summary(
            organization_id=current_user.organization_id,
            monthly_volume_per_template=monthly_volume_per_template
        )
        
        return OrgCostSummaryResponse(
            success=True,
            message="Organization cost summary calculated",
            organization_id=result["organization_id"],
            total_templates=result["total_templates"],
            total_monthly_cost_estimate_usd=str(result["total_monthly_cost_estimate_usd"]),
            total_annual_cost_estimate_usd=str(result["total_annual_cost_estimate_usd"]),
        )
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to calculate organization cost summary",
        )
