"""
Flow Automation endpoints - Proactive flow dispatching
"""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db, require_role
from app.core.exceptions import NotFoundException
from app.models.user import User
from app.schemas.flow_automation import (
    FlowAutomationCreate,
    FlowAutomationUpdate,
    FlowAutomationResponse,
    FlowAutomationList,
    FlowAutomationStartRequest,
    FlowAutomationExecutionResponse,
    FlowAutomationStats,
    FlowAutomationScheduleCreate,
    FlowAutomationScheduleUpdate,
    FlowAutomationScheduleResponse,
    ScheduleExceptionCreate,
    SchedulePreview,
)
from app.services.flow_automation_service import FlowAutomationService

router = APIRouter()


# ============================================
# FLOW AUTOMATION ENDPOINTS
# ============================================


@router.post(
    "/",
    response_model=FlowAutomationResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role(["org_admin", "agent"]))],
)
async def create_automation(
    data: FlowAutomationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new flow automation

    Required role: org_admin or agent

    The automation starts in 'draft' status.
    """
    service = FlowAutomationService(db)
    automation = await service.create_automation(
        data, current_user.organization_id, current_user.id
    )
    return automation


@router.get("/", response_model=FlowAutomationList)
async def list_automations(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    status: Optional[str] = Query(None, description="Filter by status"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List all flow automations for current organization

    Supports pagination and filtering by status/active.
    """
    service = FlowAutomationService(db)
    automations, total = await service.list_automations(
        current_user.organization_id, skip, limit, status, is_active
    )

    # Calculate pagination
    total_pages = (total + limit - 1) // limit  # Ceiling division

    return FlowAutomationList(
        items=automations,
        total=total,
        page=skip // limit + 1,
        page_size=limit,
        total_pages=total_pages,
    )


@router.get("/{automation_id}", response_model=FlowAutomationResponse)
async def get_automation(
    automation_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get flow automation by ID

    Returns full automation details including relationships.
    """
    service = FlowAutomationService(db)
    automation = await service.get_automation(automation_id, current_user.organization_id)

    if not automation:
        raise NotFoundException("Flow automation not found")

    return automation


@router.put("/{automation_id}", response_model=FlowAutomationResponse)
async def update_automation(
    automation_id: UUID,
    data: FlowAutomationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update flow automation

    Can only update draft or paused automations.
    """
    service = FlowAutomationService(db)
    automation = await service.update_automation(
        automation_id, current_user.organization_id, data
    )
    return automation


@router.delete(
    "/{automation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_role(["org_admin"]))],
)
async def delete_automation(
    automation_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Delete flow automation (soft delete)

    Required role: org_admin

    Cannot delete running automations.
    """
    service = FlowAutomationService(db)
    await service.delete_automation(automation_id, current_user.organization_id)
    return None


# ============================================
# EXECUTION ENDPOINTS
# ============================================


@router.post("/{automation_id}/start", response_model=FlowAutomationExecutionResponse)
async def start_automation(
    automation_id: UUID,
    request: Optional[FlowAutomationStartRequest] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Start flow automation execution manually

    Creates an execution and begins processing recipients.

    Optionally supports test mode with specific contact IDs.
    """
    service = FlowAutomationService(db)
    execution = await service.start_automation(
        automation_id,
        current_user.organization_id,
        current_user.id,
        request,
    )
    return execution


@router.get("/{automation_id}/stats", response_model=FlowAutomationStats)
async def get_automation_stats(
    automation_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get statistics for flow automation

    Returns aggregated metrics across all executions.
    """
    service = FlowAutomationService(db)
    stats = await service.get_automation_stats(
        automation_id, current_user.organization_id
    )
    return stats




# ============================================
# SCHEDULE ENDPOINTS
# ============================================


@router.post("/{automation_id}/schedule", response_model=FlowAutomationScheduleResponse)
async def create_automation_schedule(
    automation_id: UUID,
    data: FlowAutomationScheduleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create or update schedule for automation

    Defines when and how the automation runs (daily, weekly, monthly, cron, etc.)
    """
    from app.services.flow_automation_schedule_service import FlowAutomationScheduleService

    data.automation_id = automation_id
    service = FlowAutomationScheduleService(db)
    schedule = await service.create_schedule(data, current_user.organization_id)
    return schedule


@router.get("/{automation_id}/schedule", response_model=FlowAutomationScheduleResponse)
async def get_automation_schedule(
    automation_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get schedule for automation"""
    from app.services.flow_automation_schedule_service import FlowAutomationScheduleService

    service = FlowAutomationScheduleService(db)
    schedule = await service.get_schedule_by_automation(automation_id)

    if not schedule:
        raise NotFoundException("Schedule not found")

    return schedule


@router.put("/{automation_id}/schedule", response_model=FlowAutomationScheduleResponse)
async def update_automation_schedule(
    automation_id: UUID,
    data: FlowAutomationScheduleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update automation schedule"""
    from app.services.flow_automation_schedule_service import FlowAutomationScheduleService

    service = FlowAutomationScheduleService(db)
    schedule = await service.get_schedule_by_automation(automation_id)

    if not schedule:
        raise NotFoundException("Schedule not found")

    schedule = await service.update_schedule(schedule.id, current_user.organization_id, data)
    return schedule


@router.delete(
    "/{automation_id}/schedule",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_automation_schedule(
    automation_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete automation schedule"""
    from app.services.flow_automation_schedule_service import FlowAutomationScheduleService

    service = FlowAutomationScheduleService(db)
    schedule = await service.get_schedule_by_automation(automation_id)

    if not schedule:
        raise NotFoundException("Schedule not found")

    await service.delete_schedule(schedule.id, current_user.organization_id)
    return None


# ============================================
# SCHEDULE EXCEPTIONS
# ============================================


@router.post("/{automation_id}/schedule/exceptions", status_code=status.HTTP_201_CREATED)
async def add_schedule_exception(
    automation_id: UUID,
    data: ScheduleExceptionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add exception to automation schedule (e.g., holiday, maintenance window)"""
    from app.services.flow_automation_schedule_service import FlowAutomationScheduleService
    from app.schemas.flow_automation import ScheduleExceptionResponse

    service = FlowAutomationScheduleService(db)
    exception = await service.add_exception(data, current_user.organization_id)
    return exception


@router.delete("/{automation_id}/schedule/exceptions/{exception_id}")
async def remove_schedule_exception(
    automation_id: UUID,
    exception_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove exception from schedule"""
    from app.services.flow_automation_schedule_service import FlowAutomationScheduleService

    service = FlowAutomationScheduleService(db)
    await service.remove_exception(exception_id, current_user.organization_id)
    return None


@router.get("/{automation_id}/schedule/preview", response_model=SchedulePreview)
async def get_schedule_preview(
    automation_id: UUID,
    num_executions: int = Query(10, ge=1, le=100),
    days_ahead: int = Query(90, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get preview of next N scheduled executions

    Useful for showing calendar view in UI
    """
    from app.services.flow_automation_schedule_service import FlowAutomationScheduleService

    service = FlowAutomationScheduleService(db)
    schedule = await service.get_schedule_by_automation(automation_id)

    if not schedule:
        raise NotFoundException("Schedule not found")

    preview = await service.get_schedule_preview(
        schedule.id,
        current_user.organization_id,
        num_executions,
        days_ahead,
    )
    return preview


# Future endpoints to implement:
# - GET /{automation_id}/executions - List executions
# - GET /{automation_id}/executions/{execution_id} - Get execution details
# - POST /{automation_id}/executions/{execution_id}/pause - Pause execution
# - POST /{automation_id}/executions/{execution_id}/resume - Resume execution
# - POST /{automation_id}/executions/{execution_id}/cancel - Cancel execution
# - GET /{automation_id}/executions/{execution_id}/recipients - List recipients with status

