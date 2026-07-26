"""Integration tests for system endpoints."""


class TestHealthCheck:
    def test_health_endpoint_returns_200(self, client):
        response = client.get("/health")
        assert response.status_code == 200

    def test_health_response_has_required_fields(self, client):
        data = client.get("/health").json()
        assert "status" in data
        assert "version" in data
        assert "environment" in data
        assert "database" in data
        assert "ai_engine" in data

    def test_health_status_is_healthy_or_degraded(self, client):
        data = client.get("/health").json()
        assert data["status"] in ("healthy", "degraded")

    def test_root_endpoint(self, client):
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "name" in data
        assert "version" in data


class TestRBAC:
    """Role-Based Access Control tests."""

    def test_citizen_cannot_access_analytics(self, client, citizen_headers):
        response = client.get("/api/analytics", headers=citizen_headers)
        assert response.status_code == 403

    def test_citizen_cannot_access_ai_insights(self, client, citizen_headers):
        response = client.get("/api/ai-insights", headers=citizen_headers)
        assert response.status_code == 403

    def test_police_can_access_analytics(self, client, police_headers):
        response = client.get("/api/analytics", headers=police_headers)
        assert response.status_code == 200

    def test_citizen_cannot_list_officers(self, client, citizen_headers):
        response = client.get("/api/admin/users", headers=citizen_headers)
        assert response.status_code == 403

    def test_police_can_list_officers(self, client, police_headers):
        response = client.get("/api/admin/users", headers=police_headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_unauthenticated_cannot_access_protected_routes(self, client):
        protected_routes = [
            "/api/analytics",
            "/api/ai-insights",
            "/api/audit-logs",
            "/api/admin/users",
        ]
        for route in protected_routes:
            response = client.get(route)
            assert response.status_code == 401, f"Expected 401 for {route}, got {response.status_code}"


class TestChatbot:
    def test_chatbot_responds_to_message(self, client):
        response = client.post("/api/chatbot", json={
            "message": "How do I file a complaint?",
            "history": [],
        })
        assert response.status_code == 200
        data = response.json()
        assert "text" in data
        assert "sender" in data
        assert data["sender"] == "bot"
        assert len(data["text"]) > 0

    def test_chatbot_detects_emergency(self, client):
        response = client.post("/api/chatbot", json={
            "message": "Help me there is an attack happening right now!",
            "history": [],
        })
        assert response.status_code == 200
        data = response.json()
        assert data["isEmergency"] is True

    def test_chatbot_returns_session_id(self, client):
        response = client.post("/api/chatbot", json={
            "message": "What is Sentinel?",
        })
        assert response.status_code == 200
        assert "sessionId" in response.json()

    def test_chatbot_stores_history_for_authenticated_user(self, client, citizen_headers):
        response = client.post("/api/chatbot", json={
            "message": "How do I track my complaint?",
        }, headers=citizen_headers)
        assert response.status_code == 200
