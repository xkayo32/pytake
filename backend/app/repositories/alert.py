"""
Alert Repository - Data access layer for Alert model
"""

from typing import List, Optional
from uuid import UUID

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.alert import Alert, AlertStatus, AlertType, AlertSeverity
from app.repositories.base import BaseRepository


class AlertRepository(BaseRepository[Alert]):
    """Repository for Alert operations"""

    def __init__(self, db: AsyncSession):
        super().__init__(db, Alert)

    async def get_critical_alerts(
        self,
        organization_id: UUID,
        include_resolved: bool = False,
    ) -> List[Alert]:
        """Get critical severity alerts for organization"""
        stmt = select(self.model).where(
            and_(
                self.model.organization_id == organization_id,
                self.model.severity == AlertSeverity.CRITICAL,
                self.model.deleted_at.is_(None),
            )
        )
        
        if not include_resolved:
            stmt = stmt.where(self.model.status != AlertStatus.RESOLVED)
        
        stmt = stmt.order_by(self.model.created_at.desc())
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def get_open_alerts(
        self,
        organization_id: UUID,
    ) -> List[Alert]:
        """Get all open (not resolved) alerts for organization"""
        stmt = select(self.model).where(
            and_(
                self.model.organization_id == organization_id,
                self.model.status == AlertStatus.OPEN,
                self.model.deleted_at.is_(None),
            )
        ).order_by(self.model.created_at.desc())
        
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def get_template_alerts(
        self,
        template_id: UUID,
        organization_id: UUID,
        status: Optional[AlertStatus] = None,
    ) -> List[Alert]:
        """Get all alerts for a specific template"""
        stmt = select(self.model).where(
            and_(
                self.model.whatsapp_template_id == template_id,
                self.model.organization_id == organization_id,
                self.model.deleted_at.is_(None),
            )
        )
        
        if status:
            stmt = stmt.where(self.model.status == status)
        
        stmt = stmt.order_by(self.model.created_at.desc())
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def get_by_id(
        self,
        id: UUID,
        organization_id: UUID,
    ) -> Optional[Alert]:
        """Get alert by ID with organization filtering"""
        stmt = select(self.model).where(
            and_(
                self.model.id == id,
                self.model.organization_id == organization_id,
                self.model.deleted_at.is_(None),
            )
        )
        result = await self.db.execute(stmt)
        return result.scalar()

    async def get_alerts_by_type(
        self,
        organization_id: UUID,
        alert_type: AlertType,
        status: Optional[AlertStatus] = None,
    ) -> List[Alert]:
        """Get alerts filtered by type"""
        stmt = select(self.model).where(
            and_(
                self.model.organization_id == organization_id,
                self.model.alert_type == alert_type,
                self.model.deleted_at.is_(None),
            )
        )
        
        if status:
            stmt = stmt.where(self.model.status == status)
        
        stmt = stmt.order_by(self.model.created_at.desc())
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def get_escalated_alerts(
        self,
        organization_id: UUID,
        min_escalation_level: int = 2,
    ) -> List[Alert]:
        """Get alerts that have been escalated"""
        stmt = select(self.model).where(
            and_(
                self.model.organization_id == organization_id,
                self.model.escalation_level >= min_escalation_level,
                self.model.deleted_at.is_(None),
            )
        ).order_by(self.model.escalation_level.desc(), self.model.created_at.desc())
        
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def get_unacknowledged_alerts(
        self,
        organization_id: UUID,
    ) -> List[Alert]:
        """Get alerts that haven't been acknowledged yet"""
        stmt = select(self.model).where(
            and_(
                self.model.organization_id == organization_id,
                self.model.acknowledged_at.is_(None),
                self.model.deleted_at.is_(None),
            )
        ).order_by(self.model.created_at.desc())
        
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def create(
        self,
        organization_id: UUID,
        whatsapp_template_id: UUID,
        alert_type: AlertType,
        severity: AlertSeverity,
        title: str,
        description: Optional[str] = None,
        metadata: Optional[dict] = None,
    ) -> Alert:
        """Create a new alert"""
        alert = Alert(
            organization_id=organization_id,
            whatsapp_template_id=whatsapp_template_id,
            alert_type=alert_type,
            severity=severity,
            title=title,
            description=description,
            metadata=metadata or {},
        )
        self.db.add(alert)
        await self.db.flush()
        return alert

    async def acknowledge(
        self,
        alert_id: UUID,
        organization_id: UUID,
        user_id: UUID,
        notes: Optional[str] = None,
    ) -> Optional[Alert]:
        """Acknowledge an alert"""
        from datetime import datetime
        
        alert = await self.get_by_id(alert_id, organization_id)
        if not alert:
            return None
        
        alert.status = AlertStatus.ACKNOWLEDGED
        alert.acknowledged_by_user_id = user_id
        alert.acknowledged_at = datetime.now(alert.acknowledged_at.tzinfo if alert.acknowledged_at else None)
        alert.acknowledgment_notes = notes
        
        await self.db.flush()
        return alert

    async def escalate(
        self,
        alert_id: UUID,
        organization_id: UUID,
        to_admin: bool = False,
    ) -> Optional[Alert]:
        """Escalate an alert to next level"""
        from datetime import datetime
        
        alert = await self.get_by_id(alert_id, organization_id)
        if not alert or not alert.can_escalate:
            return None
        
        alert.escalation_level += 1
        alert.status = AlertStatus.ESCALATED
        alert.escalated_at = datetime.now(alert.escalated_at.tzinfo if alert.escalated_at else None)
        
        if to_admin:
            alert.escalated_to_admin = True
        
        await self.db.flush()
        return alert

    async def resolve(
        self,
        alert_id: UUID,
        organization_id: UUID,
        auto: bool = False,
        reason: Optional[str] = None,
    ) -> Optional[Alert]:
        """Resolve an alert"""
        from datetime import datetime
        
        alert = await self.get_by_id(alert_id, organization_id)
        if not alert:
            return None
        
        alert.status = AlertStatus.RESOLVED
        alert.auto_resolved = auto
        alert.auto_resolved_at = datetime.now(alert.auto_resolved_at.tzinfo if alert.auto_resolved_at else None)
        alert.auto_resolved_reason = reason
        
        await self.db.flush()
        return alert

    async def count_critical_for_org(self, organization_id: UUID) -> int:
        """Count critical alerts for organization"""
        stmt = select(self.model).where(
            and_(
                self.model.organization_id == organization_id,
                self.model.severity == AlertSeverity.CRITICAL,
                self.model.status == AlertStatus.OPEN,
                self.model.deleted_at.is_(None),
            )
        )
        result = await self.db.execute(stmt)
        return len(result.scalars().all())
