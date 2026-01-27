"""
Tests for Audit Log functionality
"""

import pytest
from datetime import datetime, timedelta
from uuid import uuid4

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog
from app.repositories.audit_log import AuditLogRepository
from app.services.audit_log_service import AuditLogService


@pytest.mark.asyncio
async def test_audit_log_create(db: AsyncSession):
    """Test creating an audit log entry"""

    org_id = uuid4()
    user_id = uuid4()
    record_id = uuid4()

    repo = AuditLogRepository(db)

    log = await repo.log_delete(
        organization_id=org_id,
        deleted_by_user_id=user_id,
        model_type="Contact",
        record_id=record_id,
        record_name="João Silva",
        deletion_reason="duplicate",
        deleted_data_snapshot={"name": "João Silva", "email": "joao@example.com"},
        ip_address="192.168.1.1",
        user_agent="Mozilla/5.0",
    )

    assert log.id is not None
    assert log.organization_id == org_id
    assert log.deleted_by_user_id == user_id
    assert log.model_type == "Contact"
    assert log.record_id == record_id
    assert log.record_name == "João Silva"
    assert log.deletion_reason == "duplicate"
    assert log.deleted_data_snapshot["name"] == "João Silva"
    assert str(log.ip_address) == "192.168.1.1"


@pytest.mark.asyncio
async def test_audit_log_get_deletion_logs(db: AsyncSession):
    """Test retrieving deletion logs"""

    org_id = uuid4()
    user_id = uuid4()

    repo = AuditLogRepository(db)

    # Create multiple logs
    for i in range(3):
        await repo.log_delete(
            organization_id=org_id,
            deleted_by_user_id=user_id,
            model_type="Contact",
            record_id=uuid4(),
            record_name=f"Contact {i}",
            deletion_reason="user_request",
        )

    # Retrieve logs
    logs = await repo.get_deletion_logs(
        organization_id=org_id,
        limit=10,
    )

    assert len(logs) == 3
    assert all(log.organization_id == org_id for log in logs)
    assert all(log.deleted_by_user_id == user_id for log in logs)


@pytest.mark.asyncio
async def test_audit_log_filter_by_model_type(db: AsyncSession):
    """Test filtering logs by model type"""

    org_id = uuid4()
    user_id = uuid4()

    repo = AuditLogRepository(db)

    # Create logs of different types
    await repo.log_delete(
        organization_id=org_id,
        deleted_by_user_id=user_id,
        model_type="Contact",
        record_id=uuid4(),
        record_name="Contact 1",
    )

    await repo.log_delete(
        organization_id=org_id,
        deleted_by_user_id=user_id,
        model_type="Campaign",
        record_id=uuid4(),
        record_name="Campaign 1",
    )

    # Filter by Contact
    contact_logs = await repo.get_deletion_logs(
        organization_id=org_id,
        model_type="Contact",
    )

    assert len(contact_logs) == 1
    assert contact_logs[0].model_type == "Contact"


@pytest.mark.asyncio
async def test_audit_log_filter_by_user(db: AsyncSession):
    """Test filtering logs by user"""

    org_id = uuid4()
    user_id_1 = uuid4()
    user_id_2 = uuid4()

    repo = AuditLogRepository(db)

    # Create logs from different users
    await repo.log_delete(
        organization_id=org_id,
        deleted_by_user_id=user_id_1,
        model_type="Contact",
        record_id=uuid4(),
        record_name="Deleted by user 1",
    )

    await repo.log_delete(
        organization_id=org_id,
        deleted_by_user_id=user_id_2,
        model_type="Contact",
        record_id=uuid4(),
        record_name="Deleted by user 2",
    )

    # Filter by user 1
    user_1_logs = await repo.get_deletion_logs(
        organization_id=org_id,
        deleted_by_user_id=user_id_1,
    )

    assert len(user_1_logs) == 1
    assert user_1_logs[0].deleted_by_user_id == user_id_1


@pytest.mark.asyncio
async def test_audit_log_record_history(db: AsyncSession):
    """Test getting deletion history for a specific record"""

    org_id = uuid4()
    user_id = uuid4()
    record_id = uuid4()

    repo = AuditLogRepository(db)

    # Log initial deletion
    await repo.log_delete(
        organization_id=org_id,
        deleted_by_user_id=user_id,
        model_type="Contact",
        record_id=record_id,
        record_name="João Silva",
        deletion_reason="error",
    )

    # Get history
    history = await repo.get_record_deletion_history(
        organization_id=org_id,
        model_type="Contact",
        record_id=record_id,
    )

    assert len(history) == 1
    assert history[0].record_id == record_id
    assert history[0].deletion_reason == "error"


@pytest.mark.asyncio
async def test_audit_log_count_deletions(db: AsyncSession):
    """Test counting deletions"""

    org_id = uuid4()
    user_id = uuid4()

    repo = AuditLogRepository(db)

    # Create multiple logs
    for i in range(5):
        await repo.log_delete(
            organization_id=org_id,
            deleted_by_user_id=user_id,
            model_type="Contact",
            record_id=uuid4(),
            record_name=f"Contact {i}",
        )

    count = await repo.count_deletions(
        organization_id=org_id,
        model_type="Contact",
    )

    assert count == 5


@pytest.mark.asyncio
async def test_audit_log_get_deletions_by_user(db: AsyncSession):
    """Test getting deletions by a specific user"""

    org_id = uuid4()
    user_id = uuid4()

    repo = AuditLogRepository(db)

    # Create logs
    for i in range(3):
        await repo.log_delete(
            organization_id=org_id,
            deleted_by_user_id=user_id,
            model_type="Contact",
            record_id=uuid4(),
            record_name=f"Contact {i}",
        )

    user_deletions = await repo.get_deletions_by_user(
        organization_id=org_id,
        user_id=user_id,
    )

    assert len(user_deletions) == 3
    assert all(log.deleted_by_user_id == user_id for log in user_deletions)


@pytest.mark.asyncio
async def test_audit_log_get_deletions_by_model_type(db: AsyncSession):
    """Test getting deletions by model type"""

    org_id = uuid4()
    user_id = uuid4()

    repo = AuditLogRepository(db)

    # Create logs of the same type
    for i in range(4):
        await repo.log_delete(
            organization_id=org_id,
            deleted_by_user_id=user_id,
            model_type="Campaign",
            record_id=uuid4(),
            record_name=f"Campaign {i}",
        )

    campaign_deletions = await repo.get_deletions_by_model_type(
        organization_id=org_id,
        model_type="Campaign",
    )

    assert len(campaign_deletions) == 4
    assert all(log.model_type == "Campaign" for log in campaign_deletions)


@pytest.mark.asyncio
async def test_audit_log_service_log_deletion(db: AsyncSession):
    """Test service logging a deletion"""

    org_id = uuid4()
    user_id = uuid4()
    record_id = uuid4()

    service = AuditLogService(db)

    log = await service.log_deletion(
        organization_id=org_id,
        deleted_by_user_id=user_id,
        model_type="Contact",
        record_id=record_id,
        record_name="Ana Silva",
        deletion_reason="compliance",
        deleted_data_snapshot={"name": "Ana Silva"},
    )

    assert log.model_type == "Contact"
    assert log.deletion_reason == "compliance"


@pytest.mark.asyncio
async def test_audit_log_service_get_statistics(db: AsyncSession):
    """Test getting deletion statistics"""

    org_id = uuid4()
    user_id = uuid4()

    service = AuditLogService(db)

    # Create deletions of different types
    await service.log_deletion(
        organization_id=org_id,
        deleted_by_user_id=user_id,
        model_type="Contact",
        record_id=uuid4(),
        record_name="Contact 1",
    )

    await service.log_deletion(
        organization_id=org_id,
        deleted_by_user_id=user_id,
        model_type="Contact",
        record_id=uuid4(),
        record_name="Contact 2",
    )

    await service.log_deletion(
        organization_id=org_id,
        deleted_by_user_id=user_id,
        model_type="Campaign",
        record_id=uuid4(),
        record_name="Campaign 1",
    )

    stats = await service.get_deletion_statistics(org_id)

    assert stats["total_deletions"] == 3
    assert stats["by_model_type"]["Contact"] == 2
    assert stats["by_model_type"]["Campaign"] == 1


@pytest.mark.asyncio
async def test_audit_log_multi_tenancy(db: AsyncSession):
    """Test that audit logs respect multi-tenancy"""

    org_id_1 = uuid4()
    org_id_2 = uuid4()
    user_id = uuid4()

    repo = AuditLogRepository(db)

    # Create logs in different orgs
    await repo.log_delete(
        organization_id=org_id_1,
        deleted_by_user_id=user_id,
        model_type="Contact",
        record_id=uuid4(),
        record_name="Org 1 Contact",
    )

    await repo.log_delete(
        organization_id=org_id_2,
        deleted_by_user_id=user_id,
        model_type="Contact",
        record_id=uuid4(),
        record_name="Org 2 Contact",
    )

    # Get logs for org 1
    org_1_logs = await repo.get_deletion_logs(organization_id=org_id_1)

    # Should only see org 1's logs
    assert len(org_1_logs) == 1
    assert org_1_logs[0].organization_id == org_id_1


@pytest.mark.asyncio
async def test_audit_log_date_filtering(db: AsyncSession):
    """Test filtering by date range"""

    org_id = uuid4()
    user_id = uuid4()

    repo = AuditLogRepository(db)

    now = datetime.utcnow()

    # Create a log
    await repo.log_delete(
        organization_id=org_id,
        deleted_by_user_id=user_id,
        model_type="Contact",
        record_id=uuid4(),
        record_name="Contact",
    )

    # Filter by date range
    logs = await repo.get_deletion_logs(
        organization_id=org_id,
        since=now - timedelta(minutes=1),
        until=now + timedelta(minutes=1),
    )

    assert len(logs) == 1
