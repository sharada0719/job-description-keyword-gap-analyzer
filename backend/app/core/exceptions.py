"""
Custom application exceptions with HTTP status codes.
"""
from typing import Any, Dict, Optional


class AppException(Exception):
    """Base exception for all application errors."""

    status_code: int = 500
    error_code: str = "INTERNAL_ERROR"

    def __init__(self, message: str, detail: Optional[Any] = None) -> None:
        self.message = message
        self.detail = detail
        super().__init__(message)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "error_code": self.error_code,
            "message": self.message,
            "detail": self.detail,
        }


class NotFoundError(AppException):
    status_code = 404
    error_code = "NOT_FOUND"


class ConflictError(AppException):
    status_code = 409
    error_code = "CONFLICT"


class ValidationError(AppException):
    status_code = 422
    error_code = "VALIDATION_ERROR"


class AuthenticationError(AppException):
    status_code = 401
    error_code = "AUTHENTICATION_ERROR"


class AuthorizationError(AppException):
    status_code = 403
    error_code = "AUTHORIZATION_ERROR"


class FileProcessingError(AppException):
    status_code = 422
    error_code = "FILE_PROCESSING_ERROR"


class AIServiceError(AppException):
    status_code = 500
    error_code = "AI_SERVICE_ERROR"
