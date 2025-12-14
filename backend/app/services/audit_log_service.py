"""
Audit Log Service
"""

from typing import List, Optional
from uuid import UUID
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog
from app.repositories.audit_log import AuditLogRepository


class AuditLogService:
    """Service for managing audit logs"""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = AuditLogRepository(db)

    async def log_deletion(
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

        This is called AFTER a record is soft-deleted to create an audit trail.

        Args:
            organization_id: Organization UUID
            deleted_by_user_id: User who performed deletion
            model_type: Type of model (Contact, Campaign, Flow, etc.)
            record_id: UUID of deleted record
            record_name: Human-readable name
            deletion_reason: Reason code (user_request, duplicate, expired, compliance, error, abuse, policy, unknown)
            custom_reason: Custom description
            deleted_data_snapshot: JSON snapshot of record before deletion
            ip_address: IP address of requester
            user_agent: User agent from request
            extra_data: Additional metadata

        Returns:
            Created AuditLog record
        """

        return await self.repo.log_delete(
            organization_id=organization_id,
            deleted_by_user_id=deleted_by_user_id,
            model_type=model_type,
            record_id=record_id,
            record_name=record_name,
            deletion_reason=deletion_reason or "unknown",
            custom_reason=custom_reason,
            deleted_data_snapshot=deleted_data_snapshot,
            ip_address=ip_address,
            user_agent=user_agent,
            extra_data=extra_data,
        )

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
            organization_id: Organization UUID (required)
            model_type: Filter by model type
            record_id: Filter by record
            deleted_by_user_id: Filter by user
            since: Filter by date range (from)
            until: Filter by date range (to)
            deletion_reason: Filter by deletion reason
            limit: Maximum results
            skip: Pagination offset

        Returns:
            List of AuditLog records
        """

        return await self.repo.get_deletion_logs(
            organization_id=organization_id,
            model_type=model_type,
            record_id=record_id,
            deleted_by_user_id=deleted_by_user_id,
            since=since,
            until=until,
            deletion_reason=deletion_reason,
            limit=limit,
            skip=skip,
        )

    async def get_record_history(
        self,
        organization_id: UUID,
        model_type: str,
        record_id: UUID,
    ) -> List[AuditLog]:
        """
        Get complete deletion history for a specific record.

        Useful for investigating why/when a record was deleted.

        Args:
            organization_id: Organization UUID
            model_type: Type of model
            record_id: UUID of record

        Returns:
            List of AuditLog records (usually 0-1, or more if restored then deleted again)
        """

        return await self.repo.get_record_deletion_history(
            organization_id=organization_id,
            model_type=model_type,
            record_id=record_id,
        )

    async def count_deletions(
        self,
        organization_id: UUID,
        model_type: Optional[str] = None,
        since: Optional[datetime] = None,
    ) -> int:
        """
        Count deletions matching criteria.

        Useful for monitoring and statistics.

        Args:
            organization_id: Organization UUID
            model_type: Optional model type filter
            since: Count deletions after this date

        Returns:
            Number of deletion records
        """

        return await self.repo.count_deletions(
            organization_id=organization_id,
            model_type=model_type,
            since=since,
        )

    async def get_user_activity(
        self,
        organization_id: UUID,
        user_id: UUID,
        limit: int = 100,
    ) -> List[dict]:
        """
        Get user's deletion activity for auditing purposes.

        Args:
            organization_id: Organization UUID
            user_id: User UUID
            limit: Maximum results

        Returns:
            List of deletion records formatted as dicts
        """

        logs = await self.repo.get_deletions_by_user(
            organization_id=organization_id,
            user_id=user_id,
            limit=limit,
        )

        return [
            {
                "id": str(log.id),
                "model_type": log.model_type,
                "record_id": str(log.record_id),
                "record_name": log.record_name,
                "deleted_at": log.deleted_at.isoformat(),
                "reason": log.deletion_reason,
                "custom_reason": log.custom_reason,
                "ip_address": str(log.ip_address) if log.ip_address else None,
            }
            for log in logs
        ]

    async def get_model_type_activity(
        self,
        organization_id: UUID,
        model_type: str,
        limit: int = 100,
    ) -> List[dict]:
        """
        Get deletion activity for a specific model type.

        Useful for understanding deletion patterns (e.g., "who deleted all our contacts?").

        Args:
            organization_id: Organization UUID
            model_type: Type of model
            limit: Maximum results

        Returns:
            List of deletion records formatted as dicts
        """

        logs = await self.repo.get_deletions_by_model_type(
            organization_id=organization_id,
            model_type=model_type,
            limit=limit,
        )

        return [
            {
                "id": str(log.id),
                "record_id": str(log.record_id),
                "record_name": log.record_name,
                "deleted_by": log.deleted_by_user.full_name if log.deleted_by_user else "Unknown",
                "deleted_by_id": str(log.deleted_by_user_id) if log.deleted_by_user_id else None,
                "deleted_at": log.deleted_at.isoformat(),
                "reason": log.deletion_reason,
                "ip_address": str(log.ip_address) if log.ip_address else None,
            }
            for log in logs
        ]

    async def get_deletion_statistics(
        self,
        organization_id: UUID,
    ) -> dict:
        """
        Get deletion statistics for an organization.

        Returns overview metrics for compliance and monitoring.

        Args:
            organization_id: Organization UUID

        Returns:
            Dictionary with statistics
        """

        # Get counts by model type
        model_types = [
            "Contact",
            "Campaign",
            "Flow",
            "ChatBot",
            "User",
            "Department",
            "Organization",
            "WhatsAppTemplate",
            "Queue",
            "Secret",
        ]

        counts_by_model = {}
        for model_type in model_types:
            count = await self.repo.count_deletions(
                organization_id=organization_id,
                model_type=model_type,
            )
            if count > 0:
                counts_by_model[model_type] = count

        total_deletions = sum(counts_by_model.values())

        return {
            "organization_id": str(organization_id),
            "total_deletions": total_deletions,
            "by_model_type": counts_by_model,
            "timestamp": datetime.utcnow().isoformat(),
        }
