from fastapi import APIRouter, HTTPException
from datetime import datetime
from ...schemas.scan import ScanRequest, ScanResult, MLPrediction
from ...services.vehicle_service import VehicleService
from ...ml.ml_service import ml_service


router = APIRouter(prefix="/scan", tags=["scan"])

@router.post("", response_model=ScanResult)
def scan_vehicle(request: ScanRequest):
    vehicle = VehicleService.get_by_qr_code(request.qr_data)

    # Perform lazy-loaded ML vehicle classification
    pred_data = ml_service.predict_vehicle(qr_data=request.qr_data)
    prediction = MLPrediction(
        predicted_class=pred_data["predicted_class"],
        confidence=pred_data["confidence"],
        bounding_box=pred_data["bounding_box"]
    )

    if not vehicle:
        return ScanResult(
            success=False,
            vehicle=None,
            message="No registered emergency vehicle matches this QR code",
            prediction=prediction,
            timestamp=datetime.utcnow().isoformat() + "Z"
        )

    return ScanResult(
        success=True,
        vehicle=vehicle,
        message=f"Successfully identified {vehicle.year} {vehicle.make} {vehicle.model}",
        prediction=prediction,
        timestamp=datetime.utcnow().isoformat() + "Z"
    )
