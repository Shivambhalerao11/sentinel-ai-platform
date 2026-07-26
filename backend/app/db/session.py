"""
Database session factory and dependency injection.
Uses SQLAlchemy 2.x engine with automatic table creation & local SQLite fallback
if PostgreSQL / Supabase host is offline or unreachable.
"""
from typing import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


def create_db_engine():
    db_url = settings.DATABASE_URL
    _connect_args = {}

    # 1. If SQLite explicitly configured
    if db_url.startswith("sqlite"):
        eng = create_engine(
            db_url,
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
            future=True,
        )
        _init_tables(eng)
        return eng

    # 2. Add SSL mode for Supabase / Production
    if "supabase" in db_url.lower() or settings.APP_ENV == "production":
        _connect_args = {"sslmode": "require"}

    # 3. Attempt PostgreSQL connection with quick timeout validation
    try:
        eng = create_engine(
            db_url,
            pool_size=settings.DATABASE_POOL_SIZE,
            max_overflow=settings.DATABASE_MAX_OVERFLOW,
            pool_timeout=5,
            pool_pre_ping=True,
            pool_recycle=300,
            echo=settings.DATABASE_ECHO,
            future=True,
            connect_args=_connect_args,
        )
        with eng.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("Connected to PostgreSQL database successfully.")
        _init_tables(eng)
        return eng
    except Exception as e:
        logger.warning(
            f"Primary PostgreSQL/Supabase database unreachable ({e}). "
            "Falling back to local SQLite database (sentinel_fallback.db)."
        )
        fallback_url = "sqlite:///./sentinel_fallback.db"
        eng = create_engine(
            fallback_url,
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
            future=True,
        )
        _init_tables(eng)
        return eng


def _init_tables(eng):
    """Ensure database schema tables are created immediately upon engine initialization."""
    try:
        from app.db.base import Base
        import app.models  # Import all models to register metadata
        Base.metadata.create_all(bind=eng)
        logger.info("Database tables initialized successfully.")
    except Exception as err:
        logger.error("Failed to initialize database tables", error=str(err))


# Global Engine Instance
engine = create_db_engine()

# Session Factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    expire_on_commit=False,
)


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
