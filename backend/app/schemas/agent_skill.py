"""
Pydantic schemas for AgentSkill
"""

from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field, constr, conint


class AgentSkillBase(BaseModel):
    skill_name: constr(strip_whitespace=True, min_length=1, max_length=100)
    proficiency_level: conint(ge=1, le=5) = Field(3, description="1 (beginner) .. 5 (expert)")


class AgentSkillCreate(AgentSkillBase):
    pass


class AgentSkillUpdate(BaseModel):
    skill_name: Optional[constr(strip_whitespace=True, min_length=1, max_length=100)] = None
    proficiency_level: Optional[conint(ge=1, le=5)] = None


class AgentSkill(AgentSkillBase):
    id: UUID
    organization_id: UUID
    user_id: UUID

    class Config:
        from_attributes = True
