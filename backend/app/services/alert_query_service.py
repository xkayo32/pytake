"""
Advanced Alert Query Service
- Complex filtering with multiple conditions
- Full-text search across alerts
- Aggregation queries (group by, count, etc)
- Sorting and pagination
- Performance optimized with proper indexing
"""

import logging
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from uuid import UUID
from enum import Enum

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import (
    select, and_, or_, func, desc, asc,
    case, cast, String, text, exists
)
from sqlalchemy.orm import selectinload

from app.models.alert import Alert, AlertStatus, AlertSeverity, AlertType
from app.models.user import User
from app.repositories.alert import AlertRepository

logger = logging.getLogger(__name__)


class SortField(str, Enum):
    """Available fields for sorting."""
    CREATED_AT = "created_at"
    UPDATED_AT = "updated_at"
    SEVERITY = "severity"
    STATUS = "status"
    TITLE = "title"


class SortOrder(str, Enum):
    """Sort order direction."""
    ASC = "asc"
    DESC = "desc"


class AlertQueryFilter:
    """
    Advanced filter builder for alerts.
    Supports complex boolean combinations.
    """

    def __init__(self, organization_id: UUID):
        self.organization_id = organization_id
        self.conditions = []

    def by_severity(self, severities: List[AlertSeverity]) -> "AlertQueryFilter":
        """Filter by one or more severity levels."""
        if severities:
            self.conditions.append(Alert.severity.in_(severities))
        return self

    def by_status(self, statuses: List[AlertStatus]) -> "AlertQueryFilter":
        """Filter by one or more statuses."""
        if statuses:
            self.conditions.append(Alert.status.in_(statuses))
        return self

    def by_type(self, types: List[AlertType]) -> "AlertQueryFilter":
        """Filter by one or more alert types."""
        if types:
            self.conditions.append(Alert.alert_type.in_(types))
        return self

    def by_template_id(self, template_id: UUID) -> "AlertQueryFilter":
        """Filter by specific template."""
        if template_id:
            self.conditions.append(Alert.template_id == template_id)
        return self

    def by_user_id(self, user_id: UUID) -> "AlertQueryFilter":
        """Filter by user who acknowledged/resolved alert."""
        if user_id:
            self.conditions.append(Alert.acknowledged_by == user_id)
        return self

    def by_date_range(
        self, start_date: Optional[datetime], end_date: Optional[datetime]
    ) -> "AlertQueryFilter":
        """Filter by creation date range."""
        if start_date:
            self.conditions.append(Alert.created_at >= start_date)
        if end_date:
            self.conditions.append(Alert.created_at <= end_date)
        return self

    def escalated_only(self) -> "AlertQueryFilter":
        """Filter to escalated alerts only."""
        self.conditions.append(Alert.escalation_level.isnot(None))
        return self

    def unacknowledged_only(self) -> "AlertQueryFilter":
        """Filter to unacknowledged alerts only."""
        self.conditions.append(Alert.acknowledged_at.is_(None))
        return self

    def unresolved_only(self) -> "AlertQueryFilter":
        """Filter to unresolved alerts only."""
        self.conditions.append(Alert.status != AlertStatus.RESOLVED)
        return self

    def text_search(self, search_term: str) -> "AlertQueryFilter":
        """Full-text search in title and description."""
        if search_term:
            search_pattern = f"%{search_term}%"
            self.conditions.append(
                or_(
                    Alert.title.ilike(search_pattern),
                    Alert.description.ilike(search_pattern),
                )
            )
        return self

    def build(self) -> List:
        """Build final condition list with organization filter."""
        all_conditions = [Alert.organization_id == self.organization_id]
        all_conditions.extend(self.conditions)
        return all_conditions


class AlertQueryService:
    """
    High-performance query service for alerts.
    Handles filtering, searching, aggregation, sorting.
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = AlertRepository(db)

    async def search_alerts(
        self,
        organization_id: UUID,
        severity: Optional[List[str]] = None,
        status: Optional[List[str]] = None,
        alert_type: Optional[List[str]] = None,
        template_id: Optional[UUID] = None,
        search_text: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        escalated: bool = False,
        unacknowledged: bool = False,
        sort_by: SortField = SortField.CREATED_AT,
        sort_order: SortOrder = SortOrder.DESC,
        skip: int = 0,
        limit: int = 50,
    ) -> Dict[str, Any]:
        """
        Advanced search with complex filtering.
        
        Returns:
            {
                'total': int,
                'returned': int,
                'alerts': List[Alert],
                'facets': {
                    'by_severity': Dict,
                    'by_status': Dict,
                    'by_type': Dict,
                }
            }
        """
        try:
            # Build filter
            filter_builder = AlertQueryFilter(organization_id)

            # Apply filters
            if severity:
                severities = [AlertSeverity(s) for s in severity if s]
                filter_builder.by_severity(severities)

            if status:
                statuses = [AlertStatus(s) for s in status if s]
                filter_builder.by_status(statuses)

            if alert_type:
                types = [AlertType(t) for t in alert_type if t]
                filter_builder.by_type(types)

            if template_id:
                filter_builder.by_template_id(template_id)

            if search_text:
                filter_builder.text_search(search_text)

            if date_from or date_to:
                filter_builder.by_date_range(date_from, date_to)

            if escalated:
                filter_builder.escalated_only()

            if unacknowledged:
                filter_builder.unacknowledged_only()

            conditions = filter_builder.build()

            # Count total matching
            count_stmt = select(func.count(Alert.id)).where(and_(*conditions))
            total = await self.db.scalar(count_stmt)

            # Build sort clause
            sort_column = getattr(Alert, sort_by.value)
            if sort_order == SortOrder.DESC:
                sort_clause = desc(sort_column)
            else:
                sort_clause = asc(sort_column)

            # Fetch alerts with eager loading
            stmt = (
                select(Alert)
                .where(and_(*conditions))
                .order_by(sort_clause)
                .offset(skip)
                .limit(min(limit, 100))  # Cap at 100
                .options(
                    selectinload(Alert.template),
                    selectinload(Alert.created_by),
                    selectinload(Alert.acknowledged_by),
                )
            )

            result = await self.db.execute(stmt)
            alerts = result.scalars().all()

            # Calculate facets for remaining items
            facets = await self._calculate_facets(organization_id, conditions)

            return {
                'total': total or 0,
                'returned': len(alerts),
                'alerts': alerts,
                'facets': facets,
            }

        except Exception as e:
            logger.error(f"❌ Alert search failed: {e}", exc_info=True)
            return {
                'total': 0,
                'returned': 0,
                'alerts': [],
                'facets': {},
            }

    async def _calculate_facets(
        self, organization_id: UUID, conditions: List
    ) -> Dict[str, Dict[str, int]]:
        """Calculate aggregation facets for filter UI."""
        try:
            # By severity
            severity_stmt = (
                select(
                    Alert.severity,
                    func.count(Alert.id).label('count')
                )
                .where(and_(*conditions))
                .group_by(Alert.severity)
            )
            severity_result = await self.db.execute(severity_stmt)
            severity_facets = {
                row[0].value: row[1] for row in severity_result.fetchall()
            }

            # By status
            status_stmt = (
                select(
                    Alert.status,
                    func.count(Alert.id).label('count')
                )
                .where(and_(*conditions))
                .group_by(Alert.status)
            )
            status_result = await self.db.execute(status_stmt)
            status_facets = {
                row[0].value: row[1] for row in status_result.fetchall()
            }

            # By type
            type_stmt = (
                select(
                    Alert.alert_type,
                    func.count(Alert.id).label('count')
                )
                .where(and_(*conditions))
                .group_by(Alert.alert_type)
            )
            type_result = await self.db.execute(type_stmt)
            type_facets = {
                row[0].value: row[1] for row in type_result.fetchall()
            }

            return {
                'by_severity': severity_facets,
                'by_status': status_facets,
                'by_type': type_facets,
            }

        except Exception as e:
            logger.warning(f"⚠️  Facet calculation failed: {e}")
            return {}

    async def get_alert_timeline(
        self,
        organization_id: UUID,
        days: int = 7,
    ) -> List[Dict[str, Any]]:
        """
        Get alert creation timeline for last N days.
        Useful for trend visualization.
        """
        try:
            start_date = datetime.utcnow() - timedelta(days=days)

            stmt = (
                select(
                    func.date(Alert.created_at).label('date'),
                    func.count(Alert.id).label('total'),
                    Alert.severity,
                )
                .where(
                    and_(
                        Alert.organization_id == organization_id,
                        Alert.created_at >= start_date,
                    )
                )
                .group_by(func.date(Alert.created_at), Alert.severity)
                .order_by(func.date(Alert.created_at))
            )

            result = await self.db.execute(stmt)
            rows = result.fetchall()

            # Convert to timeline format
            timeline = {}
            for row in rows:
                date_str = row[0].isoformat() if row[0] else None
                if date_str not in timeline:
                    timeline[date_str] = {
                        'date': date_str,
                        'total': 0,
                        'by_severity': {}
                    }

                timeline[date_str]['total'] += row[1]
                severity = row[2].value if row[2] else 'unknown'
                timeline[date_str]['by_severity'][severity] = row[1]

            return list(timeline.values())

        except Exception as e:
            logger.error(f"❌ Timeline query failed: {e}")
            return []

    async def get_alert_stats(
        self, organization_id: UUID
    ) -> Dict[str, Any]:
        """
        Get comprehensive alert statistics.
        Includes counts, rates, distribution.
        """
        try:
            base_condition = Alert.organization_id == organization_id

            # Total counts
            total_stmt = select(func.count(Alert.id)).where(base_condition)
            total = await self.db.scalar(total_stmt)

            open_stmt = select(func.count(Alert.id)).where(
                and_(
                    base_condition,
                    Alert.status == AlertStatus.OPEN,
                )
            )
            open_count = await self.db.scalar(open_stmt)

            acknowledged_stmt = select(func.count(Alert.id)).where(
                and_(
                    base_condition,
                    Alert.status == AlertStatus.ACKNOWLEDGED,
                )
            )
            acknowledged_count = await self.db.scalar(acknowledged_stmt)

            resolved_stmt = select(func.count(Alert.id)).where(
                and_(
                    base_condition,
                    Alert.status == AlertStatus.RESOLVED,
                )
            )
            resolved_count = await self.db.scalar(resolved_stmt)

            escalated_stmt = select(func.count(Alert.id)).where(
                and_(
                    base_condition,
                    Alert.escalation_level.isnot(None),
                )
            )
            escalated_count = await self.db.scalar(escalated_stmt)

            # Average response time (ack to creation)
            avg_response_stmt = select(
                func.avg(
                    func.extract('epoch', Alert.acknowledged_at - Alert.created_at)
                )
            ).where(
                and_(
                    base_condition,
                    Alert.acknowledged_at.isnot(None),
                )
            )
            avg_response_seconds = await self.db.scalar(avg_response_stmt) or 0

            # Average resolution time (resolution to creation)
            avg_resolution_stmt = select(
                func.avg(
                    func.extract('epoch', Alert.updated_at - Alert.created_at)
                )
            ).where(
                and_(
                    base_condition,
                    Alert.status == AlertStatus.RESOLVED,
                )
            )
            avg_resolution_seconds = await self.db.scalar(avg_resolution_stmt) or 0

            return {
                'total_alerts': total or 0,
                'status': {
                    'open': open_count or 0,
                    'acknowledged': acknowledged_count or 0,
                    'resolved': resolved_count or 0,
                },
                'escalated_count': escalated_count or 0,
                'escalation_rate': (escalated_count / total * 100) if total else 0,
                'avg_response_time_seconds': int(avg_response_seconds),
                'avg_resolution_time_seconds': int(avg_resolution_seconds),
                'resolution_rate': (resolved_count / total * 100) if total else 0,
            }

        except Exception as e:
            logger.error(f"❌ Stats query failed: {e}")
            return {}

    async def find_similar_alerts(
        self,
        alert_id: UUID,
        organization_id: UUID,
        limit: int = 5,
    ) -> List[Alert]:
        """
        Find similar alerts based on:
        - Same template
        - Same severity
        - Recent (last 7 days)
        """
        try:
            # Get the alert
            alert = await self.repo.get_by_id(alert_id, organization_id)
            if not alert:
                return []

            # Find similar
            stmt = (
                select(Alert)
                .where(
                    and_(
                        Alert.organization_id == organization_id,
                        Alert.id != alert_id,  # Exclude self
                        Alert.template_id == alert.template_id,
                        Alert.severity == alert.severity,
                        Alert.created_at >= datetime.utcnow() - timedelta(days=7),
                    )
                )
                .order_by(desc(Alert.created_at))
                .limit(limit)
            )

            result = await self.db.execute(stmt)
            return result.scalars().all()

        except Exception as e:
            logger.error(f"❌ Similar alerts search failed: {e}")
            return []


def get_alert_query_service(db: AsyncSession) -> AlertQueryService:
    """Dependency injection for AlertQueryService."""
    return AlertQueryService(db)
