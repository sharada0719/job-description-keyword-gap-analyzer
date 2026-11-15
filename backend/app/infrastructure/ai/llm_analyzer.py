"""Hosted LLM analysis for resume/job-description matching."""
from __future__ import annotations

import asyncio
import json
from typing import Any, Dict, List

import httpx

from app.core.config import settings
from app.core.exceptions import AIServiceError, ValidationError
from app.core.logging import get_logger
from app.infrastructure.ai.skill_taxonomy import normalize_keyword

logger = get_logger("ai.llm_analyzer")

_SYSTEM_PROMPT = """You are a precise resume and job-description analyzer.
Return only valid JSON with exactly these keys:
{
  "resume_keywords": ["keyword"],
  "job_keywords": ["keyword"],
  "semantic_similarity": 0.0,
  "matched": [{"keyword":"...","score":0.0,"match_type":"exact|semantic|uncertain","best_match":"...","evidence":"..."}],
  "missing": [{"keyword":"...","best_match":null,"best_sim":0.0}]
}
Rules:
- Scores are numbers from 0.0 to 1.0.
- Extract concrete technical skills, tools, frameworks, methods, and important domain terms.
- Keep technology names distinct: Java is not JavaScript; React is not Vue.
- Match aliases such as JS to JavaScript and Node to Node.js.
- Use exact for an explicit match, semantic for a strong equivalent, and uncertain only when plausible but unclear.
- Evidence must be a short quote from the resume when available.
- Do not invent resume evidence or qualifications.
- Include each important job keyword exactly once in matched or missing.
"""


def _clamp(value: Any) -> float:
    try:
        return round(max(0.0, min(1.0, float(value))), 4)
    except (TypeError, ValueError):
        return 0.0


def _normalise_keywords(values: Any) -> List[str]:
    if not isinstance(values, list):
        return []
    result: List[str] = []
    seen = set()
    for value in values:
        if not isinstance(value, str):
            continue
        keyword = normalize_keyword(value)
        if len(keyword) >= 2 and keyword not in seen:
            seen.add(keyword)
            result.append(keyword)
    return result


def _normalise_result(payload: Dict[str, Any]) -> Dict[str, Any]:
    resume_keywords = _normalise_keywords(payload.get("resume_keywords"))
    job_keywords = _normalise_keywords(payload.get("job_keywords"))
    job_set = set(job_keywords)
    matched: List[Dict[str, Any]] = []
    matched_set = set()

    for item in payload.get("matched", []) if isinstance(payload.get("matched"), list) else []:
        if not isinstance(item, dict):
            continue
        keyword = normalize_keyword(str(item.get("keyword", "")))
        if not keyword or keyword not in job_set or keyword in matched_set:
            continue
        match_type = str(item.get("match_type", "semantic")).lower()
        if match_type not in {"exact", "semantic", "uncertain"}:
            match_type = "semantic"
        best_match = item.get("best_match")
        matched.append({
            "keyword": keyword,
            "score": _clamp(item.get("score")),
            "match_type": match_type,
            "best_match": normalize_keyword(best_match) if isinstance(best_match, str) else None,
            "evidence": item.get("evidence") if isinstance(item.get("evidence"), str) else None,
        })
        matched_set.add(keyword)

    missing: List[Dict[str, Any]] = []
    missing_set = set()
    for item in payload.get("missing", []) if isinstance(payload.get("missing"), list) else []:
        if isinstance(item, str):
            item = {"keyword": item}
        if not isinstance(item, dict):
            continue
        keyword = normalize_keyword(str(item.get("keyword", "")))
        if not keyword or keyword not in job_set or keyword in matched_set or keyword in missing_set:
            continue
        missing.append({
            "keyword": keyword,
            "best_match": normalize_keyword(item["best_match"]) if isinstance(item.get("best_match"), str) else None,
            "best_sim": _clamp(item.get("best_sim")),
        })
        missing_set.add(keyword)

    # Keep the persisted result internally consistent if the model omitted a term.
    for keyword in job_keywords:
        if keyword not in matched_set and keyword not in missing_set:
            missing.append({"keyword": keyword, "best_match": None, "best_sim": 0.0})

    weight = 0.0
    for item in matched:
        weight += 1.0 if item["match_type"] == "exact" else (
            item["score"] * 0.5 if item["match_type"] == "uncertain" else item["score"]
        )
    keyword_score = round(weight / len(job_keywords), 4) if job_keywords else 0.0
    return {
        "resume_keywords": resume_keywords,
        "job_keywords": job_keywords,
        "semantic_similarity": _clamp(payload.get("semantic_similarity")),
        "matched": matched,
        "missing": missing,
        "keyword_score": keyword_score,
    }


def _gemini_call(prompt: str, system_prompt: str = _SYSTEM_PROMPT) -> str:
    from google import genai
    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    response = client.models.generate_content(
        model=settings.AI_ANALYSIS_MODEL,
        contents=prompt,
        config={"system_instruction": system_prompt, "response_mime_type": "application/json"},
    )
    return response.text or ""


def _groq_call(prompt: str, system_prompt: str = _SYSTEM_PROMPT) -> str:
    response = httpx.post(
        "https://api.groq.com/openai/v1/chat/completions",
        headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}"},
        json={
            "model": settings.GROQ_MODEL,
            "temperature": 0,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt},
            ],
        },
        timeout=120,
    )
    response.raise_for_status()
    return response.json()["choices"][0]["message"]["content"]


def generate_hosted_text(prompt: str, system_prompt: str) -> str:
    """Generate text through the configured Gemini or Groq provider."""
    if settings.AI_PROVIDER == "gemini" and not settings.GEMINI_API_KEY.strip():
        raise ValidationError("GEMINI_API_KEY is not configured in the backend environment.")
    if settings.AI_PROVIDER == "groq" and not settings.GROQ_API_KEY.strip():
        raise ValidationError("GROQ_API_KEY is not configured in the backend environment.")
    if settings.AI_PROVIDER not in {"gemini", "groq"}:
        raise ValidationError("AI_PROVIDER must be either gemini or groq.")
    try:
        caller = _gemini_call if settings.AI_PROVIDER == "gemini" else _groq_call
        text = caller(prompt, system_prompt)
        if not text.strip():
            raise AIServiceError("Hosted AI returned an empty response.")
        return text.strip()
    except (ValidationError, AIServiceError):
        raise
    except Exception as exc:
        logger.exception("Hosted text generation failed")
        raise AIServiceError(f"{settings.AI_PROVIDER.title()} text generation failed: {exc}") from exc


async def analyze_resume_and_job(resume_text: str, job_text: str) -> Dict[str, Any]:
    if not settings.AI_PROVIDER:
        raise ValidationError("Set AI_PROVIDER to gemini or groq in the backend environment.")
    if settings.AI_PROVIDER == "gemini" and not settings.GEMINI_API_KEY.strip():
        raise ValidationError("GEMINI_API_KEY is not configured in the backend environment.")
    if settings.AI_PROVIDER == "groq" and not settings.GROQ_API_KEY.strip():
        raise ValidationError("GROQ_API_KEY is not configured in the backend environment.")
    if settings.AI_PROVIDER not in {"gemini", "groq"}:
        raise ValidationError("AI_PROVIDER must be either gemini or groq.")

    prompt = (
        "Analyze these two documents. Return only the JSON structure requested.\n\n"
        f"RESUME:\n{resume_text[:12000]}\n\nJOB DESCRIPTION:\n{job_text[:12000]}"
    )
    try:
        raw = await asyncio.to_thread(_gemini_call if settings.AI_PROVIDER == "gemini" else _groq_call, prompt)
        payload = json.loads(raw)
        if not isinstance(payload, dict):
            raise ValueError("LLM response was not a JSON object")
        return _normalise_result(payload)
    except (ValidationError, AIServiceError):
        raise
    except Exception as exc:
        logger.exception("Hosted AI analysis failed")
        raise AIServiceError(f"{settings.AI_PROVIDER.title()} analysis failed: {exc}") from exc
