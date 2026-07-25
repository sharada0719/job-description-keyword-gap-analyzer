"""
JobDescription ORM model.
"""
from typing import List, Optional

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.database.base import Base, TimestampMixin


class JobDescriptionModel(Base, TimestampMixin):
    __tablename__ = "job_descriptions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    company: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    raw_text: Mapped[str] = mapped_column(Text, nullable=False)

    # Relationships
    user: Mapped["UserModel"] = relationship(
        "UserModel", back_populates="job_descriptions"
    )
    analyses: Mapped[List["AnalysisModel"]] = relationship(
        "AnalysisModel", back_populates="job_description", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<JobDescription id={self.id} title={self.title}>"
