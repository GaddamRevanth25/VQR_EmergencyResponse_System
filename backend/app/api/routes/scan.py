from fastapi import APIRouter, HTTPException, UploadFile, File
import cv2
import numpy as np
from datetime import datetime
from ...schemas.scan import ScanRequest, ScanResult, MLPrediction
from ...services.vehicle_service import VehicleService
from ...services.plate_ocr_service import detect_and_recognize_plate
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

@router.post("/plate", response_model=ScanResult)
async def scan_plate(file: UploadFile = File(...)):
    image_bytes = await file.read()
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image file format")
        
    recognized_plate = detect_and_recognize_plate(img)
    
    if not recognized_plate:
        return ScanResult(
            success=False,
            vehicle=None,
            message="No license plate characters could be recognized in the image.",
            prediction=None,
            timestamp=datetime.utcnow().isoformat() + "Z"
        )
        
    lookup_res = VehicleService.lookup(recognized_plate)
    
    prediction = MLPrediction(
        predicted_class=recognized_plate,
        confidence=0.92,
        bounding_box=None
    )
    
    if not lookup_res:
        return ScanResult(
            success=False,
            vehicle=None,
            message=f"Recognized plate '{recognized_plate}', but no registered vehicle matches this plate.",
            prediction=prediction,
            timestamp=datetime.utcnow().isoformat() + "Z"
        )
        
    vehicle = VehicleService.get_by_id(lookup_res.vehicle_id)
    return ScanResult(
        success=True,
        vehicle=vehicle,
        message=f"Successfully identified {vehicle.year} {vehicle.make} {vehicle.model} from plate '{recognized_plate}'",
        prediction=prediction,
        timestamp=datetime.utcnow().isoformat() + "Z"
    )
