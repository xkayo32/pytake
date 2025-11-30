"""
Pytest Configuration and Fixtures

Autor: Kayo Carvalho Fernandes
"""

import asyncio
from datetime import datetime, timedelta
from typing import AsyncGenerator, Generator
from uuid import uuid4

import pytest
import pytest_asyncio
from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.core.security import hash_password
from app.models.base import Base
from app.models.organization import Organization
from app.models.user import User


# ==================== Event Loop ====================

@pytest.fixture(scope="session")
def event_loop() -> Generator:
    """Create event loop for entire test session"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


# ==================== Database ====================

# Use SQLite for tests (in-memory)
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

@pytest_asyncio.fixture(scope="function")
async def db_engine():
    """Create async test database engine"""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        echo=False,
    )
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    yield engine
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    
    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def db_session(db_engine) -> AsyncGenerator[AsyncSession, None]:
    """Create async database session for each test"""
    async_session_maker = async_sessionmaker(
        db_engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False,
    )
    
    async with async_session_maker() as session:
        yield session
        await session.rollback()


# ==================== Factories ====================

class OrganizationFactory:
    """Factory for creating Organization test data"""
    
    counter = 0
    
    @classmethod
    def create(cls, **kwargs) -> dict:
        cls.counter += 1
        defaults = {
            "id": uuid4(),
            "name": f"Test Organization {cls.counter}",
            "slug": f"test-org-{cls.counter}",
            "plan_type": "free",
            "is_active": True,
            "is_trial": True,
            "trial_ends_at": datetime.utcnow() + timedelta(days=14),
            "settings": {},
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }
        defaults.update(kwargs)
        return defaults
    
    @classmethod
    async def create_in_db(cls, db: AsyncSession, **kwargs) -> Organization:
        data = cls.create(**kwargs)
        org = Organization(**data)
        db.add(org)
        await db.commit()
        await db.refresh(org)
        return org


class UserFactory:
    """Factory for creating User test data"""
    
    counter = 0
    
    @classmethod
    def create(cls, organization_id=None, **kwargs) -> dict:
        cls.counter += 1
        defaults = {
            "id": uuid4(),
            "organization_id": organization_id or uuid4(),
            "email": f"user{cls.counter}@test.com",
            "password_hash": hash_password("TestPass123!"),
            "full_name": f"Test User {cls.counter}",
            "role": "agent",
            "is_active": True,
            "email_verified": True,
            "is_online": False,
            "failed_login_attempts": 0,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }
        defaults.update(kwargs)
        return defaults
    
    @classmethod
    async def create_in_db(cls, db: AsyncSession, **kwargs) -> User:
        data = cls.create(**kwargs)
        user = User(**data)
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user


# ==================== Common Fixtures ====================

@pytest_asyncio.fixture
async def test_org(db_session: AsyncSession) -> Organization:
    """Create a test organization"""
    return await OrganizationFactory.create_in_db(db_session)


@pytest_asyncio.fixture
async def test_user(db_session: AsyncSession, test_org: Organization) -> User:
    """Create a test user with organization"""
    return await UserFactory.create_in_db(
        db_session,
        organization_id=test_org.id,
        role="agent"
    )


@pytest_asyncio.fixture
async def test_admin(db_session: AsyncSession, test_org: Organization) -> User:
    """Create a test admin user"""
    return await UserFactory.create_in_db(
        db_session,
        organization_id=test_org.id,
        role="org_admin",
        email="admin@test.com"
    )


# ==================== Auth Fixtures ====================

@pytest.fixture
def valid_password() -> str:
    return "SecurePass123!"


@pytest.fixture
def weak_password() -> str:
    return "123"


@pytest.fixture
def valid_email() -> str:
    return "newuser@test.com"


@pytest.fixture
def invalid_email() -> str:
    return "not-an-email"
