"""
FastAPI dependency injection – current user extraction from JWT.
"""
from __future__ import annotations

from typing import TYPE_CHECKING, Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_token
from app.infrastructure.database.session import get_db

if TYPE_CHECKING:
    # Only imported during static analysis — avoids runtime circular imports.
    from app.infrastructure.models.user import UserModel

bearer_scheme = HTTPBearer()


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> "UserModel":
    """Validate JWT and return the authenticated user model."""
    # Local import keeps this module free of circular-import risk at runtime.
    from app.infrastructure.models.user import UserModel  # noqa: F401
    from app.infrastructure.repositories.user_repository import UserRepository

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_token(credentials.credentials)
    if payload is None or payload.get("type") != "access":
        raise credentials_exception

    user_id: str | None = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    repo = UserRepository(db)
    user = await repo.get_by_id(int(user_id))
    if user is None:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user account",
        )

    return user


# Convenience type aliases used across all route modules
CurrentUser = Annotated["UserModel", Depends(get_current_user)]
DBSession = Annotated[AsyncSession, Depends(get_db)]
