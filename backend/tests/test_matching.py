"""
Tests for the combined keyword matcher (exact / alias / semantic / uncertain).

Uses a deterministic StubModel so the confusable-technology guards and the
score weights can be verified without downloading any real NLP model.
"""
import math

import numpy as np
import pytest

from app.application.dtos.analysis import KeywordMatchDTO
from app.infrastructure.ai.similarity_scorer import (
    keyword_match_scores,
    match_keywords,
)


class StubModel:
    """
    Minimal stand-in for SentenceTransformer.encode().

    * Explicit ``vectors`` (keyword -> list[float]) are used as-is so we can
      simulate high similarity between confusable terms (java/javascript).
    * Unknown keywords receive a unique one-hot vector (shared vocab across
      calls) so unrelated terms are orthogonal (similarity 0).
    """

    def __init__(self, vectors=None, dim=64):
        self._vectors = {k: list(v) for k, v in (vectors or {}).items()}
        self._vocab: dict[str, int] = {}
        self._dim = dim

    def encode(self, texts, normalize_embeddings=True,
               show_progress_bar=False, batch_size=64):
        rows = []
        for t in texts:
            if t in self._vectors:
                rows.append(np.array(self._vectors[t], dtype=float))
            else:
                if t not in self._vocab:
                    self._vocab[t] = len(self._vocab)
                v = np.zeros(self._dim)
                v[self._vocab[t] % self._dim] = 1.0
                rows.append(v)
        arr = np.vstack(rows) if rows else np.zeros((0, self._dim))
        if normalize_embeddings:
            norms = np.linalg.norm(arr, axis=1, keepdims=True)
            norms[norms == 0] = 1.0
            arr = arr / norms
        return arr


# ── Exact / alias matching ────────────────────────────────────────────────────
def test_exact_match_is_full_score():
    res = match_keywords(["python"], ["python"], model=StubModel())
    assert res["matched"][0]["match_type"] == "exact"
    assert res["matched"][0]["score"] == 1.0
    assert res["missing"] == []
    assert res["score"] == 1.0


def test_alias_match_counts_as_exact():
    # "js" and "javascript" both normalise to "javascript".
    res = match_keywords(["javascript"], ["js"], model=StubModel())
    assert res["matched"][0]["match_type"] == "exact"
    assert res["score"] == 1.0


def test_node_alias_normalises():
    res = match_keywords(["node.js"], ["node"], model=StubModel())
    assert res["matched"][0]["match_type"] == "exact"
    assert res["score"] == 1.0


# ── Java vs JavaScript (the headline false-positive fix) ──────────────────────
def test_java_requirement_not_matched_by_javascript_resume():
    # Give java & javascript identical vectors so raw similarity would be 1.0.
    stub = StubModel(vectors={"java": [1.0, 0.0], "javascript": [1.0, 0.0]})
    res = match_keywords(["javascript"], ["java"], model=stub)
    assert res["matched"] == []
    assert res["missing"][0]["keyword"] == "java"
    assert res["score"] == 0.0


def test_javascript_requirement_not_matched_by_java_resume():
    stub = StubModel(vectors={"java": [1.0, 0.0], "javascript": [1.0, 0.0]})
    res = match_keywords(["java"], ["javascript"], model=stub)
    assert res["matched"] == []
    assert res["missing"][0]["keyword"] == "javascript"


# ── Distinct technologies are not treated as equivalent ────────────────────────
@pytest.mark.parametrize("resume,job", [
    ("vue", "react"),
    ("kubernetes", "docker"),
    ("mysql", "postgresql"),
    ("azure", "aws"),
])
def test_distinct_technologies_do_not_semantically_match(resume, job):
    stub = StubModel(vectors={resume: [1.0, 0.0], job: [1.0, 0.0]})
    res = match_keywords([resume], [job], model=stub)
    assert res["matched"] == []
    assert res["missing"][0]["keyword"] == job


# ── Semantic & uncertain bands ────────────────────────────────────────────────
def test_strong_semantic_match_when_not_confusable():
    # python vs python3: not confusable (continues with digit), cosine 0.8.
    stub = StubModel(vectors={"python": [1.0, 0.0], "python3": [0.8, 0.6]})
    res = match_keywords(["python3"], ["python"], model=stub)
    m = res["matched"][0]
    assert m["match_type"] == "semantic"
    assert abs(m["score"] - 0.8) < 1e-3


def test_uncertain_band_is_reported_with_half_weight():
    # cosine 0.7 (>= 0.60 and < 0.75 threshold) -> uncertain, weight 0.5*sim.
    stub = StubModel(vectors={"python": [1.0, 0.0], "pytorch": [0.7, math.sqrt(1 - 0.7 ** 2)]})
    res = match_keywords(["pytorch"], ["python"], model=stub)
    m = res["matched"][0]
    assert m["match_type"] == "uncertain"
    assert abs(res["score"] - 0.35) < 1e-3  # 0.5 * 0.7 over 1 job keyword


def test_low_similarity_is_missing():
    stub = StubModel()
    res = match_keywords(["cooking"], ["python"], model=stub)
    assert res["matched"] == []
    assert res["missing"][0]["keyword"] == "python"
    assert res["score"] == 0.0


# ── Deduplication (no duplicate keyword counting) ─────────────────────────────
def test_duplicate_resume_keywords_not_double_counted():
    res = match_keywords(["python", "python", "Python"], ["python"], model=StubModel())
    assert len(res["matched"]) == 1
    assert res["score"] == 1.0


def test_duplicate_job_keywords_not_double_counted():
    res = match_keywords(["python"], ["python", "python", "python"], model=StubModel())
    assert len(res["matched"]) == 1
    assert res["score"] == 1.0


# ── Coverage score reproducibility ────────────────────────────────────────────
def test_score_is_mixture_of_match_types():
    # job: python (exact), kubernetes (confusable w/ docker -> missing),
    #      react (no match -> missing)
    stub = StubModel()
    res = match_keywords(["python", "docker"], ["python", "kubernetes", "react"], model=stub)
    keywords_matched = {m["keyword"] for m in res["matched"]}
    keywords_missing = {m["keyword"] for m in res["missing"]}
    assert keywords_matched == {"python"}
    assert keywords_missing == {"kubernetes", "react"}
    # weight = 1.0 (python exact); score = 1.0 / 3
    assert abs(res["score"] - (1.0 / 3.0)) < 1e-3


def test_result_is_reproducible():
    stub = StubModel()
    a = match_keywords(["python", "docker"], ["python", "kubernetes", "react"], model=stub)
    b = match_keywords(["python", "docker"], ["python", "kubernetes", "react"], model=stub)
    assert a == b


# ── Evidence ──────────────────────────────────────────────────────────────────
def test_evidence_snippet_returned_from_resume_text():
    resume_text = "Worked at Acme for 3 years building python data pipelines."
    res = match_keywords(["python"], ["python"], resume_text=resume_text, model=StubModel())
    ev = res["matched"][0]["evidence"]
    assert ev is not None
    assert "python" in ev


def test_no_evidence_when_term_absent():
    res = match_keywords(["python"], ["python"], resume_text="", model=StubModel())
    assert res["matched"][0]["evidence"] is None


# ── Edge cases ─────────────────────────────────────────────────────────────────
def test_empty_job_keywords():
    res = match_keywords(["python"], [], model=StubModel())
    assert res["matched"] == [] and res["missing"] == [] and res["score"] == 0.0


def test_empty_resume_keywords_all_missing():
    res = match_keywords([], ["python", "docker"], model=StubModel())
    assert res["matched"] == []
    assert {m["keyword"] for m in res["missing"]} == {"python", "docker"}
    assert res["score"] == 0.0


# ── Backward-compatible shim ──────────────────────────────────────────────────
def test_keyword_match_scores_shim_returns_legacy_shape():
    matched, missing = keyword_match_scores(["python"], ["python", "docker"], model=StubModel())
    assert isinstance(matched, list)
    assert all(isinstance(t, tuple) and len(t) == 2 for t in matched)
    assert isinstance(missing, list) and all(isinstance(x, str) for x in missing)
    assert ("python", 1.0) in matched


# ── DTO backward compatibility ─────────────────────────────────────────────────
def test_keyword_dto_accepts_legacy_shape():
    dto = KeywordMatchDTO(**{"keyword": "python", "score": 0.9})
    assert dto.keyword == "python"
    assert dto.match_type is None
    assert dto.evidence is None


def test_keyword_dto_accepts_enriched_shape():
    dto = KeywordMatchDTO(**{
        "keyword": "python", "score": 1.0, "match_type": "exact",
        "best_match": "python", "evidence": "…used python…",
        "requirement_level": "required",
    })
    assert dto.match_type == "exact"
    assert dto.requirement_level == "required"
