"""
Keyword extraction using KeyBERT + spaCy NER filtering.
Returns a deduplicated, ranked list of keyword strings.
"""
from __future__ import annotations

import re
from typing import List

from app.core.config import settings
from app.core.logging import get_logger
from app.infrastructure.ai.nlp_engine import get_keybert_model, get_spacy_nlp

logger = get_logger("ai.keyword_extractor")

# Regex to strip lone punctuation / single-character tokens
_CLEAN_RE = re.compile(r"^[\W_]+$")


def _clean_keywords(keywords: List[str]) -> List[str]:
    seen: set[str] = set()
    cleaned: List[str] = []

    for kw in keywords:
        kw = kw.strip().lower()
        if len(kw) >= 2 and not _CLEAN_RE.match(kw) and kw not in seen:
            seen.add(kw)
            cleaned.append(kw)

    return cleaned


def extract_keywords(text: str, top_n: int | None = None) -> List[str]:
    """
    Extract the most relevant keywords from `text` using KeyBERT.

    Args:
        text: Raw document text.
        top_n: Number of keywords to return.

    Returns:
        List of keyword strings.
    """
    if not text or not text.strip():
        return []

    kw_model = get_keybert_model()

    logger.info("Starting KeyBERT extraction")

    raw_keywords = kw_model.extract_keywords(
        text[:3000],
        keyphrase_ngram_range=(1, 2),
        stop_words="english",
        top_n=10,
    )

    logger.info("Finished KeyBERT extraction")

    keywords = [kw for kw, _score in raw_keywords]

    return _clean_keywords(keywords)


def extract_named_entities(text: str) -> List[str]:
    """
    Use spaCy NER to extract organisations, skills, and technology names
    (ORG, PRODUCT, GPE labels) as supplementary keywords.
    """
    nlp = get_spacy_nlp()

    doc = nlp(text[:100000])

    entities = [
        ent.text.strip().lower()
        for ent in doc.ents
        if ent.label_ in {"ORG", "PRODUCT", "GPE", "WORK_OF_ART"}
    ]

    return _clean_keywords(entities)