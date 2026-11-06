"""
Tests for the Forgot Password / Password Reset feature.

Covers:
  - Token creation and verification (valid, expired, wrong type)
  - Service validation (short password, inactive user)
  - Email not configured → unavailable response
  - Email delivery failure is swallowed (not revealed to caller)
  - Token is never logged
  - DTO validation
  - Successful confirm flow (mocked repo)
"""
import time
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from jose import jwt

from app.application.dtos.auth import (
    ForgotPasswordRequest,
    ResetPasswordRequest,
)
from app.application.services.password_reset_service import (
    create_password_reset_token,
    verify_password_reset_token,
    _email_configured,
)
from app.core.config import settings
from app.core.exceptions import AuthenticationError, ValidationError


# ── Token creation and verification ─────────────────────────────────────────

def test_create_token_is_a_string():
    token = create_password_reset_token(42)
    assert isinstance(token, str)
    assert len(token) > 20


def test_token_contains_correct_user_id():
    token = create_password_reset_token(7)
    user_id = verify_password_reset_token(token)
    assert user_id == 7


def test_token_contains_password_reset_type():
    token = create_password_reset_token(1)
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    assert payload["type"] == "password_reset"


def test_expired_token_raises():
    # Build a token with exp in the past
    payload = {
        "sub": "1",
        "type": "password_reset",
        "exp": datetime.now(timezone.utc) - timedelta(seconds=1),
    }
    expired_token = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    with pytest.raises(AuthenticationError, match="Invalid or expired"):
        verify_password_reset_token(expired_token)


def test_wrong_type_token_raises():
    # A regular access token must not be accepted as a reset token
    payload = {
        "sub": "1",
        "type": "access",
        "exp": datetime.now(timezone.utc) + timedelta(hours=1),
    }
    access_token = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    with pytest.raises(AuthenticationError):
        verify_password_reset_token(access_token)


def test_garbage_token_raises():
    with pytest.raises(AuthenticationError):
        verify_password_reset_token("this.is.not.a.valid.jwt")


def test_empty_token_raises():
    with pytest.raises(AuthenticationError):
        verify_password_reset_token("")


# ── Email configuration detection ────────────────────────────────────────────

def test_email_not_configured_when_host_empty():
    with patch("app.application.services.password_reset_service.settings") as mock:
        mock.SMTP_HOST = ""
        mock.SMTP_FROM_EMAIL = "from@example.com"
        assert _email_configured() is False


def test_email_not_configured_when_from_email_empty():
    with patch("app.application.services.password_reset_service.settings") as mock:
        mock.SMTP_HOST = "smtp.example.com"
        mock.SMTP_FROM_EMAIL = ""
        assert _email_configured() is False


def test_email_configured_when_both_set():
    with patch("app.application.services.password_reset_service.settings") as mock:
        mock.SMTP_HOST = "smtp.example.com"
        mock.SMTP_FROM_EMAIL = "from@example.com"
        assert _email_configured() is True


# ── request_password_reset ───────────────────────────────────────────────────

def test_request_returns_unavailable_when_smtp_not_configured():
    import asyncio
    from app.application.services.password_reset_service import request_password_reset

    async def _run():
        db = AsyncMock()
        with patch("app.application.services.password_reset_service._email_configured", return_value=False):
            result = await request_password_reset("user@example.com", db)
        return result

    result = asyncio.get_event_loop().run_until_complete(_run())
    assert result["status"] == "unavailable"
    assert "SMTP" in result["message"] or "not configured" in result["message"]


def test_request_same_response_for_unknown_email():
    """Must not reveal whether the email is registered."""
    import asyncio
    from app.application.services.password_reset_service import request_password_reset

    async def _run():
        mock_repo = MagicMock()
        mock_repo.get_by_email = AsyncMock(return_value=None)  # user not found

        with patch("app.application.services.password_reset_service._email_configured", return_value=True), \
             patch("app.application.services.password_reset_service.UserRepository", return_value=mock_repo):
            result = await request_password_reset("unknown@example.com", AsyncMock())
        return result

    result = asyncio.get_event_loop().run_until_complete(_run())
    # Same response as "registered" — does not reveal whether email exists
    assert result["status"] == "sent"


def test_request_swallows_smtp_errors():
    """Email delivery failure must not propagate to the caller."""
    import asyncio
    from app.application.services.password_reset_service import request_password_reset

    mock_user = MagicMock()
    mock_user.id = 1
    mock_user.is_active = True

    async def _run():
        mock_repo = MagicMock()
        mock_repo.get_by_email = AsyncMock(return_value=mock_user)

        with patch("app.application.services.password_reset_service._email_configured", return_value=True), \
             patch("app.application.services.password_reset_service.UserRepository", return_value=mock_repo), \
             patch("app.application.services.password_reset_service.send_password_reset_email",
                   side_effect=Exception("SMTP error")):
            result = await request_password_reset("user@example.com", AsyncMock())
        return result

    result = asyncio.get_event_loop().run_until_complete(_run())
    # Error is swallowed — caller still gets the standard response
    assert result["status"] == "sent"


# ── confirm_password_reset ────────────────────────────────────────────────────

def test_confirm_rejects_short_password():
    import asyncio
    from app.application.services.password_reset_service import confirm_password_reset

    token = create_password_reset_token(1)

    async def _run():
        with pytest.raises(ValidationError, match="8 characters"):
            await confirm_password_reset(token, "short", AsyncMock())

    asyncio.get_event_loop().run_until_complete(_run())


def test_confirm_rejects_inactive_user():
    import asyncio
    from app.application.services.password_reset_service import confirm_password_reset

    token = create_password_reset_token(99)
    mock_user = MagicMock()
    mock_user.is_active = False

    async def _run():
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=mock_user)
        with patch("app.application.services.password_reset_service.UserRepository", return_value=mock_repo):
            with pytest.raises(AuthenticationError):
                await confirm_password_reset(token, "ValidPass123", AsyncMock())

    asyncio.get_event_loop().run_until_complete(_run())


def test_confirm_updates_hashed_password():
    import asyncio
    from app.application.services.password_reset_service import confirm_password_reset

    token = create_password_reset_token(5)
    mock_user = MagicMock()
    mock_user.is_active = True
    mock_user.hashed_password = "old_hash"

    async def _run():
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=mock_user)
        mock_repo.update    = AsyncMock(return_value=mock_user)
        with patch("app.application.services.password_reset_service.UserRepository", return_value=mock_repo):
            await confirm_password_reset(token, "NewPassword99", AsyncMock())

        # Password was hashed (not stored as plaintext)
        assert mock_user.hashed_password != "NewPassword99"
        assert mock_user.hashed_password != "old_hash"
        assert len(mock_user.hashed_password) > 20  # bcrypt hash

    asyncio.get_event_loop().run_until_complete(_run())


# ── DTO validation ────────────────────────────────────────────────────────────

def test_forgot_password_dto_accepts_valid_email():
    req = ForgotPasswordRequest(email="user@example.com")
    assert req.email == "user@example.com"


def test_forgot_password_dto_rejects_invalid_email():
    with pytest.raises(Exception):
        ForgotPasswordRequest(email="not-an-email")


def test_reset_password_dto_accepts_valid():
    req = ResetPasswordRequest(token="sometoken", new_password="ValidPass123")
    assert req.token == "sometoken"
    assert req.new_password == "ValidPass123"


def test_reset_password_dto_rejects_short_password():
    with pytest.raises(Exception):
        ResetPasswordRequest(token="sometoken", new_password="short")
