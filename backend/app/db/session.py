"""
Database session factory and dependency injection.
Uses SQLAlchemy 2.x synchronous engine with connection pooling.

Supabase / production SSL:
  DATABASE_URL should include ?sslmode=require for Supabase connections.
  Example: postgresql://user:pass@db.xxx.supabase.co:5432/postgres?sslmode=require
"""
from typing import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

# ─── Engine connect_args ─────────────────────────────────────────────────────
# For Supabase and other hosted PostgreSQL, sslmode=require is needed.
# If it's already in the DATABASE_URL query string, this is a no-op.
_connect_args: dict = {}
if "supabase" in settings.DATABASE_URL.lower() or settings.APP_ENV == "production":
    _connect_args = {"sslmode": "require"}

# ─── Engine Configuration ────────────────────────────────────────────────────
# Use smaller pool for Render free tier (512MB RAM).
# pool_pre_ping=True handles stale connections after Render sleep.
engine = create_engine(
    settings.DATABASE_URL,
    pool_size=settings.DATABASE_POOL_SIZE,
    max_overflow=settings.DATABASE_MAX_OVERFLOW,
    pool_timeout=settings.DATABASE_POOL_TIMEOUT,
    pool_pre_ping=True,           # Reconnect on stale connections
    pool_recycle=300,             # Recycle connections every 5 min
    echo=settings.DATABASE_ECHO,
    future=True,                  # SQLAlchemy 2.x mode
    connect_args=_connect_args,
)

# ─── Session Factory ─────────────────────────────────────────────────────────
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    expire_on_commit=False,  # Don't expire objects after commit (safer for API responses)
)


# ─── FastAPI Dependency ───────────────────────────────────────────────────────
def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency that provides a database session per request.
    Automatically commits on success and rolls back on exception.
    Always closes the session when done.
    """
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def check_db_connection() -> bool:
    """Health check - verify database is reachable."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception as e:
        logger.error("Database connection check failed", error=str(e))
        return False
