"""
Global FastAPI exception handlers.
Maps custom AppException subclasses to structured JSON responses.
Also handles FastAPI's built-in HTTPException so that *every* error response
contains a ``message`` field the frontend can read consistently.
"""
from fastapi import Request
from fastapi.exceptions import HTTPException
from fastapi.responses import JSONResponse

from app.core.exceptions import AppException
from app.core.logging import get_logger

logger = get_logger("api.exception_handlers")


async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    logger.warning(
        "AppException [%s] %s — path=%s",
        exc.error_code,
        exc.message,
        request.url.path,
    )
    return JSONResponse(
        status_code=exc.status_code,
        content=exc.to_dict(),
    )


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """Handle FastAPI/Starlette HTTPException (e.g. 401 from dependencies).

    Returns both ``detail`` (standard) and ``message`` (our convention) so the
    frontend can always read ``response.data.message``.
    """
    detail = exc.detail if isinstance(exc.detail, str) else str(exc.detail)
    logger.warning(
        "HTTPException %d — %s — path=%s",
        exc.status_code,
        detail,
        request.url.path,
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error_code": "HTTP_ERROR",
            "message": detail,
            "detail": detail,
        },
        headers=getattr(exc, "headers", None),
    )


async def unhandled_exception_handler(
    request: Request, exc: Exception
) -> JSONResponse:
    logger.error(
        "Unhandled exception on %s: %s", request.url.path, exc, exc_info=True
    )
    return JSONResponse(
        status_code=500,
        content={
            "error_code": "INTERNAL_ERROR",
            "message": "An unexpected error occurred.",
            "detail": None,
        },
    )
