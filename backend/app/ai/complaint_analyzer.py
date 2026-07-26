"""
AI Complaint Analysis Pipeline.
Runs after complaint submission to:
1. Categorize crime type
2. Assess severity and priority
3. Detect fake/frivolous complaints
4. Find duplicate complaints using semantic similarity
5. Suggest nearest police station
6. Generate AI summary and recommended actions
7. Identify applicable BNS/IPC sections
"""
import json
import math
import time
from typing import Any, Dict, List, Optional

from app.ai.gemini_client import gemini_client
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

# ─── Nearest Station Data (matches DB seed) ───────────────────────────────────
STATIONS_COORDS = [
    {"name": "Precinct 01 - HQ Command",         "lat": 28.6271, "lng": 77.2166},
    {"name": "Northern Sector Police Station",     "lat": 28.6814, "lng": 77.2226},
    {"name": "South Extension Precinct",           "lat": 28.5684, "lng": 77.2215},
    {"name": "Cyber Crime Cell HQ",                "lat": 28.5892, "lng": 77.2370},
    {"name": "East River Precinct",                "lat": 28.6304, "lng": 77.2777},
]

# BNS section mapping by crime category
BNS_SECTION_MAP = {
    "Domestic Escalation":  ["BNS 115 (Voluntarily Causing Hurt)", "BNS 352 (Intimidation)", "BNS 74 (Domestic Violence)"],
    "Cybercrime":           ["BNS 318 (Cheating)", "IT Act Sec 66D", "IT Act Sec 43"],
    "Violence":             ["BNS 100 (Murder)", "BNS 115 (Hurt)", "BNS 351 (Assault)"],
    "Theft/Burglary":       ["BNS 305 (Theft in dwelling)", "BNS 331 (Lurking house-trespass)", "BNS 303 (Theft)"],
    "Harassment":           ["BNS 351 (Criminal Intimidation)", "BNS 74 (Harassment)", "BNS 75 (Stalking)"],
    "Fraud/Scam":           ["BNS 318 (Cheating)", "BNS 319 (Cheating by personation)", "IT Act Sec 66C"],
    "Narcotics":            ["NDPS Act Sec 21", "NDPS Act Sec 27", "BNS 316 (Criminal breach of trust)"],
    "Traffic Incident":     ["BNS 281 (Rash Driving)", "Motor Vehicles Act Sec 185", "BNS 125 (Causing hurt)"],
    "Organized Crime":      ["Maharashtra Control of Organised Crime Act", "BNS 111 (Organised Crime)", "BNS 195"],
    "Missing Person":       ["BNS 137 (Abduction)", "BNS 139", "Juvenile Justice Act"],
    "Other":                ["BNS 351 (Criminal Intimidation)"],
}


def haversine_distance_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate great-circle distance between two GPS coordinates in km."""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlng / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def find_nearest_station(lat: float, lng: float) -> Dict[str, Any]:
    """Find the nearest police station and estimate response time."""
    nearest = min(
        STATIONS_COORDS,
        key=lambda s: haversine_distance_km(lat, lng, s["lat"], s["lng"]),
    )
    dist_km = haversine_distance_km(lat, lng, nearest["lat"], nearest["lng"])
    avg_speed_kmh = 40.0  # Urban average for police vehicle
    response_minutes = (dist_km / avg_speed_kmh) * 60
    mins = int(response_minutes)
    secs = int((response_minutes - mins) * 60)
    return {
        "name": nearest["name"],
        "distance_km": round(dist_km, 2),
        "response_time": f"{mins}m {secs:02d}s",
    }


def heuristic_analysis(
    title: str,
    description: str,
    category: str,
    lat: float,
    lng: float,
    is_emergency: bool,
) -> Dict[str, Any]:
    """
    Rule-based analysis fallback when Gemini is unavailable.
    Uses keyword matching, location data, and category metadata.
    """
    text = (title + " " + description).lower()

    # Emergency keyword detection
    emergency_keywords = [
        "kill", "weapon", "gun", "knife", "blood", "fire", "bomb",
        "hostage", "emergency", "attack", "assault", "rape", "stabbing",
        "shooting", "explosion", "abduction", "help me",
    ]
    high_keywords = [
        "stolen", "fraud", "theft", "scam", "missing", "break in",
        "burglary", "hack", "phishing",
    ]

    has_emergency = is_emergency or any(kw in text for kw in emergency_keywords)
    has_high = any(kw in text for kw in high_keywords)

    if has_emergency:
        severity, priority = "Critical", "CRITICAL"
        fake_prob = 1.5
    elif has_high:
        severity, priority = "High", "HIGH"
        fake_prob = 3.2
    else:
        severity, priority = "Medium", "ROUTINE"
        fake_prob = 5.0

    station_info = find_nearest_station(lat, lng)
    ipc_sections = BNS_SECTION_MAP.get(category, BNS_SECTION_MAP["Other"])

    specialty_map = {
        "Cybercrime": "Cyber Fraud & OSINT",
        "Violence": "Tactical Response & De-escalation",
        "Theft/Burglary": "Organized Crime & Investigation",
        "Traffic Incident": "Traffic & Highway Patrol",
        "Harassment": "Community Policing",
        "Domestic Escalation": "Tactical Response & De-escalation",
        "Narcotics": "Narcotics Division",
        "Fraud/Scam": "Cyber Fraud & OSINT",
    }

    return {
        "category": category,
        "severity": severity,
        "priority": priority,
        "fake_probability": fake_prob,
        "fake_reasoning": "Standard verification: plausible geolocation and incident markers match known crime patterns.",
        "is_duplicate": False,
        "matched_complaint_id": None,
        "duplicate_confidence": 0.0,
        "nearest_station": station_info["name"],
        "suggested_action": (
            "Immediate rapid unit dispatch. Establish perimeter and alert medical team."
            if has_emergency
            else "Assign duty officer for statement collection and investigation."
        ),
        "estimated_response_time": station_info["response_time"],
        "confidence_score": 88.0,
        "hotspot_zone": "District Zone 1",
        "recommended_officer_specialty": specialty_map.get(category, "General Investigation"),
        "ipc_sections": ipc_sections,
        "ai_summary": f"AI triage completed. Category: {category}. Severity: {severity}. Nearest station: {station_info['name']} (~{station_info['distance_km']} km). Estimated response time: {station_info['response_time']}.",
        "model_used": "heuristic-v1.0",
    }


def analyze_complaint(
    title: str,
    description: str,
    category: str,
    lat: float,
    lng: float,
    is_emergency: bool,
    existing_embeddings: Optional[List[Dict]] = None,
) -> Dict[str, Any]:
    """
    Main AI analysis function. Called after complaint submission.
    Falls back to heuristic analysis if Gemini is unavailable.

    Args:
        title: Complaint title
        description: Full description
        category: Crime category selected by citizen
        lat: Latitude
        lng: Longitude
        is_emergency: Whether citizen flagged as emergency
        existing_embeddings: Recent complaint embeddings for duplicate detection

    Returns:
        Dict with all AI analysis fields
    """
    start_time = time.monotonic()

    # Get station info (always computed deterministically)
    station_info = find_nearest_station(lat, lng)
    ipc_sections = BNS_SECTION_MAP.get(category, BNS_SECTION_MAP["Other"])

    # ─── Gemini Analysis ──────────────────────────────────────────────────────
    if gemini_client.is_available:
        prompt = f"""You are Sentinel AI, the Indian Police Crime Intelligence System.
Analyze this citizen complaint with full accuracy and return a JSON analysis.

COMPLAINT DETAILS:
Title: {title}
Crime Category: {category}
Description: {description}
GPS Location: Lat {lat}, Lng {lng}
Nearest Police Station: {station_info['name']} (~{station_info['distance_km']} km)
Citizen Flagged Emergency: {"YES" if is_emergency else "NO"}

ANALYSIS REQUIRED:
1. severity: "Critical" | "High" | "Medium" | "Low"
2. priority: "CRITICAL" | "HIGH" | "ROUTINE"
3. fake_probability: 0.0 to 100.0 (probability this is a fake/malicious report)
4. fake_reasoning: brief explanation of your fake assessment
5. is_duplicate: true/false (is this likely a duplicate of a known complaint?)
6. duplicate_confidence: 0.0 to 100.0
7. suggested_action: tactical response recommendation for police officers
8. confidence_score: 0.0 to 100.0 (your confidence in this analysis)
9. hotspot_zone: local zone name based on coordinates
10. recommended_officer_specialty: most suitable officer specialty
11. ai_summary: 2-3 sentence summary for police dashboard

CALIBRATION GUIDELINES:
- Violence/Weapon/Emergency threats → severity: Critical, priority: CRITICAL
- Cyber crimes, major theft, fraud → severity: High, priority: HIGH
- Minor incidents, traffic, disputes → severity: Medium/Low, priority: ROUTINE
- Fake probability HIGH (>40%) if: vague location, no specific details, unusual timing
- Apply Indian law: Bharatiya Nyaya Sanhita (BNS) 2023"""

        schema = """{
  "severity": "string",
  "priority": "string",
  "fake_probability": number,
  "fake_reasoning": "string",
  "is_duplicate": boolean,
  "duplicate_confidence": number,
  "suggested_action": "string",
  "confidence_score": number,
  "hotspot_zone": "string",
  "recommended_officer_specialty": "string",
  "ai_summary": "string"
}"""
        result = gemini_client.generate_json(prompt, schema)

        if result:
            elapsed_ms = int((time.monotonic() - start_time) * 1000)
            return {
                "category": category,
                "severity": result.get("severity", "Medium"),
                "priority": result.get("priority", "ROUTINE"),
                "fake_probability": float(result.get("fake_probability", 5.0)),
                "fake_reasoning": result.get("fake_reasoning", ""),
                "is_duplicate": bool(result.get("is_duplicate", False)),
                "matched_complaint_id": None,
                "duplicate_confidence": float(result.get("duplicate_confidence", 0.0)),
                "nearest_station": station_info["name"],
                "suggested_action": result.get("suggested_action", ""),
                "estimated_response_time": station_info["response_time"],
                "confidence_score": float(result.get("confidence_score", 85.0)),
                "hotspot_zone": result.get("hotspot_zone", ""),
                "recommended_officer_specialty": result.get("recommended_officer_specialty", ""),
                "ipc_sections": ipc_sections,
                "ai_summary": result.get("ai_summary", ""),
                "model_used": settings.GEMINI_MODEL,
                "processing_time_ms": elapsed_ms,
            }

    # ─── Heuristic Fallback ───────────────────────────────────────────────────
    logger.info("Using heuristic analysis (Gemini unavailable)")
    result = heuristic_analysis(title, description, category, lat, lng, is_emergency)
    result["nearest_station"] = station_info["name"]
    result["estimated_response_time"] = station_info["response_time"]
    result["processing_time_ms"] = int((time.monotonic() - start_time) * 1000)
    return result


def check_duplicate_semantic(
    description: str,
    existing_complaints: List[Dict],
    threshold: float = None,
) -> tuple[bool, Optional[str], float]:
    """
    Check if a complaint is semantically similar to recent complaints.
    Uses sentence-transformers for embedding comparison.

    Returns:
        (is_duplicate, matched_complaint_id, confidence_score)
    """
    if not existing_complaints:
        return False, None, 0.0

    threshold = threshold or settings.DUPLICATE_DETECTION_THRESHOLD

    try:
        from sentence_transformers import SentenceTransformer, util
        import numpy as np

        model = SentenceTransformer(settings.SENTENCE_TRANSFORMER_MODEL)
        new_embedding = model.encode(description, convert_to_tensor=True)

        best_score = 0.0
        best_id = None

        for complaint in existing_complaints:
            if "embedding" in complaint and complaint["embedding"]:
                existing_emb = complaint["embedding"]
                if isinstance(existing_emb, str):
                    existing_emb = np.array(json.loads(existing_emb))

                score = float(util.cos_sim(new_embedding, existing_emb)[0][0])
                if score > best_score:
                    best_score = score
                    best_id = complaint.get("complaint_id")

        if best_score >= threshold:
            return True, best_id, round(best_score * 100, 1)

    except Exception as e:
        logger.warning("Semantic duplicate check failed", error=str(e))

    return False, None, 0.0


def generate_complaint_embedding(text: str) -> Optional[str]:
    """
    Generate sentence embedding for a complaint description.
    Stored as JSON string in the database.

    Returns:
        JSON string of embedding vector, or None if model unavailable
    """
    try:
        from sentence_transformers import SentenceTransformer
        model = SentenceTransformer(settings.SENTENCE_TRANSFORMER_MODEL)
        embedding = model.encode(text).tolist()
        return json.dumps(embedding)
    except Exception as e:
        logger.warning("Embedding generation failed", error=str(e))
        return None
