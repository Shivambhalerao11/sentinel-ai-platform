"""
Database session factory and dependency injection.
Uses SQLAlchemy 2.x synchronous engine with connection pooling.
"""
from typing import Generator

from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

print("=" * 80)
print("DATABASE_URL BEING USED:")
print(settings.DATABASE_URL)
print("=" * 80)

# ─── Engine Configuration ────────────────────────────────────────────────────
engine = create_engine(
    settings.DATABASE_URL,
    pool_size=settings.DATABASE_POOL_SIZE,
    max_overflow=settings.DATABASE_MAX_OVERFLOW,
    pool_timeout=settings.DATABASE_POOL_TIMEOUT,
    pool_pre_ping=True,          # Verify connections before use (handles stale connections)
    echo=settings.DATABASE_ECHO,
    future=True,                  # SQLAlchemy 2.x mode
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
