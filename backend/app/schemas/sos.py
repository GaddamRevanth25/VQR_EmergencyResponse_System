from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel
from typing import Optional

class SOSTriggerRequest(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class SOSResponse(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )
    success: bool
    message: str
    contact_name: str
    contact_phone: str
