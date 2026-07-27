"""
Sentinel AI Crime Intelligence Platform - FastAPI Application Entry Point.
"""
from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

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
    Startup: verify database connection.
    Shutdown: clean up resources.
    """
    # ─── Startup ─────────────────────────────────────────────────────────────
    logger.info(
        "Starting Sentinel AI Platform",
        version=settings.APP_VERSION,
        environment=settings.APP_ENV,
    )

    # Verify database connection and auto-create tables
    if check_db_connection():
        logger.info("Database connection verified")
        try:
            from app.db.base import Base
            from app.db.session import engine
            import app.models  # Ensure all SQLAlchemy models are registered
            Base.metadata.create_all(bind=engine)
            logger.info("Database schema & tables created/verified successfully.")
        except Exception as e:
            logger.error("Database schema creation failed", error=str(e))
    else:
        logger.warning(
            "Database connection FAILED. "
            "Ensure PostgreSQL is running and DATABASE_URL is correct."
        )

    # Auto-seed in development only
    if settings.APP_ENV == "development":
        try:
            from app.utils.seed import run_seed
            run_seed()
        except Exception as e:
            logger.warning("Seed skipped or failed", error=str(e))

    # Log AI status
    try:
        from app.ai.gemini_client import gemini_client
        if gemini_client.is_available:
            logger.info("Gemini AI client ready", model=settings.GEMINI_MODEL)
        else:
            logger.warning(
                "Gemini AI not available. Set GEMINI_API_KEY for full AI functionality. "
                "Heuristic fallback is active."
            )
    except Exception as e:
        logger.warning("AI client init failed", error=str(e))

    logger.info("Sentinel platform ready to serve requests")

    yield

    # ─── Shutdown ─────────────────────────────────────────────────────────────
    logger.info("Shutting down Sentinel platform")


# ─── FastAPI Application Instance ────────────────────────────────────────────
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "Production-grade AI-powered crime intelligence and emergency response platform. "
        "Implements BNS 2023 compliance, real-time AI triage, and GIS mapping."
    ),
    # Only expose docs in non-production environments
    docs_url="/docs" if settings.APP_ENV != "production" else None,
    redoc_url="/redoc" if settings.APP_ENV != "production" else None,
    openapi_url="/openapi.json" if settings.APP_ENV != "production" else None,
    lifespan=lifespan,
)

# ─── Middleware (CORS must be registered before routes) ──────────────────────
setup_middleware(app)

# ─── Exception Handlers ──────────────────────────────────────────────────────
register_exception_handlers(app)

# ─── API Routes ──────────────────────────────────────────────────────────────
# All routes live under /api/v1/* via the router
app.include_router(api_router)

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
    """Returns platform health status. Used by Docker, Render, and load balancers."""
    db_ok = check_db_connection()
    ai_active = False
    try:
        from app.ai.gemini_client import gemini_client
        ai_active = gemini_client.is_available
    except Exception:
        pass
    
    redis_connected = False
    try:
        from app.core.redis import redis_client
        redis_connected = redis_client.is_connected
    except Exception:
        pass

    return {
        "status": "healthy" if db_ok else "degraded",
        "version": settings.APP_VERSION,
        "environment": settings.APP_ENV,
        "database": "connected" if db_ok else "disconnected",
        "redis": "connected" if redis_connected else "memory_fallback",
        "ai_engine": "active" if ai_active else "heuristic_fallback",
        "platform": settings.APP_NAME,
    }


@app.get("/", tags=["System"], summary="API root")
def root() -> dict:
    """API root endpoint with documentation links."""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs" if settings.APP_ENV != "production" else "disabled",
        "health": "/health",
        "api_v1": "/api/v1",
    }


if __name__ == "__main__":
    import os
    import uvicorn
    port = int(os.getenv("PORT", settings.PORT))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=False)
