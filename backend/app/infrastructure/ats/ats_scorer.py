"""
ATS (Applicant Tracking System) compatibility scorer.

Produces a transparent, reproducible compatibility score based on REAL checks
performed on the *extracted* resume text only. It deliberately does NOT attempt
to simulate any specific employer's ATS, and it does NOT guess about visual
formatting (fonts, columns, images, colours) that cannot be inferred from text.

The score is independent of the job-match score.

Checks (each with a fixed weight, summing to 1.0):
  1. text_extractable     (0.15) — non-trivial text could be extracted.
  2. meaningful_content   (0.30) — enough words for a real resume.
  3. contact_info          (0.20) — email and/or phone detectable.
  4. sections_present      (0.25) — common resume sections/headings found.
  5. text_quality          (0.10) — no major parsing artefacts in the text.

The "passed" flag is True only when the score >= threshold AND the two
required (gating) checks — text_extractable and meaningful_content — pass,
so a high score can never trigger the success state if the document could not
be parsed reliably.
"""
from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, Tuple

from app.core.config import settings

# ── Regexes ───────────────────────────────────────────────────────────────────
_EMAIL_RE = re.compile(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}")
# Phone: tolerates +country code, parentheses, dashes, dots, spaces.
_PHONE_RE = re.compile(
    r"(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}"
)

# Resume section headings. Matched at the start of a (short) line so a word
# appearing mid-paragraph is not mistaken for a heading.
_SECTION_PATTERNS: Dict[str, "re.Pattern[str]"] = {
    "experience": re.compile(
        r"^(work\s+experience|professional\s+experience|employment\s+history|"
        r"work\s+history|experience|employment)\b",
        re.IGNORECASE,
    ),
    "education": re.compile(
        r"^(education|academic\s+background|academics?|education\s+and\s+training)\b",
        re.IGNORECASE,
    ),
    "skills": re.compile(
        r"^(technical\s+skills|core\s+skills|key\s+skills|"
        r"skills\s*&\s*competencies|skills)\b",
        re.IGNORECASE,
    ),
    "projects": re.compile(
        r"^(projects|personal\s+projects|key\s+projects|selected\s+projects)\b",
        re.IGNORECASE,
    ),
    "summary": re.compile(
        r"^(professional\s+summary|summary|profile|career\s+objective|"
        r"objective|about\s+me)\b",
        re.IGNORECASE,
    ),
    "certifications": re.compile(
        r"^(certifications?|licenses?|certifications\s+&\s+training)\b",
        re.IGNORECASE,
    ),
    "awards": re.compile(
        r"^(awards|honors|honours|achievements|recognitions?)\b",
        re.IGNORECASE,
    ),
    "contact": re.compile(r"^(contact(\s+(information|details))?|contact)\b", re.IGNORECASE),
}

# Layout artefacts detectable in text.
_LONG_LINE_RE = re.compile(r".{300,}")
_PAGE_ARTIFACT_RE = re.compile(r"page\s+\d+\s+of\s+\d+", re.IGNORECASE)

# Lines longer than this are treated as headings only if they are short.
_HEADING_MAX_LEN = 60


def _word_count(text: str) -> int:
    return len(text.split())


def _alphanumeric_ratio(text: str) -> float:
    """Ratio of alphanumeric chars to total non-whitespace chars."""
    non_ws = [c for c in text if not c.isspace()]
    if not non_ws:
        return 0.0
    alnum = sum(1 for c in non_ws if c.isalnum())
    return alnum / len(non_ws)


def _find_sections(text: str) -> List[str]:
    """Return the list of distinct resume section headings found in the text."""
    found: List[str] = []
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped or len(stripped) > _HEADING_MAX_LEN:
            continue
        for name, pattern in _SECTION_PATTERNS.items():
            if pattern.match(stripped) and name not in found:
                found.append(name)
    return found


def _find_contact(text: str) -> Tuple[bool, bool]:
    """Return (has_email, has_phone)."""
    has_email = _EMAIL_RE.search(text) is not None
    has_phone = _PHONE_RE.search(text) is not None
    return has_email, has_phone


def _text_quality(text: str) -> Tuple[float, List[str]]:
    """
    Return (fraction_0_to_1, warnings) for the text-quality check.
    Fraction is 1.0 (clean), 0.5 (borderline), or 0.0 (poor).
    """
    warnings: List[str] = []
    ratio = _alphanumeric_ratio(text)
    lines = text.splitlines()
    long_lines = sum(1 for line in lines if _LONG_LINE_RE.match(line))
    artifacts = len(_PAGE_ARTIFACT_RE.findall(text))

    if ratio < 0.55:
        warnings.append(
            "Low ratio of readable text — the file may contain layout artefacts "
            "or may be a scanned image rather than text."
        )
    if long_lines >= 3:
        warnings.append(
            "Some lines are unusually long, which can indicate table-based "
            "layouts that ATS parse poorly."
        )
    if artifacts:
        warnings.append("Repeated page headers/footers or page-number artefacts were detected.")

    clean = ratio >= 0.70 and long_lines < 3 and artifacts == 0
    borderline = 0.55 <= ratio < 0.70 or long_lines >= 3 or artifacts > 0
    if clean:
        return 1.0, warnings
    if borderline:
        return 0.5, warnings
    return 0.0, warnings


def compute_passed(score: float, threshold: float, required_ok: bool) -> bool:
    """
    Pure gating function: the resume is ATS-compatible only when the score
    meets the threshold AND the required parsing/compatibility checks pass.
    """
    return bool(required_ok and score >= threshold)


def score_ats_compatibility(
    resume_text: str,
    file_type: Optional[str] = None,
    threshold: Optional[float] = None,
) -> Dict[str, Any]:
    """
    Score a resume's ATS compatibility from its extracted text.

    Returns a report dict::

        {
          "score": float,            # 0–1
          "threshold": float,         # the threshold used
          "passed": bool,             # score >= threshold AND required checks pass
          "checks": [ {name, passed, weight, detail}, ... ],
          "warnings": [str, ...],
          "recommendations": [str, ...],
        }
    """
    text = resume_text or ""
    cutoff = threshold if threshold is not None else settings.ATS_COMPATIBILITY_THRESHOLD

    checks: List[Dict[str, Any]] = []
    warnings: List[str] = []
    recommendations: List[str] = []
    earned = 0.0

    # ── 1. text_extractable (0.15) ─────────────────────────────────────────
    te_ok = len(text.strip()) >= 50
    checks.append({
        "name": "Text extractable",
        "passed": te_ok,
        "weight": 0.15,
        "detail": "Non-trivial text was extracted from the document." if te_ok
        else "Little or no text could be extracted.",
    })
    earned += 0.15 if te_ok else 0.0

    # ── 2. meaningful_content (0.30) ───────────────────────────────────────
    words = _word_count(text)
    if words >= 150:
        mc_frac, mc_passed = 1.0, True
        mc_detail = f"{words} words — a substantive resume."
    elif words >= 60:
        mc_frac, mc_passed = 0.5, True
        mc_detail = f"{words} words — a short resume; consider adding more detail."
    else:
        mc_frac, mc_passed = 0.0, False
        mc_detail = f"Only {words} words — too little for a meaningful resume."
    checks.append({
        "name": "Meaningful content",
        "passed": mc_passed,
        "weight": 0.30,
        "detail": mc_detail,
    })
    earned += 0.30 * mc_frac

    # ── 3. contact_info (0.20) ─────────────────────────────────────────────
    has_email, has_phone = _find_contact(text)
    if has_email and has_phone:
        ci_frac, ci_passed = 1.0, True
    elif has_email or has_phone:
        ci_frac, ci_passed = 0.5, True
    else:
        ci_frac, ci_passed = 0.0, False
    contact_detail = []
    if has_email:
        contact_detail.append("email")
    if has_phone:
        contact_detail.append("phone number")
    ci_detail = (
        f"Contact info found: {', '.join(contact_detail)}."
        if contact_detail
        else "No email or phone number detected."
    )
    checks.append({
        "name": "Contact information",
        "passed": ci_passed,
        "weight": 0.20,
        "detail": ci_detail,
    })
    earned += 0.20 * ci_frac

    # ── 4. sections_present (0.25) ──────────────────────────────────────────
    sections = _find_sections(text)
    n = len(sections)
    if n >= 3:
        sec_frac = 1.0
    elif n == 2:
        sec_frac = 0.64
    elif n == 1:
        sec_frac = 0.32
    else:
        sec_frac = 0.0
    sec_passed = n >= 1
    sec_detail = (
        f"Sections found: {', '.join(sections)}."
        if sections
        else "No common section headings detected."
    )
    checks.append({
        "name": "Resume sections",
        "passed": sec_passed,
        "weight": 0.25,
        "detail": sec_detail,
    })
    earned += 0.25 * sec_frac

    # ── 5. text_quality (0.10) ─────────────────────────────────────────────
    tq_frac, tq_warnings = _text_quality(text)
    warnings.extend(tq_warnings)
    tq_passed = tq_frac >= 1.0
    checks.append({
        "name": "Text quality",
        "passed": tq_passed,
        "weight": 0.10,
        "detail": (
            "Extracted text looks clean." if tq_passed
            else "Some text-quality issues were detected."
        ),
    })
    earned += 0.10 * tq_frac

    # ── Score + gating ──────────────────────────────────────────────────────
    score = round(min(1.0, max(0.0, earned)), 4)
    required_ok = te_ok and mc_passed
    passed = compute_passed(score, cutoff, required_ok)

    # ── Recommendations ──────────────────────────────────────────────────────
    if not te_ok:
        recommendations.append(
            "The document's text could not be extracted reliably. Re-upload a "
            "text-based PDF or DOCX (not a scanned image)."
        )
    if words < 60:
        recommendations.append(
            "Resume content is very short. Add detail to your experience, "
            "projects, and skills."
        )
    elif words < 150:
        recommendations.append(
            "Consider expanding your resume toward a fuller one-to-two page layout."
        )
    if not has_email:
        recommendations.append("Add a professional email address near the top.")
    if not has_phone:
        recommendations.append("Add a phone number near the top.")
    if n == 0:
        recommendations.append(
            "Add clear section headings (e.g. Experience, Education, Skills) so "
            "ATS can identify resume structure."
        )
    elif n < 3:
        recommendations.append(
            "Add more standard section headings (Experience, Education, Skills) "
            "to improve structure detection."
        )
    if "Low ratio of readable text" in " ".join(warnings):
        recommendations.append(
            "Ensure the file is text-based (not a scanned image) and avoid "
            "embedded symbols that obscure text."
        )
    if "unusually long" in " ".join(warnings):
        recommendations.append(
            "Avoid wide table-based layouts; use standard left-aligned text."
        )
    if "page headers/footers" in " ".join(warnings):
        recommendations.append("Remove repeated headers, footers, or page-number text.")
    if file_type and file_type.lower() == "doc":
        warnings.append(
            "Legacy .doc format is parsed inconsistently by ATS; prefer .docx or PDF."
        )
        recommendations.append("Save the resume as .docx or PDF rather than legacy .doc.")

    # Always-on transparency note.
    recommendations.append(
        "ATS compatibility is not a guarantee of an interview — different ATS "
        "products parse resumes differently. This check is based only on extracted "
        "text and cannot assess fonts, columns, images, or visual layout."
    )

    return {
        "score": score,
        "threshold": cutoff,
        "passed": passed,
        "checks": checks,
        "warnings": warnings,
        "recommendations": recommendations,
    }
