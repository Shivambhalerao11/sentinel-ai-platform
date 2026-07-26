"""
Analytics service: builds dashboard metrics and AI insights data.
"""
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List

from sqlalchemy import func, text
from sqlalchemy.orm import Session

from app.ai.insights_engine import (
    build_analytics_response, compute_district_risk_scores,
    generate_hotspot_predictions, identify_suspicious_patterns,
)
from app.ai.chatbot import generate_ai_insights_summary
from app.models.complaint import AIAnalysis, Complaint
from app.models.location import PatrolUnit
from app.models.user import PoliceProfile, User
from app.models.enums import ComplaintStatus, PriorityLevel, PatrolUnitStatus
from app.core.logging import get_logger

logger = get_logger(__name__)


class AnalyticsService:
    def __init__(self, db: Session):
        self.db = db

    def get_analytics_summary(self) -> Dict[str, Any]:
        """Build complete analytics summary for police dashboard."""
        total = self.db.query(func.count(Complaint.id)).filter(
            Complaint.is_deleted == False
        ).scalar() or 0

        resolved = self.db.query(func.count(Complaint.id)).filter(
            Complaint.is_deleted == False,
            Complaint.status == ComplaintStatus.RESOLVED,
        ).scalar() or 0

        pending = self.db.query(func.count(Complaint.id)).filter(
            Complaint.is_deleted == False,
            Complaint.status.in_([ComplaintStatus.PENDING, ComplaintStatus.UNDER_REVIEW]),
        ).scalar() or 0

        emergency = self.db.query(func.count(Complaint.id)).filter(
            Complaint.is_deleted == False,
            Complaint.is_emergency == True,
        ).scalar() or 0

        fake_flagged = self.db.query(func.count(AIAnalysis.id)).filter(
            AIAnalysis.fake_probability > 50.0
        ).scalar() or 0

        duplicate_flagged = self.db.query(func.count(AIAnalysis.id)).filter(
            AIAnalysis.is_duplicate == True
        ).scalar() or 0

        active_patrol = self.db.query(func.count(PatrolUnit.id)).filter(
            PatrolUnit.status.in_([
                PatrolUnitStatus.PATROLLING,
                PatrolUnitStatus.ON_SCENE,
                PatrolUnitStatus.EN_ROUTE,
                PatrolUnitStatus.DISPATCHED,
            ])
        ).scalar() or 0

        # Average response time (minutes) from resolved complaints
        avg_response = 8.5  # Default when no resolved complaints yet
        resolved_complaints = self.db.query(Complaint).filter(
            Complaint.is_deleted == False,
            Complaint.status == ComplaintStatus.RESOLVED,
            Complaint.resolved_at.isnot(None),
        ).all()
        if resolved_complaints:
            total_minutes = sum(
                (c.resolved_at - c.created_at).total_seconds() / 60
                for c in resolved_complaints
                if c.resolved_at and c.created_at
            )
            avg_response = total_minutes / len(resolved_complaints)

        # Category breakdown
        cat_results = (
            self.db.query(Complaint.crime_category, func.count(Complaint.id))
            .filter(Complaint.is_deleted == False)
            .group_by(Complaint.crime_category)
            .all()
        )
        category_breakdown = [{"category": r[0], "count": r[1]} for r in cat_results]

        # District distribution
        dist_results = (
            self.db.query(Complaint.district, func.count(Complaint.id))
            .filter(Complaint.is_deleted == False)
            .group_by(Complaint.district)
            .all()
        )
        district_distribution = [{"district": r[0], "count": r[1]} for r in dist_results]

        # Weekly trend (last 7 days)
        weekly_trend = self._build_weekly_trend()

        # Officer performance
        officer_performance = self._build_officer_performance()

        return build_analytics_response(
            total=total,
            resolved=resolved,
            pending=pending,
            emergency=emergency,
            fake_count=fake_flagged,
            duplicate_count=duplicate_flagged,
            active_patrol=active_patrol,
            avg_response_minutes=avg_response,
            category_breakdown=category_breakdown,
            district_distribution=district_distribution,
            weekly_trend=weekly_trend,
            officer_performance=officer_performance,
        )

    def _build_weekly_trend(self) -> List[Dict]:
        """Build 7-day trend data."""
        days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        today = datetime.now(timezone.utc)
        trend = []

        for i in range(6, -1, -1):
            day_start = today - timedelta(days=i)
            day_start = day_start.replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)

            total_day = self.db.query(func.count(Complaint.id)).filter(
                Complaint.is_deleted == False,
                Complaint.created_at >= day_start,
                Complaint.created_at < day_end,
            ).scalar() or 0

            emergency_day = self.db.query(func.count(Complaint.id)).filter(
                Complaint.is_deleted == False,
                Complaint.is_emergency == True,
                Complaint.created_at >= day_start,
                Complaint.created_at < day_end,
            ).scalar() or 0

            resolved_day = self.db.query(func.count(Complaint.id)).filter(
                Complaint.is_deleted == False,
                Complaint.status == ComplaintStatus.RESOLVED,
                Complaint.updated_at >= day_start,
                Complaint.updated_at < day_end,
            ).scalar() or 0

            trend.append({
                "day": days[day_start.weekday()],
                "total": total_day,
                "emergency": emergency_day,
                "resolved": resolved_day,
            })

        return trend

    def _build_officer_performance(self) -> List[Dict]:
        """Build officer performance metrics."""
        officers = (
            self.db.query(User, PoliceProfile)
            .join(PoliceProfile, User.id == PoliceProfile.user_id)
            .filter(User.is_deleted == False)
            .all()
        )

        performance = []
        for user, profile in officers:
            resolved = self.db.query(func.count(Complaint.id)).filter(
                Complaint.is_deleted == False,
                Complaint.assigned_officer_id == user.id,
                Complaint.status == ComplaintStatus.RESOLVED,
            ).scalar() or 0

            active = self.db.query(func.count(Complaint.id)).filter(
                Complaint.is_deleted == False,
                Complaint.assigned_officer_id == user.id,
                Complaint.status.in_([
                    ComplaintStatus.ASSIGNED,
                    ComplaintStatus.IN_PROGRESS,
                    ComplaintStatus.UNDER_REVIEW,
                ]),
            ).scalar() or 0

            total_assigned = resolved + active
            rating = min(5.0, (resolved / max(total_assigned, 1)) * 5.0)

            performance.append({
                "name": user.full_name,
                "badge": profile.badge_number,
                "resolved": resolved,
                "active": active,
                "rating": round(rating, 1),
            })

        return sorted(performance, key=lambda x: x["resolved"], reverse=True)[:10]

    def get_ai_insights(self) -> Dict[str, Any]:
        """Build AI insights data for the predictive analytics panel."""
        # Get recent complaints for analysis
        recent_complaints = self.db.query(Complaint).filter(
            Complaint.is_deleted == False
        ).order_by(Complaint.created_at.desc()).limit(100).all()

        complaints_data = [
            {
                "latitude": c.latitude,
                "longitude": c.longitude,
                "category": c.crime_category,
                "district": c.district,
                "is_emergency": c.is_emergency,
                "status": c.status,
            }
            for c in recent_complaints
        ]

        # District analytics with risk computation
        dist_results = (
            self.db.query(
                Complaint.district,
                func.count(Complaint.id).label("count"),
                func.sum(Complaint.is_emergency.cast(type_=func.count(Complaint.id).__class__)).label("emergency_count"),
            )
            .filter(Complaint.is_deleted == False)
            .group_by(Complaint.district)
            .all()
        )

        # Simplified district analysis
        district_data = []
        for row in dist_results:
            district_complaints = self.db.query(Complaint).filter(
                Complaint.is_deleted == False,
                Complaint.district == row[0],
            ).all()

            if not district_complaints:
                continue

            categories = [c.crime_category for c in district_complaints]
            key_crime = max(set(categories), key=categories.count) if categories else "Other"
            emergency_ratio = sum(1 for c in district_complaints if c.is_emergency) / len(district_complaints)
            unresolved_ratio = sum(
                1 for c in district_complaints if c.status not in [ComplaintStatus.RESOLVED, ComplaintStatus.REJECTED]
            ) / len(district_complaints)

            district_data.append({
                "district": row[0],
                "count": len(district_complaints),
                "key_crime": key_crime,
                "emergency_ratio": emergency_ratio,
                "unresolved_ratio": unresolved_ratio,
            })

        district_risk = compute_district_risk_scores(district_data)
        hotspot_predictions = generate_hotspot_predictions(complaints_data)

        # Fake flagged complaints
        fake_flagged = self.db.query(Complaint).join(AIAnalysis).filter(
            Complaint.is_deleted == False,
            AIAnalysis.fake_probability > 40.0,
        ).all()

        fake_data = [
            {"citizen_phone": c.citizen_phone, "category": c.crime_category}
            for c in fake_flagged
        ]

        suspicious_patterns = identify_suspicious_patterns(complaints_data, fake_data)

        # AI summary
        trend_summary = generate_ai_insights_summary({
            "total_complaints": len(recent_complaints),
            "emergency_count": sum(1 for c in recent_complaints if c.is_emergency),
            "top_district": district_data[0]["district"] if district_data else "N/A",
            "top_crime": complaints_data[0]["category"] if complaints_data else "N/A",
        })

        # Fake complaint summary
        fake_count = self.db.query(func.count(AIAnalysis.id)).filter(
            AIAnalysis.fake_probability > 40.0
        ).scalar() or 0
        total_analyzed = self.db.query(func.count(AIAnalysis.id)).scalar() or 0

        return {
            "crimeTrendSummary": trend_summary,
            "districtRiskAnalysis": district_risk[:8],
            "hotspotPredictions": hotspot_predictions,
            "suspiciousPatterns": suspicious_patterns,
            "fakeComplaintSummary": {
                "totalAnalyzed": total_analyzed,
                "flaggedCount": fake_count,
                "commonMarkers": [
                    "Vague location descriptions",
                    "Repeated phone numbers",
                    "Off-hours mass reporting",
                    "Low geographic correlation",
                ],
            },
        }
