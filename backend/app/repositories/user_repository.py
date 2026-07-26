"""
User repository: all database operations for users.
No business logic - pure data access.
"""
import hashlib
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import or_, and_
from sqlalchemy.orm import Session, joinedload

from app.models.enums import AccountStatus, UserRole
from app.models.user import (
    CitizenProfile, EmailVerificationToken, PasswordResetToken,
    PoliceProfile, RefreshToken, User, EmailOTP
)
from app.core.logging import get_logger

logger = get_logger(__name__)


def _hash_token(token: str) -> str:
    """SHA-256 hash a token before storage - never store plaintext tokens."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    # ─── User CRUD ────────────────────────────────────────────────────────────
    def get_by_id(self, user_id: uuid.UUID) -> Optional[User]:
        return (
            self.db.query(User)
            .options(
                joinedload(User.citizen_profile),
                joinedload(User.police_profile).joinedload(PoliceProfile.station),
            )
            .filter(User.id == user_id, User.is_deleted == False)
            .first()
        )

    def get_by_email(self, email: str) -> Optional[User]:
        return (
            self.db.query(User)
            .filter(User.email == email.lower().strip(), User.is_deleted == False)
            .first()
        )

    def get_by_phone(self, phone: str) -> Optional[User]:
        return (
            self.db.query(User)
            .filter(User.phone == phone, User.is_deleted == False)
            .first()
        )

    def get_by_badge_number(self, badge_number: str) -> Optional[User]:
        return (
            self.db.query(User)
            .join(PoliceProfile)
            .filter(
                PoliceProfile.badge_number == badge_number.upper(),
                User.is_deleted == False,
            )
            .first()
        )

    def get_by_employee_id(self, employee_id: str) -> Optional[User]:
        return (
            self.db.query(User)
            .join(PoliceProfile)
            .filter(
                PoliceProfile.employee_id == employee_id.upper(),
                User.is_deleted == False,
            )
            .first()
        )

    def get_by_identifier(self, identifier: str, role: Optional[str] = None) -> Optional[User]:
        """
        Find user by email, phone, badge number, or employee ID.
        Optionally filter by role.
        """
        identifier_clean = identifier.strip()
        identifier_lower = identifier_clean.lower()

        # Try email
        user = self.get_by_email(identifier_lower)
        if user:
            if role is None or user.role == role:
                return user

        # Try phone
        user = self.get_by_phone(identifier_clean)
        if user:
            if role is None or user.role == role:
                return user

        # Try badge number (police only)
        if role in (UserRole.POLICE_OFFICER, UserRole.POLICE_ADMIN, None):
            user = self.get_by_badge_number(identifier_clean.upper())
            if user:
                return user

            user = self.get_by_employee_id(identifier_clean.upper())
            if user:
                return user

        return None

    def get_all_officers(
        self, station_id: Optional[uuid.UUID] = None, page: int = 1, page_size: int = 50
    ) -> tuple[List[User], int]:
        query = (
            self.db.query(User)
            .join(PoliceProfile)
            .options(joinedload(User.police_profile).joinedload(PoliceProfile.station))
            .filter(
                User.role.in_([UserRole.POLICE_OFFICER, UserRole.POLICE_ADMIN]),
                User.is_deleted == False,
            )
        )
        if station_id:
            query = query.filter(PoliceProfile.station_id == station_id)

        total = query.count()
        users = query.offset((page - 1) * page_size).limit(page_size).all()
        return users, total

    def create_user(
        self,
        email: str,
        phone: Optional[str],
        hashed_password: str,
        full_name: str,
        role: UserRole,
        created_by_id: Optional[uuid.UUID] = None,
    ) -> User:
        user = User(
            email=email.lower().strip(),
            phone=phone,
            hashed_password=hashed_password,
            full_name=full_name,
            role=role,
            account_status=AccountStatus.ACTIVE,
            email_verified=False,
            phone_verified=False,
            created_by=created_by_id,
        )
        self.db.add(user)
        self.db.flush()  # Get the generated ID without committing
        return user

    def create_citizen_profile(self, user_id: uuid.UUID, **kwargs) -> CitizenProfile:
        profile = CitizenProfile(user_id=user_id, **kwargs)
        self.db.add(profile)
        self.db.flush()
        return profile

    def create_police_profile(self, user_id: uuid.UUID, **kwargs) -> PoliceProfile:
        profile = PoliceProfile(user_id=user_id, **kwargs)
        self.db.add(profile)
        self.db.flush()
        return profile

    def update_last_login(self, user: User, ip_address: str) -> None:
        user.last_login_at = datetime.now(timezone.utc)
        user.last_login_ip = ip_address
        user.failed_login_attempts = 0
        self.db.flush()

    def increment_failed_login(self, user: User) -> int:
        user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
        self.db.flush()
        return user.failed_login_attempts

    def lock_account(self, user: User, until: datetime) -> None:
        user.account_status = AccountStatus.LOCKED
        user.locked_until = until
        self.db.flush()

    def unlock_account(self, user: User) -> None:
        user.account_status = AccountStatus.ACTIVE
        user.locked_until = None
        user.failed_login_attempts = 0
        self.db.flush()

    def update_password(self, user: User, new_hashed_password: str) -> None:
        user.hashed_password = new_hashed_password
        self.db.flush()

    def verify_email(self, user: User) -> None:
        user.email_verified = True
        user.account_status = AccountStatus.ACTIVE
        self.db.flush()

    def verify_phone(self, user: User) -> None:
        user.phone_verified = True
        self.db.flush()

    def soft_delete_user(self, user: User) -> None:
        user.is_deleted = True
        user.deleted_at = datetime.now(timezone.utc)
        user.account_status = AccountStatus.SUSPENDED
        self.db.flush()

    # ─── Token Management ─────────────────────────────────────────────────────
    def store_refresh_token(
        self,
        user_id: uuid.UUID,
        token: str,
        jti: str,
        expires_at: datetime,
        ip_address: Optional[str] = None,
        device_info: Optional[str] = None,
    ) -> RefreshToken:
        rt = RefreshToken(
            user_id=user_id,
            token_hash=_hash_token(token),
            jti=jti,
            expires_at=expires_at,
            ip_address=ip_address,
            device_info=device_info,
        )
        self.db.add(rt)
        self.db.flush()
        return rt

    def get_refresh_token_by_hash(self, token: str) -> Optional[RefreshToken]:
        token_hash = _hash_token(token)
        return (
            self.db.query(RefreshToken)
            .filter(
                RefreshToken.token_hash == token_hash,
                RefreshToken.is_revoked == False,
                RefreshToken.expires_at > datetime.now(timezone.utc),
            )
            .first()
        )

    def get_refresh_token_by_jti(self, jti: str) -> Optional[RefreshToken]:
        return (
            self.db.query(RefreshToken)
            .filter(RefreshToken.jti == jti, RefreshToken.is_revoked == False)
            .first()
        )

    def revoke_refresh_token(self, token_record: RefreshToken) -> None:
        token_record.is_revoked = True
        token_record.revoked_at = datetime.now(timezone.utc)
        self.db.flush()

    def revoke_all_user_refresh_tokens(self, user_id: uuid.UUID) -> int:
        count = (
            self.db.query(RefreshToken)
            .filter(RefreshToken.user_id == user_id, RefreshToken.is_revoked == False)
            .update(
                {"is_revoked": True, "revoked_at": datetime.now(timezone.utc)},
                synchronize_session=False,
            )
        )
        self.db.flush()
        return count

    def store_password_reset_token(
        self,
        user_id: uuid.UUID,
        token: str,
        expires_at: datetime,
        ip_address: Optional[str] = None,
    ) -> PasswordResetToken:
        prt = PasswordResetToken(
            user_id=user_id,
            token_hash=_hash_token(token),
            expires_at=expires_at,
            ip_address=ip_address,
        )
        self.db.add(prt)
        self.db.flush()
        return prt

    def get_valid_password_reset_token(self, token: str) -> Optional[PasswordResetToken]:
        token_hash = _hash_token(token)
        return (
            self.db.query(PasswordResetToken)
            .filter(
                PasswordResetToken.token_hash == token_hash,
                PasswordResetToken.is_used == False,
                PasswordResetToken.expires_at > datetime.now(timezone.utc),
            )
            .first()
        )

    def mark_password_reset_token_used(self, token_record: PasswordResetToken) -> None:
        token_record.is_used = True
        token_record.used_at = datetime.now(timezone.utc)
        self.db.flush()

    def store_email_verification_token(
        self,
        user_id: uuid.UUID,
        token: str,
        email: str,
        expires_at: datetime,
    ) -> EmailVerificationToken:
        evt = EmailVerificationToken(
            user_id=user_id,
            token_hash=_hash_token(token),
            email=email,
            expires_at=expires_at,
        )
        self.db.add(evt)
        self.db.flush()
        return evt

    def get_valid_email_verification_token(
        self, token: str
    ) -> Optional[EmailVerificationToken]:
        token_hash = _hash_token(token)
        return (
            self.db.query(EmailVerificationToken)
            .filter(
                EmailVerificationToken.token_hash == token_hash,
                EmailVerificationToken.is_used == False,
                EmailVerificationToken.expires_at > datetime.now(timezone.utc),
            )
            .first()
        )

    def mark_email_verification_token_used(
        self, token_record: EmailVerificationToken
    ) -> None:
        token_record.is_used = True
        token_record.used_at = datetime.now(timezone.utc)
        self.db.flush()

    # ─── Existence Checks ─────────────────────────────────────────────────────
    def email_exists(self, email: str) -> bool:
        return (
            self.db.query(User.id)
            .filter(User.email == email.lower().strip(), User.is_deleted == False)
            .first()
            is not None
        )

    def phone_exists(self, phone: str) -> bool:
        return (
            self.db.query(User.id)
            .filter(User.phone == phone, User.is_deleted == False)
            .first()
            is not None
        )

    def badge_exists(self, badge_number: str) -> bool:
        return (
            self.db.query(PoliceProfile.id)
            .filter(PoliceProfile.badge_number == badge_number.upper())
            .first()
            is not None
        )

    def employee_id_exists(self, employee_id: str) -> bool:
        return (
            self.db.query(PoliceProfile.id)
            .filter(PoliceProfile.employee_id == employee_id.upper())
            .first()
            is not None
        )

    # ─── Email OTP Operations ──────────────────────────────────────────────────
    def store_email_otp(
        self,
        email: str,
        otp_code: str,
        purpose: str,
        expires_at: datetime,
        ip_address: Optional[str] = None,
    ) -> EmailOTP:
        # Invalidate previous unverified OTPs for this email & purpose
        self.db.query(EmailOTP).filter(
            EmailOTP.email == email.lower().strip(),
            EmailOTP.purpose == purpose,
            EmailOTP.is_verified == False,
        ).update({"is_used": True}, synchronize_session=False)

        otp_record = EmailOTP(
            email=email.lower().strip(),
            otp_hash=_hash_token(otp_code),
            purpose=purpose,
            expires_at=expires_at,
            ip_address=ip_address,
        )
        self.db.add(otp_record)
        self.db.flush()
        return otp_record

    def get_latest_email_otp(self, email: str, purpose: str) -> Optional[EmailOTP]:
        return (
            self.db.query(EmailOTP)
            .filter(
                EmailOTP.email == email.lower().strip(),
                EmailOTP.purpose == purpose,
                EmailOTP.is_used == False,
            )
            .order_by(EmailOTP.created_at.desc())
            .first()
        )

    def mark_otp_verified(self, otp_record: EmailOTP) -> None:
        otp_record.is_verified = True
        otp_record.verified_at = datetime.now(timezone.utc)
        self.db.flush()

