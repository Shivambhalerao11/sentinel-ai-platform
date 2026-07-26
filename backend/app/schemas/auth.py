"""Authentication request/response schemas."""
import re
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

from app.core.config import settings


# ─── Request Schemas ─────────────────────────────────────────────────────────
class CitizenRegisterRequest(BaseModel):
    """Citizen self-registration payload."""
    full_name: str = Field(..., min_length=2, max_length=255, description="Full legal name")
    email: EmailStr = Field(..., description="Valid email address")
    phone: str = Field(..., description="Mobile number with country code")
    password: str = Field(..., min_length=8, max_length=128, description="Strong password")
    address: Optional[str] = Field(None, max_length=500)
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    pin_code: Optional[str] = Field(None, max_length=10)
    citizen_id: Optional[str] = Field(None, description="Optional Aadhaar/Voter ID (not stored in plaintext)")

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        # Normalize: strip spaces, dashes, parentheses
        cleaned = re.sub(r"[\s\-\(\)]", "", v.strip())
        # Accept Indian mobile numbers: +91/91/0 prefix optional, then 10 digits starting 6-9
        if re.match(r"^(\+91|91|0)?[6-9]\d{9}$", cleaned):
            return cleaned
        # Also accept any 10+ digit number for international use
        if re.match(r"^\+?[\d]{10,15}$", cleaned):
            return cleaned
        raise ValueError(
            "Invalid mobile number. Use format: +91 98765 43210 or 9876543210"
        )

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if len(v) < settings.PASSWORD_MIN_LENGTH:
            raise ValueError(f"Password must be at least {settings.PASSWORD_MIN_LENGTH} characters")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit")
        return v

    @field_validator("pin_code")
    @classmethod
    def validate_pin_code(cls, v: Optional[str]) -> Optional[str]:
        if v and not re.match(r"^\d{6}$", v):
            raise ValueError("PIN code must be 6 digits")
        return v


class PoliceRegisterRequest(BaseModel):
    """
    Police officer account creation payload.
    Only allowed via admin-authenticated endpoint.
    """
    full_name: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    phone: str
    employee_id: str = Field(..., min_length=5, max_length=50)
    badge_number: str = Field(..., min_length=5, max_length=50)
    password: str = Field(..., min_length=8, max_length=128)
    rank: str = Field(..., min_length=2, max_length=100)
    department: Optional[str] = Field(None, max_length=200)
    specialty: Optional[str] = Field(None, max_length=200)
    station_id: Optional[str] = Field(None, description="UUID of the police station")
    precinct: Optional[str] = Field(None, max_length=200)
    role: str = Field(default="police_officer", pattern="^(police_officer|police_admin)$")

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        cleaned = re.sub(r"[\s\-\(\)]", "", v.strip())
        if re.match(r"^(\+91|91|0)?[6-9]\d{9}$", cleaned):
            return cleaned
        if re.match(r"^\+?[\d]{10,15}$", cleaned):
            return cleaned
        raise ValueError(
            "Invalid mobile number. Use format: +91 98765 43210 or 9876543210"
        )

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < settings.PASSWORD_MIN_LENGTH:
            raise ValueError(f"Password must be at least {settings.PASSWORD_MIN_LENGTH} characters")
        return v


class CitizenLoginRequest(BaseModel):
    """Citizen login with email or phone."""
    identifier: str = Field(..., description="Email address or mobile number")
    password: str = Field(..., min_length=1, max_length=128)

    @field_validator("identifier")
    @classmethod
    def strip_identifier(cls, v: str) -> str:
        return v.strip().lower()


class PoliceLoginRequest(BaseModel):
    """Police login with badge/employee ID or email."""
    identifier: str = Field(..., description="Badge number, employee ID, or email")
    password: str = Field(..., min_length=1, max_length=128)
    department: Optional[str] = Field(None)
    station_code: Optional[str] = Field(None)

    @field_validator("identifier")
    @classmethod
    def strip_identifier(cls, v: str) -> str:
        return v.strip()


class RefreshTokenRequest(BaseModel):
    """Refresh token exchange request."""
    refresh_token: str = Field(..., min_length=10)


class PasswordResetRequestSchema(BaseModel):
    """Request a password reset link."""
    email: EmailStr


class PasswordResetConfirmSchema(BaseModel):
    """Confirm password reset with token and new password."""
    token: str = Field(..., min_length=10)
    new_password: str = Field(..., min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit")
        return v


class ChangePasswordRequest(BaseModel):
    """Change password for authenticated user."""
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit")
        return v

    @model_validator(mode="after")
    def passwords_must_differ(self) -> "ChangePasswordRequest":
        if self.current_password == self.new_password:
            raise ValueError("New password must differ from current password")
        return self


class VerifyEmailRequest(BaseModel):
    """Verify email with token."""
    token: str = Field(..., min_length=10)


class VerifyPhoneOTPRequest(BaseModel):
    """Verify phone with OTP."""
    phone: str
    otp: str = Field(..., min_length=6, max_length=6)


# ─── Response Schemas ─────────────────────────────────────────────────────────
class TokenPair(BaseModel):
    """Access + Refresh token pair."""
    access_token: str
    refresh_token: str
    token_type: str = "Bearer"
    expires_in: int  # seconds until access token expiry


class UserPublicOut(BaseModel):
    """Public-safe user info returned after login."""
    id: str
    full_name: str
    email: str
    phone: Optional[str]
    role: str
    account_status: str
    email_verified: bool
    phone_verified: bool
    avatar_url: Optional[str]
    # Citizen-specific
    city: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None
    # Police-specific
    badge_number: Optional[str] = None
    employee_id: Optional[str] = None
    rank: Optional[str] = None
    department: Optional[str] = None
    specialty: Optional[str] = None
    precinct: Optional[str] = None
    station_id: Optional[str] = None
    station_name: Optional[str] = None

    class Config:
        from_attributes = True


class LoginResponse(BaseModel):
    """Login success response."""
    tokens: TokenPair
    user: UserPublicOut
    message: str = "Authentication successful"
