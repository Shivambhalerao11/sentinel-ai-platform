"""Officer management endpoints."""
from typing import List, Optional

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.middleware.auth import AuthenticatedUser, require_admin, require_police
from app.repositories.user_repository import UserRepository
from app.schemas.auth import PoliceRegisterRequest
from app.services.auth_service import AuthService, _build_user_out

router = APIRouter(prefix="/admin/users", tags=["Officer Management"])


@router.get(
    "",
    summary="List all police officers (admin only)",
    dependencies=[Depends(require_police)],
)
def list_officers(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
) -> list:
    repo = UserRepository(db)
    users, total = repo.get_all_officers(page=page, page_size=page_size)
    return [
        {
            "id": str(u.id),
            "name": u.full_name,
            "full_name": u.full_name,
            "email": u.email,
            "phone": u.phone or "",
            "role": u.role,
            "badgeNumber": u.police_profile.badge_number if u.police_profile else "",
            "badge_number": u.police_profile.badge_number if u.police_profile else "",
            "employeeId": u.police_profile.employee_id if u.police_profile else "",
            "employee_id": u.police_profile.employee_id if u.police_profile else "",
            "rank": u.police_profile.rank if u.police_profile else "",
            "department": u.police_profile.department if u.police_profile else "",
            "specialty": u.police_profile.specialty if u.police_profile else "",
            "precinct": u.police_profile.precinct if u.police_profile else "",
            "stationId": str(u.police_profile.station_id) if u.police_profile and u.police_profile.station_id else None,
            "station_id": str(u.police_profile.station_id) if u.police_profile and u.police_profile.station_id else None,
            "stationName": u.police_profile.station.name if u.police_profile and u.police_profile.station else None,
            "station_name": u.police_profile.station.name if u.police_profile and u.police_profile.station else None,
            "accountStatus": u.account_status,
            "account_status": u.account_status,
            "resolvedCount": u.police_profile.total_cases_resolved if u.police_profile else 0,
            "activeCount": u.police_profile.total_cases_assigned if u.police_profile else 0,
        }
        for u in users
    ]


@router.post(
    "",
    status_code=201,
    summary="Create a new police officer account (admin only)",
)
def create_officer(
    payload: PoliceRegisterRequest,
    request: Request,
    current_user: AuthenticatedUser = Depends(require_admin),
    db: Session = Depends(get_db),
) -> dict:
    """
    Create a police officer account.
    Only callable by authenticated police admins.
    Maps frontend POST /admin/users → backend officer creation logic.
    """
    service = AuthService(db)
    user_out = service.create_police_account(payload, current_user.user, request)
    # Return in a shape the frontend's createOfficerAccount() expects
    return {
        "message": "Officer account created successfully.",
        "user": user_out.model_dump(),
    }
