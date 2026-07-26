"""Integration tests for notification endpoints."""
import pytest


class TestNotifications:
    def test_get_notifications_requires_auth(self, client):
        response = client.get("/api/notifications")
        assert response.status_code == 401

    def test_citizen_gets_empty_notifications_initially(self, client, citizen_headers):
        response = client.get("/api/notifications", headers=citizen_headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_unread_count_endpoint(self, client, citizen_headers):
        response = client.get("/api/notifications/unread-count", headers=citizen_headers)
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "count" in data["data"]
        assert isinstance(data["data"]["count"], int)

    def test_mark_nonexistent_notification_returns_404(self, client, citizen_headers):
        import uuid
        fake_id = str(uuid.uuid4())
        response = client.patch(
            f"/api/notifications/{fake_id}/read",
            headers=citizen_headers,
        )
        assert response.status_code == 404

    def test_invalid_notification_id_returns_400(self, client, citizen_headers):
        response = client.patch(
            "/api/notifications/not-a-uuid/read",
            headers=citizen_headers,
        )
        assert response.status_code == 400
