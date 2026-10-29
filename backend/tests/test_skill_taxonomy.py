"""
Tests for the pure skill-taxonomy helpers (no NLP models loaded — fast).
"""
from app.infrastructure.ai.skill_taxonomy import (
    canonical_set,
    find_known_skills,
    is_confusable,
    is_generic_noise,
    normalize_keyword,
)


# ── Normalisation & aliases ──────────────────────────────────────────────────
def test_normalize_keyword_preserves_case_sensitive_tech_terms():
    assert normalize_keyword("C++") == "c++"
    assert normalize_keyword("C#") == "c#"
    assert normalize_keyword(".NET") == ".net"
    assert normalize_keyword("Node.js") == "node.js"
    assert normalize_keyword("CI/CD") == "ci/cd"
    assert normalize_keyword("JavaScript") == "javascript"


def test_normalize_keyword_folds_aliases():
    assert normalize_keyword("JS") == "javascript"
    assert normalize_keyword("TS") == "typescript"
    assert normalize_keyword("Node") == "node.js"
    assert normalize_keyword("NodeJS") == "node.js"
    assert normalize_keyword("cpp") == "c++"
    assert normalize_keyword("csharp") == "c#"
    assert normalize_keyword("dotnet") == ".net"
    assert normalize_keyword("k8s") == "kubernetes"
    assert normalize_keyword("postgres") == "postgresql"
    assert normalize_keyword("mongo") == "mongodb"
    assert normalize_keyword("rest api") == "rest apis"


def test_normalize_keyword_handles_whitespace_and_casing():
    assert normalize_keyword("  Machine   Learning ") == "machine learning"
    assert normalize_keyword("PYTHON") == "python"


def test_canonical_set_deduplicates_and_preserves_order():
    out = canonical_set(["Python", "python", "JS", "JavaScript", "js"])
    assert out == ["python", "javascript"]


# ── Confusable guard (Java vs JavaScript, distinct technologies) ──────────────
def test_java_does_not_confuse_as_javascript_or_vice_versa():
    # The whole point: these must be treated as distinct (confusable=True means
    # "block the semantic match"), so is_confusable must return True.
    assert is_confusable("java", "javascript") is True
    assert is_confusable("javascript", "java") is True


def test_distinct_technologies_are_confusable():
    assert is_confusable("react", "vue") is True
    assert is_confusable("docker", "kubernetes") is True
    assert is_confusable("postgres", "mysql") is True
    assert is_confusable("aws", "azure") is True
    assert is_confusable("c", "c++") is True
    assert is_confusable("c++", "c#") is True
    assert is_confusable("graphql", "rest apis") is True


def test_identical_and_unrelated_terms_are_not_confusable():
    assert is_confusable("python", "python") is False
    assert is_confusable("python", "django") is False  # neither prefix nor both distinct
    assert is_confusable("react", "react native") is False  # space after prefix, not a letter


def test_prefix_with_letter_guard_specifically_targets_java_javascript():
    # "java" is a prefix of "javascript" and javascript continues with a letter.
    assert is_confusable("java", "javascript") is True
    # "c" prefix of "c++" continues with "+" (non-letter) -> guarded only by DISTINCT_TECH.
    # (c and c++ are both in DISTINCT_TECH so still confusable there.)


# ── Technical-term preservation (known-skills scan) ───────────────────────────
def test_find_known_skills_preserves_special_character_terms():
    text = (
        "Built services with C++, C#, .NET, Node.js, CI/CD pipelines, "
        "REST APIs, SQL, and JavaScript."
    )
    found = set(find_known_skills(text))
    for expected in {
        "c++",
        "c#",
        ".net",
        "node.js",
        "ci/cd",
        "rest apis",
        "sql",
        "javascript",
    }:
        assert expected in found, f"missing technical term: {expected}"


def test_javascript_does_not_extract_as_java():
    found = set(find_known_skills("JavaScript developer with 5 years experience"))
    assert "javascript" in found
    assert "java" not in found


def test_java_and_javascript_both_extracted_when_both_present():
    found = set(find_known_skills("Core Java and JavaScript developer"))
    assert "java" in found
    assert "javascript" in found


def test_find_known_skills_empty_text():
    assert find_known_skills("") == []
    assert find_known_skills("   ") == []


# ── Noise filtering ───────────────────────────────────────────────────────────
def test_is_generic_noise_flags_filler_words_only():
    assert is_generic_noise("experience") is True
    assert is_generic_noise("responsibilities") is True
    assert is_generic_noise("team") is True
    # Real skills are never noise.
    assert is_generic_noise("python") is False
    assert is_generic_noise("docker") is False
