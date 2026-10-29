"""
Job recommendation and search request / response DTOs.
"""
from typing import List, Optional

from pydantic import BaseModel, Field


class RecommendationRequest(BaseModel):
    analysis_id: int = Field(..., gt=0, description="ID of the existing analysis to base recommendations on.")
    location: Optional[str] = Field(
        None, max_length=100,
        description="Optional free-text location preference (e.g. 'London', 'Remote').",
    )
    include_internships: bool = Field(True, description="Include internship roles.")
    include_fulltime: bool = Field(True, description="Include full-time / graduate roles.")
    max_results: int = Field(8, ge=1, le=20, description="Maximum number of role suggestions.")


class SearchLinkDTO(BaseModel):
    label: str
    url: str


class RoleRecommendationDTO(BaseModel):
    title: str
    tags: List[str]
    description: str
    score: float
    matched_skills: List[str]
    search_links: List[SearchLinkDTO]


class RecommendationsResponse(BaseModel):
    analysis_id: int
    recommendations: List[RoleRecommendationDTO]
    top_boards: List[SearchLinkDTO]
    limitations: List[str]
    location_used: str


# ── Job Search DTOs ───────────────────────────────────────────────────────────


class JobSearchRequest(BaseModel):
    """Free-text job search with optional resume-based matching."""
    query: str = Field("", max_length=200, description="Search by job title, skill, or company.")
    location: Optional[str] = Field(None, max_length=100, description="Location preference.")
    remote: bool = Field(False, description="Filter for remote-friendly roles.")
    job_types: List[str] = Field(
        default_factory=list,
        description="Filters: 'internship', 'fresher', 'graduate_trainee', 'full_time'.",
    )
    # Optional: resume keywords for matching/ranking
    resume_keywords: List[str] = Field(
        default_factory=list,
        description="Resume skills to match against roles. Optional.",
    )
    max_results: int = Field(10, ge=1, le=30, description="Max role suggestions when resume_keywords are provided.")


class JobBoardResultDTO(BaseModel):
    """A search link on a specific job board, built from the user's query."""
    board: str
    label: str
    url: str
    description: str = ""


class JobSearchResponse(BaseModel):
    query: str
    location_used: str
    remote: bool
    job_types: List[str]
    board_results: List[JobBoardResultDTO]
    role_matches: List[RoleRecommendationDTO]
    limitations: List[str]
    has_resume_keywords: bool
