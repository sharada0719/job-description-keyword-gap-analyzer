"""
Analysis ORM model — stores full keyword-gap analysis results.
"""
from typing import Optional

from sqlalchemy import Float, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.database.base import Base, TimestampMixin


class AnalysisModel(Base, TimestampMixin):
    __tablename__ = "analyses"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    resume_id: Mapped[int] = mapped_column(
        ForeignKey("resumes.id", ondelete="CASCADE"), index=True
    )
    job_description_id: Mapped[int] = mapped_column(
        ForeignKey("job_descriptions.id", ondelete="CASCADE"), index=True
    )

    # Scores
    overall_score: Mapped[float] = mapped_column(Float, nullable=False)
    semantic_similarity_score: Mapped[float] = mapped_column(Float, nullable=False)
    keyword_match_score: Mapped[float] = mapped_column(Float, nullable=False)

    # JSON result blobs (lists/dicts stored as JSONB-compatible JSON)
    matched_keywords: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    missing_keywords: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    resume_keywords: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    job_keywords: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    suggestions: Mapped[list] = mapped_column(JSON, nullable=False, default=list)

    # ATS compatibility report — additive, nullable so legacy rows validate.
    ats_report: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # Relationships
    user: Mapped["UserModel"] = relationship("UserModel", back_populates="analyses")
    resume: Mapped["ResumeModel"] = relationship("ResumeModel", back_populates="analyses")
    job_description: Mapped["JobDescriptionModel"] = relationship(
        "JobDescriptionModel", back_populates="analyses"
    )

    def __repr__(self) -> str:
        return f"<Analysis id={self.id} score={self.overall_score}>"
