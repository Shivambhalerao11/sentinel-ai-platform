"""
Email Service supporting Resend API, SMTP, and Console fallback.
"""

import json
import smtplib
import urllib.request
import urllib.error
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

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
            </style>
        </head>
        <body>
            <div class="container">
                <h2>Sentinel AI Platform</h2>

                <p>
                    Use the OTP below to complete your
                    {purpose.lower().replace("_", " ")}.
                </p>

                <div class="otp">{otp_code}</div>

                <p>
                    This OTP is valid for 5 minutes.
                </p>
            </div>
        </body>
        </html>
        """

        # =====================================================
        # 1. RESEND API
        # =====================================================
        if settings.RESEND_API_KEY:
            try:
                payload = {
                    "from": f"{settings.SMTP_FROM_NAME} <onboarding@resend.dev>",
                    "to": [to_email],
                    "subject": subject,
                    "html": html_content,
                }

                logger.info(f"Sending Resend payload: {payload}")

                req = urllib.request.Request(
                    "https://api.resend.com/emails",
                    data=json.dumps(payload).encode("utf-8"),
                    headers={
                        "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                        "User-Agent": "Mozilla/5.0",
                    },
                    method="POST",
                )

                with urllib.request.urlopen(req, timeout=10) as response:
                    body = response.read().decode("utf-8", errors="ignore")
                    logger.info(f"Resend Success ({response.status}): {body}")
                    return True

            except urllib.error.HTTPError as e:
                error_body = e.read().decode("utf-8", errors="ignore")
                logger.error(f"Resend API HTTP {e.code}: {error_body}")

            except Exception as e:
                logger.exception(f"Resend API email dispatch failed: {e}")

        # =====================================================
        # 2. SMTP
        # =====================================================
        if (
            settings.SMTP_HOST
            and settings.SMTP_USER
            and settings.SMTP_PASSWORD
        ):
            try:
                msg = MIMEMultipart("alternative")
                msg["Subject"] = subject
                msg["From"] = (
                    f"{settings.SMTP_FROM_NAME} "
                    f"<{settings.SMTP_FROM_EMAIL}>"
                )
                msg["To"] = to_email

                msg.attach(MIMEText(html_content, "html"))

                with smtplib.SMTP(
                    settings.SMTP_HOST,
                    settings.SMTP_PORT,
                    timeout=10,
                ) as server:
                    server.starttls()
                    server.login(
                        settings.SMTP_USER,
                        settings.SMTP_PASSWORD,
                    )

                    server.sendmail(
                        settings.SMTP_FROM_EMAIL,
                        [to_email],
                        msg.as_string(),
                    )

                logger.info(f"SMTP email sent to {to_email}")

                return True

            except Exception as e:
                logger.exception(
                    f"SMTP email dispatch failed: {e}"
                )

        # =====================================================
        # 3. DEV FALLBACK
        # =====================================================
        logger.info(
            f"[DEV EMAIL DISPATCH] OTP Code for {to_email} ({purpose}): {otp_code}"
        )

        return True


email_service = EmailService()