"""
Job search endpoint.

POST /api/v1/job-search/
  Accepts a free-text query, optional filters (job type, location, remote),
  and optional resume keywords for matching.

  Returns legitimate job-board search links built from the query, plus
  ranked role suggestions when resume keywords are provided.

  No external API is called; all links are constructed from the board's
  documented query-string format.  No fake listings are generated.
"""
from fastapi import APIRouter

from app.application.dtos.recommendations import (
    JobSearchRequest,
    JobSearchResponse,
)
from app.application.services.recommendations_service import search_jobs
from app.core.dependencies import CurrentUser

router = APIRouter(prefix="/job-search", tags=["Job Search"])


@router.post("/", response_model=JobSearchResponse)
async def job_search(
    request: JobSearchRequest,
    current_user: CurrentUser,
) -> JobSearchResponse:
    """
    Search for jobs and internships on legitimate public job boards.

    - Builds real, clickable search-result links (no fabricated listings).
    - When resume_keywords are provided, ranks matching roles from the
      internal skill taxonomy.
    - Handles empty queries gracefully (returns browse links).
    """
    result = search_jobs(
        query=request.query or "",
        location=request.location or "",
        remote=request.remote,
        job_types=request.job_types,
        resume_keywords=request.resume_keywords,
        max_results=request.max_results,
    )
    return JobSearchResponse(**result)
