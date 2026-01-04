"""
Expense models for Phase 3.3

Author: Kayo Carvalho Fernandes
Date: 16/12/2025
"""

from uuid import UUID
from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import (
    Column,
    String,
    Integer,
    Boolean,
    Numeric,
    DateTime,
    ForeignKey,
    UniqueConstraint,
    Index,
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class Expense(Base):
    """Expense tracking for templates"""
    __tablename__ = "expenses"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=UUID)
    organization_id = Column(PG_UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    template_id = Column(PG_UUID(as_uuid=True), ForeignKey("whatsapp_templates.id"), nullable=False)
    message_count = Column(Integer, nullable=False, default=0)
    cost_usd = Column(Numeric(precision=12, scale=4), nullable=False)
    category = Column(String(50), nullable=False)  # MARKETING, UTILITY, AUTHENTICATION, SERVICE
    complexity_level = Column(String(50), nullable=True)  # simple, with_button, with_media, with_interactive
    period_start = Column(DateTime(timezone=True), nullable=False)
    period_end = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index('idx_expenses_organization_date', 'organization_id', 'created_at'),
        Index('idx_expenses_template_organization', 'template_id', 'organization_id'),
    )


class OrganizationCostLimit(Base):
    """Organization cost limits and alert thresholds"""
    __tablename__ = "organization_cost_limits"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=UUID)
    organization_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("organizations.id"),
        nullable=False,
        unique=True
    )
    monthly_limit_usd = Column(Numeric(precision=12, scale=2), nullable=False)
    alert_threshold_percentage = Column(Integer, nullable=False, default=80)  # 0-100
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index('idx_cost_limits_organization', 'organization_id'),
    )


class ExpenseAlert(Base):
    """Alert notifications for expense thresholds"""
    __tablename__ = "expense_alerts"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=UUID)
    organization_id = Column(PG_UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    alert_type = Column(String(50), nullable=False)  # threshold_exceeded, limit_reached, anomaly
    current_cost_usd = Column(Numeric(precision=12, scale=2), nullable=False)
    limit_cost_usd = Column(Numeric(precision=12, scale=2), nullable=False)
    percentage_of_limit = Column(Integer, nullable=False)  # 0-200+
    period_month = Column(Integer, nullable=False)  # 1-12
    period_year = Column(Integer, nullable=False)  # 2024, 2025, etc
    is_acknowledged = Column(Boolean, nullable=False, default=False)
    acknowledged_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    __table_args__ = (
        Index('idx_expense_alerts_organization', 'organization_id', 'created_at'),
    )
