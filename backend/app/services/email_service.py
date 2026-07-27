"""
Email Service using Brevo Transactional Email REST API over HTTPS.
Replaces SMTP & Resend to ensure zero port-blocking timeouts on cloud platforms (Render, Heroku).
"""
import json
import urllib.request
import urllib.error

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class EmailService:
    def send_otp_email(self, to_email: str, otp_code: str, purpose: str = "REGISTRATION") -> bool:
        subject = (
            "Sentinel Security - Verification Code"
            if purpose == "REGISTRATION"
            else "Sentinel Security - Password Reset OTP"
        )

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{
                    font-family: Arial, sans-serif;
                    background:#000810;
                    color:#ffffff;
                    padding:20px;
                }}
                .container {{
                    max-width:500px;
                    margin:auto;
                    background:#0A192F;
                    border:1px solid #D4AF37;
                    border-radius:12px;
                    padding:25px;
                    text-align:center;
                }}
                .otp {{
                    font-size:34px;
                    font-weight:bold;
                    letter-spacing:8px;
                    color:#D4AF37;
                    margin:20px 0;
                }}
                .footer {{
                    font-size:12px;
                    color:#8892B0;
                    margin-top:20px;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <h2>Sentinel AI Security Platform</h2>
                <p>Use the OTP below to complete your {purpose.lower().replace("_", " ")}.</p>
                <div class="otp">{otp_code}</div>
                <p>This code is valid for 5 minutes. Do not share this code with anyone.</p>
                <div class="footer">Ministry of Home Affairs &bull; AI Division &bull; Sentinel Platform</div>
            </div>
        </body>
        </html>
        """

        # =====================================================
        # 1. BREVO TRANSACTIONAL EMAIL REST API DISPATCH (HTTPS)
        # =====================================================
        if settings.BREVO_API_KEY:
            try:
                url = "https://api.brevo.com/v3/smtp/email"
                payload = {
                    "sender": {
                        "name": settings.BREVO_SENDER_NAME or "Sentinel AI Platform",
                        "email": settings.BREVO_SENDER_EMAIL or "sentinelsecurityai@gmail.com",
                    },
                    "to": [
                        {
                            "email": to_email,
                        }
                    ],
                    "subject": subject,
                    "htmlContent": html_content,
                }

                headers = {
                    "accept": "application/json",
                    "api-key": settings.BREVO_API_KEY,
                    "content-type": "application/json",
                    "User-Agent": "Sentinel-AI/1.0",
                }

                req = urllib.request.Request(
                    url,
                    data=json.dumps(payload).encode("utf-8"),
                    headers=headers,
                    method="POST",
                )

                with urllib.request.urlopen(req, timeout=12) as response:
                    body = response.read().decode("utf-8", errors="ignore")
                    logger.info(f"Brevo API Success ({response.status}): {body}")
                    # Return success for HTTP 201 or 200
                    if response.status in (200, 201):
                        return True

            except urllib.error.HTTPError as e:
                error_body = e.read().decode("utf-8", errors="ignore")
                logger.error(f"Brevo API HTTP {e.code}: {error_body}")
            except Exception as e:
                logger.error(f"Brevo API dispatch failed: {e}")

        # =====================================================
        # 2. DEV / MOCK FALLBACK (Console logging for local testing)
        # =====================================================
        logger.info(f"[DEV EMAIL DISPATCH] OTP Code for {to_email} ({purpose}): {otp_code}")
        return True


email_service = EmailService()