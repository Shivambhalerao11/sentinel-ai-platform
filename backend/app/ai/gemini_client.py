"""
Gemini AI client wrapper.
Handles initialization, retry logic, and error handling.
"""
import json
import time
from typing import Any, Dict, Optional

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class GeminiClient:
    """
    Thread-safe Gemini API client.
    Initialized once at application startup, reused across requests.
    """

    def __init__(self):
        self._client = None
        self._available = False
        self._initialize()

    def _initialize(self) -> None:
        if not settings.GEMINI_API_KEY:
            logger.warning("GEMINI_API_KEY not set. AI features will use heuristic fallback.")
            return
        try:
            import google.generativeai as genai
            genai.configure(api_key=settings.GEMINI_API_KEY)
            self._client = genai.GenerativeModel(settings.GEMINI_MODEL)
            self._available = True
            logger.info("Gemini AI client initialized", model=settings.GEMINI_MODEL)
        except Exception as e:
            logger.error("Failed to initialize Gemini client", error=str(e))
            self._available = False

    @property
    def is_available(self) -> bool:
        return self._available

    def generate_json(
        self,
        prompt: str,
        schema_description: Optional[str] = None,
        max_retries: int = 3,
    ) -> Optional[Dict[str, Any]]:
        """
        Generate structured JSON from a prompt.
        Returns parsed dict on success, None on failure.
        """
        if not self._available or self._client is None:
            return None

        full_prompt = prompt
        if schema_description:
            full_prompt += f"\n\nReturn ONLY valid JSON matching this structure:\n{schema_description}"
        full_prompt += "\n\nIMPORTANT: Return ONLY the raw JSON object. No markdown, no code blocks, no explanation."

        for attempt in range(1, max_retries + 1):
            try:
                response = self._client.generate_content(
                    full_prompt,
                    generation_config={
                        "temperature": 0.1,  # Low temperature for consistent structured output
                        "top_p": 0.8,
                        "max_output_tokens": 2048,
                        "response_mime_type": "application/json",
                    },
                )
                if response and response.text:
                    # Clean response and parse JSON
                    raw = response.text.strip()
                    if raw.startswith("```"):
                        raw = raw.split("```")[1]
                        if raw.startswith("json"):
                            raw = raw[4:]
                        raw = raw.strip()
                    return json.loads(raw)
            except json.JSONDecodeError as e:
                logger.warning(
                    "Gemini response JSON parse error",
                    attempt=attempt,
                    error=str(e),
                )
            except Exception as e:
                logger.error(
                    "Gemini API call failed",
                    attempt=attempt,
                    error=str(e),
                )
                if attempt < max_retries:
                    time.sleep(2 ** attempt)  # Exponential backoff

        return None

    def generate_text(
        self,
        prompt: str,
        max_tokens: int = 1024,
        temperature: float = 0.7,
    ) -> Optional[str]:
        """Generate free-form text response."""
        if not self._available or self._client is None:
            return None

        try:
            response = self._client.generate_content(
                prompt,
                generation_config={
                    "temperature": temperature,
                    "max_output_tokens": max_tokens,
                },
            )
            if response and response.text:
                return response.text.strip()
        except Exception as e:
            logger.error("Gemini text generation failed", error=str(e))

        return None


# Singleton instance - initialized at import time
gemini_client = GeminiClient()
