"""
Core application configuration using Pydantic Settings.
All values loaded from environment variables with sensible defaults for development.
"""
from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import field_validator
import secrets


class Settings(BaseSettings):
    # ─── Application ────────────────────────────────────────────────────────────
    APP_NAME: str = "Sentinel AI Crime Intelligence Platform"
    APP_VERSION: str = "1.0.0"
    APP_ENV: str = "development"  # development | staging | production
    DEBUG: bool = True
    SECRET_KEY: str = secrets.token_urlsafe(64)
    API_V1_STR: str = "/api/v1"

    # ─── Database ────────────────────────────────────────────────────────────────
    DATABASE_URL: str = "postgresql://sentinel:sentinel_pass@localhost:5432/sentinel_db"
    DATABASE_POOL_SIZE: int = 10
    DATABASE_MAX_OVERFLOW: int = 20
    DATABASE_POOL_TIMEOUT: int = 30
    DATABASE_ECHO: bool = False  # Set True to log all SQL queries

    # ─── JWT Authentication ───────────────────────────────────────────────────────
    JWT_SECRET_KEY: str = secrets.token_urlsafe(64)
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60          # 1 hour
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 30            # 30 days

    # ─── Security ────────────────────────────────────────────────────────────────
    PASSWORD_MIN_LENGTH: int = 8
    MAX_LOGIN_ATTEMPTS: int = 5
    ACCOUNT_LOCKOUT_MINUTES: int = 30
    BCRYPT_ROUNDS: int = 12

    # ─── CORS ────────────────────────────────────────────────────────────────────
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8080",
        "https://sentinel.gov.in",
    ]
    ALLOWED_METHODS: List[str] = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
    ALLOWED_HEADERS: List[str] = ["*"]

    # ─── Rate Limiting ───────────────────────────────────────────────────────────
    RATE_LIMIT_PER_MINUTE: int = 60
    RATE_LIMIT_AUTH_PER_MINUTE: int = 10
    RATE_LIMIT_UPLOAD_PER_MINUTE: int = 20

    # ─── File Upload ─────────────────────────────────────────────────────────────
    UPLOAD_DIR: str = "uploads"
    MAX_IMAGE_SIZE_MB: int = 10
    MAX_VIDEO_SIZE_MB: int = 100
    MAX_DOCUMENT_SIZE_MB: int = 25
    ALLOWED_IMAGE_EXTENSIONS: List[str] = [".jpg", ".jpeg", ".png", ".webp", ".heic"]
    ALLOWED_VIDEO_EXTENSIONS: List[str] = [".mp4", ".mov", ".avi", ".mkv", ".webm"]
    ALLOWED_DOC_EXTENSIONS: List[str] = [".pdf", ".docx", ".txt"]

    # ─── AWS S3 (Production Storage) ─────────────────────────────────────────────
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_REGION: str = "ap-south-1"
    AWS_S3_BUCKET: Optional[str] = None
    USE_S3: bool = False

    # ─── AI / Gemini ─────────────────────────────────────────────────────────────
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-1.5-flash"
    AI_ANALYSIS_TIMEOUT: int = 30
    SENTENCE_TRANSFORMER_MODEL: str = "all-MiniLM-L6-v2"
    DUPLICATE_DETECTION_THRESHOLD: float = 0.82  # cosine similarity threshold

    # ─── Email (OTP/Verification) ────────────────────────────────────────────────
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM_EMAIL: str = "noreply@sentinel.gov.in"
    SMTP_FROM_NAME: str = "Sentinel Platform"
    EMAIL_VERIFICATION_EXPIRE_HOURS: int = 24

    # ─── SMS / OTP ───────────────────────────────────────────────────────────────
    SMS_PROVIDER: str = "mock"  # mock | twilio | msg91
    TWILIO_ACCOUNT_SID: Optional[str] = None
    TWILIO_AUTH_TOKEN: Optional[str] = None
    TWILIO_PHONE_NUMBER: Optional[str] = None
    OTP_EXPIRE_MINUTES: int = 10

    # ─── Pagination ──────────────────────────────────────────────────────────────
    DEFAULT_PAGE_SIZE: int = 20
    MAX_PAGE_SIZE: int = 100

    # ─── Logging ─────────────────────────────────────────────────────────────────
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "logs/sentinel.log"

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def assemble_db_url(cls, v: str) -> str:
        # Replace postgres:// with postgresql:// for SQLAlchemy 2.x compatibility
        if v.startswith("postgres://"):
            return v.replace("postgres://", "postgresql://", 1)
        return v

    @field_validator("APP_ENV", mode="before")
    @classmethod
    def validate_env(cls, v: str) -> str:
        valid = {"development", "staging", "production"}
        if v not in valid:
            raise ValueError(f"APP_ENV must be one of {valid}")
        return v

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
        extra = "ignore"


# Singleton instance
settings = Settings()
