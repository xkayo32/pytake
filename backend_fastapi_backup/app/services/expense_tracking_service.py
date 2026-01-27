"""
Expense Tracking Service - Phase 3.3

Tracks template costs, manages expense limits, and provides optimization insights

Author: Kayo Carvalho Fernandes
Date: 16/12/2025
"""

from uuid import UUID
from datetime import datetime, timedelta
from decimal import Decimal
from calendar import monthrange
from typing import Optional, Dict, List, Any

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from dateutil import rrule

from app.models.expense import Expense, OrganizationCostLimit, ExpenseAlert
from app.models.whatsapp_number import WhatsAppTemplate
from app.repositories.whatsapp import WhatsAppTemplateRepository
from app.repositories.conversation import ConversationRepository
from app.services.template_cost_estimator import TemplateCostEstimator
from app.services.template_analytics_service import TemplateAnalyticsService


class ExpenseTrackingService:
    """Service for tracking and managing template expenses"""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.template_repo = WhatsAppTemplateRepository(db)
        self.conversation_repo = ConversationRepository(db)
        self.cost_estimator = TemplateCostEstimator(db)
        self.analytics = TemplateAnalyticsService(db)

    async def track_template_expense(
        self,
        template_id: UUID,
        organization_id: UUID,
        message_count: int,
        category: str,
        complexity_level: Optional[str] = None,
        period_start: Optional[datetime] = None,
        period_end: Optional[datetime] = None,
    ) -> Expense:
        """
        Track expense for a template based on message volume
        
        Args:
            template_id: ID of the template
            organization_id: Organization ID (multi-tenancy)
            message_count: Number of messages sent
            category: Message category (MARKETING, UTILITY, etc)
            complexity_level: Template complexity (simple, with_button, etc)
            period_start: Period start date (default: today)
            period_end: Period end date (default: tomorrow)
        
        Returns:
            Expense record created
        """
        # Calculate period if not provided
        if period_start is None:
            period_start = datetime.now(datetime.now().astimezone().tzinfo).replace(hour=0, minute=0, second=0)
        if period_end is None:
            period_end = period_start + timedelta(days=1)

        # Get template to validate existence
        template = await self.template_repo.get_by_id(template_id, organization_id)
        if not template:
            raise ValueError(f"Template {template_id} not found")

        # Calculate cost based on pricing tiers and complexity
        cost_usd = await self.cost_estimator.calculate_message_cost(
            category=category,
            message_count=message_count,
            complexity_level=complexity_level or "simple"
        )

        # Create expense record
        expense = Expense(
            id=UUID,
            organization_id=organization_id,
            template_id=template_id,
            message_count=message_count,
            cost_usd=cost_usd,
            category=category,
            complexity_level=complexity_level,
            period_start=period_start,
            period_end=period_end,
        )

        self.db.add(expense)
        await self.db.flush()

        # Check if organization exceeded cost limits
        await self._check_and_alert_limits(organization_id, period_start)

        return expense

    async def get_organization_expenses(
        self,
        organization_id: UUID,
        period_days: int = 30,
        category_filter: Optional[str] = None,
        template_filter: Optional[UUID] = None,
    ) -> Dict[str, Any]:
        """
        Get organization expenses for a period
        
        Args:
            organization_id: Organization ID
            period_days: Number of days to retrieve (default: 30)
            category_filter: Optional category filter
            template_filter: Optional template filter
        
        Returns:
            Dictionary with expense summary and breakdown
        """
        end_date = datetime.now(datetime.now().astimezone().tzinfo)
        start_date = end_date - timedelta(days=period_days)

        # Build query
        query = select(Expense).where(
            and_(
                Expense.organization_id == organization_id,
                Expense.created_at >= start_date,
                Expense.created_at <= end_date,
            )
        )

        if category_filter:
            query = query.where(Expense.category == category_filter)

        if template_filter:
            query = query.where(Expense.template_id == template_filter)

        result = await self.db.execute(query)
        expenses = result.scalars().all()

        # Calculate aggregations
        total_cost = Decimal("0.00")
        by_category = {}
        by_template = {}

        for expense in expenses:
            total_cost += expense.cost_usd

            # Category breakdown
            if expense.category not in by_category:
                by_category[expense.category] = {
                    "total_cost_usd": Decimal("0.00"),
                    "message_count": 0,
                    "templates": 0,
                }
            by_category[expense.category]["total_cost_usd"] += expense.cost_usd
            by_category[expense.category]["message_count"] += expense.message_count

            # Template breakdown
            if expense.template_id not in by_template:
                by_template[expense.template_id] = {
                    "total_cost_usd": Decimal("0.00"),
                    "message_count": 0,
                    "category": expense.category,
                }
            by_template[expense.template_id]["total_cost_usd"] += expense.cost_usd
            by_template[expense.template_id]["message_count"] += expense.message_count

        # Count unique templates per category
        for cat in by_category:
            by_category[cat]["templates"] = len(
                [t for t in by_template if by_template[t]["category"] == cat]
            )

        # Get organization cost limit
        limit_query = select(OrganizationCostLimit).where(
            OrganizationCostLimit.organization_id == organization_id
        )
        limit_result = await self.db.execute(limit_query)
        cost_limit = limit_result.scalar_one_or_none()

        # Calculate percentage of limit
        percentage_of_limit = 0
        if cost_limit:
            percentage_of_limit = int((total_cost / cost_limit.monthly_limit_usd) * 100)

        return {
            "organization_id": organization_id,
            "period_days": period_days,
            "start_date": start_date,
            "end_date": end_date,
            "total_cost_usd": float(total_cost),
            "monthly_limit_usd": float(cost_limit.monthly_limit_usd) if cost_limit else None,
            "percentage_of_limit": percentage_of_limit,
            "by_category": {
                cat: {
                    "total_cost_usd": float(by_category[cat]["total_cost_usd"]),
                    "message_count": by_category[cat]["message_count"],
                    "templates": by_category[cat]["templates"],
                }
                for cat in by_category
            },
            "by_template": {
                str(tmpl_id): {
                    "total_cost_usd": float(by_template[tmpl_id]["total_cost_usd"]),
                    "message_count": by_template[tmpl_id]["message_count"],
                    "category": by_template[tmpl_id]["category"],
                }
                for tmpl_id in by_template
            },
        }

    async def get_template_expense_history(
        self,
        template_id: UUID,
        organization_id: UUID,
        days: int = 90,
    ) -> Dict[str, Any]:
        """
        Get expense history for a specific template
        
        Args:
            template_id: Template ID
            organization_id: Organization ID
            days: Historical period
        
        Returns:
            Template expense history with trends
        """
        end_date = datetime.now(datetime.now().astimezone().tzinfo)
        start_date = end_date - timedelta(days=days)

        # Get expenses for template
        query = select(Expense).where(
            and_(
                Expense.template_id == template_id,
                Expense.organization_id == organization_id,
                Expense.created_at >= start_date,
                Expense.created_at <= end_date,
            )
        ).order_by(Expense.created_at)

        result = await self.db.execute(query)
        expenses = result.scalars().all()

        if not expenses:
            raise ValueError(f"No expenses found for template {template_id}")

        # Get template details
        template = await self.template_repo.get_by_id(template_id, organization_id)

        # Calculate weekly trends
        weekly_data = {}
        for expense in expenses:
            week_start = expense.created_at - timedelta(days=expense.created_at.weekday())
            week_key = week_start.strftime("%Y-W%U")

            if week_key not in weekly_data:
                weekly_data[week_key] = {
                    "total_cost_usd": Decimal("0.00"),
                    "message_count": 0,
                }

            weekly_data[week_key]["total_cost_usd"] += expense.cost_usd
            weekly_data[week_key]["message_count"] += expense.message_count

        # Total aggregation
        total_cost = sum(Decimal(str(expense.cost_usd)) for expense in expenses)
        total_messages = sum(expense.message_count for expense in expenses)

        # Cost per message
        cost_per_message = total_cost / total_messages if total_messages > 0 else Decimal("0.00")

        return {
            "template_id": template_id,
            "template_name": template.name if template else "Unknown",
            "organization_id": organization_id,
            "period_days": days,
            "total_cost_usd": float(total_cost),
            "total_messages": total_messages,
            "cost_per_message": float(cost_per_message),
            "weekly_breakdown": {
                week: {
                    "total_cost_usd": float(weekly_data[week]["total_cost_usd"]),
                    "message_count": weekly_data[week]["message_count"],
                }
                for week in sorted(weekly_data.keys())
            },
        }

    async def calculate_optimization_suggestions(
        self,
        organization_id: UUID,
    ) -> Dict[str, Any]:
        """
        Calculate optimization suggestions based on expense patterns
        
        Args:
            organization_id: Organization ID
        
        Returns:
            Optimization recommendations
        """
        # Get last 30 days of analytics
        analytics_data = await self.analytics.get_organization_dashboard(
            organization_id=organization_id,
            days=30,
        )

        # Get expenses for comparison
        expenses_data = await self.get_organization_expenses(
            organization_id=organization_id,
            period_days=30,
        )

        suggestions = []

        # Find low-performing templates (high cost, low success rate)
        for template_id, metrics in analytics_data.get("by_template", {}).items():
            if metrics.get("success_rate", 0) < 0.80:
                cost_data = expenses_data["by_template"].get(template_id, {})
                suggestions.append({
                    "type": "low_success_rate",
                    "template_id": template_id,
                    "current_success_rate": metrics.get("success_rate", 0),
                    "current_cost_usd": cost_data.get("total_cost_usd", 0),
                    "recommendation": "Consider revising template content or pausing underperforming template",
                    "priority": "high" if metrics.get("success_rate", 0) < 0.70 else "medium",
                })

        # Find expensive categories with opportunities
        for category, cat_metrics in analytics_data.get("by_category", {}).items():
            cat_cost = expenses_data["by_category"].get(category, {}).get("total_cost_usd", 0)
            if cat_cost > 0 and cat_metrics.get("success_rate", 0) < 0.85:
                suggestions.append({
                    "type": "category_optimization",
                    "category": category,
                    "current_success_rate": cat_metrics.get("success_rate", 0),
                    "total_cost_usd": cat_cost,
                    "recommendation": f"Optimize {category} category templates to improve efficiency",
                    "priority": "medium",
                })

        # Sort by priority
        priority_order = {"high": 0, "medium": 1, "low": 2}
        suggestions.sort(key=lambda x: priority_order.get(x.get("priority", "low"), 3))

        return {
            "organization_id": organization_id,
            "suggestion_count": len(suggestions),
            "suggestions": suggestions[:10],  # Top 10 suggestions
        }

    async def check_cost_limits(
        self,
        organization_id: UUID,
        current_month: Optional[int] = None,
        current_year: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Check if organization has exceeded cost limits
        
        Args:
            organization_id: Organization ID
            current_month: Month to check (default: current month)
            current_year: Year to check (default: current year)
        
        Returns:
            Cost limit status and alerts
        """
        now = datetime.now(datetime.now().astimezone().tzinfo)
        if current_month is None:
            current_month = now.month
        if current_year is None:
            current_year = now.year

        # Get organization cost limit
        limit_query = select(OrganizationCostLimit).where(
            OrganizationCostLimit.organization_id == organization_id
        )
        limit_result = await self.db.execute(limit_query)
        cost_limit = limit_result.scalar_one_or_none()

        if not cost_limit:
            return {
                "organization_id": organization_id,
                "month": current_month,
                "year": current_year,
                "has_limit": False,
                "status": "no_limit_set",
            }

        # Get expenses for current month
        month_start = datetime(current_year, current_month, 1, tzinfo=now.tzinfo)
        month_end = datetime(
            current_year,
            current_month,
            monthrange(current_year, current_month)[1],
            hour=23,
            minute=59,
            second=59,
            tzinfo=now.tzinfo,
        )

        expenses_query = select(func.sum(Expense.cost_usd)).where(
            and_(
                Expense.organization_id == organization_id,
                Expense.created_at >= month_start,
                Expense.created_at <= month_end,
            )
        )
        expenses_result = await self.db.execute(expenses_query)
        monthly_cost = expenses_result.scalar() or Decimal("0.00")

        # Calculate percentage
        percentage_of_limit = (monthly_cost / cost_limit.monthly_limit_usd * 100) if cost_limit.monthly_limit_usd > 0 else 0

        # Determine status
        if percentage_of_limit >= 100:
            status = "limit_exceeded"
        elif percentage_of_limit >= cost_limit.alert_threshold_percentage:
            status = "threshold_exceeded"
        else:
            status = "within_limits"

        return {
            "organization_id": organization_id,
            "month": current_month,
            "year": current_year,
            "has_limit": True,
            "status": status,
            "monthly_limit_usd": float(cost_limit.monthly_limit_usd),
            "current_cost_usd": float(monthly_cost),
            "percentage_of_limit": int(percentage_of_limit),
            "alert_threshold_percentage": cost_limit.alert_threshold_percentage,
        }

    async def _check_and_alert_limits(
        self,
        organization_id: UUID,
        expense_date: datetime,
    ) -> None:
        """
        Check cost limits and create alerts if exceeded
        
        Args:
            organization_id: Organization ID
            expense_date: Date of the expense
        """
        status = await self.check_cost_limits(
            organization_id=organization_id,
            current_month=expense_date.month,
            current_year=expense_date.year,
        )

        # Create alert if needed
        if status["status"] in ["threshold_exceeded", "limit_exceeded"]:
            # Check if alert already exists for this period
            alert_query = select(ExpenseAlert).where(
                and_(
                    ExpenseAlert.organization_id == organization_id,
                    ExpenseAlert.period_month == expense_date.month,
                    ExpenseAlert.period_year == expense_date.year,
                    ExpenseAlert.is_acknowledged == False,
                )
            )
            alert_result = await self.db.execute(alert_query)
            existing_alert = alert_result.scalar_one_or_none()

            if not existing_alert:
                alert = ExpenseAlert(
                    id=UUID,
                    organization_id=organization_id,
                    alert_type="limit_reached" if status["status"] == "limit_exceeded" else "threshold_exceeded",
                    current_cost_usd=status["current_cost_usd"],
                    limit_cost_usd=status["monthly_limit_usd"],
                    percentage_of_limit=status["percentage_of_limit"],
                    period_month=expense_date.month,
                    period_year=expense_date.year,
                )
                self.db.add(alert)
                await self.db.flush()
