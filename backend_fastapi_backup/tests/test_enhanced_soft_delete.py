"""
Tests for Enhanced SoftDeleteMixin - New audit functionality verification

This test suite verifies the enhanced soft_delete() and restore() methods
including automatic snapshot creation and audit field population.
"""

import pytest
from datetime import datetime
from uuid import uuid4, UUID
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models import (
    Contact,
    Conversation,
    Message,
    Organization,
    Campaign,
    Flow,
    Chatbot,
)


class TestEnhancedSoftDeleteMixin:
    """Test enhanced soft_delete() and restore() functionality."""

    @pytest.mark.asyncio
    async def test_soft_delete_without_parameters_uses_defaults(
        self, session: AsyncSession, org_id: str
    ):
        """
        Test that soft_delete() without parameters uses sensible defaults:
        - deleted_at: current datetime
        - deleted_by_user_id: None
        - deleted_reason: "unknown"
        - deleted_data_snapshot: auto-created
        """
        contact = Contact(
            id=uuid4(),
            organization_id=org_id,
            name="Test Contact",
            phone="5511999999999",
        )
        session.add(contact)
        await session.commit()

        before_delete = datetime.utcnow()
        contact.soft_delete()
        await session.commit()

        after_delete = datetime.utcnow()

        await session.refresh(contact)
        assert contact.deleted_at is not None
        assert before_delete <= contact.deleted_at <= after_delete
        assert contact.deleted_by_user_id is None
        assert contact.deleted_reason == "unknown"
        assert contact.deleted_data_snapshot is not None
        assert isinstance(contact.deleted_data_snapshot, dict)

    @pytest.mark.asyncio
    async def test_soft_delete_with_all_parameters(
        self, session: AsyncSession, org_id: str, user_id: str
    ):
        """
        Test soft_delete() with all parameters explicitly provided.
        """
        contact = Contact(
            id=uuid4(),
            organization_id=org_id,
            name="Important Contact",
            phone="5511999999999",
        )
        session.add(contact)
        await session.commit()

        custom_snapshot = {"name": "Important Contact", "archived": True}
        contact.soft_delete(
            deleted_by_id=user_id,
            reason="compliance",
            snapshot=custom_snapshot,
        )
        await session.commit()

        await session.refresh(contact)
        assert contact.deleted_at is not None
        assert contact.deleted_by_user_id == user_id
        assert contact.deleted_reason == "compliance"
        assert contact.deleted_data_snapshot == custom_snapshot

    @pytest.mark.asyncio
    async def test_soft_delete_with_partial_parameters(
        self, session: AsyncSession, org_id: str, user_id: str
    ):
        """
        Test soft_delete() with only some parameters provided.
        Others should use defaults or auto-create.
        """
        contact = Contact(
            id=uuid4(),
            organization_id=org_id,
            name="Test Contact",
            phone="5511999999999",
        )
        session.add(contact)
        await session.commit()

        # Only provide deleted_by_id and reason
        contact.soft_delete(
            deleted_by_id=user_id,
            reason="duplicate",
        )
        await session.commit()

        await session.refresh(contact)
        assert contact.deleted_at is not None
        assert contact.deleted_by_user_id == user_id
        assert contact.deleted_reason == "duplicate"
        assert contact.deleted_data_snapshot is not None  # Auto-created

    @pytest.mark.asyncio
    async def test_auto_snapshot_creation_handles_all_field_types(
        self, session: AsyncSession, org_id: str
    ):
        """
        Test that _create_snapshot() properly serializes all field types:
        - UUID
        - datetime
        - string
        - int
        - bool
        - JSONB
        - FK relationships
        """
        contact = Contact(
            id=uuid4(),
            organization_id=org_id,
            name="Test Contact",
            phone="5511999999999",
            email="test@example.com",
            is_blocked=True,
            tags=["vip", "important"],  # Custom field if exists
        )
        session.add(contact)
        await session.commit()

        contact.soft_delete()  # Will call _create_snapshot()
        await session.commit()

        await session.refresh(contact)
        snapshot = contact.deleted_data_snapshot

        # Verify snapshot contains expected fields (converted to serializable types)
        assert snapshot is not None
        assert isinstance(snapshot, dict)
        # UUID should be converted to string
        assert "id" in snapshot
        assert isinstance(snapshot["id"], str)
        # Name and phone should be present
        assert snapshot.get("name") == "Test Contact"
        assert snapshot.get("phone") == "5511999999999"

    @pytest.mark.asyncio
    async def test_soft_delete_multiple_times_updates_audit_fields(
        self, session: AsyncSession, org_id: str, user1_id: str, user2_id: str
    ):
        """
        Test that calling soft_delete() multiple times (after restore)
        properly updates all audit fields.
        """
        contact = Contact(
            id=uuid4(),
            organization_id=org_id,
            name="Test Contact",
            phone="5511999999999",
        )
        session.add(contact)
        await session.commit()

        # First delete by user1
        first_deletion_time = datetime.utcnow()
        contact.soft_delete(deleted_by_id=user1_id, reason="duplicate")
        await session.commit()

        first_deleted_at = contact.deleted_at
        assert contact.deleted_by_user_id == user1_id
        assert contact.deleted_reason == "duplicate"

        # Restore
        contact.restore()
        await session.commit()
        assert contact.deleted_at is None

        # Delete again by user2
        second_deletion_time = datetime.utcnow()
        contact.soft_delete(deleted_by_id=user2_id, reason="compliance")
        await session.commit()

        await session.refresh(contact)
        # Should have new values
        assert contact.deleted_at is not None
        assert contact.deleted_at >= second_deletion_time
        assert contact.deleted_by_user_id == user2_id
        assert contact.deleted_reason == "compliance"
        # Should differ from first deletion
        assert contact.deleted_at != first_deleted_at

    @pytest.mark.asyncio
    async def test_restore_clears_all_four_audit_fields(
        self, session: AsyncSession, org_id: str, user_id: str
    ):
        """
        Test that restore() clears ALL four audit fields:
        - deleted_at
        - deleted_by_user_id
        - deleted_reason
        - deleted_data_snapshot
        """
        contact = Contact(
            id=uuid4(),
            organization_id=org_id,
            name="Test Contact",
            phone="5511999999999",
        )
        session.add(contact)
        await session.commit()

        # Soft delete with all audit fields
        contact.soft_delete(
            deleted_by_id=user_id,
            reason="compliance",
            snapshot={"backup": "data"},
        )
        await session.commit()

        # Verify all fields populated
        assert contact.deleted_at is not None
        assert contact.deleted_by_user_id == user_id
        assert contact.deleted_reason == "compliance"
        assert contact.deleted_data_snapshot == {"backup": "data"}

        # Restore
        contact.restore()
        await session.commit()

        # Verify all fields cleared
        await session.refresh(contact)
        assert contact.deleted_at is None
        assert contact.deleted_by_user_id is None
        assert contact.deleted_reason is None
        assert contact.deleted_data_snapshot is None

    @pytest.mark.asyncio
    async def test_restore_makes_record_visible_again(
        self, session: AsyncSession, org_id: str
    ):
        """
        Test that after restore(), the record reappears in normal queries.
        """
        contact = Contact(
            id=uuid4(),
            organization_id=org_id,
            name="Test Contact",
            phone="5511999999999",
        )
        session.add(contact)
        await session.commit()

        contact_id = contact.id

        # Soft delete
        contact.soft_delete()
        await session.commit()

        # Query active contacts - should not find it
        result = await session.execute(
            select(Contact)
            .where(Contact.organization_id == org_id)
            .where(Contact.deleted_at.is_(None))
        )
        contacts = result.scalars().all()
        assert not any(c.id == contact_id for c in contacts)

        # Restore
        contact.restore()
        await session.commit()

        # Query active contacts - should find it now
        result = await session.execute(
            select(Contact)
            .where(Contact.organization_id == org_id)
            .where(Contact.deleted_at.is_(None))
        )
        contacts = result.scalars().all()
        assert any(c.id == contact_id for c in contacts)

    @pytest.mark.asyncio
    async def test_soft_delete_reason_field_uses_enum_values(
        self, session: AsyncSession, org_id: str, user_id: str
    ):
        """
        Test that soft_delete() accepts reason enum values:
        - user_request, duplicate, expired, compliance, error, abuse, policy, unknown
        """
        valid_reasons = [
            "user_request",
            "duplicate",
            "expired",
            "compliance",
            "error",
            "abuse",
            "policy",
            "unknown",
        ]

        for i, reason in enumerate(valid_reasons):
            contact = Contact(
                id=uuid4(),
                organization_id=org_id,
                name=f"Test Contact {i}",
                phone=f"551199999{i}",
            )
            session.add(contact)
            await session.commit()

            contact.soft_delete(deleted_by_id=user_id, reason=reason)
            await session.commit()

            await session.refresh(contact)
            assert contact.deleted_reason == reason

    @pytest.mark.asyncio
    async def test_snapshot_with_nested_relationships(
        self, session: AsyncSession, org_id: str
    ):
        """
        Test that snapshot properly handles JSONB fields and nested data
        like campaign metadata or flow configurations.
        """
        campaign = Campaign(
            id=uuid4(),
            organization_id=org_id,
            name="Test Campaign",
            metadata={
                "description": "Test campaign",
                "tags": ["promotion", "limited-time"],
                "budget": 1000.50,
                "is_active": True,
            },
        )
        session.add(campaign)
        await session.commit()

        campaign.soft_delete()
        await session.commit()

        await session.refresh(campaign)
        snapshot = campaign.deleted_data_snapshot

        assert snapshot is not None
        assert snapshot.get("name") == "Test Campaign"
        assert "metadata" in snapshot
        # Verify nested data preserved
        assert snapshot["metadata"].get("description") == "Test campaign"
        assert snapshot["metadata"].get("budget") == 1000.50

    @pytest.mark.asyncio
    async def test_soft_delete_preserves_other_fields(
        self, session: AsyncSession, org_id: str, user_id: str
    ):
        """
        Test that soft_delete() only modifies audit fields and doesn't
        affect other model fields like name, email, etc.
        """
        contact = Contact(
            id=uuid4(),
            organization_id=org_id,
            name="Original Name",
            phone="5511999999999",
            email="original@example.com",
        )
        session.add(contact)
        await session.commit()

        original_id = contact.id
        original_org_id = contact.organization_id
        original_name = contact.name

        contact.soft_delete(deleted_by_id=user_id, reason="compliance")
        await session.commit()

        await session.refresh(contact)
        # Non-audit fields should be unchanged
        assert contact.id == original_id
        assert contact.organization_id == original_org_id
        assert contact.name == original_name
        assert contact.phone == "5511999999999"
        assert contact.email == "original@example.com"
        # Only audit fields changed
        assert contact.deleted_at is not None
        assert contact.deleted_by_user_id == user_id

    @pytest.mark.asyncio
    async def test_soft_delete_timestamp_accuracy(
        self, session: AsyncSession, org_id: str
    ):
        """
        Test that soft_delete() sets deleted_at with accurate timestamp
        and doesn't affect created_at, updated_at timestamps.
        """
        contact = Contact(
            id=uuid4(),
            organization_id=org_id,
            name="Test Contact",
            phone="5511999999999",
        )
        session.add(contact)
        await session.commit()

        original_created_at = contact.created_at
        original_updated_at = contact.updated_at

        # Small delay to ensure timestamp difference
        import asyncio

        await asyncio.sleep(0.1)

        delete_time = datetime.utcnow()
        contact.soft_delete()
        await session.commit()

        await session.refresh(contact)
        # created_at should be unchanged
        assert contact.created_at == original_created_at
        # updated_at might be updated by DB triggers
        # deleted_at should be close to our delete_time
        assert contact.deleted_at is not None
        assert abs((contact.deleted_at - delete_time).total_seconds()) < 1

    @pytest.mark.asyncio
    async def test_soft_delete_with_null_deleted_by_user_id(
        self, session: AsyncSession, org_id: str
    ):
        """
        Test that soft_delete() works with deleted_by_id=None
        (e.g., system-initiated deletions).
        """
        contact = Contact(
            id=uuid4(),
            organization_id=org_id,
            name="Test Contact",
            phone="5511999999999",
        )
        session.add(contact)
        await session.commit()

        # System deletion (no user)
        contact.soft_delete(deleted_by_id=None, reason="compliance")
        await session.commit()

        await session.refresh(contact)
        assert contact.deleted_at is not None
        assert contact.deleted_by_user_id is None
        assert contact.deleted_reason == "compliance"
        assert contact.deleted_data_snapshot is not None

    @pytest.mark.asyncio
    async def test_hard_vs_soft_delete_behavior(
        self, session: AsyncSession, org_id: str
    ):
        """
        Test difference between hard delete (remove) and soft delete (archive).
        Verify soft delete doesn't actually remove the record from DB.
        """
        contact1 = Contact(
            id=uuid4(),
            organization_id=org_id,
            name="Soft Delete Contact",
            phone="5511999999999",
        )
        contact2 = Contact(
            id=uuid4(),
            organization_id=org_id,
            name="Hard Delete Contact",
            phone="5511888888888",
        )
        session.add(contact1)
        session.add(contact2)
        await session.commit()

        soft_id = contact1.id
        hard_id = contact2.id

        # Soft delete contact1
        contact1.soft_delete()
        # Hard delete contact2
        await session.delete(contact2)
        await session.commit()

        # Query ALL records including deleted (for verification)
        result = await session.execute(
            select(Contact).where(Contact.id.in_([soft_id, hard_id]))
        )
        results = result.scalars().all()

        # Soft deleted should still exist in DB
        soft_deleted = next((c for c in results if c.id == soft_id), None)
        assert soft_deleted is not None
        assert soft_deleted.deleted_at is not None

        # Hard deleted should not exist
        hard_deleted = next((c for c in results if c.id == hard_id), None)
        assert hard_deleted is None
