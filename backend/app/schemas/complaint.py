"""Complaint request/response schemas."""
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator

from app.models.enums import (
    ComplaintStatus, CrimeCategory, MediaType,
    PriorityLevel, SeverityLevel
)


# ─── Sub-schemas ─────────────────────────────────────────────────────────────
class AIAnalysisOut(BaseModel):
    """AI analysis result embedded in complaint responses."""
    category: str
    severity: str
    priority: str
    fake_probability: float
    fake_reasoning: Optional[str]
    is_duplicate: bool
    matched_complaint_id: Optional[str]
    duplicate_confidence: float
    nearest_station: Optional[str]
    suggested_action: Optional[str]
    estimated_response_time: Optional[str]
    confidence_score: float
    hotspot_zone: Optional[str]
    recommended_officer_specialty: Optional[str]
    ipc_sections: Optional[List[str]]
    ai_summary: Optional[str]

    class Config:
        from_attributes = True


class TimelineEventOut(BaseModel):
    """Single timeline entry."""
    id: str
    timestamp: str
    status: str
    actor: str
    message: str

    class Config:
        from_attributes = True


class OfficerNoteOut(BaseModel):
    """Officer note response."""
    id: str
    officer_name: str
    badge_number: str
    timestamp: str
    note: str

    class Config:
        from_attributes = True


class ComplaintMediaOut(BaseModel):
    """Media file response."""
    id: str
    media_type: str
    file_name: str
    file_path: str
    mime_type: str
    file_size_bytes: int
    original_name: str

    class Config:
        from_attributes = True


# ─── Complaint Create ─────────────────────────────────────────────────────────
class ComplaintCreateRequest(BaseModel):
    """Payload for creating a new complaint."""
    crime_category: CrimeCategory = Field(..., description="Type of crime")
    title: str = Field(..., min_length=10, max_length=500, description="Short summary")
    description: str = Field(..., min_length=20, max_length=5000, description="Detailed description")
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    address: str = Field(..., min_length=5, max_length=500)
    district: str = Field(..., min_length=2, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    pin_code: Optional[str] = Field(None, max_length=10)
    is_anonymous: bool = Field(default=False)
    is_emergency: bool = Field(default=False)
    # Override citizen info (for anonymous or on behalf)
    citizen_name: Optional[str] = Field(None, max_length=255)
    citizen_phone: Optional[str] = Field(None, max_length=30)
    citizen_email: Optional[str] = Field(None, max_length=255)

    @field_validator("description")
    @classmethod
    def sanitize_description(cls, v: str) -> str:
        # Strip HTML tags to prevent XSS in stored data
        import re
        return re.sub(r"<[^>]+>", "", v).strip()

    @field_validator("title")
    @classmethod
    def sanitize_title(cls, v: str) -> str:
        import re
        return re.sub(r"<[^>]+>", "", v).strip()


class SOSCreateRequest(BaseModel):
    """Emergency SOS signal payload."""
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    citizen_name: Optional[str] = Field(None, max_length=255)
    citizen_phone: Optional[str] = Field(None, max_length=30)
    address: Optional[str] = Field(None, max_length=500)
    emergency_type: Optional[str] = Field(None, max_length=100)


# ─── Complaint Update ─────────────────────────────────────────────────────────
class ComplaintUpdateRequest(BaseModel):
    """Partial update for pending complaints (citizen only, before review)."""
    title: Optional[str] = Field(None, min_length=10, max_length=500)
    description: Optional[str] = Field(None, min_length=20, max_length=5000)
    crime_category: Optional[CrimeCategory] = None
    address: Optional[str] = Field(None, min_length=5, max_length=500)
    latitude: Optional[float] = Field(None, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(None, ge=-180.0, le=180.0)
    district: Optional[str] = Field(None, max_length=100)


class ComplaintStatusUpdateRequest(BaseModel):
    """Police officer status change request."""
    status: ComplaintStatus
    officer_id: Optional[str] = Field(None)
    officer_name: Optional[str] = Field(None)
    note: Optional[str] = Field(None, max_length=1000)
    rejection_reason: Optional[str] = Field(None, max_length=500)
    resolution_notes: Optional[str] = Field(None, max_length=2000)


class AssignOfficerRequest(BaseModel):
    """Assign a complaint to an officer."""
    officer_id: str = Field(..., description="Officer UUID")
    station_id: Optional[str] = Field(None)
    note: Optional[str] = Field(None, max_length=500)


class AddOfficerNoteRequest(BaseModel):
    """Add an internal investigation note."""
    note: str = Field(..., min_length=5, max_length=2000)
    is_sensitive: bool = Field(default=False)


# ─── Complaint Response ───────────────────────────────────────────────────────
class ComplaintOut(BaseModel):
    """Full complaint response matching frontend Complaint type."""
    id: str
    citizenName: str
    citizenPhone: str
    citizenEmail: str
    crimeCategory: str
    title: str
    description: str
    latitude: float
    longitude: float
    address: str
    district: str
    photos: List[str]
    videos: List[str]
    isAnonymous: bool
    isEmergency: bool
    status: str
    priority: str
    assignedOfficerId: Optional[str]
    assignedOfficerName: Optional[str]
    assignedStationId: Optional[str]
    assignedStationName: Optional[str]
    createdAt: str
    updatedAt: str
    timeline: List[TimelineEventOut]
    aiAnalysis: Optional[AIAnalysisOut]
    officerNotes: List[OfficerNoteOut]

    class Config:
        from_attributes = True


# ─── Filter Params ────────────────────────────────────────────────────────────
class ComplaintFilterParams(BaseModel):
    """Query parameters for complaint list filtering."""
    search: Optional[str] = Field(None, max_length=200)
    status: Optional[str] = None
    priority: Optional[str] = None
    category: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    officer_id: Optional[str] = None
    is_emergency: Optional[bool] = None
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)
    sort_by: str = Field(default="created_at")
    sort_order: str = Field(default="desc", pattern="^(asc|desc)$")
