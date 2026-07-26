"""
Location-related models: PoliceStations, Districts, PatrolUnits.
"""
import uuid
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Float, ForeignKey, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import PatrolUnitStatus, PatrolUnitType

if TYPE_CHECKING:
    from app.models.user import PoliceProfile
    from app.models.complaint import Complaint


class District(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Administrative district."""
    __tablename__ = "districts"

    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    state: Mapped[str] = mapped_column(String(100), nullable=False)
    latitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    longitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    risk_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    population: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)

    stations: Mapped[List["PoliceStation"]] = relationship(
        "PoliceStation", back_populates="district_obj"
    )

    def __repr__(self) -> str:
        return f"<District name={self.name}>"


class PoliceStation(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Police station / precinct."""
    __tablename__ = "police_stations"

    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    code: Mapped[str] = mapped_column(String(30), unique=True, nullable=False, index=True)
    district: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    district_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("districts.id", ondelete="SET NULL"),
        nullable=True,
    )
    address: Mapped[str] = mapped_column(Text, nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    phone: Mapped[str] = mapped_column(String(30), nullable=False)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    in_charge_name: Mapped[str] = mapped_column(String(255), nullable=False)
    in_charge_badge: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # Live metrics (updated periodically)
    active_officers: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    active_cases: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False, index=True)

    # Relationships
    officers: Mapped[List["PoliceProfile"]] = relationship(
        "PoliceProfile", back_populates="station"
    )
    district_obj: Mapped[Optional["District"]] = relationship(
        "District", back_populates="stations"
    )
    patrol_units: Mapped[List["PatrolUnit"]] = relationship(
        "PatrolUnit", back_populates="station"
    )

    def __repr__(self) -> str:
        return f"<PoliceStation code={self.code} name={self.name}>"


class PatrolUnit(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Active patrol unit / vehicle with real-time GPS coordinates."""
    __tablename__ = "patrol_units"

    unit_code: Mapped[str] = mapped_column(String(30), unique=True, nullable=False, index=True)
    unit_type: Mapped[PatrolUnitType] = mapped_column(String(20), nullable=False)
    status: Mapped[PatrolUnitStatus] = mapped_column(
        String(30), nullable=False, default=PatrolUnitStatus.STANDBY, index=True
    )

    # Location (updated by GPS ping)
    latitude: Mapped[float] = mapped_column(Float, nullable=False, default=28.6139)
    longitude: Mapped[float] = mapped_column(Float, nullable=False, default=77.2090)
    speed_kmh: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    heading_degrees: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Vehicle metrics
    battery_or_fuel: Mapped[float] = mapped_column(Float, default=100.0, nullable=False)
    last_ping_at: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # Assignment
    assigned_case_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, index=True)
    station_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("police_stations.id", ondelete="SET NULL"),
        nullable=True,
    )
    assigned_officer_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Relationships
    station: Mapped[Optional["PoliceStation"]] = relationship(
        "PoliceStation", back_populates="patrol_units"
    )

    def __repr__(self) -> str:
        return f"<PatrolUnit code={self.unit_code} status={self.status}>"
