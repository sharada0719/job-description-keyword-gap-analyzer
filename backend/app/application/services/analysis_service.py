"""
Analysis service — orchestrates keyword extraction, semantic similarity
scoring, and persists/retrieves AnalysisModel records.
"""
from typing import List

from sqlalchemy.ext.asyncio import AsyncSession

from app.application.dtos.analysis import (
    AnalysisRequest,
    AnalysisResponse,
    AnalysisSummaryResponse,
)
from app.core.exceptions import NotFoundError
from app.core.logging import get_logger
from app.infrastructure.ai.keyword_extractor import extract_keywords
from app.infrastructure.ai.similarity_scorer import (
    document_similarity,
    keyword_match_scores,
)
from app.infrastructure.models.analysis import AnalysisModel
from app.infrastructure.repositories.analysis_repository import AnalysisRepository
from app.infrastructure.repositories.job_description_repository import (
    JobDescriptionRepository,
)
from app.infrastructure.repositories.resume_repository import ResumeRepository

logger = get_logger("services.analysis")


def _build_suggestions(missing_keywords: List[str]) -> List[str]:
    """Generate human-readable improvement suggestions from missing keywords."""
    if not missing_keywords:
        return ["Great match! Your resume already covers the key requirements."]

    suggestions: List[str] = []
    for kw in missing_keywords[:10]:
        suggestions.append(
            f"Consider adding '{kw}' or related experience to your resume."
        )
    if len(missing_keywords) > 10:
        suggestions.append(
            f"…and {len(missing_keywords) - 10} more keywords to address."
        )
    return suggestions


class AnalysisService:

    def __init__(self, db: AsyncSession) -> None:
        self._analysis_repo = AnalysisRepository(db)
        self._resume_repo = ResumeRepository(db)
        self._jd_repo = JobDescriptionRepository(db)

    async def run_analysis(
        self, user_id: int, request: AnalysisRequest
    ) -> AnalysisResponse:
        # ── 1. Load resume & job description ─────────────────────────────────
        resume = await self._resume_repo.get_by_id_and_user(
            request.resume_id, user_id
        )
        if resume is None:
            raise NotFoundError(f"Resume {request.resume_id} not found.")

        jd = await self._jd_repo.get_by_id_and_user(
            request.job_description_id, user_id
        )
        if jd is None:
            raise NotFoundError(
                f"Job description {request.job_description_id} not found."
            )

        logger.info(
            "Running analysis: user=%d resume=%d jd=%d",
            user_id,
            resume.id,
            jd.id,
        )

        # ── 2. Extract keywords ───────────────────────────────────────────────
        logger.info("STEP A - Extracting resume keywords")
        resume_keywords = extract_keywords(resume.raw_text)

        logger.info("STEP B - Resume keywords extracted")

        logger.info("STEP C - Extracting JD keywords")
        job_keywords = extract_keywords(jd.raw_text)

        logger.info("STEP D - JD keywords extracted")

        # ── 3. Score ──────────────────────────────────────────────────────────
        logger.info("STEP E - Calculating semantic similarity")
        sem_score = document_similarity(resume.raw_text, jd.raw_text)

        logger.info("STEP F - Semantic similarity done")

        logger.info("STEP G - Matching keywords")
        matched_pairs, missing_keywords = keyword_match_scores(
            resume_keywords,
            job_keywords,
        )

        logger.info("STEP H - Keyword matching done")

        kw_score = (
            len(matched_pairs) / len(job_keywords) if job_keywords else 0.0
        )

        # Weighted composite score: 40% semantic + 60% keyword coverage
        overall = round(0.4 * sem_score + 0.6 * kw_score, 4)

        matched_keywords_json = [
            {"keyword": kw, "score": score} for kw, score in matched_pairs
        ]

        suggestions = _build_suggestions(missing_keywords)

        # ── 4. Persist ────────────────────────────────────────────────────────
        analysis = AnalysisModel(
            user_id=user_id,
            resume_id=resume.id,
            job_description_id=jd.id,
            overall_score=overall,
            semantic_similarity_score=round(sem_score, 4),
            keyword_match_score=round(kw_score, 4),
            matched_keywords=matched_keywords_json,
            missing_keywords=missing_keywords,
            resume_keywords=resume_keywords,
            job_keywords=job_keywords,
            suggestions=suggestions,
        )

        analysis = await self._analysis_repo.create(analysis)

        logger.info(
            "Analysis complete: id=%d overall_score=%.2f",
            analysis.id,
            overall,
        )

        return AnalysisResponse.model_validate(analysis)

    async def list_analyses(
        self, user_id: int, skip: int = 0, limit: int = 50
    ) -> List[AnalysisSummaryResponse]:
        items = await self._analysis_repo.get_by_user(
            user_id,
            skip=skip,
            limit=limit,
        )
        return [AnalysisSummaryResponse.model_validate(i) for i in items]

    async def get_analysis(
        self, analysis_id: int, user_id: int
    ) -> AnalysisResponse:
        analysis = await self._analysis_repo.get_by_id_and_user(
            analysis_id,
            user_id,
        )
        if analysis is None:
            raise NotFoundError(f"Analysis {analysis_id} not found.")
        return AnalysisResponse.model_validate(analysis)

    async def delete_analysis(
        self,
        analysis_id: int,
        user_id: int,
    ) -> None:
        analysis = await self._analysis_repo.get_by_id_and_user(
            analysis_id,
            user_id,
        )
        if analysis is None:
            raise NotFoundError(f"Analysis {analysis_id} not found.")
        await self._analysis_repo.delete(analysis_id)
        logger.info(
            "Analysis deleted: id=%d user=%d",
            analysis_id,
            user_id,
        )