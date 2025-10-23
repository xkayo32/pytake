"""
Agent Skills Endpoints
"""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, status

from app.api.deps import get_current_admin, get_current_user, get_db
from app.models.user import User
from app.schemas.agent_skill import AgentSkill as AgentSkillSchema, AgentSkillCreate, AgentSkillUpdate
from app.services.agent_skill_service import AgentSkillService
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()


@router.get("/users/{user_id}/skills", response_model=List[AgentSkillSchema])
async def list_user_skills(
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AgentSkillService(db)
    return await service.list_user_skills(organization_id=current_user.organization_id, user_id=user_id)


@router.post("/users/{user_id}/skills", response_model=AgentSkillSchema, status_code=status.HTTP_201_CREATED)
async def add_user_skill(
    user_id: UUID,
    data: AgentSkillCreate,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    service = AgentSkillService(db)
    return await service.add_skill(organization_id=current_user.organization_id, user_id=user_id, data=data)


@router.put("/users/{user_id}/skills/{skill_id}", response_model=AgentSkillSchema)
async def update_user_skill(
    user_id: UUID,
    skill_id: UUID,
    data: AgentSkillUpdate,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    service = AgentSkillService(db)
    return await service.update_skill(
        organization_id=current_user.organization_id, user_id=user_id, skill_id=skill_id, data=data
    )


@router.delete("/users/{user_id}/skills/{skill_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user_skill(
    user_id: UUID,
    skill_id: UUID,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    service = AgentSkillService(db)
    await service.delete_skill(organization_id=current_user.organization_id, user_id=user_id, skill_id=skill_id)
    return {}


@router.get("/users/skills/available", response_model=List[str])
async def list_available_skills(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all unique skills used in the organization"""
    service = AgentSkillService(db)
    return await service.list_available_skills(organization_id=current_user.organization_id)


@router.put("/users/{user_id}/skills", response_model=List[AgentSkillSchema])
async def replace_user_skills(
    user_id: UUID,
    skills: List[AgentSkillCreate],
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Replace all skills for a user (bulk update)"""
    service = AgentSkillService(db)
    return await service.replace_user_skills(
        organization_id=current_user.organization_id,
        user_id=user_id,
        skills=skills,
    )
