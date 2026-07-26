"""Unit tests for security utilities."""
import pytest
from datetime import timedelta

from app.core.security import (
    create_access_token, create_refresh_token, decode_token,
    generate_otp, generate_secure_token, hash_password, verify_password
)


class TestPasswordHashing:
    def test_hash_produces_different_output_from_plaintext(self):
        plain = "SecurePass@123"
        hashed = hash_password(plain)
        assert hashed != plain

    def test_verify_correct_password(self):
        plain = "SecurePass@123"
        hashed = hash_password(plain)
        assert verify_password(plain, hashed) is True

    def test_reject_wrong_password(self):
        hashed = hash_password("CorrectPass@123")
        assert verify_password("WrongPass@123", hashed) is False

    def test_same_password_produces_different_hashes(self):
        """bcrypt uses random salt - same input must produce different hashes."""
        plain = "MyPassword@1"
        hash1 = hash_password(plain)
        hash2 = hash_password(plain)
        assert hash1 != hash2
        # Both must still verify correctly
        assert verify_password(plain, hash1) is True
        assert verify_password(plain, hash2) is True

    def test_empty_password_still_hashes(self):
        hashed = hash_password("")
        assert len(hashed) > 0


class TestJWTTokens:
    def test_create_and_decode_access_token(self):
        import uuid
        user_id = str(uuid.uuid4())
        token = create_access_token(subject=user_id, role="citizen")
        payload = decode_token(token)
        assert payload["sub"] == user_id
        assert payload["role"] == "citizen"
        assert payload["type"] == "access"

    def test_create_and_decode_refresh_token(self):
        import uuid
        user_id = str(uuid.uuid4())
        token = create_refresh_token(subject=user_id)
        payload = decode_token(token)
        assert payload["sub"] == user_id
        assert payload["type"] == "refresh"
        assert "jti" in payload  # JWT ID must be present for revocation

    def test_access_token_has_expiry(self):
        import uuid
        token = create_access_token(subject=str(uuid.uuid4()), role="police_admin")
        payload = decode_token(token)
        assert "exp" in payload
        assert payload["exp"] > payload["iat"]

    def test_expired_token_raises(self):
        from jose import JWTError
        import uuid
        token = create_access_token(
            subject=str(uuid.uuid4()),
            role="citizen",
            expires_delta=timedelta(seconds=-1),  # Already expired
        )
        with pytest.raises(JWTError):
            decode_token(token)

    def test_tampered_token_raises(self):
        from jose import JWTError
        import uuid
        token = create_access_token(subject=str(uuid.uuid4()), role="citizen")
        tampered = token[:-5] + "XXXXX"
        with pytest.raises(JWTError):
            decode_token(tampered)

    def test_police_token_contains_role(self):
        import uuid
        token = create_access_token(subject=str(uuid.uuid4()), role="police_admin")
        payload = decode_token(token)
        assert payload["role"] == "police_admin"


class TestTokenGeneration:
    def test_otp_is_numeric(self):
        otp = generate_otp(6)
        assert otp.isdigit()
        assert len(otp) == 6

    def test_otp_length_configurable(self):
        for length in [4, 6, 8]:
            otp = generate_otp(length)
            assert len(otp) == length

    def test_secure_token_is_url_safe(self):
        import re
        token = generate_secure_token(32)
        # URL-safe base64: alphanumeric + - and _
        assert re.match(r"^[A-Za-z0-9_-]+$", token)

    def test_secure_tokens_are_unique(self):
        tokens = {generate_secure_token(32) for _ in range(100)}
        assert len(tokens) == 100  # No duplicates in 100 attempts
