"""
Semantic similarity scoring using Sentence Transformers.

Provides:
  1. ``document_similarity``   — overall cosine similarity between two texts.
  2. ``match_keywords``         — combined exact / alias / semantic matching
     with confusable-technology guards, an "uncertain" band, and resume
     evidence snippets.  Returns rich, explainable match records.
  3. ``keyword_match_scores``   — backward-compatible shim that returns the
     legacy ``(matched, missing)`` tuple shape.

Matching rules (reproducible & explainable):
  * Exact / alias match (after normalisation)  → score 1.0, type "exact".
  * Confusable distinct technologies           → NOT matched, even when the
    embedding similarity is high (java vs javascript, react vs vue, ...).
  * Strong semantic match (>= SIMILARITY_THRESHOLD, not confusable)
                                              → type "semantic", score = sim.
  * Uncertain match (>= UNCERTAIN_MATCH_MIN and < threshold)
                                              → type "uncertain", half weight.
  * Otherwise                                  → "not found" (missing).
"""
from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

from app.core.config import settings
from app.core.logging import get_logger
from app.infrastructure.ai.nlp_engine import get_sentence_model
from app.infrastructure.ai.skill_taxonomy import canonical_set, is_confusable

logger = get_logger("ai.similarity_scorer")

_WS_RE = re.compile(r"\s+")

# Maximum characters of resume context to keep as evidence per match.
_EVIDENCE_PAD = 60


def _cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """Compute cosine similarity between two 1-D vectors."""
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(a, b) / (norm_a * norm_b))


def document_similarity(text_a: str, text_b: str) -> float:
    """
    Return overall semantic similarity [0, 1] between two documents.
    Uses the mean pooled sentence embedding of each full text.
    """
    model = get_sentence_model()
    # Truncate to 512 tokens-worth of chars to keep inference fast
    embeddings = model.encode(
        [text_a[:4096], text_b[:4096]],
        batch_size=2,
        show_progress_bar=False,
        normalize_embeddings=True,
    )
    score = float(np.dot(embeddings[0], embeddings[1]))
    return max(0.0, min(1.0, score))  # clamp to [0, 1]


def _find_evidence(resume_text: str, term: str) -> Optional[str]:
    """
    Return a short, original-case context window around the first occurrence
    of ``term`` in ``resume_text``, or ``None`` if the term is not present.
    Whitespace is collapsed for readability.
    """
    if not resume_text or not term:
        return None
    haystack = resume_text.lower()
    needle = term.lower()
    idx = haystack.find(needle)
    if idx == -1:
        return None
    start = max(0, idx - _EVIDENCE_PAD)
    end = min(len(resume_text), idx + len(term) + _EVIDENCE_PAD)
    snippet = _WS_RE.sub(" ", resume_text[start:end]).strip()
    prefix = "…" if start > 0 else ""
    suffix = "…" if end < len(resume_text) else ""
    return f"{prefix}{snippet}{suffix}"


def match_keywords(
    resume_keywords: List[str],
    job_keywords: List[str],
    resume_text: str = "",
    threshold: Optional[float] = None,
    model: Any = None,
) -> Dict[str, Any]:
    """
    Match job keywords against resume keywords using exact, alias, and
    semantic similarity, with confusable-technology guards.

    Returns a dict::

        {
          "matched": [ {keyword, score, match_type, best_match, evidence}, ... ],
          "missing": [ {keyword, best_match, best_sim}, ... ],
          "score":   float,        # weighted coverage in [0, 1]
        }

    Match weights used for the coverage score:
      exact      → 1.0
      semantic   → the embedding similarity
      uncertain  → 0.5 × the embedding similarity
    """
    # Normalise + de-duplicate to avoid double-counting.
    resume_kw = canonical_set(resume_keywords)
    job_kw = canonical_set(job_keywords)

    if not job_kw:
        return {"matched": [], "missing": [], "score": 0.0}
    if not resume_kw:
        return {
            "matched": [],
            "missing": [{"keyword": k, "best_match": None, "best_sim": 0.0} for k in job_kw],
            "score": 0.0,
        }

    cutoff = threshold if threshold is not None else settings.SIMILARITY_THRESHOLD
    uncertain_min = settings.UNCERTAIN_MATCH_MIN

    encoder = model if model is not None else get_sentence_model()
    resume_emb = encoder.encode(
        resume_kw,
        batch_size=64,
        show_progress_bar=False,
        normalize_embeddings=True,
    )
    job_emb = encoder.encode(
        job_kw,
        batch_size=64,
        show_progress_bar=False,
        normalize_embeddings=True,
    )

    # Full similarity matrix (job_count × resume_count)
    sim_matrix: np.ndarray = np.dot(job_emb, resume_emb.T)
    resume_set = set(resume_kw)

    matched: List[Dict[str, Any]] = []
    missing: List[Dict[str, Any]] = []
    weight = 0.0

    for idx, job_kw_term in enumerate(job_kw):
        row = sim_matrix[idx]
        best_idx = int(np.argmax(row)) if row.size else 0
        best_sim = float(row[best_idx]) if row.size else 0.0
        best_rk = resume_kw[best_idx]

        # 1) Exact / alias match (canonical equality)
        if job_kw_term in resume_set:
            matched.append(
                {
                    "keyword": job_kw_term,
                    "score": 1.0,
                    "match_type": "exact",
                    "best_match": job_kw_term,
                    "evidence": _find_evidence(resume_text, job_kw_term),
                }
            )
            weight += 1.0
            continue

        # 2) Confusable distinct technologies — do NOT accept semantic match,
        #    even when the embedding similarity is very high (java vs
        #    javascript, react vs vue, ...).
        if is_confusable(job_kw_term, best_rk):
            missing.append(
                {
                    "keyword": job_kw_term,
                    "best_match": best_rk,
                    "best_sim": round(best_sim, 4),
                }
            )
            continue

        # 3) Strong semantic match
        if best_sim >= cutoff:
            matched.append(
                {
                    "keyword": job_kw_term,
                    "score": round(best_sim, 4),
                    "match_type": "semantic",
                    "best_match": best_rk,
                    "evidence": _find_evidence(resume_text, best_rk),
                }
            )
            weight += best_sim
            continue

        # 4) Uncertain band — shown as a match but with reduced weight
        if best_sim >= uncertain_min:
            matched.append(
                {
                    "keyword": job_kw_term,
                    "score": round(best_sim, 4),
                    "match_type": "uncertain",
                    "best_match": best_rk,
                    "evidence": _find_evidence(resume_text, best_rk),
                }
            )
            weight += best_sim * 0.5
            continue

        # 5) Not found
        missing.append(
            {
                "keyword": job_kw_term,
                "best_match": best_rk,
                "best_sim": round(best_sim, 4),
            }
        )

    score = weight / len(job_kw) if job_kw else 0.0
    return {
        "matched": matched,
        "missing": missing,
        "score": round(score, 4),
    }


def keyword_match_scores(
    resume_keywords: List[str],
    job_keywords: List[str],
    threshold: float | None = None,
    model: Any = None,
) -> Tuple[List[Tuple[str, float]], List[str]]:
    """
    Backward-compatible shim over :func:`match_keywords`.

    Returns the legacy shape ``(matched, missing)`` where ``matched`` is a
    list of ``(keyword, score)`` tuples and ``missing`` is a list of keyword
    strings.  Newer code should call :func:`match_keywords` directly to obtain
    match types, best-match, and evidence.  ``model`` is forwarded for
    testability; production callers omit it.
    """
    result = match_keywords(
        resume_keywords,
        job_keywords,
        resume_text="",
        threshold=threshold,
        model=model,
    )
    matched = [(m["keyword"], m["score"]) for m in result["matched"]]
    missing = [m["keyword"] for m in result["missing"]]
    return matched, missing
