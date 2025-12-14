"""
Audit Log Model - Registra todas as operações de deleção
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import Column, DateTime, String, Text, Integer, func
from sqlalchemy.dialects.postgresql import JSONB, UUID as PostgresUUID, INET
from sqlalchemy.orm import relationship
from sqlalchemy.sql import text

from app.models.base import Base, TimestampMixin


class AuditLog(Base, TimestampMixin):
    """
    Audit log for all delete operations.
    
    Records:
    - Who deleted (user_id)
    - When deleted (timestamp)
    - Why deleted (reason)
    - What was deleted (record snapshot)
    - Context (IP, user agent)
    
    This enables:
    - Compliance (LGPD Art. 18, GDPR Art. 17)
    - Data recovery
    - Incident investigation
    - Security auditing
    """

    __tablename__ = "audit_logs"

    # Primary Key
    id = Column(
        PostgresUUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )

    # ========== MULTI-TENANCY ==========
    organization_id = Column(
        PostgresUUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Organization that owns this record",
    )

    # ========== WHO DELETED ==========
    deleted_by_user_id = Column(
        PostgresUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="User who performed the deletion",
    )

    # ========== WHEN DELETED ==========
    deleted_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        index=True,
        comment="Timestamp when deletion occurred",
    )

    # ========== WHAT WAS DELETED ==========
    model_type = Column(
        String(100),
        nullable=False,
        index=True,
        comment="Type of model deleted (Contact, Campaign, Flow, User, etc.)",
    )

    record_id = Column(
        PostgresUUID(as_uuid=True),
        nullable=False,
        index=True,
        comment="UUID of the deleted record",
    )

    record_name = Column(
        String(255),
        nullable=True,
        comment="Human-readable name of deleted record (contact name, campaign title, etc.)",
    )

    # ========== WHY DELETED ==========
    deletion_reason = Column(
        String(50),
        nullable=True,
        index=True,
        comment="Reason for deletion (user_request, duplicate, expired, compliance, error, abuse, policy, unknown)",
    )

    custom_reason = Column(
        Text,
        nullable=True,
        comment="Custom description of deletion reason",
    )

    # ========== DATA SNAPSHOT (for recovery) ==========
    deleted_data_snapshot = Column(
        JSONB,
        nullable=True,
        comment="Backup of record data before deletion (for recovery purposes)",
    )

    # ========== CONTEXT ==========
    ip_address = Column(
        INET,
        nullable=True,
        comment="IP address from which deletion was initiated",
    )

    user_agent = Column(
        String(500),
        nullable=True,
        comment="User agent (browser/client info) from deletion request",
    )

    # ========== ADDITIONAL DATA ==========
    extra_data = Column(
        JSONB,
        nullable=True,
        comment="Any additional metadata relevant to the deletion",
    )

    # ========== SOFT DELETE FOR AUDIT LOGS (rarely used) ==========
    deleted_at_audit = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="If audit log itself is deleted (for compliance/GDPR)",
    )

    # ========== RELATIONSHIPS ==========
    deleted_by_user = relationship(
        "User",
        foreign_keys=[deleted_by_user_id],
        lazy="joined",
        comment="User who performed the deletion",
    )
    organization = relationship(
        "Organization",
        foreign_keys=[organization_id],
        lazy="joined",
        comment="Organization that owns this record",
    )

    def __repr__(self) -> str:
        return (
            f"<AuditLog("
            f"id={self.id}, "
            f"model_type={self.model_type}, "
            f"record_id={self.record_id}, "
            f"deleted_by={self.deleted_by_user_id}, "
            f"deleted_at={self.deleted_at}"
            f")>"
        )

    def __str__(self) -> str:
        user_name = (
            self.deleted_by_user.full_name
            if self.deleted_by_user
            else "Unknown User"
        )
        return (
            f"{user_name} deleted {self.model_type} '{self.record_name}' "
            f"on {self.deleted_at.isoformat()} (Reason: {self.deletion_reason})"
        )
