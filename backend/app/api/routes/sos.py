from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session

from ...core.database import get_db
from ...models.user import User
from ...schemas.sos import SOSTriggerRequest, SOSResponse
from ...services.sos_service import SOSService
from ..deps import get_current_user

router = APIRouter(prefix="/sos", tags=["sos"])

@router.post("/trigger", response_model=SOSResponse, status_code=status.HTTP_200_OK)
def trigger_sos(
    request: SOSTriggerRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Triggers an emergency SOS alert.
    Requires user authentication, sends SMS to pre-configured contact, and applies rate-limiting.
    """
    # Enforce having an emergency contact configured for manual SOS triggers
    contact_phone = current_user.emergency_contact_phone
    if not contact_phone or not contact_phone.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No emergency contact number configured. Please update your profile settings before triggering SOS."
        )

    # E.164 format validation
    clean_phone = contact_phone.strip().replace(" ", "")
    if not clean_phone.startswith("+"):
        if len(clean_phone) != 10:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid emergency contact phone number format: '{contact_phone}'. Must be in E.164 format (e.g. +91XXXXXXXXXX)."
            )

    # Invoke service and unpack returned SQLAlchemy entities
    crash_event, _ = SOSService.trigger_sos(
        db=db,
        user=current_user,
        latitude=request.latitude,
        longitude=request.longitude,
        speed_estimate=None,
        confidence_score=1.0
    )
    
    contact_name = current_user.emergency_contact_name or "Emergency Contact"
    
    return SOSResponse(
        success=True,
        message=f"Critical SOS signal successfully dispatched. Emergency contact {contact_name} ({contact_phone}) has been alerted.",
        contact_name=contact_name,
        contact_phone=contact_phone
    )
