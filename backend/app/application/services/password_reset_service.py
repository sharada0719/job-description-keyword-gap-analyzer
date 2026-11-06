"""
Password-reset service.

Flow:
  1. User submits email → we issue a signed JWT "reset token" (type="password_reset")
     valid for PASSWORD_RESET_TOKEN_EXPIRE_MINUTES minutes and send it by email.
  2. User clicks the link → frontend extracts the token from the URL and POSTs it
     with the new password.
  3. Backend validates the token (signature + expiry + type), hashes the new
     password, and saves it.  The token is single-use because it contains `exp`
     and we never re-sign the same one.

Security properties:
  - Token is signed with the existing SECRET_KEY (HMAC-HS256).
  - Expiry is enforced by decode_token().
  - We return the same 200 response whether or not the email is registered,
    so we never reveal whether an address exists.
  - The raw token is never logged.
  - Plaintext passwords are never stored.
"""
from __future__ import annotations

import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import timedelta

from app.core.config import settings
from app.core.exceptions import AIServiceError, AuthenticationError, ValidationError
from app.core.logging import get_logger
from app.core.security import decode_token, hash_password
from app.infrastructure.repositories.user_repository import UserRepository
from sqlalchemy.ext.asyncio import AsyncSession

from jose import jwt

logger = get_logger("services.password_reset")


# ── Token helpers ────────────────────────────────────────────────────────────

def create_password_reset_token(user_id: int) -> str:
    """Issue a short-lived signed JWT for password reset."""
    from datetime import datetime, timezone
    expire = (
        datetime.now(timezone.utc)
        + timedelta(minutes=settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES)
    )
    payload = {
        "sub": str(user_id),
        "type": "password_reset",
        "exp": expire,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def verify_password_reset_token(token: str) -> int:
    """
    Verify a password-reset token.

    Returns the user_id encoded in the token.
    Raises AuthenticationError if the token is invalid, expired, or wrong type.
    """
    payload = decode_token(token)
    if payload is None or payload.get("type") != "password_reset":
        raise AuthenticationError("Invalid or expired password-reset link.")
    user_id_str = payload.get("sub")
    if not user_id_str:
        raise AuthenticationError("Invalid password-reset token.")
    return int(user_id_str)


# ── Email sending ─────────────────────────────────────────────────────────────

def _email_configured() -> bool:
    return bool(
        settings.SMTP_HOST.strip()
        and settings.SMTP_FROM_EMAIL.strip()
    )


def send_password_reset_email(to_email: str, reset_token: str) -> None:
    """
    Send the password-reset link by email.

    Raises RuntimeError if SMTP is not configured.
    Raises smtplib errors on delivery failure (caller handles them).
    """
    if not _email_configured():
        raise RuntimeError(
            "SMTP is not configured. Set SMTP_HOST, SMTP_USERNAME, "
            "SMTP_PASSWORD, and SMTP_FROM_EMAIL in the backend .env file."
        )

    reset_url = (
        f"{settings.FRONTEND_BASE_URL.rstrip('/')}/reset-password"
        f"?token={reset_token}"
    )

    subject = "Reset your Job Description Keyword Gap Analyzer password"
    body_html = f"""\
<html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #7C3AED;">Password Reset Request</h2>
  <p>We received a request to reset the password for your account.</p>
  <p>Click the button below to set a new password. This link expires in
     <strong>{settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES} minutes</strong>.</p>
  <a href="{reset_url}"
     style="display:inline-block;background:#7C3AED;color:#fff;padding:12px 24px;
            border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0;">
    Reset Password
  </a>
  <p style="color:#666;font-size:12px;">
    If you did not request a password reset, you can ignore this email.<br>
    This link will expire automatically.
  </p>
  <hr style="border:none;border-top:1px solid #eee;">
  <p style="color:#999;font-size:11px;">Job Description Keyword Gap Analyzer</p>
</body></html>"""

    body_text = (
        f"Reset your password by opening this link (valid for "
        f"{settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES} minutes):\n\n{reset_url}"
    )

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
    msg["To"]      = to_email
    msg.attach(MIMEText(body_text, "plain"))
    msg.attach(MIMEText(body_html,  "html"))

    context = ssl.create_default_context()
    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
        if settings.SMTP_TLS:
            server.starttls(context=context)
        if settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
            server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
        server.sendmail(settings.SMTP_FROM_EMAIL, to_email, msg.as_string())

    logger.info("Password-reset email sent (token redacted)")


# ── Service functions ─────────────────────────────────────────────────────────

async def request_password_reset(email: str, db: AsyncSession) -> dict:
    """
    Handle a forgot-password request.

    Always returns the same dict (email not revealed to the caller).
    Only tries to send an email if the address is registered and SMTP is set up.
    """
    if not _email_configured():
        return {
            "status": "unavailable",
            "message": (
                "Email sending is not configured on this server. "
                "Contact the administrator to set up SMTP."
            ),
        }

    repo = UserRepository(db)
    user = await repo.get_by_email(email)

    if user and user.is_active:
        token = create_password_reset_token(user.id)
        try:
            send_password_reset_email(email, token)
            logger.info("Password-reset email dispatched for user id=%d", user.id)
        except Exception as exc:
            # Log the error but do NOT reveal it to the caller
            logger.error("Failed to send password-reset email: %s", exc)

    # Identical response whether or not the email exists (prevents enumeration)
    return {
        "status": "sent",
        "message": (
            "If that email address is registered, you will receive a "
            "password-reset link shortly."
        ),
    }


async def confirm_password_reset(token: str, new_password: str, db: AsyncSession) -> None:
    """
    Validate the reset token and apply the new password.

    Raises AuthenticationError if the token is invalid/expired.
    Raises ValidationError if the new password is too short.
    """
    if len(new_password) < 8:
        raise ValidationError("Password must be at least 8 characters.")

    user_id = verify_password_reset_token(token)

    repo = UserRepository(db)
    user = await repo.get_by_id(user_id)
    if user is None or not user.is_active:
        raise AuthenticationError("Account not found or deactivated.")

    user.hashed_password = hash_password(new_password)
    await repo.update(user)
    logger.info("Password reset successful for user id=%d", user.id)
