from pydantic.alias_generators import to_camel
from typing import List
from pydantic import BaseModel, ConfigDict

class SafetyGuideline(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )
    title: str
    description: str
    priority: str

class FeatureGroup(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )
    category: str
    items: List[str]

class Vehicle(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

    id: str
    make: str
    model: str
    year: int
    safety_guidelines: List[SafetyGuideline]
    features: List[FeatureGroup]
    video_url: str
    thumbnail_url: str
