"""Notification repository."""
import uuid
from typing import List, Optional, Tuple

from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.models.notification import Notification
from app.models.enums import NotificationType


class NotificationRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(
        self,
        user_id: uuid.UUID,
        title: str,
        message: str,
        notification_type: NotificationType,
        complaint_id: Optional[str] = None,
        action_url: Optional[str] = None,
    ) -> Notification:
        notif = Notification(
            user_id=user_id,
            title=title,
            message=message,
            notification_type=notification_type,
            complaint_id=complaint_id,
            action_url=action_url,
        )
        self.db.add(notif)
        self.db.flush()
        return notif

    def get_for_user(
        self,
        user_id: uuid.UUID,
        unread_only: bool = False,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[Notification], int]:
        query = (
            self.db.query(Notification)
            .filter(Notification.user_id == user_id, Notification.is_deleted == False)
        )
        if unread_only:
            query = query.filter(Notification.is_read == False)

        total = query.count()
        notifications = (
            query.order_by(desc(Notification.created_at))
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )
        return notifications, total

    def get_unread_count(self, user_id: uuid.UUID) -> int:
        return (
            self.db.query(Notification)
            .filter(
                Notification.user_id == user_id,
                Notification.is_read == False,
                Notification.is_deleted == False,
            )
            .count()
        )

    def mark_read(self, notification_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        n = (
            self.db.query(Notification)
            .filter(Notification.id == notification_id, Notification.user_id == user_id)
            .first()
        )
        if n:
            n.is_read = True
            self.db.flush()
            return True
        return False

    def mark_all_read(self, user_id: uuid.UUID) -> int:
        count = (
            self.db.query(Notification)
            .filter(Notification.user_id == user_id, Notification.is_read == False)
            .update({"is_read": True}, synchronize_session=False)
        )
        self.db.flush()
        return count

    def soft_delete(self, notification_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        n = (
            self.db.query(Notification)
            .filter(Notification.id == notification_id, Notification.user_id == user_id)
            .first()
        )
        if n:
            n.is_deleted = True
            self.db.flush()
            return True
        return False
