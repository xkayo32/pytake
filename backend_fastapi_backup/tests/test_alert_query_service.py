"""
Tests for Advanced Alert Query Service
"""

import pytest
from datetime import datetime, timedelta
from uuid import uuid4
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.mark.asyncio
class TestAlertQueryFilter:
    """Test alert filtering builder."""

    async def test_filter_by_severity(self):
        """Test severity filtering."""
        from app.models.alert import AlertSeverity
        from app.services.alert_query_service import AlertQueryFilter

        org_id = uuid4()
        filter_builder = AlertQueryFilter(org_id)

        # Use available severity values
        filter_builder.by_severity([AlertSeverity.CRITICAL])

        conditions = filter_builder.build()
        assert len(conditions) > 0

    async def test_filter_by_status(self):
        """Test status filtering."""
        from app.models.alert import AlertStatus
        from app.services.alert_query_service import AlertQueryFilter

        org_id = uuid4()
        filter_builder = AlertQueryFilter(org_id)

        filter_builder.by_status([AlertStatus.OPEN])

        conditions = filter_builder.build()
        assert len(conditions) > 0

    async def test_chained_filters(self):
        """Test multiple filters chained."""
        from app.models.alert import AlertStatus, AlertSeverity
        from app.services.alert_query_service import AlertQueryFilter

        org_id = uuid4()
        filter_builder = (
            AlertQueryFilter(org_id)
            .by_severity([AlertSeverity.CRITICAL])
            .by_status([AlertStatus.OPEN])
            .unacknowledged_only()
        )

        conditions = filter_builder.build()
        assert len(conditions) >= 3


@pytest.mark.asyncio
class TestAlertQueryService:
    """Test alert query service."""

    async def test_search_alerts_basic(self):
        """Test basic alert search."""
        from app.services.alert_query_service import AlertQueryService
        from unittest.mock import AsyncMock, MagicMock

        db_mock = AsyncMock(spec=AsyncSession)
        service = AlertQueryService(db_mock)

        # Test that search returns proper structure
        result = await service.search_alerts(
            organization_id=uuid4(),
            limit=10,
        )

        assert 'total' in result
        assert 'returned' in result
        assert 'alerts' in result
        assert 'facets' in result

    async def test_get_alert_timeline(self):
        """Test timeline generation."""
        from app.services.alert_query_service import AlertQueryService
        from unittest.mock import AsyncMock

        db_mock = AsyncMock(spec=AsyncSession)
        service = AlertQueryService(db_mock)

        # Mock scalar response
        db_mock.execute = AsyncMock()

        timeline = await service.get_alert_timeline(
            organization_id=uuid4(),
            days=7,
        )

        assert isinstance(timeline, list)

    async def test_get_alert_stats(self):
        """Test statistics calculation."""
        from app.services.alert_query_service import AlertQueryService
        from unittest.mock import AsyncMock

        db_mock = AsyncMock(spec=AsyncSession)
        service = AlertQueryService(db_mock)

        # Mock scalar responses to return proper values
        scalar_side_effects = [
            100,  # total_alerts
            20,   # open
            30,   # acknowledged
            50,   # resolved
            10,   # escalated
            45.5, # avg_response_seconds
            120.3 # avg_resolution_seconds
        ]
        db_mock.scalar = AsyncMock(side_effect=scalar_side_effects)

        stats = await service.get_alert_stats(
            organization_id=uuid4(),
        )

        assert 'total_alerts' in stats
        assert 'status' in stats
        assert 'escalation_rate' in stats
        assert 'resolution_rate' in stats

    async def test_find_similar_alerts(self):
        """Test similar alert finding."""
        from app.services.alert_query_service import AlertQueryService
        from unittest.mock import AsyncMock

        db_mock = AsyncMock(spec=AsyncSession)
        service = AlertQueryService(db_mock)

        # Mock repo
        service.repo.get_by_id = AsyncMock(return_value=None)

        similar = await service.find_similar_alerts(
            alert_id=uuid4(),
            organization_id=uuid4(),
        )

        assert isinstance(similar, list)


@pytest.mark.asyncio
class TestSortAndPagination:
    """Test sorting and pagination."""

    async def test_sort_by_created_at(self):
        """Test sorting by creation date."""
        from app.services.alert_query_service import SortField, SortOrder
        from app.models.alert import Alert

        assert SortField.CREATED_AT.value == "created_at"
        assert SortOrder.DESC.value == "desc"

    async def test_pagination_limits(self):
        """Test pagination limit capping."""
        from app.services.alert_query_service import AlertQueryService
        from unittest.mock import AsyncMock

        db_mock = AsyncMock(spec=AsyncSession)
        service = AlertQueryService(db_mock)

        # Should cap limit at 100
        result = await service.search_alerts(
            organization_id=uuid4(),
            limit=500,  # Request more than cap
        )

        assert 'returned' in result


@pytest.mark.asyncio
class TestTextSearch:
    """Test full-text search functionality."""

    async def test_text_search_title(self):
        """Test search in alert title."""
        from app.services.alert_query_service import AlertQueryFilter

        org_id = uuid4()
        filter_builder = AlertQueryFilter(org_id)

        filter_builder.text_search("critical")

        conditions = filter_builder.build()
        # Should have organization + text search conditions
        assert len(conditions) >= 2

    async def test_text_search_empty(self):
        """Test empty text search."""
        from app.services.alert_query_service import AlertQueryFilter

        org_id = uuid4()
        filter_builder = AlertQueryFilter(org_id)

        filter_builder.text_search("")

        conditions = filter_builder.build()
        # Should only have organization condition
        assert len(conditions) == 1


@pytest.mark.asyncio
class TestDateRangeFiltering:
    """Test date range filtering."""

    async def test_date_range_filter(self):
        """Test filtering by date range."""
        from app.services.alert_query_service import AlertQueryFilter

        org_id = uuid4()
        now = datetime.utcnow()
        start = now - timedelta(days=7)
        end = now

        filter_builder = AlertQueryFilter(org_id)
        filter_builder.by_date_range(start, end)

        conditions = filter_builder.build()
        assert len(conditions) >= 3  # org + start + end

    async def test_date_range_partial(self):
        """Test filtering with only start date."""
        from app.services.alert_query_service import AlertQueryFilter

        org_id = uuid4()
        start = datetime.utcnow() - timedelta(days=7)

        filter_builder = AlertQueryFilter(org_id)
        filter_builder.by_date_range(start, None)

        conditions = filter_builder.build()
        assert len(conditions) >= 2  # org + start


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
