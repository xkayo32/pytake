"""Tests for notification repositories"""

import pytest
from uuid import uuid4
from datetime import datetime, timedelta
from app.models.notification import NotificationLog, NotificationChannel, NotificationType
from app.repositories.notification import NotificationLogRepository


@pytest.mark.asyncio
async def test_get_logs_by_org(db_session):
    """Verify logs are filtered by organization"""
    org_id = str(uuid4())
    user_id = str(uuid4())
    
    log1 = NotificationLog(
        organization_id=org_id,
        user_id=user_id,
        notification_type=NotificationType.CONVERSATION_ASSIGNED,
        channel=NotificationChannel.EMAIL,
        recipient="test@example.com",
        message="Test message",
        status="sent"
    )
    db_session.add(log1)
    await db_session.flush()
    
    repo = NotificationLogRepository(db_session)
    logs = await repo.get_by_org(org_id)
    
    assert len(logs) >= 1
    assert all(log.organization_id == org_id for log in logs)


@pytest.mark.asyncio
async def test_get_failed_for_retry(db_session):
    """Verify failed logs are retrievable for retry"""
    org_id = str(uuid4())
    user_id = str(uuid4())
    
    log_failed = NotificationLog(
        organization_id=org_id,
        user_id=user_id,
        notification_type=NotificationType.SLA_WARNING,
        channel=NotificationChannel.EMAIL,
        recipient="test@example.com",
        message="Test",
        status="failed",
        retry_count=0,
        max_retries=3,
        error_message="SMTP timeout"
    )
    db_session.add(log_failed)
    await db_session.flush()
    
    repo = NotificationLogRepository(db_session)
    retry_logs = await repo.get_failed_for_retry()
    
    assert any(log.id == log_failed.id for log in retry_logs)
