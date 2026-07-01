from fastapi import APIRouter, HTTPException
from datetime import datetime
from app.schemas.scan import ScanRequest, ScanResponse
from app.services.vehicle_service import VehicleService

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
        message=f"Successfully identified {vehicle.type} ({vehicle.license_plate})",
        timestamp=datetime.utcnow().isoformat() + "Z"
    )
