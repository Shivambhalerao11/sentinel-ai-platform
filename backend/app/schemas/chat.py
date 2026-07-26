"""Chatbot schemas."""
from typing import List, Optional
from pydantic import BaseModel, Field


class ChatMessageIn(BaseModel):
    """Citizen chatbot request."""
    message: str = Field(..., min_length=1, max_length=2000)
    session_id: Optional[str] = Field(None, max_length=100)
    history: Optional[List[dict]] = Field(default_factory=list)


class ChatMessageOut(BaseModel):
    """Chatbot response."""
    id: str
    sender: str
    text: str
    timestamp: str
    citations: Optional[List[str]] = None
    suggested_actions: Optional[List[str]] = None
    is_emergency: bool = False
    session_id: str
