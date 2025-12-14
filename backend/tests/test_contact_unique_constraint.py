"""
Test for Contact Unique Constraint
Tests that the UNIQUE(organization_id, whatsapp_id) constraint works correctly
"""

import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import uuid4

from app.models.contact import Contact
from app.models.organization import Organization


@pytest.mark.asyncio
async def test_duplicate_contact_same_whatsapp_id_same_org_fails(db: AsyncSession):
    """
    Test that creating two contacts with the same whatsapp_id 
    in the same organization raises an IntegrityError
    """
    # Create organization
    org_id = uuid4()
    org = Organization(id=org_id, name="Test Org", slug="test-org-" + str(uuid4())[:8])
    db.add(org)
    await db.flush()

    # Create first contact
    contact1 = Contact(
        id=uuid4(),
        organization_id=org_id,
        whatsapp_id="5511999999999",
        name="John Doe",
    )
    db.add(contact1)
    await db.flush()

    # Try to create second contact with same whatsapp_id
    contact2 = Contact(
        id=uuid4(),
        organization_id=org_id,
        whatsapp_id="5511999999999",  # Same whatsapp_id
        name="Jane Doe",
    )
    db.add(contact2)

    # Should raise IntegrityError
    with pytest.raises(IntegrityError):
        await db.flush()


@pytest.mark.asyncio
async def test_same_whatsapp_id_different_orgs_succeeds(db: AsyncSession):
    """
    Test that creating contacts with the same whatsapp_id 
    in DIFFERENT organizations is allowed
    """
    # Create two organizations
    org1_id = uuid4()
    org2_id = uuid4()
    
    org1 = Organization(id=org1_id, name="Org 1", slug="org-1-" + str(uuid4())[:8])
    org2 = Organization(id=org2_id, name="Org 2", slug="org-2-" + str(uuid4())[:8])
    
    db.add(org1)
    db.add(org2)
    await db.flush()

    # Create contact in org1
    contact1 = Contact(
        id=uuid4(),
        organization_id=org1_id,
        whatsapp_id="5511999999999",
        name="John Doe",
    )
    db.add(contact1)
    await db.flush()

    # Create contact in org2 with same whatsapp_id
    contact2 = Contact(
        id=uuid4(),
        organization_id=org2_id,
        whatsapp_id="5511999999999",  # Same whatsapp_id but different org
        name="Jane Doe",
    )
    db.add(contact2)

    # Should NOT raise error
    await db.flush()
    
    # Verify both contacts exist
    assert contact1.id != contact2.id
    assert contact1.whatsapp_id == contact2.whatsapp_id
    assert contact1.organization_id != contact2.organization_id


@pytest.mark.asyncio
async def test_different_whatsapp_ids_same_org_succeeds(db: AsyncSession):
    """
    Test that creating multiple contacts with different whatsapp_ids 
    in the same organization is allowed
    """
    # Create organization
    org_id = uuid4()
    org = Organization(id=org_id, name="Test Org", slug="test-org-" + str(uuid4())[:8])
    db.add(org)
    await db.flush()

    # Create multiple contacts with different whatsapp_ids
    contact1 = Contact(
        id=uuid4(),
        organization_id=org_id,
        whatsapp_id="5511999999999",
        name="John Doe",
    )
    db.add(contact1)
    await db.flush()

    contact2 = Contact(
        id=uuid4(),
        organization_id=org_id,
        whatsapp_id="5511988888888",  # Different whatsapp_id
        name="Jane Doe",
    )
    db.add(contact2)

    # Should NOT raise error
    await db.flush()
    
    # Verify both contacts exist
    assert contact1.id != contact2.id
    assert contact1.whatsapp_id != contact2.whatsapp_id
    assert contact1.organization_id == contact2.organization_id
