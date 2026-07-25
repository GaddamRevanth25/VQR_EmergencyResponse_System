"""
SOSSession SQLAlchemy Model
============================
Tracks the lifecycle of an emergency SOS session triggered by a crash event.
"""

import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from ..core.database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


class SOSSession(Base):
    __tablename__ = "sos_sessions"

    id = Column(String(36), primary_key=True, default=_uuid)
    crash_event_id = Column(String(36), ForeignKey("crash_events.id"), nullable=False, index=True)
    user_id = Column(String(14), ForeignKey("users.id"), nullable=False, index=True)

    # Lifecycle: ACTIVE → RESOLVED | CANCELLED | DISPATCHED_POLICE | DISPATCHED_AMBULANCE | DISPATCHED_TOW
    status = Column(String(30), nullable=False, default="ACTIVE", index=True)
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)

    # Relationships
    crash_event = relationship("CrashEvent", back_populates="sos_sessions")
    user = relationship("User", foreign_keys=[user_id])
