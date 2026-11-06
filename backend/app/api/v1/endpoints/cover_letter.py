"""
Cover letter generator endpoint.

POST /api/v1/cover-letter/
  Generates a personalized cover letter using Google Gemini AI.

Two modes:
  1. By ID (preferred): pass resume_id + job_description_id — the backend
     fetches stored text server-side (resume text never leaves the server).
  2. By raw text: pass resume_text, job_title, company_name, job_description.

Both modes require authentication.  When using IDs, the resources must
belong to the authenticated user.
"""
from fastapi import APIRouter

from app.application.dtos.cover_letter import (
    CoverLetterRequest,
    CoverLetterResponse,
)
from app.application.services.cover_letter_service import generate_cover_letter
from app.core.dependencies import CurrentUser, DBSession
from app.core.exceptions import NotFoundError
from app.core.logging import get_logger
from app.infrastructure.repositories.job_description_repository import (
    JobDescriptionRepository,
)
from app.infrastructure.repositories.resume_repository import ResumeRepository

logger = get_logger("api.cover_letter")

router = APIRouter(prefix="/cover-letter", tags=["Cover Letter"])


@router.post("/", response_model=CoverLetterResponse)
async def generate_cover_letter_endpoint(
    request: CoverLetterRequest,
    current_user: CurrentUser,
    db: DBSession,
) -> CoverLetterResponse:
    """
    Generate a personalized cover letter using Google Gemini AI.

    The cover letter is based on the candidate's actual resume content and
    the target job details.  The AI never invents qualifications — it only
    connects real experience from the resume to the job requirements.
    """
    resume_repo = ResumeRepository(db)
    jd_repo = JobDescriptionRepository(db)

    # ── Resolve resume text ────────────────────────────────────────────────
    if request.resume_id:
        resume = await resume_repo.get_by_id_and_user(
            request.resume_id, current_user.id
        )
        if resume is None:
            raise NotFoundError(f"Resume {request.resume_id} not found.")
        resume_text = resume.raw_text
    else:
        resume_text = request.resume_text or ""

    # ── Resolve job details ────────────────────────────────────────────────
    if request.job_description_id:
        jd = await jd_repo.get_by_id_and_user(
            request.job_description_id, current_user.id
        )
        if jd is None:
            raise NotFoundError(
                f"Job description {request.job_description_id} not found."
            )
        job_title = jd.title
        company_name = jd.company or ""
        job_description = jd.raw_text
    else:
        job_title = request.job_title or ""
        company_name = request.company_name or ""
        job_description = request.job_description or ""

    # ── Generate ───────────────────────────────────────────────────────────
    cover_letter = generate_cover_letter(
        resume_text=resume_text,
        job_title=job_title,
        company_name=company_name,
        job_description=job_description,
    )

    return CoverLetterResponse(
        status="success",
        cover_letter=cover_letter,
    )
