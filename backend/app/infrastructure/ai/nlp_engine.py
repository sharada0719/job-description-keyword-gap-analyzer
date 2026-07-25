"""
NLP Engine — lazy-loaded singleton wrappers for spaCy, KeyBERT, and
Sentence Transformers.  Models are loaded once on first use, not at import
time, so the app starts quickly even before the models are downloaded.
"""
from __future__ import annotations

import threading
from typing import Optional

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger("ai.nlp_engine")

_lock = threading.Lock()

# ── spaCy ─────────────────────────────────────────────────────────────────────
_spacy_nlp = None


def get_spacy_nlp():
    """Return a cached spaCy Language model, loading it on first call."""
    global _spacy_nlp
    if _spacy_nlp is None:
        with _lock:
            if _spacy_nlp is None:
                import spacy
                logger.info("Loading spaCy model: %s", settings.SPACY_MODEL)
                try:
                    _spacy_nlp = spacy.load(settings.SPACY_MODEL)
                except OSError:
                    logger.error(
                        "spaCy model '%s' not found. "
                        "Run: python -m spacy download %s",
                        settings.SPACY_MODEL,
                        settings.SPACY_MODEL,
                    )
                    raise
                logger.info("spaCy model loaded.")
    return _spacy_nlp


# ── Sentence Transformers ─────────────────────────────────────────────────────
_sentence_model = None


def get_sentence_model():
    """Return a cached SentenceTransformer model."""
    global _sentence_model
    if _sentence_model is None:
        with _lock:
            if _sentence_model is None:
                from sentence_transformers import SentenceTransformer
                logger.info(
                    "Loading SentenceTransformer: %s",
                    settings.SENTENCE_TRANSFORMER_MODEL,
                )
                _sentence_model = SentenceTransformer(
                    settings.SENTENCE_TRANSFORMER_MODEL
                )
                logger.info("SentenceTransformer loaded.")
    return _sentence_model


# ── KeyBERT ───────────────────────────────────────────────────────────────────
_keybert_model = None


def get_keybert_model():
    """Return a cached KeyBERT model (reuses the sentence model internally)."""
    global _keybert_model
    if _keybert_model is None:
        with _lock:
            if _keybert_model is None:
                from keybert import KeyBERT
                logger.info("Initialising KeyBERT model.")
                # KeyBERT accepts a SentenceTransformer to avoid loading twice
                _keybert_model = KeyBERT(model=get_sentence_model())
                logger.info("KeyBERT model ready.")
    return _keybert_model
