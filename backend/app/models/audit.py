"""Audit log model - immutable tamper-evident record of all system actions."""
import uuid
from typing import TYPE_CHECKING, Optional

from sqlalchemy import ForeignKey, Index, String, Text, JSON
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

JSON_TYPE = JSON().with_variant(JSONB(), "postgresql")

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import AuditAction

if TYPE_CHECKING:
    from app.models.user import User


class AuditLog(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Immutable audit trail. Never update or delete records.
    Used for compliance, forensics, and security monitoring.
    """
    __tablename__ = "audit_logs"

    action: Mapped[AuditAction] = mapped_column(String(60), nullable=False, index=True)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    user_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    user_role: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    resource_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    resource_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    details: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    metadata_json: Mapped[Optional[dict]] = mapped_column(JSON_TYPE, nullable=True)
    status_code: Mapped[Optional[int]] = mapped_column(nullable=True)
    session_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    user: Mapped[Optional["User"]] = relationship(
        "User", back_populates="audit_logs", foreign_keys=[user_id]
    )

    __table_args__ = (
        Index("ix_audit_logs_action_created", "action", "created_at"),
        Index("ix_audit_logs_user_id_created", "user_id", "created_at"),
    )

    def __repr__(self) -> str:
        return f"<AuditLog action={self.action} user={self.user_name}>"
