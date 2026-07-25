"""
Resume endpoints — upload, list, retrieve, delete.
"""
from typing import List

from fastapi import APIRouter, File, Form, UploadFile

from app.application.dtos.common import MessageResponse
from app.application.dtos.resume import ResumeResponse
from app.application.services.resume_service import ResumeService
from app.core.dependencies import CurrentUser, DBSession

router = APIRouter(prefix="/resumes", tags=["Resumes"])


@router.post("/upload", response_model=ResumeResponse, status_code=201)
async def upload_resume(
    current_user: CurrentUser,
    db: DBSession,
    file: UploadFile = File(..., description="PDF or DOCX resume file"),
    title: str = Form(..., min_length=1, max_length=255),
) -> ResumeResponse:
    """Upload a resume file (PDF or DOCX). Text is extracted and stored."""
    file_bytes = await file.read()
    service = ResumeService(db)
    return await service.upload_resume(
        user_id=current_user.id,
        filename=file.filename or "upload",
        file_bytes=file_bytes,
        title=title,
    )


@router.get("/", response_model=List[ResumeResponse])
async def list_resumes(
    current_user: CurrentUser,
    db: DBSession,
    skip: int = 0,
    limit: int = 50,
) -> List[ResumeResponse]:
    """List all resumes belonging to the authenticated user."""
    service = ResumeService(db)
    return await service.list_resumes(current_user.id, skip=skip, limit=limit)


@router.get("/{resume_id}", response_model=ResumeResponse)
async def get_resume(
    resume_id: int,
    current_user: CurrentUser,
    db: DBSession,
) -> ResumeResponse:
    """Get a single resume by ID."""
    service = ResumeService(db)
    return await service.get_resume(resume_id, current_user.id)


@router.delete("/{resume_id}", response_model=MessageResponse)
async def delete_resume(
    resume_id: int,
    current_user: CurrentUser,
    db: DBSession,
) -> MessageResponse:
    """Delete a resume and all associated analyses."""
    service = ResumeService(db)
    await service.delete_resume(resume_id, current_user.id)
    return MessageResponse(message=f"Resume {resume_id} deleted successfully.")
