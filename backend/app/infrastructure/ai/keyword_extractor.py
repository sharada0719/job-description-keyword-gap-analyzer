"""
Keyword extraction using KeyBERT + spaCy NER filtering, augmented with a
curated technical-skills scan that guarantees preservation of terms such as
C++, C#, .NET, Node.js, CI/CD, REST APIs, SQL and JavaScript.

Returns a deduplicated, normalised, ranked list of keyword strings.
"""
from __future__ import annotations

import re
from typing import List

from app.core.config import settings
from app.core.logging import get_logger
from app.infrastructure.ai.nlp_engine import get_keybert_model, get_spacy_nlp
from app.infrastructure.ai.skill_taxonomy import (
    canonical_set,
    find_known_skills,
    is_generic_noise,
    normalize_keyword,
)

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


def reduce_keyword_noise(keybert_kws: List[str], known_kws: List[str]) -> List[str]:
    """
    Strip noisy KeyBERT keyphrases that duplicate or fragment real skills.

    Drops:
      * generic filler words.
      * single-token fragments of a curated skill (``apis`` of ``rest apis``,
        ``ci`` of ``ci/cd``, ``net`` of ``.net``, ``js`` of ``javascript``) —
        but never the curated skill itself.
      * multi-word composites that are not curated skills but contain a
        curated skill as a component word (``aws docker``, ``microservices
        aws``, ``javascript built``) — the atomic skills are already kept.

    Curated skills (``known_kws``) and genuine multi-word keyphrases whose
    words are not curated skills are always retained.
    """
    known_set = set(known_kws)
    result: List[str] = []
    seen: set[str] = set()

    for kw in keybert_kws:
        norm = normalize_keyword(kw)
        if len(norm) < 2 or norm in seen or is_generic_noise(norm):
            continue
        seen.add(norm)

        is_single_token = " " not in norm
        if is_single_token and norm not in known_set:
            # Drop non-curated fragments of a curated skill.
            if any(norm != ks and norm in ks for ks in known_set):
                continue

        if not is_single_token and norm not in known_set:
            # Drop composites glued onto a curated skill.
            words = [normalize_keyword(w) for w in norm.split()]
            if any(w in known_set for w in words):
                continue

        result.append(norm)

    return result


def extract_keywords(text: str, top_n: int | None = None) -> List[str]:
    """
    Extract the most relevant keywords from ``text``.

    Combines three sources, then normalises, de-duplicates, and reduces
    noise:
      1. KeyBERT keyphrases (ranked by relevance to the document).
      2. Curated technical skills guaranteed to be preserved (scanned over
         the *full* text, so skills beyond KeyBERT's 3000-char window are not
         lost).
      3. spaCy named entities (optional supplement).

    Args:
        text: Raw document text.
        top_n: Number of KeyBERT keyphrases to request. Defaults to
            ``settings.KEYBERT_TOP_N``.

    Returns:
        List of normalised, de-duplicated keyword strings.
    """
    if not text or not text.strip():
        return []

    requested = top_n if top_n is not None else settings.KEYBERT_TOP_N

    # ── 1. KeyBERT keyphrases (ranked) ───────────────────────────────────────
    logger.info("Starting KeyBERT extraction (top_n=%d)", requested)
    kw_model = get_keybert_model()
    raw_keywords = kw_model.extract_keywords(
        text[:3000],
        keyphrase_ngram_range=(1, 2),
        stop_words="english",
        top_n=requested,
    )
    logger.info("Finished KeyBERT extraction")
    keybert_kws = [normalize_keyword(kw) for kw, _score in raw_keywords]

    # ── 2. Curated technical skills (guaranteed preservation) ───────────────
    known_kws = find_known_skills(text)

    # ── 3. Merge: clean keyphrases first (ranked), then guaranteed skills not
    #       already captured, so nothing important is lost.
    clean_keybert = reduce_keyword_noise(keybert_kws, known_kws)

    result: List[str] = []
    seen: set[str] = set()
    for kw in clean_keybert + known_kws:
        if len(kw) >= 2 and not _CLEAN_RE.match(kw) and kw not in seen:
            seen.add(kw)
            result.append(kw)

    return result


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
