"""
Department Endpoints
"""

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_current_admin, get_db
from app.models.user import User
from app.schemas.department import (
    Department,
    DepartmentCreate,
    DepartmentUpdate,
    DepartmentWithStats,
)
from app.services.department_service import DepartmentService

router = APIRouter()


@router.get("/", response_model=List[Department])
async def list_departments(
    is_active: Optional[bool] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List all departments for the organization

    Optional filters:
    - is_active: Filter by active status
    """
    service = DepartmentService(db)
    return await service.list_departments(
        organization_id=current_user.organization_id,
        is_active=is_active,
        skip=skip,
        limit=limit,
    )


@router.get("/active", response_model=List[Department])
async def list_active_departments(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get only active departments (shortcut endpoint)"""
    service = DepartmentService(db)
    return await service.get_active_departments(
        organization_id=current_user.organization_id
    )


@router.get("/stats", response_model=dict)
async def get_organization_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get organization-wide department statistics"""
    service = DepartmentService(db)
    return await service.get_organization_stats(
        organization_id=current_user.organization_id
    )


@router.post("/", response_model=Department, status_code=status.HTTP_201_CREATED)
async def create_department(
    data: DepartmentCreate,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new department

    Only admins can create departments.
    """
    service = DepartmentService(db)
    return await service.create_department(
        data=data,
        organization_id=current_user.organization_id,
    )


@router.get("/{department_id}", response_model=Department)
async def get_department(
    department_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get department by ID"""
    service = DepartmentService(db)
    return await service.get_by_id(
        department_id=department_id,
        organization_id=current_user.organization_id,
    )


@router.put("/{department_id}", response_model=Department)
async def update_department(
    department_id: UUID,
    data: DepartmentUpdate,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Update department

    Only admins can update departments.
    """
    service = DepartmentService(db)
    return await service.update_department(
        department_id=department_id,
        data=data,
        organization_id=current_user.organization_id,
    )


@router.delete("/{department_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_department(
    department_id: UUID,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete department (soft delete)

    Only admins can delete departments.
    """
    service = DepartmentService(db)
    await service.delete_department(
        department_id=department_id,
        organization_id=current_user.organization_id,
    )
    return None


@router.post("/{department_id}/agents/{agent_id}", response_model=Department)
async def add_agent_to_department(
    department_id: UUID,
    agent_id: UUID,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Add agent to department

    Only admins can manage department agents.
    """
    service = DepartmentService(db)
    return await service.add_agent(
        department_id=department_id,
        agent_id=agent_id,
        organization_id=current_user.organization_id,
    )


@router.delete("/{department_id}/agents/{agent_id}", response_model=Department)
async def remove_agent_from_department(
    department_id: UUID,
    agent_id: UUID,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Remove agent from department

    Only admins can manage department agents.
    """
    service = DepartmentService(db)
    return await service.remove_agent(
        department_id=department_id,
        agent_id=agent_id,
        organization_id=current_user.organization_id,
    )
