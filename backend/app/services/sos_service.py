<<<<<<< HEAD
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
=======
"""
SOS Service
============
Manages the lifecycle of SOS sessions triggered by crash events.
Creates crash records, SOS sessions, and dispatches emergency notifications.
"""

import logging
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from ..models.crash_event import CrashEvent
from ..models.sos_session import SOSSession
from ..models.user import User
from ..services.notification_service import NotificationService

logger = logging.getLogger("uvicorn.error")


class SOSService:
    """Static helpers for SOS session lifecycle management."""

    # In-memory rate limiting dictionary for SOS triggers (60-second cooldown per user)
    _last_sos_timestamps: dict = {}

>>>>>>> 95a0c49c6f766b59d1bd9079267c26ece4556928
    @staticmethod
    def trigger_sos(
        db: Session,
        user: User,
<<<<<<< HEAD
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
=======
        latitude: Optional[float],
        longitude: Optional[float],
        speed_estimate: Optional[float],
        confidence_score: float,
        sensor_features: Optional[list] = None,
        sensor_snapshot: Optional[dict] = None,
        metadata: Optional[dict] = None,
    ) -> tuple:
        """
        Create a CrashEvent + SOSSession and notify emergency contacts.
        Returns (crash_event, sos_session).
        """
        now = datetime.utcnow()

        # 0. Cooldown Rate Limiting (60 seconds)
        if user.id in SOSService._last_sos_timestamps:
            last_time = SOSService._last_sos_timestamps[user.id]
            elapsed = (now - last_time).total_seconds()
            if elapsed < 60:
                from fastapi import HTTPException
                raise HTTPException(
                    status_code=429,
                    detail=f"Emergency SOS alert on cooldown. Please wait {int(60 - elapsed)}s before re-triggering."
                )

        SOSService._last_sos_timestamps[user.id] = now
        # 1. Create crash event record
        crash_event = CrashEvent(
            user_id=user.id,
            latitude=latitude,
            longitude=longitude,
            speed_estimate=speed_estimate,
            confidence_score=confidence_score,
            sensor_features=sensor_features,
            sensor_snapshot=sensor_snapshot,
            status="ACTIVE",
            event_metadata=metadata,
        )
        db.add(crash_event)
        db.flush()  # get the generated ID

        # 2. Create SOS session
        sos_session = SOSSession(
            crash_event_id=crash_event.id,
            user_id=user.id,
            status="ACTIVE",
        )
        db.add(sos_session)
        db.commit()
        db.refresh(crash_event)
        db.refresh(sos_session)

        # 3. Notify emergency contacts
        try:
            SOSService._notify_emergency_contacts(user, crash_event)
        except Exception as e:
            logger.error(f"SOSService: Failed to send emergency notifications: {e}")

        logger.info(
            f"SOSService: SOS triggered for user {user.id} "
            f"(crash={crash_event.id}, session={sos_session.id})"
        )

        return crash_event, sos_session

    @staticmethod
    def _notify_emergency_contacts(user: User, crash_event: CrashEvent):
        """Send SMS and email to the user's registered emergency contact via NotificationService."""
        created_at_str = crash_event.created_at.strftime('%Y-%m-%d %H:%M UTC') if crash_event.created_at else 'Now'
        NotificationService.send_crash_sos_notifications(
            user_name=user.name,
            user_phone=user.phone,
            contact_phone=user.emergency_contact_phone,
            contact_email=getattr(user, "emergency_contact_email", None) or user.email,
            latitude=crash_event.latitude,
            longitude=crash_event.longitude,
            confidence_score=crash_event.confidence_score,
            created_at_str=created_at_str,
        )

    @staticmethod
    def get_session_status(db: Session, session_id: str) -> Optional[dict]:
        """Get the current status of an SOS session."""
        sos = db.query(SOSSession).filter(SOSSession.id == session_id).first()
        if not sos:
            return None

        crash = db.query(CrashEvent).filter(CrashEvent.id == sos.crash_event_id).first()

        return {
            "session_id": sos.id,
            "crash_event_id": sos.crash_event_id,
            "user_id": sos.user_id,
            "status": sos.status,
            "latitude": crash.latitude if crash else None,
            "longitude": crash.longitude if crash else None,
            "confidence_score": crash.confidence_score if crash else None,
            "created_at": sos.created_at,
            "resolved_at": sos.resolved_at,
        }

    @staticmethod
    def resolve_session(
        db: Session,
        session_id: str,
        status: str = "RESOLVED",
        notes: Optional[str] = None,
        resolved_by: Optional[str] = None,
    ) -> Optional[dict]:
        """Resolve/close an SOS session."""
        sos = db.query(SOSSession).filter(SOSSession.id == session_id).first()
        if not sos:
            return None

        now = datetime.utcnow()
        sos.status = status
        sos.notes = notes
        sos.resolved_at = now

        # Also update the crash event status
        crash = db.query(CrashEvent).filter(CrashEvent.id == sos.crash_event_id).first()
        if crash:
            crash.status = status
            crash.resolved_at = now
            if resolved_by:
                crash.resolved_by = resolved_by

        db.commit()
        db.refresh(sos)

        return {
            "session_id": sos.id,
            "status": sos.status,
            "resolved_at": sos.resolved_at,
        }

    @staticmethod
    def list_crash_events(db: Session, limit: int = 50) -> list:
        """List recent crash events with user info for the dashboard."""
        events = (
            db.query(CrashEvent)
            .order_by(CrashEvent.created_at.desc())
            .limit(limit)
            .all()
        )

        result = []
        for ev in events:
            user = db.query(User).filter(User.id == ev.user_id).first()
            result.append({
                "id": ev.id,
                "user_id": ev.user_id,
                "user_name": user.name if user else None,
                "user_phone": user.phone if user else None,
                "latitude": ev.latitude,
                "longitude": ev.longitude,
                "speed_estimate": ev.speed_estimate,
                "confidence_score": ev.confidence_score,
                "status": ev.status,
                "created_at": ev.created_at,
                "resolved_at": ev.resolved_at,
                "sensor_features": ev.sensor_features,
            })

        return result
>>>>>>> 95a0c49c6f766b59d1bd9079267c26ece4556928
