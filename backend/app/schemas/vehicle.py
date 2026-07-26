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

class RegistrationLookupResponse(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )
    registration_number: Optional[str] = None
    owner_name: Optional[str] = None
    father_name: Optional[str] = None
    dob: Optional[str] = None
    gender: Optional[str] = None
    registration_date: Optional[str] = None
    maker_model: Optional[str] = None
    fuel_type: str
    color: Optional[str] = None
    vehicle_category: Optional[str] = None
    body_type: Optional[str] = None
    manufacturing_year: Optional[str] = None
    seating_capacity: Optional[str] = None
    unladen_weight: Optional[str] = None
    chassis_number: Optional[str] = None
    engine_number: Optional[str] = None
    current_address: Optional[str] = None
    insurance_company: Optional[str] = None
    insurance_policy_number: Optional[str] = None
    insurance_validity: Optional[str] = None
    pucc_validity: Optional[str] = None
    fitness_validity: Optional[str] = None
    tax_paid_up_to: Optional[str] = None
    is_financed: Optional[str] = None
    financier_name: Optional[str] = None
    make: str
    model: str
    year: int
    vehicle_type: str
    vehicle_id: str
    safety_features: List[SafetyFeature]
    emergency_procedures: List[EmergencyProcedure]
    vehicle_features: List[VehicleFeatureGroup]
    video_url: str
    thumbnail_url: str

class RegistrationLookupRequest(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )
    registration_number: str


