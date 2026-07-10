from pydantic.alias_generators import to_camel
from typing import List, Optional
from pydantic import BaseModel, ConfigDict

class SafetyFeature(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )
    title: str
    description: str
    location: str
    icon: str
    priority: str

class EmergencyProcedure(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )
    scenario: str
    dos: List[str]
    donts: List[str]
    video_timestamp: Optional[str] = None

class VehicleFeatureItem(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )
    name: str
    location: str
    icon: str

class VehicleFeatureGroup(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )
    category: str
    items: List[VehicleFeatureItem]

class Vehicle(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

    id: str
    vehicle_type: str
    make: str
    model: str
    year: int
    fuel_type: str
    safety_features: List[SafetyFeature]
    emergency_procedures: List[EmergencyProcedure]
    vehicle_features: List[VehicleFeatureGroup]
    video_url: str
    thumbnail_url: str

class LookupRequest(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )
    vin: str
    country: Optional[str] = None

class LookupResponse(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )
    input_type: str
    registration_number: str
    vehicle_type: str
    make: str
    model: str
    year: int
    fuel_type: str
    vehicle_id: str
    safety_features: List[SafetyFeature]
    emergency_procedures: List[EmergencyProcedure]
    vehicle_features: List[VehicleFeatureGroup]
    video_url: str
