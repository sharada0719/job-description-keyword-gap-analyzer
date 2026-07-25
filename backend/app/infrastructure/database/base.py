"""
SQLAlchemy declarative base and shared timestamp mixin — SQLite compatible.

SQLite stores DATETIME as text (ISO-8601). We use server_default='CURRENT_TIMESTAMP'
which SQLite understands natively. The onupdate for updated_at is handled in
Python rather than at the DB level because SQLite has no equivalent trigger
built into SQLAlchemy's server-side onupdate.
"""
from datetime import datetime, timezone

from sqlalchemy import DateTime, event, func, text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """Single declarative base for all ORM models."""


class TimestampMixin:
    """
    Adds created_at / updated_at columns.
    - created_at: set once by the DB on INSERT via CURRENT_TIMESTAMP default.
    - updated_at: set by the DB on INSERT; refreshed in Python on UPDATE
                  because SQLite has no server-side onupdate equivalent.
    """

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=text("CURRENT_TIMESTAMP"),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=text("CURRENT_TIMESTAMP"),
        nullable=False,
    )
