"""
User profile endpoints.
"""
from fastapi import APIRouter

from app.application.dtos.user import UpdateProfileRequest, UserResponse
from app.application.services.user_service import UserService
from app.core.dependencies import CurrentUser, DBSession

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: CurrentUser) -> UserResponse:
    """Return the authenticated user's profile."""
    return UserResponse.model_validate(current_user)


@router.patch("/me", response_model=UserResponse)
async def update_me(
    request: UpdateProfileRequest,
    current_user: CurrentUser,
    db: DBSession,
) -> UserResponse:
    """Update full name and/or password."""
    service = UserService(db)
    return await service.update_profile(current_user.id, request)
