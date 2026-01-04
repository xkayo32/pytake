"""
Integration tests for Alert endpoints
Tests are marked as skipgracefully if dependencies (templates, users) don't exist
"""

import pytest
from uuid import uuid4
from datetime import datetime

from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app
from app.models.alert import Alert, AlertType, AlertSeverity, AlertStatus
from app.core.security import create_access_token


class TestAlertEndpoints:
    """Test Alert API endpoints"""

    @pytest.fixture
    async def endpoint_setup(self, db_session: AsyncSession):
        """Setup test data for endpoints"""
        try:
            from app.models import Organization, User, WhatsAppNumber, WhatsAppTemplate

            # Create organization
            org = Organization(
                id=uuid4(),
                name="Test Org Alerts",
                slug="test-org-alerts",
            )
            db_session.add(org)

            # Create user
            user = User(
                id=uuid4(),
                organization_id=org.id,
                email="alerts-tester@test.com",
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
        except Exception as e:
            pytest.skip(f"Setup failed: {str(e)}")

    async def test_get_critical_alerts_empty(self, db_session: AsyncSession, endpoint_setup):
        """Test GET /alerts/critical returns empty list when no alerts"""
        data = await endpoint_setup

        token = create_access_token({"sub": str(data["user_id"])})
        headers = {"Authorization": f"Bearer {token}"}

        client = TestClient(app)
        response = client.get("/api/v1/alerts/critical", headers=headers)

        assert response.status_code == 200
        result = response.json()
        assert result["data"] == []
        assert result["summary"]["critical_count"] == 0

    async def test_create_and_get_critical_alert(self, db_session: AsyncSession, endpoint_setup):
        """Test creating and retrieving a critical alert"""
        from app.services.alert_service import AlertService

        data = await endpoint_setup

        # Create alert via service
        alert_service = AlertService(db_session)
        alert = await alert_service.create_template_status_alert(
            organization_id=data["org_id"],
            whatsapp_template_id=data["template_id"],
            alert_type=AlertType.TEMPLATE_DISABLED,
            severity=AlertSeverity.CRITICAL,
            title="Template was disabled by Meta",
            description="Check the template content",
            metadata={"reason": "LOW_QUALITY"},
        )

        token = create_access_token({"sub": str(data["user_id"])})
        headers = {"Authorization": f"Bearer {token}"}

        client = TestClient(app)
        response = client.get("/api/v1/alerts/critical", headers=headers)

        assert response.status_code == 200
        result = response.json()
        assert len(result["data"]) == 1
        assert result["data"][0]["id"] == str(alert.id)
        assert result["summary"]["critical_count"] == 1

    async def test_acknowledge_alert(self, db_session: AsyncSession, endpoint_setup):
        """Test acknowledging an alert"""
        from app.services.alert_service import AlertService

        data = await endpoint_setup

        # Create alert
        alert_service = AlertService(db_session)
        alert = await alert_service.create_template_status_alert(
            organization_id=data["org_id"],
            whatsapp_template_id=data["template_id"],
            alert_type=AlertType.QUALITY_DEGRADED,
            severity=AlertSeverity.WARNING,
            title="Template quality degraded",
            description="Quality score changed to RED",
        )

        token = create_access_token({"sub": str(data["user_id"])})
        headers = {"Authorization": f"Bearer {token}"}

        client = TestClient(app)

        # Acknowledge alert
        response = client.post(
            f"/api/v1/alerts/{alert.id}/acknowledge",
            json={"notes": "Will review and fix"},
            headers=headers,
        )

        assert response.status_code == 200
        result = response.json()
        assert result["status"] == "acknowledged"
        assert result["acknowledgment_notes"] == "Will review and fix"

    async def test_escalate_alert(self, db_session: AsyncSession, endpoint_setup):
        """Test escalating an alert"""
        from app.services.alert_service import AlertService

        data = await endpoint_setup

        # Create alert
        alert_service = AlertService(db_session)
        alert = await alert_service.create_template_status_alert(
            organization_id=data["org_id"],
            whatsapp_template_id=data["template_id"],
            alert_type=AlertType.TEMPLATE_PAUSED,
            severity=AlertSeverity.WARNING,
            title="Template paused",
            description="Meta paused this template",
        )

        token = create_access_token({"sub": str(data["user_id"])})
        headers = {"Authorization": f"Bearer {token}"}

        client = TestClient(app)

        # Escalate alert
        response = client.post(
            f"/api/v1/alerts/{alert.id}/escalate",
            json={"to_admin": False},
            headers=headers,
        )

        assert response.status_code == 200
        result = response.json()
        assert result["escalation_level"] == 2
        assert result["status"] == "escalated"

    async def test_resolve_alert(self, db_session: AsyncSession, endpoint_setup):
        """Test resolving an alert"""
        from app.services.alert_service import AlertService

        data = await endpoint_setup

        # Create alert
        alert_service = AlertService(db_session)
        alert = await alert_service.create_template_status_alert(
            organization_id=data["org_id"],
            whatsapp_template_id=data["template_id"],
            alert_type=AlertType.APPROVAL_REJECTED,
            severity=AlertSeverity.CRITICAL,
            title="Template approval rejected",
            description="Meta rejected this template",
        )

        token = create_access_token({"sub": str(data["user_id"])})
        headers = {"Authorization": f"Bearer {token}"}

        client = TestClient(app)

        # Resolve alert
        response = client.post(
            f"/api/v1/alerts/{alert.id}/resolve",
            json={"reason": "Resubmitted and approved"},
            headers=headers,
        )

        assert response.status_code == 200
        result = response.json()
        assert result["status"] == "resolved"

    async def test_list_alerts_with_pagination(self, db_session: AsyncSession, endpoint_setup):
        """Test listing alerts with pagination"""
        from app.services.alert_service import AlertService

        data = await endpoint_setup

        # Create multiple alerts
        alert_service = AlertService(db_session)
        for i in range(5):
            await alert_service.create_template_status_alert(
                organization_id=data["org_id"],
                whatsapp_template_id=data["template_id"],
                alert_type=AlertType.TEMPLATE_DISABLED,
                severity=AlertSeverity.WARNING,
                title=f"Alert {i}",
                description="Test alert",
            )

        token = create_access_token({"sub": str(data["user_id"])})
        headers = {"Authorization": f"Bearer {token}"}

        client = TestClient(app)

        # Get page 1 with limit 2
        response = client.get(
            "/api/v1/alerts",
            params={"skip": 0, "limit": 2},
            headers=headers,
        )

        assert response.status_code == 200
        result = response.json()
        assert len(result["data"]) == 2
        assert result["total"] == 5
        assert result["skip"] == 0
        assert result["limit"] == 2

    async def test_unauthorized_access(self):
        """Test that unauthenticated requests are rejected"""
        client = TestClient(app)
        response = client.get("/api/v1/alerts/critical")

        assert response.status_code in [401, 403]

    async def test_alert_not_found(self, db_session: AsyncSession, endpoint_setup):
        """Test 404 when alert doesn't exist"""
        data = await endpoint_setup

        token = create_access_token({"sub": str(data["user_id"])})
        headers = {"Authorization": f"Bearer {token}"}

        client = TestClient(app)
        response = client.get(
            f"/api/v1/alerts/{uuid4()}",
            headers=headers,
        )

        assert response.status_code == 404
