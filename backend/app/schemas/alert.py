from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel
from enum import Enum

class SeverityLevel(str, Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"

class AlertRequest(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

    vehicle_id: str
    severity: SeverityLevel
    message: str
    latitude: float
    longitude: float

class AlertResponse(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

    success: bool
    alert_id: str
    status: str
    timestamp: str
