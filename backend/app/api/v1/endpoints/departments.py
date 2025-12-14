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
from app.schemas.user import AgentAvailable
from app.services.department_service import DepartmentService
from app.services.conversation_service import ConversationService

router = APIRouter()


@router.get("/", response_model=List[Department])
async def list_departments(
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List all departments for the organization
    
    **Description:** Retrieves a paginated list of departments with optional filtering by active status.
    
    **Query Parameters:**
    - `is_active` (boolean, optional): Filter by active/inactive status
    - `skip` (int, default: 0): Offset for pagination
    - `limit` (int, default: 100, max: 100): Records per page
    
    **Returns:** Array of Department objects
    
    **Permissions Required:** Any authenticated user
    
    **Possible Errors:**
    - `401`: User not authenticated
    - `500`: Database error
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
    
    **Description:** Creates a new department in the organization for organizing agents and conversations.
    
    **Request Body:**
    - `name` (string, required): Department name (e.g., "Support", "Sales", "Billing")
    - `description` (string, optional): Department description
    - `is_active` (boolean, default: true): Whether department is active
    
    **Returns:** Created Department object with generated ID
    
    **Permissions Required:** org_admin role
    
    **Possible Errors:**
    - `400`: Invalid department data
    - `401`: User not authenticated
    - `403`: Insufficient permissions
    - `409`: Department name already exists
    - `500`: Database error
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
    """
    Get department by ID
    
    **Description:** Retrieves full department details including agents and statistics.
    
    **Path Parameters:**
    - `department_id` (UUID, required): Unique department identifier
    
    **Returns:** Department object
    
    **Permissions Required:** Any authenticated user
    
    **Possible Errors:**
    - `401`: User not authenticated
    - `404`: Department not found
    - `500`: Database error
    """
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
    
    **Description:** Updates department configuration like name, description, and active status.
    
    **Path Parameters:**
    - `department_id` (UUID, required): Unique department identifier
    
    **Request Body (all optional):**
    - `name` (string): New department name
    - `description` (string): Updated description
    - `is_active` (boolean): Active status
    
    **Returns:** Updated Department object
    
    **Permissions Required:** org_admin role
    
    **Possible Errors:**
    - `400`: Invalid update data
    - `401`: User not authenticated
    - `403`: Insufficient permissions
    - `404`: Department not found
    - `409`: Duplicate department name
    - `500`: Database error
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
    
    **Description:** Marks department as deleted. Data is retained for audit purposes.
    
    **Path Parameters:**
    - `department_id` (UUID, required): Unique department identifier
    
    **Returns:** 204 No Content on success
    
    **Permissions Required:** org_admin role
    
    **Possible Errors:**
    - `401`: User not authenticated
    - `403`: Insufficient permissions
    - `404`: Department not found
    - `409`: Cannot delete department with active agents
    - `500`: Database error
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
    
    **Description:** Assigns an agent to a department. Agent can be part of multiple departments.
    
    **Path Parameters:**
    - `department_id` (UUID, required): Unique department identifier
    - `agent_id` (UUID, required): Unique agent identifier
    
    **Returns:** Updated Department object with agents list
    
    **Permissions Required:** org_admin role
    
    **Possible Errors:**
    - `401`: User not authenticated
    - `403`: Insufficient permissions
    - `404`: Department or agent not found
    - `409`: Agent already in department
    - `500`: Database error
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


@router.get("/{department_id}/agents", response_model=List[AgentAvailable])
async def list_department_agents(
    department_id: UUID,
    status: Optional[str] = Query(
        None,
        regex="^(available|busy|away|offline)$",
        description="Filter by agent status"
    ),
    include_inactive: bool = Query(False, description="Include inactive agents"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List agents in a department with capacity information

    **Path Parameters:**
    - `department_id` (UUID): Department ID

    **Query Parameters:**
    - `status` (string, optional): Filter by status (available|busy|away|offline)
    - `include_inactive` (boolean, default: false): Include inactive agents

    **Returns:** Array of AgentAvailable with capacity metrics

    **Example Response:**
    ```json
    [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "full_name": "João Agent",
        "email": "joao@example.com",
        "department_id": "650e8400-e29b-41d4-a716-446655440001",
        "agent_status": "available",
        "active_conversations_count": 5,
        "capacity_remaining": 5
      }
    ]
    ```

    **Responses:**
    - `200`: Lista de agentes do departamento
    - `404`: Departamento não encontrado
    - `403`: Sem permissão para visualizar departamento
    """
    service = ConversationService(db)
    agents = await service.list_available_agents(
        organization_id=current_user.organization_id,
        department_id=department_id,
    )
    
    # Filter by status if provided
    if status:
        agents = [a for a in agents if a.get("agent_status") == status]
    
    # Exclude inactive if not requested
    if not include_inactive:
        # Note: list_available_agents already filters for active agents
        pass
    
    return agents

