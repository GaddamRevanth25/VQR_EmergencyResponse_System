"""
CrashEvent SQLAlchemy Model
============================
Stores detected crash events with sensor data, GPS, and resolution status.
"""

import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Float, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from ..core.database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


class CrashEvent(Base):
    __tablename__ = "crash_events"

    id = Column(String(36), primary_key=True, default=_uuid)
    user_id = Column(String(14), ForeignKey("users.id"), nullable=False, index=True)

    # GPS & motion context
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    speed_estimate = Column(Float, nullable=True)  # m/s at time of detection

    # Model inference result
    confidence_score = Column(Float, nullable=False)  # probability from ONNX model

    # Raw 22-feature vector + raw sensor snapshot (for black-box replay)
    sensor_features = Column(JSON, nullable=True)   # the 22-float feature vector
    sensor_snapshot = Column(JSON, nullable=True)    # raw accel/gyro samples

    # Status workflow: ACTIVE → RESOLVED | FALSE_ALARM
    status = Column(String(20), nullable=False, default="ACTIVE", index=True)
    resolved_at = Column(DateTime, nullable=True)
    resolved_by = Column(String(14), nullable=True)  # user_id of resolver

    # Extensible metadata for future: black-box data, insurance claim, dispatch info
    event_metadata = Column(JSON, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    sos_sessions = relationship("SOSSession", back_populates="crash_event")
