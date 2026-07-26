"""
Sentinel AI Crime Intelligence Platform - FastAPI Application Entry Point.
"""
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.logging import configure_logging, get_logger
from app.db.session import check_db_connection
from app.exceptions.handlers import register_exception_handlers
from app.middleware.security import setup_middleware

# Configure logging first
configure_logging()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Application lifespan events.
    Startup: verify database, run migrations check, seed if needed.
    Shutdown: clean up resources.
    """
    # ─── Startup ─────────────────────────────────────────────────────────────
    logger.info(
        "Starting Sentinel AI Platform",
        version=settings.APP_VERSION,
        environment=settings.APP_ENV,
    )

    # Verify database connection
    if check_db_connection():
        logger.info("Database connection verified")
    else:
        logger.warning(
            "Database connection FAILED. "
            "Ensure PostgreSQL is running and DATABASE_URL is correct."
        )

    # Auto-seed in development
    if settings.APP_ENV == "development":
        try:
            from app.utils.seed import run_seed
            run_seed()
        except Exception as e:
            logger.warning("Seed skipped or failed", error=str(e))

    # Log AI status
    from app.ai.gemini_client import gemini_client
    if gemini_client.is_available:
        logger.info("Gemini AI client ready", model=settings.GEMINI_MODEL)
    else:
        logger.warning(
            "Gemini AI not available. Set GEMINI_API_KEY for full AI functionality. "
            "Heuristic fallback is active."
        )

    logger.info("Sentinel platform ready to serve requests")

    yield

    # ─── Shutdown ─────────────────────────────────────────────────────────────
    logger.info("Shutting down Sentinel platform")


# ─── FastAPI Application Instance ────────────────────────────────────────────
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "Production-grade AI-powered crime intelligence and emergency response platform "
        "for Indian Police and Ministry of Home Affairs. "
        "Implements BNS 2023 compliance, real-time AI triage, and GIS mapping."
    ),
    docs_url="/docs" if settings.APP_ENV != "production" else None,
    redoc_url="/redoc" if settings.APP_ENV != "production" else None,
    openapi_url="/openapi.json" if settings.APP_ENV != "production" else None,
    lifespan=lifespan,
    contact={
        "name": "Ministry of Home Affairs - IT Cell",
        "email": "it-support@mha.gov.in",
    },
    license_info={
        "name": "Government of India - Restricted",
        "url": "https://mha.gov.in",
    },
)

# ─── Middleware ───────────────────────────────────────────────────────────────
setup_middleware(app)

# ─── Exception Handlers ──────────────────────────────────────────────────────
register_exception_handlers(app)

# ─── API Routes ──────────────────────────────────────────────────────────────
app.include_router(api_router)

# ─── Legacy API compatibility routes (match existing frontend api.ts exactly) ─
# These proxy to the v1 routes for zero frontend changes needed
from fastapi import APIRouter
legacy_router = APIRouter()

# The existing frontend calls /api/... - we match them exactly
from app.api.v1.endpoints import (
    analytics, audit, complaints, locations, notifications, chatbot, officers
)

# Mount legacy routes at /api/* to match existing frontend service layer
app.include_router(complaints.router, prefix="/api")
app.include_router(locations.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(chatbot.router, prefix="/api")
app.include_router(audit.router, prefix="/api")
app.include_router(officers.router, prefix="/api")

# Auth legacy routes at /api/auth/*
from app.api.v1.endpoints.auth import router as auth_legacy_router
app.include_router(auth_legacy_router, prefix="/api")

# ─── Static file serving (uploaded media) ────────────────────────────────────
upload_dir = Path(settings.UPLOAD_DIR)
upload_dir.mkdir(parents=True, exist_ok=True)
app.mount(
    f"/{settings.UPLOAD_DIR}",
    StaticFiles(directory=str(upload_dir)),
    name="uploads",
)

# ─── Health Check ─────────────────────────────────────────────────────────────
@app.get("/health", tags=["System"], summary="Health check endpoint")
def health_check() -> dict:
    """Returns platform health status. Used by Docker and load balancers."""
    from app.ai.gemini_client import gemini_client
    db_ok = check_db_connection()
    return {
        "status": "healthy" if db_ok else "degraded",
        "version": settings.APP_VERSION,
        "environment": settings.APP_ENV,
        "database": "connected" if db_ok else "disconnected",
        "ai_engine": "active" if gemini_client.is_available else "heuristic_fallback",
        "platform": settings.APP_NAME,
    }


@app.get("/", tags=["System"], summary="API root")
def root() -> dict:
    """API root endpoint with documentation links."""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "health": "/health",
        "api_v1": "/api/v1",
    }
