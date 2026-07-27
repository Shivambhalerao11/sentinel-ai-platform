"""
Email Service supporting Resend API, SendGrid, SMTP, and Console fallback.
Sends HTML OTP verification emails safely without throwing unhandled exceptions.
"""
import json
import smtplib
import urllib.request
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

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
            body {{ font-family: 'Segoe UI', Arial, sans-serif; background-color: #000810; color: #FFFFFF; padding: 20px; }}
            .container {{ max-width: 500px; margin: 0 auto; background: #0A192F; border: 1px solid #D4AF37; border-radius: 16px; padding: 30px; text-align: center; }}
            .logo {{ font-size: 24px; font-weight: 900; color: #D4AF37; letter-spacing: 2px; margin-bottom: 20px; }}
            .otp-box {{ background: rgba(212,175,55,0.1); border: 1px solid #D4AF37; font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #F5E27A; padding: 15px; border-radius: 12px; margin: 25px 0; display: inline-block; width: 80%; }}
            .footer {{ font-size: 11px; color: #8892B0; margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 15px; }}
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">SENTINEL AI PLATFORM</div>
            <h2>Security OTP Code</h2>
            <p>Use the following 6-digit verification code to complete your {purpose.lower().replace('_', ' ')}:</p>
            <div class="otp-box">{otp_code}</div>
            <p style="font-size: 12px; color: #8892B0;">This code is valid for <strong>5 minutes</strong>. Do not share this code with anyone.</p>
            <div class="footer">Official Police & Citizen Security Portal &bull; Encrypted & Confidential</div>
          </div>
        </body>
        </html>
        """

        # 1. Try Resend API if API Key provided
        if settings.RESEND_API_KEY:
            try:
                req = urllib.request.Request(
                    "https://api.resend.com/emails",
                    data=json.dumps({
                        "from": f"{settings.SMTP_FROM_NAME} <onboarding@resend.dev>",
                        "to": [to_email],
                        "subject": subject,
                        "html": html_content,
                    }).encode("utf-8"),
                    headers={
                        "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                        "Content-Type": "application/json",
                    },
                    method="POST",
                )
                with urllib.request.urlopen(req, timeout=10) as response:
                    if response.status in (200, 201):
                        logger.info(f"OTP Email sent successfully via Resend API to {to_email}")
                        return True
            import urllib.error

...

except urllib.error.HTTPError as e:
    body = e.read().decode("utf-8", errors="ignore")
    logger.error(f"Resend API HTTP {e.code}: {body}")

except Exception as e:
    logger.error(f"Resend API email dispatch failed: {e}")

        # 2. Try SMTP if configured
        if settings.SMTP_HOST and settings.SMTP_USER and settings.SMTP_PASSWORD:
            try:
                msg = MIMEMultipart("alternative")
                msg["Subject"] = subject
                msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
                msg["To"] = to_email
                msg.attach(MIMEText(html_content, "html"))

                with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
                    server.starttls()
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                    server.sendmail(settings.SMTP_FROM_EMAIL, [to_email], msg.as_string())
                logger.info(f"OTP Email sent via SMTP to {to_email}")
                return True
            except Exception as e:
                logger.error(f"SMTP email dispatch failed: {e}")

        # 3. Fallback / Dev mode: Log to console safely
        logger.info(f"[DEV EMAIL DISPATCH] OTP Code for {to_email} ({purpose}): {otp_code}")
        return True


email_service = EmailService()
