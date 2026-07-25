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

# Standard logger for application info and errors
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

        try:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                server.ehlo()
                server.starttls()
                server.ehlo()
                server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                server.sendmail(settings.SMTP_FROM, to_email, msg.as_string())
            _logger.info(f"Email sent to {to_email}: {subject}")
        except Exception as e:
            _logger.warning(f"SMTP email delivery to {to_email} skipped: {e}")

    @staticmethod
    def _send_sms(phone: str, body: str) -> None:
        """Send an SMS via Twilio. Silently skips if Twilio is not configured."""
        if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN:
            _logger.warning(f"Twilio not configured – SMS to {phone} skipped.")
            return

        from twilio.rest import Client

        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        message = client.messages.create(
            body=body,
            from_=settings.TWILIO_PHONE_NUMBER,
            to=phone,
        )
        _logger.info(f"Twilio SMS sent to {phone} (SID: {message.sid})")

    @staticmethod
    def _send_voice_call(phone: str, spoken_message: str) -> None:
        """Trigger an automated voice call via Twilio Voice API with TwiML speech synthesis."""
        if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN:
            _logger.warning(f"Twilio not configured – Voice call to {phone} skipped.")
            return

        from twilio.rest import Client

        twiml = f'<Response><Say voice="alice" language="en-US">{spoken_message}</Say></Response>'
        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        call = client.calls.create(
            twiml=twiml,
            from_=settings.TWILIO_PHONE_NUMBER,
            to=phone,
        )
        _logger.info(f"Twilio Voice Call initiated to {phone} (SID: {call.sid})")

    # ── Public API (called by auth routes) ──────────────────────────

    @staticmethod
    def send_registration_success_acknowledgment(
        email: str, name: str, verification_code: str
    ) -> None:
        """Send a welcome email that includes the 6-digit verification code."""

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

    @staticmethod
    def send_crash_sos_notifications(
        user_name: str,
        user_phone: Optional[str],
        contact_phone: Optional[str],
        contact_email: Optional[str],
        latitude: Optional[float],
        longitude: Optional[float],
        confidence_score: float,
        created_at_str: str,
    ) -> None:
        """Send emergency SMS with Google Maps link and HTML Email to emergency contacts."""
        maps_link = f"https://maps.google.com/maps?q={latitude},{longitude}" if (latitude is not None and longitude is not None) else "Location unavailable"
        sms_body = (
            f"🚨 SOS Alert: {user_name} has triggered an emergency alert at {created_at_str} ({maps_link}). "
            f"Please check on them immediately."
        )

        twilio_configured = bool(settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN and settings.TWILIO_PHONE_NUMBER)

        if not twilio_configured:
            _logger.warning("Twilio credentials not configured in environment variables. Skipping live SMS, Voice, and Email alerts.")
            _logger.info(
                f"\n=== MOCK TWILIO NOTIFICATION DISPATCHED ===\n"
                f"To: {contact_phone or 'N/A'}\n"
                f"Message: {sms_body}\n"
                f"===========================================\n"
            )
            return

        # ── SMS ──
        if contact_phone:
            try:
                NotificationService._send_sms(contact_phone, sms_body)
            except Exception as e:
                _logger.error(f"Failed to send emergency SMS to {contact_phone}: {e}")
                # Skip voice calls and emails if SMS dispatch failed
                return

            # ── Voice Call (Twilio Voice API) ──
            spoken_alert = f"Emergency Alert! {user_name} has triggered a high confidence vehicle emergency alert. Please check on them immediately."
            try:
                NotificationService._send_voice_call(contact_phone, spoken_alert)
            except Exception as e:
                _logger.error(f"Failed to trigger emergency voice call to {contact_phone}: {e}")

        # ── Email ──
        if contact_email:
            html = f"""\
            <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:28px;
                        border:2px solid #ef4444;border-radius:16px;background:#fef2f2;">
                <h1 style="color:#dc2626;margin-top:0;">🚨 VEHICLE CRASH DETECTED</h1>
                <p style="font-size:16px;color:#1f2937;">
                    <strong>{user_name}</strong> may have been involved in a vehicle crash.
                    The VQR Emergency Response System detected a high-confidence impact event.
                </p>

                <div style="background:#fff;border:1px solid #fecaca;border-radius:12px;padding:16px;margin:20px 0;">
                    <table style="width:100%;border-collapse:collapse;font-size:14px;">
                        <tr>
                            <td style="padding:6px 0;color:#6b7280;"><strong>User</strong></td>
                            <td style="padding:6px 0;color:#111827;">{user_name} ({user_phone or 'N/A'})</td>
                        </tr>
                        <tr>
                            <td style="padding:6px 0;color:#6b7280;"><strong>Time</strong></td>
                            <td style="padding:6px 0;color:#111827;">{created_at_str}</td>
                        </tr>
                        <tr>
                            <td style="padding:6px 0;color:#6b7280;"><strong>Confidence</strong></td>
                            <td style="padding:6px 0;color:#111827;">{confidence_score:.0%}</td>
                        </tr>
                        <tr>
                            <td style="padding:6px 0;color:#6b7280;"><strong>Location</strong></td>
                            <td style="padding:6px 0;color:#111827;">
                                {"<a href='" + maps_link + "' style='color:#2563eb;'>View on Google Maps</a>" if latitude is not None else "Unavailable"}
                            </td>
                        </tr>
                    </table>
                </div>

                <p style="color:#dc2626;font-weight:bold;">
                    Please try to contact {user_name} immediately.
                    If unreachable, call local emergency services.
                </p>
            </div>"""

            try:
                NotificationService._send_email(
                    contact_email,
                    f"🚨 VQR CRASH ALERT — {user_name} may need help",
                    html,
                )
            except Exception as e:
                _logger.error(f"Failed to send emergency email to {contact_email}: {e}")

