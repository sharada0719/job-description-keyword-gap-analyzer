"""
Async SQLAlchemy engine and session factory.

Supports both SQLite (via aiosqlite, for local development) and PostgreSQL
(via asyncpg, for production).  The database backend is determined by the
DATABASE_URL setting — when it starts with "postgresql", PostgreSQL-specific
connection pooling is used; otherwise SQLite defaults apply.

SQLite-specific notes:
  • pool_size and max_overflow are not valid for StaticPool / NullPool.
  • check_same_thread=False allows the single connection to be shared across
    async coroutines (aiosqlite handles thread-safety internally).
  • Foreign key enforcement is OFF by default; enabled via event listener.
  • WAL journal mode gives better concurrent read performance.

PostgreSQL-specific notes:
  • Standard connection pooling applies (pool_size, max_overflow).
  • Foreign keys are enforced by default.
  • No PRAGMA or check_same_thread needed.
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

# Determine database backend
_is_sqlite = settings.ASYNC_DATABASE_URL.startswith("sqlite")
_is_postgres = settings.ASYNC_DATABASE_URL.startswith("postgresql")

# ── Engine ────────────────────────────────────────────────────────────────────
_engine_kwargs: dict = {
    "echo": settings.DEBUG,
}

if _is_sqlite:
    _engine_kwargs["connect_args"] = {"check_same_thread": False}
# PostgreSQL: no special connect_args needed; asyncpg handles pooling natively

engine = create_async_engine(settings.ASYNC_DATABASE_URL, **_engine_kwargs)


# ── SQLite-only PRAGMA event listeners ────────────────────────────────────────
if _is_sqlite:
    @event.listens_for(engine.sync_engine, "connect")
    def _set_sqlite_pragmas(dbapi_connection, _connection_record):
        """Enable foreign keys and WAL mode for every new SQLite connection."""
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys = ON")
        cursor.execute("PRAGMA journal_mode = WAL")
        cursor.close()


# ── Session factory ──────────────────────────────────────────────────────────
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
