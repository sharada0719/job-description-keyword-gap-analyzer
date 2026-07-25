"""
Authentication endpoints — register, login, refresh.
"""
from fastapi import APIRouter

from app.application.dtos.auth import (
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
)
from app.application.services.auth_service import AuthService
from app.core.dependencies import DBSession

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(request: RegisterRequest, db: DBSession) -> TokenResponse:
    service = AuthService(db)
    return await service.register(request)

@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest, db: DBSession) -> TokenResponse:
    """Authenticate with email/password and return JWT tokens."""
    service = AuthService(db)
    return await service.login(request)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(request: RefreshRequest, db: DBSession) -> TokenResponse:
    """Exchange a refresh token for a new access token pair."""
    service = AuthService(db)
    return await service.refresh(request)
