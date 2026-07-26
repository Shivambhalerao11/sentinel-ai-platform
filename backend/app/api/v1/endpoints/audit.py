"""Audit logs endpoint (police admin only)."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.middleware.auth import require_admin
from app.repositories.audit_repository import AuditRepository

router = APIRouter(prefix="/audit", tags=["Audit Logs"])


@router.get(
    "/logs",
    summary="Get audit logs (admin only)",
    dependencies=[Depends(require_admin)],
)
def get_audit_logs(
    action: str = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
) -> list:
    repo = AuditRepository(db)
    logs, total = repo.get_list(action=action, page=page, page_size=page_size)
    return [
        {
            "id": str(log.id),
            "action": log.action,
            "user": log.user_name or "System",
            "role": log.user_role or "SYSTEM",
            "ip": log.ip_address or "127.0.0.1",
            "details": log.details or "",
            "timestamp": log.created_at.strftime("%Y-%m-%d %H:%M:%S") if log.created_at else "",
        }
        for log in logs
    ]
