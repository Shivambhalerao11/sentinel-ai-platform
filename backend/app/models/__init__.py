"""
Models package - imports all models so Alembic can auto-detect them.
"""
from app.db.base import Base  # noqa: F401
from app.models.enums import *  # noqa: F401,F403
from app.models.user import (  # noqa: F401
    User, CitizenProfile, PoliceProfile,
    RefreshToken, PasswordResetToken, EmailVerificationToken, EmailOTP
)
from app.models.location import District, PoliceStation, PatrolUnit  # noqa: F401
from app.models.complaint import (  # noqa: F401
    Complaint, ComplaintMedia, ComplaintTimeline,
    ComplaintStatusHistory, OfficerNote, AIAnalysis
)
from app.models.notification import Notification  # noqa: F401
from app.models.audit import AuditLog  # noqa: F401
from app.models.chat import ChatHistory  # noqa: F401
