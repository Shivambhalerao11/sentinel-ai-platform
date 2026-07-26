"""
AI Insights Engine for Police Dashboard.
Generates analytics, hotspot predictions, trend analysis, and risk assessments.
"""
from typing import Any, Dict, List

from app.ai.chatbot import generate_ai_insights_summary
from app.core.logging import get_logger

logger = get_logger(__name__)

# High-risk district thresholds
RISK_THRESHOLDS = {
    "critical": 75.0,
    "high": 50.0,
    "medium": 25.0,
}


def compute_district_risk_scores(district_data: List[Dict]) -> List[Dict]:
    """
    Compute risk scores for each district based on:
    - Total complaint count (weighted)
    - Emergency complaint proportion
    - Unresolved complaint proportion
    - Crime category severity
    """
    HIGH_SEVERITY_CATEGORIES = {
        "Violence", "Domestic Escalation", "Organized Crime", "Narcotics"
    }

    results = []
    if not district_data:
        return results

    max_count = max((d.get("count", 0) for d in district_data), default=1)

    for d in district_data:
        count = d.get("count", 0)
        emergency_ratio = d.get("emergency_ratio", 0.0)
        unresolved_ratio = d.get("unresolved_ratio", 0.5)
        key_crime = d.get("key_crime", "Other")
        severity_bonus = 15.0 if key_crime in HIGH_SEVERITY_CATEGORIES else 0.0

        # Weighted risk formula
        volume_score = (count / max_count) * 40.0
        emergency_score = emergency_ratio * 30.0
        unresolved_score = unresolved_ratio * 15.0
        risk_score = min(volume_score + emergency_score + unresolved_score + severity_bonus, 100.0)

        action_map = {
            "Violence": "Deploy tactical response teams. Increase night patrols by 40%.",
            "Cybercrime": "Activate Cyber Crime Cell. Issue public digital safety advisory.",
            "Domestic Escalation": "Engage community policing. Alert women safety units.",
            "Theft/Burglary": "Increase commercial area patrols. Coordinate with CCTV network.",
            "Narcotics": "Coordinate with Narcotics Control Bureau. Execute search operations.",
            "Traffic Incident": "Deploy traffic management teams at key intersections.",
            "Organized Crime": "Alert Special Operations Unit. Monitor known criminal networks.",
        }

        results.append({
            "district": d.get("district", "Unknown"),
            "riskScore": round(risk_score, 1),
            "keyCrime": key_crime,
            "recommendedAction": action_map.get(
                key_crime, "Maintain standard patrol frequency. Monitor for escalation."
            ),
        })

    return sorted(results, key=lambda x: x["riskScore"], reverse=True)


def generate_hotspot_predictions(complaints_data: List[Dict]) -> List[Dict]:
    """
    Generate crime hotspot predictions based on geographic clustering
    of recent complaints.
    """
    from collections import defaultdict

    # Group complaints by approximate location (0.01 degree grid ~ 1.1 km)
    grid_clusters: Dict[tuple, List[Dict]] = defaultdict(list)
    for c in complaints_data:
        lat = round(float(c.get("latitude", 0)) / 0.01) * 0.01
        lng = round(float(c.get("longitude", 0)) / 0.01) * 0.01
        grid_clusters[(lat, lng)].append(c)

    hotspots = []
    for (lat, lng), cluster in grid_clusters.items():
        if len(cluster) < 2:
            continue

        # Compute cluster centroid
        avg_lat = sum(c.get("latitude", lat) for c in cluster) / len(cluster)
        avg_lng = sum(c.get("longitude", lng) for c in cluster) / len(cluster)

        # Most common crime in cluster
        categories = [c.get("category", "Other") for c in cluster]
        key_category = max(set(categories), key=categories.count)

        # Emergency ratio
        emergency_count = sum(1 for c in cluster if c.get("is_emergency", False))
        probability = min(0.4 + (len(cluster) * 0.1) + (emergency_count * 0.15), 0.99)

        # Location name heuristic
        location_name = c.get("district", "Unknown Area") if cluster else "Unknown Area"

        hotspots.append({
            "locationName": f"{location_name} Hotspot",
            "lat": round(avg_lat, 4),
            "lng": round(avg_lng, 4),
            "timeWindow": "18:00 - 23:00 IST" if emergency_count > 0 else "09:00 - 18:00 IST",
            "probability": round(probability, 2),
        })

    # Return top 10 hotspots sorted by probability
    return sorted(hotspots, key=lambda x: x["probability"], reverse=True)[:10]


def identify_suspicious_patterns(complaints_data: List[Dict], fake_flagged: List[Dict]) -> List[Dict]:
    """Identify suspicious patterns in complaint data for the AI insights dashboard."""
    patterns = []

    # Pattern 1: Spike in specific category
    category_counts: Dict[str, int] = {}
    for c in complaints_data:
        cat = c.get("category", "Other")
        category_counts[cat] = category_counts.get(cat, 0) + 1

    if category_counts:
        top_category = max(category_counts, key=category_counts.get)
        top_count = category_counts[top_category]
        if top_count >= 3:
            patterns.append({
                "title": f"Surge in {top_category} Reports",
                "detail": f"{top_count} reports in the current monitoring period. Investigate for coordinated activity or emerging hotspot.",
                "severity": "High" if top_count >= 5 else "Medium",
            })

    # Pattern 2: Fake complaint cluster
    if len(fake_flagged) >= 3:
        fake_phones = [c.get("citizen_phone", "") for c in fake_flagged if c.get("citizen_phone")]
        patterns.append({
            "title": f"Fake Complaint Network Detected",
            "detail": f"{len(fake_flagged)} complaints flagged as potentially fraudulent. Review originating phone numbers and IP addresses.",
            "severity": "High",
        })

    # Pattern 3: Geographic clustering
    if len(complaints_data) >= 5:
        districts = [c.get("district", "") for c in complaints_data]
        top_district = max(set(districts), key=districts.count) if districts else ""
        district_count = districts.count(top_district)
        if district_count >= 4:
            patterns.append({
                "title": f"Geographic Concentration: {top_district}",
                "detail": f"{district_count} of recent complaints originate from {top_district}. Consider targeted intervention.",
                "severity": "Medium",
            })

    # Pattern 4: Off-hours emergency surge
    emergency_complaints = [c for c in complaints_data if c.get("is_emergency")]
    if len(emergency_complaints) >= 2:
        patterns.append({
            "title": "Emergency Complaint Cluster",
            "detail": f"{len(emergency_complaints)} emergency complaints detected in current window. Verify response coverage.",
            "severity": "High",
        })

    return patterns[:6]  # Limit to 6 patterns


def build_analytics_response(
    total: int,
    resolved: int,
    pending: int,
    emergency: int,
    fake_count: int,
    duplicate_count: int,
    active_patrol: int,
    avg_response_minutes: float,
    category_breakdown: List[Dict],
    district_distribution: List[Dict],
    weekly_trend: List[Dict],
    officer_performance: List[Dict],
) -> Dict[str, Any]:
    """Construct the full analytics summary response."""
    clearance_rate = round((resolved / total * 100) if total > 0 else 0.0, 1)

    return {
        "totalComplaints": total,
        "resolvedComplaints": resolved,
        "pendingComplaints": pending,
        "emergencyCases": emergency,
        "clearanceRate": clearance_rate,
        "avgResponseTimeMin": round(avg_response_minutes, 1),
        "fakeReportsDetected": fake_count,
        "duplicatesFlagged": duplicate_count,
        "activePatrolUnits": active_patrol,
        "categoryBreakdown": [
            {"category": d["category"], "count": d["count"]}
            for d in category_breakdown
        ],
        "districtDistribution": [
            {
                "district": d["district"],
                "count": d["count"],
                "highRisk": d["count"] > 3,
            }
            for d in district_distribution
        ],
        "weeklyTrend": weekly_trend,
        "officerPerformance": officer_performance,
    }
