"""Location schemas for police stations, patrol units, districts."""
from typing import Optional
from pydantic import BaseModel, Field


class PoliceStationOut(BaseModel):
    """Matches frontend PoliceStation type."""
    id: str
    name: str
    code: str
    district: str
    address: str
    latitude: float
    longitude: float
    phone: str
    inCharge: str
    activeOfficers: int
    activeCases: int

    class Config:
        from_attributes = True


class PatrolUnitOut(BaseModel):
    """Matches frontend PatrolUnit type."""
    id: str
    unitCode: str
    type: str
    status: str
    assignedCaseId: Optional[str]
    latitude: float
    longitude: float
    batteryOrFuel: float
    speedKmh: float
    lastPing: str

    class Config:
        from_attributes = True


class PatrolUnitUpdateRequest(BaseModel):
    """Update patrol unit GPS and status."""
    latitude: Optional[float] = Field(None, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(None, ge=-180.0, le=180.0)
    status: Optional[str] = None
    speed_kmh: Optional[float] = Field(None, ge=0.0, le=300.0)
    battery_or_fuel: Optional[float] = Field(None, ge=0.0, le=100.0)
    assigned_case_id: Optional[str] = None


class PoliceStationCreateRequest(BaseModel):
    name: str = Field(..., min_length=3, max_length=200)
    code: str = Field(..., min_length=3, max_length=30)
    district: str = Field(..., min_length=2, max_length=100)
    address: str = Field(..., min_length=5)
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    phone: str = Field(..., min_length=6, max_length=30)
    in_charge_name: str = Field(..., min_length=2, max_length=255)
    in_charge_badge: Optional[str] = None
    email: Optional[str] = None
