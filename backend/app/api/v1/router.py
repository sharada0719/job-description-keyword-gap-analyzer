"""
API v1 root router — registers all endpoint sub-routers.
"""
from fastapi import APIRouter

from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.users import router as users_router
from app.api.v1.endpoints.resumes import router as resumes_router
from app.api.v1.endpoints.jobs import router as jobs_router
from app.api.v1.endpoints.analysis import router as analysis_router
from app.api.v1.endpoints.recommendations import router as recommendations_router
from app.api.v1.endpoints.job_search import router as job_search_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(resumes_router)
api_router.include_router(jobs_router)
api_router.include_router(analysis_router)
api_router.include_router(recommendations_router)
api_router.include_router(job_search_router)
