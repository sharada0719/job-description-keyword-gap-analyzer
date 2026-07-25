"""
Resume request / response DTOs.
"""
from datetime import datetime

from pydantic import BaseModel, Field


class ResumeResponse(BaseModel):
    id: int
    user_id: int
    title: str
    original_filename: str
    file_type: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ResumeCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
