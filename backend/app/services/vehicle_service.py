import json
import os
from typing import List, Optional
from ..schemas.vehicle import Vehicle

DATA_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "vehicles.json")

class VehicleService:
    @staticmethod
    def load_vehicles() -> List[dict]:
        if not os.path.exists(DATA_PATH):
            return []
        with open(DATA_PATH, "r") as f:
            try:
                return json.load(f)
            except json.JSONDecodeError:
                return []

    @staticmethod
    def save_vehicles(vehicles: List[dict]):
        with open(DATA_PATH, "w") as f:
            json.dump(vehicles, f, indent=2)

    @classmethod
    def get_all(cls) -> List[Vehicle]:
        return [Vehicle(**v) for v in cls.load_vehicles()]

    @classmethod
    def get_by_id(cls, vehicle_id: str) -> Optional[Vehicle]:
        vehicles = cls.load_vehicles()
        for v in vehicles:
            if v["id"] == vehicle_id:
                return Vehicle(**v)
        return None

    @classmethod
    def get_by_qr_code(cls, qr_code: str) -> Optional[Vehicle]:
        vehicles = cls.load_vehicles()
        for v in vehicles:
            if v["id"] == qr_code:
                return Vehicle(**v)
        return None
