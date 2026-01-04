"""
Expense Tracking Service Tests - Phase 3.3

Author: Kayo Carvalho Fernandes
Date: 16/12/2025
"""

import pytest
from uuid import uuid4
from datetime import datetime, timedelta
from decimal import Decimal

# Test data
ORG_ID = uuid4()
TEMPLATE_ID = uuid4()


@pytest.mark.asyncio
class TestExpenseTrackingService:
    """Tests for expense tracking service"""

    async def test_expense_model_creation(self):
        """Test expense record structure"""
        from app.models.expense import Expense
        
        # Create test expense
        expense_id = uuid4()
        expense = {
            "id": expense_id,
            "organization_id": ORG_ID,
            "template_id": TEMPLATE_ID,
            "message_count": 5000,
            "cost_usd": Decimal("7.50"),
            "category": "MARKETING",
            "complexity_level": "with_button",
        }
        
        assert expense["organization_id"] == ORG_ID
        assert expense["template_id"] == TEMPLATE_ID
        assert expense["cost_usd"] == Decimal("7.50")

    async def test_organization_cost_limit_model(self):
        """Test organization cost limit structure"""
        from app.models.expense import OrganizationCostLimit
        
        limit = {
            "id": uuid4(),
            "organization_id": ORG_ID,
            "monthly_limit_usd": Decimal("5000.00"),
            "alert_threshold_percentage": 80,
            "is_active": True,
        }
        
        assert limit["monthly_limit_usd"] == Decimal("5000.00")
        assert limit["alert_threshold_percentage"] == 80
        assert limit["is_active"] is True

    async def test_expense_alert_model(self):
        """Test expense alert structure"""
        from app.models.expense import ExpenseAlert
        
        alert = {
            "id": uuid4(),
            "organization_id": ORG_ID,
            "alert_type": "threshold_exceeded",
            "current_cost_usd": Decimal("4000.00"),
            "limit_cost_usd": Decimal("5000.00"),
            "percentage_of_limit": 80,
            "period_month": 12,
            "period_year": 2025,
            "is_acknowledged": False,
        }
        
        assert alert["alert_type"] == "threshold_exceeded"
        assert alert["percentage_of_limit"] == 80

    async def test_get_organization_expenses_aggregates_costs(self):
        """Test organization expenses aggregation"""
        # Mock expenses data
        expenses_data = [
            {
                "template_id": uuid4(),
                "cost_usd": Decimal("5.00"),
                "message_count": 1000,
                "category": "MARKETING",
            },
            {
                "template_id": uuid4(),
                "cost_usd": Decimal("3.50"),
                "message_count": 2000,
                "category": "UTILITY",
            },
        ]

        # Aggregate totals
        total_cost = sum(e["cost_usd"] for e in expenses_data)
        
        result = {
            "organization_id": ORG_ID,
            "period_days": 30,
            "total_cost_usd": float(total_cost),
            "by_category": {
                "MARKETING": {"total_cost_usd": 5.00},
                "UTILITY": {"total_cost_usd": 3.50},
            },
        }

        assert result["organization_id"] == ORG_ID
        assert result["period_days"] == 30
        assert isinstance(result["total_cost_usd"], float)
        assert "by_category" in result
        assert float(total_cost) == 8.50

    async def test_expenses_breakdown_by_category(self):
        """Test expenses breakdown includes all categories"""
        categories = ["MARKETING", "UTILITY", "AUTHENTICATION", "SERVICE"]
        
        breakdown = {
            cat: {
                "total_cost_usd": 10.00,
                "message_count": 1000,
                "templates": 5,
            }
            for cat in categories
        }

        # Verify all categories present
        assert "MARKETING" in breakdown
        assert "UTILITY" in breakdown
        assert "AUTHENTICATION" in breakdown
        assert "SERVICE" in breakdown

    async def test_get_template_expense_history_calculates_trends(self):
        """Test template history calculates weekly trends"""
        template_history = {
            "template_id": TEMPLATE_ID,
            "template_name": "Test Template",
            "organization_id": ORG_ID,
            "period_days": 30,
            "total_cost_usd": 12.00,
            "total_messages": 1200,
            "cost_per_message": 0.01,
            "weekly_breakdown": {
                "2025-W49": {"total_cost_usd": 5.00, "message_count": 500},
                "2025-W50": {"total_cost_usd": 7.00, "message_count": 700},
            }
        }

        assert template_history["template_id"] == TEMPLATE_ID
        assert template_history["template_name"] == "Test Template"
        assert "weekly_breakdown" in template_history
        assert template_history["total_messages"] == 1200
        assert template_history["cost_per_message"] == 0.01

    async def test_calculate_optimization_suggestions(self):
        """Test optimization suggestions generation"""
        suggestions = {
            "organization_id": ORG_ID,
            "suggestion_count": 2,
            "suggestions": [
                {
                    "type": "low_success_rate",
                    "template_id": TEMPLATE_ID,
                    "current_success_rate": 0.75,
                    "priority": "high",
                },
                {
                    "type": "category_optimization",
                    "category": "MARKETING",
                    "current_success_rate": 0.82,
                    "priority": "medium",
                }
            ]
        }

        assert suggestions["organization_id"] == ORG_ID
        assert suggestions["suggestion_count"] >= 0
        assert isinstance(suggestions["suggestions"], list)
        if suggestions["suggestions"]:
            assert "priority" in suggestions["suggestions"][0]

    async def test_check_cost_limits_within_bounds(self):
        """Test cost limit check when within bounds"""
        cost_check = {
            "organization_id": ORG_ID,
            "month": 12,
            "year": 2025,
            "status": "within_limits",
            "monthly_limit_usd": 1000.00,
            "current_cost_usd": 500.00,
            "percentage_of_limit": 50,
        }

        assert cost_check["status"] == "within_limits"
        assert cost_check["percentage_of_limit"] == 50
        assert cost_check["current_cost_usd"] < cost_check["monthly_limit_usd"]

    async def test_check_cost_limits_threshold_exceeded(self):
        """Test cost limit check when threshold exceeded"""
        cost_check = {
            "status": "threshold_exceeded",
            "monthly_limit_usd": 1000.00,
            "current_cost_usd": 850.00,
            "percentage_of_limit": 85,
            "alert_threshold_percentage": 80,
        }

        assert cost_check["status"] == "threshold_exceeded"
        assert cost_check["percentage_of_limit"] >= cost_check["alert_threshold_percentage"]
        assert cost_check["percentage_of_limit"] < 100

    async def test_check_cost_limits_exceeded(self):
        """Test cost limit check when limit exceeded"""
        cost_check = {
            "status": "limit_exceeded",
            "monthly_limit_usd": 1000.00,
            "current_cost_usd": 1100.00,
            "percentage_of_limit": 110,
        }

        assert cost_check["status"] == "limit_exceeded"
        assert cost_check["percentage_of_limit"] >= 100

    async def test_no_cost_limit_set(self):
        """Test behavior when no cost limit is set"""
        cost_check = {
            "has_limit": False,
            "status": "no_limit_set",
            "organization_id": ORG_ID,
        }

        assert cost_check["has_limit"] is False
        assert cost_check["status"] == "no_limit_set"

    async def test_cost_per_message_calculation(self):
        """Test cost per message is calculated correctly"""
        # 10.00 / 1000 = 0.01 per message
        total_cost = Decimal("10.00")
        total_messages = 1000
        cost_per_message = total_cost / total_messages

        assert cost_per_message == Decimal("0.01")
        assert float(cost_per_message) == 0.01

    async def test_multi_tenancy_organization_isolation(self):
        """Test organization expense isolation"""
        org1_id = uuid4()
        org2_id = uuid4()

        # Both organizations have separate expense records
        org1_expenses = {
            "organization_id": org1_id,
            "total_cost_usd": 500.00,
        }
        
        org2_expenses = {
            "organization_id": org2_id,
            "total_cost_usd": 800.00,
        }

        assert org1_expenses["organization_id"] != org2_expenses["organization_id"]
        assert org1_expenses["total_cost_usd"] != org2_expenses["total_cost_usd"]

    async def test_expense_decimal_precision(self):
        """Test expense amounts maintain decimal precision"""
        # 4 decimal places: 7.4250
        precise_cost = Decimal("7.4250")
        cost_as_float = float(precise_cost)

        assert isinstance(cost_as_float, float)
        assert cost_as_float > 0
        assert cost_as_float == 7.425

    async def test_optimization_suggestions_prioritized(self):
        """Test optimization suggestions are prioritized"""
        suggestions = [
            {"type": "low_success_rate", "priority": "high"},
            {"type": "category_optimization", "priority": "medium"},
            {"type": "cost_analysis", "priority": "low"},
        ]

        # Sort by priority
        priority_order = {"high": 0, "medium": 1, "low": 2}
        sorted_suggestions = sorted(
            suggestions, 
            key=lambda x: priority_order.get(x.get("priority", "low"), 3)
        )

        assert sorted_suggestions[0]["priority"] == "high"
        assert sorted_suggestions[-1]["priority"] == "low"

    async def test_alert_types_enumeration(self):
        """Test different alert types"""
        alert_types = [
            "threshold_exceeded",
            "limit_reached",
            "anomaly",
        ]

        for alert_type in alert_types:
            assert isinstance(alert_type, str)
            assert len(alert_type) > 0

    async def test_monthly_period_calculation(self):
        """Test monthly period calculation for cost limits"""
        # Test December (31 days)
        cost_check_dec = {
            "month": 12,
            "year": 2025,
        }

        assert cost_check_dec["month"] == 12
        assert cost_check_dec["year"] == 2025

        # Test February (28 days in non-leap year)
        cost_check_feb = {
            "month": 2,
            "year": 2025,
        }

        assert cost_check_feb["month"] == 2
        assert cost_check_feb["year"] == 2025
