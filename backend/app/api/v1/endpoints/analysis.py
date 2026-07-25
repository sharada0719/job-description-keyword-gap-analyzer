"""
Analysis endpoints — run, list, retrieve, delete.
"""
from typing import List

from fastapi import APIRouter

from app.application.dtos.analysis import (
    AnalysisRequest,
    AnalysisResponse,
    AnalysisSummaryResponse,
)
from app.application.dtos.common import MessageResponse
from app.application.services.analysis_service import AnalysisService
from app.core.dependencies import CurrentUser, DBSession

router = APIRouter(prefix="/analyses", tags=["Analysis"])


@router.post("/", response_model=AnalysisResponse, status_code=201)
async def run_analysis(
    request: AnalysisRequest,
    current_user: CurrentUser,
    db: DBSession,
) -> AnalysisResponse:
    """
    Run a keyword-gap analysis against a saved resume and job description.
    Returns scores, matched/missing keywords, and improvement suggestions.
    """
    service = AnalysisService(db)
    return await service.run_analysis(current_user.id, request)


@router.get("/", response_model=List[AnalysisSummaryResponse])
async def list_analyses(
    current_user: CurrentUser,
    db: DBSession,
    skip: int = 0,
    limit: int = 50,
) -> List[AnalysisSummaryResponse]:
    """List all analyses for the authenticated user (summary view)."""
    service = AnalysisService(db)
    return await service.list_analyses(current_user.id, skip=skip, limit=limit)


@router.get("/{analysis_id}", response_model=AnalysisResponse)
async def get_analysis(
    analysis_id: int,
    current_user: CurrentUser,
    db: DBSession,
) -> AnalysisResponse:
    """Get full analysis details by ID."""
    service = AnalysisService(db)
    return await service.get_analysis(analysis_id, current_user.id)


@router.delete("/{analysis_id}", response_model=MessageResponse)
async def delete_analysis(
    analysis_id: int,
    current_user: CurrentUser,
    db: DBSession,
) -> MessageResponse:
    """Delete an analysis record."""
    service = AnalysisService(db)
    await service.delete_analysis(analysis_id, current_user.id)
    return MessageResponse(message=f"Analysis {analysis_id} deleted successfully.")
