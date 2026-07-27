"""
Complaint repository: all database operations for complaints.
"""
import uuid
from datetime import datetime, timezone
from typing import List, Optional, Tuple

from sqlalchemy import desc, asc, or_, and_, func
from sqlalchemy.orm import Session, joinedload, selectinload

from app.models.complaint import (
    AIAnalysis, Complaint, ComplaintMedia, ComplaintStatusHistory,
    ComplaintTimeline, OfficerNote
)
from app.models.enums import ComplaintStatus, PriorityLevel
from app.core.logging import get_logger

logger = get_logger(__name__)


class ComplaintRepository:
    def __init__(self, db: Session):
        self.db = db

    # ─── Single Complaint ─────────────────────────────────────────────────────
    def get_by_id(self, complaint_id: uuid.UUID) -> Optional[Complaint]:
        return (
            self.db.query(Complaint)
            .options(
                selectinload(Complaint.timeline),
                selectinload(Complaint.officer_notes),
                selectinload(Complaint.media_files),
                joinedload(Complaint.ai_analysis),
            )
            .filter(Complaint.id == complaint_id, Complaint.is_deleted == False)
            .first()
        )

    def get_by_complaint_id(self, complaint_id_str: str) -> Optional[Complaint]:
        return (
            self.db.query(Complaint)
            .options(
                selectinload(Complaint.timeline),
                selectinload(Complaint.officer_notes),
                selectinload(Complaint.media_files),
                joinedload(Complaint.ai_analysis),
            )
            .filter(Complaint.complaint_id == complaint_id_str, Complaint.is_deleted == False)
            .first()
        )

    # ─── List Complaints ──────────────────────────────────────────────────────
    def get_list(
        self,
        search: Optional[str] = None,
        status: Optional[str] = None,
        priority: Optional[str] = None,
        category: Optional[str] = None,
        district: Optional[str] = None,
        officer_id: Optional[uuid.UUID] = None,
        citizen_id: Optional[uuid.UUID] = None,
        is_emergency: Optional[bool] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        page: int = 1,
        page_size: int = 20,
        sort_by: str = "created_at",
        sort_order: str = "desc",
    ) -> Tuple[List[Complaint], int]:
        query = (
            self.db.query(Complaint)
            .options(
                joinedload(Complaint.ai_analysis),
                selectinload(Complaint.timeline),
                selectinload(Complaint.officer_notes),
                selectinload(Complaint.media_files),
            )
            .filter(Complaint.is_deleted == False)
        )

        # Text search
        if search:
            search_term = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    Complaint.complaint_id.ilike(search_term),
                    Complaint.title.ilike(search_term),
                    Complaint.citizen_name.ilike(search_term),
                    Complaint.citizen_phone.ilike(search_term),
                    Complaint.citizen_email.ilike(search_term),
                    Complaint.district.ilike(search_term),
                    Complaint.address.ilike(search_term),
                    Complaint.assigned_officer_name.ilike(search_term),
                )
            )

        # Exact filters
        if status and status != "ALL":
            query = query.filter(Complaint.status == status)
        if priority and priority != "ALL":
            query = query.filter(Complaint.priority == priority)
        if category and category != "ALL":
            query = query.filter(Complaint.crime_category == category)
        if district and district != "ALL":
            query = query.filter(Complaint.district == district)
        if officer_id:
            query = query.filter(Complaint.assigned_officer_id == officer_id)
        if citizen_id:
            query = query.filter(Complaint.citizen_id == citizen_id)
        if is_emergency is not None:
            query = query.filter(Complaint.is_emergency == is_emergency)
        if date_from:
            query = query.filter(Complaint.created_at >= date_from)
        if date_to:
            query = query.filter(Complaint.created_at <= date_to)

        # Total count before pagination
        total = query.count()

        # Sorting
        sort_column = getattr(Complaint, sort_by, Complaint.created_at)
        if sort_order == "asc":
            query = query.order_by(asc(sort_column))
        else:
            query = query.order_by(desc(sort_column))

        # Pagination
        complaints = query.offset((page - 1) * page_size).limit(page_size).all()
        return complaints, total

    # ─── Create & Update ──────────────────────────────────────────────────────
    def create(self, **kwargs) -> Complaint:
        complaint = Complaint(**kwargs)
        self.db.add(complaint)
        self.db.flush()
        return complaint

    def update_status(
        self,
        complaint: Complaint,
        new_status: ComplaintStatus,
        changed_by_id: Optional[uuid.UUID],
        reason: Optional[str] = None,
    ) -> None:
        from_status = complaint.status
        complaint.status = new_status
        complaint.updated_at = datetime.now(timezone.utc)

        if new_status == ComplaintStatus.RESOLVED:
            complaint.resolved_at = datetime.now(timezone.utc)
        if reason:
            if new_status == ComplaintStatus.REJECTED:
                complaint.rejection_reason = reason
            elif new_status == ComplaintStatus.RESOLVED:
                complaint.resolution_notes = reason

        # Record status history
        history = ComplaintStatusHistory(
            complaint_id=complaint.id,
            from_status=from_status,
            to_status=new_status,
            changed_by_id=changed_by_id,
            reason=reason,
        )
        self.db.add(history)
        self.db.flush()

    def assign_officer(
        self,
        complaint: Complaint,
        officer_id: uuid.UUID,
        officer_name: str,
        station_id: Optional[uuid.UUID],
        station_name: Optional[str],
    ) -> None:
        complaint.assigned_officer_id = officer_id
        complaint.assigned_officer_name = officer_name
        complaint.assigned_station_id = station_id
        complaint.assigned_station_name = station_name
        complaint.assigned_at = datetime.now(timezone.utc)
        if complaint.status == ComplaintStatus.PENDING:
            complaint.status = ComplaintStatus.ASSIGNED
        self.db.flush()

    def add_timeline_event(
        self,
        complaint_id: uuid.UUID,
        status: str,
        actor_name: str,
        message: str,
        actor_id: Optional[uuid.UUID] = None,
        actor_role: Optional[str] = None,
        metadata: Optional[dict] = None,
    ) -> ComplaintTimeline:
        event = ComplaintTimeline(
            complaint_id=complaint_id,
            status=status,
            actor_id=actor_id,
            actor_name=actor_name,
            actor_role=actor_role,
            message=message,
            metadata_json=metadata,
        )
        self.db.add(event)
        self.db.flush()
        return event

    def add_officer_note(
        self,
        complaint_id: uuid.UUID,
        officer_id: Optional[uuid.UUID],
        officer_name: str,
        badge_number: str,
        note: str,
        is_sensitive: bool = False,
    ) -> OfficerNote:
        officer_note = OfficerNote(
            complaint_id=complaint_id,
            officer_id=officer_id,
            officer_name=officer_name,
            badge_number=badge_number,
            note=note,
            is_sensitive=is_sensitive,
        )
        self.db.add(officer_note)
        self.db.flush()
        return officer_note

    def save_ai_analysis(
        self, complaint_id: uuid.UUID, analysis_data: dict
    ) -> AIAnalysis:
        # Remove existing analysis if any (re-analysis case)
        existing = (
            self.db.query(AIAnalysis)
            .filter(AIAnalysis.complaint_id == complaint_id)
            .first()
        )
        if existing:
            self.db.delete(existing)
            self.db.flush()

        ai = AIAnalysis(complaint_id=complaint_id, **analysis_data)
        self.db.add(ai)
        self.db.flush()
        return ai

    def add_media(
        self,
        complaint_id: uuid.UUID,
        media_type: str,
        file_name: str,
        file_path: str,
        file_size_bytes: int,
        mime_type: str,
        original_name: str,
        uploaded_by_id: Optional[uuid.UUID] = None,
        s3_key: Optional[str] = None,
        storage_backend: str = "local",
    ) -> ComplaintMedia:
        media = ComplaintMedia(
            complaint_id=complaint_id,
            media_type=media_type,
            file_name=file_name,
            file_path=file_path,
            file_size_bytes=file_size_bytes,
            mime_type=mime_type,
            original_name=original_name,
            uploaded_by_id=uploaded_by_id,
            s3_key=s3_key,
            storage_backend=storage_backend,
        )
        self.db.add(media)
        self.db.flush()
        return media

    def soft_delete(self, complaint: Complaint) -> None:
        complaint.is_deleted = True
        complaint.deleted_at = datetime.now(timezone.utc)
        self.db.flush()

    # ─── Analytics Queries ────────────────────────────────────────────────────
    def count_by_status(self) -> dict:
        results = (
            self.db.query(Complaint.status, func.count(Complaint.id))
            .filter(Complaint.is_deleted == False)
            .group_by(Complaint.status)
            .all()
        )
        return {row[0]: row[1] for row in results}

    def count_by_category(self) -> list:
        results = (
            self.db.query(Complaint.crime_category, func.count(Complaint.id))
            .filter(Complaint.is_deleted == False)
            .group_by(Complaint.crime_category)
            .all()
        )
        return [{"category": row[0], "count": row[1]} for row in results]

    def count_by_district(self) -> list:
        results = (
            self.db.query(Complaint.district, func.count(Complaint.id))
            .filter(Complaint.is_deleted == False)
            .group_by(Complaint.district)
            .all()
        )
        return [{"district": row[0], "count": row[1]} for row in results]

    def get_recent_for_map(self, limit: int = 200) -> List[Complaint]:
        return (
            self.db.query(Complaint)
            .options(joinedload(Complaint.ai_analysis))
            .filter(Complaint.is_deleted == False)
            .order_by(desc(Complaint.created_at))
            .limit(limit)
            .all()
        )

    def get_fake_flagged(self) -> List[Complaint]:
        return (
            self.db.query(Complaint)
            .join(AIAnalysis)
            .filter(
                Complaint.is_deleted == False,
                AIAnalysis.fake_probability > 50.0,
            )
            .all()
        )

    def get_duplicate_flagged(self) -> List[Complaint]:
        return (
            self.db.query(Complaint)
            .join(AIAnalysis)
            .filter(
                Complaint.is_deleted == False,
                AIAnalysis.is_duplicate == True,
            )
            .all()
        )

    def get_map_locations(
        self,
        state: Optional[str] = None,
        district: Optional[str] = None,
        category: Optional[str] = None,
        severity: Optional[str] = None,
        status: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
    ) -> List[dict]:
        query = self.db.query(Complaint).filter(
            Complaint.is_deleted == False,
            Complaint.latitude.isnot(None),
            Complaint.longitude.isnot(None),
        )
        if state:
            query = query.filter(Complaint.district.ilike(f"%{state}%") | Complaint.address.ilike(f"%{state}%"))
        if district:
            query = query.filter(Complaint.district.ilike(f"%{district}%"))
        if category:
            query = query.filter(Complaint.crime_category.ilike(f"%{category}%"))
        if severity:
            query = query.filter(Complaint.priority.ilike(f"%{severity}%"))
        if status:
            query = query.filter(Complaint.status.ilike(f"%{status}%"))
        if date_from:
            query = query.filter(Complaint.created_at >= date_from)
        if date_to:
            query = query.filter(Complaint.created_at <= date_to)

        results = query.order_by(desc(Complaint.created_at)).all()
        locations = []
        for c in results:
            cat_val = c.crime_category.value if hasattr(c.crime_category, "value") else str(c.crime_category)
            prio_val = c.priority.value if hasattr(c.priority, "value") else str(c.priority)
            stat_val = c.status.value if hasattr(c.status, "value") else str(c.status)
            locations.append({
                "id": str(c.id),
                "complaint_id": c.complaint_id,
                "title": c.title,
                "category": cat_val,
                "priority": prio_val,
                "status": stat_val,
                "latitude": float(c.latitude),
                "longitude": float(c.longitude),
                "address": c.address or "",
                "district": c.district or "",
                "state": getattr(c, "state", None) or "Delhi",
                "pincode": c.pin_code or "110001",
                "created_at": c.created_at.isoformat() if c.created_at else None,
                "is_emergency": c.is_emergency,
            })
        return locations
