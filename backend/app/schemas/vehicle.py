from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel
from enum import Enum

class VehicleType(str, Enum):
    AMBULANCE = "AMBULANCE"
    FIRE_TRUCK = "FIRE_TRUCK"
    POLICE = "POLICE"
    RESCUE = "RESCUE"
    OTHER = "OTHER"

class VehicleStatus(str, Enum):
    AVAILABLE = "AVAILABLE"
    ACTIVE = "ACTIVE"
    MAINTENANCE = "MAINTENANCE"

class Vehicle(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

    id: str
    license_plate: str
    type: VehicleType
    status: VehicleStatus
    qr_code: str
    owner_department: str
    contact_number: str
    updated_at: str
