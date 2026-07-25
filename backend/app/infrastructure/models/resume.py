"""
Resume ORM model.
"""
from typing import List

from typing import Optional

from sqlalchemy import ForeignKey, LargeBinary, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.database.base import Base, TimestampMixin


class ResumeModel(Base, TimestampMixin):
    __tablename__ = "resumes"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_type: Mapped[str] = mapped_column(String(10), nullable=False)  # pdf | docx
    file_size: Mapped[Optional[int]] = mapped_column(nullable=True)     # bytes
    file_data: Mapped[Optional[bytes]] = mapped_column(LargeBinary, nullable=True)  # original file
    raw_text: Mapped[str] = mapped_column(Text, nullable=False)

    # Relationships
    user: Mapped["UserModel"] = relationship("UserModel", back_populates="resumes")
    analyses: Mapped[List["AnalysisModel"]] = relationship(
        "AnalysisModel", back_populates="resume", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Resume id={self.id} title={self.title}>"
