"""
Async SQLAlchemy engine and session factory — SQLite / aiosqlite backend.

Important SQLite notes:
  • pool_size and max_overflow are not valid for StaticPool / NullPool.
  • We use check_same_thread=False so the single connection can be shared
    across async coroutines (aiosqlite handles thread-safety internally).
  • Foreign key enforcement is OFF by default in SQLite; we enable it via
    an event listener that runs PRAGMA foreign_keys = ON after each connect.
  • WAL journal mode gives better concurrent read performance.
"""
from typing import AsyncGenerator

from sqlalchemy import event, text
from sqlalchemy.ext.asyncio import (
    AsyncConnection,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    connect_args={"check_same_thread": False},
)


@event.listens_for(engine.sync_engine, "connect")
def _set_sqlite_pragmas(dbapi_connection, _connection_record):
    """Enable foreign keys and WAL mode for every new SQLite connection."""
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys = ON")
    cursor.execute("PRAGMA journal_mode = WAL")
    cursor.close()


AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that yields a database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
