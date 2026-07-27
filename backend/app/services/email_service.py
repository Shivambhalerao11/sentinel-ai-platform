"""
Email Service supporting Gmail SMTP, custom SMTP, Resend API, and Console fallback.
Priority:
1. SMTP (Gmail/Brevo/Custom) - Allows sending OTPs to ANY user's email for FREE.
2. Resend API - Fallback if a custom domain is configured.
3. Development Fallback - Console log for offline/local testing.
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
        # 1. SMTP DISPATCH (Gmail, Brevo, SendGrid, Custom SMTP)
        # Allows sending OTP to ANY email address (Gmail, Yahoo, Outlook, etc.)
        # =====================================================
        if settings.SMTP_HOST and settings.SMTP_USER and settings.SMTP_PASSWORD:
            try:
                msg = MIMEMultipart("alternative")
                msg["Subject"] = subject
                from_email = settings.SMTP_FROM_EMAIL or settings.SMTP_USER
                from_name = settings.SMTP_FROM_NAME or "Sentinel Security"
                msg["From"] = f"{from_name} <{from_email}>"
                msg["To"] = to_email

                msg.attach(MIMEText(html_content, "html"))

                port = int(settings.SMTP_PORT or 587)
                if port == 465:
                    server = smtplib.SMTP_SSL(settings.SMTP_HOST, port, timeout=10)
                else:
                    server = smtplib.SMTP(settings.SMTP_HOST, port, timeout=10)
                    if getattr(settings, "SMTP_USE_TLS", True):
                        server.starttls()

                with server:
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                    server.sendmail(from_email, [to_email], msg.as_string())

                logger.info(f"Successfully sent OTP email via SMTP ({settings.SMTP_HOST}) to {to_email}")
                return True
            except Exception as e:
                logger.exception(f"SMTP dispatch failed: {e}")

        # =====================================================
        # 2. RESEND API DISPATCH
        # Used if RESEND_API_KEY is configured
        # =====================================================
        if settings.RESEND_API_KEY:
            try:
                from_address = f"{settings.SMTP_FROM_NAME} <onboarding@resend.dev>"
                if settings.SMTP_FROM_EMAIL and "resend.dev" not in settings.SMTP_FROM_EMAIL:
                    from_address = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"

                payload = {
                    "from": from_address,
                    "to": [to_email],
                    "subject": subject,
                    "html": html_content,
                }

                req = urllib.request.Request(
                    "https://api.resend.com/emails",
                    data=json.dumps(payload).encode("utf-8"),
                    headers={
                        "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                        "User-Agent": "Sentinel-AI/1.0",
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
                logger.error(f"Resend API dispatch failed: {e}")

        # =====================================================
        # 3. DEV / MOCK FALLBACK
        # Logs OTP to console for local testing or when email services are unconfigured
        # =====================================================
        logger.info(f"[DEV EMAIL DISPATCH] OTP Code for {to_email} ({purpose}): {otp_code}")
        return True


email_service = EmailService()