from fastapi import APIRouter, HTTPException
from datetime import datetime
from ...schemas.scan import ScanRequest, ScanResponse
from ...services.vehicle_service import VehicleService

router = APIRouter(prefix="/scan", tags=["scan"])

@router.post("/", response_model=ScanResponse)
def scan_vehicle(request: ScanRequest):
    vehicle = VehicleService.get_by_qr_code(request.qr_data)
    if not vehicle:
        return ScanResponse(
            success=False,
            vehicle=None,
            message="No registered emergency vehicle matches this QR code",
            timestamp=datetime.utcnow().isoformat() + "Z"
        )
    
    return ScanResponse(
        success=True,
        vehicle=vehicle,
        message=f"Successfully identified {vehicle.year} {vehicle.make} {vehicle.model}",
        timestamp=datetime.utcnow().isoformat() + "Z"
    )
