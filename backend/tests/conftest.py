"""
Pytest configuration and shared fixtures.
Uses a separate in-memory SQLite database for tests so no Postgres is needed.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_db
from app.main import app

# ─── Test Database Setup ──────────────────────────────────────────────────────
TEST_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

# Enable SQLite foreign keys
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session", autouse=True)
def create_tables():
    """Create all tables once for the test session."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db():
    """
    Provide a transactional database session for each test.
    Rolls back all changes after each test to keep tests isolated.
    """
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(db):
    """FastAPI test client with database dependency overridden."""
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


# ─── Test Data Factories ──────────────────────────────────────────────────────
@pytest.fixture
def citizen_user(db):
    """Create a test citizen user."""
    from app.core.security import hash_password
    from app.models.enums import AccountStatus, UserRole
    from app.models.user import CitizenProfile, User

    user = User(
        email="test.citizen@example.com",
        phone="+919876543210",
        hashed_password=hash_password("TestPass@123"),
        full_name="Test Citizen",
        role=UserRole.CITIZEN,
        account_status=AccountStatus.ACTIVE,
        email_verified=True,
        phone_verified=True,
    )
    db.add(user)
    db.flush()

    profile = CitizenProfile(
        user_id=user.id,
        city="New Delhi",
        state="Delhi",
    )
    db.add(profile)
    db.flush()
    return user


@pytest.fixture
def police_admin_user(db):
    """Create a test police admin user."""
    from app.core.security import hash_password
    from app.models.enums import AccountStatus, UserRole
    from app.models.user import PoliceProfile, User

    user = User(
        email="test.officer@police.gov.in",
        phone="+919810011001",
        hashed_password=hash_password("OfficerPass@123"),
        full_name="Inspector Test Officer",
        role=UserRole.POLICE_ADMIN,
        account_status=AccountStatus.ACTIVE,
        email_verified=True,
        phone_verified=True,
    )
    db.add(user)
    db.flush()

    profile = PoliceProfile(
        user_id=user.id,
        badge_number="TEST-POL-0001",
        employee_id="TEST-EMP-0001",
        rank="Inspector",
        department="Test Department",
    )
    db.add(profile)
    db.flush()
    return user


@pytest.fixture
def citizen_token(client, citizen_user):
    """Get JWT access token for citizen user."""
    response = client.post("/api/auth/login/citizen", json={
        "identifier": "test.citizen@example.com",
        "password": "TestPass@123",
    })
    assert response.status_code == 200
    return response.json()["tokens"]["access_token"]


@pytest.fixture
def police_token(client, police_admin_user):
    """Get JWT access token for police admin user."""
    response = client.post("/api/auth/login/police", json={
        "identifier": "TEST-POL-0001",
        "password": "OfficerPass@123",
    })
    assert response.status_code == 200
    return response.json()["tokens"]["access_token"]


@pytest.fixture
def police_headers(police_token):
    return {"Authorization": f"Bearer {police_token}"}


@pytest.fixture
def citizen_headers(citizen_token):
    return {"Authorization": f"Bearer {citizen_token}"}
