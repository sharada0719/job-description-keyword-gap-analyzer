"""
Cover letter generation service using Google Gemini AI.

Generates a personalized, professional cover letter from the candidate's
resume and job details.  Never invents qualifications — only connects
real experience from the resume to the job requirements.
"""
from __future__ import annotations

from app.core.config import settings
from app.core.exceptions import AIServiceError, ValidationError
from app.core.logging import get_logger

logger = get_logger("services.cover_letter")

# ── Module-level import for testability ──────────────────────────────────────
# google-genai is a required dependency for this feature. The module-level
# import makes the client mockable in tests.
try:
    from google import genai
except ImportError:  # pragma: no cover
    genai = None  # type: ignore[assignment]

# ── Prompt template ──────────────────────────────────────────────────────────

_SYSTEM_INSTRUCTION = (
    "You are an expert professional career-writing assistant. Your task is to "
    "write personalized cover letters that connect a candidate's real "
    "qualifications to a specific job opening.\n\n"
    "STRICT RULES:\n"
    "- Generate exactly three professional paragraphs.\n"
    "- Use confident, concise, and natural language.\n"
    "- Connect the candidate's REAL skills and experience from their resume to "
    "the job requirements.\n"
    "- NEVER invent experience, skills, projects, or achievements that are not "
    "in the resume.\n"
    "- NEVER claim qualifications that do not exist in the resume.\n"
    "- Avoid generic, filler content — every sentence should be specific.\n"
    "- Avoid unnecessary placeholders like [Your Name] or [Date].\n"
    "- Do not include a header, date, or address block — just the three "
    "paragraphs of the letter body.\n"
    "- Start directly with a strong opening paragraph.\n"
)


def _build_prompt(
    resume_text: str,
    job_title: str,
    company_name: str,
    job_description: str,
) -> str:
    company_line = f" at {company_name}" if company_name else ""
    return (
        f"Write a personalized cover letter for the following job:\n\n"
        f"Job Title: {job_title}\n"
        f"Company: {company_name or 'the company'}\n\n"
        f"Job Description:\n{job_description}\n\n"
        f"Candidate's Resume:\n{resume_text}\n\n"
        f"Generate a professional cover letter consisting of exactly three "
        f"paragraphs for the {job_title} role{company_line}. "
        f"Base every claim on the actual content of the resume above. "
        f"Do not fabricate any experience or skill."
    )


# ── Public API ───────────────────────────────────────────────────────────────


def generate_cover_letter(
    resume_text: str,
    job_title: str,
    company_name: str,
    job_description: str,
) -> str:
    """
    Generate a cover letter using Google Gemini.

    Args:
        resume_text:      Full extracted resume text.
        job_title:        Target job title.
        company_name:     Target company (may be empty).
        job_description:  Full job description text.

    Returns:
        Generated cover letter text (three paragraphs).

    Raises:
        ValidationError:  If required inputs are missing or the API key is absent.
        AIServiceError:  If the Gemini API call fails.
    """
    # ── Validate inputs ────────────────────────────────────────────────────
    if not resume_text or not resume_text.strip():
        raise ValidationError("Resume text is required to generate a cover letter.")
    if not job_title or not job_title.strip():
        raise ValidationError("Job title is required to generate a cover letter.")
    if not job_description or not job_description.strip():
        raise ValidationError("Job description is required to generate a cover letter.")

    # ── Check API key ──────────────────────────────────────────────────────
    api_key = settings.GEMINI_API_KEY
    if not api_key or not api_key.strip():
        raise ValidationError(
            "Gemini API key is not configured. Set GEMINI_API_KEY in the "
            "backend .env file. Get a key at https://aistudio.google.com/apikey"
        )

    # ── Call Gemini ────────────────────────────────────────────────────────
    try:
        if genai is None:
            raise AIServiceError(
                "google-genai package is not installed. Run: pip install google-genai"
            )

        client = genai.Client(api_key=api_key)
        prompt = _build_prompt(resume_text, job_title, company_name, job_description)

        logger.info(
            "Generating cover letter: job_title='%s' company='%s' model='%s'",
            job_title, company_name or "(none)", settings.GEMINI_MODEL,
        )

        response = client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=prompt,
        )

        cover_letter = response.text

        if not cover_letter or not cover_letter.strip():
            raise AIServiceError(
                "Gemini returned an empty response. Please try again."
            )

        logger.info("Cover letter generated successfully (%d chars)", len(cover_letter))
        return cover_letter.strip()

    except (ValidationError, AIServiceError):
        raise
    except Exception as exc:
        logger.error("Gemini API call failed: %s", exc)
        raise AIServiceError(
            f"Failed to generate cover letter: {exc}"
        ) from exc
