"""
Unit tests for Phase 1.3 - 24-Hour Conversation Window Validation

Tests the 24-hour window logic:
1. Window calculation (24h from last user message or template send)
2. Window validation (can message or must use template)
3. Window renewal (on user message or template send)
4. Multi-tenancy isolation

Author: Kayo Carvalho Fernandes
"""

import pytest
import logging
from uuid import uuid4
from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.window_validation_service import WindowValidationService, WindowStatus

logger = logging.getLogger(__name__)


class TestWindowValidationServiceLogic:
    """Test 24-hour window validation business logic without DB."""

    @pytest.mark.asyncio
    async def test_window_status_enum_values(self):
        """Test that WindowStatus enum has expected values."""
        # Verify enum values exist
        assert WindowStatus.ACTIVE.value == "active"
        assert WindowStatus.EXPIRED.value == "expired"
        assert WindowStatus.UNKNOWN.value == "unknown"
        
        logger.info("✅ WindowStatus enum values verified")

    @pytest.mark.asyncio
    async def test_can_send_free_message_within_window(self):
        """Test that free messages are allowed when window is active."""
        mock_db = AsyncMock()
        service = WindowValidationService(mock_db)
        
        # Mock window_repo to return active window
        mock_window = MagicMock()
        mock_window.is_within_window = True
        
        service.window_repo.get_by_conversation_id = AsyncMock(return_value=mock_window)
        
        conv_id = uuid4()
        org_id = uuid4()
        
        # Check if free message can be sent
        can_send = await service.can_send_free_message(conv_id, org_id)
        
        # Should allow free message when window is active
        assert can_send is True
        logger.info("✅ Free message allowed within window")

    @pytest.mark.asyncio
    async def test_block_free_message_expired_window(self):
        """Test that free messages are blocked when window expires."""
        mock_db = AsyncMock()
        service = WindowValidationService(mock_db)
        
        # Mock window_repo to return expired window
        mock_window = MagicMock()
        mock_window.is_within_window = False
        
        service.window_repo.get_by_conversation_id = AsyncMock(return_value=mock_window)
        
        conv_id = uuid4()
        org_id = uuid4()
        
        # Check if free message can be sent
        can_send = await service.can_send_free_message(conv_id, org_id)
        
        # Should block free message when window is expired
        assert can_send is False
        logger.info("✅ Free message blocked when window expired")

    @pytest.mark.asyncio
    async def test_window_status_active(self):
        """Test window status returns ACTIVE for valid window."""
        mock_db = AsyncMock()
        service = WindowValidationService(mock_db)
        
        # Mock active window
        mock_window = MagicMock()
        mock_window.is_within_window = True
        
        service.window_repo.get_by_conversation_id = AsyncMock(return_value=mock_window)
        
        conv_id = uuid4()
        org_id = uuid4()
        
        # Get window status
        status, window = await service.get_window_status(conv_id, org_id)
        
        # Should return ACTIVE status
        assert status == WindowStatus.ACTIVE
        assert window is not None
        logger.info("✅ Window status correctly identified as ACTIVE")

    @pytest.mark.asyncio
    async def test_window_status_expired(self):
        """Test window status returns EXPIRED for invalid window."""
        mock_db = AsyncMock()
        service = WindowValidationService(mock_db)
        
        # Mock expired window
        mock_window = MagicMock()
        mock_window.is_within_window = False
        
        service.window_repo.get_by_conversation_id = AsyncMock(return_value=mock_window)
        
        conv_id = uuid4()
        org_id = uuid4()
        
        # Get window status
        status, window = await service.get_window_status(conv_id, org_id)
        
        # Should return EXPIRED status
        assert status == WindowStatus.EXPIRED
        assert window is not None
        logger.info("✅ Window status correctly identified as EXPIRED")

    @pytest.mark.asyncio
    async def test_window_status_unknown_no_conversation(self):
        """Test window status returns UNKNOWN when conversation not found."""
        mock_db = AsyncMock()
        service = WindowValidationService(mock_db)
        
        # Mock no window found
        service.window_repo.get_by_conversation_id = AsyncMock(return_value=None)
        
        conv_id = uuid4()
        org_id = uuid4()
        
        # Get window status
        status, window = await service.get_window_status(conv_id, org_id)
        
        # Should return UNKNOWN status
        assert status == WindowStatus.UNKNOWN
        assert window is None
        logger.info("✅ Window status correctly identified as UNKNOWN when not found")

    @pytest.mark.asyncio
    async def test_multi_tenant_isolation(self):
        """Test that window validation respects organization_id isolation."""
        mock_db = AsyncMock()
        service = WindowValidationService(mock_db)
        
        conv_id = uuid4()
        org_id = uuid4()
        
        # Mock window_repo method to track organization_id parameter
        async def mock_get_by_conversation_id(conv_id_param, org_id_param):
            # Verify organization_id is passed
            assert org_id_param == org_id
            return None
        
        service.window_repo.get_by_conversation_id = mock_get_by_conversation_id
        
        # Get window status
        status, window = await service.get_window_status(conv_id, org_id)
        
        # Should have passed organization_id check
        assert status == WindowStatus.UNKNOWN
        logger.info("✅ Multi-tenant isolation verified in window status")

    @pytest.mark.asyncio
    async def test_message_validation_result_to_dict(self):
        """Test MessageValidationResult conversion to dictionary."""
        from app.services.window_validation_service import MessageValidationResult
        
        # Create validation result
        result = MessageValidationResult(
            is_valid=True,
            reason="Message allowed",
            window_status=WindowStatus.ACTIVE,
            hours_remaining=12.5,
            template_required=False,
        )
        
        # Convert to dict
        result_dict = result.to_dict()
        
        # Verify dict structure
        assert result_dict["is_valid"] is True
        assert result_dict["reason"] == "Message allowed"
        assert result_dict["window_status"] == "active"
        assert result_dict["hours_remaining"] == 12.5
        assert result_dict["template_required"] is False
        
        logger.info("✅ MessageValidationResult correctly converts to dict")

    @pytest.mark.asyncio
    async def test_requires_template_when_window_expired(self):
        """Test that template is required when window is expired."""
        mock_db = AsyncMock()
        service = WindowValidationService(mock_db)
        
        # Mock expired window
        mock_window = MagicMock()
        mock_window.is_within_window = False
        
        service.window_repo.get_by_conversation_id = AsyncMock(return_value=mock_window)
        
        conv_id = uuid4()
        org_id = uuid4()
        
        # Check if message validation
        can_send = await service.can_send_free_message(conv_id, org_id)
        
        # When can't send free message, template is required
        if not can_send:
            logger.info("✅ Template required when window expired")
            assert True
        else:
            pytest.fail("Template should be required when window expired")


class TestWindowValidationEndpoints:
    """Test REST API endpoints for window validation."""

    @pytest.mark.asyncio
    async def test_get_window_status_endpoint(self):
        """Test GET /conversations/{id}/window-status endpoint."""
        # Will be tested against real API in integration tests
        # Placeholder for integration test framework
        pass

    @pytest.mark.asyncio
    async def test_validate_message_before_send(self):
        """Test message validation before sending."""
        # Placeholder for validation logic testing
        pass

    @pytest.mark.asyncio
    async def test_error_on_expired_window_free_message(self):
        """Test that free message is rejected when window expired."""
        # Placeholder for error handling testing
        pass

