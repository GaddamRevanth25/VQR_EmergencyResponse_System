import os
import logging
import re
from twilio.rest import Client

logger = logging.getLogger("uvicorn.error")

class TwilioService:
    @staticmethod
    def normalize_phone(phone_str: str) -> str:
        """Normalize any phone number string into strict E.164 format (+91XXXXXXXXXX)."""
        if not phone_str:
            return ""
        clean = phone_str.strip().replace(" ", "")
        if clean.startswith("+"):
            return clean

        digits = "".join(filter(str.isdigit, clean))
        if not digits:
            return ""

        # Handle Indian phone numbers
        if digits.startswith("91") and len(digits) == 12:
            return f"+{digits}"
        if len(digits) >= 10:
            # Strip trailing extra digits or leading non-country digits
            ten_digits = digits[:10] if not digits.startswith("91") else digits[2:12]
            return f"+91{ten_digits}"

        return f"+{digits}"

    @staticmethod
    def send_sms(to_number: str, message: str) -> bool:
        """
        Sends an SMS message using the Twilio API or Twilio Verify Service.
        Falls back to dev mock mode if Account SID and Auth Token are missing.
        """
        from ..core.config import settings
        account_sid = (settings.TWILIO_ACCOUNT_SID or os.getenv("TWILIO_ACCOUNT_SID") or "").strip()
        auth_token = (settings.TWILIO_AUTH_TOKEN or os.getenv("TWILIO_AUTH_TOKEN") or "").strip()
        from_number = (settings.TWILIO_PHONE_NUMBER or os.getenv("TWILIO_PHONE_NUMBER") or "").strip()
        verify_sid = (settings.TWILIO_VERIFY_SERVICE_SID or os.getenv("TWILIO_VERIFY_SERVICE_SID") or "").strip()

        # Fallback Mock Mode if Account SID or Auth Token are missing
        if not account_sid or not auth_token:
            logger.warning(
                "Twilio credentials (ACCOUNT_SID / AUTH_TOKEN) not set in environment. "
                "Simulating SMS delivery (Dev/Trial Mode)."
            )
            logger.info(
                f"\n=== MOCK TWILIO MESSAGE SENT ===\n"
                f"To: {to_number}\n"
                f"Message: {message}\n"
                f"=================================\n"
            )
            return True

        clean_to = TwilioService.normalize_phone(to_number)
        if not clean_to:
            logger.error(f"Cannot send Twilio SMS – invalid recipient phone number: '{to_number}'")
            return False

        client = Client(account_sid, auth_token)

        # Method 1: Send via Twilio Messages API if TWILIO_PHONE_NUMBER is configured
        if from_number:
            try:
                if from_number.startswith("MG"):
                    msg = client.messages.create(
                        body=message,
                        messaging_service_sid=from_number,
                        to=clean_to
                    )
                else:
                    msg = client.messages.create(
                        body=message,
                        from_=from_number,
                        to=clean_to
                    )
                logger.info(f"📲 Twilio SMS dispatched via Messages API to {clean_to} (SID: {msg.sid})")
                return True
            except Exception as e:
                logger.warning(f"Twilio Messages API failed: {e}. Trying Verify Service...")

        # Method 2: Send via Twilio Verify Service API if TWILIO_VERIFY_SERVICE_SID is configured
        if verify_sid:
            try:
                if verify_sid.startswith("MG"):
                    msg = client.messages.create(
                        body=message,
                        messaging_service_sid=verify_sid,
                        to=clean_to
                    )
                    logger.info(f"📲 Twilio SMS dispatched via Messaging Service {verify_sid} to {clean_to} (SID: {msg.sid})")
                    return True
                else:
                    # Extract 6-digit OTP code from message if present
                    code_match = re.search(r'\b\d{6}\b', message)
                    custom_code = code_match.group(0) if code_match else None

                    verif = None
                    if custom_code:
                        try:
                            verif = client.verify.v2.services(verify_sid).verifications.create(
                                to=clean_to,
                                channel="sms",
                                custom_code=custom_code
                            )
                            logger.info(f"📲 Twilio Verify SMS triggered to {clean_to} with custom_code {custom_code} (Status: {verif.status})")
                        except Exception as custom_err:
                            logger.warning(f"Twilio custom_code dispatch failed ({custom_err}). Falling back to standard Twilio Verify dispatch...")

                    if not verif:
                        verif = client.verify.v2.services(verify_sid).verifications.create(
                            to=clean_to,
                            channel="sms"
                        )
                        logger.info(f"📲 Twilio Verify SMS triggered to {clean_to} (Status: {verif.status}, SID: {verif.sid})")

                    return True
            except Exception as e:
                err_msg = str(e)
                if auth_token and auth_token in err_msg:
                    err_msg = err_msg.replace(auth_token, "********")
                logger.error(f"Twilio Verify Service API error for {clean_to}: {err_msg}")
                raise Exception(f"Twilio dispatch error: {err_msg}")

        # Method 3: Fallback if neither from_number nor verify_sid is set
        logger.warning(
            f"Twilio credentials present but neither TWILIO_PHONE_NUMBER nor TWILIO_VERIFY_SERVICE_SID is configured. "
            f"Simulating dispatch for {clean_to}: '{message}'"
        )
        return True

    @staticmethod
    def verify_otp(to_number: str, code: str) -> bool:
        """
        Check if the OTP code is valid via Twilio Verify Service API.
        Returns True if approved by Twilio, False otherwise.
        """
        from ..core.config import settings
        account_sid = (settings.TWILIO_ACCOUNT_SID or os.getenv("TWILIO_ACCOUNT_SID") or "").strip()
        auth_token = (settings.TWILIO_AUTH_TOKEN or os.getenv("TWILIO_AUTH_TOKEN") or "").strip()
        verify_sid = (settings.TWILIO_VERIFY_SERVICE_SID or os.getenv("TWILIO_VERIFY_SERVICE_SID") or "").strip()

        if not account_sid or not auth_token or not verify_sid or not verify_sid.startswith("VA"):
            return False

        clean_to = TwilioService.normalize_phone(to_number)
        clean_code = code.strip()
        if not clean_to or not clean_code:
            return False

        try:
            client = Client(account_sid, auth_token)
            check = client.verify.v2.services(verify_sid).verification_checks.create(
                to=clean_to,
                code=clean_code
            )
            logger.info(f"🔍 Twilio Verify Check for {clean_to} (code: {clean_code}): status={check.status}")
            return check.status == "approved" or getattr(check, "valid", False) is True
        except Exception as e:
            logger.warning(f"Twilio Verify Check attempt for {clean_to} ({clean_code}) finished: {e}")
            return False
