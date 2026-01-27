"""
Tests for AI Assistant endpoints
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app
from app.models.user import User
from app.models.organization import Organization
from app.schemas.ai_assistant import AIAssistantSettings, AIProvider


pytestmark = pytest.mark.asyncio


class TestAIAssistantTestEndpoint:
    """Tests for POST /ai-assistant/test endpoint"""

    @pytest.fixture
    async def test_client(self):
        """Create test client"""
        return TestClient(app)

    async def test_test_connection_openai_success(
        self,
        test_client: TestClient,
        db_session: AsyncSession,
        org_admin_user: User,
    ):
        """Test successful OpenAI connection test"""
        # Mock OpenAI client
        with patch("app.api.v1.endpoints.ai_assistant.OpenAI") as mock_openai:
            mock_client = AsyncMock()
            mock_openai.return_value = mock_client
            
            # Setup organization with OpenAI settings
            org_admin_user.organization.settings = {
                "ai_assistant": {
                    "enabled": True,
                    "default_provider": "openai",
                    "openai_api_key": "sk-test-key",
                    "model": "gpt-4o",
                    "temperature": 0.7,
                    "max_tokens": 2048,
                }
            }
            
            # Mock response
            mock_response = MagicMock()
            mock_response.choices = [MagicMock(message=MagicMock(content="Hi"))]
            mock_client.chat.completions.create.return_value = mock_response
            
            # Test
            response = test_client.post(
                "/api/v1/ai-assistant/test",
                headers={"Authorization": f"Bearer {org_admin_user.token}"},
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert data["provider"] == "openai"
            assert data["model_tested"] == "gpt-4o-mini"

    async def test_test_connection_anthropic_success(
        self,
        test_client: TestClient,
        db_session: AsyncSession,
        org_admin_user: User,
    ):
        """Test successful Anthropic connection test"""
        with patch("app.api.v1.endpoints.ai_assistant.Anthropic") as mock_anthropic:
            mock_client = AsyncMock()
            mock_anthropic.return_value = mock_client
            
            # Setup organization with Anthropic settings
            org_admin_user.organization.settings = {
                "ai_assistant": {
                    "enabled": True,
                    "default_provider": "anthropic",
                    "anthropic_api_key": "sk-ant-test-key",
                    "model": "claude-3-sonnet",
                    "temperature": 0.7,
                    "max_tokens": 2048,
                }
            }
            
            # Mock response
            mock_response = MagicMock()
            mock_response.content = [MagicMock(text="Hi")]
            mock_client.messages.create.return_value = mock_response
            
            # Test
            response = test_client.post(
                "/api/v1/ai-assistant/test",
                headers={"Authorization": f"Bearer {org_admin_user.token}"},
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert data["provider"] == "anthropic"
            assert data["model_tested"] == "claude-3-5-haiku-20241022"

    async def test_test_connection_gemini_success(
        self,
        test_client: TestClient,
        db_session: AsyncSession,
        org_admin_user: User,
    ):
        """Test successful Gemini connection test - MAIN FIX"""
        with patch("app.api.v1.endpoints.ai_assistant.genai") as mock_genai:
            mock_client = AsyncMock()
            mock_genai.GenerativeModel.return_value = mock_client
            
            # Setup organization with Gemini settings
            org_admin_user.organization.settings = {
                "ai_assistant": {
                    "enabled": True,
                    "default_provider": "gemini",
                    "gemini_api_key": "AIza-test-key",
                    "model": "gemini-2.5-flash",
                    "temperature": 0.7,
                    "max_tokens": 2048,
                }
            }
            
            # Mock response
            mock_response = MagicMock()
            mock_response.text = "Hi"
            mock_client.generate_content.return_value = mock_response
            
            # Test
            response = test_client.post(
                "/api/v1/ai-assistant/test",
                headers={"Authorization": f"Bearer {org_admin_user.token}"},
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert data["provider"] == "gemini"
            assert data["model_tested"] == "gemini-2.5-flash-lite"

    async def test_test_connection_not_configured(
        self,
        test_client: TestClient,
        org_admin_user: User,
    ):
        """Test error when AI Assistant not configured"""
        # No AI settings
        org_admin_user.organization.settings = {}
        
        response = test_client.post(
            "/api/v1/ai-assistant/test",
            headers={"Authorization": f"Bearer {org_admin_user.token}"},
        )
        
        assert response.status_code == 400
        assert "not configured" in response.json()["detail"]

    async def test_test_connection_missing_api_key_openai(
        self,
        test_client: TestClient,
        org_admin_user: User,
    ):
        """Test error when OpenAI API key missing"""
        org_admin_user.organization.settings = {
            "ai_assistant": {
                "enabled": True,
                "default_provider": "openai",
                # Missing openai_api_key
                "model": "gpt-4o",
            }
        }
        
        response = test_client.post(
            "/api/v1/ai-assistant/test",
            headers={"Authorization": f"Bearer {org_admin_user.token}"},
        )
        
        assert response.status_code == 400
        assert "not configured" in response.json()["detail"]

    async def test_test_connection_missing_api_key_gemini(
        self,
        test_client: TestClient,
        org_admin_user: User,
    ):
        """Test error when Gemini API key missing"""
        org_admin_user.organization.settings = {
            "ai_assistant": {
                "enabled": True,
                "default_provider": "gemini",
                # Missing gemini_api_key
                "model": "gemini-2.5-flash",
            }
        }
        
        response = test_client.post(
            "/api/v1/ai-assistant/test",
            headers={"Authorization": f"Bearer {org_admin_user.token}"},
        )
        
        assert response.status_code == 400
        assert "not configured" in response.json()["detail"]

    async def test_test_connection_unauthorized_role(
        self,
        test_client: TestClient,
        regular_user: User,
    ):
        """Test error when user doesn't have admin role"""
        response = test_client.post(
            "/api/v1/ai-assistant/test",
            headers={"Authorization": f"Bearer {regular_user.token}"},
        )
        
        assert response.status_code == 403
        assert "admins" in response.json()["detail"]

    async def test_test_connection_invalid_api_key(
        self,
        test_client: TestClient,
        org_admin_user: User,
    ):
        """Test error when API key is invalid"""
        org_admin_user.organization.settings = {
            "ai_assistant": {
                "enabled": True,
                "default_provider": "openai",
                "openai_api_key": "invalid-key",
                "model": "gpt-4o",
            }
        }
        
        with patch("app.api.v1.endpoints.ai_assistant.OpenAI") as mock_openai:
            # Simulate invalid API key error
            mock_openai.return_value.chat.completions.create.side_effect = Exception(
                "Invalid API key"
            )
            
            response = test_client.post(
                "/api/v1/ai-assistant/test",
                headers={"Authorization": f"Bearer {org_admin_user.token}"},
            )
            
            assert response.status_code == 401
            assert "Invalid API key" in response.json()["detail"]
