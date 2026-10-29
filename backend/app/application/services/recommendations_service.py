"""
Job and internship recommendations service.

Generates GROUNDED opportunity suggestions based on the extracted resume
keywords from a completed analysis.  No external API is called; instead
the service produces:

  1. Role suggestions — concrete job/internship titles whose skill
     requirements overlap with the resume keywords.  Each suggestion
     includes a rationale ("why this fits") and a pre-built deep-link
     search URL on a legitimate public job board so the user can explore
     real listings immediately.

  2. Board links — top-level links to authoritative job-search platforms.

Design rationale:
  * No fake listings are ever generated.
  * No third-party API is required; the feature works without any
    additional configuration.
  * If an optional JSEARCH_API_KEY is configured, live listings can be
    augmented (future extension point, documented in README).
  * All URLs lead to the job board's own search results page using the
    board's documented query-string format; no scraping, no ToS violation.

Limitations (explicitly returned so the UI can show them):
  * Role names and skill matches come from a curated internal taxonomy —
    they may not reflect current market terminology perfectly.
  * Actual vacancy availability depends on the external board at click
    time; the backend does not verify whether vacancies exist.
  * Salary, company, and deadline data are NOT fabricated; only verified
    search links are provided.
"""
from __future__ import annotations

import urllib.parse
from typing import Any, Dict, List, Optional

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger("services.recommendations")

# ── Role taxonomy ─────────────────────────────────────────────────────────────
# Each entry describes a role families that freshers / students / graduates can
# realistically target.  The "required" set must have >= 1 match; "bonus" gives
# extra weight.  Internship and fresher variants are tagged explicitly.
_ROLE_TAXONOMY: List[Dict[str, Any]] = [
    # ── Python / Backend ──────────────────────────────────────────────────────
    {
        "title": "Python Developer",
        "required": {"python"},
        "bonus": {"django", "flask", "fastapi", "rest apis", "sql"},
        "tags": ["full-time", "fresher-friendly"],
        "description": "Build server-side applications with Python frameworks.",
    },
    {
        "title": "Python Backend Intern",
        "required": {"python"},
        "bonus": {"django", "flask", "fastapi", "rest apis", "sql"},
        "tags": ["internship"],
        "description": "Hands-on backend development internship using Python.",
    },
    {
        "title": "Django/Flask Developer",
        "required": {"python"},
        "bonus": {"django", "flask", "rest apis", "postgresql", "mysql"},
        "tags": ["full-time", "fresher-friendly"],
        "description": "Develop web APIs and services with Django or Flask.",
    },
    # ── JavaScript / Frontend ──────────────────────────────────────────────────
    {
        "title": "React Frontend Developer",
        "required": {"react"},
        "bonus": {"javascript", "typescript", "css", "html", "redux"},
        "tags": ["full-time", "fresher-friendly"],
        "description": "Build responsive UIs using React.",
    },
    {
        "title": "Frontend Developer Intern",
        "required": {"javascript"},
        "bonus": {"react", "vue", "typescript", "css", "html"},
        "tags": ["internship"],
        "description": "Gain hands-on experience building web user interfaces.",
    },
    {
        "title": "Full-Stack JavaScript Developer",
        "required": {"javascript"},
        "bonus": {"node.js", "react", "typescript", "mongodb", "sql"},
        "tags": ["full-time"],
        "description": "End-to-end web development with JavaScript.",
    },
    {
        "title": "Node.js Developer",
        "required": {"node.js"},
        "bonus": {"javascript", "typescript", "rest apis", "mongodb", "sql"},
        "tags": ["full-time", "fresher-friendly"],
        "description": "Server-side JavaScript development with Node.js.",
    },
    # ── Data / ML ──────────────────────────────────────────────────────────────
    {
        "title": "Data Science Intern",
        "required": {"python"},
        "bonus": {"machine learning", "pandas", "numpy", "scikit-learn", "sql"},
        "tags": ["internship"],
        "description": "Apply data analysis and ML techniques to real datasets.",
    },
    {
        "title": "Machine Learning Engineer",
        "required": {"machine learning", "python"},
        "bonus": {"tensorflow", "pytorch", "scikit-learn", "deep learning", "numpy"},
        "tags": ["full-time"],
        "description": "Design and deploy ML models at scale.",
    },
    {
        "title": "Data Analyst",
        "required": {"sql"},
        "bonus": {"python", "tableau", "power bi", "excel", "pandas"},
        "tags": ["full-time", "fresher-friendly", "graduate-trainee"],
        "description": "Turn data into business insights using SQL and BI tools.",
    },
    {
        "title": "Data Analyst Intern",
        "required": {"sql"},
        "bonus": {"python", "tableau", "power bi", "excel", "pandas"},
        "tags": ["internship"],
        "description": "Entry-level data analysis internship.",
    },
    {
        "title": "NLP / AI Research Intern",
        "required": {"python"},
        "bonus": {"nlp", "machine learning", "deep learning", "tensorflow", "pytorch"},
        "tags": ["internship"],
        "description": "Research and prototype NLP and AI solutions.",
    },
    # ── DevOps / Cloud ────────────────────────────────────────────────────────
    {
        "title": "DevOps / Cloud Engineer",
        "required": {"docker"},
        "bonus": {"kubernetes", "aws", "azure", "google cloud", "ci/cd", "terraform"},
        "tags": ["full-time"],
        "description": "Maintain and automate cloud infrastructure.",
    },
    {
        "title": "DevOps Intern",
        "required": {"git"},
        "bonus": {"docker", "ci/cd", "linux", "bash", "kubernetes", "aws"},
        "tags": ["internship"],
        "description": "Learn CI/CD, containerisation, and cloud automation.",
    },
    {
        "title": "Cloud Engineer (AWS/Azure)",
        "required": {"aws"},
        "bonus": {"azure", "google cloud", "docker", "terraform", "kubernetes"},
        "tags": ["full-time"],
        "description": "Deploy and manage cloud-native workloads.",
    },
    # ── General / Entry-level ─────────────────────────────────────────────────
    {
        "title": "Software Developer Intern",
        "required": {"python"},
        "bonus": {"javascript", "java", "git", "sql"},
        "tags": ["internship"],
        "description": "General software development internship — open to most tech stacks.",
    },
    {
        "title": "Graduate Software Engineer",
        "required": {"python"},
        "bonus": {"javascript", "java", "git", "sql", "rest apis"},
        "tags": ["full-time", "graduate-trainee", "fresher-friendly"],
        "description": "Entry-level engineering role for recent graduates.",
    },
    {
        "title": "Java Developer",
        "required": {"java"},
        "bonus": {"spring", "sql", "rest apis", "docker", "git"},
        "tags": ["full-time", "fresher-friendly"],
        "description": "Develop enterprise applications with Java and Spring.",
    },
    {
        "title": "Java Backend Intern",
        "required": {"java"},
        "bonus": {"spring", "sql", "rest apis", "git"},
        "tags": ["internship"],
        "description": "Backend Java development internship.",
    },
    {
        "title": "TypeScript / Angular Developer",
        "required": {"typescript"},
        "bonus": {"angular", "react", "javascript", "node.js"},
        "tags": ["full-time"],
        "description": "Front-end or full-stack development with TypeScript.",
    },
    {
        "title": "QA / Test Automation Intern",
        "required": {"python"},
        "bonus": {"sql", "git", "rest apis", "javascript"},
        "tags": ["internship"],
        "description": "Learn test automation and quality assurance processes.",
    },
    {
        "title": "Database / SQL Developer",
        "required": {"sql"},
        "bonus": {"postgresql", "mysql", "python", "mongodb", "oracle"},
        "tags": ["full-time", "fresher-friendly"],
        "description": "Design and optimise relational database solutions.",
    },
]


# ── URL builders (legitimate search deep-links) ────────────────────────────────
def _indeed_url(query: str, location: str = "") -> str:
    params: Dict[str, str] = {"q": query, "sort": "date"}
    if location:
        params["l"] = location
    return "https://www.indeed.com/jobs?" + urllib.parse.urlencode(params)


def _linkedin_url(query: str, location: str = "") -> str:
    params: Dict[str, str] = {"keywords": query, "f_TPR": "r604800"}  # last 7 days
    if location:
        params["location"] = location
    return "https://www.linkedin.com/jobs/search/?" + urllib.parse.urlencode(params)


def _internshala_url(query: str) -> str:
    # Internshala uses path-based routing; fall back to search query param.
    slug = query.lower().replace(" ", "-")
    return f"https://internshala.com/internships/{urllib.parse.quote(slug)}-internship/"


def _wellfound_url(query: str) -> str:
    return (
        "https://wellfound.com/role/r/"
        + urllib.parse.quote(query.lower().replace(" ", "-"))
    )


def _google_jobs_url(query: str, location: str = "") -> str:
    q = f"{query} jobs"
    if location:
        q += f" {location}"
    return "https://www.google.com/search?" + urllib.parse.urlencode({"q": q, "ibp": "htl;jobs"})


def _build_search_links(title: str, tags: List[str], location: str = "") -> List[Dict[str, str]]:
    """Build search links appropriate to the role type."""
    links = [
        {"label": "Indeed",       "url": _indeed_url(title, location)},
        {"label": "LinkedIn Jobs", "url": _linkedin_url(title, location)},
        {"label": "Google Jobs",   "url": _google_jobs_url(title, location)},
    ]
    if "internship" in tags:
        links.append({"label": "Internshala", "url": _internshala_url(title)})
    if "fresher-friendly" in tags or "graduate-trainee" in tags:
        links.append({"label": "Wellfound (AngelList)", "url": _wellfound_url(title)})
    return links


# ── Scoring ────────────────────────────────────────────────────────────────────
def _score_role(
    role: Dict[str, Any], resume_kw_set: set[str]
) -> Optional[Dict[str, Any]]:
    """
    Return a scored recommendation dict or None if the required skills are
    not met.
    """
    required_match = role["required"] & resume_kw_set
    if not required_match:
        return None  # Hard filter: at least one required skill must be present.

    bonus_match = role["bonus"] & resume_kw_set
    all_match = required_match | bonus_match

    # Score = (matched_required × 2 + matched_bonus) / (total_required × 2 + total_bonus)
    # Weighted to reward core skill coverage more than bonus.
    num_required = max(len(role["required"]), 1)
    num_bonus = max(len(role["bonus"]), 1)
    score = (
        len(required_match) * 2 + len(bonus_match)
    ) / (
        num_required * 2 + num_bonus
    )

    return {
        "title": role["title"],
        "tags": role["tags"],
        "description": role["description"],
        "score": round(score, 3),
        "matched_skills": sorted(all_match),
    }


# ── Public API ─────────────────────────────────────────────────────────────────
def generate_recommendations(
    resume_keywords: List[str],
    location: str = "",
    max_results: int = 8,
    include_internships: bool = True,
    include_fulltime: bool = True,
) -> Dict[str, Any]:
    """
    Generate job / internship recommendations for the given resume keywords.

    Args:
        resume_keywords: Normalised keywords extracted from the resume.
        location:        Optional free-text location preference (e.g. "London").
        max_results:     Maximum number of role suggestions to return.
        include_internships: Include internship roles in output.
        include_fulltime:    Include full-time / graduate roles in output.

    Returns a report dict::

        {
          "recommendations": [
            {
              "title": str,
              "tags": [str],
              "description": str,
              "score": float,          # 0–1 relevance to resume keywords
              "matched_skills": [str], # resume skills that match this role
              "search_links": [{"label": str, "url": str}],
            }
          ],
          "top_boards": [{"label": str, "url": str}],
          "limitations": [str],
          "location_used": str,
        }
    """
    kw_set = {kw.lower().strip() for kw in resume_keywords if kw}

    scored: List[Dict[str, Any]] = []
    for role in _ROLE_TAXONOMY:
        tag_ok = (
            (include_internships and "internship" in role["tags"])
            or (include_fulltime and any(t in role["tags"] for t in ["full-time", "graduate-trainee", "fresher-friendly"]))
        )
        if not tag_ok:
            continue
        result = _score_role(role, kw_set)
        if result:
            result["search_links"] = _build_search_links(result["title"], result["tags"], location)
            scored.append(result)

    # Sort by score descending, de-duplicate by title, cap at max_results.
    scored.sort(key=lambda r: r["score"], reverse=True)
    seen_titles: set[str] = set()
    final: List[Dict[str, Any]] = []
    for r in scored:
        if r["title"] not in seen_titles:
            seen_titles.add(r["title"])
            final.append(r)
        if len(final) >= max_results:
            break

    # Top-level board links for the user to explore freely.
    top_boards = [
        {"label": "Indeed",            "url": _indeed_url("software developer", location)},
        {"label": "LinkedIn Jobs",     "url": _linkedin_url("software developer", location)},
        {"label": "Internshala",       "url": "https://internshala.com/internships/"},
        {"label": "Wellfound",         "url": "https://wellfound.com/jobs"},
        {"label": "Google Jobs",       "url": _google_jobs_url("software developer", location)},
        {"label": "Glassdoor",         "url": "https://www.glassdoor.com/Job/index.htm"},
    ]

    limitations = [
        "Role suggestions are based on an internal skill-taxonomy, not live job market data.",
        "Search links lead to live board results — actual vacancy availability varies.",
        "Salary, company, and application deadline data are not provided here to avoid fabrication.",
        "Recommendations are based only on detected resume skills; your education, GPA, "
        "projects, and soft skills are also important to recruiters.",
    ]

    logger.info(
        "Recommendations generated: %d roles for %d resume keywords",
        len(final),
        len(kw_set),
    )

    return {
        "recommendations": final,
        "top_boards": top_boards,
        "limitations": limitations,
        "location_used": location or "",
    }


# ── Job Search (free-text query + filters) ─────────────────────────────────────

# Valid job-type filter values
_VALID_JOB_TYPES = {"internship", "fresher", "graduate_trainee", "full_time"}


def _glassdoor_url(query: str, location: str = "") -> str:
    params: Dict[str, str] = {"keyword": query}
    if location:
        params["locId"] = location  # Glassdoor accepts free text in locId
    return "https://www.glassdoor.com/Job/jobs.htm?" + urllib.parse.urlencode(params)


def _build_board_results(
    query: str,
    location: str,
    remote: bool,
    job_types: List[str],
) -> List[Dict[str, Any]]:
    """
    Build search URLs on legitimate public job boards for the user's query.
    Each result is a real, clickable search-results link — never a fabricated
    individual listing.
    """
    # Adapt the query based on job-type filters
    search_query = query.strip()
    if not search_query:
        search_query = "software developer"  # sensible default for browse

    type_suffix = ""
    if "internship" in job_types:
        type_suffix = " internship"
    elif "fresher" in job_types:
        type_suffix = " fresher"

    effective_query = (search_query + type_suffix).strip()
    if remote:
        effective_query += " remote"

    results = [
        {
            "board": "Indeed",
            "label": "Indeed",
            "url": _indeed_url(effective_query, location),
            "description": f"Search '{effective_query}' on Indeed",
        },
        {
            "board": "LinkedIn",
            "label": "LinkedIn Jobs",
            "url": _linkedin_url(effective_query, location),
            "description": f"Search '{effective_query}' on LinkedIn Jobs",
        },
        {
            "board": "Google",
            "label": "Google Jobs",
            "url": _google_jobs_url(effective_query, location),
            "description": f"Search '{effective_query}' on Google Jobs",
        },
        {
            "board": "Glassdoor",
            "label": "Glassdoor",
            "url": _glassdoor_url(effective_query, location),
            "description": f"Search '{effective_query}' on Glassdoor",
        },
    ]

    if "internship" in job_types or not job_types:
        results.append({
            "board": "Internshala",
            "label": "Internshala",
            "url": _internshala_url(search_query),
            "description": f"Search '{search_query}' internships on Internshala",
        })

    if "fresher" in job_types or "graduate_trainee" in job_types or not job_types:
        results.append({
            "board": "Wellfound",
            "label": "Wellfound (AngelList)",
            "url": _wellfound_url(search_query),
            "description": f"Search '{search_query}' on Wellfound",
        })

    return results


def search_jobs(
    query: str = "",
    location: str = "",
    remote: bool = False,
    job_types: Optional[List[str]] = None,
    resume_keywords: Optional[List[str]] = None,
    max_results: int = 10,
) -> Dict[str, Any]:
    """
    Free-text job search that builds legitimate board search URLs from the
    user's query, and optionally ranks role suggestions from resume keywords.

    No fake job listings are generated — only real, clickable search links
    on public job boards.  When resume_keywords are provided, the existing
    role taxonomy is used to suggest matching roles with their own search
    links.

    Returns a dict matching JobSearchResponse fields.
    """
    job_types = [t for t in (job_types or []) if t in _VALID_JOB_TYPES]
    resume_keywords = resume_keywords or []

    # Build board search links
    board_results = _build_board_results(query, location, remote, job_types)

    # If resume keywords provided, run role-matching for ranked suggestions
    role_matches: List[Dict[str, Any]] = []
    if resume_keywords:
        include_internships = "internship" in job_types if job_types else True
        include_fulltime = (
            bool(set(job_types) & {"fresher", "graduate_trainee", "full_time"})
            if job_types
            else True
        )
        rec_report = generate_recommendations(
            resume_keywords=resume_keywords,
            location=location,
            max_results=max_results,
            include_internships=include_internships,
            include_fulltime=include_fulltime,
        )
        role_matches = rec_report["recommendations"]

    limitations = [
        "Results are search links to legitimate job boards — not individual listings.",
        "Actual vacancy availability depends on the board at click time.",
        "Salary, company, and deadline data are not provided to avoid fabrication.",
        "Role matches are based on an internal skill taxonomy and your detected resume skills.",
    ]

    logger.info(
        "Job search: query='%s' location='%s' types=%s boards=%d roles=%d",
        query, location, job_types, len(board_results), len(role_matches),
    )

    return {
        "query": query or "",
        "location_used": location or "",
        "remote": remote,
        "job_types": job_types,
        "board_results": board_results,
        "role_matches": role_matches,
        "limitations": limitations,
        "has_resume_keywords": bool(resume_keywords),
    }
