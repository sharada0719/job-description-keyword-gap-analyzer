"""
Alembic environment — synchronous migration runner.

Uses the sync database URL from Settings.  When the database is SQLite,
`render_as_batch=True` is used (required for ALTER TABLE on SQLite which
cannot ALTER columns in-place).  When PostgreSQL is configured, batch mode
is disabled (it works but is unnecessary overhead).
"""
import sys
import os
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

# ── Project path setup ────────────────────────────────────────────────────────
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.core.config import settings
from app.infrastructure.database.base import Base

# Import all models so Alembic autogenerate detects every table
import app.infrastructure.models  # noqa: F401

# ── Determine database backend ────────────────────────────────────────────────
_is_sqlite = settings.SYNC_DATABASE_URL.startswith("sqlite")

# ── Alembic config ────────────────────────────────────────────────────────────
config = context.config

# Override the URL programmatically so we never rely on alembic.ini having it
# ConfigParser treats percent signs as interpolation markers. Database
# passwords may legitimately contain percent-encoded characters.
config.set_main_option(
    "sqlalchemy.url",
    settings.SYNC_DATABASE_URL.replace("%", "%%"),
)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


# ── Offline mode ──────────────────────────────────────────────────────────────
def run_migrations_offline() -> None:
    """Emit SQL to stdout without touching the database."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        render_as_batch=_is_sqlite,  # batch mode only for SQLite
    )
    with context.begin_transaction():
        context.run_migrations()


# ── Online mode ───────────────────────────────────────────────────────────────
def run_migrations_online() -> None:
    """Run migrations against the live database."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
        url=settings.SYNC_DATABASE_URL,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            render_as_batch=_is_sqlite,  # batch mode only for SQLite
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
