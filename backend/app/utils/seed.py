"""
Database seeder: populates initial data for development and demo purposes.
Run via: python -m app.utils.seed
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core.logging import get_logger
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.enums import (
    AccountStatus, ComplaintStatus, CrimeCategory,
    PatrolUnitStatus, PatrolUnitType, PriorityLevel, UserRole
)
from app.models.location import District, PatrolUnit, PoliceStation
from app.models.user import PoliceProfile, User, CitizenProfile

logger = get_logger(__name__)


def seed_districts(db: Session) -> None:
    districts = [
        {"name": "Central District", "code": "DEL-C", "state": "Delhi"},
        {"name": "Northern District", "code": "DEL-N", "state": "Delhi"},
        {"name": "Southern District", "code": "DEL-S", "state": "Delhi"},
        {"name": "Eastern District", "code": "DEL-E", "state": "Delhi"},
        {"name": "Western District", "code": "DEL-W", "state": "Delhi"},
        {"name": "Special Operations", "code": "DEL-SO", "state": "Delhi"},
    ]
    for d in districts:
        existing = db.query(District).filter(District.code == d["code"]).first()
        if not existing:
            db.add(District(**d))
    db.flush()
    logger.info("Districts seeded")


def seed_stations(db: Session) -> list:
    stations_data = [
        {
            "name": "Precinct 01 - HQ Command",
            "code": "DEL-HQ-01",
            "district": "Central District",
            "address": "Parliament Street, Connaught Place, New Delhi",
            "latitude": 28.6271,
            "longitude": 77.2166,
            "phone": "+91 11 2334 0000",
            "in_charge_name": "ACP Inspector R. K. Sharma",
            "active_officers": 42,
            "active_cases": 18,
        },
        {
            "name": "Northern Sector Police Station",
            "code": "DEL-N-02",
            "district": "Northern District",
            "address": "Civil Lines, Near Delhi University, New Delhi",
            "latitude": 28.6814,
            "longitude": 77.2226,
            "phone": "+91 11 2381 1234",
            "in_charge_name": "Inspector Vikramaditya Singh",
            "active_officers": 28,
            "active_cases": 14,
        },
        {
            "name": "South Extension Precinct",
            "code": "DEL-S-03",
            "district": "Southern District",
            "address": "Ring Road, South Ext Part 2, New Delhi",
            "latitude": 28.5684,
            "longitude": 77.2215,
            "phone": "+91 11 2462 8888",
            "in_charge_name": "Sub-Inspector Ananya Deshmukh",
            "active_officers": 35,
            "active_cases": 22,
        },
        {
            "name": "Cyber Crime Cell HQ",
            "code": "DEL-CYBER-04",
            "district": "Special Operations",
            "address": "CGO Complex, Lodhi Road, New Delhi",
            "latitude": 28.5892,
            "longitude": 77.2370,
            "phone": "+91 11 2436 9900",
            "in_charge_name": "DCP Technical Ops A. K. Varma",
            "active_officers": 19,
            "active_cases": 31,
        },
        {
            "name": "East River Precinct",
            "code": "DEL-E-05",
            "district": "Eastern District",
            "address": "Laxmi Nagar Main Road, New Delhi",
            "latitude": 28.6304,
            "longitude": 77.2777,
            "phone": "+91 11 2250 4455",
            "in_charge_name": "Inspector Suresh Patil",
            "active_officers": 24,
            "active_cases": 12,
        },
    ]
    stations = []
    for s in stations_data:
        existing = db.query(PoliceStation).filter(PoliceStation.code == s["code"]).first()
        if not existing:
            station = PoliceStation(**s)
            db.add(station)
            db.flush()
            stations.append(station)
        else:
            stations.append(existing)
    logger.info("Police stations seeded")
    return stations


def seed_patrol_units(db: Session, stations: list) -> None:
    units_data = [
        {"unit_code": "PT-09", "unit_type": PatrolUnitType.PATROL, "status": PatrolUnitStatus.EN_ROUTE, "assigned_case_id": "CASE-2026-00001", "latitude": 28.6139, "longitude": 77.2090, "battery_or_fuel": 88.0, "speed_kmh": 42.0},
        {"unit_code": "PT-12", "unit_type": PatrolUnitType.PATROL, "status": PatrolUnitStatus.EN_ROUTE, "assigned_case_id": "CASE-2026-00001", "latitude": 28.6152, "longitude": 77.2115, "battery_or_fuel": 94.0, "speed_kmh": 48.0},
        {"unit_code": "SWAT-2", "unit_type": PatrolUnitType.SWAT, "status": PatrolUnitStatus.STANDBY, "latitude": 28.6271, "longitude": 77.2166, "battery_or_fuel": 100.0, "speed_kmh": 0.0},
        {"unit_code": "TR-04", "unit_type": PatrolUnitType.TRAFFIC, "status": PatrolUnitStatus.ON_SCENE, "assigned_case_id": "CASE-2026-00002", "latitude": 28.6320, "longitude": 77.2200, "battery_or_fuel": 76.0, "speed_kmh": 12.0},
        {"unit_code": "K9-1", "unit_type": PatrolUnitType.K9, "status": PatrolUnitStatus.PATROLLING, "latitude": 28.6750, "longitude": 77.2180, "battery_or_fuel": 82.0, "speed_kmh": 24.0},
    ]
    for u in units_data:
        existing = db.query(PatrolUnit).filter(PatrolUnit.unit_code == u["unit_code"]).first()
        if not existing:
            unit = PatrolUnit(
                last_ping_at="Just now",
                station_id=stations[0].id if stations else None,
                **u,
            )
            db.add(unit)
    db.flush()
    logger.info("Patrol units seeded")


def seed_users(db: Session, stations: list) -> list:
    """Create demo police and citizen accounts."""
    users_data = [
        {
            "email": "c.sterling@delhipolice.gov.in",
            "phone": "+919810011223",
            "full_name": "Inspector C. Sterling",
            "password": "Admin@12345",
            "role": UserRole.POLICE_ADMIN,
            "badge": "IND-POL-8841",
            "employee_id": "IND-POL-8841",
            "rank": "Inspector Level 4",
            "department": "Crime Branch & AI Intelligence Unit",
            "specialty": "Tactical Response & Command",
            "precinct": "Precinct 01 - HQ Command",
            "station_idx": 0,
        },
        {
            "email": "rk.sharma@delhipolice.gov.in",
            "phone": "+919811122334",
            "full_name": "ACP R. K. Sharma",
            "password": "Admin@12345",
            "role": UserRole.POLICE_ADMIN,
            "badge": "IND-POL-1002",
            "employee_id": "IND-POL-1002",
            "rank": "Assistant Commissioner of Police",
            "department": "Special Operations",
            "specialty": "Law Enforcement Management",
            "precinct": "Precinct 01 - HQ Command",
            "station_idx": 0,
        },
        {
            "email": "priya.sharma@delhipolice.gov.in",
            "phone": "+919812345678",
            "full_name": "Sub-Inspector Priya Sharma",
            "password": "Officer@12345",
            "role": UserRole.POLICE_OFFICER,
            "badge": "IND-POL-9023",
            "employee_id": "IND-POL-9023",
            "rank": "Sub-Inspector",
            "department": "Cyber Crime Cell",
            "specialty": "Cyber Fraud & OSINT",
            "precinct": "Cyber Crime Cell HQ",
            "station_idx": 3,
        },
        {
            "email": "rahul.k@example.com",
            "phone": "+919876543210",
            "full_name": "Rahul Kapoor",
            "password": "Citizen@12345",
            "role": UserRole.CITIZEN,
            "city": "New Delhi",
            "state": "Delhi",
        },
        {
            "email": "priya.citizen@example.com",
            "phone": "+919812345679",
            "full_name": "Priya Singh",
            "password": "Citizen@12345",
            "role": UserRole.CITIZEN,
            "city": "New Delhi",
            "state": "Delhi",
        },
    ]

    created_users = []
    for u in users_data:
        existing = db.query(User).filter(User.email == u["email"]).first()
        if existing:
            created_users.append(existing)
            continue

        user = User(
            email=u["email"],
            phone=u["phone"],
            hashed_password=hash_password(u["password"]),
            full_name=u["full_name"],
            role=u["role"],
            account_status=AccountStatus.ACTIVE,
            email_verified=True,
            phone_verified=True,
        )
        db.add(user)
        db.flush()

        if u["role"] in (UserRole.POLICE_ADMIN, UserRole.POLICE_OFFICER):
            station_id = stations[u.get("station_idx", 0)].id if stations else None
            profile = PoliceProfile(
                user_id=user.id,
                badge_number=u["badge"],
                employee_id=u["employee_id"],
                rank=u["rank"],
                department=u.get("department"),
                specialty=u.get("specialty"),
                station_id=station_id,
                precinct=u.get("precinct"),
            )
            db.add(profile)
        else:
            profile = CitizenProfile(
                user_id=user.id,
                city=u.get("city"),
                state=u.get("state"),
            )
            db.add(profile)

        db.flush()
        created_users.append(user)
        logger.info("User seeded", email=u["email"], role=u["role"])

    return created_users


def run_seed() -> None:
    """Run all seed operations. Safe to call multiple times — all inserts are idempotent."""
    db = SessionLocal()
    try:
        # Quick sanity check: if the users table doesn't exist yet, skip seeding.
        # This can happen if migrations haven't run yet (e.g., first boot race condition).
        from sqlalchemy import inspect
        inspector = inspect(db.bind)
        if "users" not in inspector.get_table_names():
            logger.warning("Seed skipped: 'users' table does not exist yet. Run alembic upgrade head first.")
            return

        logger.info("Starting database seed...")
        seed_districts(db)
        stations = seed_stations(db)
        seed_patrol_units(db, stations)
        seed_users(db, stations)
        db.commit()
        logger.info("Database seed completed successfully")
    except Exception as e:
        db.rollback()
        logger.error("Seed failed", error=str(e))
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run_seed()
