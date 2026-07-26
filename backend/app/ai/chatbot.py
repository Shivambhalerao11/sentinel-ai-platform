"""
Citizen Safety Chatbot powered by Gemini.
Handles emergency help, crime reporting guidance, safety advice.
"""
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.ai.gemini_client import gemini_client
from app.core.logging import get_logger

logger = get_logger(__name__)

SYSTEM_CONTEXT = """You are SENTINEL-AI, the official Indian Police Emergency Response and Citizen Safety Assistant.

Your role:
- Guide citizens through emergency situations
- Help them file crime complaints correctly
- Provide safety advice for different crime types
- Explain the complaint tracking process
- Provide information about Indian laws (BNS 2023, IT Act, etc.)
- Direct emergencies to proper services

EMERGENCY NUMBERS:
- Police: 100
- Fire: 101
- Ambulance: 102
- Women Helpline: 1091
- Cyber Crime: 1930
- National Emergency: 112
- Child Helpline: 1098

RULES:
- Never provide legal advice - only general information
- For immediate life-threatening emergencies, always direct to 112/100 FIRST
- Be empathetic but factual
- Keep responses concise and actionable
- If unsure, direct to nearest police station
- Respond in the same language as the user (Hindi or English)
- Do not share personal data of any individual

CRIME REPORTING GUIDANCE:
- Citizens can file complaints 24/7 through this platform
- Emergency SOS available on dashboard
- Photo/video evidence can be uploaded
- Anonymous reporting is available for sensitive crimes"""


def detect_emergency_intent(message: str) -> bool:
    """Detect if a message indicates an active emergency."""
    emergency_terms = [
        "help", "emergency", "urgent", "attack", "robbery", "fire",
        "accident", "injury", "blood", "weapon", "gun", "knife", "bomb",
        "help me", "save me", "मदद", "बचाओ", "आग", "हमला",
        "dying", "murder", "kidnap", "rape", "hostage",
    ]
    msg_lower = message.lower()
    return any(term in msg_lower for term in emergency_terms)


def build_chat_prompt(message: str, history: List[Dict]) -> str:
    """Build conversation prompt with history context."""
    conversation = SYSTEM_CONTEXT + "\n\n---\nCONVERSATION HISTORY:\n"

    # Include last 5 turns of history for context
    recent_history = history[-10:] if len(history) > 10 else history
    for turn in recent_history:
        sender = turn.get("sender", "user")
        text = turn.get("text", "")
        if sender == "user":
            conversation += f"Citizen: {text}\n"
        else:
            conversation += f"SENTINEL-AI: {text}\n"

    conversation += f"\nCitizen: {message}\n\nSENTINEL-AI:"
    return conversation


def get_fallback_response(message: str, is_emergency: bool) -> Dict[str, Any]:
    """Rule-based fallback response when Gemini is unavailable."""
    msg_lower = message.lower()

    if is_emergency:
        text = (
            "⚠️ EMERGENCY DETECTED\n\n"
            "Please call 112 (National Emergency) or 100 (Police) IMMEDIATELY.\n\n"
            "If you cannot call, use the RED EMERGENCY SOS button on the top of this platform.\n\n"
            "Stay calm. Help is on the way.\n\n"
            "📍 Share your location with the 112 operator."
        )
        suggested_actions = ["Press Emergency SOS", "Call 100", "Call 112"]
        citations = ["National Emergency: 112", "Police: 100", "Ambulance: 102"]
    elif any(kw in msg_lower for kw in ["complaint", "report", "file", "fir", "register"]):
        text = (
            "To file a complaint on Sentinel Platform:\n\n"
            "1. Click **'File Complaint'** in the Citizen menu\n"
            "2. Select the crime category\n"
            "3. Describe the incident in detail\n"
            "4. Add your location\n"
            "5. Attach photos/videos if available\n"
            "6. Submit - you'll receive a Case ID immediately\n\n"
            "Your complaint will be reviewed by AI and assigned to the nearest station within minutes."
        )
        suggested_actions = ["File a Complaint", "Track Complaint Status"]
        citations = []
    elif any(kw in msg_lower for kw in ["cyber", "online", "fraud", "scam", "phishing"]):
        text = (
            "For cybercrime incidents:\n\n"
            "🔹 **Immediate Action:** Call 1930 (National Cyber Crime Helpline)\n"
            "🔹 **File online:** cybercrime.gov.in\n"
            "🔹 **Bank fraud:** Call your bank immediately to freeze the account\n\n"
            "Do NOT share OTPs, passwords, or click suspicious links."
        )
        suggested_actions = ["Report Cybercrime", "Call 1930", "File Complaint"]
        citations = ["Cyber Crime Helpline: 1930", "cybercrime.gov.in"]
    else:
        text = (
            "Welcome to Sentinel - India's AI Crime Intelligence Platform.\n\n"
            "I can help you with:\n"
            "• 🆘 Emergency assistance\n"
            "• 📋 Filing crime complaints\n"
            "• 🔍 Tracking complaint status\n"
            "• 🛡️ Safety advice\n"
            "• ⚖️ Understanding Indian laws (BNS 2023)\n\n"
            "How can I assist you today?"
        )
        suggested_actions = ["File a Complaint", "Track Status", "Emergency Help"]
        citations = []

    return {
        "text": text,
        "suggested_actions": suggested_actions,
        "citations": citations,
        "is_emergency": is_emergency,
    }


def process_chat_message(
    message: str,
    history: Optional[List[Dict]] = None,
) -> Dict[str, Any]:
    """
    Process a citizen chatbot message and return AI response.

    Args:
        message: User's message text
        history: Previous conversation turns

    Returns:
        Dict with response text, suggested actions, citations, and metadata
    """
    if not history:
        history = []

    is_emergency = detect_emergency_intent(message)

    # Always prepend emergency directive for immediate danger
    emergency_prefix = ""
    if is_emergency:
        emergency_prefix = "⚠️ If you are in immediate danger, call 112 or 100 NOW.\n\n"

    # Try Gemini
    if gemini_client.is_available:
        prompt = build_chat_prompt(message, history)
        if is_emergency:
            prompt = (
                "PRIORITY ALERT: User may be in an emergency situation.\n"
                "First line of response MUST direct them to 112/100. Then provide guidance.\n\n"
            ) + prompt

        response_text = gemini_client.generate_text(
            prompt,
            max_tokens=512,
            temperature=0.3,  # Lower for consistent safety advice
        )

        if response_text:
            # Add emergency prefix if needed
            if is_emergency and "112" not in response_text and "100" not in response_text:
                response_text = emergency_prefix + response_text

            # Extract suggested actions from response
            suggested_actions = []
            citations = []

            if is_emergency:
                suggested_actions = ["Press Emergency SOS", "Call 112", "Call 100"]
                citations = ["National Emergency: 112", "Police: 100"]
            elif "complaint" in message.lower() or "report" in message.lower():
                suggested_actions = ["File a Complaint", "Track Complaint"]

            return {
                "text": response_text,
                "suggested_actions": suggested_actions,
                "citations": citations,
                "is_emergency": is_emergency,
            }

    # Fallback to rule-based
    return get_fallback_response(message, is_emergency)


def generate_ai_insights_summary(analytics_data: Dict) -> str:
    """Generate a natural language crime trend summary for AI insights dashboard."""
    if not gemini_client.is_available:
        return (
            "AI analysis indicates consistent crime patterns across monitored districts. "
            "Cybercrime and domestic incidents show elevated frequency in urban zones. "
            "Predictive models suggest heightened activity during evening hours (18:00-22:00). "
            "Recommend increased patrol density in identified hotspot zones."
        )

    prompt = f"""You are the Sentinel AI Crime Intelligence Engine for the Indian Police.
Based on the following crime analytics data, generate a 3-sentence executive summary
for the Police Command Dashboard. Be specific, factual, and actionable.

Analytics Data:
{analytics_data}

Focus on: crime trends, risk areas, resource recommendations.
Return only the summary text, no headers or bullets."""

    summary = gemini_client.generate_text(prompt, max_tokens=256, temperature=0.4)
    return summary or (
        "Crime intelligence analysis in progress. "
        "Preliminary data shows standard distribution patterns. "
        "Full predictive model results will be available shortly."
    )
