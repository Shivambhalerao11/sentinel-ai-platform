"""
Centralized enum definitions matching the frontend TypeScript types.
All database enums are defined here to ensure single source of truth.
"""
import enum


class UserRole(str, enum.Enum):
    CITIZEN = "citizen"
    POLICE_OFFICER = "police_officer"
    POLICE_ADMIN = "police_admin"


class AccountStatus(str, enum.Enum):
    ACTIVE = "active"
    LOCKED = "locked"
    SUSPENDED = "suspended"
    PENDING_VERIFICATION = "pending_verification"


class CrimeCategory(str, enum.Enum):
    CYBERCRIME = "Cybercrime"
    VIOLENCE = "Violence"
    THEFT_BURGLARY = "Theft/Burglary"
    TRAFFIC_INCIDENT = "Traffic Incident"
    HARASSMENT = "Harassment"
    FRAUD_SCAM = "Fraud/Scam"
    NARCOTICS = "Narcotics"
    DOMESTIC_ESCALATION = "Domestic Escalation"
    ORGANIZED_CRIME = "Organized Crime"
    MISSING_PERSON = "Missing Person"
    PROPERTY_DAMAGE = "Property Damage"
    ENVIRONMENTAL = "Environmental Crime"
    OTHER = "Other"


class ComplaintStatus(str, enum.Enum):
    PENDING = "Pending"
    UNDER_REVIEW = "Under Review"
    ASSIGNED = "Assigned"
    IN_PROGRESS = "In Progress"
    RESOLVED = "Resolved"
    REJECTED = "Rejected"
    FORWARDED = "Forwarded"
    CLOSED = "Closed"


class PriorityLevel(str, enum.Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    ROUTINE = "ROUTINE"


class SeverityLevel(str, enum.Enum):
    CRITICAL = "Critical"
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"


class NotificationType(str, enum.Enum):
    EMERGENCY = "EMERGENCY"
    ASSIGNMENT = "ASSIGNMENT"
    STATUS_CHANGE = "STATUS_CHANGE"
    SYSTEM = "SYSTEM"
    AI_ALERT = "AI_ALERT"
    REMINDER = "REMINDER"


class AuditAction(str, enum.Enum):
    # Auth events
    USER_REGISTERED = "USER_REGISTERED"
    USER_LOGIN = "USER_LOGIN"
    USER_LOGOUT = "USER_LOGOUT"
    USER_LOGIN_FAILED = "USER_LOGIN_FAILED"
    USER_LOCKED = "USER_LOCKED"
    PASSWORD_RESET_REQUESTED = "PASSWORD_RESET_REQUESTED"
    PASSWORD_RESET_COMPLETED = "PASSWORD_RESET_COMPLETED"
    PASSWORD_RESET = "PASSWORD_RESET"          # alias used by reset_password_with_otp
    EMAIL_VERIFIED = "EMAIL_VERIFIED"
    PHONE_VERIFIED = "PHONE_VERIFIED"
    TOKEN_REFRESHED = "TOKEN_REFRESHED"
    OTP_SENT = "OTP_SENT"
    OTP_VERIFIED = "OTP_VERIFIED"

    # Complaint events
    COMPLAINT_CREATED = "COMPLAINT_CREATED"
    COMPLAINT_UPDATED = "COMPLAINT_UPDATED"
    COMPLAINT_DELETED = "COMPLAINT_DELETED"
    COMPLAINT_STATUS_CHANGED = "COMPLAINT_STATUS_CHANGED"
    COMPLAINT_ASSIGNED = "COMPLAINT_ASSIGNED"
    COMPLAINT_RESOLVED = "COMPLAINT_RESOLVED"
    COMPLAINT_REJECTED = "COMPLAINT_REJECTED"
    COMPLAINT_FORWARDED = "COMPLAINT_FORWARDED"

    # Officer events
    OFFICER_CREATED = "OFFICER_CREATED"
    OFFICER_UPDATED = "OFFICER_UPDATED"
    OFFICER_DEACTIVATED = "OFFICER_DEACTIVATED"
    NOTE_ADDED = "NOTE_ADDED"
    EVIDENCE_UPLOADED = "EVIDENCE_UPLOADED"

    # AI events
    AI_ANALYSIS_COMPLETED = "AI_ANALYSIS_COMPLETED"
    AI_ANALYSIS_FAILED = "AI_ANALYSIS_FAILED"
    CHATBOT_INTERACTION = "CHATBOT_INTERACTION"

    # System events
    SYSTEM_BOOT = "SYSTEM_BOOT"
    SYSTEM_ERROR = "SYSTEM_ERROR"
    UNAUTHORIZED_ACCESS = "UNAUTHORIZED_ACCESS"
    RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED"
    FILE_UPLOADED = "FILE_UPLOADED"


class MediaType(str, enum.Enum):
    IMAGE = "image"
    VIDEO = "video"
    DOCUMENT = "document"


class PatrolUnitType(str, enum.Enum):
    PATROL = "PATROL"
    SWAT = "SWAT"
    INTERCEPTOR = "INTERCEPTOR"
    K9 = "K-9"
    TRAFFIC = "TRAFFIC"
    CYBER = "CYBER"


class PatrolUnitStatus(str, enum.Enum):
    ON_SCENE = "ON SCENE"
    EN_ROUTE = "EN ROUTE"
    PATROLLING = "PATROLLING"
    DISPATCHED = "DISPATCHED"
    STANDBY = "STANDBY"
    OFF_DUTY = "OFF DUTY"


class ChatSender(str, enum.Enum):
    USER = "user"
    BOT = "bot"
    SYSTEM = "system"
