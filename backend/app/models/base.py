"""
Base models and mixins for SQLAlchemy
"""

from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from sqlalchemy import Column, DateTime, func, String, Text, ForeignKey, Index
from sqlalchemy.dialects.postgresql import JSONB, UUID as PostgresUUID
from sqlalchemy.orm import DeclarativeBase, declared_attr


class Base(DeclarativeBase):
    """Base class for all models"""

    # Allow type checking on all models
    __allow_unmapped__ = True

    @declared_attr.directive
    def __tablename__(cls) -> str:
        """Generate __tablename__ automatically from class name"""
        # Convert CamelCase to snake_case
        import re

        name = re.sub("(.)([A-Z][a-z]+)", r"\1_\2", cls.__name__)
        return re.sub("([a-z0-9])([A-Z])", r"\1_\2", name).lower() + "s"


class TimestampMixin:
    """Mixin to add timestamp fields to models"""

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class SoftDeleteMixin:
    """
    Enhanced Mixin to add soft delete capability with audit trail.
    
    Tracks:
    - When deleted (deleted_at)
    - Who deleted (deleted_by_user_id)
    - Why deleted (deleted_reason)
    - Data before deletion (deleted_data_snapshot)
    
    This enables data recovery, compliance auditing, and incident investigation.
    """

    deleted_at = Column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
        comment="Timestamp when record was soft deleted",
    )

    # ========== NEW AUDIT FIELDS ==========
    deleted_by_user_id = Column(
        PostgresUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="UUID of user who performed the deletion",
    )

    deleted_reason = Column(
        String(50),
        nullable=True,
        comment="Reason for deletion (user_request, duplicate, expired, compliance, error, abuse, policy, unknown)",
    )

    deleted_data_snapshot = Column(
        JSONB,
        nullable=True,
        comment="JSON snapshot of record data before deletion (for recovery)",
    )

    @property
    def is_deleted(self) -> bool:
        """Check if record is soft deleted"""
        return self.deleted_at is not None

    def soft_delete(
        self,
        deleted_by_id: Optional[UUID] = None,
        reason: Optional[str] = None,
        snapshot: Optional[dict] = None,
    ) -> None:
        """
        Soft delete the record with audit trail.

        Args:
            deleted_by_id: UUID of user performing deletion
            reason: Reason for deletion (enum string)
            snapshot: Optional dict with record data before deletion
        """
        self.deleted_at = datetime.utcnow()
        self.deleted_by_user_id = deleted_by_id
        self.deleted_reason = reason or "unknown"

        # If no snapshot provided, create one automatically
        if snapshot is None:
            snapshot = self._create_snapshot()
        self.deleted_data_snapshot = snapshot

    def restore(self) -> None:
        """Restore soft deleted record"""
        self.deleted_at = None
        self.deleted_by_user_id = None
        self.deleted_reason = None
        self.deleted_data_snapshot = None

    def _create_snapshot(self) -> dict:
        """
        Create automatic snapshot of current record data.

        Returns:
            Dictionary with all non-internal attributes
        """
        snapshot = {}
        for key, value in self.__dict__.items():
            # Skip internal SQLAlchemy attributes and methods
            if not key.startswith("_") and not callable(value):
                # Serialize complex types
                if isinstance(value, (datetime, UUID)):
                    snapshot[key] = str(value)
                else:
                    snapshot[key] = value
        return snapshot
