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
    registration_number: str
    owner_name: str
    father_name: str
    dob: str
    gender: str
    registration_date: str
    maker_model: str
    fuel_type: str
    color: str
    vehicle_category: str
    body_type: str
    manufacturing_year: str
    seating_capacity: str
    unladen_weight: str
    chassis_number: str
    engine_number: str
    current_address: str
    insurance_company: str
    insurance_policy_number: str
    insurance_validity: str
    pucc_validity: str
    fitness_validity: str
    tax_paid_up_to: str
    is_financed: str
    financier_name: str
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


