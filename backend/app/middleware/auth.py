"""
FastAPI dependency functions for authentication and authorization.
These are injected via Depends() into route handlers.
No business logic here - only token verification and role checks.
"""
import uuid
from typing import Optional

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import decode_token
from app.db.session import get_db
from app.models.enums import AccountStatus, UserRole
from app.models.user import User
from app.core.logging import get_logger

logger = get_logger(__name__)
bearer_scheme = HTTPBearer(auto_error=False)


class AuthenticatedUser:
    """Wrapper holding the authenticated user from the JWT."""
    def __init__(self, user: User):
        self.user = user
        self.id = user.id
        self.role = user.role
        self.email = user.email

    @property
    def is_citizen(self) -> bool:
        return self.role == UserRole.CITIZEN

    @property
    def is_police(self) -> bool:
        return self.role in (UserRole.POLICE_OFFICER, UserRole.POLICE_ADMIN)

    @property
    def is_admin(self) -> bool:
        return self.role == UserRole.POLICE_ADMIN


def _extract_token(
    credentials: Optional[HTTPAuthorizationCredentials],
    request: Request,
) -> str:
    """Extract JWT from Authorization header or cookie."""
    # Try Authorization header first
    if credentials and credentials.credentials:
        return credentials.credentials

    # Fallback: try cookie (for browser sessions)
    token = request.cookies.get("access_token")
    if token:
        return token

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required. Provide a valid Bearer token.",
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> AuthenticatedUser:
    """
    Dependency: validates JWT and returns the authenticated user.
    Raises 401 if token is missing/invalid, 403 if account is locked/suspended.
    """
    token = _extract_token(credentials, request)

    try:
        payload = decode_token(token)
    except JWTError as e:
        logger.warning("JWT decode failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verify token type
    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type. Access token required.",
        )

    user_id_str = payload.get("sub")
    if not user_id_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed token: missing subject claim.",
        )

    try:
        user_id = uuid.UUID(user_id_str)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed token: invalid subject format.",
        )

    user = db.query(User).filter(User.id == user_id, User.is_deleted == False).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found or has been removed.",
        )

    if user.account_status == AccountStatus.LOCKED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is temporarily locked. Contact system administrator.",
        )

    if user.account_status == AccountStatus.SUSPENDED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account has been suspended. Contact system administrator.",
        )

    return AuthenticatedUser(user)


# ─── Role-Specific Dependencies ───────────────────────────────────────────────
def require_citizen(
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> AuthenticatedUser:
    """Dependency: only allows citizens."""
    if not current_user.is_citizen:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This endpoint is restricted to citizen accounts only.",
        )
    return current_user


def require_police(
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> AuthenticatedUser:
    """Dependency: allows police officers and admins."""
    if not current_user.is_police:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Restricted access. Police personnel only.",
        )
    return current_user


def require_admin(
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> AuthenticatedUser:
    """Dependency: allows only police admins (not regular officers)."""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Restricted access. Police administrators only.",
        )
    return current_user


def get_optional_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Optional[AuthenticatedUser]:
    """
    Optional authentication: returns user if token is valid, else None.
    Useful for endpoints accessible by both authenticated and anonymous users.
    """
    try:
        if not credentials or not credentials.credentials:
            return None
        return get_current_user(request, credentials, db)
    except HTTPException:
        return None
