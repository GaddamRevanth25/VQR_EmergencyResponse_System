import os
from abc import ABC, abstractmethod

class VehicleApiClient(ABC):
    @abstractmethod
    def lookup_registration(self, registration_number: str) -> dict:
        """
        Fetch raw vehicle registration details from the API.
        Should return a dictionary conforming to the registration structure.
        """
        pass

def get_vehicle_api_client() -> VehicleApiClient:
    # Read configuration setting (defaults to True for safety/mocking)
    use_fake = os.getenv("USE_FAKE_VEHICLE_API", "true").lower() == "true"
    
    if use_fake:
        from .fake_client import FakeVehicleApiClient
        return FakeVehicleApiClient()
    else:
        from .real_client import RealVehicleApiClient
        return RealVehicleApiClient()
