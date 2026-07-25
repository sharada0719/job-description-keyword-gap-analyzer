"""
Authentication service — registration, login, and token refresh.
"""
from sqlalchemy.ext.asyncio import AsyncSession
import traceback

from app.application.dtos.auth import LoginRequest, RefreshRequest, RegisterRequest, TokenResponse
from app.core.exceptions import AuthenticationError, ConflictError
from app.core.logging import get_logger
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.infrastructure.models.user import UserModel
from app.infrastructure.repositories.user_repository import UserRepository

logger = get_logger("services.auth")


class AuthService:

    def __init__(self, db: AsyncSession) -> None:
        self._repo = UserRepository(db)

    async def register(self, request: RegisterRequest) -> TokenResponse:
        try:
            print("STEP 1")

            exists = await self._repo.email_exists(request.email)
            print("STEP 2 - email_exists =", exists)

            if exists:
                raise ConflictError(f"Email '{request.email}' is already registered.")

            print("STEP 3")

            hashed = hash_password(request.password)
            print("STEP 4 - password hashed")

            user = UserModel(
                email=request.email,
                full_name=request.full_name,
                hashed_password=hashed,
            )
            print("STEP 5 - user model created")

            user = await self._repo.create(user)
            print("STEP 6 - user saved", user.id)

            access = create_access_token(user.id)
            print("STEP 7 - access token")

            refresh = create_refresh_token(user.id)
            print("STEP 8 - refresh token")

            return TokenResponse(
                access_token=access,
                refresh_token=refresh,
            )

        except Exception:
            traceback.print_exc()
            raise

    async def login(self, request: LoginRequest) -> TokenResponse:
        user = await self._repo.get_by_email(request.email)
        if user is None or not verify_password(request.password, user.hashed_password):
            raise AuthenticationError("Incorrect email or password.")

        if not user.is_active:
            raise AuthenticationError("Account is deactivated.")

        logger.info("User logged in: id=%d", user.id)
        return TokenResponse(
            access_token=create_access_token(user.id),
            refresh_token=create_refresh_token(user.id),
        )

    async def refresh(self, request: RefreshRequest) -> TokenResponse:
        payload = decode_token(request.refresh_token)
        if payload is None or payload.get("type") != "refresh":
            raise AuthenticationError("Invalid or expired refresh token.")

        user_id: str = payload.get("sub")
        user = await self._repo.get_by_id(int(user_id))
        if user is None or not user.is_active:
            raise AuthenticationError("User not found or deactivated.")

        return TokenResponse(
            access_token=create_access_token(user.id),
            refresh_token=create_refresh_token(user.id),
        )
