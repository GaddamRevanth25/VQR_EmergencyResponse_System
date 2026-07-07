from fastapi import APIRouter
from ...schemas.alert import AlertRequest, AlertResponse
from ...services.alert_service import AlertService

router = APIRouter(prefix="/alerts", tags=["alerts"])

@router.post("", response_model=AlertResponse)
def trigger_alert(request: AlertRequest):
    return AlertService.trigger_alert(request)
