"""
Unit tests for AlertService
"""

import pytest
from uuid import uuid4
from datetime import datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.alert import Alert, AlertType, AlertSeverity, AlertStatus
from app.services.alert_service import AlertService


class TestAlertService:
    """Test AlertService business logic"""

    @pytest.fixture
    async def alert_setup(self, db_session: AsyncSession):
        """Setup test data"""
        from app.models import Organization, User, WhatsAppNumber, WhatsAppTemplate

        # Create organization
        org = Organization(
            id=uuid4(),
            name="Test Org Service",
            slug="test-org-service",
        )
        db_session.add(org)

        # Create user
        user = User(
            id=uuid4(),
            organization_id=org.id,
            email="service-tester@test.com",
            hashed_password="hashed",
            role="org_admin",
            is_active=True,
        )
        db_session.add(user)

        # Create WhatsApp number
        number = WhatsAppNumber(
            id=uuid4(),
            organization_id=org.id,
            phone_number="5511999999999",
            connection_type="official",
        )
        db_session.add(number)

        # Create template
        template = WhatsAppTemplate(
            id=uuid4(),
            organization_id=org.id,
            whatsapp_number_id=number.id,
            name="test-template",
            body_text="Hello {{1}}",
            status="APPROVED",
            language="pt_BR",
            category="UTILITY",
        )
        db_session.add(template)

        await db_session.commit()

        return {
            "org_id": org.id,
            "user_id": user.id,
            "template_id": template.id,
            "number_id": number.id,
        }

    async def test_create_template_status_alert_disabled(
        self, db_session: AsyncSession, alert_setup
    ):
        """Test creating TEMPLATE_DISABLED alert"""
        data = await alert_setup

        service = AlertService(db_session)
        alert = await service.create_template_status_alert(
            organization_id=data["org_id"],
            whatsapp_template_id=data["template_id"],
            alert_type=AlertType.TEMPLATE_DISABLED,
            severity=AlertSeverity.CRITICAL,
            title="Template disabled",
            description="Meta disabled your template",
        )

        assert alert is not None
        assert alert.id is not None
        assert alert.organization_id == data["org_id"]
        assert alert.whatsapp_template_id == data["template_id"]
        assert alert.alert_type == AlertType.TEMPLATE_DISABLED
        assert alert.severity == AlertSeverity.CRITICAL
        assert alert.status == AlertStatus.OPEN
        assert alert.escalation_level == 1

    async def test_create_template_status_alert_quality_degraded(
        self, db_session: AsyncSession, alert_setup
    ):
        """Test creating QUALITY_DEGRADED alert with metadata"""
        data = await alert_setup

        service = AlertService(db_session)
        alert = await service.create_template_status_alert(
            organization_id=data["org_id"],
            whatsapp_template_id=data["template_id"],
            alert_type=AlertType.QUALITY_DEGRADED,
            severity=AlertSeverity.WARNING,
            title="Quality degraded",
            description="Quality score changed to RED",
            metadata={
                "quality_score_before": "GREEN",
                "quality_score_after": "RED",
            },
        )

        assert alert.alert_type == AlertType.QUALITY_DEGRADED
        assert alert.alert_metadata["quality_score_before"] == "GREEN"
        assert alert.alert_metadata["quality_score_after"] == "RED"

    async def test_acknowledge_alert(self, db_session: AsyncSession, alert_setup):
        """Test acknowledging an alert"""
        data = await alert_setup

        service = AlertService(db_session)

        # Create alert
        alert = await service.create_template_status_alert(
            organization_id=data["org_id"],
            whatsapp_template_id=data["template_id"],
            alert_type=AlertType.TEMPLATE_PAUSED,
            severity=AlertSeverity.WARNING,
            title="Template paused",
            description="Meta paused your template",
        )

        # Acknowledge
        acknowledged_alert = await service.acknowledge_alert(
            alert_id=alert.id,
            organization_id=data["org_id"],
            user_id=data["user_id"],
            notes="Will fix this",
        )

        assert acknowledged_alert.status == AlertStatus.ACKNOWLEDGED
        assert acknowledged_alert.acknowledged_by_user_id == data["user_id"]
        assert acknowledged_alert.acknowledgment_notes == "Will fix this"
        assert acknowledged_alert.acknowledged_at is not None

    async def test_escalate_alert_level_progression(
        self, db_session: AsyncSession, alert_setup
    ):
        """Test alert escalation through levels"""
        data = await alert_setup

        service = AlertService(db_session)

        # Create alert at level 1
        alert = await service.create_template_status_alert(
            organization_id=data["org_id"],
            whatsapp_template_id=data["template_id"],
            alert_type=AlertType.TEMPLATE_DISABLED,
            severity=AlertSeverity.CRITICAL,
            title="Template disabled",
            description="Meta disabled",
        )
        assert alert.escalation_level == 1

        # Escalate to level 2
        escalated = await service.escalate_alert(
            alert_id=alert.id,
            organization_id=data["org_id"],
            to_admin=False,
        )
        assert escalated.escalation_level == 2

        # Escalate to level 3
        escalated = await service.escalate_alert(
            alert_id=escalated.id,
            organization_id=data["org_id"],
            to_admin=False,
        )
        assert escalated.escalation_level == 3
        assert escalated.escalated_to_admin is True

    async def test_resolve_alert(self, db_session: AsyncSession, alert_setup):
        """Test resolving an alert"""
        data = await alert_setup

        service = AlertService(db_session)

        # Create alert
        alert = await service.create_template_status_alert(
            organization_id=data["org_id"],
            whatsapp_template_id=data["template_id"],
            alert_type=AlertType.APPROVAL_REJECTED,
            severity=AlertSeverity.CRITICAL,
            title="Approval rejected",
            description="Meta rejected approval",
        )

        # Resolve
        resolved = await service.resolve_alert(
            alert_id=alert.id,
            organization_id=data["org_id"],
            reason="Resubmitted and approved",
        )

        assert resolved.status == AlertStatus.RESOLVED

    async def test_auto_resolve_quality_alert(
        self, db_session: AsyncSession, alert_setup
    ):
        """Test auto-resolving quality alert when quality improves"""
        data = await alert_setup

        service = AlertService(db_session)

        # Create RED quality alert
        alert = await service.create_template_status_alert(
            organization_id=data["org_id"],
            whatsapp_template_id=data["template_id"],
            alert_type=AlertType.QUALITY_DEGRADED,
            severity=AlertSeverity.CRITICAL,
            title="Quality RED",
            description="Quality is RED",
            metadata={"quality_score": "RED"},
        )
        assert alert.status == AlertStatus.OPEN

        # Auto-resolve when quality improves
        resolved = await service.auto_resolve_quality_alert(
            organization_id=data["org_id"],
            whatsapp_template_id=data["template_id"],
            reason="Quality improved back to GREEN",
        )

        assert resolved is not None
        assert resolved.status == AlertStatus.RESOLVED
        assert resolved.auto_resolved is True
        assert resolved.auto_resolved_reason == "Quality improved back to GREEN"

    async def test_get_critical_alerts(self, db_session: AsyncSession, alert_setup):
        """Test retrieving critical alerts"""
        data = await alert_setup

        service = AlertService(db_session)

        # Create one critical and one warning alert
        critical = await service.create_template_status_alert(
            organization_id=data["org_id"],
            whatsapp_template_id=data["template_id"],
            alert_type=AlertType.TEMPLATE_DISABLED,
            severity=AlertSeverity.CRITICAL,
            title="Critical",
            description="Critical alert",
        )

        warning = await service.create_template_status_alert(
            organization_id=data["org_id"],
            whatsapp_template_id=data["template_id"],
            alert_type=AlertType.TEMPLATE_PAUSED,
            severity=AlertSeverity.WARNING,
            title="Warning",
            description="Warning alert",
        )

        # Get critical alerts
        critical_alerts = await service.get_critical_alerts(
            organization_id=data["org_id"]
        )

        assert len(critical_alerts) == 1
        assert critical_alerts[0].id == critical.id
        assert critical_alerts[0].severity == AlertSeverity.CRITICAL

    async def test_get_open_alerts(self, db_session: AsyncSession, alert_setup):
        """Test retrieving open (unresolved) alerts"""
        data = await alert_setup

        service = AlertService(db_session)

        # Create 2 open and 1 resolved alert
        open1 = await service.create_template_status_alert(
            organization_id=data["org_id"],
            whatsapp_template_id=data["template_id"],
            alert_type=AlertType.TEMPLATE_DISABLED,
            severity=AlertSeverity.CRITICAL,
            title="Open 1",
            description="Open",
        )

        open2 = await service.create_template_status_alert(
            organization_id=data["org_id"],
            whatsapp_template_id=data["template_id"],
            alert_type=AlertType.QUALITY_DEGRADED,
            severity=AlertSeverity.WARNING,
            title="Open 2",
            description="Open",
        )

        resolved = await service.create_template_status_alert(
            organization_id=data["org_id"],
            whatsapp_template_id=data["template_id"],
            alert_type=AlertType.APPROVAL_REJECTED,
            severity=AlertSeverity.CRITICAL,
            title="Resolved",
            description="Resolved",
        )
        await service.resolve_alert(
            alert_id=resolved.id,
            organization_id=data["org_id"],
        )

        # Get open alerts
        open_alerts = await service.get_open_alerts(
            organization_id=data["org_id"]
        )

        assert len(open_alerts) == 2
        ids = {alert.id for alert in open_alerts}
        assert open1.id in ids
        assert open2.id in ids
        assert resolved.id not in ids

    async def test_get_alert_summary(self, db_session: AsyncSession, alert_setup):
        """Test alert summary statistics"""
        data = await alert_setup

        service = AlertService(db_session)

        # Create alerts with different statuses
        for _ in range(3):
            await service.create_template_status_alert(
                organization_id=data["org_id"],
                whatsapp_template_id=data["template_id"],
                alert_type=AlertType.TEMPLATE_DISABLED,
                severity=AlertSeverity.CRITICAL,
                title="Critical",
                description="Test",
            )

        for _ in range(2):
            await service.create_template_status_alert(
                organization_id=data["org_id"],
                whatsapp_template_id=data["template_id"],
                alert_type=AlertType.QUALITY_DEGRADED,
                severity=AlertSeverity.WARNING,
                title="Warning",
                description="Test",
            )

        # Get summary
        summary = await service.get_alert_summary(
            organization_id=data["org_id"]
        )

        assert summary["total_open"] == 5
        assert summary["critical_count"] == 3
        assert summary["warning_count"] == 2
        assert summary["escalated_count"] == 0
        assert summary["unacknowledged_count"] == 5

    async def test_multi_tenancy_isolation(self, db_session: AsyncSession, alert_setup):
        """Test that alerts from different orgs are isolated"""
        from app.models import Organization, WhatsAppNumber, WhatsAppTemplate

        data = await alert_setup

        # Create second organization
        org2 = Organization(
            id=uuid4(),
            name="Other Org",
            slug="other-org",
        )
        db_session.add(org2)

        number2 = WhatsAppNumber(
            id=uuid4(),
            organization_id=org2.id,
            phone_number="5522999999999",
            connection_type="official",
        )
        db_session.add(number2)

        template2 = WhatsAppTemplate(
            id=uuid4(),
            organization_id=org2.id,
            whatsapp_number_id=number2.id,
            name="other-template",
            body_text="Other",
            status="APPROVED",
            language="pt_BR",
            category="UTILITY",
        )
        db_session.add(template2)
        await db_session.commit()

        service = AlertService(db_session)

        # Create alert for org1
        alert1 = await service.create_template_status_alert(
            organization_id=data["org_id"],
            whatsapp_template_id=data["template_id"],
            alert_type=AlertType.TEMPLATE_DISABLED,
            severity=AlertSeverity.CRITICAL,
            title="Org1 Alert",
            description="Test",
        )

        # Create alert for org2
        alert2 = await service.create_template_status_alert(
            organization_id=org2.id,
            whatsapp_template_id=template2.id,
            alert_type=AlertType.TEMPLATE_DISABLED,
            severity=AlertSeverity.CRITICAL,
            title="Org2 Alert",
            description="Test",
        )

        # Get alerts for org1
        alerts_org1 = await service.get_open_alerts(
            organization_id=data["org_id"]
        )

        # Get alerts for org2
        alerts_org2 = await service.get_open_alerts(
            organization_id=org2.id
        )

        assert len(alerts_org1) == 1
        assert alerts_org1[0].id == alert1.id
        assert len(alerts_org2) == 1
        assert alerts_org2[0].id == alert2.id

    async def test_check_stale_alerts(self, db_session: AsyncSession, alert_setup):
        """Test detecting stale (unacknowledged 48h+) alerts"""
        data = await alert_setup

        service = AlertService(db_session)

        # Create alert
        alert = await service.create_template_status_alert(
            organization_id=data["org_id"],
            whatsapp_template_id=data["template_id"],
            alert_type=AlertType.TEMPLATE_DISABLED,
            severity=AlertSeverity.CRITICAL,
            title="Stale Alert",
            description="Test",
        )

        # Manually set created_at to 49 hours ago
        alert.created_at = datetime.utcnow() - timedelta(hours=49)
        db_session.add(alert)
        await db_session.commit()

        # Check for stale alerts
        stale_alerts = await service.check_stale_alerts(
            organization_id=data["org_id"]
        )

        assert len(stale_alerts) >= 1
        assert alert.id in [a.id for a in stale_alerts]
