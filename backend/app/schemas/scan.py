from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel
from typing import Optional
from .vehicle import Vehicle

class ScanRequest(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

    qr_data: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    scanned_by: Optional[str] = None

class ScanResponse(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

    success: bool
    vehicle: Optional[Vehicle] = None
    message: str
    timestamp: str
