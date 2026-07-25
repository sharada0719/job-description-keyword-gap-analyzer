"""
JobDescription repository.
"""
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.models.job_description import JobDescriptionModel
from app.infrastructure.repositories.base_repository import BaseRepository


class JobDescriptionRepository(BaseRepository[JobDescriptionModel]):

    def __init__(self, db: AsyncSession) -> None:
        super().__init__(JobDescriptionModel, db)

    async def get_by_user(
        self, user_id: int, skip: int = 0, limit: int = 100
    ) -> List[JobDescriptionModel]:
        result = await self.db.execute(
            select(JobDescriptionModel)
            .where(JobDescriptionModel.user_id == user_id)
            .order_by(JobDescriptionModel.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def get_by_id_and_user(
        self, job_id: int, user_id: int
    ) -> Optional[JobDescriptionModel]:
        result = await self.db.execute(
            select(JobDescriptionModel).where(
                JobDescriptionModel.id == job_id,
                JobDescriptionModel.user_id == user_id,
            )
        )
        return result.scalars().first()

    async def count_by_user(self, user_id: int) -> int:
        from sqlalchemy import func
        result = await self.db.execute(
            select(func.count())
            .select_from(JobDescriptionModel)
            .where(JobDescriptionModel.user_id == user_id)
        )
        return result.scalar_one()
