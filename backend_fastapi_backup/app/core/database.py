"""
Database configuration for PostgreSQL using SQLAlchemy 2.0
"""

from typing import AsyncGenerator

from sqlalchemy import create_engine, event
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import NullPool

from app.core.config import settings

# SQLAlchemy Base
Base = declarative_base()

# Sync Engine (for Alembic migrations)
sync_engine = create_engine(
    str(settings.DATABASE_URL),
    pool_pre_ping=True,
    echo=False,  # Disable SQL query logging
)

# Async Engine (for FastAPI)
async_database_url = str(settings.DATABASE_URL).replace(
    "postgresql://", "postgresql+asyncpg://"
)

async_engine = create_async_engine(
    async_database_url,
    pool_pre_ping=True,
    echo=False,  # Disable SQL query logging
    poolclass=NullPool if settings.TESTING else None,
)

# Session Factories
AsyncSessionLocal = async_sessionmaker(
    async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=sync_engine,
)

# Alias for async session factory
async_session = AsyncSessionLocal


# Dependency for FastAPI
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency for getting async database session
    Usage in FastAPI:
        @app.get("/items/")
        async def read_items(db: AsyncSession = Depends(get_db)):
            ...
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


def get_sync_db() -> Session:
    """
    Get sync database session (for scripts, migrations, etc)
    """
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


# Event listeners for connection pool
@event.listens_for(sync_engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    """Set SQLite pragma for foreign keys (if using SQLite for testing)"""
    # This is a no-op for PostgreSQL but useful for SQLite testing
    if hasattr(dbapi_connection, "execute"):
        try:
            dbapi_connection.execute("PRAGMA foreign_keys=ON")
        except Exception:
            pass


async def init_db():
    """Initialize database (create tables)
    
    NOTE: With Alembic migrations enabled, this should NOT be called
    as migrations handle table creation. This is kept for backwards compatibility
    with non-migrated databases only.
    """
    async with async_engine.begin() as conn:
        # await conn.run_sync(Base.metadata.drop_all)  # Use with caution!
        # Migrations now handle table creation, so skip create_all
        # await conn.run_sync(Base.metadata.create_all)
        pass


async def close_db():
    """Close database connections"""
    await async_engine.dispose()
