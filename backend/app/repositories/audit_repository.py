"""Audit log repository."""
import uuid
from typing import List, Optional, Tuple

from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.models.audit import AuditLog
from app.models.enums import AuditAction


class AuditRepository:
    def __init__(self, db: Session):
        self.db = db

    def log(
        self,
        action: AuditAction,
        user_id: Optional[uuid.UUID] = None,
        user_name: Optional[str] = None,
        user_role: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        details: Optional[str] = None,
        metadata: Optional[dict] = None,
        status_code: Optional[int] = None,
        session_id: Optional[str] = None,
    ) -> AuditLog:
        log_entry = AuditLog(
            action=action,
            user_id=user_id,
            user_name=user_name,
            user_role=user_role,
            ip_address=ip_address,
            user_agent=user_agent,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details,
            metadata_json=metadata,
            status_code=status_code,
            session_id=session_id,
        )
        self.db.add(log_entry)
        self.db.flush()
        return log_entry

    def get_list(
        self,
        user_id: Optional[uuid.UUID] = None,
        action: Optional[str] = None,
        page: int = 1,
        page_size: int = 50,
    ) -> Tuple[List[AuditLog], int]:
        query = self.db.query(AuditLog)

        if user_id:
            query = query.filter(AuditLog.user_id == user_id)
        if action:
            query = query.filter(AuditLog.action == action)

        total = query.count()
        logs = (
            query.order_by(desc(AuditLog.created_at))
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )
        return logs, total
