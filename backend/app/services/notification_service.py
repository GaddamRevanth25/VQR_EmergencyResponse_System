"""
Notification Service
====================
Sends emails via SMTP and SMS via Twilio.
All verification codes / OTPs are also written to ``logs/auth_codes.log``
so they can be recovered during development even when delivery fails.
"""

import logging
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from logging.handlers import RotatingFileHandler
from typing import Optional

from ..core.config import settings

# ── Auth-code file logger ───────────────────────────────────────────
_LOG_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "logs")
os.makedirs(_LOG_DIR, exist_ok=True)

_code_logger = logging.getLogger("auth_codes")
_code_logger.setLevel(logging.INFO)
_code_logger.propagate = False  # don't echo to uvicorn root logger

if not _code_logger.handlers:
    _handler = RotatingFileHandler(
        os.path.join(_LOG_DIR, "auth_codes.log"),
        maxBytes=5 * 1024 * 1024,  # 5 MB
        backupCount=3,
    )
    _handler.setFormatter(logging.Formatter("%(asctime)s | %(message)s", datefmt="%Y-%m-%d %H:%M:%S"))
    _code_logger.addHandler(_handler)

# Standard logger for errors
_logger = logging.getLogger("uvicorn.error")


class NotificationService:
    """Static helper methods for email / SMS notifications."""

    # ── Private Helpers ─────────────────────────────────────────────

    @staticmethod
    def _send_email(to_email: str, subject: str, html_body: str) -> None:
        """Send an email via SMTP (Gmail TLS)."""
        msg = MIMEMultipart("alternative")
        msg["From"] = settings.SMTP_FROM
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_FROM, to_email, msg.as_string())

        _logger.info(f"Email sent to {to_email}: {subject}")

    @staticmethod
    def _send_sms(phone: str, body: str) -> None:
        """Send an SMS via Twilio. Silently skips if Twilio is not configured."""
        if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN:
            _logger.warning(f"Twilio not configured – SMS to {phone} skipped.")
            return

        from twilio.rest import Client

        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        client.messages.create(
            body=body,
            from_=settings.TWILIO_PHONE_NUMBER,
            to=phone,
        )
        _logger.info(f"SMS sent to {phone}")

    # ── Public API (called by auth routes) ──────────────────────────

    @staticmethod
    def send_registration_success_acknowledgment(
        email: str, name: str, verification_code: str
    ) -> None:
        """Send a welcome email that includes the 6-digit verification code."""
        _code_logger.info(f"VERIFICATION | {email} | Code: {verification_code}")

        html = f"""\
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;
                    border:1px solid #e0e0e0;border-radius:12px;">
            <h2 style="color:#1a73e8;">Welcome to VQR Emergency Response, {name}!</h2>
            <p>Your account has been created. Please verify your email address using the code below:</p>
            <div style="text-align:center;margin:24px 0;">
                <span style="font-size:32px;letter-spacing:8px;font-weight:700;
                             color:#202124;background:#f1f3f4;padding:12px 24px;
                             border-radius:8px;">{verification_code}</span>
            </div>
            <p style="color:#5f6368;font-size:13px;">This code expires in <b>10 minutes</b>.
               If you didn't create this account, you can safely ignore this email.</p>
        </div>"""

        NotificationService._send_email(email, "VQR – Verify Your Email Address", html)

    @staticmethod
    def send_2fa_code(
        email: str, phone: Optional[str], code: str
    ) -> None:
        """Send 2FA verification code via email and (optionally) SMS."""
        _code_logger.info(f"2FA          | {email} | Code: {code}")

        html = f"""\
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;
                    border:1px solid #e0e0e0;border-radius:12px;">
            <h2 style="color:#1a73e8;">Two-Factor Authentication</h2>
            <p>Your 2FA verification code is:</p>
            <div style="text-align:center;margin:24px 0;">
                <span style="font-size:32px;letter-spacing:8px;font-weight:700;
                             color:#202124;background:#f1f3f4;padding:12px 24px;
                             border-radius:8px;">{code}</span>
            </div>
            <p style="color:#5f6368;font-size:13px;">This code expires in <b>5 minutes</b>.</p>
        </div>"""

        NotificationService._send_email(email, "VQR – Your 2FA Code", html)

        if phone:
            try:
                NotificationService._send_sms(
                    phone, f"VQR 2FA Code: {code}. Expires in 5 minutes."
                )
            except Exception as e:
                _logger.error(f"Failed to send 2FA SMS to {phone}: {e}")

    @staticmethod
    def send_sms_otp(phone: str, otp_code: str) -> None:
        """Send a phone-login OTP via SMS."""
        _code_logger.info(f"OTP          | {phone} | Code: {otp_code}")

        try:
            NotificationService._send_sms(
                phone, f"VQR Login OTP: {otp_code}. Expires in 5 minutes."
            )
        except Exception as e:
            _logger.error(f"Failed to send OTP SMS to {phone}: {e}")

    @staticmethod
    def send_email_login_alert(email: str) -> None:
        """Send a login-alert notification email."""
        from datetime import datetime

        now = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
        html = f"""\
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;
                    border:1px solid #e0e0e0;border-radius:12px;">
            <h2 style="color:#1a73e8;">Login Alert</h2>
            <p>A new login was detected on your VQR Emergency Response account at <b>{now}</b>.</p>
            <p style="color:#5f6368;font-size:13px;">If this wasn't you, please secure your account immediately.</p>
        </div>"""

        NotificationService._send_email(email, "VQR – New Login Detected", html)
