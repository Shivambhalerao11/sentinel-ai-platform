"""Chat history model for citizen AI chatbot."""
import uuid
from typing import TYPE_CHECKING, Optional

from sqlalchemy import ForeignKey, String, Text, Boolean
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import ChatSender

if TYPE_CHECKING:
    from app.models.user import User


class ChatHistory(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Stores individual chat messages per user session."""
    __tablename__ = "chat_history"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    session_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    sender: Mapped[ChatSender] = mapped_column(String(10), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    intent: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    citations: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)
    suggested_actions: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)
    is_emergency: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    complaint_id_mentioned: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    processing_time_ms: Mapped[Optional[int]] = mapped_column(nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="chat_histories")

    def __repr__(self) -> str:
        return f"<ChatHistory user={self.user_id} sender={self.sender}>"
