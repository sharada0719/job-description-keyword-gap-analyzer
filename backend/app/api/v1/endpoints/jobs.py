"""
Job Description endpoints — CRUD.
"""
from typing import List

from fastapi import APIRouter

from app.application.dtos.common import MessageResponse
from app.application.dtos.job_description import (
    JobDescriptionCreateRequest,
    JobDescriptionResponse,
    JobDescriptionUpdateRequest,
)
from app.application.services.job_description_service import JobDescriptionService
from app.core.dependencies import CurrentUser, DBSession

router = APIRouter(prefix="/jobs", tags=["Job Descriptions"])


@router.post("/", response_model=JobDescriptionResponse, status_code=201)
async def create_job_description(
    request: JobDescriptionCreateRequest,
    current_user: CurrentUser,
    db: DBSession,
) -> JobDescriptionResponse:
    """Create a new job description by pasting raw text."""
    service = JobDescriptionService(db)
    return await service.create(current_user.id, request)


@router.get("/", response_model=List[JobDescriptionResponse])
async def list_job_descriptions(
    current_user: CurrentUser,
    db: DBSession,
    skip: int = 0,
    limit: int = 50,
) -> List[JobDescriptionResponse]:
    """List all job descriptions for the authenticated user."""
    service = JobDescriptionService(db)
    return await service.list_job_descriptions(current_user.id, skip=skip, limit=limit)


@router.get("/{job_id}", response_model=JobDescriptionResponse)
async def get_job_description(
    job_id: int,
    current_user: CurrentUser,
    db: DBSession,
) -> JobDescriptionResponse:
    """Get a single job description by ID."""
    service = JobDescriptionService(db)
    return await service.get_job_description(job_id, current_user.id)


@router.patch("/{job_id}", response_model=JobDescriptionResponse)
async def update_job_description(
    job_id: int,
    request: JobDescriptionUpdateRequest,
    current_user: CurrentUser,
    db: DBSession,
) -> JobDescriptionResponse:
    """Partially update a job description."""
    service = JobDescriptionService(db)
    return await service.update_job_description(job_id, current_user.id, request)


@router.delete("/{job_id}", response_model=MessageResponse)
async def delete_job_description(
    job_id: int,
    current_user: CurrentUser,
    db: DBSession,
) -> MessageResponse:
    """Delete a job description and all associated analyses."""
    service = JobDescriptionService(db)
    await service.delete_job_description(job_id, current_user.id)
    return MessageResponse(message=f"Job description {job_id} deleted successfully.")
