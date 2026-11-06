"""
Job Application Tracker endpoints — CRUD with JWT auth and user isolation.

POST   /api/v1/applications/            Create a job application
GET    /api/v1/applications/            List user's applications
GET    /api/v1/applications/stats       Get application statistics
GET    /api/v1/applications/{id}        Get one application
PUT    /api/v1/applications/{id}        Update application details
PATCH  /api/v1/applications/{id}/status Update application status
DELETE /api/v1/applications/{id}        Delete an application

All endpoints require JWT authentication.  The user_id is always taken
from the authenticated token — never from request input.
"""
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter

from app.application.dtos.common import MessageResponse
from app.application.dtos.job_application import (
    APPLICATION_STATUSES,
    ApplicationStatsResponse,
    JobApplicationCreateRequest,
    JobApplicationResponse,
    JobApplicationStatusRequest,
    JobApplicationUpdateRequest,
)
from app.core.dependencies import CurrentUser, DBSession
from app.core.exceptions import ConflictError, NotFoundError, ValidationError
from app.core.logging import get_logger
from app.infrastructure.models.job_application import JobApplicationModel
from app.infrastructure.repositories.job_application_repository import (
    JobApplicationRepository,
)

logger = get_logger("api.applications")

router = APIRouter(prefix="/applications", tags=["Applications"])


@router.post("/", response_model=JobApplicationResponse, status_code=201)
async def create_application(
    request: JobApplicationCreateRequest,
    current_user: CurrentUser,
    db: DBSession,
) -> JobApplicationResponse:
    """Save a job to the application tracker."""
    repo = JobApplicationRepository(db)

    # Prevent duplicates: same job_title + company_name for the same user
    if await repo.check_duplicate(current_user.id, request.job_title, request.company_name):
        raise ConflictError(
            f"Application for '{request.job_title}'"
            + (f" at {request.company_name}" if request.company_name else "")
            + " already exists."
        )

    application = JobApplicationModel(
        user_id=current_user.id,
        job_title=request.job_title,
        company_name=request.company_name,
        job_location=request.job_location,
        job_description=request.job_description,
        job_url=request.job_url,
        contact_email=request.contact_email,
        notes=request.notes,
        application_status="saved",
    )
    application = await repo.create(application)
    logger.info("Application created: id=%d user=%d title='%s'", application.id, current_user.id, request.job_title)
    return JobApplicationResponse.model_validate(application)


@router.get("/", response_model=List[JobApplicationResponse])
async def list_applications(
    current_user: CurrentUser,
    db: DBSession,
    skip: int = 0,
    limit: int = 100,
) -> List[JobApplicationResponse]:
    """List all job applications for the authenticated user."""
    repo = JobApplicationRepository(db)
    items = await repo.get_by_user(current_user.id, skip=skip, limit=limit)
    return [JobApplicationResponse.model_validate(i) for i in items]


@router.get("/stats", response_model=ApplicationStatsResponse)
async def get_application_stats(
    current_user: CurrentUser,
    db: DBSession,
) -> ApplicationStatsResponse:
    """Get application statistics (counts by status) for the authenticated user."""
    repo = JobApplicationRepository(db)
    counts = await repo.count_by_status(current_user.id)
    return ApplicationStatsResponse(
        total=sum(counts.values()),
        saved=counts.get("saved", 0),
        applied=counts.get("applied", 0),
        interview=counts.get("interview", 0),
        offered=counts.get("offered", 0),
        rejected=counts.get("rejected", 0),
    )


@router.get("/{application_id}", response_model=JobApplicationResponse)
async def get_application(
    application_id: int,
    current_user: CurrentUser,
    db: DBSession,
) -> JobApplicationResponse:
    """Get a single job application by ID."""
    repo = JobApplicationRepository(db)
    application = await repo.get_by_id_and_user(application_id, current_user.id)
    if application is None:
        raise NotFoundError(f"Application {application_id} not found.")
    return JobApplicationResponse.model_validate(application)


@router.put("/{application_id}", response_model=JobApplicationResponse)
async def update_application(
    application_id: int,
    request: JobApplicationUpdateRequest,
    current_user: CurrentUser,
    db: DBSession,
) -> JobApplicationResponse:
    """Update job application details and notes."""
    repo = JobApplicationRepository(db)
    application = await repo.get_by_id_and_user(application_id, current_user.id)
    if application is None:
        raise NotFoundError(f"Application {application_id} not found.")

    # Apply partial updates (only non-None fields)
    for field in ("job_title", "company_name", "job_location", "job_description",
                  "job_url", "contact_email", "notes"):
        val = getattr(request, field)
        if val is not None:
            setattr(application, field, val)

    application.updated_at = datetime.now(timezone.utc)
    application = await repo.update(application)
    logger.info("Application updated: id=%d user=%d", application_id, current_user.id)
    return JobApplicationResponse.model_validate(application)


@router.patch("/{application_id}/status", response_model=JobApplicationResponse)
async def update_application_status(
    application_id: int,
    request: JobApplicationStatusRequest,
    current_user: CurrentUser,
    db: DBSession,
) -> JobApplicationResponse:
    """Update the status of a job application."""
    if request.application_status not in APPLICATION_STATUSES:
        raise ValidationError(
            f"Invalid status '{request.application_status}'. "
            f"Must be one of: {', '.join(sorted(APPLICATION_STATUSES))}."
        )

    repo = JobApplicationRepository(db)
    application = await repo.get_by_id_and_user(application_id, current_user.id)
    if application is None:
        raise NotFoundError(f"Application {application_id} not found.")

    application.application_status = request.application_status
    application.updated_at = datetime.now(timezone.utc)
    application = await repo.update(application)
    logger.info("Status updated: id=%d status='%s'", application_id, request.application_status)
    return JobApplicationResponse.model_validate(application)


@router.delete("/{application_id}", response_model=MessageResponse)
async def delete_application(
    application_id: int,
    current_user: CurrentUser,
    db: DBSession,
) -> MessageResponse:
    """Delete a job application."""
    repo = JobApplicationRepository(db)
    application = await repo.get_by_id_and_user(application_id, current_user.id)
    if application is None:
        raise NotFoundError(f"Application {application_id} not found.")
    await repo.delete(application_id)
    logger.info("Application deleted: id=%d user=%d", application_id, current_user.id)
    return MessageResponse(message=f"Application {application_id} deleted successfully.")
