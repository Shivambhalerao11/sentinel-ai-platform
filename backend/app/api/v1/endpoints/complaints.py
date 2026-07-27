"""
Complaint endpoints.
POST   /complaints                    - Create complaint
GET    /complaints                    - List/search complaints
GET    /complaints/{id}               - Get single complaint
PUT    /complaints/{id}               - Update complaint (citizen, pending only)
DELETE /complaints/{id}               - Delete complaint
PATCH  /complaints/{id}/status        - Change status (police)
POST   /complaints/{id}/assign        - Assign officer (police)
POST   /complaints/{id}/notes         - Add officer note (police)
POST   /complaints/{id}/media         - Upload media file
POST   /emergency/sos                 - Create emergency SOS
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, Query, Request, UploadFile, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.middleware.auth import (
    AuthenticatedUser, get_current_user, get_optional_user,
    require_police,
)
from app.schemas.complaint import (
    AddOfficerNoteRequest, AssignOfficerRequest, ComplaintFilterParams,
    ComplaintOut, ComplaintStatusUpdateRequest, ComplaintUpdateRequest,
    SOSCreateRequest, ComplaintCreateRequest,
)
from app.schemas.common import SuccessResponse, make_paginated_response
from app.services.complaint_service import ComplaintService
from app.services.file_service import save_file
from app.repositories.complaint_repository import ComplaintRepository
from app.repositories.audit_repository import AuditRepository
from app.models.enums import AuditAction

router = APIRouter(tags=["Complaints"])


def _get_client_ip(request: Request) -> str:
    fwd = request.headers.get("X-Forwarded-For")
    return fwd.split(",")[0].strip() if fwd else (request.client.host if request.client else "unknown")


@router.post(
    "/complaints",
    response_model=dict,
    status_code=status.HTTP_201_CREATED,
    summary="Submit a new complaint",
)
def create_complaint(
    payload: ComplaintCreateRequest,
    request: Request,
    current_user: Optional[AuthenticatedUser] = Depends(get_optional_user),
    db: Session = Depends(get_db),
) -> dict:
    service = ComplaintService(db)
    user = current_user.user if current_user else None
    return service.create_complaint(payload, user)


@router.post(
    "/emergency/sos",
    response_model=dict,
    status_code=status.HTTP_201_CREATED,
    summary="Trigger Emergency SOS",
    description="Creates a CRITICAL priority complaint immediately.",
)
def create_sos(
    payload: SOSCreateRequest,
    request: Request,
    current_user: Optional[AuthenticatedUser] = Depends(get_optional_user),
    db: Session = Depends(get_db),
) -> dict:
    service = ComplaintService(db)
    user = current_user.user if current_user else None
    return service.create_sos(payload, user)


@router.get(
    "/complaints/map",
    summary="Get all complaint map locations across India",
    description="Returns anonymized complaint coordinates with filtering by state, district, category, severity, status, and date range.",
)
def get_complaint_map_locations(
    state: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    db: Session = Depends(get_db),
) -> list:
    service = ComplaintService(db)
    return service.get_map_locations(
        state=state,
        district=district,
        category=category,
        severity=severity,
        status=status_filter,
        date_from=date_from,
        date_to=date_to,
    )


@router.get(
    "/complaints",
    summary="List and search complaints",
    description="Filtered, paginated complaint list. Citizens see only their own complaints.",
)
def list_complaints(
    search: Optional[str] = Query(None, max_length=200),
    status_filter: Optional[str] = Query(None, alias="status"),
    priority: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    is_emergency: Optional[bool] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    current_user: Optional[AuthenticatedUser] = Depends(get_optional_user),
    db: Session = Depends(get_db),
) -> list:
    service = ComplaintService(db)
    params = ComplaintFilterParams(
        search=search,
        status=status_filter,
        priority=priority,
        category=category,
        district=district,
        is_emergency=is_emergency,
        date_from=date_from,
        date_to=date_to,
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_order=sort_order,
    )
    user = current_user.user if current_user else None
    complaints, total = service.get_complaints_list(params, user)

    # Return as flat list for backward compatibility with existing frontend
    return complaints


@router.get(
    "/complaints/{complaint_id}",
    summary="Get a single complaint by ID",
)
def get_complaint(
    complaint_id: str,
    current_user: Optional[AuthenticatedUser] = Depends(get_optional_user),
    db: Session = Depends(get_db),
) -> dict:
    service = ComplaintService(db)
    user = current_user.user if current_user else None
    return service.get_complaint(complaint_id, user)


@router.patch(
    "/complaints/{complaint_id}/status",
    summary="Update complaint status (police only)",
    dependencies=[Depends(require_police)],
)
def update_complaint_status(
    complaint_id: str,
    payload: ComplaintStatusUpdateRequest,
    current_user: AuthenticatedUser = Depends(require_police),
    db: Session = Depends(get_db),
) -> dict:
    service = ComplaintService(db)
    return service.update_complaint_status(complaint_id, payload, current_user.user)


@router.post(
    "/complaints/{complaint_id}/assign",
    summary="Assign officer to complaint (police only)",
    dependencies=[Depends(require_police)],
)
def assign_officer(
    complaint_id: str,
    payload: AssignOfficerRequest,
    current_user: AuthenticatedUser = Depends(require_police),
    db: Session = Depends(get_db),
) -> dict:
    service = ComplaintService(db)
    return service.assign_officer(complaint_id, payload, current_user.user)


@router.post(
    "/complaints/{complaint_id}/notes",
    summary="Add internal officer note (police only)",
    dependencies=[Depends(require_police)],
)
def add_officer_note(
    complaint_id: str,
    payload: AddOfficerNoteRequest,
    current_user: AuthenticatedUser = Depends(require_police),
    db: Session = Depends(get_db),
) -> dict:
    service = ComplaintService(db)
    return service.add_officer_note(complaint_id, payload, current_user.user)


@router.post(
    "/complaints/{complaint_id}/media",
    status_code=status.HTTP_201_CREATED,
    summary="Upload media evidence for a complaint",
)
async def upload_media(
    complaint_id: str,
    file: UploadFile = File(...),
    current_user: Optional[AuthenticatedUser] = Depends(get_optional_user),
    db: Session = Depends(get_db),
) -> dict:
    # Verify complaint exists
    complaint_repo = ComplaintRepository(db)
    complaint = complaint_repo.get_by_complaint_id(complaint_id)
    if not complaint:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Complaint not found.")

    # Save file
    file_meta = await save_file(file, complaint_id)

    # Store in DB
    uploaded_by = current_user.id if current_user else None
    complaint_repo.add_media(
        complaint_id=complaint.id,
        media_type=file_meta["media_type"],
        file_name=file_meta["file_name"],
        file_path=file_meta["file_path"],
        file_size_bytes=file_meta["file_size_bytes"],
        mime_type=file_meta["mime_type"],
        original_name=file_meta["original_name"],
        uploaded_by_id=uploaded_by,
    )

    if current_user:
        audit_repo = AuditRepository(db)
        audit_repo.log(
            action=AuditAction.EVIDENCE_UPLOADED,
            user_id=current_user.id,
            resource_type="complaint",
            resource_id=complaint_id,
            details=f"File uploaded: {file.filename}",
        )

    db.commit()
    return {"success": True, "message": "File uploaded successfully.", "data": file_meta}


@router.delete(
    "/complaints/{complaint_id}",
    response_model=SuccessResponse,
    summary="Delete a complaint",
)
def delete_complaint(
    complaint_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    service = ComplaintService(db)
    service.delete_complaint(complaint_id, current_user.user)
    return SuccessResponse(message=f"Complaint {complaint_id} deleted successfully.")
