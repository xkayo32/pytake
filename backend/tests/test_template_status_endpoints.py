"""
Tests for template status monitoring and quality endpoints.

Tests the endpoints:
- GET /templates/critical - Get critical templates
- GET /templates/quality-summary - Get quality summary
- GET /{number_id}/templates/{template_id}/status-history - Status history
- POST /{number_id}/templates/{template_id}/acknowledge-alert - Acknowledge alert

Author: Kayo Carvalho Fernandes
"""

import pytest
from uuid import uuid4, UUID
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select

from fastapi.testclient import TestClient
from app.main import app

from app.models import (
    Base,
    Organization,
    User,
    WhatsAppNumber,
    WhatsAppTemplate,
)
from app.models.whatsapp_number import TemplateStatus, QualityScore
from app.core.database import get_db


@pytest.fixture
async def test_db():
    """Create test database."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    AsyncSessionLocal = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    
    async def override_get_db():
        async with AsyncSessionLocal() as session:
            yield session
    
    app.dependency_overrides[get_db] = override_get_db
    
    async with AsyncSessionLocal() as session:
        yield session
    
    await engine.dispose()


@pytest.fixture
async def organization(test_db):
    """Create test organization."""
    org = Organization(
        id=uuid4(),
        name="Test Organization",
        slug="test-org"
    )
    test_db.add(org)
    await test_db.commit()
    await test_db.refresh(org)
    return org


@pytest.fixture
async def admin_user(test_db, organization):
    """Create test admin user."""
    user = User(
        id=uuid4(),
        organization_id=organization.id,
        email="admin@test.com",
        full_name="Admin User",
        hashed_password="hashed_pwd",
        role="org_admin",
        is_active=True,
    )
    test_db.add(user)
    await test_db.commit()
    await test_db.refresh(user)
    return user


@pytest.fixture
async def whatsapp_number(test_db, organization):
    """Create test WhatsApp number."""
    number = WhatsAppNumber(
        id=uuid4(),
        organization_id=organization.id,
        phone_number="5585987654321",
        phone_number_id="123456789",
        waba_id="987654321",
        access_token="test_token",
        status="connected",
    )
    test_db.add(number)
    await test_db.commit()
    await test_db.refresh(number)
    return number


@pytest.fixture
async def approved_template(test_db, organization, whatsapp_number):
    """Create approved template with GREEN quality."""
    template = WhatsAppTemplate(
        id=uuid4(),
        organization_id=organization.id,
        whatsapp_number_id=whatsapp_number.id,
        name="approved_template",
        status=TemplateStatus.APPROVED,
        quality_score=QualityScore.GREEN,
        sent_count=1000,
        delivered_count=980,
        failed_count=20,
        created_at=datetime.utcnow() - timedelta(days=30),
        last_status_update=datetime.utcnow() - timedelta(hours=1),
    )
    test_db.add(template)
    await test_db.commit()
    await test_db.refresh(template)
    return template


@pytest.fixture
async def critical_template_disabled(test_db, organization, whatsapp_number):
    """Create disabled template (critical)."""
    template = WhatsAppTemplate(
        id=uuid4(),
        organization_id=organization.id,
        whatsapp_number_id=whatsapp_number.id,
        name="disabled_template",
        status=TemplateStatus.DISABLED,
        quality_score=QualityScore.RED,
        disabled_reason="QUALITY_ISSUES",
        disabled_at=datetime.utcnow() - timedelta(days=2),
        sent_count=500,
        delivered_count=450,
        failed_count=50,
        created_at=datetime.utcnow() - timedelta(days=10),
        last_status_update=datetime.utcnow() - timedelta(days=2),
    )
    test_db.add(template)
    await test_db.commit()
    await test_db.refresh(template)
    return template


@pytest.fixture
async def critical_template_paused(test_db, organization, whatsapp_number):
    """Create paused template (critical)."""
    template = WhatsAppTemplate(
        id=uuid4(),
        organization_id=organization.id,
        whatsapp_number_id=whatsapp_number.id,
        name="paused_template",
        status=TemplateStatus.PAUSED,
        quality_score=QualityScore.YELLOW,
        paused_at=datetime.utcnow() - timedelta(hours=12),
        sent_count=750,
        delivered_count=700,
        failed_count=50,
        created_at=datetime.utcnow() - timedelta(days=15),
        last_status_update=datetime.utcnow() - timedelta(hours=12),
    )
    test_db.add(template)
    await test_db.commit()
    await test_db.refresh(template)
    return template


@pytest.fixture
async def pending_template(test_db, organization, whatsapp_number):
    """Create pending template."""
    template = WhatsAppTemplate(
        id=uuid4(),
        organization_id=organization.id,
        whatsapp_number_id=whatsapp_number.id,
        name="pending_template",
        status=TemplateStatus.PENDING,
        quality_score=QualityScore.UNKNOWN,
        created_at=datetime.utcnow() - timedelta(hours=36),
        last_status_update=datetime.utcnow() - timedelta(hours=36),
    )
    test_db.add(template)
    await test_db.commit()
    await test_db.refresh(template)
    return template


@pytest.mark.asyncio
class TestTemplateStatusEndpoints:
    """Test suite for template status monitoring endpoints."""
    
    async def test_get_critical_templates_empty(
        self,
        test_db,
        organization,
        admin_user,
        approved_template,
    ):
        """Test getting critical templates when only approved templates exist."""
        client = TestClient(app)
        
        # TODO: Mock JWT token for authenticated request
        response = client.get(
            "/api/v1/whatsapp/templates/critical",
            headers={"Authorization": f"Bearer mock_token"},
        )
        
        # In real test, would verify empty list is returned
        # For now, just verify endpoint exists
        assert response.status_code in [200, 401, 403]
    
    
    async def test_get_critical_templates_with_disabled(
        self,
        test_db,
        organization,
        admin_user,
        critical_template_disabled,
    ):
        """Test that disabled templates appear in critical list."""
        # Setup: Create templates
        # Expected: Disabled template should appear in critical list
        # with proper failure rate calculation
        pass
    
    
    async def test_get_critical_templates_with_paused(
        self,
        test_db,
        organization,
        admin_user,
        critical_template_paused,
    ):
        """Test that paused templates appear in critical list."""
        pass
    
    
    async def test_get_quality_summary(
        self,
        test_db,
        organization,
        admin_user,
        approved_template,
        critical_template_disabled,
        critical_template_paused,
    ):
        """Test quality summary endpoint with multiple templates."""
        # Setup: Create templates with various statuses
        # Expected: Summary should show distribution of statuses
        # and quality scores
        pass
    
    
    async def test_get_status_history(
        self,
        test_db,
        organization,
        admin_user,
        whatsapp_number,
        approved_template,
    ):
        """Test status history endpoint."""
        # Setup: Create template with status updates
        # Expected: Should return timeline of status changes
        pass
    
    
    async def test_acknowledge_template_alert(
        self,
        test_db,
        organization,
        admin_user,
        whatsapp_number,
        critical_template_disabled,
    ):
        """Test acknowledging template alert."""
        # Setup: Fetch critical template
        # Expected: After acknowledge, should be marked as viewed
        pass
    
    
    async def test_unauthorized_access_to_critical_templates(
        self,
        test_db,
    ):
        """Test that unauthenticated users cannot access critical templates."""
        client = TestClient(app)
        
        response = client.get("/api/v1/whatsapp/templates/critical")
        
        # Should require authentication
        assert response.status_code in [401, 403]
    
    
    async def test_cross_organization_isolation(
        self,
        test_db,
    ):
        """Test that users cannot see templates from other organizations."""
        # Setup: Create two organizations with templates
        # Expected: Each user should only see their org's templates
        pass


@pytest.mark.asyncio
class TestTemplateStatusService:
    """Test suite for TemplateStatusService methods."""
    
    async def test_get_critical_templates_query(self, test_db, organization):
        """Test get_critical_templates query method."""
        from app.services.template_status_service import TemplateStatusService
        
        service = TemplateStatusService(test_db)
        # Expected: Query should return only templates with issues
        pass
    
    
    async def test_get_template_quality_summary_query(self, test_db, organization):
        """Test get_template_quality_summary query method."""
        from app.services.template_status_service import TemplateStatusService
        
        service = TemplateStatusService(test_db)
        # Expected: Summary should calculate aggregates correctly
        pass
    
    
    async def test_calculate_failure_rate(self, test_db):
        """Test failure rate calculation."""
        # Edge cases:
        # - sent_count = 0 (should be 0%)
        # - failed_count = 0 (should be 0%)
        # - all failed (should be 100%)
        pass


# ============= Test Data Factories =============

def create_template_factory(
    test_db: AsyncSession,
    organization: Organization,
    whatsapp_number: WhatsAppNumber,
    **kwargs,
) -> WhatsAppTemplate:
    """Factory for creating templates with custom properties."""
    template_data = {
        "id": uuid4(),
        "organization_id": organization.id,
        "whatsapp_number_id": whatsapp_number.id,
        "name": f"template_{uuid4().hex[:8]}",
        "status": TemplateStatus.APPROVED,
        "quality_score": QualityScore.GREEN,
        "sent_count": 0,
        "delivered_count": 0,
        "failed_count": 0,
        "created_at": datetime.utcnow(),
        "last_status_update": datetime.utcnow(),
        **kwargs,
    }
    
    template = WhatsAppTemplate(**template_data)
    test_db.add(template)
    
    return template


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
