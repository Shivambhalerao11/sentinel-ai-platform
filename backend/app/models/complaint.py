"""
Complaint-related models: Complaints, ComplaintMedia, ComplaintTimeline,
ComplaintStatusHistory, Assignments, OfficerNotes, AIAnalysis.
"""
import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import (
    Boolean, DateTime, Float, ForeignKey, Index,
    Integer, String, Text, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin, SoftDeleteMixin
from app.models.enums import (
    ComplaintStatus, CrimeCategory, MediaType,
    PriorityLevel, SeverityLevel
)

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.location import PoliceStation


class Complaint(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    """
    Primary complaint table. Core entity of the platform.
    """
    __tablename__ = "complaints"

    # Human-readable ID (e.g. CASE-2026-00124)
    complaint_id: Mapped[str] = mapped_column(
        String(30), unique=True, nullable=False, index=True
    )

    # Citizen information
    citizen_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    citizen_name: Mapped[str] = mapped_column(String(255), nullable=False)
    citizen_phone: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    citizen_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_anonymous: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)

    # Crime details
    crime_category: Mapped[CrimeCategory] = mapped_column(
        String(50), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)

    # Location
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    address: Mapped[str] = mapped_column(Text, nullable=False)
    district: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    pin_code: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    location_accuracy_meters: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Status & Priority
    status: Mapped[ComplaintStatus] = mapped_column(
        String(30), nullable=False, default=ComplaintStatus.PENDING, index=True
    )
    priority: Mapped[PriorityLevel] = mapped_column(
        String(20), nullable=False, default=PriorityLevel.ROUTINE, index=True
    )
    is_emergency: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False, index=True
    )

    # Assignment
    assigned_officer_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    assigned_officer_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    assigned_station_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("police_stations.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    assigned_station_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    assigned_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Resolution
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    resolution_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Tracking
    view_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_by: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # ─── Relationships ────────────────────────────────────────────────────────
    citizen: Mapped[Optional["User"]] = relationship(
        "User", foreign_keys=[citizen_id], backref="complaints"
    )
    assigned_officer: Mapped[Optional["User"]] = relationship(
        "User", foreign_keys=[assigned_officer_id]
    )
    assigned_station: Mapped[Optional["PoliceStation"]] = relationship(
        "PoliceStation", foreign_keys=[assigned_station_id]
    )
    media_files: Mapped[List["ComplaintMedia"]] = relationship(
        "ComplaintMedia", back_populates="complaint", cascade="all, delete-orphan"
    )
    timeline: Mapped[List["ComplaintTimeline"]] = relationship(
        "ComplaintTimeline",
        back_populates="complaint",
        cascade="all, delete-orphan",
        order_by="ComplaintTimeline.created_at",
    )
    officer_notes: Mapped[List["OfficerNote"]] = relationship(
        "OfficerNote", back_populates="complaint", cascade="all, delete-orphan"
    )
    ai_analysis: Mapped[Optional["AIAnalysis"]] = relationship(
        "AIAnalysis", back_populates="complaint", uselist=False, cascade="all, delete-orphan"
    )
    status_history: Mapped[List["ComplaintStatusHistory"]] = relationship(
        "ComplaintStatusHistory",
        back_populates="complaint",
        cascade="all, delete-orphan",
        order_by="ComplaintStatusHistory.created_at",
    )

    __table_args__ = (
        Index("ix_complaints_location", "latitude", "longitude"),
        Index("ix_complaints_status_priority", "status", "priority"),
        Index("ix_complaints_district_status", "district", "status"),
        Index("ix_complaints_created_at_desc", "created_at"),
    )

    def __repr__(self) -> str:
        return f"<Complaint id={self.complaint_id} status={self.status}>"


class ComplaintMedia(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Evidence files (images, videos, documents) attached to a complaint."""
    __tablename__ = "complaint_media"

    complaint_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("complaints.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    media_type: Mapped[MediaType] = mapped_column(String(20), nullable=False)
    file_name: Mapped[str] = mapped_column(String(500), nullable=False)
    file_path: Mapped[str] = mapped_column(String(1000), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    original_name: Mapped[str] = mapped_column(String(500), nullable=False)
    storage_backend: Mapped[str] = mapped_column(
        String(20), default="local", nullable=False,
        comment="local | s3"
    )
    s3_key: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    thumbnail_path: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    uploaded_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    metadata_json: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    complaint: Mapped["Complaint"] = relationship("Complaint", back_populates="media_files")

    def __repr__(self) -> str:
        return f"<ComplaintMedia type={self.media_type} file={self.file_name}>"


class ComplaintTimeline(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Immutable audit trail for each status change in a complaint."""
    __tablename__ = "complaint_timeline"

    complaint_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("complaints.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    status: Mapped[str] = mapped_column(String(50), nullable=False)
    actor_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    actor_name: Mapped[str] = mapped_column(String(255), nullable=False)
    actor_role: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    metadata_json: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    complaint: Mapped["Complaint"] = relationship("Complaint", back_populates="timeline")


class ComplaintStatusHistory(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Complete status change history for analytics."""
    __tablename__ = "complaint_status_history"

    complaint_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("complaints.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    from_status: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    to_status: Mapped[str] = mapped_column(String(30), nullable=False)
    changed_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    time_in_previous_status_minutes: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    complaint: Mapped["Complaint"] = relationship("Complaint", back_populates="status_history")


class OfficerNote(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Internal investigation notes added by officers to a complaint."""
    __tablename__ = "officer_notes"

    complaint_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("complaints.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    officer_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    officer_name: Mapped[str] = mapped_column(String(255), nullable=False)
    badge_number: Mapped[str] = mapped_column(String(50), nullable=False)
    note: Mapped[str] = mapped_column(Text, nullable=False)
    is_sensitive: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False,
        comment="Sensitive notes visible only to admin"
    )

    complaint: Mapped["Complaint"] = relationship("Complaint", back_populates="officer_notes")
    officer: Mapped[Optional["User"]] = relationship("User", foreign_keys=[officer_id])

    def __repr__(self) -> str:
        return f"<OfficerNote badge={self.badge_number}>"


class AIAnalysis(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """AI-generated analysis result for each complaint."""
    __tablename__ = "ai_analysis"

    complaint_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("complaints.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )

    # Classification
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    severity: Mapped[SeverityLevel] = mapped_column(String(20), nullable=False)
    priority: Mapped[PriorityLevel] = mapped_column(String(20), nullable=False)

    # Fake detection
    fake_probability: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    fake_reasoning: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Duplicate detection
    is_duplicate: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    matched_complaint_id: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    duplicate_confidence: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    embedding_vector: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True,
        comment="JSON-serialized embedding for semantic search"
    )

    # Recommendations
    nearest_station: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    suggested_action: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    estimated_response_time: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    confidence_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    hotspot_zone: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    recommended_officer_specialty: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    ipc_sections: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)
    ai_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Processing metadata
    model_used: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    processing_time_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    analysis_version: Mapped[str] = mapped_column(String(20), default="1.0", nullable=False)

    complaint: Mapped["Complaint"] = relationship("Complaint", back_populates="ai_analysis")

    def __repr__(self) -> str:
        return f"<AIAnalysis complaint_id={self.complaint_id} severity={self.severity}>"
