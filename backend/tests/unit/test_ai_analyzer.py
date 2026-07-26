"""Unit tests for AI complaint analysis pipeline."""
import pytest
from unittest.mock import patch, MagicMock

from app.ai.complaint_analyzer import (
    find_nearest_station,
    haversine_distance_km,
    heuristic_analysis,
    analyze_complaint,
)


class TestHaversineDistance:
    def test_same_point_is_zero(self):
        dist = haversine_distance_km(28.6271, 77.2166, 28.6271, 77.2166)
        assert dist == pytest.approx(0.0, abs=0.001)

    def test_delhi_mumbai_reasonable_distance(self):
        # Delhi to Mumbai ~1150 km
        dist = haversine_distance_km(28.6271, 77.2166, 19.0760, 72.8777)
        assert 1100 < dist < 1200

    def test_symmetry(self):
        d1 = haversine_distance_km(28.6271, 77.2166, 28.5892, 77.2370)
        d2 = haversine_distance_km(28.5892, 77.2370, 28.6271, 77.2166)
        assert d1 == pytest.approx(d2, rel=0.001)


class TestNearestStation:
    def test_returns_dict_with_required_fields(self):
        result = find_nearest_station(28.6271, 77.2166)
        assert "name" in result
        assert "distance_km" in result
        assert "response_time" in result

    def test_hq_nearest_to_connaught_place(self):
        # Connaught Place coordinates should map to HQ
        result = find_nearest_station(28.6271, 77.2166)
        assert "HQ" in result["name"] or "Precinct 01" in result["name"]

    def test_cyber_cell_nearest_to_lodhi(self):
        # Lodhi Road coordinates should map to Cyber Crime Cell
        result = find_nearest_station(28.5892, 77.2370)
        assert "Cyber" in result["name"] or result["distance_km"] < 2.0

    def test_response_time_format(self):
        result = find_nearest_station(28.6271, 77.2166)
        # Should be like "3m 45s"
        assert "m" in result["response_time"]
        assert "s" in result["response_time"]


class TestHeuristicAnalysis:
    def test_emergency_keywords_raise_priority(self):
        result = heuristic_analysis(
            title="Help me there is a gun",
            description="Armed attacker with weapon",
            category="Violence",
            lat=28.6271,
            lng=77.2166,
            is_emergency=False,  # Override with keywords
        )
        assert result["priority"] == "CRITICAL"
        assert result["severity"] == "Critical"

    def test_theft_gives_high_priority(self):
        result = heuristic_analysis(
            title="Shop theft",
            description="My jewelry was stolen overnight",
            category="Theft/Burglary",
            lat=28.6271,
            lng=77.2166,
            is_emergency=False,
        )
        assert result["priority"] in ("HIGH", "CRITICAL")

    def test_routine_incident_is_routine(self):
        result = heuristic_analysis(
            title="Noise complaint",
            description="Neighbor is playing loud music",
            category="Other",
            lat=28.6271,
            lng=77.2166,
            is_emergency=False,
        )
        assert result["priority"] == "ROUTINE"

    def test_ipc_sections_populated(self):
        result = heuristic_analysis(
            title="Cybercrime",
            description="Phishing attack",
            category="Cybercrime",
            lat=28.5892,
            lng=77.2370,
            is_emergency=False,
        )
        assert isinstance(result["ipc_sections"], list)
        assert len(result["ipc_sections"]) > 0

    def test_all_required_fields_present(self):
        result = heuristic_analysis(
            title="Test", description="Test description",
            category="Other", lat=28.6271, lng=77.2166, is_emergency=False,
        )
        required_fields = [
            "category", "severity", "priority", "fake_probability",
            "fake_reasoning", "is_duplicate", "nearest_station",
            "suggested_action", "estimated_response_time", "confidence_score",
            "recommended_officer_specialty", "ipc_sections",
        ]
        for field in required_fields:
            assert field in result, f"Missing field: {field}"

    def test_emergency_flag_overrides_to_critical(self):
        result = heuristic_analysis(
            title="Minor issue",
            description="Small problem occurred",
            category="Other",
            lat=28.6271,
            lng=77.2166,
            is_emergency=True,  # Force emergency
        )
        assert result["priority"] == "CRITICAL"


class TestAnalyzeComplaint:
    def test_returns_dict_without_gemini(self):
        with patch("app.ai.complaint_analyzer.gemini_client") as mock_client:
            mock_client.is_available = False
            result = analyze_complaint(
                title="Test complaint",
                description="Something bad happened here",
                category="Violence",
                lat=28.6271,
                lng=77.2166,
                is_emergency=False,
            )
        assert isinstance(result, dict)
        assert "priority" in result
        assert "severity" in result

    def test_gemini_result_used_when_available(self):
        gemini_response = {
            "severity": "High",
            "priority": "HIGH",
            "fake_probability": 5.0,
            "fake_reasoning": "Legitimate report",
            "is_duplicate": False,
            "duplicate_confidence": 0.0,
            "suggested_action": "Send patrol",
            "confidence_score": 92.0,
            "hotspot_zone": "Zone A",
            "recommended_officer_specialty": "General",
            "ai_summary": "Test summary",
        }
        with patch("app.ai.complaint_analyzer.gemini_client") as mock_client:
            mock_client.is_available = True
            mock_client.generate_json.return_value = gemini_response
            result = analyze_complaint(
                title="Burglary at market",
                description="Shop broken into overnight, cash stolen",
                category="Theft/Burglary",
                lat=28.6814,
                lng=77.2226,
                is_emergency=False,
            )
        assert result["priority"] == "HIGH"
        assert result["severity"] == "High"
        assert result["ai_summary"] == "Test summary"
