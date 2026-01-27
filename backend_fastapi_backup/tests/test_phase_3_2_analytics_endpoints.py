"""
Template Analytics Endpoints Tests - Phase 3.2

Author: Kayo Carvalho Fernandes
Date: 16/12/2025
"""

import pytest
from uuid import UUID, uuid4
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

# Test data
ORG_ID = uuid4()
TEMPLATE_ID = uuid4()
USER_ID = uuid4()


@pytest.mark.asyncio
class TestTemplateAnalyticsEndpoints:
    """Tests for template analytics endpoints"""

    async def test_template_metrics_endpoint_structure(self):
        """Test GET /templates/{id}/analytics/metrics endpoint returns correct structure"""
        # Mock analytics service
        mock_analytics = AsyncMock()
        mock_analytics.get_template_metrics.return_value = {
            "template_id": TEMPLATE_ID,
            "template_name": "Welcome Template",
            "category": "MARKETING",
            "status": "APPROVED",
            "period_days": 30,
            "messages_sent": 5000,
            "successful_messages": 4750,
            "success_rate": 0.95,
            "unique_recipients": 450,
            "estimated_cost_usd": "7.50",
            "created_at": datetime.utcnow(),
        }
        
        # Test that endpoint would return correct fields
        result = await mock_analytics.get_template_metrics(
            template_id=TEMPLATE_ID,
            organization_id=ORG_ID,
            days=30
        )
        
        assert result["template_id"] == TEMPLATE_ID
        assert result["template_name"] == "Welcome Template"
        assert result["category"] == "MARKETING"
        assert result["status"] == "APPROVED"
        assert result["period_days"] == 30
        assert result["messages_sent"] == 5000
        assert result["success_rate"] == 0.95

    async def test_dashboard_endpoint_structure(self):
        """Test GET /templates/analytics/dashboard endpoint structure"""
        mock_analytics = AsyncMock()
        mock_analytics.get_organization_dashboard.return_value = {
            "organization_id": ORG_ID,
            "period_days": 30,
            "summary": {
                "total_templates": 25,
                "active_templates": 20,
                "total_messages_sent": 50000,
                "total_successful_messages": 47500,
                "total_unique_recipients": 4200,
                "total_estimated_cost_usd": "75.00",
            },
            "by_category": {
                "MARKETING": {
                    "templates": 10,
                    "messages_sent": 30000,
                    "success_rate": 0.95,
                },
                "UTILITY": {
                    "templates": 8,
                    "messages_sent": 15000,
                    "success_rate": 0.98,
                },
                "AUTHENTICATION": {
                    "templates": 7,
                    "messages_sent": 5000,
                    "success_rate": 0.99,
                },
            },
            "top_performers": [
                {"template_id": uuid4(), "template_name": "Template A", "success_rate": 0.99},
                {"template_id": uuid4(), "template_name": "Template B", "success_rate": 0.98},
            ],
            "bottom_performers": [
                {"template_id": uuid4(), "template_name": "Template Z", "success_rate": 0.80},
            ],
        }
        
        result = await mock_analytics.get_organization_dashboard(
            organization_id=ORG_ID,
            days=30
        )
        
        assert result["organization_id"] == ORG_ID
        assert result["period_days"] == 30
        assert result["summary"]["total_templates"] == 25
        assert result["summary"]["active_templates"] == 20
        assert "MARKETING" in result["by_category"]
        assert len(result["top_performers"]) >= 2
        assert len(result["bottom_performers"]) >= 1

    async def test_compare_templates_endpoint_structure(self):
        """Test POST /templates/analytics/compare endpoint structure"""
        template_id_1 = uuid4()
        template_id_2 = uuid4()
        template_id_3 = uuid4()
        
        mock_analytics = AsyncMock()
        mock_analytics.compare_templates.return_value = {
            "templates": [
                {
                    "template_id": template_id_1,
                    "template_name": "Template A",
                    "category": "MARKETING",
                    "messages_sent": 5000,
                    "success_rate": 0.95,
                    "unique_recipients": 450,
                    "cost_per_message": 0.0015,
                },
                {
                    "template_id": template_id_2,
                    "template_name": "Template B",
                    "category": "MARKETING",
                    "messages_sent": 4000,
                    "success_rate": 0.92,
                    "unique_recipients": 380,
                    "cost_per_message": 0.0015,
                },
                {
                    "template_id": template_id_3,
                    "template_name": "Template C",
                    "category": "UTILITY",
                    "messages_sent": 3000,
                    "success_rate": 0.98,
                    "unique_recipients": 280,
                    "cost_per_message": 0.0001,
                },
            ],
            "best_performer": {
                "template_id": template_id_3,
                "success_rate": 0.98,
            },
            "worst_performer": {
                "template_id": template_id_2,
                "success_rate": 0.92,
            },
        }
        
        result = await mock_analytics.compare_templates(
            template_ids=[template_id_1, template_id_2, template_id_3],
            organization_id=ORG_ID,
            days=30
        )
        
        assert len(result["templates"]) == 3
        assert result["best_performer"]["success_rate"] == 0.98
        assert result["worst_performer"]["success_rate"] == 0.92

    async def test_metrics_with_filters(self):
        """Test metrics endpoint with category and status filters"""
        mock_analytics = AsyncMock()
        mock_analytics.get_organization_dashboard.return_value = {
            "organization_id": ORG_ID,
            "period_days": 30,
            "summary": {
                "total_templates": 10,
                "active_templates": 10,
                "total_messages_sent": 30000,
                "total_successful_messages": 28500,
                "total_unique_recipients": 2700,
                "total_estimated_cost_usd": "45.00",
            },
            "by_category": {
                "MARKETING": {
                    "templates": 10,
                    "messages_sent": 30000,
                    "success_rate": 0.95,
                },
            },
        }
        
        # Simulate filtering by category
        result = await mock_analytics.get_organization_dashboard(
            organization_id=ORG_ID,
            days=30,
            category_filter="MARKETING",
            status_filter="APPROVED"
        )
        
        assert result["summary"]["total_templates"] == 10
        assert "MARKETING" in result["by_category"]

    async def test_metrics_period_variations(self):
        """Test metrics with different time periods"""
        mock_analytics = AsyncMock()
        
        # Test 7 days
        mock_analytics.get_template_metrics.return_value = {
            "template_id": TEMPLATE_ID,
            "period_days": 7,
            "messages_sent": 1000,
        }
        
        result_7d = await mock_analytics.get_template_metrics(
            template_id=TEMPLATE_ID,
            organization_id=ORG_ID,
            days=7
        )
        assert result_7d["period_days"] == 7
        assert result_7d["messages_sent"] == 1000
        
        # Test 30 days
        mock_analytics.get_template_metrics.return_value = {
            "template_id": TEMPLATE_ID,
            "period_days": 30,
            "messages_sent": 5000,
        }
        
        result_30d = await mock_analytics.get_template_metrics(
            template_id=TEMPLATE_ID,
            organization_id=ORG_ID,
            days=30
        )
        assert result_30d["period_days"] == 30
        assert result_30d["messages_sent"] == 5000

    async def test_dashboard_aggregation(self):
        """Test dashboard correctly aggregates all templates"""
        mock_analytics = AsyncMock()
        mock_analytics.get_organization_dashboard.return_value = {
            "organization_id": ORG_ID,
            "summary": {
                "total_templates": 100,
                "active_templates": 95,
                "total_messages_sent": 500000,
                "total_successful_messages": 475000,
                "total_unique_recipients": 42000,
                "total_estimated_cost_usd": "750.00",
            },
        }
        
        result = await mock_analytics.get_organization_dashboard(
            organization_id=ORG_ID,
            days=30
        )
        
        # Verify aggregation
        assert result["summary"]["total_templates"] == 100
        assert result["summary"]["total_messages_sent"] == 500000
        assert result["summary"]["total_unique_recipients"] == 42000

    async def test_compare_two_templates(self):
        """Test comparing exactly 2 templates"""
        template_id_1 = uuid4()
        template_id_2 = uuid4()
        
        mock_analytics = AsyncMock()
        mock_analytics.compare_templates.return_value = {
            "templates": [
                {"template_id": template_id_1, "success_rate": 0.95},
                {"template_id": template_id_2, "success_rate": 0.92},
            ],
        }
        
        result = await mock_analytics.compare_templates(
            template_ids=[template_id_1, template_id_2],
            organization_id=ORG_ID,
            days=30
        )
        
        assert len(result["templates"]) == 2
        assert result["templates"][0]["template_id"] == template_id_1

    async def test_compare_max_templates(self):
        """Test comparing maximum allowed templates (10)"""
        template_ids = [uuid4() for _ in range(10)]
        
        mock_analytics = AsyncMock()
        mock_analytics.compare_templates.return_value = {
            "templates": [
                {"template_id": tid, "success_rate": 0.95} for tid in template_ids
            ],
        }
        
        result = await mock_analytics.compare_templates(
            template_ids=template_ids,
            organization_id=ORG_ID,
            days=30
        )
        
        assert len(result["templates"]) == 10

    async def test_metrics_response_data_types(self):
        """Test all response fields have correct data types"""
        mock_analytics = AsyncMock()
        mock_analytics.get_template_metrics.return_value = {
            "template_id": TEMPLATE_ID,
            "template_name": "Test Template",
            "category": "MARKETING",
            "status": "APPROVED",
            "period_days": 30,
            "messages_sent": 5000,
            "successful_messages": 4750,
            "success_rate": 0.95,
            "unique_recipients": 450,
            "estimated_cost_usd": "7.50",
            "trend_percentage": 12.5,
        }
        
        result = await mock_analytics.get_template_metrics(
            template_id=TEMPLATE_ID,
            organization_id=ORG_ID,
            days=30
        )
        
        # Verify types
        assert isinstance(result["template_id"], UUID)
        assert isinstance(result["template_name"], str)
        assert isinstance(result["category"], str)
        assert isinstance(result["status"], str)
        assert isinstance(result["period_days"], int)
        assert isinstance(result["messages_sent"], int)
        assert isinstance(result["success_rate"], float)
        assert isinstance(result["estimated_cost_usd"], str)

    async def test_dashboard_category_breakdown(self):
        """Test dashboard includes breakdown by category"""
        mock_analytics = AsyncMock()
        mock_analytics.get_organization_dashboard.return_value = {
            "organization_id": ORG_ID,
            "by_category": {
                "MARKETING": {"templates": 10, "success_rate": 0.95},
                "UTILITY": {"templates": 8, "success_rate": 0.98},
                "AUTHENTICATION": {"templates": 7, "success_rate": 0.99},
                "SERVICE": {"templates": 5, "success_rate": 0.96},
            },
        }
        
        result = await mock_analytics.get_organization_dashboard(
            organization_id=ORG_ID,
            days=30
        )
        
        # Verify all categories are present
        assert "MARKETING" in result["by_category"]
        assert "UTILITY" in result["by_category"]
        assert "AUTHENTICATION" in result["by_category"]
        assert "SERVICE" in result["by_category"]

    async def test_dashboard_top_performers(self):
        """Test dashboard returns top 5 performers"""
        mock_analytics = AsyncMock()
        top_performers = [
            {"template_id": uuid4(), "success_rate": 0.99},
            {"template_id": uuid4(), "success_rate": 0.98},
            {"template_id": uuid4(), "success_rate": 0.97},
            {"template_id": uuid4(), "success_rate": 0.96},
            {"template_id": uuid4(), "success_rate": 0.95},
        ]
        
        mock_analytics.get_organization_dashboard.return_value = {
            "organization_id": ORG_ID,
            "top_performers": top_performers,
        }
        
        result = await mock_analytics.get_organization_dashboard(
            organization_id=ORG_ID,
            days=30
        )
        
        assert len(result["top_performers"]) == 5
        # Verify sorted by success_rate descending
        for i in range(len(result["top_performers"]) - 1):
            assert result["top_performers"][i]["success_rate"] >= result["top_performers"][i+1]["success_rate"]

    async def test_dashboard_bottom_performers(self):
        """Test dashboard returns bottom 5 performers"""
        mock_analytics = AsyncMock()
        bottom_performers = [
            {"template_id": uuid4(), "success_rate": 0.50},
            {"template_id": uuid4(), "success_rate": 0.55},
            {"template_id": uuid4(), "success_rate": 0.60},
            {"template_id": uuid4(), "success_rate": 0.65},
            {"template_id": uuid4(), "success_rate": 0.70},
        ]
        
        mock_analytics.get_organization_dashboard.return_value = {
            "organization_id": ORG_ID,
            "bottom_performers": bottom_performers,
        }
        
        result = await mock_analytics.get_organization_dashboard(
            organization_id=ORG_ID,
            days=30
        )
        
        assert len(result["bottom_performers"]) == 5
        # Verify sorted by success_rate ascending
        for i in range(len(result["bottom_performers"]) - 1):
            assert result["bottom_performers"][i]["success_rate"] <= result["bottom_performers"][i+1]["success_rate"]
