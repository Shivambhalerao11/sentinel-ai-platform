"""
Security utilities: JWT creation/verification, password hashing, OTP generation.
"""
import secrets
import string
from datetime import datetime, timedelta, timezone
from typing import Any, Optional, Union

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

# ─── Password Hashing ────────────────────────────────────────────────────────
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=settings.BCRYPT_ROUNDS,
)


def hash_password(plain_password: str) -> str:
    """Hash a plaintext password using bcrypt."""
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against a bcrypt hash."""
    return pwd_context.verify(plain_password, hashed_password)


# ─── JWT Token Management ────────────────────────────────────────────────────
def create_access_token(
    subject: Union[str, Any],
    role: str,
    extra_claims: Optional[dict] = None,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """
    Create a signed JWT access token.

    Args:
        subject: User ID (UUID string)
        role: User role (citizen | police_officer | police_admin)
        extra_claims: Additional claims to include in payload
        expires_delta: Custom expiration delta

    Returns:
        Encoded JWT string
    """
    if expires_delta is None:
        expires_delta = timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)

    expire = datetime.now(timezone.utc) + expires_delta
    issued_at = datetime.now(timezone.utc)

    payload = {
        "sub": str(subject),
        "role": role,
        "iat": issued_at,
        "exp": expire,
        "type": "access",
    }
    if extra_claims:
        payload.update(extra_claims)

    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(
    subject: Union[str, Any],
    expires_delta: Optional[timedelta] = None,
) -> str:
    """
    Create a signed JWT refresh token (longer lived, minimal claims).

    Args:
        subject: User ID (UUID string)
        expires_delta: Custom expiration delta

    Returns:
        Encoded JWT string
    """
    if expires_delta is None:
        expires_delta = timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS)

    expire = datetime.now(timezone.utc) + expires_delta

    payload = {
        "sub": str(subject),
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": "refresh",
        # Unique JWT ID to enable revocation tracking
        "jti": secrets.token_urlsafe(32),
    }

    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    """
    Decode and validate a JWT token.

    Args:
        token: JWT string

    Returns:
        Decoded payload dictionary

    Raises:
        JWTError: If token is invalid or expired
    """
    return jwt.decode(
        token,
        settings.JWT_SECRET_KEY,
        algorithms=[settings.JWT_ALGORITHM],
    )


def verify_token_type(payload: dict, expected_type: str) -> bool:
    """Verify that the token is of the expected type (access | refresh)."""
    return payload.get("type") == expected_type


# ─── OTP / Verification Tokens ───────────────────────────────────────────────
def generate_otp(length: int = 6) -> str:
    """Generate a numeric OTP of specified length."""
    return "".join(secrets.choice(string.digits) for _ in range(length))


def generate_secure_token(length: int = 64) -> str:
    """Generate a cryptographically secure URL-safe token."""
    return secrets.token_urlsafe(length)


# ─── Complaint ID Generator ───────────────────────────────────────────────────
def generate_complaint_id() -> str:
    """
    Generate a human-readable complaint ID in format CASE-YYYY-NNNNN.
    The sequential number is handled at the DB layer; this provides the prefix.
    """
    year = datetime.now(timezone.utc).year
    random_suffix = secrets.randbelow(99999)
    return f"CASE-{year}-{random_suffix:05d}"
