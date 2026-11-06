"""
JobApplication ORM model — tracks saved job opportunities per user.
"""
from typing import List, Optional

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.database.base import Base, TimestampMixin


class JobApplicationModel(Base, TimestampMixin):
    __tablename__ = "job_applications"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )

    # ── Job details ────────────────────────────────────────────────
    job_title: Mapped[str] = mapped_column(String(255), nullable=False)
    company_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    job_location: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    job_description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    job_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    contact_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # ── Tracking ───────────────────────────────────────────────────
    application_status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="saved", index=True
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # ── Relationships ────────────────────────────────────────────────
    user: Mapped["UserModel"] = relationship(
        "UserModel", back_populates="job_applications"
    )

    def __repr__(self) -> str:
        return f"<JobApplication id={self.id} title={self.job_title} status={self.application_status}>"
