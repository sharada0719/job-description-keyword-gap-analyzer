"""
Analysis domain entity — result of a keyword-gap computation.
"""
from dataclasses import dataclass
from typing import List


@dataclass
class KeywordMatch:
    keyword: str
    score: float  # 0.0 – 1.0 semantic similarity


@dataclass
class AnalysisResult:
    overall_score: float
    semantic_similarity_score: float
    keyword_match_score: float
    matched_keywords: List[KeywordMatch]
    missing_keywords: List[str]
    resume_keywords: List[str]
    job_keywords: List[str]
    suggestions: List[str]
