"""Integration tests for complaint endpoints."""
import pytest
from unittest.mock import patch


SAMPLE_COMPLAINT = {
    "crime_category": "Cybercrime",
    "title": "Phishing email received claiming to be SBI Bank",
    "description": "I received a suspicious email asking for my net banking credentials. The email looks fake with wrong grammar.",
    "latitude": 28.6271,
    "longitude": 77.2166,
    "address": "15 Parliament Street, Central Delhi",
    "district": "Central District",
    "is_anonymous": False,
    "is_emergency": False,
}

SOS_PAYLOAD = {
    "latitude": 28.6139,
    "longitude": 77.2090,
    "citizen_name": "Test Citizen",
    "citizen_phone": "+919876543210",
    "address": "Near CP Metro Station",
    "emergency_type": "Violence",
}


class TestComplaintCreation:
    def test_citizen_can_create_complaint(self, client, citizen_headers):
        with patch("app.services.complaint_service.analyze_complaint") as mock_ai:
            mock_ai.return_value = {
                "category": "Cybercrime", "severity": "Medium",
                "priority": "HIGH", "fake_probability": 3.0,
                "fake_reasoning": "Looks legitimate", "is_duplicate": False,
                "duplicate_confidence": 0.0, "nearest_station": "Cyber Crime Cell HQ",
                "suggested_action": "Assign cyber officer", "estimated_response_time": "10m 00s",
                "confidence_score": 91.0, "hotspot_zone": "Digital",
                "recommended_officer_specialty": "Cyber Fraud & OSINT",
                "ipc_sections": ["BNS 318"], "ai_summary": "Phishing attempt.",
                "model_used": "test", "processing_time_ms": 100,
            }
            response = client.post("/api/complaints", json=SAMPLE_COMPLAINT, headers=citizen_headers)

        assert response.status_code == 201
        data = response.json()
        assert data["crimeCategory"] == "Cybercrime"
        assert data["status"] == "Pending"
        assert "id" in data
        assert data["id"].startswith("CASE-")

    def test_anonymous_can_create_complaint(self, client):
        with patch("app.services.complaint_service.analyze_complaint") as mock_ai:
            mock_ai.return_value = {
                "category": "Other", "severity": "Low", "priority": "ROUTINE",
                "fake_probability": 5.0, "fake_reasoning": "", "is_duplicate": False,
                "duplicate_confidence": 0.0, "nearest_station": "Precinct 01",
                "suggested_action": "", "estimated_response_time": "10m", "confidence_score": 80.0,
                "hotspot_zone": "", "recommended_officer_specialty": "", "ipc_sections": [],
                "ai_summary": "", "model_used": "heuristic", "processing_time_ms": 50,
            }
            response = client.post("/api/complaints", json={
                **SAMPLE_COMPLAINT,
                "is_anonymous": True,
                "citizen_name": "Anonymous",
            })
        assert response.status_code == 201

    def test_complaint_gets_complaint_id(self, client, citizen_headers):
        with patch("app.services.complaint_service.analyze_complaint") as mock_ai:
            mock_ai.return_value = {
                "category": "Other", "severity": "Low", "priority": "ROUTINE",
                "fake_probability": 5.0, "fake_reasoning": "", "is_duplicate": False,
                "duplicate_confidence": 0.0, "nearest_station": "Precinct 01",
                "suggested_action": "", "estimated_response_time": "8m", "confidence_score": 85.0,
                "hotspot_zone": "", "recommended_officer_specialty": "", "ipc_sections": [],
                "ai_summary": "", "model_used": "test", "processing_time_ms": 100,
            }
            response = client.post("/api/complaints", json=SAMPLE_COMPLAINT, headers=citizen_headers)
        data = response.json()
        assert data["id"].startswith("CASE-2")

    def test_complaint_gets_ai_analysis(self, client, citizen_headers):
        with patch("app.services.complaint_service.analyze_complaint") as mock_ai:
            mock_ai.return_value = {
                "category": "Cybercrime", "severity": "High", "priority": "HIGH",
                "fake_probability": 3.0, "fake_reasoning": "Legit", "is_duplicate": False,
                "duplicate_confidence": 0.0, "nearest_station": "Cyber Crime Cell HQ",
                "suggested_action": "Assign cyber team", "estimated_response_time": "10m",
                "confidence_score": 93.0, "hotspot_zone": "Digital Network",
                "recommended_officer_specialty": "Cyber Fraud", "ipc_sections": ["BNS 318"],
                "ai_summary": "AI summary here.", "model_used": "gemini", "processing_time_ms": 200,
            }
            response = client.post("/api/complaints", json=SAMPLE_COMPLAINT, headers=citizen_headers)
        data = response.json()
        assert data["aiAnalysis"] is not None
        assert data["aiAnalysis"]["priority"] == "HIGH"

    def test_complaint_creates_timeline(self, client, citizen_headers):
        with patch("app.services.complaint_service.analyze_complaint") as mock_ai:
            mock_ai.return_value = {
                "category": "Other", "severity": "Low", "priority": "ROUTINE",
                "fake_probability": 5.0, "fake_reasoning": "", "is_duplicate": False,
                "duplicate_confidence": 0.0, "nearest_station": "Precinct 01",
                "suggested_action": "", "estimated_response_time": "8m", "confidence_score": 85.0,
                "hotspot_zone": "", "recommended_officer_specialty": "", "ipc_sections": [],
                "ai_summary": "", "model_used": "test", "processing_time_ms": 100,
            }
            response = client.post("/api/complaints", json=SAMPLE_COMPLAINT, headers=citizen_headers)
        data = response.json()
        assert len(data["timeline"]) >= 1
        assert data["timeline"][0]["status"] == "Submitted"

    def test_invalid_category_rejected(self, client, citizen_headers):
        response = client.post("/api/complaints", json={
            **SAMPLE_COMPLAINT,
            "crime_category": "INVALID_CATEGORY",
        }, headers=citizen_headers)
        assert response.status_code == 422

    def test_too_short_description_rejected(self, client, citizen_headers):
        response = client.post("/api/complaints", json={
            **SAMPLE_COMPLAINT,
            "description": "Short",  # Min 20 chars
        }, headers=citizen_headers)
        assert response.status_code == 422


class TestEmergencySOS:
    def test_sos_creates_critical_complaint(self, client, citizen_headers):
        with patch("app.services.complaint_service.analyze_complaint") as mock_ai:
            mock_ai.return_value = {
                "category": "Other", "severity": "Critical", "priority": "CRITICAL",
                "fake_probability": 0.5, "fake_reasoning": "", "is_duplicate": False,
                "duplicate_confidence": 0.0, "nearest_station": "Precinct 01 - HQ Command",
                "suggested_action": "Immediate dispatch", "estimated_response_time": "3m 45s",
                "confidence_score": 99.0, "hotspot_zone": "Zone 1",
                "recommended_officer_specialty": "Rapid Response", "ipc_sections": [],
                "ai_summary": "SOS emergency.", "model_used": "test", "processing_time_ms": 50,
            }
            response = client.post("/api/emergency/sos", json=SOS_PAYLOAD, headers=citizen_headers)
        assert response.status_code == 201
        data = response.json()
        assert data["isEmergency"] is True
        assert data["priority"] == "CRITICAL"

    def test_sos_works_without_authentication(self, client):
        """SOS must work without auth - no barriers in emergencies."""
        with patch("app.services.complaint_service.analyze_complaint") as mock_ai:
            mock_ai.return_value = {
                "category": "Other", "severity": "Critical", "priority": "CRITICAL",
                "fake_probability": 0.0, "fake_reasoning": "", "is_duplicate": False,
                "duplicate_confidence": 0.0, "nearest_station": "Precinct 01",
                "suggested_action": "Dispatch now", "estimated_response_time": "4m",
                "confidence_score": 98.0, "hotspot_zone": "", "recommended_officer_specialty": "",
                "ipc_sections": [], "ai_summary": "", "model_used": "test", "processing_time_ms": 50,
            }
            response = client.post("/api/emergency/sos", json=SOS_PAYLOAD)
        assert response.status_code == 201


class TestComplaintRetrieval:
    def _create_complaint(self, client, headers):
        with patch("app.services.complaint_service.analyze_complaint") as mock_ai:
            mock_ai.return_value = {
                "category": "Cybercrime", "severity": "Medium", "priority": "ROUTINE",
                "fake_probability": 5.0, "fake_reasoning": "", "is_duplicate": False,
                "duplicate_confidence": 0.0, "nearest_station": "Cyber Crime Cell HQ",
                "suggested_action": "", "estimated_response_time": "10m",
                "confidence_score": 88.0, "hotspot_zone": "", "recommended_officer_specialty": "",
                "ipc_sections": [], "ai_summary": "", "model_used": "test", "processing_time_ms": 100,
            }
            return client.post("/api/complaints", json=SAMPLE_COMPLAINT, headers=headers)

    def test_get_complaint_by_id(self, client, citizen_headers):
        create_resp = self._create_complaint(client, citizen_headers)
        complaint_id = create_resp.json()["id"]

        response = client.get(f"/api/complaints/{complaint_id}", headers=citizen_headers)
        assert response.status_code == 200
        assert response.json()["id"] == complaint_id

    def test_get_nonexistent_complaint_returns_404(self, client, citizen_headers):
        response = client.get("/api/complaints/CASE-9999-99999", headers=citizen_headers)
        assert response.status_code == 404

    def test_police_can_list_all_complaints(self, client, police_headers):
        response = client.get("/api/complaints", headers=police_headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_list_with_search_filter(self, client, police_headers):
        response = client.get("/api/complaints?search=phishing", headers=police_headers)
        assert response.status_code == 200


class TestComplaintStatusUpdate:
    def _create_complaint(self, client, headers):
        with patch("app.services.complaint_service.analyze_complaint") as mock_ai:
            mock_ai.return_value = {
                "category": "Other", "severity": "Low", "priority": "ROUTINE",
                "fake_probability": 5.0, "fake_reasoning": "", "is_duplicate": False,
                "duplicate_confidence": 0.0, "nearest_station": "Precinct 01",
                "suggested_action": "", "estimated_response_time": "10m",
                "confidence_score": 85.0, "hotspot_zone": "", "recommended_officer_specialty": "",
                "ipc_sections": [], "ai_summary": "", "model_used": "test", "processing_time_ms": 100,
            }
            return client.post("/api/complaints", json=SAMPLE_COMPLAINT, headers=headers)

    def test_police_can_update_status(self, client, citizen_headers, police_headers):
        complaint_id = self._create_complaint(client, citizen_headers).json()["id"]
        response = client.patch(
            f"/api/complaints/{complaint_id}/status",
            json={"status": "Under Review", "note": "Reviewing the complaint."},
            headers=police_headers,
        )
        assert response.status_code == 200
        assert response.json()["status"] == "Under Review"

    def test_citizen_cannot_update_status(self, client, citizen_headers):
        complaint_id = self._create_complaint(client, citizen_headers).json()["id"]
        response = client.patch(
            f"/api/complaints/{complaint_id}/status",
            json={"status": "Resolved"},
            headers=citizen_headers,
        )
        assert response.status_code == 403

    def test_resolve_updates_timeline(self, client, citizen_headers, police_headers):
        complaint_id = self._create_complaint(client, citizen_headers).json()["id"]
        client.patch(
            f"/api/complaints/{complaint_id}/status",
            json={"status": "Resolved", "resolution_notes": "Issue resolved."},
            headers=police_headers,
        )
        response = client.get(f"/api/complaints/{complaint_id}", headers=police_headers)
        statuses = [t["status"] for t in response.json()["timeline"]]
        assert "Resolved" in statuses


class TestOfficerNotes:
    def test_police_can_add_note(self, client, citizen_headers, police_headers):
        with patch("app.services.complaint_service.analyze_complaint") as mock_ai:
            mock_ai.return_value = {
                "category": "Other", "severity": "Low", "priority": "ROUTINE",
                "fake_probability": 5.0, "fake_reasoning": "", "is_duplicate": False,
                "duplicate_confidence": 0.0, "nearest_station": "Precinct 01",
                "suggested_action": "", "estimated_response_time": "10m",
                "confidence_score": 85.0, "hotspot_zone": "", "recommended_officer_specialty": "",
                "ipc_sections": [], "ai_summary": "", "model_used": "test", "processing_time_ms": 100,
            }
            complaint_id = client.post(
                "/api/complaints", json=SAMPLE_COMPLAINT, headers=citizen_headers
            ).json()["id"]

        response = client.post(
            f"/api/complaints/{complaint_id}/notes",
            json={"note": "Officer note: suspect identified.", "is_sensitive": False},
            headers=police_headers,
        )
        assert response.status_code == 200
        assert len(response.json()["officerNotes"]) > 0

    def test_citizen_cannot_add_note(self, client, citizen_headers):
        response = client.post(
            "/api/complaints/CASE-9999-99999/notes",
            json={"note": "Citizen trying to add police note."},
            headers=citizen_headers,
        )
        assert response.status_code == 403
