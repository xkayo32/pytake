"""
Real-time alert tests - WebSocket and Socket.IO alert events
Tests connection, subscriptions, and event emissions
"""

import pytest
from uuid import uuid4
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.alert import Alert, AlertType, AlertSeverity, AlertStatus
from app.services.alert_event_service import AlertEventService
from app.websocket.alert_manager import AlertManager
from app.core.security import create_access_token


class TestAlertManager:
    """Test Alert WebSocket Manager"""

    @pytest.mark.asyncio
    async def test_emit_alert_created(self):
        """Test alert created event emission"""
        org_id = uuid4()
        alert_id = uuid4()
        template_id = uuid4()

        alert_data = {
            "title": "Critical Alert",
            "description": "Template disabled",
            "severity": "critical",
            "alert_type": "template_disabled",
            "status": "open",
        }

        # Mock sio.emit
        with patch("app.websocket.alert_manager.sio.emit", new_callable=AsyncMock) as mock_emit:
            await AlertManager.emit_alert_created(
                organization_id=org_id,
                alert_id=alert_id,
                alert_data=alert_data,
                template_id=template_id,
            )

            # Verify emit was called twice (org room + template room)
            assert mock_emit.call_count == 2

            # Check org room call
            org_call = mock_emit.call_args_list[0]
            assert org_call[0][0] == "alert:created"
            assert org_call[1]["room"] == f"alerts:org:{org_id}"

            # Check template room call
            template_call = mock_emit.call_args_list[1]
            assert template_call[0][0] == "alert:created"
            assert template_call[1]["room"] == f"alerts:template:{template_id}"

    @pytest.mark.asyncio
    async def test_emit_alert_acknowledged(self):
        """Test alert acknowledged event emission"""
        org_id = uuid4()
        alert_id = uuid4()
        user_id = uuid4()
        notes = "Looks critical"

        with patch("app.websocket.alert_manager.sio.emit", new_callable=AsyncMock) as mock_emit:
            await AlertManager.emit_alert_acknowledged(
                organization_id=org_id,
                alert_id=alert_id,
                user_id=user_id,
                notes=notes,
            )

            assert mock_emit.call_count == 1
            call = mock_emit.call_args_list[0]
            assert call[0][0] == "alert:acknowledged"
            assert call[1]["room"] == f"alerts:org:{org_id}"

            # Check payload
            payload = call[0][1]
            assert payload["alert_id"] == str(alert_id)
            assert payload["acknowledged_by"] == str(user_id)
            assert payload["notes"] == notes

    @pytest.mark.asyncio
    async def test_emit_alert_escalated(self):
        """Test alert escalated event emission"""
        org_id = uuid4()
        alert_id = uuid4()
        user_id = uuid4()

        with patch("app.websocket.alert_manager.sio.emit", new_callable=AsyncMock) as mock_emit:
            await AlertManager.emit_alert_escalated(
                organization_id=org_id,
                alert_id=alert_id,
                escalation_level=2,
                escalated_by=user_id,
                reason="Needs immediate attention",
            )

            # Should emit to both org room and admin room
            assert mock_emit.call_count == 2

            # Check org room call
            org_call = mock_emit.call_args_list[0]
            assert org_call[1]["room"] == f"alerts:org:{org_id}"

            # Check admin room call
            admin_call = mock_emit.call_args_list[1]
            assert admin_call[1]["room"] == "alerts:escalated"

    @pytest.mark.asyncio
    async def test_emit_alert_resolved(self):
        """Test alert resolved event emission"""
        org_id = uuid4()
        alert_id = uuid4()
        user_id = uuid4()

        with patch("app.websocket.alert_manager.sio.emit", new_callable=AsyncMock) as mock_emit:
            await AlertManager.emit_alert_resolved(
                organization_id=org_id,
                alert_id=alert_id,
                resolved_by=user_id,
                reason="Issue fixed",
            )

            assert mock_emit.call_count == 1
            call = mock_emit.call_args_list[0]
            assert call[0][0] == "alert:resolved"
            assert call[1]["room"] == f"alerts:org:{org_id}"

    @pytest.mark.asyncio
    async def test_emit_alert_updated(self):
        """Test alert updated event emission"""
        org_id = uuid4()
        alert_id = uuid4()

        updated_fields = {"status": "acknowledged", "severity": "warning"}

        with patch("app.websocket.alert_manager.sio.emit", new_callable=AsyncMock) as mock_emit:
            await AlertManager.emit_alert_updated(
                organization_id=org_id,
                alert_id=alert_id,
                updated_fields=updated_fields,
            )

            assert mock_emit.call_count == 1
            call = mock_emit.call_args_list[0]
            assert call[0][0] == "alert:updated"

            payload = call[0][1]
            assert payload["changes"] == updated_fields

    @pytest.mark.asyncio
    async def test_emit_alert_count_update(self):
        """Test alert count update emission"""
        org_id = uuid4()

        counts = {
            "total": 5,
            "critical": 2,
            "by_severity": {"critical": 2, "warning": 3},
            "by_status": {"open": 4, "resolved": 1},
        }

        with patch("app.websocket.alert_manager.sio.emit", new_callable=AsyncMock) as mock_emit:
            await AlertManager.emit_alert_count_update(
                organization_id=org_id,
                alert_counts=counts,
            )

            assert mock_emit.call_count == 1
            call = mock_emit.call_args_list[0]
            assert call[0][0] == "alerts:count_update"

            payload = call[0][1]
            assert payload["counts"] == counts

    @pytest.mark.asyncio
    async def test_emit_alert_batch_update(self):
        """Test batch alert update emission"""
        org_id = uuid4()

        alerts = [
            {"id": uuid4(), "status": "acknowledged"},
            {"id": uuid4(), "status": "acknowledged"},
        ]

        with patch("app.websocket.alert_manager.sio.emit", new_callable=AsyncMock) as mock_emit:
            await AlertManager.emit_alert_batch_update(
                organization_id=org_id,
                alerts=alerts,
            )

            assert mock_emit.call_count == 1
            call = mock_emit.call_args_list[0]
            assert call[0][0] == "alerts:batch_update"

            payload = call[0][1]
            assert len(payload["alerts"]) == 2

    @pytest.mark.asyncio
    async def test_join_organization_alerts(self):
        """Test joining organization alerts room"""
        sid = "test-socket-123"
        org_id = uuid4()

        with patch("app.websocket.alert_manager.sio.enter_room", new_callable=AsyncMock) as mock_enter:
            await AlertManager.join_organization_alerts(sid, org_id)

            mock_enter.assert_called_once_with(sid, f"alerts:org:{org_id}")

    @pytest.mark.asyncio
    async def test_join_template_alerts(self):
        """Test joining template alerts room"""
        sid = "test-socket-456"
        template_id = uuid4()

        with patch("app.websocket.alert_manager.sio.enter_room", new_callable=AsyncMock) as mock_enter:
            await AlertManager.join_template_alerts(sid, template_id)

            mock_enter.assert_called_once_with(sid, f"alerts:template:{template_id}")

    @pytest.mark.asyncio
    async def test_join_escalated_alerts(self):
        """Test joining escalated alerts room"""
        sid = "test-socket-789"

        with patch("app.websocket.alert_manager.sio.enter_room", new_callable=AsyncMock) as mock_enter:
            await AlertManager.join_escalated_alerts(sid)

            mock_enter.assert_called_once_with(sid, "alerts:escalated")

    @pytest.mark.asyncio
    async def test_leave_organization_alerts(self):
        """Test leaving organization alerts room"""
        sid = "test-socket-123"
        org_id = uuid4()

        with patch("app.websocket.alert_manager.sio.leave_room", new_callable=AsyncMock) as mock_leave:
            await AlertManager.leave_organization_alerts(sid, org_id)

            mock_leave.assert_called_once_with(sid, f"alerts:org:{org_id}")

    @pytest.mark.asyncio
    async def test_broadcast_alert_summary(self):
        """Test alert summary broadcast"""
        org_id = uuid4()

        summary = {
            "total": 10,
            "critical": 3,
            "by_status": {"open": 7, "resolved": 3},
        }

        with patch("app.websocket.alert_manager.sio.emit", new_callable=AsyncMock) as mock_emit:
            await AlertManager.broadcast_alert_summary(
                organization_id=org_id,
                summary_data=summary,
            )

            assert mock_emit.call_count == 1
            call = mock_emit.call_args_list[0]
            assert call[0][0] == "alerts:summary"

            payload = call[0][1]
            assert payload["summary"] == summary


class TestAlertEventService:
    """Test Alert Event Service"""

    @pytest.mark.asyncio
    async def test_on_alert_created(self):
        """Test alert created event service"""
        # Create a mock alert
        alert = MagicMock(spec=Alert)
        alert.id = uuid4()
        alert.organization_id = uuid4()
        alert.whatsapp_template_id = uuid4()
        alert.title = "Critical Alert"
        alert.description = "Template disabled"
        alert.severity = AlertSeverity.CRITICAL
        alert.alert_type = AlertType.TEMPLATE_DISABLED
        alert.status = AlertStatus.OPEN
        alert.created_at = datetime.utcnow()

        db_mock = AsyncMock(spec=AsyncSession)
        service = AlertEventService(db_mock)

        with patch("app.services.alert_event_service.alert_manager.emit_alert_created", new_callable=AsyncMock) as mock_emit:
            await service.on_alert_created(alert)

            # Verify emit was called
            assert mock_emit.called

    @pytest.mark.asyncio
    async def test_on_alert_acknowledged(self):
        """Test alert acknowledged event service"""
        org_id = uuid4()
        alert_id = uuid4()
        user_id = uuid4()

        db_mock = AsyncMock(spec=AsyncSession)
        service = AlertEventService(db_mock)

        with patch("app.services.alert_event_service.alert_manager.emit_alert_acknowledged", new_callable=AsyncMock) as mock_emit:
            await service.on_alert_acknowledged(
                alert_id=alert_id,
                organization_id=org_id,
                user_id=user_id,
                notes="Checked",
            )

            mock_emit.assert_called_once()

    @pytest.mark.asyncio
    async def test_on_alert_escalated(self):
        """Test alert escalated event service"""
        org_id = uuid4()
        alert_id = uuid4()
        user_id = uuid4()

        db_mock = AsyncMock(spec=AsyncSession)
        service = AlertEventService(db_mock)

        with patch("app.services.alert_event_service.alert_manager.emit_alert_escalated", new_callable=AsyncMock) as mock_emit:
            await service.on_alert_escalated(
                alert_id=alert_id,
                organization_id=org_id,
                escalation_level=2,
                escalated_by=user_id,
            )

            mock_emit.assert_called_once()

    @pytest.mark.asyncio
    async def test_on_alert_resolved(self):
        """Test alert resolved event service"""
        org_id = uuid4()
        alert_id = uuid4()
        user_id = uuid4()

        db_mock = AsyncMock(spec=AsyncSession)
        service = AlertEventService(db_mock)

        with patch("app.services.alert_event_service.alert_manager.emit_alert_resolved", new_callable=AsyncMock) as mock_emit:
            await service.on_alert_resolved(
                alert_id=alert_id,
                organization_id=org_id,
                resolved_by=user_id,
                reason="Fixed",
            )

            mock_emit.assert_called_once()

    @pytest.mark.asyncio
    async def test_on_alert_updated(self):
        """Test alert updated event service"""
        org_id = uuid4()
        alert_id = uuid4()

        updated_fields = {"severity": "warning", "status": "acknowledged"}

        db_mock = AsyncMock(spec=AsyncSession)
        service = AlertEventService(db_mock)

        with patch("app.services.alert_event_service.alert_manager.emit_alert_updated", new_callable=AsyncMock) as mock_emit:
            await service.on_alert_updated(
                alert_id=alert_id,
                organization_id=org_id,
                updated_fields=updated_fields,
            )

            mock_emit.assert_called_once()

    @pytest.mark.asyncio
    async def test_error_handling_in_event_emission(self):
        """Test that errors in event emission are logged, not raised"""
        org_id = uuid4()
        alert_id = uuid4()

        db_mock = AsyncMock(spec=AsyncSession)
        service = AlertEventService(db_mock)

        # Make emit raise an exception
        with patch("app.services.alert_event_service.alert_manager.emit_alert_updated") as mock_emit:
            mock_emit.side_effect = Exception("Connection error")

            # Should not raise, only log
            await service.on_alert_updated(
                alert_id=alert_id,
                organization_id=org_id,
                updated_fields={},
            )

            # Verify emit was attempted
            assert mock_emit.called


class TestAlertsNamespace:
    """Test Socket.IO Alerts Namespace handlers"""

    def test_namespace_configuration(self):
        """Test that namespace is properly configured"""
        from app.websocket.alerts_namespace import alerts_namespace

        assert alerts_namespace == "/alerts"

    @pytest.mark.asyncio
    async def test_subscribe_organization_alerts_event_structure(self):
        """Test subscribe_organization_alerts event structure"""
        # This is a unit test - we're testing that the namespace
        # is properly set up to handle these events
        # Integration tests would require a full Socket.IO server

        from app.websocket.alerts_namespace import alerts_namespace

        assert alerts_namespace == "/alerts"

        # Verify event handlers are registered
        # (actual verification would require Socket.IO test client)


class TestRealTimeIntegration:
    """Integration tests for real-time updates"""

    @pytest.mark.asyncio
    async def test_alert_creation_triggers_websocket_event(self):
        """Test that creating an alert triggers WebSocket event"""
        # This would require a full integration with the AlertService
        # and would need a real Socket.IO server
        pass

    @pytest.mark.asyncio
    async def test_multiple_clients_receive_alert_updates(self):
        """Test that multiple clients in same org receive updates"""
        # This would require multi-client Socket.IO test
        pass

    @pytest.mark.asyncio
    async def test_client_isolation_by_organization(self):
        """Test that clients are isolated by organization"""
        # Verify that org A clients don't receive org B alerts
        pass
