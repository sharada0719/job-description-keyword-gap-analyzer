"""
Tests for the AI Cover Letter Generator.

Tests cover:
  - DTO validation (by-ID mode, raw-text mode, mixed, invalid).
  - Service validation (missing inputs and missing API key).
  - Successful generation (with a mocked Groq service).
  - No-fabrication prompt constraints.
"""
from unittest.mock import patch

import pytest

from app.application.dtos.cover_letter import CoverLetterRequest
from app.application.services.cover_letter_service import (
    generate_cover_letter,
    _build_prompt,
    _SYSTEM_INSTRUCTION,
)
from app.core.exceptions import ValidationError, AIServiceError


# ── DTO validation ────────────────────────────────────────────────────────────

def test_dto_accepts_by_id_mode():
    req = CoverLetterRequest(resume_id=1, job_description_id=2)
    assert req.resume_id == 1
    assert req.job_description_id == 2


def test_dto_accepts_raw_text_mode():
    req = CoverLetterRequest(
        resume_text="My resume", job_title="Engineer",
        job_description="Job desc",
    )
    assert req.resume_text == "My resume"
    assert req.job_title == "Engineer"


def test_dto_accepts_mixed_mode():
    req = CoverLetterRequest(
        resume_id=1, job_title="Engineer", job_description="Job desc",
    )
    assert req.resume_id == 1
    assert req.job_title == "Engineer"


def test_dto_rejects_no_resume_source():
    with pytest.raises(Exception):
        CoverLetterRequest(job_title="Engineer", job_description="desc")


def test_dto_rejects_no_job_source():
    with pytest.raises(Exception):
        CoverLetterRequest(resume_text="resume")


def test_dto_rejects_partial_job_raw_text():
    # job_title without job_description should fail
    with pytest.raises(Exception):
        CoverLetterRequest(resume_text="resume", job_title="Engineer")


def test_dto_company_name_optional_in_raw_mode():
    req = CoverLetterRequest(
        resume_text="resume", job_title="Engineer", job_description="desc",
    )
    assert req.company_name is None


# ── Service validation ────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_missing_resume_text_raises_validation_error():
    with patch("app.application.services.cover_letter_service.settings") as mock_settings:
        mock_settings.GROQ_API_KEY = "fake-key"
        with pytest.raises(ValidationError, match="Resume text is required"):
            await generate_cover_letter("", "Engineer", "Corp", "Job desc")


@pytest.mark.asyncio
async def test_missing_job_title_raises_validation_error():
    with patch("app.application.services.cover_letter_service.settings") as mock_settings:
        mock_settings.GROQ_API_KEY = "fake-key"
        with pytest.raises(ValidationError, match="Job title is required"):
            await generate_cover_letter("resume", "", "Corp", "Job desc")


@pytest.mark.asyncio
async def test_missing_job_description_raises_validation_error():
    with patch("app.application.services.cover_letter_service.settings") as mock_settings:
        mock_settings.GROQ_API_KEY = "fake-key"
        with pytest.raises(ValidationError, match="Job description is required"):
            await generate_cover_letter("resume", "Engineer", "Corp", "")


@pytest.mark.asyncio
async def test_missing_api_key_raises_validation_error():
    with patch("app.application.services.cover_letter_service.settings") as mock_settings:
        mock_settings.GROQ_API_KEY = ""
        with patch("app.infrastructure.ai.llm_analyzer.settings") as mock_ai_settings:
            mock_ai_settings.GROQ_API_KEY = ""
            with pytest.raises(ValidationError, match="GROQ_API_KEY is not configured"):
                await generate_cover_letter("resume", "Engineer", "Corp", "Job desc")


@pytest.mark.asyncio
async def test_whitespace_api_key_raises_validation_error():
    with patch("app.application.services.cover_letter_service.settings") as mock_settings:
        mock_settings.GROQ_API_KEY = "   "
        with patch("app.infrastructure.ai.llm_analyzer.settings") as mock_ai_settings:
            mock_ai_settings.GROQ_API_KEY = "   "
            with pytest.raises(ValidationError, match="GROQ_API_KEY"):
                await generate_cover_letter("resume", "Engineer", "Corp", "Job desc")


# ── Groq API failure ──────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_groq_api_failure_raises_ai_service_error():
    with patch("app.application.services.cover_letter_service.settings") as mock_settings:
        mock_settings.GROQ_API_KEY = "fake-key"
        with patch(
            "app.application.services.cover_letter_service.generate_hosted_text",
            side_effect=RuntimeError("API timeout"),
        ):
            with pytest.raises(AIServiceError, match="Failed to generate cover letter"):
                await generate_cover_letter("resume", "Engineer", "Corp", "Job desc")


@pytest.mark.asyncio
async def test_groq_empty_response_raises_ai_service_error():
    with patch("app.application.services.cover_letter_service.settings") as mock_settings:
        mock_settings.GROQ_API_KEY = "fake-key"
        with patch(
            "app.application.services.cover_letter_service.generate_hosted_text",
            return_value="",
        ):
            with pytest.raises(AIServiceError, match="empty response"):
                await generate_cover_letter("resume", "Engineer", "Corp", "Job desc")


# ── Successful generation (mock) ─────────────────────────────────────────────

@pytest.mark.asyncio
async def test_successful_generation_returns_text():
    expected_letter = "Dear Hiring Manager,\n\nI am writing to express my interest..."
    with patch("app.application.services.cover_letter_service.settings") as mock_settings:
        mock_settings.GROQ_API_KEY = "fake-key"
        with patch(
            "app.application.services.cover_letter_service.generate_hosted_text",
            return_value=expected_letter,
        ):
            result = await generate_cover_letter(
                resume_text="Python developer with 5 years experience",
                job_title="Senior Python Developer",
                company_name="Tech Corp",
                job_description="Looking for a Python developer with Django experience",
            )
            assert result == expected_letter


@pytest.mark.asyncio
async def test_successful_generation_without_company():
    expected_letter = "Dear Hiring Manager..."
    with patch("app.application.services.cover_letter_service.settings") as mock_settings:
        mock_settings.GROQ_API_KEY = "fake-key"
        with patch(
            "app.application.services.cover_letter_service.generate_hosted_text",
            return_value=expected_letter,
        ):
            result = await generate_cover_letter(
                resume_text="resume text", job_title="Engineer",
                company_name="", job_description="job desc",
            )
            assert result == expected_letter


# ── Prompt constraints ───────────────────────────────────────────────────────

def test_prompt_contains_resume_and_job_info():
    prompt = _build_prompt(
        resume_text="Experienced Python developer",
        job_title="Senior Developer",
        company_name="Acme Corp",
        job_description="We need a Python expert",
    )
    assert "Experienced Python developer" in prompt
    assert "Senior Developer" in prompt
    assert "Acme Corp" in prompt
    assert "We need a Python expert" in prompt


def test_prompt_requests_three_paragraphs():
    prompt = _build_prompt("resume", "Engineer", "Corp", "desc")
    assert "three" in prompt.lower() or "3" in prompt


def test_system_instruction_forbids_fabrication():
    assert "never invent" in _SYSTEM_INSTRUCTION.lower() or "never claim" in _SYSTEM_INSTRUCTION.lower()
    assert "three" in _SYSTEM_INSTRUCTION.lower()


# ── Reproducibility (same prompt for same inputs) ─────────────────────────────

def test_prompt_is_deterministic():
    p1 = _build_prompt("resume", "Engineer", "Corp", "desc")
    p2 = _build_prompt("resume", "Engineer", "Corp", "desc")
    assert p1 == p2
