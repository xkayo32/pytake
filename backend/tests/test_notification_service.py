"""Tests for notification service and preferences"""

import pytest
from uuid import uuid4
from app.models.notification import NotificationChannel, NotificationPreference
from app.repositories.notification import NotificationPreferenceRepository
from app.services.notification_service import NotificationService


@pytest.mark.asyncio
async def test_should_notify_respects_enabled_flag(db_session):
    """Verify disabled channels don't send notifications"""
    user_id = str(uuid4())
    org_id = str(uuid4())
    
    repo = NotificationPreferenceRepository(db_session)
    pref = await repo.get_or_create(user_id, org_id)
    pref.email_enabled = False
    await repo.update(pref)
    
    service = NotificationService(repo)
    result = await service.should_notify(user_id, org_id, NotificationChannel.EMAIL)
    assert result is False


@pytest.mark.asyncio
async def test_should_notify_respects_quiet_hours(db_session):
    """Verify quiet hours prevent notifications"""
    from datetime import datetime, time
    
    user_id = str(uuid4())
    org_id = str(uuid4())
    
    repo = NotificationPreferenceRepository(db_session)
    pref = await repo.get_or_create(user_id, org_id)
    pref.quiet_hours_enabled = True
    pref.quiet_hours_start = "22:00"
    pref.quiet_hours_end = "08:00"
    await repo.update(pref)
    
    service = NotificationService(repo)
    result = await service.should_notify(user_id, org_id, NotificationChannel.EMAIL)
    
    now = datetime.utcnow().time()
    start = datetime.strptime("22:00", "%H:%M").time()
    end = datetime.strptime("08:00", "%H:%M").time()
    
    if start > end:  # Overnight range
        expected = not (now >= start or now <= end)
    else:
        expected = not (start <= now <= end)
    
    assert result == expected


@pytest.mark.asyncio
async def test_notification_preference_defaults(db_session):
    """Verify preference defaults are correct"""
    user_id = str(uuid4())
    org_id = str(uuid4())
    
    repo = NotificationPreferenceRepository(db_session)
    pref = await repo.get_or_create(user_id, org_id)
    
    assert pref.email_enabled is True
    assert pref.sms_enabled is False
    assert pref.websocket_enabled is True
    assert pref.quiet_hours_enabled is False
    assert pref.max_emails_per_hour == 10
