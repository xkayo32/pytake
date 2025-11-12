"""
Queue model for organizing conversations within departments
"""

from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import text

from app.models.base import Base, SoftDeleteMixin, TimestampMixin


class Queue(Base, TimestampMixin, SoftDeleteMixin):
    """
    Queue model - Organizes conversations within departments

    Multiple queues can exist per department, each with specific settings.
    Examples: VIP Queue, Normal Queue, Technical Queue, etc.
    """

    __tablename__ = "queues"

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

    department_id = Column(
        UUID(as_uuid=True),
        ForeignKey("departments.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Queue Info
    name = Column(String(255), nullable=False, index=True)
    slug = Column(String(100), nullable=False, index=True)
    description = Column(Text, nullable=True)

    # Color/Icon for UI
    color = Column(String(7), default="#10B981", server_default="#10B981")
    icon = Column(String(50), nullable=True)

    # Status
    is_active = Column(Boolean, default=True, server_default="true", nullable=False)

    # Queue Priority (higher = more important)
    # Used when routing conversations to multiple queues
    priority = Column(Integer, default=50, server_default="50", nullable=False)

    # SLA Settings (Service Level Agreement)
    # Maximum wait time in minutes before escalation
    sla_minutes = Column(Integer, nullable=True)

    # Routing Settings
    # round_robin, load_balance, manual, skills_based
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

    # Max concurrent conversations per agent in this queue
    max_conversations_per_agent = Column(Integer, default=10, server_default="10")

    # Overflow Settings
    max_queue_size = Column(Integer, nullable=True)  # Max queued conversations before overflow
    overflow_queue_id = Column(
        UUID(as_uuid=True),
        ForeignKey("queues.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Statistics (updated periodically)
    total_conversations = Column(Integer, default=0, server_default="0")
    active_conversations = Column(Integer, default=0, server_default="0")
    queued_conversations = Column(Integer, default=0, server_default="0")
    completed_conversations = Column(Integer, default=0, server_default="0")

    # Performance Metrics
    average_wait_time_seconds = Column(Integer, nullable=True)
    average_response_time_seconds = Column(Integer, nullable=True)
    average_resolution_time_seconds = Column(Integer, nullable=True)
    customer_satisfaction_score = Column(Integer, nullable=True)  # 0-100

    # Queue-specific settings (flexible JSONB)
    # Examples:
    # - allowed_agent_ids: [uuid1, uuid2, ...] - Only specific agents can pick from this queue
    # - skills_required: ["python", "billing"] - Skills-based routing
    # - overflow_queue_id: uuid - Queue to overflow to when this is full
    # - business_hours: {
    #     "timezone": "America/Sao_Paulo",
    #     "schedule": {
    #       "monday": {"enabled": true, "start": "09:00", "end": "18:00"},
    #       "tuesday": {"enabled": true, "start": "09:00", "end": "18:00"},
    #       ...
    #     }
    #   }
    settings = Column(
        JSONB,
        nullable=False,
        default={},
        server_default=text("'{}'::jsonb"),
    )

    # Relationships
    organization = relationship("Organization", back_populates="queues")
    department = relationship("Department", back_populates="queues")
    overflow_queue = relationship("Queue", remote_side=[id], foreign_keys=[overflow_queue_id])
    # conversations = relationship("Conversation", back_populates="queue")

    def __repr__(self):
        return f"<Queue(id={self.id}, name='{self.name}', dept={self.department_id})>"

    @property
    def is_overloaded(self) -> bool:
        """Check if queue is overloaded (has many queued conversations)"""
        # Use max_queue_size if configured, otherwise fallback to simple check
        if self.max_queue_size:
            return self.queued_conversations >= self.max_queue_size
        
        if self.sla_minutes and self.queued_conversations > 0:
            # Fallback: more than 10 conversations waiting
            return self.queued_conversations > 10
        return False

    @property
    def has_capacity(self) -> bool:
        """Check if queue has capacity for new conversations"""
        if not self.is_active:
            return False
        
        # Check if queue is at max capacity
        if self.max_queue_size and self.queued_conversations >= self.max_queue_size:
            return False
            
        return not self.is_overloaded
