"""
Slack Integration Tests
Tests for SlackService and AlertNotificationService Slack integration
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime
from uuid import uuid4

from app.integrations.slack import (
    SlackService, SlackAlert, AlertSeverity, AlertEventType,
    SEVERITY_COLORS, SEVERITY_EMOJI
)
from app.services.alert_notification_service import AlertNotificationService
from app.models.alert_notification import AlertNotification


class TestSlackService:
    """Tests for SlackService"""

    @pytest.fixture
    def slack_service(self):
        """Create SlackService instance"""
        return SlackService()

    def test_slack_service_initialization(self, slack_service):
        """Test SlackService initializes correctly"""
        assert slack_service is not None
        assert slack_service.timeout == 10
        assert slack_service.max_retries == 3
        assert slack_service.retry_delay_base == 1

    def test_is_configured_false_when_disabled(self, slack_service):
        """Test is_configured returns False when Slack disabled"""
        slack_service.enabled = False
        assert slack_service.is_configured() is False

    def test_is_configured_false_without_webhook(self, slack_service):
        """Test is_configured returns False without webhook URL"""
        slack_service.enabled = True
        slack_service.webhook_url = None
        assert slack_service.is_configured() is False

    def test_is_configured_true_when_enabled(self, slack_service):
        """Test is_configured returns True when properly configured"""
        slack_service.enabled = True
        slack_service.webhook_url = "https://hooks.slack.com/services/TEST"
        assert slack_service.is_configured() is True

    def test_severity_colors(self):
        """Test severity colors are defined"""
        assert SEVERITY_COLORS[AlertSeverity.CRITICAL] == "#d32f2f"
        assert SEVERITY_COLORS[AlertSeverity.HIGH] == "#ff9800"
        assert SEVERITY_COLORS[AlertSeverity.MEDIUM] == "#fbc02d"
        assert SEVERITY_COLORS[AlertSeverity.LOW] == "#388e3c"

    def test_severity_emoji(self):
        """Test severity emojis are defined"""
        assert SEVERITY_EMOJI[AlertSeverity.CRITICAL] == "🔴"
        assert SEVERITY_EMOJI[AlertSeverity.HIGH] == "🟠"
        assert SEVERITY_EMOJI[AlertSeverity.MEDIUM] == "🟡"
        assert SEVERITY_EMOJI[AlertSeverity.LOW] == "🟢"

    def test_slack_alert_creation(self):
        """Test SlackAlert dataclass creation"""
        alert = SlackAlert(
            alert_id="test-123",
            alert_title="Test Alert",
            alert_description="Test description",
            severity=AlertSeverity.HIGH,
            event_type=AlertEventType.ALERT_CREATED,
            organization_name="Test Org",
            created_at="2025-12-14 14:30",
            updated_at="2025-12-14 14:31",
            dashboard_url="http://localhost:3000/alerts/123"
        )

        assert alert.alert_id == "test-123"
        assert alert.severity == AlertSeverity.HIGH
        assert alert.metadata == {}

    def test_slack_alert_with_metadata(self):
        """Test SlackAlert with metadata"""
        metadata = {"category": "system", "escalation_level": "Critical"}
        alert = SlackAlert(
            alert_id="test-456",
            alert_title="Escalated Alert",
            alert_description="Critical system alert",
            severity=AlertSeverity.CRITICAL,
            event_type=AlertEventType.ALERT_ESCALATED,
            organization_name="Prod Org",
            created_at="2025-12-14 10:00",
            updated_at="2025-12-14 15:00",
            dashboard_url="http://localhost:3000/alerts/456",
            metadata=metadata
        )

        assert alert.metadata == metadata
        assert alert.metadata["category"] == "system"

    def test_build_alert_blocks(self, slack_service):
        """Test Block Kit message building"""
        alert = SlackAlert(
            alert_id="test-789",
            alert_title="Template Sync Failed",
            alert_description="WhatsApp template sync error",
            severity=AlertSeverity.HIGH,
            event_type=AlertEventType.ALERT_CREATED,
            organization_name="Test Org",
            created_at="2025-12-14 14:30",
            updated_at="2025-12-14 14:30",
            dashboard_url="http://localhost:3000/alerts/789",
            metadata={"category": "integration"}
        )

        blocks = slack_service._build_alert_blocks(alert)

        assert len(blocks) > 0
        assert blocks[0]["type"] == "section"
        assert "Template Sync Failed" in blocks[0]["text"]["text"]

    def test_build_alert_blocks_includes_buttons(self, slack_service):
        """Test Block Kit includes action buttons"""
        alert = SlackAlert(
            alert_id="test-btn",
            alert_title="Test",
            alert_description="Test alert",
            severity=AlertSeverity.MEDIUM,
            event_type=AlertEventType.ALERT_CREATED,
            organization_name="Test",
            created_at="2025-12-14 14:30",
            updated_at="2025-12-14 14:30",
            dashboard_url="http://localhost:3000/alerts/btn"
        )

        blocks = slack_service._build_alert_blocks(alert)

        # Find actions block
        action_block = next((b for b in blocks if b["type"] == "actions"), None)
        assert action_block is not None
        assert len(action_block["elements"]) >= 2

    def test_build_message_payload(self, slack_service):
        """Test complete message payload building"""
        alert = SlackAlert(
            alert_id="payload-test",
            alert_title="Payload Test",
            alert_description="Test payload",
            severity=AlertSeverity.CRITICAL,
            event_type=AlertEventType.ALERT_ESCALATED,
            organization_name="Test",
            created_at="2025-12-14 14:30",
            updated_at="2025-12-14 14:30",
            dashboard_url="http://localhost:3000/alerts/payload",
            metadata={"organization_id": str(uuid4())}
        )

        payload = slack_service._build_message_payload(alert)

        assert "blocks" in payload
        assert "metadata" in payload
        assert "text" in payload
        assert payload["metadata"]["event_type"] == "alert_escalated"

    @pytest.mark.asyncio
    async def test_send_alert_not_configured(self, slack_service):
        """Test send_alert returns False when not configured"""
        slack_service.enabled = False

        alert = SlackAlert(
            alert_id="test",
            alert_title="Test",
            alert_description="Test",
            severity=AlertSeverity.MEDIUM,
            event_type=AlertEventType.ALERT_CREATED,
            organization_name="Test",
            created_at="2025-12-14 14:30",
            updated_at="2025-12-14 14:30",
            dashboard_url="http://localhost:3000/alerts/1"
        )

        result = await slack_service.send_alert(alert)
        assert result is False

    @pytest.mark.asyncio
    async def test_send_alert_with_mock_webhook(self, slack_service):
        """Test send_alert with mocked webhook"""
        slack_service.enabled = True
        slack_service.webhook_url = "https://hooks.slack.com/services/TEST"

        alert = SlackAlert(
            alert_id="mock-test",
            alert_title="Mock Test",
            alert_description="Test alert",
            severity=AlertSeverity.HIGH,
            event_type=AlertEventType.ALERT_CREATED,
            organization_name="Test",
            created_at="2025-12-14 14:30",
            updated_at="2025-12-14 14:30",
            dashboard_url="http://localhost:3000/alerts/mock"
        )

        with patch.object(slack_service, '_send_webhook', new_callable=AsyncMock) as mock_send:
            mock_send.return_value = True

            result = await slack_service.send_alert(alert)

            assert result is True
            mock_send.assert_called_once()

    @pytest.mark.asyncio
    async def test_send_alert_retry_logic(self, slack_service):
        """Test send_alert retries on failure"""
        slack_service.enabled = True
        slack_service.webhook_url = "https://hooks.slack.com/services/TEST"
        slack_service.max_retries = 2

        alert = SlackAlert(
            alert_id="retry-test",
            alert_title="Retry Test",
            alert_description="Test",
            severity=AlertSeverity.MEDIUM,
            event_type=AlertEventType.ALERT_CREATED,
            organization_name="Test",
            created_at="2025-12-14 14:30",
            updated_at="2025-12-14 14:30",
            dashboard_url="http://localhost:3000/alerts/retry"
        )

        with patch.object(slack_service, '_send_webhook', new_callable=AsyncMock) as mock_send:
            # First fails, second succeeds
            mock_send.side_effect = [False, True]

            result = await slack_service.send_alert(alert)

            assert result is True
            assert mock_send.call_count == 2

    @pytest.mark.asyncio
    async def test_verify_webhook_success(self, slack_service):
        """Test verify_webhook succeeds with valid webhook"""
        with patch.object(slack_service, '_send_webhook', new_callable=AsyncMock) as mock_send:
            mock_send.return_value = True

            result = await slack_service.verify_webhook("https://hooks.slack.com/services/TEST")

            assert result is True
            mock_send.assert_called_once()

    @pytest.mark.asyncio
    async def test_verify_webhook_failure(self, slack_service):
        """Test verify_webhook fails with invalid webhook"""
        with patch.object(slack_service, '_send_webhook', new_callable=AsyncMock) as mock_send:
            mock_send.return_value = False

            result = await slack_service.verify_webhook("https://hooks.slack.com/services/INVALID")

            assert result is False


class TestAlertNotificationSlackIntegration:
    """Tests for AlertNotificationService Slack integration"""

    @pytest.fixture
    def mock_db(self):
        """Create mock database session"""
        return AsyncMock()

    @pytest.fixture
    def mock_notification(self):
        """Create mock AlertNotification"""
        notification = AsyncMock(spec=AlertNotification)
        notification.id = uuid4()
        notification.alert_id = uuid4()
        notification.recipient_email = None
        notification.subject = "Test Alert"
        notification.message = "This is a test alert"
        notification.event_type = "alert_created"
        notification.metadata = {
            "title": "Test Alert",
            "alert_severity": "HIGH",
            "alert_type": "system",
            "organization_name": "Test Org",
            "base_url": "http://localhost:3000"
        }
        notification.created_at = datetime.utcnow()
        notification.updated_at = datetime.utcnow()
        return notification

    @pytest.mark.asyncio
    async def test_send_slack_alert_created(self, mock_db, mock_notification):
        """Test sending alert_created to Slack"""
        # Configure slack service to be enabled
        mock_notification.metadata["slack_webhook_url"] = "https://hooks.slack.com/services/TEST"
        
        service = AlertNotificationService(mock_db)
        service.slack_service.enabled = True
        service.slack_service.webhook_url = "https://hooks.slack.com/services/TEST"

        with patch.object(service.slack_service, 'send_alert', new_callable=AsyncMock) as mock_send:
            mock_send.return_value = True

            result = await service._send_slack(mock_notification)

            assert result is True
            mock_send.assert_called_once()
            call_args = mock_send.call_args
            slack_alert = call_args[0][0]
            assert slack_alert.alert_title == "Test Alert"

    @pytest.mark.asyncio
    async def test_send_slack_alert_escalated(self, mock_db, mock_notification):
        """Test sending alert_escalated with escalation context"""
        mock_notification.event_type = "alert_escalated"
        mock_notification.metadata.update({
            "escalation_level": "Critical",
            "escalation_reason": "SLA breach",
            "slack_webhook_url": "https://hooks.slack.com/services/TEST"
        })

        service = AlertNotificationService(mock_db)
        service.slack_service.enabled = True
        service.slack_service.webhook_url = "https://hooks.slack.com/services/TEST"

        with patch.object(service.slack_service, 'send_alert', new_callable=AsyncMock) as mock_send:
            mock_send.return_value = True

            result = await service._send_slack(mock_notification)

            assert result is True
            call_args = mock_send.call_args
            slack_alert = call_args[0][0]
            assert slack_alert.metadata["escalation_level"] == "Critical"

    @pytest.mark.asyncio
    async def test_send_slack_alert_resolved(self, mock_db, mock_notification):
        """Test sending alert_resolved"""
        mock_notification.event_type = "alert_resolved"
        mock_notification.metadata.update({
            "resolved_by": "Admin User",
            "duration": "2 hours",
            "slack_webhook_url": "https://hooks.slack.com/services/TEST"
        })

        service = AlertNotificationService(mock_db)
        service.slack_service.enabled = True
        service.slack_service.webhook_url = "https://hooks.slack.com/services/TEST"

        with patch.object(service.slack_service, 'send_alert', new_callable=AsyncMock) as mock_send:
            mock_send.return_value = True

            result = await service._send_slack(mock_notification)

            assert result is True

    @pytest.mark.asyncio
    async def test_send_slack_stale_alert(self, mock_db, mock_notification):
        """Test sending stale_alert"""
        mock_notification.event_type = "stale_alert"
        mock_notification.metadata.update({
            "days_inactive": "7",
            "current_owner": "John Doe",
            "slack_webhook_url": "https://hooks.slack.com/services/TEST"
        })

        service = AlertNotificationService(mock_db)
        service.slack_service.enabled = True
        service.slack_service.webhook_url = "https://hooks.slack.com/services/TEST"

        with patch.object(service.slack_service, 'send_alert', new_callable=AsyncMock) as mock_send:
            mock_send.return_value = True

            result = await service._send_slack(mock_notification)

            assert result is True

    @pytest.mark.asyncio
    async def test_send_slack_returns_false_on_failure(self, mock_db, mock_notification):
        """Test send_slack returns False when service fails"""
        service = AlertNotificationService(mock_db)

        with patch.object(service.slack_service, 'send_alert', new_callable=AsyncMock) as mock_send:
            mock_send.return_value = False

            result = await service._send_slack(mock_notification)

            assert result is False

    @pytest.mark.asyncio
    async def test_send_slack_handles_exception(self, mock_db, mock_notification):
        """Test send_slack handles exceptions gracefully"""
        service = AlertNotificationService(mock_db)

        with patch.object(service.slack_service, 'send_alert', new_callable=AsyncMock) as mock_send:
            mock_send.side_effect = Exception("Slack error")

            result = await service._send_slack(mock_notification)

            assert result is False

    @pytest.mark.asyncio
    async def test_send_slack_logs_errors(self, mock_db, mock_notification):
        """Test send_slack logs errors appropriately"""
        mock_notification.metadata["slack_webhook_url"] = "https://hooks.slack.com/services/TEST"
        service = AlertNotificationService(mock_db)
        service.slack_service.enabled = True

        with patch.object(service.slack_service, 'send_alert', new_callable=AsyncMock) as mock_send:
            mock_send.side_effect = Exception("Connection error")

            with patch('app.services.alert_notification_service.logger') as mock_logger:
                result = await service._send_slack(mock_notification)

                assert result is False
                assert mock_logger.error.called
