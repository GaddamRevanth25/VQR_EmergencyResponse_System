"""
Crash Detection & SOS Pydantic Schemas
=======================================
Request/response models for crash inference, SOS trigger, and session management.
"""

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel
from typing import Optional, List
from datetime import datetime


# ── Crash Detection (ONNX Inference) ────────────────────────────────

class CrashDetectRequest(BaseModel):
    """22-element sensor feature vector for server-side ONNX crash inference."""
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    features: List[float]  # exactly 22 floats


class CrashDetectResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    label: int                  # 0 = no crash, 1 = crash
    probability: float          # crash probability (0.0 – 1.0)
    is_crash: bool


# ── SOS Trigger ─────────────────────────────────────────────────────

class SOSTriggerRequest(BaseModel):
    """Payload sent by mobile app when a crash is confirmed."""
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    latitude: Optional[float] = None
    longitude: Optional[float] = None
    speed_estimate: Optional[float] = None
    confidence_score: float
    sensor_features: Optional[List[float]] = None   # 22-feature vector
    sensor_snapshot: Optional[dict] = None           # raw accel/gyro samples
    metadata: Optional[dict] = None                  # extensible payload


class SOSTriggerResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    sos_session_id: str
    crash_event_id: str
    status: str
    message: str
    contact_notified: Optional[str] = None
    emergency_contact_phone: Optional[str] = None


# ── SOS Session Status / Resolve ────────────────────────────────────

class SOSStatusResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    session_id: str
    crash_event_id: str
    user_id: str
    status: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    confidence_score: Optional[float] = None
    created_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None


class SOSResolveRequest(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    status: str = "RESOLVED"        # RESOLVED | FALSE_ALARM | CANCELLED
    notes: Optional[str] = None


class SOSResolveResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    session_id: str
    status: str
    resolved_at: Optional[datetime] = None
    message: str


# ── Crash Event List (for dashboard) ────────────────────────────────

class CrashEventOut(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)

    id: str
    user_id: str
    user_name: Optional[str] = None
    user_phone: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    speed_estimate: Optional[float] = None
    confidence_score: float
    status: str
    created_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    sensor_features: Optional[List[float]] = None
