"""
Tests for the pure scoring / suggestion helpers in the analysis service:
  * required vs preferred skill detection from the JD structure,
  * suggestion wording ("not found in the resume", never "lacks").

These exercise the explainability layer without a database or NLP models.
"""
from app.application.services.analysis_service import (
    _build_suggestions,
    _detect_requirement_levels,
)
from app.application.dtos.analysis import AnalysisResponse


# ── Requirement-level detection ────────────────────────────────────────────────
def test_detect_required_and_preferred_from_headers():
    jd = (
        "Job title: Backend Engineer\n\n"
        "Required Qualifications:\n"
        "- Python\n"
        "- Docker\n\n"
        "Preferred:\n"
        "- Kubernetes\n"
        "- AWS\n"
    )
    levels = _detect_requirement_levels(jd, ["python", "docker", "kubernetes", "aws"])
    assert levels["python"] == "required"
    assert levels["docker"] == "required"
    assert levels["kubernetes"] == "preferred"
    assert levels["aws"] == "preferred"


def test_detect_inline_preferred_markers():
    jd = "We use Python daily. Experience with React is a plus."
    levels = _detect_requirement_levels(jd, ["python", "react"])
    assert levels["python"] == "unspecified"
    assert levels["react"] == "preferred"


def test_no_markers_means_unspecified():
    jd = "Looking for someone who knows Python and Docker."
    levels = _detect_requirement_levels(jd, ["python", "docker"])
    assert levels["python"] == "unspecified"
    assert levels["docker"] == "unspecified"


def test_must_have_header_treated_as_required():
    jd = "Must-have:\n- Python\nNice to have:\n- GraphQL"
    levels = _detect_requirement_levels(jd, ["python", "graphql"])
    assert levels["python"] == "required"
    assert levels["graphql"] == "preferred"


def test_empty_jd_returns_empty():
    assert _detect_requirement_levels("", ["python"]) == {}


# ── Suggestion wording ─────────────────────────────────────────────────────────
def test_empty_missing_returns_positive_message():
    suggestions = _build_suggestions([])
    assert len(suggestions) == 1
    assert "covers the key requirements" in suggestions[0]


def test_suggestions_say_not_found_in_resume_never_lacks():
    records = [{"keyword": "kubernetes", "requirement_level": "required"}]
    suggestions = _build_suggestions(records)
    assert any("not found in the resume" in s for s in suggestions)
    # Must never claim the candidate lacks the skill.
    assert not any("lacks" in s.lower() for s in suggestions)


def test_required_and_preferred_grouped_separately():
    records = [
        {"keyword": "python", "requirement_level": "required"},
        {"keyword": "graphql", "requirement_level": "preferred"},
        {"keyword": "cooking", "requirement_level": "unspecified"},
    ]
    suggestions = _build_suggestions(records)
    joined = "\n".join(suggestions)
    assert "Required skill 'python'" in joined
    assert "Preferred skill 'graphql'" in joined
    # unspecified ones are worded generically but still "not found in the resume"
    assert "'cooking' was not found in the resume" in joined


def test_overflow_summary_message():
    # 20 unspecified missing keywords -> capped list + overflow note.
    records = [{"keyword": f"k{i}", "requirement_level": "unspecified"} for i in range(20)]
    suggestions = _build_suggestions(records)
    assert any("more keywords not found in the resume" in s for s in suggestions)


# ── API backward compatibility (old vs new stored records) ────────────────────
_BASE_ROW = {
    "id": 1,
    "user_id": 1,
    "resume_id": 1,
    "job_description_id": 1,
    "overall_score": 0.62,
    "semantic_similarity_score": 0.6,
    "keyword_match_score": 0.6,
    "missing_keywords": ["kubernetes"],
    "resume_keywords": ["python"],
    "job_keywords": ["python", "kubernetes"],
    "suggestions": ["'kubernetes' was not found in the resume."],
    "created_at": "2026-07-24T10:30:00",
    "updated_at": "2026-07-24T10:30:00",
}


def test_analysis_response_validates_legacy_matched_keywords():
    # Records saved before this change only stored {keyword, score}.
    row = dict(_BASE_ROW, matched_keywords=[{"keyword": "python", "score": 0.9}])
    resp = AnalysisResponse.model_validate(row)
    assert resp.matched_keywords[0].keyword == "python"
    assert resp.matched_keywords[0].score == 0.9
    # New optional fields default to None — no validation error.
    assert resp.matched_keywords[0].match_type is None
    assert resp.matched_keywords[0].evidence is None


def test_analysis_response_validates_enriched_matched_keywords():
    row = dict(_BASE_ROW, matched_keywords=[{
        "keyword": "python", "score": 1.0, "match_type": "exact",
        "best_match": "python", "evidence": "…used python…",
        "requirement_level": "required",
    }])
    resp = AnalysisResponse.model_validate(row)
    m = resp.matched_keywords[0]
    assert m.match_type == "exact"
    assert m.evidence == "…used python…"
    assert m.requirement_level == "required"


def test_analysis_response_ats_report_none_for_legacy_rows():
    # Rows written before this feature had no ats_report column -> None.
    resp = AnalysisResponse.model_validate(dict(_BASE_ROW, matched_keywords=[]))
    assert resp.ats_report is None


def test_analysis_response_validates_full_ats_report():
    from app.infrastructure.ats.ats_scorer import score_ats_compatibility
    report = score_ats_compatibility("Jane\njane@example.com\nExperience\nDev\nEducation\nBSc\nSkills\nPython " * 10)
    row = dict(_BASE_ROW, matched_keywords=[], ats_report=report)
    resp = AnalysisResponse.model_validate(row)
    assert resp.ats_report is not None
    assert resp.ats_report.threshold == 0.80
    assert isinstance(resp.ats_report.checks, list)
    assert resp.ats_report.checks[0].name == "Text extractable"
