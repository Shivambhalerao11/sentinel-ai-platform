"""Citizen AI chatbot endpoint."""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.ai.chatbot import process_chat_message
from app.db.session import get_db
from app.middleware.auth import AuthenticatedUser, get_optional_user
from app.models.chat import ChatHistory
from app.models.enums import AuditAction, ChatSender
from app.repositories.audit_repository import AuditRepository
from app.schemas.chat import ChatMessageIn, ChatMessageOut

router = APIRouter(prefix="/chatbot", tags=["Chatbot"])


@router.post("", response_model=dict, summary="Send a message to the AI chatbot")
def send_chat_message(
    payload: ChatMessageIn,
    current_user=Depends(get_optional_user),
    db: Session = Depends(get_db),
) -> dict:
    """
    Process a chatbot message with Gemini AI.
    Stores conversation history per user session.
    """
    session_id = payload.session_id or str(uuid.uuid4())
    history = payload.history or []

    # Process with AI
    response = process_chat_message(payload.message, history)

    response_id = str(uuid.uuid4())
    timestamp = datetime.now(timezone.utc).isoformat()

    # Store chat history if user is authenticated
    if current_user:
        # Store user message
        user_msg = ChatHistory(
            user_id=current_user.id,
            session_id=session_id,
            sender=ChatSender.USER,
            message=payload.message,
            is_emergency=response.get("is_emergency", False),
        )
        db.add(user_msg)

        # Store bot response
        bot_msg = ChatHistory(
            user_id=current_user.id,
            session_id=session_id,
            sender=ChatSender.BOT,
            message=response.get("text", ""),
            citations=response.get("citations"),
            suggested_actions=response.get("suggested_actions"),
            is_emergency=response.get("is_emergency", False),
        )
        db.add(bot_msg)

        # Audit log for AI interaction
        audit_repo = AuditRepository(db)
        audit_repo.log(
            action=AuditAction.CHATBOT_INTERACTION,
            user_id=current_user.id,
            details=f"Chatbot interaction. Emergency: {response.get('is_emergency', False)}",
        )

        db.commit()

    return {
        "id": response_id,
        "sender": "bot",
        "text": response.get("text", "I'm here to help. How can I assist you?"),
        "timestamp": timestamp,
        "citations": response.get("citations", []),
        "suggestedActions": response.get("suggested_actions", []),
        "isEmergency": response.get("is_emergency", False),
        "sessionId": session_id,
    }
