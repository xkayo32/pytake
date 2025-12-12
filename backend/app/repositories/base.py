"""
Base repository with common CRUD operations
"""

from typing import Any, Dict, Generic, List, Optional, Type, TypeVar, Union
from uuid import UUID

from sqlalchemy import select, update, delete, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.base import Base

ModelType = TypeVar("ModelType", bound=Base)


class BaseRepository(Generic[ModelType]):
    """Base repository with common database operations"""

    def __init__(self, model: Type[ModelType], db: AsyncSession):
        """
        Initialize repository
        Args:
            model: SQLAlchemy model class
            db: Async database session
        """
        self.model = model
        self.db = db

    async def get(self, id: UUID) -> Optional[ModelType]:
        """
        Get a record by ID
        Args:
            id: Record UUID
        Returns:
            Model instance or None
        """
        result = await self.db.execute(select(self.model).where(self.model.id == id))
        return result.scalar_one_or_none()

    async def get_by_field(
        self, field_name: str, field_value: Any
    ) -> Optional[ModelType]:
        """
        Get a record by a specific field
        Args:
            field_name: Field name
            field_value: Field value
        Returns:
            Model instance or None
        """
        field = getattr(self.model, field_name)
        result = await self.db.execute(select(self.model).where(field == field_value))
        return result.scalar_one_or_none()

    async def get_multi(
        self,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[Dict[str, Any]] = None,
        order_by: Optional[str] = None,
    ) -> List[ModelType]:
        """
        Get multiple records with pagination
        Args:
            skip: Number of records to skip
            limit: Maximum number of records to return
            filters: Dictionary of field:value filters
            order_by: Field to order by (prefix with - for descending)
        Returns:
            List of model instances
        """
        query = select(self.model)

        # Apply filters
        if filters:
            for field_name, field_value in filters.items():
                if hasattr(self.model, field_name):
                    field = getattr(self.model, field_name)
                    query = query.where(field == field_value)

        # Apply ordering
        if order_by:
            if order_by.startswith("-"):
                field_name = order_by[1:]
                if hasattr(self.model, field_name):
                    query = query.order_by(getattr(self.model, field_name).desc())
            else:
                if hasattr(self.model, order_by):
                    query = query.order_by(getattr(self.model, order_by))

        # Apply pagination
        query = query.offset(skip).limit(limit)

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def count(self, filters: Optional[Dict[str, Any]] = None) -> int:
        """
        Count records with optional filters
        Args:
            filters: Dictionary of field:value filters
        Returns:
            Number of records
        """
        query = select(func.count()).select_from(self.model)

        # Apply filters
        if filters:
            for field_name, field_value in filters.items():
                if hasattr(self.model, field_name):
                    field = getattr(self.model, field_name)
                    query = query.where(field == field_value)

        result = await self.db.execute(query)
        return result.scalar_one()

    async def create(self, obj_in: Dict[str, Any]) -> ModelType:
        """
        Create a new record
        Args:
            obj_in: Dictionary with field values
        Returns:
            Created model instance
        """
        db_obj = self.model(**obj_in)
        self.db.add(db_obj)
        await self.db.commit()
        await self.db.refresh(db_obj)
        return db_obj

    async def update(
        self, id: UUID, obj_in: Union[Dict[str, Any], ModelType]
    ) -> Optional[ModelType]:
        """
        Update a record
        Args:
            id: Record UUID
            obj_in: Dictionary with updated field values or model instance
        Returns:
            Updated model instance or None
        """
        # Convert model to dict if needed
        if not isinstance(obj_in, dict):
            obj_in = {
                key: value
                for key, value in obj_in.__dict__.items()
                if not key.startswith("_")
            }

        # Note: We DON'T remove None values here because when using
        # model_dump(exclude_unset=True), fields are only included if
        # explicitly set. If a field has None value, it means we want
        # to explicitly set it to NULL in the database.

        if not obj_in:
            return await self.get(id)

        await self.db.execute(
            update(self.model).where(self.model.id == id).values(**obj_in)
        )
        await self.db.commit()
        
        # Expire all objects from session cache to ensure fresh reads from DB
        await self.db.expire_all()

        return await self.get(id)

    async def delete(self, id: UUID) -> bool:
        """
        Delete a record (hard delete)
        Args:
            id: Record UUID
        Returns:
            True if deleted, False if not found
        """
        result = await self.db.execute(
            delete(self.model).where(self.model.id == id)
        )
        await self.db.commit()
        return result.rowcount > 0

    async def soft_delete(self, id: UUID) -> Optional[ModelType]:
        """
        Soft delete a record (set deleted_at timestamp)
        Args:
            id: Record UUID
        Returns:
            Updated model instance or None
        """
        from datetime import datetime

        if not hasattr(self.model, "deleted_at"):
            raise AttributeError(
                f"Model {self.model.__name__} does not support soft delete"
            )

        await self.db.execute(
            update(self.model)
            .where(self.model.id == id)
            .values(deleted_at=datetime.utcnow())
        )
        await self.db.commit()

        return await self.get(id)

    async def restore(self, id: UUID) -> Optional[ModelType]:
        """
        Restore a soft-deleted record
        Args:
            id: Record UUID
        Returns:
            Restored model instance or None
        """
        if not hasattr(self.model, "deleted_at"):
            raise AttributeError(
                f"Model {self.model.__name__} does not support soft delete"
            )

        await self.db.execute(
            update(self.model).where(self.model.id == id).values(deleted_at=None)
        )
        await self.db.commit()

        return await self.get(id)

    async def get_by_organization(
        self, organization_id: UUID, skip: int = 0, limit: int = 100
    ) -> List[ModelType]:
        """
        Get records by organization (multi-tenancy)
        Args:
            organization_id: Organization UUID
            skip: Number of records to skip
            limit: Maximum number of records to return
        Returns:
            List of model instances
        """
        if not hasattr(self.model, "organization_id"):
            raise AttributeError(
                f"Model {self.model.__name__} does not have organization_id field"
            )

        result = await self.db.execute(
            select(self.model)
            .where(self.model.organization_id == organization_id)
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def exists(self, id: UUID) -> bool:
        """
        Check if a record exists
        Args:
            id: Record UUID
        Returns:
            True if exists, False otherwise
        """
        result = await self.db.execute(
            select(func.count()).select_from(self.model).where(self.model.id == id)
        )
        count = result.scalar_one()
        return count > 0
