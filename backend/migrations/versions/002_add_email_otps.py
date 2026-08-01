"""Add email_otps table for 6-digit OTP verification

Revision ID: 002_add_email_otps
Revises: 001_initial
Create Date: 2026-07-27 00:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "002_add_email_otps"
down_revision: Union[str, None] = "001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── email_otps ────────────────────────────────────────────────────────────
    # Stores 6-digit OTP codes (hashed) for registration and password reset.
    # Independent of users table — email is the lookup key so unauthenticated
    # users can request OTPs before their account is created.
    op.create_table(
        "email_otps",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("otp_hash", sa.String(255), nullable=False),
        sa.Column(
            "purpose",
            sa.String(50),
            nullable=False,
            server_default="REGISTRATION",
            comment="REGISTRATION | PASSWORD_RESET",
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("attempts_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_verified", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("is_used", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_email_otps_email", "email_otps", ["email"])
    op.create_index("ix_email_otps_email_purpose", "email_otps", ["email", "purpose"])
    op.create_index("ix_email_otps_otp_hash", "email_otps", ["otp_hash"])
    op.create_index("ix_email_otps_expires_at", "email_otps", ["expires_at"])


def downgrade() -> None:
    op.drop_index("ix_email_otps_expires_at", table_name="email_otps")
    op.drop_index("ix_email_otps_otp_hash", table_name="email_otps")
    op.drop_index("ix_email_otps_email_purpose", table_name="email_otps")
    op.drop_index("ix_email_otps_email", table_name="email_otps")
    op.drop_table("email_otps")
