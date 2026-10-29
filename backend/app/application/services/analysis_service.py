"""
Analysis service — orchestrates keyword extraction, semantic similarity
scoring, and persists/retrieves AnalysisModel records.
"""
import re
from typing import Any, Dict, List

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
    match_keywords,
)
from app.infrastructure.ai.skill_taxonomy import normalize_keyword
from app.infrastructure.ats.ats_scorer import score_ats_compatibility
from app.infrastructure.models.analysis import AnalysisModel
from app.infrastructure.repositories.analysis_repository import AnalysisRepository
from app.infrastructure.repositories.job_description_repository import (
    JobDescriptionRepository,
)
from app.infrastructure.repositories.resume_repository import ResumeRepository

logger = get_logger("services.analysis")


# ── Requirement-level detection ───────────────────────────────────────────────
_REQ_HEADER_RE = re.compile(
    r"^\s*(required\s*(qualifications?)?|requirements?|must[\s\-]?have"
    r"|qualifications|essential\s*(skills|requirements|qualifications)?)\b",
    re.IGNORECASE,
)
_PREF_HEADER_RE = re.compile(
    r"^\s*(preferred\s*(qualifications|skills)?|nice[\s\-]?to[\s\-]?have"
    r"|bonus|plus|desired|optional|good[\s\-]?to[\s\-]?have)\b",
    re.IGNORECASE,
)
_PREF_INLINE_RE = re.compile(
    r"\b(preferred|nice to have|nice-to-have|a plus|bonus|desired|optional"
    r"|good to have)\b",
    re.IGNORECASE,
)
_TERM_BOUNDARY_CACHE: Dict[str, "re.Pattern[str]"] = {}


def _term_boundary(term: str) -> "re.Pattern[str]":
    pat = _TERM_BOUNDARY_CACHE.get(term)
    if pat is None:
        pat = re.compile(
            r"(?<![A-Za-z0-9])" + re.escape(term) + r"(?![A-Za-z0-9])",
            re.IGNORECASE,
        )
        _TERM_BOUNDARY_CACHE[term] = pat
    return pat


def _detect_requirement_levels(
    jd_text: str, keywords: List[str]
) -> Dict[str, str]:
    """
    Heuristically classify each job keyword as "required", "preferred", or
    "unspecified" based on the job-description structure.

    Only asserts a level when the JD provides explicit signals (headers such
    as "Required Qualifications" / "Nice to have", or inline markers like
    "preferred"). Otherwise the keyword stays "unspecified".
    """
    levels: Dict[str, str] = {}
    if not jd_text or not keywords:
        return levels

    # Split into segments on newlines and sentence boundaries so an inline
    # marker such as "Experience with React is a plus" scopes to its own
    # sentence rather than colouring an unrelated skill on the same line.
    raw_segments = re.split(r"[\n\r]+|(?<=[.;])\s+", jd_text)
    segments = [s.strip() for s in raw_segments if s.strip()]
    seg_levels: List[tuple[str, str]] = []
    current = "unspecified"
    for seg in segments:
        low = seg.lower()
        if _REQ_HEADER_RE.match(low):
            current = "required"
            seg_levels.append((seg, "required"))
            continue
        if _PREF_HEADER_RE.match(low):
            current = "preferred"
            seg_levels.append((seg, "preferred"))
            continue
        if _PREF_INLINE_RE.search(low):
            seg_levels.append((seg, "preferred"))
            continue
        seg_levels.append((seg, current))

    for kw in keywords:
        term = normalize_keyword(kw)
        level = "unspecified"
        for seg, lvl in seg_levels:
            if _term_boundary(term).search(seg):
                level = lvl
                break
        levels[term] = level
    return levels


def _build_suggestions(
    missing_records: List[Dict[str, Any]],
) -> List[str]:
    """
    Generate human-readable suggestions from missing keywords.

    Wording uses "not found in the resume" (we never claim the candidate
    lacks a skill) and groups by requirement level when the JD provides it.
    """
    if not missing_records:
        return ["Great match! Your resume already covers the key requirements."]

    required = [m for m in missing_records if m.get("requirement_level") == "required"]
    preferred = [m for m in missing_records if m.get("requirement_level") == "preferred"]
    other = [
        m for m in missing_records if m.get("requirement_level") not in {"required", "preferred"}
    ]

    suggestions: List[str] = []
    for m in required[:10]:
        suggestions.append(
            f"Required skill '{m['keyword']}' was not found in the resume. "
            f"Consider adding related experience."
        )
    for m in preferred[:5]:
        suggestions.append(
            f"Preferred skill '{m['keyword']}' was not found in the resume. "
            f"Adding it could strengthen your application."
        )
    for m in other[:8]:
        suggestions.append(
            f"'{m['keyword']}' was not found in the resume. "
            f"Consider adding it or related experience."
        )

    total_shown = min(len(required), 10) + min(len(preferred), 5) + min(len(other), 8)
    if len(missing_records) > total_shown:
        suggestions.append(
            f"…and {len(missing_records) - total_shown} more keywords not found in the resume."
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

        # ── 3. Detect required vs preferred skills (when the JD signals it) ───
        requirement_levels = _detect_requirement_levels(jd.raw_text, job_keywords)

        # ── 4. Score ──────────────────────────────────────────────────────────
        logger.info("STEP E - Calculating semantic similarity")
        sem_score = document_similarity(resume.raw_text, jd.raw_text)
        logger.info("STEP F - Semantic similarity done")

        logger.info("STEP G - Matching keywords")
        match_result = match_keywords(
            resume_keywords,
            job_keywords,
            resume_text=resume.raw_text,
        )
        logger.info("STEP H - Keyword matching done")

        matched_records = match_result["matched"]
        missing_records = match_result["missing"]
        kw_score = match_result["score"]

        # Attach requirement level to each matched keyword for explainability.
        for m in matched_records:
            m["requirement_level"] = requirement_levels.get(m["keyword"], "unspecified")
        for m in missing_records:
            m["requirement_level"] = requirement_levels.get(m["keyword"], "unspecified")

        # Weighted composite score: 40% semantic + 60% keyword coverage.
        # Keyword coverage now reflects exact/alias/semantic/uncertain matches
        # with confusable-technology guards, so it is not inflated by false
        # semantic matches and is not artificially forced above any threshold.
        overall = round(0.4 * sem_score + 0.6 * kw_score, 4)

        matched_keywords_json = matched_records  # list of dicts (JSON column)
        missing_keywords_json = [m["keyword"] for m in missing_records]

        suggestions = _build_suggestions(missing_records)

        # ── 5. ATS compatibility (independent of the job-match score) ────────
        logger.info("STEP I - ATS compatibility scoring")
        ats_report = score_ats_compatibility(
            resume.raw_text, file_type=resume.file_type
        )
        logger.info(
            "STEP J - ATS scoring done (score=%.2f passed=%s)",
            ats_report["score"],
            ats_report["passed"],
        )

        # ── 6. Persist ────────────────────────────────────────────────────────
        analysis = AnalysisModel(
            user_id=user_id,
            resume_id=resume.id,
            job_description_id=jd.id,
            overall_score=overall,
            semantic_similarity_score=round(sem_score, 4),
            keyword_match_score=round(kw_score, 4),
            matched_keywords=matched_keywords_json,
            missing_keywords=missing_keywords_json,
            resume_keywords=resume_keywords,
            job_keywords=job_keywords,
            suggestions=suggestions,
            ats_report=ats_report,
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