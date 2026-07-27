"""
Complaint service: full lifecycle management.
Creates, updates, assigns, resolves complaints + triggers AI pipeline.
"""
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.ai.complaint_analyzer import analyze_complaint
from app.core.logging import get_logger
from app.core.security import generate_complaint_id
from app.models.enums import (
    AuditAction, ComplaintStatus, CrimeCategory,
    NotificationType, PriorityLevel
)
from app.models.user import User
from app.repositories.audit_repository import AuditRepository
from app.repositories.complaint_repository import ComplaintRepository
from app.repositories.notification_repository import NotificationRepository
from app.repositories.user_repository import UserRepository
from app.schemas.complaint import (
    AddOfficerNoteRequest, AssignOfficerRequest,
    ComplaintCreateRequest, ComplaintFilterParams,
    ComplaintOut, ComplaintStatusUpdateRequest, SOSCreateRequest,
)

logger = get_logger(__name__)


def _serialize_complaint(c) -> Dict[str, Any]:
    """Convert a Complaint ORM object to the frontend-compatible dict format."""
    photos = []
    videos = []
    if c.media_files:
        for m in c.media_files:
            if m.media_type == "image":
                photos.append(m.file_path)
            elif m.media_type == "video":
                videos.append(m.file_path)

    ai = None
    if c.ai_analysis:
        a = c.ai_analysis
        ai = {
            "category": a.category,
            "severity": a.severity,
            "priority": a.priority,
            "fakeProbability": a.fake_probability,
            "fakeReasoning": a.fake_reasoning or "",
            "isDuplicate": a.is_duplicate,
            "matchedComplaintId": a.matched_complaint_id,
            "duplicateConfidence": a.duplicate_confidence,
            "nearestStation": a.nearest_station or "",
            "suggestedAction": a.suggested_action or "",
            "estimatedResponseTime": a.estimated_response_time or "",
            "confidenceScore": a.confidence_score,
            "hotspotZone": a.hotspot_zone or "",
            "recommendedOfficerSpecialty": a.recommended_officer_specialty or "",
            "ipcSections": a.ipc_sections or [],
        }

    timeline = []
    if c.timeline:
        for t in c.timeline:
            timeline.append({
                "id": str(t.id),
                "timestamp": t.created_at.strftime("%Y-%m-%d %H:%M:%S") if t.created_at else "",
                "status": t.status,
                "actor": t.actor_name,
                "message": t.message,
            })

    notes = []
    if c.officer_notes:
        for n in c.officer_notes:
            if not n.is_sensitive:
                notes.append({
                    "id": str(n.id),
                    "officerName": n.officer_name,
                    "badgeNumber": n.badge_number,
                    "timestamp": n.created_at.strftime("%Y-%m-%d %H:%M:%S") if n.created_at else "",
                    "note": n.note,
                })

    return {
        "id": c.complaint_id,
        "citizenName": c.citizen_name if not c.is_anonymous else "Anonymous Citizen",
        "citizenPhone": c.citizen_phone if not c.is_anonymous else "Hidden",
        "citizenEmail": c.citizen_email if not c.is_anonymous else "",
        "crimeCategory": c.crime_category,
        "title": c.title,
        "description": c.description,
        "latitude": c.latitude,
        "longitude": c.longitude,
        "address": c.address,
        "district": c.district,
        "photos": photos,
        "videos": videos,
        "isAnonymous": c.is_anonymous,
        "isEmergency": c.is_emergency,
        "status": c.status,
        "priority": c.priority,
        "assignedOfficerId": str(c.assigned_officer_id) if c.assigned_officer_id else None,
        "assignedOfficerName": c.assigned_officer_name,
        "assignedStationId": str(c.assigned_station_id) if c.assigned_station_id else None,
        "assignedStationName": c.assigned_station_name,
        "createdAt": c.created_at.isoformat() if c.created_at else "",
        "updatedAt": c.updated_at.isoformat() if c.updated_at else "",
        "timeline": timeline,
        "aiAnalysis": ai,
        "officerNotes": notes,
    }


class ComplaintService:
    def __init__(self, db: Session):
        self.db = db
        self.complaint_repo = ComplaintRepository(db)
        self.user_repo = UserRepository(db)
        self.audit_repo = AuditRepository(db)
        self.notif_repo = NotificationRepository(db)

    def create_complaint(
        self,
        payload: ComplaintCreateRequest,
        current_user: Optional[User],
    ) -> Dict[str, Any]:
        """
        Create a new complaint, run AI analysis, create timeline events,
        and send notifications. All within a single transaction.
        """
        # Determine citizen identity
        if current_user and current_user.role == "citizen":
            citizen_id = current_user.id
            citizen_name = current_user.full_name if not payload.is_anonymous else "Anonymous Citizen"
            citizen_phone = current_user.phone if not payload.is_anonymous else None
            citizen_email = current_user.email if not payload.is_anonymous else None
        else:
            citizen_id = None
            citizen_name = payload.citizen_name or "Anonymous Citizen"
            citizen_phone = payload.citizen_phone
            citizen_email = payload.citizen_email

        # Generate human-readable complaint ID
        complaint_id_str = generate_complaint_id()

        # Create complaint record
        complaint = self.complaint_repo.create(
            complaint_id=complaint_id_str,
            citizen_id=citizen_id,
            citizen_name=citizen_name,
            citizen_phone=citizen_phone or "",
            citizen_email=citizen_email or "",
            is_anonymous=payload.is_anonymous,
            crime_category=payload.crime_category,
            title=payload.title,
            description=payload.description,
            latitude=payload.latitude,
            longitude=payload.longitude,
            address=payload.address,
            district=payload.district,
            pin_code=payload.pin_code,
            is_emergency=payload.is_emergency,
            status=ComplaintStatus.PENDING,
            priority=PriorityLevel.ROUTINE,
            created_by=str(citizen_id) if citizen_id else "anonymous",
        )

        # Initial timeline event
        self.complaint_repo.add_timeline_event(
            complaint_id=complaint.id,
            status="Submitted",
            actor_name=citizen_name,
            actor_id=citizen_id,
            actor_role="citizen",
            message=f"Complaint filed via {'Emergency SOS' if payload.is_emergency else 'Sentinel Platform'}.",
        )

        # ─── AI Analysis ─────────────────────────────────────────────────────
        try:
            ai_result = analyze_complaint(
                title=payload.title,
                description=payload.description,
                category=payload.crime_category,
                lat=payload.latitude,
                lng=payload.longitude,
                is_emergency=payload.is_emergency,
            )

            # Update priority based on AI
            if ai_result.get("priority") == "CRITICAL":
                complaint.priority = PriorityLevel.CRITICAL
            elif ai_result.get("priority") == "HIGH":
                complaint.priority = PriorityLevel.HIGH

            # Store AI analysis
            self.complaint_repo.save_ai_analysis(
                complaint_id=complaint.id,
                analysis_data={
                    "category": ai_result.get("category", payload.crime_category),
                    "severity": ai_result.get("severity", "Medium"),
                    "priority": ai_result.get("priority", "ROUTINE"),
                    "fake_probability": ai_result.get("fake_probability", 5.0),
                    "fake_reasoning": ai_result.get("fake_reasoning", ""),
                    "is_duplicate": ai_result.get("is_duplicate", False),
                    "matched_complaint_id": ai_result.get("matched_complaint_id"),
                    "duplicate_confidence": ai_result.get("duplicate_confidence", 0.0),
                    "nearest_station": ai_result.get("nearest_station", ""),
                    "suggested_action": ai_result.get("suggested_action", ""),
                    "estimated_response_time": ai_result.get("estimated_response_time", ""),
                    "confidence_score": ai_result.get("confidence_score", 85.0),
                    "hotspot_zone": ai_result.get("hotspot_zone", ""),
                    "recommended_officer_specialty": ai_result.get("recommended_officer_specialty", ""),
                    "ipc_sections": ai_result.get("ipc_sections", []),
                    "ai_summary": ai_result.get("ai_summary", ""),
                    "model_used": ai_result.get("model_used", ""),
                    "processing_time_ms": ai_result.get("processing_time_ms", 0),
                },
            )

            # AI triage timeline event
            self.complaint_repo.add_timeline_event(
                complaint_id=complaint.id,
                status="AI Triage",
                actor_name="Sentinel AI Engine",
                message=(
                    f"AI classified {ai_result.get('severity', 'Medium')} severity. "
                    f"Fake probability: {ai_result.get('fake_probability', 0):.1f}%. "
                    f"Nearest station: {ai_result.get('nearest_station', 'N/A')}. "
                    f"Est. response: {ai_result.get('estimated_response_time', 'N/A')}."
                ),
            )

            self.audit_repo.log(
                action=AuditAction.AI_ANALYSIS_COMPLETED,
                user_id=citizen_id,
                resource_type="complaint",
                resource_id=complaint_id_str,
                details=f"AI analysis completed for {complaint_id_str}",
            )

        except Exception as e:
            logger.error("AI analysis failed", complaint_id=complaint_id_str, error=str(e))
            self.audit_repo.log(
                action=AuditAction.AI_ANALYSIS_FAILED,
                resource_type="complaint",
                resource_id=complaint_id_str,
                details=str(e),
            )

        # ─── Notifications ────────────────────────────────────────────────────
        # Notify citizen
        if citizen_id and not payload.is_anonymous:
            self.notif_repo.create(
                user_id=citizen_id,
                title="Complaint Received",
                message=f"Your complaint {complaint_id_str} has been received and is under AI review.",
                notification_type=NotificationType.STATUS_CHANGE,
                complaint_id=complaint_id_str,
            )

        self.audit_repo.log(
            action=AuditAction.COMPLAINT_CREATED,
            user_id=citizen_id,
            user_name=citizen_name,
            resource_type="complaint",
            resource_id=complaint_id_str,
            details=f"New complaint: {payload.title[:100]}",
        )

        self.db.commit()
        self.db.refresh(complaint)

        # Reload with all relationships for response
        full_complaint = self.complaint_repo.get_by_complaint_id(complaint_id_str)
        logger.info("Complaint created", complaint_id=complaint_id_str, priority=complaint.priority)
        return _serialize_complaint(full_complaint)

    def create_sos(
        self,
        payload: SOSCreateRequest,
        current_user: Optional[User],
    ) -> Dict[str, Any]:
        """Create a CRITICAL emergency SOS complaint."""
        citizen_name = "Anonymous Citizen"
        citizen_phone = payload.citizen_phone
        citizen_email = None
        citizen_id = None

        if current_user:
            citizen_id = current_user.id
            citizen_name = current_user.full_name
            citizen_phone = citizen_phone or current_user.phone
            citizen_email = current_user.email

        # Use citizen-provided info if available
        if payload.citizen_name:
            citizen_name = payload.citizen_name

        sos_payload = ComplaintCreateRequest(
            crime_category=CrimeCategory.OTHER,
            title=f"EMERGENCY SOS - {payload.emergency_type or 'Critical Threat'} - {citizen_name}",
            description=(
                f"EMERGENCY SOS signal received from {citizen_name}. "
                f"GPS: Lat {payload.latitude}, Lng {payload.longitude}. "
                f"Address: {payload.address or 'Location from GPS coordinates'}. "
                "IMMEDIATE RESPONSE REQUIRED."
            ),
            latitude=payload.latitude,
            longitude=payload.longitude,
            address=payload.address or f"GPS: {payload.latitude}, {payload.longitude}",
            district="Central District",
            is_emergency=True,
            is_anonymous=False,
            citizen_name=citizen_name,
            citizen_phone=citizen_phone,
            citizen_email=citizen_email,
        )

        return self.create_complaint(sos_payload, current_user)

    def get_complaint(
        self,
        complaint_id_str: str,
        current_user: Optional[User],
    ) -> Dict[str, Any]:
        """Get a single complaint by its human-readable ID."""
        complaint = self.complaint_repo.get_by_complaint_id(complaint_id_str)
        if not complaint:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Complaint {complaint_id_str} not found.",
            )

        # Citizens can only view their own complaints
        if (
            current_user
            and current_user.role == "citizen"
            and complaint.citizen_id != current_user.id
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to view this complaint.",
            )

        # Increment view count
        complaint.view_count = (complaint.view_count or 0) + 1
        self.db.commit()

        return _serialize_complaint(complaint)

    def get_complaints_list(
        self,
        params: ComplaintFilterParams,
        current_user: Optional[User],
    ) -> Tuple[List[Dict], int]:
        """Get paginated, filtered complaint list."""
        # Parse dates
        date_from = None
        date_to = None
        if params.date_from:
            from datetime import datetime
            date_from = datetime.fromisoformat(params.date_from)
        if params.date_to:
            from datetime import datetime
            date_to = datetime.fromisoformat(params.date_to)

        # Citizens only see their own complaints
        citizen_id = None
        if current_user and current_user.role == "citizen":
            citizen_id = current_user.id

        complaints, total = self.complaint_repo.get_list(
            search=params.search,
            status=params.status,
            priority=params.priority,
            category=params.category,
            district=params.district,
            is_emergency=params.is_emergency,
            date_from=date_from,
            date_to=date_to,
            citizen_id=citizen_id,
            page=params.page,
            page_size=params.page_size,
            sort_by=params.sort_by,
            sort_order=params.sort_order,
        )

        return [_serialize_complaint(c) for c in complaints], total

    def update_complaint_status(
        self,
        complaint_id_str: str,
        payload: ComplaintStatusUpdateRequest,
        officer: User,
    ) -> Dict[str, Any]:
        """Change complaint status (police only)."""
        complaint = self.complaint_repo.get_by_complaint_id(complaint_id_str)
        if not complaint:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found.")

        old_status = complaint.status
        reason = payload.rejection_reason or payload.resolution_notes or payload.note

        self.complaint_repo.update_status(
            complaint=complaint,
            new_status=payload.status,
            changed_by_id=officer.id,
            reason=reason,
        )

        # Timeline event
        status_messages = {
            ComplaintStatus.RESOLVED: "Complaint marked as resolved.",
            ComplaintStatus.REJECTED: f"Complaint rejected. Reason: {reason or 'N/A'}",
            ComplaintStatus.UNDER_REVIEW: "Complaint is under police review.",
            ComplaintStatus.IN_PROGRESS: "Investigation is in progress.",
            ComplaintStatus.FORWARDED: "Complaint forwarded to specialized unit.",
        }
        message = status_messages.get(
            payload.status,
            f"Status changed from {old_status} to {payload.status}.",
        )

        officer_name = f"{officer.full_name}"
        if officer.police_profile:
            officer_name += f" ({officer.police_profile.badge_number})"

        self.complaint_repo.add_timeline_event(
            complaint_id=complaint.id,
            status=payload.status,
            actor_id=officer.id,
            actor_name=officer_name,
            actor_role=officer.role,
            message=message,
        )

        # Notify citizen
        if complaint.citizen_id:
            notif_messages = {
                ComplaintStatus.RESOLVED: f"Your complaint {complaint_id_str} has been resolved.",
                ComplaintStatus.REJECTED: f"Your complaint {complaint_id_str} has been reviewed.",
                ComplaintStatus.ASSIGNED: f"Your complaint {complaint_id_str} has been assigned to an officer.",
                ComplaintStatus.IN_PROGRESS: f"Your complaint {complaint_id_str} is being actively investigated.",
            }
            notif_message = notif_messages.get(
                payload.status,
                f"Your complaint {complaint_id_str} status has been updated to {payload.status}.",
            )
            self.notif_repo.create(
                user_id=complaint.citizen_id,
                title="Complaint Status Updated",
                message=notif_message,
                notification_type=NotificationType.STATUS_CHANGE,
                complaint_id=complaint_id_str,
            )

        self.audit_repo.log(
            action=AuditAction.COMPLAINT_STATUS_CHANGED,
            user_id=officer.id,
            user_name=officer.full_name,
            user_role=officer.role,
            resource_type="complaint",
            resource_id=complaint_id_str,
            details=f"Status: {old_status} → {payload.status}",
        )

        self.db.commit()
        return _serialize_complaint(self.complaint_repo.get_by_complaint_id(complaint_id_str))

    def assign_officer(
        self,
        complaint_id_str: str,
        payload: AssignOfficerRequest,
        assigning_officer: User,
    ) -> Dict[str, Any]:
        """Assign a complaint to an officer."""
        complaint = self.complaint_repo.get_by_complaint_id(complaint_id_str)
        if not complaint:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found.")

        try:
            officer_uuid = uuid.UUID(payload.officer_id)
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid officer ID.")

        officer = self.user_repo.get_by_id(officer_uuid)
        if not officer or officer.role not in ("police_officer", "police_admin"):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Officer not found.")

        station_uuid = None
        station_name = None
        if payload.station_id:
            try:
                station_uuid = uuid.UUID(payload.station_id)
                if officer.police_profile and officer.police_profile.station:
                    station_name = officer.police_profile.station.name
            except ValueError:
                pass

        self.complaint_repo.assign_officer(
            complaint=complaint,
            officer_id=officer_uuid,
            officer_name=officer.full_name,
            station_id=station_uuid,
            station_name=station_name,
        )

        badge = ""
        if officer.police_profile:
            badge = officer.police_profile.badge_number

        self.complaint_repo.add_timeline_event(
            complaint_id=complaint.id,
            status="Assigned",
            actor_id=assigning_officer.id,
            actor_name=assigning_officer.full_name,
            actor_role=assigning_officer.role,
            message=f"Assigned to {officer.full_name} ({badge}). {payload.note or ''}",
        )

        # Notify assigned officer
        self.notif_repo.create(
            user_id=officer.id,
            title="New Case Assignment",
            message=f"You have been assigned to complaint {complaint_id_str}: {complaint.title[:80]}",
            notification_type=NotificationType.ASSIGNMENT,
            complaint_id=complaint_id_str,
        )

        # Notify citizen
        if complaint.citizen_id:
            self.notif_repo.create(
                user_id=complaint.citizen_id,
                title="Officer Assigned",
                message=f"An officer has been assigned to your complaint {complaint_id_str}.",
                notification_type=NotificationType.ASSIGNMENT,
                complaint_id=complaint_id_str,
            )

        self.audit_repo.log(
            action=AuditAction.COMPLAINT_ASSIGNED,
            user_id=assigning_officer.id,
            user_name=assigning_officer.full_name,
            resource_type="complaint",
            resource_id=complaint_id_str,
            details=f"Assigned to officer: {badge}",
        )

        self.db.commit()
        return _serialize_complaint(self.complaint_repo.get_by_complaint_id(complaint_id_str))

    def add_officer_note(
        self,
        complaint_id_str: str,
        payload: AddOfficerNoteRequest,
        officer: User,
    ) -> Dict[str, Any]:
        """Add an internal note to a complaint."""
        complaint = self.complaint_repo.get_by_complaint_id(complaint_id_str)
        if not complaint:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found.")

        badge = ""
        if officer.police_profile:
            badge = officer.police_profile.badge_number

        self.complaint_repo.add_officer_note(
            complaint_id=complaint.id,
            officer_id=officer.id,
            officer_name=officer.full_name,
            badge_number=badge,
            note=payload.note,
            is_sensitive=payload.is_sensitive,
        )

        self.audit_repo.log(
            action=AuditAction.NOTE_ADDED,
            user_id=officer.id,
            user_name=officer.full_name,
            resource_type="complaint",
            resource_id=complaint_id_str,
        )

        self.db.commit()
        return _serialize_complaint(self.complaint_repo.get_by_complaint_id(complaint_id_str))

    def delete_complaint(
        self,
        complaint_id_str: str,
        current_user: User,
    ) -> None:
        """Soft delete a complaint. Citizens can only delete PENDING own complaints."""
        complaint = self.complaint_repo.get_by_complaint_id(complaint_id_str)
        if not complaint:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found.")

        if current_user.role == "citizen":
            if complaint.citizen_id != current_user.id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized.")
            if complaint.status != ComplaintStatus.PENDING:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Only pending complaints can be deleted.",
                )

        self.complaint_repo.soft_delete(complaint)
        self.audit_repo.log(
            action=AuditAction.COMPLAINT_DELETED,
            user_id=current_user.id,
            user_name=current_user.full_name,
            resource_type="complaint",
            resource_id=complaint_id_str,
        )
        self.db.commit()

    def get_map_locations(
        self,
        state: Optional[str] = None,
        district: Optional[str] = None,
        category: Optional[str] = None,
        severity: Optional[str] = None,
        status: Optional[str] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
    ) -> List[dict]:
        from datetime import datetime
        df_dt = datetime.fromisoformat(date_from) if date_from else None
        dt_dt = datetime.fromisoformat(date_to) if date_to else None
        return self.complaint_repo.get_map_locations(
            state=state,
            district=district,
            category=category,
            severity=severity,
            status=status,
            date_from=df_dt,
            date_to=dt_dt,
        )
