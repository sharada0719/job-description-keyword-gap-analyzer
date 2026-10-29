"""
Skill taxonomy — pure, dependency-free helpers for keyword normalisation,
technical-term preservation, and confusable-technology guards.

This module intentionally has *no* NLP model imports so it can be unit-tested
quickly and deterministically.  It is consumed by the keyword extractor and
the similarity scorer.

Design goals (from the project's matching-accuracy requirements):
  * Preserve technical terms (C++, C#, .NET, Node.js, CI/CD, REST APIs, SQL,
    JavaScript, ...) even when KeyBERT ranks them low.
  * Normalise whitespace / capitalisation / punctuation and collapse common
    skill aliases so ``js`` == ``javascript``.
  * Prevent false matches such as ``java`` matching ``javascript``.
  * Avoid treating distinct technologies as equivalent merely because they
    are semantically related (react vs vue, postgres vs mysql, ...).
  * Reduce noisy / generic extracted keywords.
"""
from __future__ import annotations

import re
from typing import Dict, Iterable, List, Set

# ─────────────────────────────────────────────────────────────────────────────
# Canonical alias map — every alias is folded to a single canonical form.
# Keys/aliases are stored lower-cased; matching is case-insensitive.
# ─────────────────────────────────────────────────────────────────────────────
CANONICAL_ALIASES: Dict[str, str] = {
    # JavaScript family
    "js": "javascript",
    "ecmascript": "javascript",
    "es6": "javascript",
    # TypeScript
    "ts": "typescript",
    # Node
    "node": "node.js",
    "nodejs": "node.js",
    "node js": "node.js",
    # React / Vue / Angular (AngularJS is intentionally NOT aliased to Angular)
    "reactjs": "react",
    "react.js": "react",
    "vuejs": "vue",
    "vue.js": "vue",
    # C family
    "cpp": "c++",
    "c sharp": "c#",
    "csharp": "c#",
    "c# net": "c#",
    # .NET
    "dotnet": ".net",
    ".net core": ".net",
    "asp.net": "asp.net",
    # CI/CD
    "ci-cd": "ci/cd",
    "cicd": "ci/cd",
    "ci cd": "ci/cd",
    "continuous integration": "ci/cd",
    "continuous deployment": "ci/cd",
    # REST
    "rest api": "rest apis",
    "restful": "rest apis",
    "restful api": "rest apis",
    "restful apis": "rest apis",
    # Databases
    "postgres": "postgresql",
    "pg": "postgresql",
    "mongo": "mongodb",
    "ms sql server": "sql server",
    "mssql": "sql server",
    # Containers / orchestration
    "k8s": "kubernetes",
    "containerization": "docker",
    # Cloud
    "amazon web services": "aws",
    "gcp": "google cloud",
    "google cloud platform": "google cloud",
    # OS / shell
    "shell scripting": "bash",
    "shell": "bash",
}

# ─────────────────────────────────────────────────────────────────────────────
# Curated technical skills — guaranteed to be preserved during extraction
# even when KeyBERT ranks them below generic words.  Stored lower-cased.
# ─────────────────────────────────────────────────────────────────────────────
TECH_SKILLS: Set[str] = {
    # Languages
    "python", "javascript", "typescript", "java", "c++", "c#", "go", "rust",
    "kotlin", "swift", "ruby", "php", "scala", "r", "matlab", "perl", "dart",
    "objective-c", "groovy", "elixir", "haskell", "lua", "solidity",
    # Web / frameworks
    "react", "vue", "angular", "next.js", "nuxt", "svelte", "django", "flask",
    "fastapi", "spring", "spring boot", "express", "laravel", "rails",
    "asp.net", ".net", "node.js", "jquery", "redux", "graphql", "rest apis",
    # Data / ML
    "machine learning", "deep learning", "nlp", "computer vision",
    "tensorflow", "pytorch", "pandas", "numpy", "scikit-learn", "spark",
    "hadoop", "tableau", "power bi", "airflow", "dbt", "kafka", "etl",
    # Databases
    "sql", "postgresql", "mysql", "mongodb", "redis", "elasticsearch",
    "sqlite", "cassandra", "dynamodb", "oracle", "sql server", "snowflake",
    # Cloud / devops
    "aws", "azure", "google cloud", "docker", "kubernetes", "ci/cd",
    "terraform", "ansible", "jenkins", "git", "github", "gitlab",
    "linux", "bash", "powershell",
    # Tooling / concepts
    "microservices", "agile", "scrum", "tdd", "oop", "jenkins",
}

# Distinct technologies that must NOT be treated as semantically equivalent.
# Organised into CATEGORY GROUPS: only two *different* technologies within the
# SAME group are flagged confusable (java vs javascript, react vs vue, ...).
# A language and its own framework (python vs django) live in different groups
# and are therefore NOT flagged — they are related but not alternatives.
DISTINCT_TECH_GROUPS: list[frozenset[str]] = [
    # Languages
    frozenset({
        "java", "javascript", "typescript", "python", "ruby", "php", "go",
        "rust", "kotlin", "swift", "c", "c++", "c#", "scala",
    }),
    # Frontend frameworks
    frozenset({"react", "vue", "angular", "svelte"}),
    # Backend frameworks
    frozenset({"django", "flask", "fastapi", "spring", "rails", "express", ".net"}),
    # Databases
    frozenset({
        "postgresql", "mysql", "mongodb", "redis", "oracle", "sqlite",
        "dynamodb", "sql server",
    }),
    # Cloud providers
    frozenset({"aws", "azure", "google cloud"}),
    # Containers / orchestration
    frozenset({"docker", "kubernetes"}),
    # Operating systems
    frozenset({"linux", "windows"}),
    # Version control
    frozenset({"git", "svn"}),
    # API styles
    frozenset({"graphql", "rest apis"}),
]

# Flat lookup: keyword -> set of group indices it belongs to.
_DISTINCT_INDEX: Dict[str, set[int]] = {}
for _i, _group in enumerate(DISTINCT_TECH_GROUPS):
    for _term in _group:
        _DISTINCT_INDEX.setdefault(_term, set()).add(_i)


def is_confusable(a: str, b: str) -> bool:
    """
    Return True when ``a`` and ``b`` are distinct technologies that must NOT be
    accepted as a semantic match (e.g. java vs javascript).

    Rules:
      * Equal strings are never confusable.
      * Two different members of the same DISTINCT_TECH category group are
        confusable (alternatives within a category, e.g. react vs vue).
      * Prefix-with-letter guard: if the shorter token is a prefix of the
        longer and the longer continues with a *letter* (java -> javascript,
        java + "script"), they are confusable.  This deliberately does NOT
        trigger for "react" -> "react native" (continues with a space) or
        "c" -> "c++" (continues with a non-letter).
    """
    if not a or not b:
        return False
    a = normalize_keyword(a)
    b = normalize_keyword(b)
    if a == b:
        return False
    # Same category group?
    a_groups = _DISTINCT_INDEX.get(a)
    b_groups = _DISTINCT_INDEX.get(b)
    if a_groups and b_groups and (a_groups & b_groups):
        return True
    # Prefix-with-letter guard
    if len(a) < len(b) and b.startswith(a) and len(a) >= 2 and b[len(a)].isalpha():
        return True
    if len(b) < len(a) and a.startswith(b) and len(b) >= 2 and a[len(b)].isalpha():
        return True
    return False
GENERIC_STOPWORDS: Set[str] = {
    "experience", "team", "role", "responsibilities", "candidate", "candidates",
    "requirements", "skills", "ability", "strong", "years", "work", "working",
    "project", "projects", "company", "environment", "opportunity",
    "communication", "benefits", "salary", "apply", "resume", "job", "jobs",
    "plus", "bonus", "nice", "have", "must", "preferred", "desired", "required",
    "qualification", "qualifications", "looking", "join", "help", "build",
    "product", "products", "service", "services", "solutions", "solution",
    "platform", "platforms", "system", "systems", "data", "new", "good",
    "great", "excellent", "knowledge", "understanding", "familiarity",
    "hands", "passion", "passionate", "self", "motivated", "driven",
}

_WS_RE = re.compile(r"\s+")


def normalize_keyword(keyword: str) -> str:
    """
    Normalise a single keyword: strip, collapse internal whitespace,
    lower-case, and fold known aliases to their canonical form.
    """
    if not keyword:
        return ""
    kw = _WS_RE.sub(" ", keyword.strip()).lower()
    return CANONICAL_ALIASES.get(kw, kw)


def canonical_set(keywords: Iterable[str]) -> List[str]:
    """Normalise and de-duplicate an iterable of keywords, preserving order."""
    seen: Set[str] = set()
    result: List[str] = []
    for kw in keywords:
        norm = normalize_keyword(kw)
        if norm and norm not in seen:
            seen.add(norm)
            result.append(norm)
    return result


# ─────────────────────────────────────────────────────────────────────────────
# Known-skills scan — guaranteed preservation of technical terms in raw text.
# Uses lookarounds (instead of ``\b``) so special-character tokens like
# ``c++``, ``c#``, ``.net``, ``node.js``, ``ci/cd`` match correctly.
# ─────────────────────────────────────────────────────────────────────────────
def _term_pattern(term: str) -> "re.Pattern[str]":
    escaped = re.escape(term)
    # (?i) case-insensitive; lookarounds ensure token boundaries for any char.
    return re.compile(r"(?<![A-Za-z0-9])" + escaped + r"(?![A-Za-z0-9])", re.IGNORECASE)


_COMPILED_PATTERNS: Dict[str, "re.Pattern[str]"] = {
    term: _term_pattern(term) for term in TECH_SKILLS
}


def find_known_skills(text: str) -> List[str]:
    """
    Scan ``text`` for curated technical skills and return their canonical
    (normalised) forms, de-duplicated and in a stable order.
    """
    if not text:
        return []
    found: List[str] = []
    seen: Set[str] = set()
    for term in sorted(TECH_SKILLS, key=len, reverse=True):
        if _COMPILED_PATTERNS[term].search(text):
            canonical = CANONICAL_ALIASES.get(term, term)
            if canonical not in seen:
                seen.add(canonical)
                found.append(canonical)
    return found


def is_generic_noise(keyword: str) -> bool:
    """True if a KeyBERT/NER keyword is generic filler and should be dropped."""
    return normalize_keyword(keyword) in GENERIC_STOPWORDS
