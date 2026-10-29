"""
Tests for the job/internship recommendations service.

The service is pure (no external API calls, no NLP models), so all scenarios
are covered fast and deterministically.
"""
from app.application.services.recommendations_service import generate_recommendations


def _titles(report):
    return [r["title"] for r in report["recommendations"]]


# ── Basic generation ──────────────────────────────────────────────────────────
def test_python_keywords_produce_at_least_one_recommendation():
    r = generate_recommendations(["python", "docker", "sql"])
    assert r["recommendations"]


def test_java_keywords_not_matched_by_python_roles():
    r = generate_recommendations(["java", "spring", "sql"])
    titles = _titles(r)
    # Java roles must be present
    assert any("Java" in t for t in titles)
    # Python-only roles must NOT appear (no python in resume)
    python_only = [t for t in titles if "Python" in t and "Java" not in t and "Django" not in t and "Flask" not in t]
    assert not python_only


def test_empty_keywords_returns_empty_recommendations():
    r = generate_recommendations([])
    assert r["recommendations"] == []


def test_unknown_keywords_return_empty_recommendations():
    r = generate_recommendations(["cooking", "knitting", "gardening"])
    assert r["recommendations"] == []


# ── Internship vs full-time filtering ─────────────────────────────────────────
def test_include_internships_false_excludes_internship_roles():
    r = generate_recommendations(
        ["python", "docker"], include_internships=False, include_fulltime=True
    )
    for rec in r["recommendations"]:
        assert "internship" not in rec["tags"]


def test_include_fulltime_false_excludes_fulltime_roles():
    r = generate_recommendations(
        ["python", "docker"], include_internships=True, include_fulltime=False
    )
    for rec in r["recommendations"]:
        assert "full-time" not in rec["tags"] and "graduate-trainee" not in rec["tags"]


def test_internship_only_mode():
    r = generate_recommendations(
        ["python", "react"], include_internships=True, include_fulltime=False
    )
    for rec in r["recommendations"]:
        assert "internship" in rec["tags"]


# ── No fake data ──────────────────────────────────────────────────────────────
def test_no_salary_or_company_in_recommendations():
    r = generate_recommendations(["python", "docker", "aws"])
    for rec in r["recommendations"]:
        assert "salary" not in rec
        assert "company" not in rec
        assert "deadline" not in rec
        assert "phone" not in rec


def test_all_search_links_use_real_domains():
    r = generate_recommendations(["python", "docker"])
    allowed = {"indeed.com", "linkedin.com", "internshala.com", "wellfound.com", "google.com", "glassdoor.com"}
    for rec in r["recommendations"]:
        for link in rec["search_links"]:
            assert any(domain in link["url"] for domain in allowed), \
                f"Unexpected domain in {link['url']}"


def test_top_boards_are_present_and_not_fake():
    r = generate_recommendations(["python"])
    assert r["top_boards"]
    for board in r["top_boards"]:
        assert board["url"].startswith("https://")


# ── Limitations always present ────────────────────────────────────────────────
def test_limitations_always_returned():
    r = generate_recommendations(["python"])
    assert r["limitations"]
    joined = " ".join(r["limitations"]).lower()
    assert "fabricat" in joined or "fake" in joined or "live" in joined


# ── Location preference ───────────────────────────────────────────────────────
def test_location_embedded_in_search_links():
    r = generate_recommendations(["python"], location="London")
    assert r["location_used"] == "London"
    for rec in r["recommendations"]:
        indeed_links = [l for l in rec["search_links"] if "indeed" in l["url"]]
        if indeed_links:
            assert "London" in indeed_links[0]["url"]


# ── Score ordering ────────────────────────────────────────────────────────────
def test_recommendations_sorted_by_score_descending():
    r = generate_recommendations(["python", "django", "rest apis", "sql", "docker"])
    scores = [rec["score"] for rec in r["recommendations"]]
    assert scores == sorted(scores, reverse=True)


# ── Max results cap ───────────────────────────────────────────────────────────
def test_max_results_respected():
    r = generate_recommendations(["python", "docker", "sql", "react"], max_results=3)
    assert len(r["recommendations"]) <= 3


# ── Matched skills present and relevant ──────────────────────────────────────
def test_matched_skills_are_subset_of_resume_keywords():
    kws = ["python", "docker", "sql"]
    r = generate_recommendations(kws)
    kw_set = set(kws)
    for rec in r["recommendations"]:
        for skill in rec["matched_skills"]:
            assert skill in kw_set, f"'{skill}' is not in resume keywords"


# ── Internshala link for internship roles ────────────────────────────────────
def test_internship_roles_include_internshala_link():
    r = generate_recommendations(["python"], include_internships=True, include_fulltime=False)
    for rec in r["recommendations"]:
        link_labels = [l["label"] for l in rec["search_links"]]
        assert "Internshala" in link_labels


# ── Reproducibility ───────────────────────────────────────────────────────────
def test_recommendations_are_reproducible():
    kws = ["python", "docker", "react", "sql"]
    a = generate_recommendations(kws)
    b = generate_recommendations(kws)
    assert a == b
