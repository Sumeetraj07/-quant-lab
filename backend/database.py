"""
Database Engine & Session Management
======================================
Provides async SQLAlchemy engine and session factory for FastAPI.

Usage (in FastAPI routes):
    async def my_route(db: AsyncSession = Depends(get_db)):
        result = await db.execute(...)

For Alembic migrations, use the synchronous engine:
    from backend.database import sync_engine
"""

from __future__ import annotations

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from backend.config import settings


# ---------------------------------------------------------------------------
# Async engine (used by FastAPI)
# ---------------------------------------------------------------------------
async_engine = create_async_engine(
    settings.async_database_url,
    echo=settings.debug,           # Log SQL in development
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,            # Detect stale connections
    pool_recycle=3600,             # Recycle connections every hour
)

AsyncSessionFactory = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


# ---------------------------------------------------------------------------
# Base class for all ORM models
# ---------------------------------------------------------------------------
class Base(DeclarativeBase):
    """
    SQLAlchemy declarative base.
    All ORM models in backend/models/ must inherit from this.
    """
    pass


# ---------------------------------------------------------------------------
# FastAPI dependency
# ---------------------------------------------------------------------------
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency that provides a database session per request.

    Each request gets its own session.
    Session is committed on success, rolled back on exception.
    Always closed after the request completes.

    Usage:
        @router.get("/")
        async def handler(db: AsyncSession = Depends(get_db)):
            ...
    """
    async with AsyncSessionFactory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


# ---------------------------------------------------------------------------
# Lifecycle helpers
# ---------------------------------------------------------------------------
async def create_tables() -> None:
    """Create all tables (development / test only — use Alembic in production)."""
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def drop_tables() -> None:
    """Drop all tables (test teardown only — NEVER in production)."""
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


async def close_db() -> None:
    """Dispose the connection pool (called on app shutdown)."""
    await async_engine.dispose()
