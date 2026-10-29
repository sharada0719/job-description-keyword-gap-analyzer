"""
Analysis request / response DTOs.
"""
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, model_validator


class AnalysisRequest(BaseModel):
    resume_id: int = Field(..., gt=0)
    job_description_id: int = Field(..., gt=0)


class KeywordMatchDTO(BaseModel):
    keyword: str
    score: float
    # Optional explainability fields. Default to None so older analysis rows
    # (which only stored {keyword, score}) still validate.
    match_type: Optional[str] = None
    best_match: Optional[str] = None
    evidence: Optional[str] = None
    requirement_level: Optional[str] = None


class AtsCheckDTO(BaseModel):
    name: str
    passed: bool
    weight: Optional[float] = None
    detail: Optional[str] = None


class AtsReportDTO(BaseModel):
    """ATS compatibility report — independent of the job-match score."""
    score: float
    threshold: float
    passed: bool
    checks: List[AtsCheckDTO]
    warnings: List[str]
    recommendations: List[str]


class AnalysisResponse(BaseModel):
    id: int
    user_id: int
    resume_id: int
    job_description_id: int
    overall_score: float
    semantic_similarity_score: float
    keyword_match_score: float
    matched_keywords: List[KeywordMatchDTO]
    missing_keywords: List[str]
    resume_keywords: List[str]
    job_keywords: List[str]
    suggestions: List[str]
    # ATS compatibility report. Optional/None for legacy rows written before
    # this field existed — fully backward compatible.
    ats_report: Optional[AtsReportDTO] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @model_validator(mode="before")
    @classmethod
    def coerce_matched_keywords(cls, values: Any) -> Any:
        """
        The ORM stores matched_keywords as a JSON list of dicts
        e.g. [{"keyword": "python", "score": 0.9}].
        Coerce each dict into a KeywordMatchDTO-compatible mapping.
        """
        # ── Normalise input to a plain dict ──────────────────────────────────
        if isinstance(values, dict):
            data = values
        elif hasattr(values, "__table__"):
            # SQLAlchemy ORM model — build a plain dict from column values
            # including columns inherited via mixins (created_at, updated_at)
            data = {
                col.key: getattr(values, col.key)
                for col in values.__table__.columns
            }
        else:
            return values

        # ── Coerce matched_keywords list ──────────────────────────────────────
        raw = data.get("matched_keywords")
        if isinstance(raw, list):
            coerced = []
            for item in raw:
                if isinstance(item, dict):
                    coerced.append(KeywordMatchDTO(**item))
                elif isinstance(item, KeywordMatchDTO):
                    coerced.append(item)
            data["matched_keywords"] = coerced

        return data


class AnalysisSummaryResponse(BaseModel):
    """Lightweight version for list endpoints."""

    id: int
    resume_id: int
    job_description_id: int
    overall_score: float
    created_at: datetime

    model_config = {"from_attributes": True}
