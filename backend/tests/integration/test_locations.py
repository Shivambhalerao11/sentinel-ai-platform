"""Integration tests for location endpoints."""


class TestLocations:
    def test_get_stations_is_public(self, client):
        """Police stations are publicly accessible for map display."""
        response = client.get("/api/stations")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_get_patrol_units_is_public(self, client):
        response = client.get("/api/patrol-units")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_get_districts_is_public(self, client):
        response = client.get("/api/districts")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_create_station_requires_admin(self, client, citizen_headers):
        response = client.post("/api/stations", json={
            "name": "Test Station",
            "code": "TEST-01",
            "district": "Test District",
            "address": "Test Address",
            "latitude": 28.6271,
            "longitude": 77.2166,
            "phone": "+91 11 0000 0000",
            "in_charge_name": "Inspector Test",
        }, headers=citizen_headers)
        assert response.status_code == 403

    def test_create_station_by_admin(self, client, police_headers):
        response = client.post("/api/stations", json={
            "name": "New Test Precinct",
            "code": "NEW-TEST-99",
            "district": "Western District",
            "address": "123 Test Lane, West Delhi",
            "latitude": 28.6150,
            "longitude": 77.1500,
            "phone": "+91 11 9999 0000",
            "in_charge_name": "Inspector New Test",
        }, headers=police_headers)
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "New Test Precinct"
        assert data["code"] == "NEW-TEST-99"


class TestPatrolUnitUpdate:
    def test_update_patrol_unit_requires_police(self, client, citizen_headers):
        response = client.patch(
            "/api/patrol-units/some-uuid",
            json={"status": "PATROLLING"},
            headers=citizen_headers,
        )
        assert response.status_code == 403

    def test_update_patrol_unit_invalid_id(self, client, police_headers):
        response = client.patch(
            "/api/patrol-units/not-a-valid-uuid",
            json={"status": "PATROLLING"},
            headers=police_headers,
        )
        assert response.status_code == 400
