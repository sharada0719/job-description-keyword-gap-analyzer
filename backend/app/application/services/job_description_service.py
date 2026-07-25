"""
Job Description service — CRUD for job descriptions.
"""
from typing import List

from sqlalchemy.ext.asyncio import AsyncSession

from app.application.dtos.job_description import (
    JobDescriptionCreateRequest,
    JobDescriptionResponse,
    JobDescriptionUpdateRequest,
)
from app.core.exceptions import NotFoundError
from app.core.logging import get_logger
from app.infrastructure.models.job_description import JobDescriptionModel
from app.infrastructure.repositories.job_description_repository import (
    JobDescriptionRepository,
)

logger = get_logger("services.job_description")


class JobDescriptionService:

    def __init__(self, db: AsyncSession) -> None:
        self._repo = JobDescriptionRepository(db)

    async def create(
        self, user_id: int, request: JobDescriptionCreateRequest
    ) -> JobDescriptionResponse:
        jd = JobDescriptionModel(
            user_id=user_id,
            title=request.title,
            company=request.company,
            raw_text=request.raw_text,
        )
        jd = await self._repo.create(jd)
        logger.info("Job description created: id=%d user=%d", jd.id, user_id)
        return JobDescriptionResponse.model_validate(jd)

    async def list_job_descriptions(
        self, user_id: int, skip: int = 0, limit: int = 50
    ) -> List[JobDescriptionResponse]:
        items = await self._repo.get_by_user(user_id, skip=skip, limit=limit)
        return [JobDescriptionResponse.model_validate(i) for i in items]

    async def get_job_description(
        self, job_id: int, user_id: int
    ) -> JobDescriptionResponse:
        jd = await self._repo.get_by_id_and_user(job_id, user_id)
        if jd is None:
            raise NotFoundError(f"Job description {job_id} not found.")
        return JobDescriptionResponse.model_validate(jd)

    async def update_job_description(
        self, job_id: int, user_id: int, request: JobDescriptionUpdateRequest
    ) -> JobDescriptionResponse:
        jd = await self._repo.get_by_id_and_user(job_id, user_id)
        if jd is None:
            raise NotFoundError(f"Job description {job_id} not found.")

        if request.title is not None:
            jd.title = request.title
        if request.company is not None:
            jd.company = request.company
        if request.raw_text is not None:
            jd.raw_text = request.raw_text

        jd = await self._repo.update(jd)
        return JobDescriptionResponse.model_validate(jd)

    async def delete_job_description(self, job_id: int, user_id: int) -> None:
        jd = await self._repo.get_by_id_and_user(job_id, user_id)
        if jd is None:
            raise NotFoundError(f"Job description {job_id} not found.")
        await self._repo.delete(job_id)
        logger.info("Job description deleted: id=%d user=%d", job_id, user_id)
