"""
Crash Detection & SOS API Routes
==================================
Endpoints for server-side ONNX crash inference, SOS session management,
and SSE streaming for the web dashboard.
"""

import asyncio
import json
import logging
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from ...core.database import get_db
from ...models.user import User
from ...models.crash_event import CrashEvent
from ...models.sos_session import SOSSession
from ..deps import get_current_user
from ...schemas.crash import (
    CrashDetectRequest,
    CrashDetectResponse,
    SOSTriggerRequest,
    SOSTriggerResponse,
    SOSStatusResponse,
    SOSResolveRequest,
    SOSResolveResponse,
    CrashEventOut,
)
from ...services.crash_detection_service import crash_detection_service
from ...services.sos_service import SOSService

logger = logging.getLogger("uvicorn.error")

router = APIRouter(tags=["crash-detection"])


# ── Server-side ONNX Crash Inference ───────────────────────────────

@router.post("/v1/crash/detect", response_model=CrashDetectResponse)
def detect_crash(
    request: CrashDetectRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Run the ONNX crash detection model on a 22-feature sensor vector.
    Returns the predicted label and crash probability.
    """
    if len(request.features) != 22:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Expected exactly 22 features, got {len(request.features)}.",
        )

    try:
        result = crash_detection_service.predict(request.features)
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Crash detection model is not available.",
        )
    except Exception as e:
        logger.error(f"CrashDetect: Inference failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Crash detection inference failed.",
        )

    return CrashDetectResponse(
        label=result["label"],
        probability=result["probability"],
        is_crash=result["is_crash"],
    )


# ── SOS Trigger ─────────────────────────────────────────────────────

@router.post("/v1/sos/trigger", response_model=SOSTriggerResponse)
def trigger_sos(
    request: SOSTriggerRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Trigger an SOS session from a confirmed crash detection.
    Creates crash event, SOS session, and notifies emergency contacts via SMS + email.
    """
    crash_event, sos_session = SOSService.trigger_sos(
        db=db,
        user=current_user,
        latitude=request.latitude,
        longitude=request.longitude,
        speed_estimate=request.speed_estimate,
        confidence_score=request.confidence_score,
        sensor_features=request.sensor_features,
        sensor_snapshot=request.sensor_snapshot,
        metadata=request.metadata,
    )

    contact_name = current_user.emergency_contact_name or current_user.name
    contact_phone = current_user.emergency_contact_phone

    msg = f"SOS Alert triggered. Emergency contact {contact_name} ({contact_phone or 'Email only'}) notified via Twilio SMS & Voice."

    return SOSTriggerResponse(
        sos_session_id=sos_session.id,
        crash_event_id=crash_event.id,
        status=sos_session.status,
        message=msg,
        contact_notified=contact_name,
        emergency_contact_phone=contact_phone,
    )


# ── SOS Session Status ──────────────────────────────────────────────

@router.get("/v1/sos/{session_id}/status", response_model=SOSStatusResponse)
def get_sos_status(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get the current status of an SOS session."""
    result = SOSService.get_session_status(db, session_id)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="SOS session not found.",
        )
    return SOSStatusResponse(**result)


# ── SOS Session Resolve ─────────────────────────────────────────────

@router.post("/v1/sos/{session_id}/resolve", response_model=SOSResolveResponse)
def resolve_sos(
    session_id: str,
    request: SOSResolveRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Resolve/close an SOS session. Valid statuses: RESOLVED, FALSE_ALARM, CANCELLED."""
    valid_statuses = {"RESOLVED", "FALSE_ALARM", "CANCELLED"}
    if request.status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}",
        )

    result = SOSService.resolve_session(
        db=db,
        session_id=session_id,
        status=request.status,
        notes=request.notes,
        resolved_by=current_user.id,
    )

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="SOS session not found.",
        )

    return SOSResolveResponse(
        session_id=result["session_id"],
        status=result["status"],
        resolved_at=result["resolved_at"],
        message=f"SOS session marked as {result['status']}.",
    )


# ── Crash Events List (Dashboard) ───────────────────────────────────

@router.get("/v1/sos/events", response_model=List[CrashEventOut])
def list_crash_events(
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List recent crash events for the web dashboard."""
    events = SOSService.list_crash_events(db, limit=limit)
    return [CrashEventOut(**ev) for ev in events]


# ── SSE Stream for Real-Time Crash Events ────────────────────────────

@router.get("/v1/sos/events/stream")
async def stream_crash_events(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Server-Sent Events endpoint for real-time crash event updates.
    The web dashboard subscribes to this for live crash alerts.
    Polls every 3 seconds for new ACTIVE crash events.
    """
    async def event_generator():
        last_seen_ids = set()

        # Send initial heartbeat
        yield f"data: {json.dumps({'type': 'connected', 'message': 'SSE stream connected'})}\n\n"

        while True:
            try:
                # Query active crash events
                active_events = (
                    db.query(CrashEvent)
                    .filter(CrashEvent.status == "ACTIVE")
                    .order_by(CrashEvent.created_at.desc())
                    .limit(20)
                    .all()
                )

                current_ids = {ev.id for ev in active_events}
                new_ids = current_ids - last_seen_ids

                for ev in active_events:
                    if ev.id in new_ids:
                        user = db.query(User).filter(User.id == ev.user_id).first()
                        event_data = {
                            "type": "crash_event",
                            "id": ev.id,
                            "userId": ev.user_id,
                            "userName": user.name if user else None,
                            "userPhone": user.phone if user else None,
                            "latitude": ev.latitude,
                            "longitude": ev.longitude,
                            "confidenceScore": ev.confidence_score,
                            "status": ev.status,
                            "createdAt": ev.created_at.isoformat() if ev.created_at else None,
                        }
                        yield f"data: {json.dumps(event_data)}\n\n"

                last_seen_ids = current_ids

            except Exception as e:
                logger.error(f"SSE stream error: {e}")
                yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

            await asyncio.sleep(3)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
