"""
User profile service.
"""
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.dtos.user import UpdateProfileRequest, UserResponse
from app.core.exceptions import NotFoundError
from app.core.logging import get_logger
from app.core.security import hash_password
from app.infrastructure.repositories.user_repository import UserRepository

logger = get_logger("services.user")


class UserService:

    def __init__(self, db: AsyncSession) -> None:
        self._repo = UserRepository(db)

    async def get_profile(self, user_id: int) -> UserResponse:
        user = await self._repo.get_by_id(user_id)
        if user is None:
            raise NotFoundError(f"User {user_id} not found.")
        return UserResponse.model_validate(user)

    async def update_profile(
        self, user_id: int, request: UpdateProfileRequest
    ) -> UserResponse:
        user = await self._repo.get_by_id(user_id)
        if user is None:
            raise NotFoundError(f"User {user_id} not found.")

        if request.full_name is not None:
            user.full_name = request.full_name
        if request.password is not None:
            user.hashed_password = hash_password(request.password)

        user = await self._repo.update(user)
        logger.info("Profile updated for user id=%d", user_id)
        return UserResponse.model_validate(user)
