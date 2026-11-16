"""
Analysis endpoints — run, list, retrieve, delete.
"""
import time
from collections import defaultdict
from typing import List

from fastapi import APIRouter, HTTPException, status

from app.application.dtos.analysis import (
    AnalysisRequest,
    AnalysisResponse,
    AnalysisSummaryResponse,
)
from app.application.dtos.common import MessageResponse
from app.application.services.analysis_service import AnalysisService
from app.core.dependencies import CurrentUser, DBSession

router = APIRouter(prefix="/analyses", tags=["Analysis"])

# ── Simple in-memory rate limiter (per-user, per-minute) ──────────────────────
_RATE_LIMIT = 5          # max analyses per window
_RATE_WINDOW = 60        # seconds
_user_timestamps: dict[int, list[float]] = defaultdict(list)


def _check_rate_limit(user_id: int) -> None:
    """Raise 429 if the user exceeds the analysis rate limit."""
    now = time.monotonic()
    timestamps = _user_timestamps[user_id]
    # Prune timestamps outside the window
    _user_timestamps[user_id] = [t for t in timestamps if now - t < _RATE_WINDOW]
    if len(_user_timestamps[user_id]) >= _RATE_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded. Maximum {_RATE_LIMIT} analyses per minute.",
        )
    _user_timestamps[user_id].append(now)


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
    _check_rate_limit(current_user.id)
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
