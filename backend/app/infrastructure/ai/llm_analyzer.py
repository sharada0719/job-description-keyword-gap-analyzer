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
Return compact JSON with exactly these keys:
{
  "resume_keywords": ["keyword"],
  "job_keywords": ["keyword"],
  "semantic_similarity": 0.0,
  "matched": [{"keyword":"...","score":1.0,"match_type":"exact|semantic|uncertain","evidence":"brief quote"}],
  "missing": ["keyword"]
}
Rules:
- Keep JSON compact and concise under 800 tokens.
- Scores are numbers from 0.0 to 1.0.
- Extract concrete technical skills, tools, frameworks, methods, and important domain terms.
- Keep technology names distinct: Java is not JavaScript; React is not Vue.
- Match aliases such as JS to JavaScript and Node to Node.js.
- Use exact for an explicit match, semantic for a strong equivalent, and uncertain only when plausible but unclear.
- Evidence must be a short quote (max 6 words) from the resume.
- Do not invent resume evidence or qualifications.
- Include each important job keyword in matched or missing.
"""

_TEXT_TRUNCATION_LIMIT = 12_000


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


# ── Async Groq helpers ──────────────────────────────────────────────────────


async def _groq_request(
    client: httpx.AsyncClient,
    model: str,
    prompt: str,
    system_prompt: str,
    headers: dict,
    max_tokens: int = 900,
) -> httpx.Response:
    """Send a single chat-completion request to Groq."""
    endpoint = "https://api.groq.com/openai/v1/chat/completions"
    request_body: Dict[str, Any] = {
        "model": model,
        "temperature": 0,
        "max_tokens": max_tokens,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt},
        ],
    }
    # Groq reasoning models can put the whole response in a hidden channel.
    if model.startswith("openai/"):
        request_body["reasoning_format"] = "hidden"
    return await client.post(endpoint, headers=headers, json=request_body)


async def _groq_call(prompt: str, system_prompt: str = _SYSTEM_PROMPT) -> str:
    """Call Groq chat completions with automatic model-fallback and retry."""
    headers = {"Authorization": f"Bearer {settings.GROQ_API_KEY}"}

    async with httpx.AsyncClient(timeout=120) as client:
        active_model = settings.GROQ_MODEL
        response = await _groq_request(client, active_model, prompt, system_prompt, headers, max_tokens=900)

        # Model-availability fallback
        if response.status_code == 404:
            models_response = await client.get(
                "https://api.groq.com/openai/v1/models",
                headers=headers,
                timeout=30,
            )
            if models_response.is_success:
                available = {
                    item.get("id")
                    for item in models_response.json().get("data", [])
                    if isinstance(item, dict)
                }
                candidates = [
                    "qwen/qwen3.8-27b",
                    "llama-3.3-70b-versatile",
                    "llama-3.1-8b-instant",
                    "openai/gpt-oss-120b",
                    "openai/gpt-oss-20b",
                    "meta-llama/llama-4-scout-17b-16e-instruct",
                    "qwen/qwen3-32b",
                ]
                fallback = next((m for m in candidates if m in available), None)
                if fallback:
                    logger.warning(
                        "Groq model '%s' unavailable; using '%s'",
                        settings.GROQ_MODEL, fallback,
                    )
                    active_model = fallback
                    response = await _groq_request(
                        client, fallback, prompt, system_prompt, headers, max_tokens=900
                    )

        # Rate-limit retry (429)
        if response.status_code == 429:
            retry_after = 3.0
            try:
                header_val = response.headers.get("retry-after")
                if header_val:
                    retry_after = max(1.0, min(float(header_val), 10.0))
            except (ValueError, TypeError):
                pass
            logger.warning("Groq rate limit exceeded (429); waiting %.1fs before retrying...", retry_after)
            await asyncio.sleep(retry_after)
            response = await _groq_request(
                client, active_model, prompt, system_prompt, headers, max_tokens=750
            )

        if response.is_error:
            detail = response.text[:500].replace("\n", " ")
            raise AIServiceError(
                f"Groq API returned HTTP {response.status_code}: {detail}"
            )

        message = response.json()["choices"][0]["message"]
        content = message.get("content")
        if not content:
            # Empty or reasoning-only response — retry once.
            retry = await _groq_request(
                client, active_model, prompt, system_prompt, headers, max_tokens=900
            )
            if retry.is_success:
                content = retry.json()["choices"][0]["message"].get("content")

    return content or ""


async def generate_hosted_text(prompt: str, system_prompt: str) -> str:
    """Generate text through Groq (async)."""
    if not settings.GROQ_API_KEY.strip():
        raise ValidationError("GROQ_API_KEY is not configured in the backend environment.")
    try:
        text = await _groq_call(prompt, system_prompt)
        if not text.strip():
            raise AIServiceError("Hosted AI returned an empty response.")
        return text.strip()
    except (ValidationError, AIServiceError):
        raise
    except Exception as exc:
        logger.exception("Hosted text generation failed")
        raise AIServiceError(f"Groq text generation failed: {exc}") from exc


async def analyze_resume_and_job(resume_text: str, job_text: str) -> Dict[str, Any]:
    if not settings.GROQ_API_KEY.strip():
        raise ValidationError("GROQ_API_KEY is not configured in the backend environment.")

    # Warn when input text is truncated
    if len(resume_text) > _TEXT_TRUNCATION_LIMIT:
        logger.warning(
            "Resume text truncated from %d to %d characters",
            len(resume_text), _TEXT_TRUNCATION_LIMIT,
        )
    if len(job_text) > _TEXT_TRUNCATION_LIMIT:
        logger.warning(
            "Job description text truncated from %d to %d characters",
            len(job_text), _TEXT_TRUNCATION_LIMIT,
        )

    prompt = (
        "Analyze these two documents. Return only the JSON structure requested.\n\n"
        f"RESUME:\n{resume_text[:_TEXT_TRUNCATION_LIMIT]}\n\n"
        f"JOB DESCRIPTION:\n{job_text[:_TEXT_TRUNCATION_LIMIT]}"
    )
    try:
        raw = await _groq_call(prompt)
        # Some Groq models reject response_format=json_object. The prompt still
        # requires JSON, and this accepts either plain JSON or a fenced block.
        cleaned = raw.strip()
        if not cleaned:
            raise AIServiceError("Groq returned an empty response. Try again.")
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
        try:
            payload = json.loads(cleaned)
        except json.JSONDecodeError:
            # Recover a JSON object when the model adds a short explanation.
            start = cleaned.find("{")
            end = cleaned.rfind("}")
            if start < 0 or end <= start:
                raise AIServiceError(
                    "Groq returned an invalid analysis response. Please try again."
                )
            payload = json.loads(cleaned[start : end + 1])
        if not isinstance(payload, dict):
            raise ValueError("LLM response was not a JSON object")
        return _normalise_result(payload)
    except (ValidationError, AIServiceError):
        raise
    except Exception as exc:
        logger.exception("Hosted AI analysis failed")
        raise AIServiceError(f"Groq analysis failed: {exc}") from exc
