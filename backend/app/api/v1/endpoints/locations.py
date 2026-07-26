"""Police stations, patrol units, and districts endpoints."""
from typing import List

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.middleware.auth import get_optional_user, require_police, require_admin
from app.repositories.location_repository import LocationRepository
from app.schemas.location import (
    PatrolUnitOut, PatrolUnitUpdateRequest,
    PoliceStationCreateRequest, PoliceStationOut,
)
from app.schemas.common import SuccessResponse

router = APIRouter(tags=["Locations"])


@router.get(
    "/stations",
    summary="List all police stations",
)
def list_stations(
    db: Session = Depends(get_db),
) -> list:
    repo = LocationRepository(db)
    stations = repo.get_all_stations()
    return [
        {
            "id": str(s.id),
            "name": s.name,
            "code": s.code,
            "district": s.district,
            "address": s.address,
            "latitude": s.latitude,
            "longitude": s.longitude,
            "phone": s.phone,
            "inCharge": s.in_charge_name,
            "activeOfficers": s.active_officers,
            "activeCases": s.active_cases,
        }
        for s in stations
    ]


@router.get(
    "/patrol-units",
    summary="List all patrol units with GPS positions",
)
def list_patrol_units(
    db: Session = Depends(get_db),
) -> list:
    repo = LocationRepository(db)
    units = repo.get_all_patrol_units()
    return [
        {
            "id": str(u.id),
            "unitCode": u.unit_code,
            "type": u.unit_type,
            "status": u.status,
            "assignedCaseId": u.assigned_case_id,
            "latitude": u.latitude,
            "longitude": u.longitude,
            "batteryOrFuel": u.battery_or_fuel,
            "speedKmh": u.speed_kmh,
            "lastPing": u.last_ping_at or "Just now",
        }
        for u in units
    ]


@router.patch(
    "/patrol-units/{unit_id}",
    summary="Update patrol unit location/status (police only)",
    dependencies=[Depends(require_police)],
)
def update_patrol_unit(
    unit_id: str,
    payload: PatrolUnitUpdateRequest,
    db: Session = Depends(get_db),
) -> dict:
    import uuid
    from fastapi import HTTPException
    repo = LocationRepository(db)
    try:
        unit_uuid = uuid.UUID(unit_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid unit ID.")

    unit = repo.get_patrol_unit_by_id(unit_uuid)
    if not unit:
        raise HTTPException(status_code=404, detail="Patrol unit not found.")

    update_data = {k: v for k, v in payload.dict().items() if v is not None}
    repo.update_patrol_unit(unit, **update_data)
    db.commit()
    return {"success": True, "message": "Patrol unit updated."}


@router.post(
    "/stations",
    status_code=status.HTTP_201_CREATED,
    summary="Create a police station (admin only)",
    dependencies=[Depends(require_admin)],
)
def create_station(
    payload: PoliceStationCreateRequest,
    db: Session = Depends(get_db),
) -> dict:
    repo = LocationRepository(db)
    station = repo.create_station(
        name=payload.name,
        code=payload.code.upper(),
        district=payload.district,
        address=payload.address,
        latitude=payload.latitude,
        longitude=payload.longitude,
        phone=payload.phone,
        email=payload.email,
        in_charge_name=payload.in_charge_name,
        in_charge_badge=payload.in_charge_badge,
    )
    db.commit()
    return {
        "id": str(station.id),
        "name": station.name,
        "code": station.code,
        "district": station.district,
        "address": station.address,
        "latitude": station.latitude,
        "longitude": station.longitude,
        "phone": station.phone,
        "inCharge": station.in_charge_name,
        "activeOfficers": 0,
        "activeCases": 0,
    }


@router.get("/districts", summary="List all districts")
def list_districts(db: Session = Depends(get_db)) -> list:
    repo = LocationRepository(db)
    districts = repo.get_all_districts()
    return [
        {
            "id": str(d.id),
            "name": d.name,
            "code": d.code,
            "state": d.state,
            "riskScore": d.risk_score,
        }
        for d in districts
    ]
