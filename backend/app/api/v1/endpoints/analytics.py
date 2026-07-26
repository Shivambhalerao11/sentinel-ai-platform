"""Analytics and AI insights endpoints."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.middleware.auth import require_police
from app.services.analytics_service import AnalyticsService

router = APIRouter(tags=["Analytics"])


@router.get(
    "/analytics",
    summary="Get dashboard analytics summary",
    description="Returns KPIs, trends, district distribution, and officer performance.",
    dependencies=[Depends(require_police)],
)
def get_analytics(db: Session = Depends(get_db)) -> dict:
    service = AnalyticsService(db)
    return service.get_analytics_summary()


@router.get(
    "/ai-insights",
    summary="Get AI-generated crime insights",
    description="Returns hotspot predictions, district risk scores, suspicious patterns.",
    dependencies=[Depends(require_police)],
)
def get_ai_insights(db: Session = Depends(get_db)) -> dict:
    service = AnalyticsService(db)
    return service.get_ai_insights()
