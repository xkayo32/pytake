"""
AgentSkill model - skills for agents (users with role=agent)
"""

from sqlalchemy import Column, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import text

from app.models.base import Base, TimestampMixin, SoftDeleteMixin


class AgentSkill(Base, TimestampMixin, SoftDeleteMixin):
    """Represents a skill owned by an agent (User)."""

    __tablename__ = "agent_skills"

    # Primary Key
    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )

    # Foreign Keys
    organization_id = Column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Skill info
    skill_name = Column(String(100), nullable=False, index=True)
    # 1 (beginner) .. 5 (expert)
    proficiency_level = Column(Integer, nullable=False, default=3, server_default="3")

    # Relationships
    user = relationship("User", back_populates="skills")

    def __repr__(self):
        return f"<AgentSkill(user={self.user_id}, skill='{self.skill_name}', level={self.proficiency_level})>"
