"""
Centralized exception handlers for FastAPI.
All unhandled exceptions are caught here and returned as consistent JSON.
"""

import traceback

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError, OperationalError
from pydantic import ValidationError

from app.core.logging import get_logger

logger = get_logger(__name__)


def _error_response(
    status_code: int,
    message: str,
    error_code: str = None,
    details=None,
) -> JSONResponse:
    """Build a standardized error JSON response with CORS headers."""
    return JSONResponse(
        status_code=status_code,
        headers={"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*"},
        content={
            "success": False,
            "message": message,
            "error_code": error_code,
            "details": details,
        },
    )


def register_exception_handlers(app: FastAPI) -> None:
    """Register all custom exception handlers on the app."""

    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
        logger.warning(
            "http_exception",
            path=request.url.path,
            status_code=exc.status_code,
            detail=exc.detail,
        )
        return _error_response(
            status_code=exc.status_code,
            message=str(exc.detail),
            error_code=f"HTTP_{exc.status_code}",
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        errors = []
        for err in exc.errors():
            field = " → ".join(str(loc) for loc in err["loc"])
            errors.append(f"{field}: {err['msg']}")

        logger.warning(
            "validation_error",
            path=request.url.path,
            errors=errors,
        )

        return _error_response(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            message="Request validation failed. Please check your input.",
            error_code="VALIDATION_ERROR",
            details=errors,
        )

    @app.exception_handler(IntegrityError)
    async def db_integrity_exception_handler(
        request: Request, exc: IntegrityError
    ) -> JSONResponse:
        logger.error(
            "db_integrity_error",
            path=request.url.path,
            error=str(exc.orig),
        )

        if "unique" in str(exc.orig).lower() or "duplicate" in str(exc.orig).lower():
            message = "A record with this information already exists."
        else:
            message = "Database constraint violation. Please check your input."

        return _error_response(
            status_code=status.HTTP_409_CONFLICT,
            message=message,
            error_code="DB_INTEGRITY_ERROR",
        )

    @app.exception_handler(OperationalError)
    async def db_operational_exception_handler(
        request: Request, exc: OperationalError
    ) -> JSONResponse:
        logger.error(
            "db_operational_error",
            path=request.url.path,
            error=str(exc),
        )

        return _error_response(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            message="Database service temporarily unavailable. Please try again.",
            error_code="DB_OPERATIONAL_ERROR",
        )

    @app.exception_handler(Exception)
    async def generic_exception_handler(
        request: Request,
        exc: Exception,
    ) -> JSONResponse:
        logger.error(
            "unhandled_exception",
            path=request.url.path,
            error=str(exc),
            exc_info=True,
        )

        # Print the complete Python traceback in the terminal
        traceback.print_exc()

        return _error_response(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            message="An unexpected internal server error occurred. Our team has been notified.",
            error_code="INTERNAL_SERVER_ERROR",
        )