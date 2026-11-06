"""
Authentication endpoints — register, login, refresh, forgot-password, reset-password.
"""
from fastapi import APIRouter

from app.application.dtos.auth import (
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
)
from app.application.services.auth_service import AuthService
from app.application.services.password_reset_service import (
    confirm_password_reset,
    request_password_reset,
)
from app.application.dtos.common import MessageResponse
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


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
async def forgot_password(
    request: ForgotPasswordRequest,
    db: DBSession,
) -> ForgotPasswordResponse:
    """
    Request a password-reset link.

    Sends an email to the address if it is registered and SMTP is configured.
    Always returns the same response regardless of whether the email exists,
    so this endpoint cannot be used to enumerate registered addresses.

    If SMTP is not configured, returns status='unavailable' with a clear message.
    """
    result = await request_password_reset(request.email, db)
    return ForgotPasswordResponse(**result)


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(
    request: ResetPasswordRequest,
    db: DBSession,
) -> MessageResponse:
    """
    Confirm a password reset using the token from the email link.

    Validates the token (signature, expiry, type) and applies the new password.
    Returns 401 if the token is invalid or expired.
    """
    await confirm_password_reset(request.token, request.new_password, db)
    return MessageResponse(message="Password reset successfully. You can now sign in.")
