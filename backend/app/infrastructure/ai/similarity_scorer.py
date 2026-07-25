"""
Semantic similarity scoring using Sentence Transformers.

Provides two scoring functions:
  1. document_similarity  — overall cosine similarity between two texts
  2. keyword_match_score  — per-keyword similarity against a reference set
"""
from __future__ import annotations

from typing import List, Tuple

import numpy as np

from app.core.config import settings
from app.core.logging import get_logger
from app.infrastructure.ai.nlp_engine import get_sentence_model

logger = get_logger("ai.similarity_scorer")


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


def keyword_match_scores(
    resume_keywords: List[str],
    job_keywords: List[str],
    threshold: float | None = None,
) -> Tuple[List[Tuple[str, float]], List[str]]:
    """
    For each job keyword, find the best matching resume keyword via
    semantic similarity.

    Returns:
        matched  : List of (job_keyword, best_score) where score >= threshold
        missing  : Job keywords whose best match score < threshold
    """
    if not resume_keywords or not job_keywords:
        return [], list(job_keywords)

    cutoff = threshold if threshold is not None else settings.SIMILARITY_THRESHOLD
    model = get_sentence_model()

    resume_embeddings = model.encode(
        resume_keywords,
        batch_size=64,
        show_progress_bar=False,
        normalize_embeddings=True,
    )
    job_embeddings = model.encode(
        job_keywords,
        batch_size=64,
        show_progress_bar=False,
        normalize_embeddings=True,
    )

    # Compute full similarity matrix  (job_count × resume_count)
    sim_matrix: np.ndarray = np.dot(job_embeddings, resume_embeddings.T)

    matched: List[Tuple[str, float]] = []
    missing: List[str] = []

    for idx, job_kw in enumerate(job_keywords):
        best_score = float(sim_matrix[idx].max()) if sim_matrix[idx].size else 0.0
        if best_score >= cutoff:
            matched.append((job_kw, round(best_score, 4)))
        else:
            missing.append(job_kw)

    return matched, missing
