"""
Audit Log Repository
"""

from typing import List, Optional
from uuid import UUID
from datetime import datetime

from sqlalchemy import select, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog
from app.repositories.base import BaseRepository


class AuditLogRepository(BaseRepository[AuditLog]):
    """Repository for AuditLog operations"""

    def __init__(self, db: AsyncSession):
        super().__init__(AuditLog, db)

    async def log_delete(
        self,
        organization_id: UUID,
        deleted_by_user_id: Optional[UUID],
        model_type: str,
        record_id: UUID,
        record_name: Optional[str] = None,
        deletion_reason: Optional[str] = None,
        custom_reason: Optional[str] = None,
        deleted_data_snapshot: Optional[dict] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        extra_data: Optional[dict] = None,
    ) -> AuditLog:
        """
        Log a deletion operation.

        Args:
            organization_id: Organization UUID
            deleted_by_user_id: User UUID who performed deletion
            model_type: Type of model deleted (Contact, Campaign, Flow, etc.)
            record_id: UUID of deleted record
            record_name: Human-readable name of deleted record
            deletion_reason: Reason for deletion (enum string)
            custom_reason: Custom reason description
            deleted_data_snapshot: Backup of record data
            ip_address: IP address of requester
            user_agent: User agent from request
            extra_data: Additional metadata

        Returns:
            Created AuditLog record
        """

        log = AuditLog(
            organization_id=organization_id,
            deleted_by_user_id=deleted_by_user_id,
            model_type=model_type,
            record_id=record_id,
            record_name=record_name,
            deletion_reason=deletion_reason,
            custom_reason=custom_reason,
            deleted_data_snapshot=deleted_data_snapshot,
            ip_address=ip_address,
            user_agent=user_agent,
            extra_data=extra_data,
        )

        self.db.add(log)
        await self.db.commit()
        await self.db.refresh(log)

        return log

    async def get_deletion_logs(
        self,
        organization_id: UUID,
        model_type: Optional[str] = None,
        record_id: Optional[UUID] = None,
        deleted_by_user_id: Optional[UUID] = None,
        since: Optional[datetime] = None,
        until: Optional[datetime] = None,
        deletion_reason: Optional[str] = None,
        limit: int = 100,
        skip: int = 0,
    ) -> List[AuditLog]:
        """
        Get deletion logs with optional filters.

        Args:
            organization_id: Organization UUID (required for multi-tenancy)
            model_type: Filter by model type
            record_id: Filter by specific record
            deleted_by_user_id: Filter by user who deleted
            since: Filter by deletion date >= since
            until: Filter by deletion date <= until
            deletion_reason: Filter by deletion reason
            limit: Maximum results to return
            skip: Number of results to skip (pagination)

        Returns:
            List of AuditLog records matching filters
        """

        stmt = select(AuditLog).where(AuditLog.organization_id == organization_id)

        if model_type:
            stmt = stmt.where(AuditLog.model_type == model_type)

        if record_id:
            stmt = stmt.where(AuditLog.record_id == record_id)

        if deleted_by_user_id:
            stmt = stmt.where(AuditLog.deleted_by_user_id == deleted_by_user_id)

        if deletion_reason:
            stmt = stmt.where(AuditLog.deletion_reason == deletion_reason)

        if since:
            stmt = stmt.where(AuditLog.deleted_at >= since)

        if until:
            stmt = stmt.where(AuditLog.deleted_at <= until)

        stmt = (
            stmt.order_by(desc(AuditLog.deleted_at))
            .offset(skip)
            .limit(limit)
        )

        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def get_record_deletion_history(
        self,
        organization_id: UUID,
        model_type: str,
        record_id: UUID,
    ) -> List[AuditLog]:
        """
        Get complete deletion history for a specific record.

        Args:
            organization_id: Organization UUID
            model_type: Type of model
            record_id: UUID of record

        Returns:
            List of AuditLog records for this specific deletion
        """

        stmt = (
            select(AuditLog)
            .where(
                and_(
                    AuditLog.organization_id == organization_id,
                    AuditLog.model_type == model_type,
                    AuditLog.record_id == record_id,
                )
            )
            .order_by(desc(AuditLog.deleted_at))
        )

        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def count_deletions(
        self,
        organization_id: UUID,
        model_type: Optional[str] = None,
        since: Optional[datetime] = None,
    ) -> int:
        """
        Count deletions matching criteria.

        Args:
            organization_id: Organization UUID
            model_type: Optional model type filter
            since: Count deletions after this date

        Returns:
            Number of deletion records
        """

        stmt = select(AuditLog).where(
            AuditLog.organization_id == organization_id
        )

        if model_type:
            stmt = stmt.where(AuditLog.model_type == model_type)

        if since:
            stmt = stmt.where(AuditLog.deleted_at >= since)

        result = await self.db.execute(stmt)
        return len(result.scalars().all())

    async def get_deletions_by_user(
        self,
        organization_id: UUID,
        user_id: UUID,
        limit: int = 100,
    ) -> List[AuditLog]:
        """
        Get all deletions performed by a specific user.

        Args:
            organization_id: Organization UUID
            user_id: User UUID
            limit: Maximum results

        Returns:
            List of AuditLog records
        """

        stmt = (
            select(AuditLog)
            .where(
                and_(
                    AuditLog.organization_id == organization_id,
                    AuditLog.deleted_by_user_id == user_id,
                )
            )
            .order_by(desc(AuditLog.deleted_at))
            .limit(limit)
        )

        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def get_deletions_by_model_type(
        self,
        organization_id: UUID,
        model_type: str,
        limit: int = 100,
    ) -> List[AuditLog]:
        """
        Get all deletions for a specific model type.

        Args:
            organization_id: Organization UUID
            model_type: Type of model (Contact, Campaign, Flow, etc.)
            limit: Maximum results

        Returns:
            List of AuditLog records
        """

        stmt = (
            select(AuditLog)
            .where(
                and_(
                    AuditLog.organization_id == organization_id,
                    AuditLog.model_type == model_type,
                )
            )
            .order_by(desc(AuditLog.deleted_at))
            .limit(limit)
        )

        result = await self.db.execute(stmt)
        return result.scalars().all()
