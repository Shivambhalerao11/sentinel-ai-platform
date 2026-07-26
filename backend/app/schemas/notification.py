"""Notification schemas."""
from typing import Optional
from pydantic import BaseModel


class NotificationOut(BaseModel):
    """Matches frontend NotificationItem type."""
    id: str
    title: str
    message: str
    type: str
    timestamp: str
    read: bool
    complaintId: Optional[str]

    class Config:
        from_attributes = True


class NotificationCreateRequest(BaseModel):
    user_id: str
    title: str
    message: str
    notification_type: str
    complaint_id: Optional[str] = None
    action_url: Optional[str] = None
