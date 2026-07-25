"""
Analysis repository.
"""
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.models.analysis import AnalysisModel
from app.infrastructure.repositories.base_repository import BaseRepository


class AnalysisRepository(BaseRepository[AnalysisModel]):

    def __init__(self, db: AsyncSession) -> None:
        super().__init__(AnalysisModel, db)

    async def get_by_user(
        self, user_id: int, skip: int = 0, limit: int = 100
    ) -> List[AnalysisModel]:
        result = await self.db.execute(
            select(AnalysisModel)
            .where(AnalysisModel.user_id == user_id)
            .order_by(AnalysisModel.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def get_by_id_and_user(
        self, analysis_id: int, user_id: int
    ) -> Optional[AnalysisModel]:
        result = await self.db.execute(
            select(AnalysisModel).where(
                AnalysisModel.id == analysis_id,
                AnalysisModel.user_id == user_id,
            )
        )
        return result.scalars().first()

    async def get_by_resume(self, resume_id: int) -> List[AnalysisModel]:
        result = await self.db.execute(
            select(AnalysisModel)
            .where(AnalysisModel.resume_id == resume_id)
            .order_by(AnalysisModel.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_by_job_description(
        self, job_description_id: int
    ) -> List[AnalysisModel]:
        result = await self.db.execute(
            select(AnalysisModel)
            .where(AnalysisModel.job_description_id == job_description_id)
            .order_by(AnalysisModel.created_at.desc())
        )
        return list(result.scalars().all())

    async def count_by_user(self, user_id: int) -> int:
        from sqlalchemy import func
        result = await self.db.execute(
            select(func.count())
            .select_from(AnalysisModel)
            .where(AnalysisModel.user_id == user_id)
        )
        return result.scalar_one()
