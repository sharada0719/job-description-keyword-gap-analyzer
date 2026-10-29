"""
Tests for the free-text job search service.

Covers: board link construction, job-type filters, resume-based matching,
empty queries, invalid job types, remote filter, and no-fabrication guarantees.
"""
from app.application.services.recommendations_service import search_jobs


def _board_labels(r):
    return [b["board"] for b in r["board_results"]]


# ── Basic search ──────────────────────────────────────────────────────────────
def test_search_returns_board_links():
    r = search_jobs(query="python developer")
    assert r["board_results"]
    assert "Indeed" in _board_labels(r)
    assert "LinkedIn" in _board_labels(r)
    assert "Google" in _board_labels(r)


def test_empty_query_still_returns_browse_links():
    r = search_jobs(query="")
    assert r["board_results"]
    # Should use a sensible default query (urlencode turns spaces into +)
    assert any("developer" in b["url"] for b in r["board_results"])


def test_all_board_urls_are_https():
    r = search_jobs(query="react developer")
    for b in r["board_results"]:
        assert b["url"].startswith("https://"), f"{b['board']} URL is not HTTPS"


# ── Job-type filters ──────────────────────────────────────────────────────────
def test_internship_filter_adds_internshala():
    r = search_jobs(query="python", job_types=["internship"])
    assert "Internshala" in _board_labels(r)


def test_fresher_filter_adds_wellfound():
    r = search_jobs(query="python", job_types=["fresher"])
    assert "Wellfound" in _board_labels(r)


def test_invalid_job_types_are_ignored():
    r = search_jobs(query="python", job_types=["fake_type", "internship"])
    assert r["job_types"] == ["internship"]


def test_no_job_types_includes_both_internshala_and_wellfound():
    r = search_jobs(query="python")
    labels = _board_labels(r)
    assert "Internshala" in labels
    assert "Wellfound" in labels


# ── Remote filter ─────────────────────────────────────────────────────────────
def test_remote_filter_appends_remote_to_query():
    r = search_jobs(query="python developer", remote=True)
    indeed = [b for b in r["board_results"] if b["board"] == "Indeed"][0]
    assert "remote" in indeed["url"].lower()


# ── Location ──────────────────────────────────────────────────────────────────
def test_location_embedded_in_urls():
    r = search_jobs(query="python developer", location="London")
    assert r["location_used"] == "London"
    indeed = [b for b in r["board_results"] if b["board"] == "Indeed"][0]
    assert "London" in indeed["url"]


# ── Resume-based matching ─────────────────────────────────────────────────────
def test_resume_keywords_produce_role_matches():
    r = search_jobs(query="developer", resume_keywords=["python", "docker", "sql"])
    assert r["has_resume_keywords"] is True
    assert r["role_matches"]
    # Each match should have matched_skills from the resume keywords
    for role in r["role_matches"]:
        for skill in role["matched_skills"]:
            assert skill in {"python", "docker", "sql", "react", "javascript", "java", "git", "aws", "kubernetes", "ci/cd", "linux", "bash", "rest apis", "spring", "machine learning", "nlp", "deep learning", "tensorflow", "pytorch", "scikit-learn", "pandas", "numpy", "tableau", "power bi", "excel", "node.js", "typescript", "html", "css", "redux", "angular", "vue", "mongodb", "flask", "fastapi", "django", "postgresql", "mysql", "oracle", "terraform", "azure", "google cloud"}


def test_no_resume_keywords_no_role_matches():
    r = search_jobs(query="developer")
    assert r["has_resume_keywords"] is False
    assert r["role_matches"] == []


def test_job_types_filter_role_matches():
    r = search_jobs(
        query="developer",
        job_types=["internship"],
        resume_keywords=["python"],
    )
    for role in r["role_matches"]:
        assert "internship" in role["tags"]


# ── No fabrication ────────────────────────────────────────────────────────────
def test_no_salary_company_or_deadline_in_results():
    r = search_jobs(query="python developer", resume_keywords=["python"])
    for b in r["board_results"]:
        assert "salary" not in b
        assert "company" not in b
        assert "deadline" not in b
    for role in r["role_matches"]:
        assert "salary" not in role
        assert "company" not in role
        assert "deadline" not in role


def test_limitations_always_returned():
    r = search_jobs(query="python")
    assert r["limitations"]
    joined = " ".join(r["limitations"]).lower()
    assert "fabricat" in joined or "not individual" in joined


# ── Reproducibility ───────────────────────────────────────────────────────────
def test_search_is_reproducible():
    a = search_jobs(query="react", location="Berlin", job_types=["internship"], resume_keywords=["react", "javascript"])
    b = search_jobs(query="react", location="Berlin", job_types=["internship"], resume_keywords=["react", "javascript"])
    assert a == b
