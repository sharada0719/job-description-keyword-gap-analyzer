"""
Tests for the ATS compatibility scorer.

The scorer is pure (no NLP models) and independent of the job-match score,
so all required scenarios can be verified quickly and deterministically.
"""
import pytest

from app.infrastructure.ats.ats_scorer import compute_passed, score_ats_compatibility


GOOD_RESUME = """\
Jane Doe
jane.doe@example.com
(555) 123-4567

Summary
Experienced software engineer passionate about scalable systems.

Experience
Senior Software Engineer at Acme Corp (2019-2024)
Designed distributed backend services using Python and Docker and led a small
team delivering machine learning pipelines that improved throughput significantly.
Software Engineer at Beta Inc (2016-2019)
Developed REST APIs and maintained CI/CD pipelines for the platform team.

Education
BSc Computer Science, University of Example, 2016

Skills
Python, Docker, Kubernetes, SQL, AWS, JavaScript, CI/CD, REST APIs
"""


# ── Scenario 1: ATS >= 80% with all required checks passing ───────────────────
def test_substantive_resume_passes():
    r = score_ats_compatibility(GOOD_RESUME)
    assert r["score"] >= 0.80
    assert r["passed"] is True
    required = {c["name"]: c["passed"] for c in r["checks"]}
    assert required["Text extractable"] is True
    assert required["Meaningful content"] is True


# ── Scenario 2: ATS below 80% ─────────────────────────────────────────────────
def test_below_threshold_does_not_pass():
    # Missing sections and only one contact method -> score below threshold.
    thin = "Jane\njane@example.com\nDid some programming work for a few years now."
    r = score_ats_compatibility(thin)
    assert r["score"] < 0.80
    assert r["passed"] is False


# ── Scenario 3: high score but a required check fails -> NOT passed ───────────
def test_compute_passed_blocks_when_required_check_fails():
    # Even a 0.85 score must not pass if a required check failed.
    assert compute_passed(0.85, 0.80, required_ok=False) is False
    assert compute_passed(0.85, 0.80, required_ok=True) is True
    assert compute_passed(0.70, 0.80, required_ok=True) is False
    assert compute_passed(0.80, 0.80, required_ok=True) is True


def test_short_resume_blocks_passing_even_with_sections_and_contact():
    # Has contact + sections but too little content -> required check fails.
    short = (
        "Jane Doe\njane@example.com\n(555) 123-4567\n\n"
        "Experience\nDev\n\nEducation\nBSc\n\nSkills\nPython"
    )
    r = score_ats_compatibility(short)
    assert r["passed"] is False
    assert {c["name"]: c["passed"] for c in r["checks"]}["Meaningful content"] is False


# ── Scenario 4 & 5: ATS score is independent of the job match ─────────────────
def test_ats_scorer_takes_only_resume_text_not_job_info():
    # The signature accepts only resume text (and optional file_type) — it has
    # no access to the job description or the job-match score.
    import inspect
    params = inspect.signature(score_ats_compatibility).parameters
    assert "resume_text" in params
    assert "job_description" not in params
    assert "overall_score" not in params


def test_ats_can_pass_independently_of_job_match():
    # A well-structured resume passes ATS regardless of any job-match value.
    r = score_ats_compatibility(GOOD_RESUME)
    assert r["passed"] is True
    # The job-match score is not part of the ATS report at all.
    assert "overall_score" not in r
    assert "keyword_match_score" not in r


# ── Scenario 6: empty / unreadable resumes ────────────────────────────────────
def test_empty_resume_does_not_pass_and_flags_parse_failure():
    r = score_ats_compatibility("")
    assert r["score"] < 0.30
    assert r["passed"] is False
    joined = " ".join(r["recommendations"])
    assert "could not be extracted" in joined.lower()


def test_whitespace_only_resume_treated_as_empty():
    r = score_ats_compatibility("   \n\n   \t  ")
    assert r["passed"] is False
    assert {c["name"]: c["passed"] for c in r["checks"]}["Text extractable"] is False


# ── Contact detection ─────────────────────────────────────────────────────────
def test_contact_detection_email_and_phone():
    r = score_ats_compatibility("Reach me at jane@example.com or (555) 123-4567.")
    contact = {c["name"]: c for c in r["checks"]}["Contact information"]
    assert contact["passed"] is True


def test_contact_detection_none():
    r = score_ats_compatibility("A person with no contact details listed here at all.")
    contact = {c["name"]: c for c in r["checks"]}["Contact information"]
    assert contact["passed"] is False


# ── Section detection ────────────────────────────────────────────────────────
def test_section_headings_detected():
    r = score_ats_compatibility("Experience\nDev\n\nEducation\nBSc\n\nSkills\nPython")
    sec = {c["name"]: c for c in r["checks"]}["Resume sections"]
    assert sec["passed"] is True
    assert "experience" in sec["detail"].lower()
    assert "education" in sec["detail"].lower()
    assert "skills" in sec["detail"].lower()


def test_section_word_in_paragraph_is_not_a_heading():
    # "experience" appears in a long paragraph line, not as a heading.
    text = (
        "I have over five years of professional experience building and shipping "
        "software systems for enterprise customers across multiple industries."
    )
    r = score_ats_compatibility(text)
    sec = {c["name"]: c for c in r["checks"]}["Resume sections"]
    assert sec["passed"] is False


# ── Reproducibility ───────────────────────────────────────────────────────────
def test_ats_score_is_reproducible():
    a = score_ats_compatibility(GOOD_RESUME)
    b = score_ats_compatibility(GOOD_RESUME)
    assert a == b


# ── Legacy .doc format note ───────────────────────────────────────────────────
def test_legacy_doc_format_adds_warning_and_recommendation():
    r = score_ats_compatibility(GOOD_RESUME, file_type="doc")
    assert any("legacy .doc" in w.lower() for w in r["warnings"])
    assert any(".docx or pdf" in rec.lower() for rec in r["recommendations"])


# ── Report always includes transparency note ─────────────────────────────────
def test_report_includes_disclaimer():
    r = score_ats_compatibility(GOOD_RESUME)
    joined = " ".join(r["recommendations"])
    assert "not a guarantee of an interview" in joined.lower()
