"""
Authentication service: registration, login, token refresh, password reset.
All business logic lives here, not in routes.
"""
import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple

from fastapi import HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.logging import get_logger
from app.core.security import (
    create_access_token, create_refresh_token,
    generate_secure_token, hash_password, verify_password,
)
from app.models.enums import AccountStatus, AuditAction, UserRole
from app.models.user import User
from app.repositories.audit_repository import AuditRepository
from app.repositories.notification_repository import NotificationRepository
from app.repositories.user_repository import UserRepository
from app.schemas.auth import (
    CitizenLoginRequest, CitizenRegisterRequest,
    LoginResponse, PoliceLoginRequest, PoliceRegisterRequest,
    TokenPair, UserPublicOut,
)

logger = get_logger(__name__)


def _get_client_ip(request: Request) -> str:
    """Extract real client IP, considering reverse proxy headers."""
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _build_token_pair(user: User) -> tuple:
    """Create access + refresh token pair for a user. Returns (TokenPair, jti, raw_refresh_token)."""
    access_token = create_access_token(
        subject=str(user.id),
        role=user.role,
    )
    refresh_payload = {}
    refresh_token_raw = create_refresh_token(subject=str(user.id))

    # Extract JTI from refresh token for storage
    from app.core.security import decode_token
    payload = decode_token(refresh_token_raw)
    jti = payload.get("jti", secrets.token_urlsafe(32))

    return TokenPair(
        access_token=access_token,
        refresh_token=refresh_token_raw,
        token_type="Bearer",
        expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    ), jti, refresh_token_raw


def _build_user_out(user: User) -> UserPublicOut:
    """Build the public user info object from a User ORM instance."""
    out = UserPublicOut(
        id=str(user.id),
        full_name=user.full_name,
        email=user.email,
        phone=user.phone,
        role=user.role,
        account_status=user.account_status,
        email_verified=user.email_verified,
        phone_verified=user.phone_verified,
        avatar_url=user.avatar_url,
    )

    if user.citizen_profile:
        out.city = user.citizen_profile.city
        out.state = user.citizen_profile.state
        out.district = user.citizen_profile.district

    if user.police_profile:
        out.badge_number = user.police_profile.badge_number
        out.employee_id = user.police_profile.employee_id
        out.rank = user.police_profile.rank
        out.department = user.police_profile.department
        out.specialty = user.police_profile.specialty
        out.precinct = user.police_profile.precinct
        out.station_id = str(user.police_profile.station_id) if user.police_profile.station_id else None
        if user.police_profile.station:
            out.station_name = user.police_profile.station.name

    return out


class AuthService:
    def __init__(self, db: Session):
        self.db = db
        self.user_repo = UserRepository(db)
        self.audit_repo = AuditRepository(db)
        self.notif_repo = NotificationRepository(db)

    def register_citizen(
        self,
        payload: CitizenRegisterRequest,
        request: Request,
    ) -> LoginResponse:
        """Register a new citizen account and return login tokens."""
        ip = _get_client_ip(request)

        # Check for duplicates
        if self.user_repo.email_exists(payload.email):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email address already exists.",
            )
        if payload.phone and self.user_repo.phone_exists(payload.phone):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this mobile number already exists.",
            )

        # Create user
        hashed = hash_password(payload.password)
        user = self.user_repo.create_user(
            email=payload.email,
            phone=payload.phone,
            hashed_password=hashed,
            full_name=payload.full_name,
            role=UserRole.CITIZEN,
        )

        # Create citizen profile
        citizen_id_hash = None
        if payload.citizen_id:
            citizen_id_hash = hashlib.sha256(payload.citizen_id.encode()).hexdigest()

        self.user_repo.create_citizen_profile(
            user_id=user.id,
            address=payload.address,
            city=payload.city,
            state=payload.state,
            pin_code=payload.pin_code,
            citizen_id_hash=citizen_id_hash,
        )

        # Generate email verification token
        verify_token = generate_secure_token(32)
        self.user_repo.store_email_verification_token(
            user_id=user.id,
            token=verify_token,
            email=user.email,
            expires_at=datetime.now(timezone.utc)
            + timedelta(hours=settings.EMAIL_VERIFICATION_EXPIRE_HOURS),
        )

        # Audit log
        self.audit_repo.log(
            action=AuditAction.USER_REGISTERED,
            user_id=user.id,
            user_name=user.full_name,
            user_role=user.role,
            ip_address=ip,
            resource_type="user",
            resource_id=str(user.id),
            details=f"New citizen registered: {user.email}",
        )

        # Issue tokens
        token_pair, jti, raw_refresh = _build_token_pair(user)
        expires_at = datetime.now(timezone.utc) + timedelta(
            days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS
        )
        self.user_repo.store_refresh_token(
            user_id=user.id,
            token=raw_refresh,
            jti=jti,
            expires_at=expires_at,
            ip_address=ip,
        )

        self.db.commit()
        logger.info("Citizen registered", user_id=str(user.id), email=user.email)

        return LoginResponse(
            tokens=token_pair,
            user=_build_user_out(user),
            message="Registration successful. Welcome to Sentinel.",
        )

    def create_police_account(
        self,
        payload: PoliceRegisterRequest,
        created_by: User,
        request: Request,
    ) -> UserPublicOut:
        """
        Create a police officer account. Only callable by authenticated police admins.
        Police cannot self-register.
        """
        ip = _get_client_ip(request)

        if self.user_repo.email_exists(payload.email):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A user with this email already exists.",
            )
        if payload.phone and self.user_repo.phone_exists(payload.phone):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A user with this phone number already exists.",
            )
        if self.user_repo.badge_exists(payload.badge_number):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Badge number {payload.badge_number} is already registered.",
            )
        if self.user_repo.employee_id_exists(payload.employee_id):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Employee ID {payload.employee_id} is already registered.",
            )

        hashed = hash_password(payload.password)
        role = UserRole.POLICE_ADMIN if payload.role == "police_admin" else UserRole.POLICE_OFFICER

        user = self.user_repo.create_user(
            email=payload.email,
            phone=payload.phone,
            hashed_password=hashed,
            full_name=payload.full_name,
            role=role,
            created_by_id=created_by.id,
        )
        # Police accounts are pre-verified (created by admin)
        user.email_verified = True
        user.phone_verified = True

        station_id = None
        if payload.station_id:
            try:
                station_id = uuid.UUID(payload.station_id)
            except ValueError:
                pass

        self.user_repo.create_police_profile(
            user_id=user.id,
            badge_number=payload.badge_number.upper(),
            employee_id=payload.employee_id.upper(),
            rank=payload.rank,
            department=payload.department,
            specialty=payload.specialty,
            station_id=station_id,
            precinct=payload.precinct,
        )

        self.audit_repo.log(
            action=AuditAction.OFFICER_CREATED,
            user_id=created_by.id,
            user_name=created_by.full_name,
            user_role=created_by.role,
            ip_address=ip,
            resource_type="user",
            resource_id=str(user.id),
            details=f"Police account created: {payload.badge_number} by {created_by.full_name}",
        )

        self.db.commit()
        logger.info("Police account created", badge=payload.badge_number)

        # Reload with relationships
        created_user = self.user_repo.get_by_id(user.id)
        return _build_user_out(created_user)

    def send_email_otp(self, email: str, purpose: str, request: Request) -> dict:
        """Generate and send 6-digit Email OTP."""
        from app.services.email_service import email_service
        ip = _get_client_ip(request)
        otp_code = f"{secrets.randbelow(900000) + 100000:06d}"
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)

        self.user_repo.store_email_otp(
            email=email,
            otp_code=otp_code,
            purpose=purpose,
            expires_at=expires_at,
            ip_address=ip,
        )
        self.db.commit()

        # Send email via EmailService
        email_service.send_otp_email(email, otp_code, purpose)

        logger.info(f"Generated Email OTP for {email} ({purpose}): {otp_code}")

        res = {
            "message": f"6-digit OTP sent to {email}. Valid for 5 minutes.",
            "expires_in": 300,
        }
        if settings.APP_ENV == "development":
            res["debug_otp"] = otp_code
        return res

    def verify_email_otp(self, email: str, otp_code: str, purpose: str) -> bool:
        """Verify 6-digit Email OTP."""
        otp_record = self.user_repo.get_latest_email_otp(email, purpose)
        if not otp_record:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No active OTP found for this email address. Please request a new OTP.",
            )

        exp = otp_record.expires_at
        if exp and exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)

        if exp and exp < datetime.now(timezone.utc):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="OTP has expired. Please request a new 6-digit OTP.",
            )

        if otp_record.attempts_count >= 3:
            otp_record.is_used = True
            self.db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Maximum OTP verification attempts exceeded. Please request a new OTP.",
            )

        hashed_attempt = hashlib.sha256(otp_code.encode("utf-8")).hexdigest()
        if otp_record.otp_hash != hashed_attempt:
            otp_record.attempts_count += 1
            self.db.commit()
            remaining = 3 - otp_record.attempts_count
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid OTP code. {remaining} attempt(s) remaining.",
            )

        self.user_repo.mark_otp_verified(otp_record)
        self.db.commit()
        return True

    def register_police_direct(
        self,
        payload: PoliceRegisterRequest,
        request: Request,
    ) -> LoginResponse:
        """
        Direct self-registration for police personnel after Email OTP verification.
        """
        ip = _get_client_ip(request)

        if self.user_repo.email_exists(payload.email):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email address already exists.",
            )
        if payload.phone and self.user_repo.phone_exists(payload.phone):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this mobile number already exists.",
            )
        if self.user_repo.badge_exists(payload.badge_number):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Badge number {payload.badge_number} is already registered.",
            )
        if self.user_repo.employee_id_exists(payload.employee_id):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Employee ID {payload.employee_id} is already registered.",
            )

        hashed = hash_password(payload.password)
        role = UserRole.POLICE_ADMIN if payload.role == "police_admin" else UserRole.POLICE_OFFICER

        user = self.user_repo.create_user(
            email=payload.email,
            phone=payload.phone,
            hashed_password=hashed,
            full_name=payload.full_name,
            role=role,
        )
        user.email_verified = True
        user.phone_verified = True

        station_id = None
        if payload.station_id:
            try:
                station_id = uuid.UUID(payload.station_id)
            except ValueError:
                pass

        self.user_repo.create_police_profile(
            user_id=user.id,
            badge_number=payload.badge_number.upper(),
            employee_id=payload.employee_id.upper(),
            rank=payload.rank,
            department=payload.department or "Crime Branch & AI Intelligence",
            specialty=payload.specialty or "General Law Enforcement",
            station_id=station_id,
            precinct=payload.precinct or "Delhi Police HQ",
        )

        self.audit_repo.log(
            action=AuditAction.USER_REGISTERED,
            user_id=user.id,
            user_name=user.full_name,
            user_role=user.role,
            ip_address=ip,
            resource_type="user",
            resource_id=str(user.id),
            details=f"New police officer registered: {user.email}",
        )

        token_pair, jti, raw_refresh = _build_token_pair(user)
        expires_at = datetime.now(timezone.utc) + timedelta(
            days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS
        )
        self.user_repo.store_refresh_token(
            user_id=user.id,
            token=raw_refresh,
            jti=jti,
            expires_at=expires_at,
            ip_address=ip,
        )

        self.db.commit()
        logger.info("Direct Police Registration completed", user_id=str(user.id), badge=payload.badge_number)

        full_user = self.user_repo.get_by_id(user.id)
        return LoginResponse(
            tokens=token_pair,
            user=_build_user_out(full_user),
            message="Police Officer registration successful. Welcome to Sentinel Command.",
        )

    def reset_password_with_otp(
        self,
        email: str,
        otp_code: str,
        new_password: str,
        request: Request,
    ) -> None:
        """Reset user password after OTP verification."""
        self.verify_email_otp(email, otp_code, "PASSWORD_RESET")
        user = self.user_repo.get_by_email(email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User account not found.",
            )

        user.hashed_password = hash_password(new_password)
        user.failed_login_attempts = 0
        user.account_status = AccountStatus.ACTIVE
        user.locked_until = None

        ip = _get_client_ip(request)
        self.audit_repo.log(
            action=AuditAction.PASSWORD_RESET,
            user_id=user.id,
            user_name=user.full_name,
            user_role=user.role,
            ip_address=ip,
            details=f"Password reset completed via OTP for {email}",
        )
        self.db.commit()
        logger.info("Password reset via OTP completed", user_id=str(user.id))

    def login_citizen(
        self,
        payload: CitizenLoginRequest,
        request: Request,
    ) -> LoginResponse:
        """Authenticate a citizen and return JWT token pair."""
        ip = _get_client_ip(request)
        user = self.user_repo.get_by_identifier(payload.identifier, role=UserRole.CITIZEN)

        if not user:
            self.audit_repo.log(
                action=AuditAction.USER_LOGIN_FAILED,
                ip_address=ip,
                details=f"Login failed: identifier not found: {payload.identifier}",
            )
            self.db.commit()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials. Please check your email/phone and password.",
            )

        return self._authenticate(user, payload.password, ip, request)

    def login_police(
        self,
        payload: PoliceLoginRequest,
        request: Request,
    ) -> LoginResponse:
        """Authenticate a police officer and return JWT token pair."""
        ip = _get_client_ip(request)
        user = self.user_repo.get_by_identifier(payload.identifier)

        if not user or user.role not in (UserRole.POLICE_OFFICER, UserRole.POLICE_ADMIN):
            self.audit_repo.log(
                action=AuditAction.USER_LOGIN_FAILED,
                ip_address=ip,
                details=f"Police login failed: identifier not found: {payload.identifier}",
            )
            self.db.commit()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials. Restricted police system access.",
            )

        return self._authenticate(user, payload.password, ip, request)

    def _authenticate(
        self, user: User, password: str, ip: str, request: Request
    ) -> LoginResponse:
        """Shared authentication logic for both roles."""
        # Check account lockout
        if user.account_status == AccountStatus.LOCKED:
            locked_until = user.locked_until
            if locked_until and locked_until.tzinfo is None:
                locked_until = locked_until.replace(tzinfo=timezone.utc)

            if locked_until and datetime.now(timezone.utc) > locked_until:
                # Auto-unlock if lockout period expired
                self.user_repo.unlock_account(user)
            else:
                self.audit_repo.log(
                    action=AuditAction.USER_LOGIN_FAILED,
                    user_id=user.id,
                    user_name=user.full_name,
                    ip_address=ip,
                    details="Login attempt on locked account",
                )
                self.db.commit()
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Account is temporarily locked. Please try again later or contact support.",
                )

        if user.account_status == AccountStatus.SUSPENDED:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account suspended. Contact system administrator.",
            )

        # Verify password
        if not verify_password(password, user.hashed_password):
            failed_count = self.user_repo.increment_failed_login(user)

            if failed_count >= settings.MAX_LOGIN_ATTEMPTS:
                lock_until = datetime.now(timezone.utc) + timedelta(
                    minutes=settings.ACCOUNT_LOCKOUT_MINUTES
                )
                self.user_repo.lock_account(user, lock_until)
                self.audit_repo.log(
                    action=AuditAction.USER_LOCKED,
                    user_id=user.id,
                    user_name=user.full_name,
                    user_role=user.role,
                    ip_address=ip,
                    details=f"Account locked after {failed_count} failed attempts",
                )
                self.db.commit()
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Account locked for {settings.ACCOUNT_LOCKOUT_MINUTES} minutes due to repeated failed attempts.",
                )

            self.audit_repo.log(
                action=AuditAction.USER_LOGIN_FAILED,
                user_id=user.id,
                user_name=user.full_name,
                ip_address=ip,
                details=f"Invalid password. Attempt {failed_count}/{settings.MAX_LOGIN_ATTEMPTS}",
            )
            self.db.commit()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid credentials. {settings.MAX_LOGIN_ATTEMPTS - failed_count} attempts remaining.",
            )

        # Successful login
        self.user_repo.update_last_login(user, ip)

        token_pair, jti, raw_refresh = _build_token_pair(user)
        expires_at = datetime.now(timezone.utc) + timedelta(
            days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS
        )
        device_info = request.headers.get("User-Agent", "Unknown")
        self.user_repo.store_refresh_token(
            user_id=user.id,
            token=raw_refresh,
            jti=jti,
            expires_at=expires_at,
            ip_address=ip,
            device_info=device_info[:500],
        )

        self.audit_repo.log(
            action=AuditAction.USER_LOGIN,
            user_id=user.id,
            user_name=user.full_name,
            user_role=user.role,
            ip_address=ip,
            details=f"Successful login from {ip}",
        )

        self.db.commit()
        logger.info("User logged in", user_id=str(user.id), role=user.role)

        # Reload with full relationships for response
        full_user = self.user_repo.get_by_id(user.id)

        return LoginResponse(
            tokens=token_pair,
            user=_build_user_out(full_user or user),
            message="Authentication successful",
        )

    def refresh_tokens(
        self,
        refresh_token: str,
        request: Request,
    ) -> TokenPair:
        """Rotate refresh token - old one is revoked, new pair issued."""
        ip = _get_client_ip(request)

        # Validate refresh token
        from app.core.security import decode_token
        from jose import JWTError
        try:
            payload = decode_token(refresh_token)
        except JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token.",
            )

        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type.",
            )

        jti = payload.get("jti")
        user_id_str = payload.get("sub")

        # Check database record
        token_record = self.user_repo.get_refresh_token_by_jti(jti) if jti else None
        if not token_record:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token not found or already revoked.",
            )

        # Revoke old token (rotation)
        self.user_repo.revoke_refresh_token(token_record)

        user = self.user_repo.get_by_id(uuid.UUID(user_id_str))
        if not user or user.account_status != AccountStatus.ACTIVE:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User account is not active.",
            )

        # Issue new pair
        new_token_pair, new_jti, new_raw_refresh = _build_token_pair(user)
        expires_at = datetime.now(timezone.utc) + timedelta(
            days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS
        )
        self.user_repo.store_refresh_token(
            user_id=user.id,
            token=new_raw_refresh,
            jti=new_jti,
            expires_at=expires_at,
            ip_address=ip,
        )

        self.audit_repo.log(
            action=AuditAction.TOKEN_REFRESHED,
            user_id=user.id,
            user_name=user.full_name,
            ip_address=ip,
            details="Token rotation completed",
        )
        self.db.commit()

        return new_token_pair

    def logout(self, user: User, refresh_token: Optional[str], request: Request) -> None:
        """Revoke all refresh tokens for the user (logout from all devices)."""
        ip = _get_client_ip(request)

        if refresh_token:
            token_record = self.user_repo.get_refresh_token_by_hash(refresh_token)
            if token_record:
                self.user_repo.revoke_refresh_token(token_record)
        else:
            self.user_repo.revoke_all_user_refresh_tokens(user.id)

        self.audit_repo.log(
            action=AuditAction.USER_LOGOUT,
            user_id=user.id,
            user_name=user.full_name,
            user_role=user.role,
            ip_address=ip,
        )
        self.db.commit()

    def request_password_reset(
        self, email: str, request: Request
    ) -> str:
        """Generate password reset token. Returns token (for email sending)."""
        ip = _get_client_ip(request)
        user = self.user_repo.get_by_email(email)

        # Always return success to prevent user enumeration attacks
        if not user:
            logger.info("Password reset requested for non-existent email", email=email)
            return ""

        token = generate_secure_token(48)
        expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
        self.user_repo.store_password_reset_token(
            user_id=user.id,
            token=token,
            expires_at=expires_at,
            ip_address=ip,
        )

        self.audit_repo.log(
            action=AuditAction.PASSWORD_RESET_REQUESTED,
            user_id=user.id,
            user_name=user.full_name,
            ip_address=ip,
        )
        self.db.commit()
        return token

    def confirm_password_reset(self, token: str, new_password: str) -> None:
        """Verify reset token and set new password."""
        token_record = self.user_repo.get_valid_password_reset_token(token)
        if not token_record:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired password reset token.",
            )

        user = self.user_repo.get_by_id(token_record.user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

        new_hashed = hash_password(new_password)
        self.user_repo.update_password(user, new_hashed)
        self.user_repo.mark_password_reset_token_used(token_record)

        # Revoke all refresh tokens to force re-login
        self.user_repo.revoke_all_user_refresh_tokens(user.id)

        self.audit_repo.log(
            action=AuditAction.PASSWORD_RESET_COMPLETED,
            user_id=user.id,
            user_name=user.full_name,
        )
        self.db.commit()

    def verify_email(self, token: str) -> None:
        """Mark user email as verified using the verification token."""
        token_record = self.user_repo.get_valid_email_verification_token(token)
        if not token_record:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired email verification token.",
            )

        user = self.user_repo.get_by_id(token_record.user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

        self.user_repo.verify_email(user)
        self.user_repo.mark_email_verification_token_used(token_record)

        self.audit_repo.log(
            action=AuditAction.EMAIL_VERIFIED,
            user_id=user.id,
            user_name=user.full_name,
        )
        self.db.commit()
