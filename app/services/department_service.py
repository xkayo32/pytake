"""
Department Service
Business logic for department/queue management
"""

from typing import List, Optional
from uuid import UUID
import re

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.department import Department
from app.repositories.department import DepartmentRepository
from app.schemas.department import DepartmentCreate, DepartmentUpdate
from app.core.exceptions import ConflictException, NotFoundException, BadRequestException


def generate_slug(name: str) -> str:
    """Generate URL-friendly slug from name"""
    slug = name.lower()
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'[\s]+', '-', slug)
    slug = slug.strip('-')
    return slug


class DepartmentService:
    """Service for department management"""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = DepartmentRepository(db)

    async def get_by_id(self, department_id: UUID, organization_id: UUID) -> Department:
        """Get department by ID"""
        department = await self.repo.get(department_id)
        if not department or department.organization_id != organization_id:
            raise NotFoundException("Department not found")
        return department

    async def get_by_slug(
        self, slug: str, organization_id: UUID
    ) -> Optional[Department]:
        """Get department by slug"""
        return await self.repo.get_by_slug(slug, organization_id)

    async def list_departments(
        self,
        organization_id: UUID,
        is_active: Optional[bool] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Department]:
        """List departments with optional filters"""
        return await self.repo.list_departments(
            organization_id=organization_id,
            is_active=is_active,
            skip=skip,
            limit=limit,
        )

    async def create_department(
        self, data: DepartmentCreate, organization_id: UUID
    ) -> Department:
        """Create new department"""
        # Generate slug if not provided
        slug = data.slug or generate_slug(data.name)

        # Check if slug already exists
        existing = await self.repo.get_by_slug(slug, organization_id)
        if existing:
            raise ConflictException(
                f"Department with slug '{slug}' already exists"
            )

        # Validate routing mode
        valid_routing_modes = ["round_robin", "load_balance", "manual"]
        if data.routing_mode not in valid_routing_modes:
            raise BadRequestException(
                f"Invalid routing mode. Must be one of: {', '.join(valid_routing_modes)}"
            )

        # Validate business hours if provided
        if data.business_hours:
            self._validate_business_hours(data.business_hours)

        # Create department
        department_data = data.model_dump()
        department_data["organization_id"] = organization_id
        department_data["slug"] = slug
        department_data["agent_ids"] = []
        department_data["total_agents"] = 0
        department_data["total_conversations"] = 0
        department_data["active_conversations"] = 0
        department_data["queued_conversations"] = 0
        department_data["settings"] = {}

        department = await self.repo.create(department_data)
        return department

    async def update_department(
        self, department_id: UUID, data: DepartmentUpdate, organization_id: UUID
    ) -> Department:
        """Update department"""
        department = await self.get_by_id(department_id, organization_id)

        # Validate routing mode if provided
        if data.routing_mode:
            valid_routing_modes = ["round_robin", "load_balance", "manual"]
            if data.routing_mode not in valid_routing_modes:
                raise BadRequestException(
                    f"Invalid routing mode. Must be one of: {', '.join(valid_routing_modes)}"
                )

        # Validate business hours if provided
        if data.business_hours is not None:
            self._validate_business_hours(data.business_hours)

        update_data = data.model_dump(exclude_unset=True)
        updated_department = await self.repo.update(department_id, update_data)

        return updated_department

    async def delete_department(
        self, department_id: UUID, organization_id: UUID
    ) -> bool:
        """Soft delete department"""
        department = await self.get_by_id(department_id, organization_id)
        return await self.repo.delete(department_id)

    async def add_agent(
        self, department_id: UUID, agent_id: UUID, organization_id: UUID
    ) -> Department:
        """Add agent to department"""
        department = await self.get_by_id(department_id, organization_id)
        return await self.repo.add_agent(department_id, agent_id)

    async def remove_agent(
        self, department_id: UUID, agent_id: UUID, organization_id: UUID
    ) -> Department:
        """Remove agent from department"""
        department = await self.get_by_id(department_id, organization_id)
        return await self.repo.remove_agent(department_id, agent_id)

    async def update_stats(
        self,
        department_id: UUID,
        organization_id: UUID,
        total_agents: Optional[int] = None,
        active_conversations: Optional[int] = None,
        queued_conversations: Optional[int] = None,
    ) -> Department:
        """Update department statistics"""
        department = await self.get_by_id(department_id, organization_id)
        return await self.repo.update_stats(
            department_id=department_id,
            total_agents=total_agents,
            active_conversations=active_conversations,
            queued_conversations=queued_conversations,
        )

    async def get_organization_stats(self, organization_id: UUID) -> dict:
        """Get organization-wide department statistics"""
        return await self.repo.get_organization_stats(organization_id)

    async def get_active_departments(
        self, organization_id: UUID
    ) -> List[Department]:
        """Get only active departments"""
        return await self.repo.get_active_departments(organization_id)

    def _validate_business_hours(self, business_hours: dict) -> None:
        """Validate business hours format"""
        if not isinstance(business_hours, dict):
            raise BadRequestException("Business hours must be a dictionary")

        valid_days = [
            "monday", "tuesday", "wednesday", "thursday",
            "friday", "saturday", "sunday"
        ]

        for day, config in business_hours.items():
            if day not in valid_days:
                raise BadRequestException(
                    f"Invalid day '{day}'. Must be one of: {', '.join(valid_days)}"
                )

            if not isinstance(config, dict):
                raise BadRequestException(
                    f"Business hours for '{day}' must be a dictionary"
                )

            # Validate required fields
            if "enabled" not in config:
                raise BadRequestException(
                    f"Missing 'enabled' field for '{day}'"
                )

            if config.get("enabled"):
                if "start" not in config or "end" not in config:
                    raise BadRequestException(
                        f"Missing 'start' or 'end' field for '{day}'"
                    )

                # Validate time format (HH:MM)
                time_pattern = re.compile(r'^([01]\d|2[0-3]):([0-5]\d)$')
                if not time_pattern.match(config["start"]):
                    raise BadRequestException(
                        f"Invalid start time format for '{day}'. Use HH:MM format."
                    )
                if not time_pattern.match(config["end"]):
                    raise BadRequestException(
                        f"Invalid end time format for '{day}'. Use HH:MM format."
                    )
