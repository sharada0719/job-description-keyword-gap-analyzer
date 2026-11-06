"""
Cover letter generator request / response DTOs.

Two modes are supported:
  1. By ID (preferred, secure) — pass resume_id and job_description_id; the
     backend fetches the stored text server-side so raw resume text never
     leaves the server.
  2. By raw text — pass resume_text, job_title, company_name, job_description
     directly (for flexibility / external integrations).

At least one source for the resume (resume_id OR resume_text) and one source
for the job (job_description_id OR job_title+job_description) must be provided.
"""
from typing import Optional

from pydantic import BaseModel, Field, model_validator


class CoverLetterRequest(BaseModel):
    # ── By-ID mode (preferred) ────────────────────────────────────────────
    resume_id: Optional[int] = Field(
        None, gt=0,
        description="ID of an existing resume owned by the user. If provided, "
        "the backend fetches the stored resume text server-side.",
    )
    job_description_id: Optional[int] = Field(
        None, gt=0,
        description="ID of an existing job description owned by the user. If "
        "provided, the backend fetches the stored job details server-side.",
    )

    # ── Raw-text mode (fallback) ──────────────────────────────────────────
    resume_text: Optional[str] = Field(
        None, min_length=1,
        description="Raw resume text. Used only if resume_id is not provided.",
    )
    job_title: Optional[str] = Field(
        None, min_length=1, max_length=255,
        description="Job title. Used only if job_description_id is not provided.",
    )
    company_name: Optional[str] = Field(
        None, max_length=255,
        description="Company name. Optional even in raw-text mode.",
    )
    job_description: Optional[str] = Field(
        None, min_length=1,
        description="Job description text. Used only if job_description_id is not provided.",
    )

    @model_validator(mode="after")
    def check_sources(self):
        """Ensure at least one resume source and one job source are provided."""
        if not self.resume_id and not self.resume_text:
            raise ValueError(
                "Either resume_id or resume_text must be provided."
            )
        if not self.job_description_id and not (self.job_title and self.job_description):
            raise ValueError(
                "Either job_description_id or both job_title and job_description must be provided."
            )
        return self


class CoverLetterResponse(BaseModel):
    status: str = "success"
    cover_letter: str
