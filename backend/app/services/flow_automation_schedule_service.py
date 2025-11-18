"""
Flow Automation Schedule Service - Advanced scheduling logic

Handles:
- Schedule creation and management
- Schedule exception management
- Next execution calculation
- Cron expression parsing
- Holiday/weekend handling
"""

import logging
from datetime import datetime, time, timedelta
from typing import List, Optional, Tuple
from uuid import UUID

from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import BadRequestException, NotFoundException
from app.models.flow_automation import (
    FlowAutomation,
    FlowAutomationSchedule,
    FlowAutomationScheduleException,
)
from app.schemas.flow_automation import (
    FlowAutomationScheduleCreate,
    FlowAutomationScheduleUpdate,
    FlowAutomationScheduleResponse,
    ScheduleExceptionCreate,
    SchedulePreview,
    NextExecutionInfo,
)

logger = logging.getLogger(__name__)


class FlowAutomationScheduleService:
    """Service for flow automation schedule operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ============================================
    # SCHEDULE CRUD
    # ============================================

    async def create_schedule(
        self,
        data: FlowAutomationScheduleCreate,
        organization_id: UUID,
    ) -> FlowAutomationSchedule:
        """
        Create a new schedule for automation

        Args:
            data: Schedule creation data
            organization_id: Organization UUID

        Returns:
            Created schedule

        Raises:
            NotFoundException: If automation not found
            BadRequestException: If validation fails
        """
        # Validate automation exists
        automation = await self._get_automation(data.automation_id, organization_id)
        if not automation:
            raise NotFoundException(f"Automation {data.automation_id} not found")

        # Validate schedule doesn't already exist
        existing = await self.get_schedule_by_automation(data.automation_id)
        if existing:
            raise BadRequestException("Automation already has a schedule. Delete it first.")

        # Validate recurrence config
        self._validate_recurrence_config(data.recurrence_type, data.recurrence_config)

        # Create schedule
        schedule = FlowAutomationSchedule(
            organization_id=organization_id,
            **data.model_dump(exclude={"automation_id"}),
        )

        self.db.add(schedule)
        await self.db.flush()

        # Calculate first execution
        schedule.next_scheduled_at = await self.calculate_next_execution(schedule)

        self.db.add(schedule)
        await self.db.commit()
        await self.db.refresh(schedule)

        return schedule

    async def get_schedule(
        self, schedule_id: UUID, organization_id: UUID
    ) -> Optional[FlowAutomationSchedule]:
        """Get schedule by ID"""
        query = select(FlowAutomationSchedule).where(
            and_(
                FlowAutomationSchedule.id == schedule_id,
                FlowAutomationSchedule.organization_id == organization_id,
                FlowAutomationSchedule.deleted_at.is_(None),
            )
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_schedule_by_automation(
        self, automation_id: UUID
    ) -> Optional[FlowAutomationSchedule]:
        """Get schedule by automation ID"""
        query = select(FlowAutomationSchedule).where(
            and_(
                FlowAutomationSchedule.automation_id == automation_id,
                FlowAutomationSchedule.deleted_at.is_(None),
            )
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def update_schedule(
        self, schedule_id: UUID, organization_id: UUID, data: FlowAutomationScheduleUpdate
    ) -> FlowAutomationSchedule:
        """Update schedule"""
        schedule = await self.get_schedule(schedule_id, organization_id)
        if not schedule:
            raise NotFoundException("Schedule not found")

        # Apply updates
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(schedule, field, value)

        # Recalculate next execution if config changed
        if any(field in update_data for field in ["recurrence_type", "recurrence_config", "start_date", "start_time"]):
            schedule.next_scheduled_at = await self.calculate_next_execution(schedule)

        schedule.updated_at = datetime.utcnow()
        await self.db.commit()
        await self.db.refresh(schedule)

        return schedule

    async def delete_schedule(self, schedule_id: UUID, organization_id: UUID) -> None:
        """Soft delete schedule"""
        schedule = await self.get_schedule(schedule_id, organization_id)
        if not schedule:
            raise NotFoundException("Schedule not found")

        schedule.deleted_at = datetime.utcnow()
        await self.db.commit()

    # ============================================
    # SCHEDULE EXCEPTIONS
    # ============================================

    async def add_exception(
        self, data: ScheduleExceptionCreate, organization_id: UUID
    ) -> FlowAutomationScheduleException:
        """Add an exception to schedule"""
        schedule = await self.get_schedule(data.schedule_id, organization_id)
        if not schedule:
            raise NotFoundException("Schedule not found")

        exception = FlowAutomationScheduleException(
            **data.model_dump(exclude={"schedule_id"}),
            schedule_id=data.schedule_id,
        )

        self.db.add(exception)
        await self.db.commit()
        await self.db.refresh(exception)

        return exception

    async def remove_exception(
        self, exception_id: UUID, organization_id: UUID
    ) -> None:
        """Remove an exception"""
        # Verify ownership via schedule
        query = select(FlowAutomationScheduleException).where(
            FlowAutomationScheduleException.id == exception_id
        ).options(selectinload(FlowAutomationScheduleException.schedule))

        result = await self.db.execute(query)
        exception = result.scalar_one_or_none()

        if not exception:
            raise NotFoundException("Exception not found")

        if exception.schedule.organization_id != organization_id:
            raise NotFoundException("No access to this exception")

        await self.db.delete(exception)
        await self.db.commit()

    async def list_exceptions(
        self, schedule_id: UUID, organization_id: UUID
    ) -> List[FlowAutomationScheduleException]:
        """List all exceptions for a schedule"""
        schedule = await self.get_schedule(schedule_id, organization_id)
        if not schedule:
            raise NotFoundException("Schedule not found")

        query = select(FlowAutomationScheduleException).where(
            FlowAutomationScheduleException.schedule_id == schedule_id
        ).order_by(FlowAutomationScheduleException.start_date.desc())

        result = await self.db.execute(query)
        return result.scalars().all()

    # ============================================
    # EXECUTION CALCULATION
    # ============================================

    async def calculate_next_execution(
        self, schedule: FlowAutomationSchedule
    ) -> datetime:
        """
        Calculate next execution datetime based on schedule config

        Returns:
            Datetime of next execution
        """
        recurrence_type = schedule.recurrence_type
        config = schedule.recurrence_config or {}

        if recurrence_type == "once":
            # Single execution at scheduled time
            return datetime.combine(
                schedule.start_date.date(),
                schedule.start_time,
            ).replace(tzinfo=schedule.start_date.tzinfo)

        elif recurrence_type == "daily":
            # Daily at start_time
            next_exec = datetime.combine(
                (schedule.last_executed_at or schedule.start_date).date() + timedelta(days=1),
                schedule.start_time,
            )
            return self._apply_execution_window(next_exec, schedule)

        elif recurrence_type == "weekly":
            # Specific days of week
            days = config.get("days", [])  # ["MON", "WED", "FRI"]
            interval = config.get("interval", 1)
            next_exec = self._next_weekly_execution(schedule, days, interval)
            return self._apply_execution_window(next_exec, schedule)

        elif recurrence_type == "monthly":
            # Specific day of month
            day = config.get("day", 1)
            interval = config.get("interval", 1)
            next_exec = self._next_monthly_execution(schedule, day, interval)
            return self._apply_execution_window(next_exec, schedule)

        elif recurrence_type == "cron":
            # Cron expression
            expression = config.get("expression")
            if not expression:
                raise BadRequestException("Cron recurrence requires 'expression' in config")

            try:
                from croniter import croniter
                cron = croniter(expression, (schedule.last_executed_at or datetime.utcnow()))
                next_exec = cron.get_next(datetime)
                return self._apply_execution_window(next_exec, schedule)
            except ImportError:
                raise BadRequestException("Cron support not available. Install 'croniter'")

        elif recurrence_type == "custom":
            # Custom list of dates
            dates = config.get("dates", [])
            if not dates:
                raise BadRequestException("Custom recurrence requires 'dates' in config")

            # Return earliest future date
            now = datetime.utcnow()
            future_dates = [
                datetime.fromisoformat(d) for d in dates if datetime.fromisoformat(d) > now
            ]

            if not future_dates:
                raise BadRequestException("No future dates in custom recurrence")

            next_exec = min(future_dates)
            return self._apply_execution_window(next_exec, schedule)

        else:
            raise BadRequestException(f"Unknown recurrence type: {recurrence_type}")

    def _next_weekly_execution(
        self, schedule: FlowAutomationSchedule, days: List[str], interval: int
    ) -> datetime:
        """Calculate next weekly execution"""
        day_map = {"MON": 0, "TUE": 1, "WED": 2, "THU": 3, "FRI": 4, "SAT": 5, "SUN": 6}
        target_days = [day_map[d] for d in days if d in day_map]

        if not target_days:
            raise BadRequestException("Invalid days in weekly recurrence")

        base_date = (schedule.last_executed_at or schedule.start_date).date()
        current_date = base_date + timedelta(days=1)

        # Find next occurrence
        for _ in range(7 * interval):  # Look ahead up to 7*interval days
            if current_date.weekday() in target_days:
                return datetime.combine(current_date, schedule.start_time)
            current_date += timedelta(days=1)

        raise BadRequestException("Could not calculate next weekly execution")

    def _next_monthly_execution(
        self, schedule: FlowAutomationSchedule, day: int, interval: int
    ) -> datetime:
        """Calculate next monthly execution"""
        base_date = (schedule.last_executed_at or schedule.start_date).date()
        current_month_start = base_date.replace(day=1)

        # Try current month first
        try:
            next_date = current_month_start.replace(day=day)
            if next_date > base_date:
                return datetime.combine(next_date, schedule.start_time)
        except ValueError:
            # Day doesn't exist in this month (e.g., Feb 30)
            pass

        # Try next month
        next_month_start = current_month_start + timedelta(days=32)
        next_month_start = next_month_start.replace(day=1)

        try:
            next_date = next_month_start.replace(day=day)
            return datetime.combine(next_date, schedule.start_time)
        except ValueError:
            # Day doesn't exist, try last day of month
            next_month_start = next_month_start + timedelta(days=32)
            next_month_start = next_month_start.replace(day=1)
            last_day = (next_month_start - timedelta(days=1)).day
            next_date = next_month_start.replace(day=last_day)
            return datetime.combine(next_date, schedule.start_time)

    def _apply_execution_window(
        self, dt: datetime, schedule: FlowAutomationSchedule
    ) -> datetime:
        """
        Apply execution window (horário comercial) to datetime

        If outside window, move to next occurrence within window.
        """
        if not schedule.execution_window_start or not schedule.execution_window_end:
            return dt

        current_time = dt.time()
        start = schedule.execution_window_start
        end = schedule.execution_window_end

        if start <= current_time <= end:
            # Already within window
            return dt

        # Move to start of next window
        if current_time < start:
            # Before window, set to window start same day
            return dt.replace(
                hour=start.hour,
                minute=start.minute,
                second=start.second,
                microsecond=0,
            )
        else:
            # After window, set to window start next day
            next_day = dt + timedelta(days=1)
            return next_day.replace(
                hour=start.hour,
                minute=start.minute,
                second=start.second,
                microsecond=0,
            )

    # ============================================
    # SCHEDULE PREVIEW (For UI Calendar)
    # ============================================

    async def get_schedule_preview(
        self,
        schedule_id: UUID,
        organization_id: UUID,
        num_executions: int = 10,
        days_ahead: int = 90,
    ) -> SchedulePreview:
        """
        Get preview of next N executions for UI calendar

        Args:
            schedule_id: Schedule UUID
            organization_id: Organization UUID
            num_executions: How many next executions to calculate
            days_ahead: Maximum days to look ahead

        Returns:
            SchedulePreview with next execution datetimes
        """
        schedule = await self.get_schedule(schedule_id, organization_id)
        if not schedule:
            raise NotFoundException("Schedule not found")

        # Get exceptions
        exceptions_list = await self.list_exceptions(schedule_id, organization_id)

        next_executions = []
        current_dt = schedule.last_executed_at or schedule.start_date
        deadline = datetime.utcnow() + timedelta(days=days_ahead)

        for _ in range(num_executions):
            try:
                next_dt = await self.calculate_next_execution(schedule)

                # Check if within days_ahead
                if next_dt > deadline:
                    break

                # Check if excepted
                if self._is_excepted(next_dt, exceptions_list):
                    continue

                # Check if within execution window
                if not self._is_within_execution_window(next_dt, schedule):
                    continue

                # Check blackout dates and holidays
                if self._is_blackout_date(next_dt, schedule):
                    continue

                if schedule.skip_weekends and next_dt.weekday() >= 5:  # 5=SAT, 6=SUN
                    continue

                if schedule.skip_holidays and await self._is_holiday(next_dt, schedule.organization_id):
                    continue

                next_executions.append(
                    NextExecutionInfo(
                        scheduled_at=next_dt,
                        recurrence_type=schedule.recurrence_type,
                        execution_window={
                            "start": schedule.execution_window_start.isoformat() if schedule.execution_window_start else None,
                            "end": schedule.execution_window_end.isoformat() if schedule.execution_window_end else None,
                        },
                        timezone=schedule.execution_timezone,
                    )
                )

                # Update schedule for next iteration
                schedule.last_executed_at = next_dt

            except Exception as e:
                logger.warning(f"Could not calculate execution: {str(e)}")
                break

        return SchedulePreview(
            automation_id=schedule.automation_id,
            schedule_id=schedule_id,
            next_executions=next_executions,
        )

    # ============================================
    # HELPER METHODS
    # ============================================

    def _validate_recurrence_config(self, recurrence_type: str, config: dict) -> None:
        """Validate recurrence config based on type"""
        if recurrence_type == "daily":
            # interval required
            if "interval" not in config or config["interval"] < 1:
                raise BadRequestException("Daily recurrence requires positive 'interval'")

        elif recurrence_type == "weekly":
            if "days" not in config or not config["days"]:
                raise BadRequestException("Weekly recurrence requires 'days' list")

        elif recurrence_type == "monthly":
            if "day" not in config or not (1 <= config["day"] <= 31):
                raise BadRequestException("Monthly recurrence requires 'day' (1-31)")

        elif recurrence_type == "cron":
            if "expression" not in config or not config["expression"]:
                raise BadRequestException("Cron recurrence requires 'expression'")

        elif recurrence_type == "custom":
            if "dates" not in config or not config["dates"]:
                raise BadRequestException("Custom recurrence requires 'dates' list")

    def _is_excepted(
        self, dt: datetime, exceptions: List[FlowAutomationScheduleException]
    ) -> bool:
        """Check if datetime is in any exception"""
        dt_date = dt.date()

        for exc in exceptions:
            exc_start = exc.start_date.date()
            exc_end = exc.end_date.date() if exc.end_date else exc_start

            if exc_start <= dt_date <= exc_end:
                if exc.exception_type == "skip":
                    return True
                elif exc.exception_type == "reschedule":
                    # TODO: Handle reschedule
                    return True

        return False

    def _is_within_execution_window(
        self, dt: datetime, schedule: FlowAutomationSchedule
    ) -> bool:
        """Check if datetime is within execution window"""
        if not schedule.execution_window_start or not schedule.execution_window_end:
            return True

        current_time = dt.time()
        start = schedule.execution_window_start
        end = schedule.execution_window_end

        return start <= current_time <= end

    def _is_blackout_date(self, dt: datetime, schedule: FlowAutomationSchedule) -> bool:
        """Check if date is in blackout dates"""
        dt_str = dt.strftime("%Y-%m-%d")
        return dt_str in (schedule.blackout_dates or [])

    async def _is_holiday(self, dt: datetime, organization_id: UUID) -> bool:
        """
        Check if date is a holiday

        TODO: Integrate with holiday API or database
        For now, return False
        """
        # TODO: Implement holiday checking
        return False

    async def _get_automation(
        self, automation_id: UUID, organization_id: UUID
    ) -> Optional[FlowAutomation]:
        """Get automation by ID and validate ownership"""
        query = select(FlowAutomation).where(
            and_(
                FlowAutomation.id == automation_id,
                FlowAutomation.organization_id == organization_id,
                FlowAutomation.deleted_at.is_(None),
            )
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
