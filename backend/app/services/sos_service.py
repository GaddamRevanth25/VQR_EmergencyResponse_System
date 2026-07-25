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

    @staticmethod
    def trigger_sos(
        db: Session,
        user: User,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        speed_estimate: Optional[float] = None,
        confidence_score: float = 1.0,
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
