from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel
from typing import Optional, List
from .vehicle import Vehicle

class MLPrediction(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )
    predicted_class: str
    confidence: float
    bounding_box: Optional[List[float]] = None

class ScanRequest(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )
    qr_data: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    scanned_by: Optional[str] = None

class ScanResult(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )
    success: bool
    vehicle: Optional[Vehicle] = None
    message: str
    prediction: Optional[MLPrediction] = None
    timestamp: str
