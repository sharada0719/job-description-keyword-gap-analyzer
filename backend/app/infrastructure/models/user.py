"""
User ORM model.
"""
from typing import List

from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.database.base import Base, TimestampMixin


class UserModel(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relationships
    resumes: Mapped[List["ResumeModel"]] = relationship(
        "ResumeModel", back_populates="user", cascade="all, delete-orphan"
    )
    job_descriptions: Mapped[List["JobDescriptionModel"]] = relationship(
        "JobDescriptionModel", back_populates="user", cascade="all, delete-orphan"
    )
    analyses: Mapped[List["AnalysisModel"]] = relationship(
        "AnalysisModel", back_populates="user", cascade="all, delete-orphan"
    )
    job_applications: Mapped[List["JobApplicationModel"]] = relationship(
        "JobApplicationModel", back_populates="user", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email}>"
