"""
User repository — extends BaseRepository with user-specific queries.
"""
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.models.user import UserModel
from app.infrastructure.repositories.base_repository import BaseRepository


class UserRepository(BaseRepository[UserModel]):

    def __init__(self, db: AsyncSession) -> None:
        super().__init__(UserModel, db)

    async def get_by_email(self, email: str) -> Optional[UserModel]:
        result = await self.db.execute(
            select(UserModel).where(UserModel.email == email)
        )
        return result.scalars().first()

    async def email_exists(self, email: str) -> bool:
        return await self.get_by_email(email) is not None

    async def get_active_by_id(self, user_id: int) -> Optional[UserModel]:
        result = await self.db.execute(
            select(UserModel).where(
                UserModel.id == user_id,
                UserModel.is_active == True,  # noqa: E712
            )
        )
        return result.scalars().first()
