"""
Tests for SoftDeleteMixin migration - Backward compatibility verification

This test suite ensures that the migration adding audit fields to SoftDeleteMixin
is backward compatible and doesn't break existing functionality.
"""

import pytest
from datetime import datetime
from uuid import uuid4, UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    User,
    Contact,
    Conversation,
    Organization,
    Campaign,
    Flow,
    Chatbot,
    Queue,
    Department,
    Message,
    WhatsAppNumber,
    WhatsAppTemplate,
    Role,
    Tag,
)
from app.repositories.base import BaseRepository


class TestSoftDeleteMixinBackwardCompatibility:
    """Test backward compatibility of soft delete across all models."""

    @pytest.mark.asyncio
    async def test_soft_delete_existing_records_unchanged(
        self, session: AsyncSession, org_id: UUID
    ):
        """
        Test that existing soft-deleted records are unaffected by migration.

        Previously deleted records should still work with null audit fields.
        """
        # Create a contact that was "soft deleted" before migration
        contact = Contact(
            id=uuid4(),
            organization_id=org_id,
            name="Test Contact",
            phone="5511999999999",
            deleted_at=datetime.utcnow(),
            # New fields are NULL for old deletions
            deleted_by_user_id=None,
            deleted_reason=None,
            deleted_data_snapshot=None,
        )
        session.add(contact)
        await session.commit()

        # Query should still work - filter by deleted_at being not null
        result = await session.execute(
            select(Contact).where(Contact.deleted_at.isnot(None))
        )
        deleted_contact = result.scalars().first()

        assert deleted_contact is not None
        assert deleted_contact.deleted_at is not None
        assert deleted_contact.deleted_by_user_id is None  # NULL for old records

    @pytest.mark.asyncio
    async def test_soft_delete_queries_still_filter_deleted_records(
        self, session: AsyncSession, org_id: UUID
    ):
        """
        Test that active record queries still exclude soft-deleted records
        regardless of new audit fields being populated.
        """
        # Create active contact
        active_contact = Contact(
            id=uuid4(),
            organization_id=org_id,
            name="Active Contact",
            phone="5511999999999",
        )
        session.add(active_contact)

        # Create soft-deleted contact with new audit fields
        deleted_contact = Contact(
            id=uuid4(),
            organization_id=org_id,
            name="Deleted Contact",
            phone="5511888888888",
            deleted_at=datetime.utcnow(),
            deleted_by_user_id=uuid4(),
            deleted_reason="user_request",
            deleted_data_snapshot={"name": "Deleted Contact"},
        )
        session.add(deleted_contact)
        await session.commit()

        # Query active contacts (deleted_at is NULL)
        from sqlalchemy import select

        result = await session.execute(
            select(Contact)
            .where(Contact.organization_id == org_id)
            .where(Contact.deleted_at.is_(None))
        )
        contacts = result.scalars().all()

        assert len(contacts) == 1
        assert contacts[0].id == active_contact.id

    @pytest.mark.asyncio
    async def test_soft_delete_restore_clears_all_audit_fields(
        self, session: AsyncSession, org_id: UUID
    ):
        """
        Test that restore() method clears all 4 audit fields (deleted_at,
        deleted_by_user_id, deleted_reason, deleted_data_snapshot).
        """
        contact = Contact(
            id=uuid4(),
            organization_id=org_id,
            name="Test Contact",
            phone="5511999999999",
            deleted_at=datetime.utcnow(),
            deleted_by_user_id=uuid4(),
            deleted_reason="compliance",
            deleted_data_snapshot={"name": "Test Contact"},
        )
        session.add(contact)
        await session.commit()

        # Verify deleted
        assert contact.deleted_at is not None
        assert contact.deleted_by_user_id is not None
        assert contact.deleted_reason is not None

        # Restore
        contact.restore()
        await session.commit()

        # Verify all audit fields cleared
        await session.refresh(contact)
        assert contact.deleted_at is None
        assert contact.deleted_by_user_id is None
        assert contact.deleted_reason is None
        assert contact.deleted_data_snapshot is None

    @pytest.mark.asyncio
    async def test_foreign_key_constraint_on_deleted_by_user_id(
        self, session: AsyncSession, org_id: UUID, user: User
    ):
        """
        Test that deleted_by_user_id foreign key constraint works correctly
        and can handle NULL values.
        """
        contact = Contact(
            id=uuid4(),
            organization_id=org_id,
            name="Test Contact",
            phone="5511999999999",
            deleted_at=datetime.utcnow(),
            deleted_by_user_id=user.id,  # Valid user
            deleted_reason="user_request",
        )
        session.add(contact)
        await session.commit()

        # Reload and verify FK works
        await session.refresh(contact)
        assert contact.deleted_by_user_id == user.id

        # Try with NULL (should work)
        contact.deleted_by_user_id = None
        await session.commit()

        await session.refresh(contact)
        assert contact.deleted_by_user_id is None

    @pytest.mark.asyncio
    async def test_all_soft_delete_models_migration_compatible(
        self, session: AsyncSession, org_id: UUID
    ):
        """
        Test that ALL models using SoftDeleteMixin can have their new
        audit fields populated without errors.
        """
        # Test User (special case - different org handling)
        user = User(
            id=uuid4(),
            email="test@example.com",
            password_hash="hash",
            deleted_at=datetime.utcnow(),
            deleted_by_user_id=None,
            deleted_reason="duplicate",
        )
        session.add(user)

        # Test Organization
        org = Organization(
            id=uuid4(),
            name="Test Org",
            deleted_at=datetime.utcnow(),
            deleted_by_user_id=None,
        )
        session.add(org)

        # Test Campaign
        campaign = Campaign(
            id=uuid4(),
            organization_id=org_id,
            name="Test Campaign",
            deleted_at=datetime.utcnow(),
            deleted_by_user_id=None,
        )
        session.add(campaign)

        # Test Flow
        flow = Flow(
            id=uuid4(),
            organization_id=org_id,
            name="Test Flow",
            initial_node_id=None,
            deleted_at=datetime.utcnow(),
            deleted_by_user_id=None,
        )
        session.add(flow)

        # Test ChatBot
        chatbot = ChatBot(
            id=uuid4(),
            organization_id=org_id,
            name="Test ChatBot",
            deleted_at=datetime.utcnow(),
            deleted_by_user_id=None,
        )
        session.add(chatbot)

        # Test Message
        conversation = Conversation(
            id=uuid4(),
            organization_id=org_id,
            contact_id=uuid4(),
            flow_id=None,
        )
        session.add(conversation)
        await session.flush()

        message = Message(
            id=uuid4(),
            organization_id=org_id,
            conversation_id=conversation.id,
            sender="contact",
            message_type="text",
            text="Test",
            deleted_at=datetime.utcnow(),
            deleted_by_user_id=None,
        )
        session.add(message)

        # Test Queue
        queue = Queue(
            id=uuid4(),
            organization_id=org_id,
            name="Test Queue",
            deleted_at=datetime.utcnow(),
            deleted_by_user_id=None,
        )
        session.add(queue)

        # Test Department
        department = Department(
            id=uuid4(),
            organization_id=org_id,
            name="Test Department",
            deleted_at=datetime.utcnow(),
            deleted_by_user_id=None,
        )
        session.add(department)

        # Test Role
        role = Role(
            id=uuid4(),
            organization_id=org_id,
            name="Test Role",
            deleted_at=datetime.utcnow(),
            deleted_by_user_id=None,
        )
        session.add(role)

        # All commits should succeed
        await session.commit()

    @pytest.mark.asyncio
    async def test_soft_delete_with_missing_new_fields_still_works(
        self, session: AsyncSession, org_id: UUID
    ):
        """
        Test that records with NULL new audit fields still work with
        the improved soft_delete() method.
        """
        contact = Contact(
            id=uuid4(),
            organization_id=org_id,
            name="Test Contact",
            phone="5511999999999",
            deleted_by_user_id=None,  # NULL from before migration
            deleted_reason=None,
            deleted_data_snapshot=None,
        )
        session.add(contact)
        await session.commit()

        # Call improved soft_delete with new parameters
        deleted_by_user_id = uuid4()
        contact.soft_delete(
            deleted_by_id=deleted_by_user_id,
            reason="compliance",
            snapshot={"name": "Test Contact"},
        )
        await session.commit()

        # Verify all fields updated
        await session.refresh(contact)
        assert contact.deleted_at is not None
        assert contact.deleted_by_user_id == deleted_by_user_id
        assert contact.deleted_reason == "compliance"
        assert contact.deleted_data_snapshot == {"name": "Test Contact"}

    @pytest.mark.asyncio
    async def test_relationship_queries_work_with_null_audit_fields(
        self, session: AsyncSession, org_id: UUID, user: User
    ):
        """
        Test that relationship queries still work properly when audit
        fields are NULL.
        """
        contact = Contact(
            id=uuid4(),
            organization_id=org_id,
            name="Test Contact",
            phone="5511999999999",
            deleted_at=datetime.utcnow(),
            deleted_by_user_id=None,  # NULL
            deleted_reason=None,
            deleted_data_snapshot=None,
        )
        session.add(contact)
        await session.commit()

        # Reload with relationship
        result = await session.execute(
            select(Contact).where(Contact.id == contact.id)
        )
        reloaded = result.scalars().first()

        assert reloaded is not None
        assert reloaded.deleted_at is not None
        assert reloaded.deleted_by_user_id is None

    @pytest.mark.asyncio
    async def test_index_queries_on_new_fields(
        self, session: AsyncSession, org_id: UUID, user: User
    ):
        """
        Test that index queries on new audit fields are efficient
        and work as expected.
        """
        # Create multiple contacts with different audit states
        user_id = user.id

        for i in range(5):
            contact = Contact(
                id=uuid4(),
                organization_id=org_id,
                name=f"Contact {i}",
                phone=f"551199999{i}",
                deleted_at=datetime.utcnow(),
                deleted_by_user_id=user_id if i % 2 == 0 else None,
                deleted_reason="user_request" if i % 2 == 0 else None,
            )
            session.add(contact)

        await session.commit()

        # Query by deleted_by_user_id (uses index)
        result = await session.execute(
            select(Contact)
            .where(Contact.organization_id == org_id)
            .where(Contact.deleted_by_user_id == user_id)
        )
        contacts = result.scalars().all()

        assert len(contacts) == 3  # 0, 2, 4

        # Query by deleted_reason (uses index)
        result = await session.execute(
            select(Contact)
            .where(Contact.deleted_reason == "user_request")
            .where(Contact.deleted_by_user_id.isnot(None))
        )
        contacts = result.scalars().all()

        assert len(contacts) == 3
