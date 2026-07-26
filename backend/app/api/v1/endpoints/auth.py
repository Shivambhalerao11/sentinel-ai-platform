"""
Authentication endpoints.
POST /auth/register/citizen
POST /auth/login/citizen
POST /auth/login/police
POST /auth/refresh
POST /auth/logout
POST /auth/password/reset/request
POST /auth/password/reset/confirm
POST /auth/verify/email
GET  /auth/me
"""
from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.middleware.auth import AuthenticatedUser, get_current_user, require_admin
from app.schemas.auth import (
    ChangePasswordRequest, CitizenLoginRequest, CitizenRegisterRequest,
    LoginResponse, PasswordResetConfirmSchema, PasswordResetRequestSchema,
    PoliceLoginRequest, PoliceRegisterRequest, RefreshTokenRequest,
    TokenPair, UserPublicOut, VerifyEmailRequest,
)
from app.schemas.common import SuccessResponse
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register/citizen",
    response_model=LoginResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new citizen account",
    description="Creates a citizen account, runs validation, and returns JWT tokens.",
)
def register_citizen(
    payload: CitizenRegisterRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> LoginResponse:
    service = AuthService(db)
    return service.register_citizen(payload, request)


@router.post(
    "/login/citizen",
    response_model=LoginResponse,
    summary="Citizen login",
    description="Authenticate a citizen with email/phone and password.",
)
def login_citizen(
    payload: CitizenLoginRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> LoginResponse:
    service = AuthService(db)
    return service.login_citizen(payload, request)


@router.post(
    "/login/police",
    response_model=LoginResponse,
    summary="Police officer login",
    description="Authenticate police personnel with badge/employee ID or email.",
)
def login_police(
    payload: PoliceLoginRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> LoginResponse:
    service = AuthService(db)
    return service.login_police(payload, request)


@router.post(
    "/refresh",
    response_model=TokenPair,
    summary="Refresh access token",
    description="Exchange a valid refresh token for a new access+refresh token pair.",
)
def refresh_token(
    payload: RefreshTokenRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> TokenPair:
    service = AuthService(db)
    return service.refresh_tokens(payload.refresh_token, request)


@router.post(
    "/logout",
    response_model=SuccessResponse,
    summary="Logout user",
    description="Revokes the current refresh token (or all tokens).",
)
def logout(
    request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    # Extract refresh token from body if provided
    service = AuthService(db)
    service.logout(current_user.user, None, request)
    return SuccessResponse(message="Logged out successfully.")


@router.post(
    "/password/reset/request",
    response_model=SuccessResponse,
    summary="Request password reset",
    description="Sends a password reset link to the provided email. Always returns 200 (no user enumeration).",
)
def request_password_reset(
    payload: PasswordResetRequestSchema,
    request: Request,
    db: Session = Depends(get_db),
) -> SuccessResponse:
    service = AuthService(db)
    token = service.request_password_reset(str(payload.email), request)
    # In production: send email with token. For dev: return token in response.
    if settings.APP_ENV == "development" and token:
        return SuccessResponse(
            message="Password reset token generated.",
            data={"reset_token": token},
        )
    return SuccessResponse(
        message="If an account with that email exists, a password reset link has been sent."
    )


@router.post(
    "/password/reset/confirm",
    response_model=SuccessResponse,
    summary="Confirm password reset",
    description="Verify reset token and set new password.",
)
def confirm_password_reset(
    payload: PasswordResetConfirmSchema,
    db: Session = Depends(get_db),
) -> SuccessResponse:
    service = AuthService(db)
    service.confirm_password_reset(payload.token, payload.new_password)
    return SuccessResponse(message="Password reset successful. Please log in with your new password.")


@router.post(
    "/verify/email",
    response_model=SuccessResponse,
    summary="Verify email address",
    description="Confirm email ownership using the verification token.",
)
def verify_email(
    payload: VerifyEmailRequest,
    db: Session = Depends(get_db),
) -> SuccessResponse:
    service = AuthService(db)
    service.verify_email(payload.token)
    return SuccessResponse(message="Email address verified successfully.")


@router.get(
    "/me",
    response_model=UserPublicOut,
    summary="Get current user profile",
    description="Returns the authenticated user's public profile.",
)
def get_me(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserPublicOut:
    from app.repositories.user_repository import UserRepository
    from app.services.auth_service import _build_user_out
    user_repo = UserRepository(db)
    user = user_repo.get_by_id(current_user.id)
    return _build_user_out(user)


@router.post(
    "/admin/officers",
    response_model=UserPublicOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create police officer account (admin only)",
    description="Creates a new police officer or admin account. Requires police_admin role.",
)
def create_officer(
    payload: PoliceRegisterRequest,
    request: Request,
    current_user: AuthenticatedUser = Depends(require_admin),
    db: Session = Depends(get_db),
) -> UserPublicOut:
    service = AuthService(db)
    return service.create_police_account(payload, current_user.user, request)
