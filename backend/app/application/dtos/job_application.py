"""
Job application tracker request / response DTOs.
"""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

# Valid application statuses
APPLICATION_STATUSES = {"saved", "applied", "interview", "offered", "rejected"}


class JobApplicationCreateRequest(BaseModel):
    job_title: str = Field(..., min_length=1, max_length=255)
    company_name: Optional[str] = Field(None, max_length=255)
    job_location: Optional[str] = Field(None, max_length=255)
    job_description: Optional[str] = None
    job_url: Optional[str] = None
    contact_email: Optional[str] = Field(None, max_length=255)
    notes: Optional[str] = None


class JobApplicationUpdateRequest(BaseModel):
    job_title: Optional[str] = Field(None, min_length=1, max_length=255)
    company_name: Optional[str] = Field(None, max_length=255)
    job_location: Optional[str] = Field(None, max_length=255)
    job_description: Optional[str] = None
    job_url: Optional[str] = None
    contact_email: Optional[str] = Field(None, max_length=255)
    notes: Optional[str] = None


class JobApplicationStatusRequest(BaseModel):
    application_status: str = Field(..., description="One of: saved, applied, interview, offered, rejected")


class JobApplicationResponse(BaseModel):
    id: int
    user_id: int
    job_title: str
    company_name: Optional[str]
    job_location: Optional[str]
    job_description: Optional[str]
    job_url: Optional[str]
    contact_email: Optional[str]
    application_status: str
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ApplicationStatsResponse(BaseModel):
    total: int
    saved: int
    applied: int
    interview: int
    offered: int
    rejected: int
