"""
User-related database models.
Tables: users, citizen_profiles, police_profiles, sessions, refresh_tokens,
        password_reset_tokens, email_verification_tokens
"""
import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import (
    Boolean, DateTime, ForeignKey, Index, Integer,
    String, Text, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import AccountStatus, UserRole

if TYPE_CHECKING:
    from app.models.complaint import Complaint, OfficerNote
    from app.models.notification import Notification
    from app.models.audit import AuditLog
    from app.models.chat import ChatHistory


class User(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    """
    Core user authentication table.
    Shared across both citizens and police personnel.
    """
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, index=True
    )
    phone: Mapped[Optional[str]] = mapped_column(
        String(20), unique=True, nullable=True, index=True
    )
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        String(20), nullable=False, index=True
    )
    account_status: Mapped[AccountStatus] = mapped_column(
        String(30), nullable=False, default=AccountStatus.ACTIVE, index=True
    )

    # Verification flags
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    phone_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Security tracking
    failed_login_attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    locked_until: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_login_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_login_ip: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)

    # Avatar
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Created by (for admin-created police accounts)
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    # ─── Relationships ────────────────────────────────────────────────────────
    citizen_profile: Mapped[Optional["CitizenProfile"]] = relationship(
        "CitizenProfile", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    police_profile: Mapped[Optional["PoliceProfile"]] = relationship(
        "PoliceProfile", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    refresh_tokens: Mapped[List["RefreshToken"]] = relationship(
        "RefreshToken", back_populates="user", cascade="all, delete-orphan"
    )
    password_reset_tokens: Mapped[List["PasswordResetToken"]] = relationship(
        "PasswordResetToken", back_populates="user", cascade="all, delete-orphan"
    )
    email_verification_tokens: Mapped[List["EmailVerificationToken"]] = relationship(
        "EmailVerificationToken", back_populates="user", cascade="all, delete-orphan"
    )
    notifications: Mapped[List["Notification"]] = relationship(
        "Notification", back_populates="user", cascade="all, delete-orphan"
    )
    audit_logs: Mapped[List["AuditLog"]] = relationship(
        "AuditLog", back_populates="user", foreign_keys="[AuditLog.user_id]"
    )
    chat_histories: Mapped[List["ChatHistory"]] = relationship(
        "ChatHistory", back_populates="user", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_users_email_role", "email", "role"),
        Index("ix_users_phone_role", "phone", "role"),
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email} role={self.role}>"


class CitizenProfile(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Extended profile data for citizens."""
    __tablename__ = "citizen_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    # Address
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    state: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    pin_code: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    district: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Government ID (masked/hashed, never stored in plaintext)
    citizen_id_hash: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True, comment="Hashed Aadhaar/voter ID, never plaintext"
    )

    # Emergency contact
    emergency_contact_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    emergency_contact_phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    # Preferences
    preferred_language: Mapped[str] = mapped_column(String(10), default="en", nullable=False)
    notification_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    sms_notification: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    email_notification: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationship
    user: Mapped["User"] = relationship("User", back_populates="citizen_profile")

    def __repr__(self) -> str:
        return f"<CitizenProfile user_id={self.user_id}>"


class PoliceProfile(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Extended profile for police officers and admins."""
    __tablename__ = "police_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    badge_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    employee_id: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    rank: Mapped[str] = mapped_column(String(100), nullable=False)
    department: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    specialty: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)

    # Station assignment
    station_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("police_stations.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    precinct: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)

    # Performance metrics
    total_cases_assigned: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_cases_resolved: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    avg_resolution_time_hours: Mapped[Optional[float]] = mapped_column(nullable=True)
    performance_rating: Mapped[float] = mapped_column(default=0.0, nullable=False)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="police_profile")
    station: Mapped[Optional["PoliceStation"]] = relationship(  # type: ignore[name-defined]
        "PoliceStation", back_populates="officers", foreign_keys="[PoliceProfile.station_id]"
    )

    def __repr__(self) -> str:
        return f"<PoliceProfile badge={self.badge_number} rank={self.rank}>"


class RefreshToken(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Stored refresh tokens to enable revocation."""
    __tablename__ = "refresh_tokens"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    token_hash: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, index=True,
        comment="SHA-256 hash of the token, never store plaintext"
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    is_revoked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    device_info: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    jti: Mapped[str] = mapped_column(
        String(100), unique=True, nullable=False, index=True,
        comment="JWT ID for tracking individual tokens"
    )

    user: Mapped["User"] = relationship("User", back_populates="refresh_tokens")


class PasswordResetToken(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Single-use password reset tokens with expiration."""
    __tablename__ = "password_reset_tokens"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    token_hash: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    is_used: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    used_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="password_reset_tokens")


class EmailVerificationToken(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Email address verification tokens."""
    __tablename__ = "email_verification_tokens"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    token_hash: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    is_used: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    used_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="email_verification_tokens")


# PoliceStation is referenced via string forward-reference in PoliceProfile relationship
# No import needed here — SQLAlchemy resolves it at mapper configuration time.
