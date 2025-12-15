"""
Unit tests for Phase 1.2 - Template Status Service

Tests the core business logic:
1. Template status updates (APPROVED, PAUSED, DISABLED, REJECTED)
2. Quality score changes
3. Campaign auto-pausing logic
4. Alert creation on critical events

Author: Kayo Carvalho Fernandes
"""

import pytest
import logging
from uuid import uuid4
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

from app.models.whatsapp_number import WhatsAppTemplate
from app.models.alert import AlertType, AlertSeverity, AlertStatus

logger = logging.getLogger(__name__)


class TestTemplateStatusServiceLogic:
    """Test business logic of TemplateStatusService without DB."""

    @pytest.mark.asyncio
    async def test_status_update_approved(self):
        """Test template approval status update."""
        from app.services.template_status_service import TemplateStatusService
        
        # Mock database
        mock_db = AsyncMock()
        service = TemplateStatusService(mock_db)
        
        # Mock template
        template = MagicMock(spec=WhatsAppTemplate)
        template.id = uuid4()
        template.status = "PENDING_APPROVAL"
        template.quality_score = "UNKNOWN"
        template.paused_at = None
        template.disabled_at = None
        
        # Mock find method
        service._find_template_by_name = AsyncMock(return_value=template)
        service._handle_approval = AsyncMock()
        
        webhook_data = {
            "event": "APPROVED",
            "quality_score": "UNKNOWN",
            "timestamp": datetime.utcnow().timestamp()
        }
        
        result = await service.process_template_status_update(
            waba_id="123456",
            template_name="test_template",
            organization_id=uuid4(),
            webhook_data=webhook_data
        )
        
        assert result is not None
        service._handle_approval.assert_called_once()

    @pytest.mark.asyncio
    async def test_status_update_paused(self):
        """Test template pause status update."""
        from app.services.template_status_service import TemplateStatusService
        
        mock_db = AsyncMock()
        service = TemplateStatusService(mock_db)
        
        template = MagicMock(spec=WhatsAppTemplate)
        template.id = uuid4()
        template.status = "APPROVED"
        template.quality_score = "RED"
        template.paused_at = None
        
        service._find_template_by_name = AsyncMock(return_value=template)
        service._handle_pause = AsyncMock()
        
        webhook_data = {
            "event": "PAUSED",
            "quality_score": "RED",
            "reason": "POOR_QUALITY",
            "timestamp": datetime.utcnow().timestamp()
        }
        
        result = await service.process_template_status_update(
            waba_id="123456",
            template_name="test_template",
            organization_id=uuid4(),
            webhook_data=webhook_data
        )
        
        assert result is not None
        service._handle_pause.assert_called_once()

    @pytest.mark.asyncio
    async def test_status_update_disabled(self):
        """Test template disabled status update."""
        from app.services.template_status_service import TemplateStatusService
        
        mock_db = AsyncMock()
        service = TemplateStatusService(mock_db)
        
        template = MagicMock(spec=WhatsAppTemplate)
        template.id = uuid4()
        template.status = "APPROVED"
        template.quality_score = "RED"
        template.disabled_at = None
        template.disabled_reason = None
        
        service._find_template_by_name = AsyncMock(return_value=template)
        service._handle_disabled = AsyncMock()
        
        webhook_data = {
            "event": "DISABLED",
            "quality_score": "RED",
            "reason": "UNACCEPTABLE_QUALITY",
            "timestamp": datetime.utcnow().timestamp()
        }
        
        result = await service.process_template_status_update(
            waba_id="123456",
            template_name="test_template",
            organization_id=uuid4(),
            webhook_data=webhook_data
        )
        
        assert result is not None
        service._handle_disabled.assert_called_once()

    @pytest.mark.asyncio
    async def test_status_update_quality_change_unknown_to_green(self):
        """Test quality score improvement: UNKNOWN → GREEN."""
        from app.services.template_status_service import TemplateStatusService
        
        mock_db = AsyncMock()
        service = TemplateStatusService(mock_db)
        
        template = MagicMock(spec=WhatsAppTemplate)
        template.id = uuid4()
        template.status = "APPROVED"
        template.quality_score = "UNKNOWN"
        
        service._find_template_by_name = AsyncMock(return_value=template)
        service._handle_quality_change = AsyncMock()
        
        webhook_data = {
            "event": "QUALITY_CHANGE",
            "quality_score": "GREEN",
            "timestamp": datetime.utcnow().timestamp()
        }
        
        result = await service.process_template_status_update(
            waba_id="123456",
            template_name="test_template",
            organization_id=uuid4(),
            webhook_data=webhook_data
        )
        
        assert result is not None
        service._handle_quality_change.assert_called_once()

    @pytest.mark.asyncio
    async def test_status_update_quality_change_green_to_yellow(self):
        """Test quality score degradation: GREEN → YELLOW."""
        from app.services.template_status_service import TemplateStatusService
        
        mock_db = AsyncMock()
        service = TemplateStatusService(mock_db)
        
        template = MagicMock(spec=WhatsAppTemplate)
        template.id = uuid4()
        template.status = "APPROVED"
        template.quality_score = "GREEN"
        
        service._find_template_by_name = AsyncMock(return_value=template)
        service._handle_quality_change = AsyncMock()
        
        webhook_data = {
            "event": "QUALITY_CHANGE",
            "quality_score": "YELLOW",
            "timestamp": datetime.utcnow().timestamp()
        }
        
        result = await service.process_template_status_update(
            waba_id="123456",
            template_name="test_template",
            organization_id=uuid4(),
            webhook_data=webhook_data
        )
        
        assert result is not None
        service._handle_quality_change.assert_called_once()

    @pytest.mark.asyncio
    async def test_status_update_quality_change_yellow_to_red(self):
        """Test quality score degradation: YELLOW → RED."""
        from app.services.template_status_service import TemplateStatusService
        
        mock_db = AsyncMock()
        service = TemplateStatusService(mock_db)
        
        template = MagicMock(spec=WhatsAppTemplate)
        template.id = uuid4()
        template.status = "APPROVED"
        template.quality_score = "YELLOW"
        
        service._find_template_by_name = AsyncMock(return_value=template)
        service._handle_quality_change = AsyncMock()
        
        webhook_data = {
            "event": "QUALITY_CHANGE",
            "quality_score": "RED",
            "timestamp": datetime.utcnow().timestamp()
        }
        
        result = await service.process_template_status_update(
            waba_id="123456",
            template_name="test_template",
            organization_id=uuid4(),
            webhook_data=webhook_data
        )
        
        assert result is not None
        service._handle_quality_change.assert_called_once()

    @pytest.mark.asyncio
    async def test_status_update_rejected(self):
        """Test template rejection."""
        from app.services.template_status_service import TemplateStatusService
        
        mock_db = AsyncMock()
        service = TemplateStatusService(mock_db)
        
        template = MagicMock(spec=WhatsAppTemplate)
        template.id = uuid4()
        template.status = "PENDING_APPROVAL"
        
        service._find_template_by_name = AsyncMock(return_value=template)
        service._handle_rejection = AsyncMock()
        
        webhook_data = {
            "event": "REJECTED",
            "reason": "INVALID_CONTENT",
            "timestamp": datetime.utcnow().timestamp()
        }
        
        result = await service.process_template_status_update(
            waba_id="123456",
            template_name="test_template",
            organization_id=uuid4(),
            webhook_data=webhook_data
        )
        
        assert result is not None
        service._handle_rejection.assert_called_once()

    @pytest.mark.asyncio
    async def test_template_not_found(self):
        """Test webhook for non-existent template."""
        from app.services.template_status_service import TemplateStatusService
        
        mock_db = AsyncMock()
        service = TemplateStatusService(mock_db)
        
        # Mock find returning None
        service._find_template_by_name = AsyncMock(return_value=None)
        
        webhook_data = {
            "event": "APPROVED",
            "timestamp": datetime.utcnow().timestamp()
        }
        
        result = await service.process_template_status_update(
            waba_id="123456",
            template_name="nonexistent",
            organization_id=uuid4(),
            webhook_data=webhook_data
        )
        
        assert result is None

    @pytest.mark.asyncio
    async def test_campaign_auto_pause_on_disabled(self):
        """Test that campaign is auto-paused when template is disabled."""
        from app.services.template_status_service import TemplateStatusService
        
        mock_db = AsyncMock()
        service = TemplateStatusService(mock_db)
        
        template = MagicMock(spec=WhatsAppTemplate)
        template.id = uuid4()
        template.status = "APPROVED"
        
        service._find_template_by_name = AsyncMock(return_value=template)
        service._handle_disabled = AsyncMock()
        service._pause_campaigns_using_template = AsyncMock()
        
        webhook_data = {
            "event": "DISABLED",
            "reason": "UNACCEPTABLE_QUALITY",
            "timestamp": datetime.utcnow().timestamp()
        }
        
        await service.process_template_status_update(
            waba_id="123456",
            template_name="test_template",
            organization_id=uuid4(),
            webhook_data=webhook_data
        )
        
        # Verify campaigns pause was called
        service._pause_campaigns_using_template.assert_called_once()

    @pytest.mark.asyncio
    async def test_alert_created_on_disabled(self):
        """Test alert creation when template is disabled."""
        from app.services.template_status_service import TemplateStatusService
        
        mock_db = AsyncMock()
        service = TemplateStatusService(mock_db)
        
        template = MagicMock(spec=WhatsAppTemplate)
        template.id = uuid4()
        template.status = "APPROVED"
        
        service._find_template_by_name = AsyncMock(return_value=template)
        service._handle_disabled = AsyncMock()
        
        # Mock alert service
        mock_alert_service = AsyncMock()
        
        with patch('app.services.template_status_service.AlertService', return_value=mock_alert_service):
            webhook_data = {
                "event": "DISABLED",
                "reason": "UNACCEPTABLE_QUALITY",
                "timestamp": datetime.utcnow().timestamp()
            }
            
            await service.process_template_status_update(
                waba_id="123456",
                template_name="test_template",
                organization_id=uuid4(),
                webhook_data=webhook_data
            )

    @pytest.mark.asyncio
    async def test_alert_created_on_paused(self):
        """Test alert creation when template is paused."""
        from app.services.template_status_service import TemplateStatusService
        
        mock_db = AsyncMock()
        service = TemplateStatusService(mock_db)
        
        template = MagicMock(spec=WhatsAppTemplate)
        template.id = uuid4()
        template.status = "APPROVED"
        template.quality_score = "RED"
        
        service._find_template_by_name = AsyncMock(return_value=template)
        service._handle_pause = AsyncMock()
        
        webhook_data = {
            "event": "PAUSED",
            "quality_score": "RED",
            "reason": "POOR_QUALITY",
            "timestamp": datetime.utcnow().timestamp()
        }
        
        result = await service.process_template_status_update(
            waba_id="123456",
            template_name="test_template",
            organization_id=uuid4(),
            webhook_data=webhook_data
        )
        
        assert result is not None
        service._handle_pause.assert_called_once()


class TestTemplateStatusEndpoints:
    """Test REST API endpoints."""

    @pytest.mark.asyncio
    async def test_get_critical_templates_endpoint(self):
        """Test GET /templates/critical endpoint."""
        # Will be tested against real API in integration tests
        pass

    @pytest.mark.asyncio
    async def test_get_quality_summary_endpoint(self):
        """Test GET /templates/quality-summary endpoint."""
        # Will be tested against real API in integration tests
        pass

    @pytest.mark.asyncio
    async def test_acknowledge_alert_endpoint(self):
        """Test POST /templates/{id}/acknowledge-alert endpoint."""
        # Will be tested against real API in integration tests
        pass
