"""Location repository for police stations and patrol units."""
import uuid
from typing import List, Optional

from sqlalchemy.orm import Session

from app.models.location import District, PatrolUnit, PoliceStation


class LocationRepository:
    def __init__(self, db: Session):
        self.db = db

    # ─── Police Stations ──────────────────────────────────────────────────────
    def get_all_stations(self, active_only: bool = True) -> List[PoliceStation]:
        query = self.db.query(PoliceStation)
        if active_only:
            query = query.filter(PoliceStation.is_active == True)
        return query.order_by(PoliceStation.name).all()

    def get_station_by_id(self, station_id: uuid.UUID) -> Optional[PoliceStation]:
        return (
            self.db.query(PoliceStation)
            .filter(PoliceStation.id == station_id)
            .first()
        )

    def get_station_by_code(self, code: str) -> Optional[PoliceStation]:
        return (
            self.db.query(PoliceStation)
            .filter(PoliceStation.code == code)
            .first()
        )

    def create_station(self, **kwargs) -> PoliceStation:
        station = PoliceStation(**kwargs)
        self.db.add(station)
        self.db.flush()
        return station

    def update_station_metrics(
        self,
        station_id: uuid.UUID,
        active_officers: Optional[int] = None,
        active_cases: Optional[int] = None,
    ) -> None:
        station = self.get_station_by_id(station_id)
        if station:
            if active_officers is not None:
                station.active_officers = active_officers
            if active_cases is not None:
                station.active_cases = active_cases
            self.db.flush()

    # ─── Patrol Units ─────────────────────────────────────────────────────────
    def get_all_patrol_units(self) -> List[PatrolUnit]:
        return self.db.query(PatrolUnit).order_by(PatrolUnit.unit_code).all()

    def get_patrol_unit_by_id(self, unit_id: uuid.UUID) -> Optional[PatrolUnit]:
        return self.db.query(PatrolUnit).filter(PatrolUnit.id == unit_id).first()

    def update_patrol_unit(self, unit: PatrolUnit, **kwargs) -> None:
        for key, value in kwargs.items():
            if hasattr(unit, key) and value is not None:
                setattr(unit, key, value)
        self.db.flush()

    # ─── Districts ────────────────────────────────────────────────────────────
    def get_all_districts(self) -> List[District]:
        return (
            self.db.query(District)
            .filter(District.is_active == True)
            .order_by(District.name)
            .all()
        )
