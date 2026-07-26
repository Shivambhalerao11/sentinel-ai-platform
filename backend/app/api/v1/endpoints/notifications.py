"""Notification endpoints."""
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.middleware.auth import AuthenticatedUser, get_current_user
from app.repositories.notification_repository import NotificationRepository
from app.schemas.common import SuccessResponse

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", summary="Get user notifications")
def get_notifications(
    unread_only: bool = Query(False),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list:
    repo = NotificationRepository(db)
    notifications, total = repo.get_for_user(
        user_id=current_user.id,
        unread_only=unread_only,
        page=page,
        page_size=page_size,
    )
    return [
        {
            "id": str(n.id),
            "title": n.title,
            "message": n.message,
            "type": n.notification_type,
            "timestamp": n.created_at.strftime("%H:%M %p") if n.created_at else "",
            "read": n.is_read,
            "complaintId": n.complaint_id,
        }
        for n in notifications
    ]


@router.get("/unread-count", summary="Get unread notification count")
def get_unread_count(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    repo = NotificationRepository(db)
    count = repo.get_unread_count(current_user.id)
    return {"success": True, "data": {"count": count}}


@router.patch("/{notification_id}/read", summary="Mark notification as read")
def mark_notification_read(
    notification_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    try:
        notif_uuid = uuid.UUID(notification_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid notification ID.")

    repo = NotificationRepository(db)
    success = repo.mark_read(notif_uuid, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found.")

    db.commit()
    return SuccessResponse(message="Notification marked as read.")


@router.patch("/mark-all-read", summary="Mark all notifications as read")
def mark_all_read(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    repo = NotificationRepository(db)
    count = repo.mark_all_read(current_user.id)
    db.commit()
    return SuccessResponse(message=f"{count} notifications marked as read.")


@router.delete("/{notification_id}", summary="Delete a notification")
def delete_notification(
    notification_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    try:
        notif_uuid = uuid.UUID(notification_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid notification ID.")

    repo = NotificationRepository(db)
    success = repo.soft_delete(notif_uuid, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found.")

    db.commit()
    return SuccessResponse(message="Notification deleted.")
