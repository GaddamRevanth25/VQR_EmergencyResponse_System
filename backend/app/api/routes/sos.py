from fastapi import APIRouter, Depends, status
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
    return SOSService.trigger_sos(
        db=db,
        user=current_user,
        latitude=request.latitude,
        longitude=request.longitude
    )
