"""
Tests for the keyword-extractor noise-reduction filter.

``reduce_keyword_noise`` is pure logic (no NLP models), so it can be tested
directly and fast.
"""
from app.infrastructure.ai.keyword_extractor import reduce_keyword_noise


def test_drops_single_token_fragments_of_curated_skills():
    # 'apis' is a fragment of 'rest apis'; 'ci' of 'ci/cd'; 'net' of '.net';
    # 'js' of 'javascript' — all should be dropped, the curated skill kept.
    known = ["rest apis", "ci/cd", ".net", "javascript", "docker", "sql"]
    out = reduce_keyword_noise(
        ["apis", "ci", "net", "js", "docker", "sql"], known
    )
    assert "apis" not in out
    assert "ci" not in out
    assert "net" not in out
    assert "js" not in out
    # Curated skills are retained.
    assert "docker" in out
    assert "sql" in out


def test_keeps_curated_skill_even_if_substring_of_another():
    # 'sql' is curated and also a substring of 'sql server'; keep it.
    known = ["sql", "sql server", "postgresql"]
    out = reduce_keyword_noise(["sql", "server"], known)
    assert "sql" in out


def test_drops_composite_keyphrases_glued_onto_curated_skills():
    known = ["aws", "docker", "microservices", "javascript"]
    out = reduce_keyword_noise(
        ["aws docker", "microservices aws", "javascript built", "built microservices"],
        known,
    )
    for noise in ["aws docker", "microservices aws", "javascript built", "built microservices"]:
        assert noise not in out


def test_keeps_genuine_multiword_keyphrase_not_composed_of_curated_skills():
    known = ["python"]
    # 'data engineering' is a real keyphrase; neither word is a curated skill.
    out = reduce_keyword_noise(["data engineering"], known)
    assert "data engineering" in out


def test_drops_generic_filler_words():
    known = ["python"]
    out = reduce_keyword_noise(["experience", "team", "responsibilities", "python"], known)
    assert "experience" not in out
    assert "team" not in out
    assert "python" in out


def test_deduplicates():
    known = ["docker"]
    out = reduce_keyword_noise(["docker", "docker", "docker"], known)
    assert out.count("docker") == 1
