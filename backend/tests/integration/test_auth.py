"""Integration tests for authentication endpoints."""
import pytest


class TestCitizenRegistration:
    def test_register_citizen_success(self, client):
        response = client.post("/api/auth/register/citizen", json={
            "full_name": "Ramesh Kumar",
            "email": "ramesh.kumar@test.com",
            "phone": "+919876543211",
            "password": "Secure@Pass1",
            "city": "Mumbai",
            "state": "Maharashtra",
        })
        assert response.status_code == 201
        data = response.json()
        assert "tokens" in data
        assert "user" in data
        assert data["user"]["role"] == "citizen"
        assert data["user"]["email"] == "ramesh.kumar@test.com"
        assert "access_token" in data["tokens"]
        assert "refresh_token" in data["tokens"]

    def test_register_returns_jwt_token_pair(self, client):
        response = client.post("/api/auth/register/citizen", json={
            "full_name": "Sita Devi",
            "email": "sita.devi@test.com",
            "phone": "+919876543212",
            "password": "Secure@Pass1",
        })
        assert response.status_code == 201
        tokens = response.json()["tokens"]
        assert tokens["token_type"] == "Bearer"
        assert tokens["expires_in"] > 0

    def test_register_duplicate_email_rejected(self, client):
        payload = {
            "full_name": "Duplicate User",
            "email": "dup@test.com",
            "phone": "+919876543213",
            "password": "Secure@Pass1",
        }
        client.post("/api/auth/register/citizen", json=payload)
        response = client.post("/api/auth/register/citizen", json=payload)
        assert response.status_code == 409
        assert response.json()["success"] is False

    def test_register_weak_password_rejected(self, client):
        response = client.post("/api/auth/register/citizen", json={
            "full_name": "Weak Pass User",
            "email": "weak@test.com",
            "phone": "+919876543214",
            "password": "weak",  # No uppercase, no digit
        })
        assert response.status_code == 422

    def test_register_invalid_email_rejected(self, client):
        response = client.post("/api/auth/register/citizen", json={
            "full_name": "Bad Email User",
            "email": "not-an-email",
            "phone": "+919876543215",
            "password": "Secure@Pass1",
        })
        assert response.status_code == 422

    def test_register_invalid_phone_rejected(self, client):
        response = client.post("/api/auth/register/citizen", json={
            "full_name": "Bad Phone User",
            "email": "badphone@test.com",
            "phone": "123",  # Invalid phone
            "password": "Secure@Pass1",
        })
        assert response.status_code == 422


class TestCitizenLogin:
    def test_login_with_email_success(self, client, citizen_user):
        response = client.post("/api/auth/login/citizen", json={
            "identifier": "test.citizen@example.com",
            "password": "TestPass@123",
        })
        assert response.status_code == 200
        data = response.json()
        assert "tokens" in data
        assert data["user"]["role"] == "citizen"

    def test_login_wrong_password(self, client, citizen_user):
        response = client.post("/api/auth/login/citizen", json={
            "identifier": "test.citizen@example.com",
            "password": "WrongPassword@1",
        })
        assert response.status_code == 401
        assert response.json()["success"] is False

    def test_login_nonexistent_user(self, client):
        response = client.post("/api/auth/login/citizen", json={
            "identifier": "nobody@nowhere.com",
            "password": "SomePass@1",
        })
        assert response.status_code == 401

    def test_login_returns_both_tokens(self, client, citizen_user):
        response = client.post("/api/auth/login/citizen", json={
            "identifier": "test.citizen@example.com",
            "password": "TestPass@123",
        })
        tokens = response.json()["tokens"]
        assert "access_token" in tokens
        assert "refresh_token" in tokens
        assert tokens["token_type"] == "Bearer"


class TestPoliceLogin:
    def test_police_login_with_badge(self, client, police_admin_user):
        response = client.post("/api/auth/login/police", json={
            "identifier": "TEST-POL-0001",
            "password": "OfficerPass@123",
        })
        assert response.status_code == 200
        data = response.json()
        assert data["user"]["role"] == "police_admin"
        assert data["user"]["badge_number"] == "TEST-POL-0001"

    def test_police_login_with_email(self, client, police_admin_user):
        response = client.post("/api/auth/login/police", json={
            "identifier": "test.officer@police.gov.in",
            "password": "OfficerPass@123",
        })
        assert response.status_code == 200

    def test_citizen_cannot_use_police_endpoint_with_wrong_role(self, client, citizen_user):
        response = client.post("/api/auth/login/police", json={
            "identifier": "test.citizen@example.com",
            "password": "TestPass@123",
        })
        # Should fail - citizen not found in police users
        assert response.status_code in (401, 403)


class TestGetCurrentUser:
    def test_me_returns_user_profile(self, client, citizen_headers):
        response = client.get("/api/auth/me", headers=citizen_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "test.citizen@example.com"
        assert data["role"] == "citizen"

    def test_me_without_token_returns_401(self, client):
        response = client.get("/api/auth/me")
        assert response.status_code == 401

    def test_me_with_invalid_token_returns_401(self, client):
        response = client.get("/api/auth/me", headers={"Authorization": "Bearer invalid.token.here"})
        assert response.status_code == 401

    def test_police_me_returns_badge_info(self, client, police_headers):
        response = client.get("/api/auth/me", headers=police_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["badge_number"] == "TEST-POL-0001"
        assert data["role"] == "police_admin"


class TestPasswordReset:
    def test_password_reset_request_returns_200(self, client, citizen_user):
        response = client.post("/api/auth/password/reset/request", json={
            "email": "test.citizen@example.com"
        })
        assert response.status_code == 200
        assert response.json()["success"] is True

    def test_password_reset_nonexistent_email_still_200(self, client):
        """Must not leak user existence - always return 200."""
        response = client.post("/api/auth/password/reset/request", json={
            "email": "nobody@nowhere.com"
        })
        assert response.status_code == 200

    def test_password_reset_invalid_token_rejected(self, client):
        response = client.post("/api/auth/password/reset/confirm", json={
            "token": "invalid_token_here",
            "new_password": "NewPass@123",
        })
        assert response.status_code == 400
