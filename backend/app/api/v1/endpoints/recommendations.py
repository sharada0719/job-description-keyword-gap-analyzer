"""
Job recommendations endpoint.

POST /api/v1/recommendations/
  Takes an existing analysis_id (must belong to the authenticated user) and
  optional preferences.  Returns grounded role suggestions with deep-link
  search URLs on legitimate public job boards.

No external API is called; recommendations are generated deterministically
from the stored resume keywords.  If JSEARCH_API_KEY is configured in the
future, live listings can be appended here.
"""
from fastapi import APIRouter

from app.application.dtos.recommendations import (
    RecommendationRequest,
    RecommendationsResponse,
)
from app.application.services.recommendations_service import generate_recommendations
from app.core.dependencies import CurrentUser, DBSession
from app.core.exceptions import NotFoundError
from app.infrastructure.repositories.analysis_repository import AnalysisRepository

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])


@router.post("/", response_model=RecommendationsResponse)
async def get_recommendations(
    request: RecommendationRequest,
    current_user: CurrentUser,
    db: DBSession,
) -> RecommendationsResponse:
    """
    Return job/internship recommendations based on an existing analysis.

    - Uses the resume keywords stored in the analysis (no new AI inference).
    - Returns grounded role suggestions with deep-link job-board search URLs.
    - Never fabricates vacancies, salaries, or company details.
    - Handles empty keyword lists and invalid analysis IDs gracefully.
    """
    repo = AnalysisRepository(db)
    analysis = await repo.get_by_id_and_user(request.analysis_id, current_user.id)
    if analysis is None:
        raise NotFoundError(f"Analysis {request.analysis_id} not found.")

    resume_keywords: list[str] = analysis.resume_keywords or []

    report = generate_recommendations(
        resume_keywords=resume_keywords,
        location=request.location or "",
        max_results=request.max_results,
        include_internships=request.include_internships,
        include_fulltime=request.include_fulltime,
    )

    return RecommendationsResponse(
        analysis_id=request.analysis_id,
        **report,
    )
