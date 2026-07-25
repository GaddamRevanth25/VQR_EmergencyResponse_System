import os
import logging
from twilio.rest import Client

logger = logging.getLogger("uvicorn.error")

class TwilioService:
    @staticmethod
    def send_sms(to_number: str, message: str) -> bool:
        """
        Sends an SMS message using the Twilio API.
        If credentials are not found in the environment, it falls back to a development mockup.
        """
        account_sid = os.getenv("TWILIO_ACCOUNT_SID")
        auth_token = os.getenv("TWILIO_AUTH_TOKEN")
        from_number = os.getenv("TWILIO_PHONE_NUMBER")

        # Fallback Mock Mode: If env vars are empty/missing, log and simulate success
        if not account_sid or not auth_token or not from_number:
            logger.warning(
                "Twilio credentials not fully set up in environment variables. "
                "Simulating SMS delivery (Dev/Trial Mode)."
            )
            logger.info(
                f"\n=== MOCK TWILIO MESSAGE SENT ===\n"
                f"To: {to_number}\n"
                f"Message: {message}\n"
                f"=================================\n"
            )
            return True

        # Live Mode
        try:
            # E.164 normalization checks
            clean_to = to_number.strip().replace(" ", "")
            if not clean_to.startswith("+"):
                # Default to Indian country code +91 if code is missing and it's 10 digits
                if len(clean_to) == 10:
                    clean_to = f"+91{clean_to}"
                else:
                    raise ValueError(f"Invalid phone number format: '{to_number}'. Must be in E.164 format (e.g. +91XXXXXXXXXX).")

            client = Client(account_sid, auth_token)
            client.messages.create(
                body=message,
                from_=from_number,
                to=clean_to
            )
            logger.info(f"Twilio SMS dispatched successfully to {clean_to}")
            return True
        except Exception as e:
            # SECURITY: Do not print or bubble up the raw auth_token in logs or errors
            err_msg = str(e)
            if auth_token and auth_token in err_msg:
                err_msg = err_msg.replace(auth_token, "********")
            logger.error(f"Twilio API request failed: {err_msg}")
            raise Exception(f"Twilio dispatch error: {err_msg}")
