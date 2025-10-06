"""
Department model for team organization
"""

from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import text

from app.models.base import Base, SoftDeleteMixin, TimestampMixin


class Department(Base, TimestampMixin, SoftDeleteMixin):
    """
    Department model - Organizes agents into teams/departments
    """

    __tablename__ = "departments"

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

    # Department Info
    name = Column(String(255), nullable=False, index=True)
    slug = Column(String(100), nullable=False, index=True)
    description = Column(Text, nullable=True)

    # Color/Icon for UI
    color = Column(String(7), default="#3B82F6", server_default="#3B82F6")
    icon = Column(String(50), nullable=True)

    # Status
    is_active = Column(Boolean, default=True, server_default="true", nullable=False)

    # Business Hours (JSONB)
    # Example: {"monday": {"start": "09:00", "end": "18:00", "enabled": true}, ...}
    business_hours = Column(
        JSONB,
        nullable=False,
        default={},
        server_default=text("'{}'::jsonb"),
    )

    # Offline Message (shown when department is offline)
    offline_message = Column(Text, nullable=True)

    # Routing Settings
    # round_robin, load_balance, manual
    routing_mode = Column(
        String(50),
        nullable=False,
        default="round_robin",
        server_default="round_robin",
    )

    # Auto-assignment
    auto_assign_conversations = Column(
        Boolean, default=True, server_default="true", nullable=False
    )

    # Max concurrent conversations per agent
    max_conversations_per_agent = Column(Integer, default=10, server_default="10")

    # Agent IDs in this department (redundant but optimizes queries)
    agent_ids = Column(
        ARRAY(UUID(as_uuid=True)),
        nullable=False,
        default=[],
        server_default=text("ARRAY[]::uuid[]"),
    )

    # Statistics (updated periodically)
    total_agents = Column(Integer, default=0, server_default="0")
    total_conversations = Column(Integer, default=0, server_default="0")
    active_conversations = Column(Integer, default=0, server_default="0")
    queued_conversations = Column(Integer, default=0, server_default="0")

    # Performance Metrics
    average_response_time_seconds = Column(Integer, nullable=True)
    average_resolution_time_seconds = Column(Integer, nullable=True)
    customer_satisfaction_score = Column(Integer, nullable=True)  # 0-100

    # Settings (flexible JSONB)
    settings = Column(
        JSONB,
        nullable=False,
        default={},
        server_default=text("'{}'::jsonb"),
    )

    # Relationships
    organization = relationship("Organization", back_populates="departments")
    # conversations = relationship("Conversation", back_populates="department")
    # contacts_assigned = relationship("Contact", back_populates="assigned_department")

    def __repr__(self):
        return f"<Department(id={self.id}, name='{self.name}', org_id={self.organization_id})>"

    @property
    def is_within_business_hours(self) -> bool:
        """Check if current time is within business hours"""
        from datetime import datetime

        now = datetime.utcnow()
        day_name = now.strftime("%A").lower()

        if not self.business_hours or day_name not in self.business_hours:
            return True  # No hours defined = always open

        day_config = self.business_hours.get(day_name, {})
        if not day_config.get("enabled", True):
            return False

        # Simple time check (can be improved with timezone support)
        current_time = now.strftime("%H:%M")
        start_time = day_config.get("start", "00:00")
        end_time = day_config.get("end", "23:59")

        return start_time <= current_time <= end_time

    @property
    def has_available_agents(self) -> bool:
        """Check if department has available agents"""
        return self.total_agents > 0
