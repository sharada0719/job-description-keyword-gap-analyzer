"""
Resume repository.
"""
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.models.resume import ResumeModel
from app.infrastructure.repositories.base_repository import BaseRepository


class ResumeRepository(BaseRepository[ResumeModel]):

    def __init__(self, db: AsyncSession) -> None:
        super().__init__(ResumeModel, db)

    async def get_by_user(
        self, user_id: int, skip: int = 0, limit: int = 100
    ) -> List[ResumeModel]:
        result = await self.db.execute(
            select(ResumeModel)
            .where(ResumeModel.user_id == user_id)
            .order_by(ResumeModel.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def get_by_id_and_user(
        self, resume_id: int, user_id: int
    ) -> Optional[ResumeModel]:
        result = await self.db.execute(
            select(ResumeModel).where(
                ResumeModel.id == resume_id,
                ResumeModel.user_id == user_id,
            )
        )
        return result.scalars().first()

    async def count_by_user(self, user_id: int) -> int:
        from sqlalchemy import func
        result = await self.db.execute(
            select(func.count()).select_from(ResumeModel).where(
                ResumeModel.user_id == user_id
            )
        )
        return result.scalar_one()
