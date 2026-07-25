"""
User domain entity (pure Python dataclass — no ORM dependency).
"""
from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class User:
    id: int
    email: str
    full_name: str
    is_active: bool
    is_superuser: bool
    created_at: datetime
    updated_at: datetime
    hashed_password: str = field(repr=False)
