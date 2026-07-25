"""
Resume service — file upload, storage, and retrieval.
"""
from typing import List

from sqlalchemy.ext.asyncio import AsyncSession

from app.application.dtos.resume import ResumeCreateRequest, ResumeResponse
from app.core.exceptions import NotFoundError
from app.core.logging import get_logger
from app.infrastructure.models.resume import ResumeModel
from app.infrastructure.parsers.file_parser import parse_uploaded_file
from app.infrastructure.repositories.resume_repository import ResumeRepository

logger = get_logger("services.resume")


class ResumeService:

    def __init__(self, db: AsyncSession) -> None:
        self._repo = ResumeRepository(db)

    async def upload_resume(
        self,
        user_id: int,
        filename: str,
        file_bytes: bytes,
        title: str,
    ) -> ResumeResponse:
        """Parse the uploaded file and persist the extracted text."""
        raw_text, file_type = parse_uploaded_file(filename, file_bytes)

        resume = ResumeModel(
            user_id=user_id,
            title=title,
            original_filename=filename,
            file_type=file_type.value,
            raw_text=raw_text,
        )
        resume = await self._repo.create(resume)
        logger.info(
            "Resume uploaded: id=%d user=%d filename=%s", resume.id, user_id, filename
        )
        return ResumeResponse.model_validate(resume)

    async def list_resumes(
        self, user_id: int, skip: int = 0, limit: int = 50
    ) -> List[ResumeResponse]:
        resumes = await self._repo.get_by_user(user_id, skip=skip, limit=limit)
        return [ResumeResponse.model_validate(r) for r in resumes]

    async def get_resume(self, resume_id: int, user_id: int) -> ResumeResponse:
        resume = await self._repo.get_by_id_and_user(resume_id, user_id)
        if resume is None:
            raise NotFoundError(f"Resume {resume_id} not found.")
        return ResumeResponse.model_validate(resume)

    async def delete_resume(self, resume_id: int, user_id: int) -> None:
        resume = await self._repo.get_by_id_and_user(resume_id, user_id)
        if resume is None:
            raise NotFoundError(f"Resume {resume_id} not found.")
        await self._repo.delete(resume_id)
        logger.info("Resume deleted: id=%d user=%d", resume_id, user_id)
