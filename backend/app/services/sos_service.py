import time
import threading
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from ..models.user import User
from .twilio_service import TwilioService

# In-memory thread-safe rate-limiting tracker
# Stores {user_id: last_sos_trigger_timestamp}
_cooldown_tracker = {}
_cooldown_lock = threading.Lock()

class SOSService:
    @staticmethod
    def trigger_sos(
        db: Session,
        user: User,
        latitude: float | None = None,
        longitude: float | None = None
    ) -> dict:
        """
        Coordinates the SOS alert dispatch flow:
        1. Ensures the user has an emergency contact configured.
        2. Implements a 60-second cooldown window to prevent spam.
        3. Constructs a message detailing user, time, and optional geolocation.
        4. Calls Twilio service to dispatch the SMS.
        """
        # 1. Verify User Emergency Details
        contact_phone = user.emergency_contact_phone
        contact_name = user.emergency_contact_name or "Emergency Contact"

        if not contact_phone or not contact_phone.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No emergency contact number configured. Please update your profile settings before triggering SOS."
            )

        # 2. Cooldown check (60-second window)
        current_time = time.time()
        user_id = user.id

        with _cooldown_lock:
            last_triggered = _cooldown_tracker.get(user_id, 0.0)
            elapsed = current_time - last_triggered
            if elapsed < 60.0:
                remaining = int(60.0 - elapsed)
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"SOS alert triggered too recently. Please wait {remaining} seconds before requesting another alert."
                )
            # Update cooldown timestamp
            _cooldown_tracker[user_id] = current_time

        # 3. Message Construction
        time_str = time.strftime("%I:%M %p", time.localtime(current_time))
        
        location_info = ""
        if latitude is not None and longitude is not None:
            # Generate a clickable Google Maps link
            location_info = f" at location: https://maps.google.com/?q={latitude},{longitude}"
        else:
            location_info = " (location details not available)"

        message_body = (
            f"🚨 VQR CRITICAL SOS ALERT 🚨\n"
            f"Your emergency contact, {user.name}, has triggered an SOS panic signal at {time_str}{location_info}.\n"
            f"Please check on them immediately."
        )

        # 4. Dispatch SMS
        try:
            TwilioService.send_sms(contact_phone, message_body)
        except Exception as e:
            # If Twilio throws, clear the cooldown tracker so they can immediately retry after fixing credentials/network
            with _cooldown_lock:
                if user_id in _cooldown_tracker:
                    del _cooldown_tracker[user_id]
            
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Emergency dispatch failed. Twilio reports: {str(e)}"
            )

        return {
            "success": True,
            "message": "Critical SOS signal successfully dispatched to emergency services and contacts.",
            "contact_name": contact_name,
            "contact_phone": contact_phone
        }
