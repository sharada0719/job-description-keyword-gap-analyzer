"""
JobApplication repository — async CRUD with user-scoped queries.
"""
from typing import List, Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.models.job_application import JobApplicationModel
from app.infrastructure.repositories.base_repository import BaseRepository


class JobApplicationRepository(BaseRepository[JobApplicationModel]):
    """User-scoped repository for job applications."""

    def __init__(self, db: AsyncSession) -> None:
        super().__init__(JobApplicationModel, db)

    async def get_by_id_and_user(
        self, application_id: int, user_id: int
    ) -> Optional[JobApplicationModel]:
        result = await self.db.execute(
            select(JobApplicationModel).where(
                JobApplicationModel.id == application_id,
                JobApplicationModel.user_id == user_id,
            )
        )
        return result.scalars().first()

    async def get_by_user(
        self, user_id: int, skip: int = 0, limit: int = 100
    ) -> List[JobApplicationModel]:
        result = await self.db.execute(
            select(JobApplicationModel)
            .where(JobApplicationModel.user_id == user_id)
            .order_by(JobApplicationModel.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def check_duplicate(
        self, user_id: int, job_title: str, company_name: Optional[str] = None
    ) -> bool:
        """Return True if an application with the same title+company already exists for this user."""
        query = select(JobApplicationModel).where(
            JobApplicationModel.user_id == user_id,
            JobApplicationModel.job_title == job_title,
        )
        if company_name:
            query = query.where(JobApplicationModel.company_name == company_name)
        else:
            query = query.where(JobApplicationModel.company_name.is_(None))
        result = await self.db.execute(query)
        return result.scalars().first() is not None

    async def count_by_status(self, user_id: int) -> dict:
        """Return a dict of status → count for the user's applications."""
        result = await self.db.execute(
            select(
                JobApplicationModel.application_status,
                func.count(JobApplicationModel.id),
            )
            .where(JobApplicationModel.user_id == user_id)
            .group_by(JobApplicationModel.application_status)
        )
        return {status: count for status, count in result.all()}
