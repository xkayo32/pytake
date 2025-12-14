"""
Pytest configuration and shared fixtures for tests
"""

import pytest
import asyncio
import os
from uuid import uuid4
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy import text

from app.models.base import Base


@pytest.fixture(scope="session")
def event_loop():
    """Create an event loop for async tests."""
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
async def engine():
    """Create database engine connected to running PostgreSQL container."""
    # PostgreSQL connection params
    db_host = os.getenv("DB_HOST", "localhost")
    db_port = int(os.getenv("DB_PORT", "5435"))
    db_user = os.getenv("DB_USER", "pytake_user")
    db_password = os.getenv("DB_PASSWORD", "Odc7/ffNnTnG4hkbwV+Sx2ZgK61rXW2r9U2o7Rd25DU=")
    db_name = os.getenv("DB_NAME", "pytake")  # Use existing pytake database
    
    # Connect to existing test database
    database_url = f"postgresql+asyncpg://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"
    
    engine = create_async_engine(
        database_url,
        echo=False,
        future=True,
    )
    
    yield engine
    
    await engine.dispose()


@pytest.fixture
async def db_session(engine):
    """Provide a database session for tests."""
    async_session = async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
    
    async with async_session() as session:
        # Start transaction for isolation
        await session.begin_nested()
        yield session
        # Rollback after each test
        await session.rollback()


# Aliases for compatibility
@pytest.fixture
async def session(db_session):
    """Provide a database session for tests."""
    return db_session


@pytest.fixture
def org_id():
    """Provide an organization ID for tests."""
    return uuid4()


@pytest.fixture
def user_id():
    """Provide a user ID for tests."""
    return uuid4()


@pytest.fixture
def user1_id():
    """Provide first user ID for tests."""
    return uuid4()


@pytest.fixture
def user2_id():
    """Provide second user ID for tests."""
    return uuid4()


@pytest.fixture
async def user(session: AsyncSession, org_id):
    """Create a test user."""
    from app.models import User

    user = User(
        id=uuid4(),
        email="test@example.com",
        password_hash="test_hash",
    )
    session.add(user)
    await session.commit()
    return user
