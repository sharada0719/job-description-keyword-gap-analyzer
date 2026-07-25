"""
Import all models so Alembic autogenerate can discover them.
"""
from app.infrastructure.models.user import UserModel
from app.infrastructure.models.resume import ResumeModel
from app.infrastructure.models.job_description import JobDescriptionModel
from app.infrastructure.models.analysis import AnalysisModel

__all__ = [
    "UserModel",
    "ResumeModel",
    "JobDescriptionModel",
    "AnalysisModel",
]
