"""
JobDescription request / response DTOs.
"""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class JobDescriptionCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    company: Optional[str] = Field(None, max_length=255)
    raw_text: str = Field(..., min_length=10)


class JobDescriptionUpdateRequest(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    company: Optional[str] = Field(None, max_length=255)
    raw_text: Optional[str] = Field(None, min_length=10)


class JobDescriptionResponse(BaseModel):
    id: int
    user_id: int
    title: str
    company: Optional[str]
    raw_text: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
