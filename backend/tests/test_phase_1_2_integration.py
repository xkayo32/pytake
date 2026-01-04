"""
Integration tests for Phase 1.2 - Template Status Webhooks

Tests the complete flow:
1. Webhook received from Meta with template status update
2. Template status updated in database
3. Campaign auto-paused if needed
4. Alerts created for critical statuses
5. Notifications sent (email/slack)

Author: Kayo Carvalho Fernandes
"""

import pytest
import logging
from uuid import uuid4
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, patch, MagicMock

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.models.organization import Organization
from app.models.user import User
from app.models.whatsapp_number import WhatsAppNumber, WhatsAppTemplate
from app.models.campaign import Campaign
from app.models.alert import Alert, AlertType, AlertSeverity, AlertStatus
from app.services.template_status_service import TemplateStatusService
from app.services.campaign_service import CampaignService
from app.services.alert_service import AlertService

logger = logging.getLogger(__name__)


@pytest.fixture
async def test_db():
    """Create test database session using PostgreSQL async driver."""
    import os
    
    # Use test database URL from environment
    db_url = os.getenv(
        "TEST_DATABASE_URL",
        "postgresql+asyncpg://pytake:pytake123@localhost:5435/pytake_test"
    )
    
    engine = create_async_engine(db_url, echo=False, future=True)
    
    # Create tables
    from app.models.base import Base
    async with engine.begin() as conn:
        try:
            await conn.run_sync(Base.metadata.create_all)
        except Exception as e:
            logger.warning(f"Could not create tables (may already exist): {e}")
    
    AsyncSessionLocal = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False, future=True
    )
    
    async with AsyncSessionLocal() as session:
        yield session
    
    await engine.dispose()


@pytest.fixture
async def org(test_db):
    """Create test organization."""
    org = Organization(
        id=uuid4(),
        name="Test Org",
        slug="test-org"
    )
    test_db.add(org)
    await test_db.commit()
    await test_db.refresh(org)
    return org


@pytest.fixture
async def user(test_db, org):
    """Create test user."""
    user = User(
        id=uuid4(),
        organization_id=org.id,
        email="test@test.com",
        full_name="Test User",
        hashed_password="pwd",
        role="org_admin",
        is_active=True
    )
    test_db.add(user)
    await test_db.commit()
    await test_db.refresh(user)
    return user


@pytest.fixture
async def whatsapp_number(test_db, org):
    """Create test WhatsApp number."""
    wa_num = WhatsAppNumber(
        id=uuid4(),
        organization_id=org.id,
        phone_number="+5511999999999",
        phone_number_id="123456789",
        waba_id="987654321",
        display_name="Test Business",
        verified_name="Test Business",
        quality_rating="GREEN",
        status="CONNECTED",
        is_active=True
    )
    test_db.add(wa_num)
    await test_db.commit()
    await test_db.refresh(wa_num)
    return wa_num


@pytest.fixture
async def template(test_db, whatsapp_number):
    """Create test template."""
    tpl = WhatsAppTemplate(
        id=uuid4(),
        whatsapp_number_id=whatsapp_number.id,
        organization_id=whatsapp_number.organization_id,
        name="test_template",
        status="APPROVED",
        category="UTILITY",
        language="pt_BR",
        quality_score="UNKNOWN",
        header_format=None,
        header_text=None,
        body_text="Hello {{name}}",
        footer_text=None,
        buttons=None,
        parameter_format="NAMED",
        named_variables=["name"],
        paused_at=None,
        disabled_at=None,
        disabled_reason=None,
        last_status_update=datetime.utcnow()
    )
    test_db.add(tpl)
    await test_db.commit()
    await test_db.refresh(tpl)
    return tpl


@pytest.fixture
async def campaign(test_db, org):
    """Create test campaign."""
    campaign = Campaign(
        id=uuid4(),
        organization_id=org.id,
        name="Test Campaign",
        description="Test campaign",
        status="ACTIVE",
        scheduled_at=None,
        started_at=datetime.utcnow(),
        completed_at=None,
        paused_at=None,
        is_deleted=False
    )
    test_db.add(campaign)
    await test_db.commit()
    await test_db.refresh(campaign)
    return campaign


class TestTemplateStatusWebhookFlow:
    """Test complete webhook → service → alert flow."""

    @pytest.mark.asyncio
    async def test_webhook_template_approved(self, test_db, org, template):
        """Test webhook processing for APPROVED template."""
        service = TemplateStatusService(test_db)
        
        webhook_data = {
            "event": "APPROVED",
            "quality_score": "UNKNOWN",
            "timestamp": datetime.utcnow().timestamp()
        }
        
        result = await service.process_template_status_update(
            waba_id=template.whatsapp_number.waba_id,
            template_name=template.name,
            organization_id=org.id,
            webhook_data=webhook_data
        )
        
        assert result is not None
        assert result.status == "APPROVED"

    @pytest.mark.asyncio
    async def test_webhook_template_paused(self, test_db, org, template, campaign):
        """Test webhook processing for PAUSED template + campaign auto-pause."""
        service = TemplateStatusService(test_db)
        campaign_service = CampaignService(test_db)
        
        webhook_data = {
            "event": "PAUSED",
            "quality_score": "RED",
            "reason": "POOR_QUALITY",
            "timestamp": datetime.utcnow().timestamp()
        }
        
        # Process webhook
        result = await service.process_template_status_update(
            waba_id=template.whatsapp_number.waba_id,
            template_name=template.name,
            organization_id=org.id,
            webhook_data=webhook_data
        )
        
        # Verify template paused
        assert result is not None
        assert result.paused_at is not None
        assert result.quality_score == "RED"
        
        # Verify campaign was paused
        campaign_check = await test_db.execute(
            select(Campaign).where(Campaign.id == campaign.id)
        )
        campaign_obj = campaign_check.scalar_one_or_none()
        assert campaign_obj is not None
        assert campaign_obj.paused_at is not None

    @pytest.mark.asyncio
    async def test_webhook_template_disabled(self, test_db, org, template):
        """Test webhook processing for DISABLED template."""
        service = TemplateStatusService(test_db)
        
        webhook_data = {
            "event": "DISABLED",
            "quality_score": "RED",
            "reason": "UNACCEPTABLE_QUALITY",
            "timestamp": datetime.utcnow().timestamp()
        }
        
        result = await service.process_template_status_update(
            waba_id=template.whatsapp_number.waba_id,
            template_name=template.name,
            organization_id=org.id,
            webhook_data=webhook_data
        )
        
        assert result is not None
        assert result.disabled_at is not None
        assert result.disabled_reason == "UNACCEPTABLE_QUALITY"

    @pytest.mark.asyncio
    async def test_webhook_quality_score_change(self, test_db, org, template):
        """Test webhook processing for quality score changes."""
        service = TemplateStatusService(test_db)
        
        # Initial quality: UNKNOWN
        assert template.quality_score == "UNKNOWN"
        
        # Simulate quality improvement: UNKNOWN → GREEN
        webhook_data_green = {
            "event": "QUALITY_CHANGE",
            "quality_score": "GREEN",
            "timestamp": datetime.utcnow().timestamp()
        }
        
        result = await service.process_template_status_update(
            waba_id=template.whatsapp_number.waba_id,
            template_name=template.name,
            organization_id=org.id,
            webhook_data=webhook_data_green
        )
        
        assert result.quality_score == "GREEN"
        
        # Simulate quality degradation: GREEN → YELLOW
        webhook_data_yellow = {
            "event": "QUALITY_CHANGE",
            "quality_score": "YELLOW",
            "timestamp": datetime.utcnow().timestamp()
        }
        
        result = await service.process_template_status_update(
            waba_id=template.whatsapp_number.waba_id,
            template_name=template.name,
            organization_id=org.id,
            webhook_data=webhook_data_yellow
        )
        
        assert result.quality_score == "YELLOW"

    @pytest.mark.asyncio
    async def test_alert_created_on_paused(self, test_db, org, template):
        """Test that alert is created when template is paused."""
        service = TemplateStatusService(test_db)
        
        webhook_data = {
            "event": "PAUSED",
            "quality_score": "RED",
            "reason": "POOR_QUALITY",
            "timestamp": datetime.utcnow().timestamp()
        }
        
        # Before webhook
        from sqlalchemy import select as sa_select
        alerts_before = await test_db.execute(
            sa_select(Alert).where(Alert.organization_id == org.id)
        )
        count_before = len(alerts_before.scalars().all())
        
        # Process webhook
        await service.process_template_status_update(
            waba_id=template.whatsapp_number.waba_id,
            template_name=template.name,
            organization_id=org.id,
            webhook_data=webhook_data
        )
        
        # After webhook - check alert created
        alerts_after = await test_db.execute(
            sa_select(Alert).where(Alert.organization_id == org.id)
        )
        count_after = len(alerts_after.scalars().all())
        
        assert count_after > count_before, "Alert should be created on template paused"

    @pytest.mark.asyncio
    async def test_alert_created_on_disabled(self, test_db, org, template):
        """Test that CRITICAL alert is created when template is disabled."""
        service = TemplateStatusService(test_db)
        
        webhook_data = {
            "event": "DISABLED",
            "quality_score": "RED",
            "reason": "UNACCEPTABLE_QUALITY",
            "timestamp": datetime.utcnow().timestamp()
        }
        
        await service.process_template_status_update(
            waba_id=template.whatsapp_number.waba_id,
            template_name=template.name,
            organization_id=org.id,
            webhook_data=webhook_data
        )
        
        # Check alert is CRITICAL
        from sqlalchemy import select as sa_select
        alert_result = await test_db.execute(
            sa_select(Alert).where(
                Alert.organization_id == org.id,
                Alert.alert_type == AlertType.TEMPLATE_DISABLED
            )
        )
        alert = alert_result.scalar_one_or_none()
        
        assert alert is not None
        assert alert.severity == AlertSeverity.CRITICAL

    @pytest.mark.asyncio
    async def test_multi_tenant_isolation(self, test_db):
        """Test that template updates don't affect other organizations."""
        # Create 2 organizations
        org1 = Organization(id=uuid4(), name="Org 1", slug="org1")
        org2 = Organization(id=uuid4(), name="Org 2", slug="org2")
        test_db.add_all([org1, org2])
        await test_db.commit()
        
        # Create templates for each org
        wa_num1 = WhatsAppNumber(
            id=uuid4(), organization_id=org1.id, phone_number="+551",
            phone_number_id="id1", waba_id="waba1", display_name="N1",
            verified_name="N1", quality_rating="GREEN", status="CONNECTED"
        )
        wa_num2 = WhatsAppNumber(
            id=uuid4(), organization_id=org2.id, phone_number="+552",
            phone_number_id="id2", waba_id="waba2", display_name="N2",
            verified_name="N2", quality_rating="GREEN", status="CONNECTED"
        )
        test_db.add_all([wa_num1, wa_num2])
        await test_db.commit()
        
        tpl1 = WhatsAppTemplate(
            id=uuid4(), whatsapp_number_id=wa_num1.id, organization_id=org1.id,
            name="tpl1", status="APPROVED", category="UTILITY", language="pt_BR",
            body_text="Body", parameter_format="NAMED", named_variables=[]
        )
        tpl2 = WhatsAppTemplate(
            id=uuid4(), whatsapp_number_id=wa_num2.id, organization_id=org2.id,
            name="tpl1", status="APPROVED", category="UTILITY", language="pt_BR",
            body_text="Body", parameter_format="NAMED", named_variables=[]
        )
        test_db.add_all([tpl1, tpl2])
        await test_db.commit()
        
        service = TemplateStatusService(test_db)
        
        # Update template in org1
        webhook_data = {
            "event": "PAUSED",
            "quality_score": "RED",
            "timestamp": datetime.utcnow().timestamp()
        }
        
        await service.process_template_status_update(
            waba_id="waba1",
            template_name="tpl1",
            organization_id=org1.id,
            webhook_data=webhook_data
        )
        
        # Verify only org1 template is paused
        from sqlalchemy import select as sa_select
        tpl1_check = await test_db.execute(sa_select(WhatsAppTemplate).where(WhatsAppTemplate.id == tpl1.id))
        tpl2_check = await test_db.execute(sa_select(WhatsAppTemplate).where(WhatsAppTemplate.id == tpl2.id))
        
        t1 = tpl1_check.scalar_one_or_none()
        t2 = tpl2_check.scalar_one_or_none()
        
        assert t1.paused_at is not None, "Org1 template should be paused"
        assert t2.paused_at is None, "Org2 template should NOT be paused"


class TestTemplateStatusQueryMethods:
    """Test query methods for template monitoring."""

    @pytest.mark.asyncio
    async def test_get_critical_templates(self, test_db, org, template):
        """Test querying critical templates."""
        from sqlalchemy import select as sa_select
        
        # Create critical alert
        alert = Alert(
            id=uuid4(),
            organization_id=org.id,
            template_id=template.id,
            alert_type=AlertType.TEMPLATE_DISABLED,
            severity=AlertSeverity.CRITICAL,
            status=AlertStatus.OPEN,
            title="Template Disabled",
            description="Template was disabled by Meta"
        )
        test_db.add(alert)
        await test_db.commit()
        
        # Query critical templates
        stmt = sa_select(WhatsAppTemplate).join(Alert).where(
            Alert.organization_id == org.id,
            Alert.severity == AlertSeverity.CRITICAL
        )
        result = await test_db.execute(stmt)
        templates = result.scalars().unique().all()
        
        assert len(templates) > 0
        assert template in templates

    @pytest.mark.asyncio
    async def test_get_quality_summary(self, test_db, org, template):
        """Test quality score distribution."""
        from sqlalchemy import select as sa_select, func
        
        # Create multiple templates with different quality scores
        templates = []
        for quality in ["GREEN", "YELLOW", "RED"]:
            tpl = WhatsAppTemplate(
                id=uuid4(),
                whatsapp_number_id=template.whatsapp_number_id,
                organization_id=org.id,
                name=f"tpl_{quality}",
                status="APPROVED",
                category="UTILITY",
                language="pt_BR",
                quality_score=quality,
                body_text="Body",
                parameter_format="NAMED",
                named_variables=[]
            )
            test_db.add(tpl)
            templates.append(tpl)
        
        await test_db.commit()
        
        # Get summary
        stmt = (
            sa_select(
                WhatsAppTemplate.quality_score,
                func.count(WhatsAppTemplate.id).label('count')
            )
            .where(WhatsAppTemplate.organization_id == org.id)
            .group_by(WhatsAppTemplate.quality_score)
        )
        result = await test_db.execute(stmt)
        summary = {row[0]: row[1] for row in result.fetchall()}
        
        assert "GREEN" in summary
        assert "YELLOW" in summary
        assert "RED" in summary


class TestWebhookErrorHandling:
    """Test error handling in webhook processing."""

    @pytest.mark.asyncio
    async def test_webhook_template_not_found(self, test_db, org):
        """Test webhook for non-existent template."""
        service = TemplateStatusService(test_db)
        
        webhook_data = {
            "event": "APPROVED",
            "quality_score": "GREEN",
            "timestamp": datetime.utcnow().timestamp()
        }
        
        result = await service.process_template_status_update(
            waba_id="nonexistent_waba",
            template_name="nonexistent_template",
            organization_id=org.id,
            webhook_data=webhook_data
        )
        
        assert result is None, "Should return None for non-existent template"

    @pytest.mark.asyncio
    async def test_webhook_invalid_quality_score(self, test_db, org, template):
        """Test webhook with invalid quality score."""
        service = TemplateStatusService(test_db)
        
        webhook_data = {
            "event": "QUALITY_CHANGE",
            "quality_score": "INVALID_SCORE",
            "timestamp": datetime.utcnow().timestamp()
        }
        
        # Should handle gracefully without crashing
        result = await service.process_template_status_update(
            waba_id=template.whatsapp_number.waba_id,
            template_name=template.name,
            organization_id=org.id,
            webhook_data=webhook_data
        )
        
        assert result is not None, "Should return template even with invalid quality"
