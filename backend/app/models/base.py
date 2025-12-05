"""
Base models and mixins for SQLAlchemy
"""

from datetime import datetime
from typing import Any

from sqlalchemy import Column, DateTime, func, JSON
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.types import TypeDecorator
from sqlalchemy.orm import DeclarativeBase, declared_attr


class JSONBCompatible(TypeDecorator):
    """
    JSONB type that falls back to JSON for databases that don't support JSONB.

    Uses JSONB for PostgreSQL (better performance) and JSON for other databases like SQLite.
    """
    impl = JSON
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            return dialect.type_descriptor(JSONB())
        else:
            return dialect.type_descriptor(JSON())


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
    """Mixin to add soft delete capability"""

    deleted_at = Column(DateTime(timezone=True), nullable=True, index=True)

    @property
    def is_deleted(self) -> bool:
        """Check if record is soft deleted"""
        return self.deleted_at is not None

    def soft_delete(self) -> None:
        """Soft delete the record"""
        self.deleted_at = datetime.utcnow()

    def restore(self) -> None:
        """Restore soft deleted record"""
        self.deleted_at = None


# Export JSONBCompatible for use in models
__all__ = ["Base", "TimestampMixin", "SoftDeleteMixin", "JSONBCompatible"]
