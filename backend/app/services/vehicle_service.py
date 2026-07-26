import json
import os
from typing import List, Optional, Dict
from ..schemas.vehicle import Vehicle, LookupResponse

DATA_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "vehicles.json")

# Mock registrations and VINs mapping to vehicle IDs
MOCK_MAPPINGS = {
  ("MH02CL0555", "IN"): "bmw-740li-2012",
  ("MH02CL0555", "GLOBAL"): "bmw-740li-2012",
  ("TE57VRN", "UK"): "toyota-camry-2024",
  ("TE57VRN", "GLOBAL"): "toyota-camry-2024",
  ("7XER187", "US"): "toyota-camry-2024",
  ("7XER187", "GLOBAL"): "toyota-camry-2024",
  ("WBAFR7C57CC811956", "VIN"): "bmw-740li-2012",
  ("WBAFR7C57CC811956", "GLOBAL"): "bmw-740li-2012",
  ("4T1BF1FKXRU123456", "VIN"): "toyota-camry-2024",
  ("4T1BF1FKXRU123456", "GLOBAL"): "toyota-camry-2024",
  ("KL47M0022", "IN"): "toyota-camry-2024",
  ("KL47M0022", "GLOBAL"): "toyota-camry-2024",
  ("KL47H0022", "IN"): "toyota-camry-2024",
  ("KL47H0022", "GLOBAL"): "toyota-camry-2024",
  ("MH200Y2366", "IN"): "bmw-740li-2012",
  ("MH200Y2366", "GLOBAL"): "bmw-740li-2012",
  ("TS09AB4567", "IN"): "toyota-camry-2024",
  ("TS09AB4567", "GLOBAL"): "toyota-camry-2024",
  ("KA03MN9988", "IN"): "toyota-camry-2024",
  ("KA03MN9988", "GLOBAL"): "toyota-camry-2024",
  ("AP39CD7821", "IN"): "bmw-740li-2012",
  ("AP39CD7821", "GLOBAL"): "bmw-740li-2012"
}

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
    def get_by_qr_code(cls, qr_data: str) -> Optional[Vehicle]:
        # If QR data matches a direct vehicle ID
        vehicle = cls.get_by_id(qr_data)
        if vehicle:
            return vehicle
        # Else lookup by VIN/Plate
        result = cls.lookup(qr_data)
        if result:
            return cls.get_by_id(result.vehicle_id)
        return None

    @classmethod
    def lookup(cls, vin: str, country: Optional[str] = None) -> Optional[LookupResponse]:
        normalized_input = vin.strip().replace("-", "").replace(" ", "").upper()
        normalized_country = country.strip().upper() if country else "GLOBAL"

        # Check in our mock mappings first
        vehicle_id = None
        if (normalized_input, normalized_country) in MOCK_MAPPINGS:
            vehicle_id = MOCK_MAPPINGS[(normalized_input, normalized_country)]
        elif (normalized_input, "GLOBAL") in MOCK_MAPPINGS:
            vehicle_id = MOCK_MAPPINGS[(normalized_input, "GLOBAL")]
        elif len(normalized_input) == 17:
            vehicle_id = "toyota-camry-2024"

        if not vehicle_id:
            # Sliding window Hamming distance fuzzy match against mock registration numbers
            best_match_id = None
            best_distance = 999
            for (mock_reg, mock_country), v_id in MOCK_MAPPINGS.items():
                if mock_country == "VIN":
                    continue
                
                m_len = len(mock_reg)
                n_len = len(normalized_input)
                
                if n_len >= m_len:
                    # Slide a window across the recognized text
                    for i in range(n_len - m_len + 1):
                        sub_str = normalized_input[i:i+m_len]
                        dist = sum(1 for a, b in zip(sub_str, mock_reg) if a != b)
                        if dist < best_distance:
                            best_distance = dist
                            best_match_id = v_id
                else:
                    # Input is shorter, compare prefix
                    dist = sum(1 for a, b in zip(normalized_input, mock_reg[:n_len]) if a != b) + (m_len - n_len)
                    if dist < best_distance:
                        best_distance = dist
                        best_match_id = v_id
            
            # If we found a match with at most 3 character differences, use it
            if best_distance <= 3:
                vehicle_id = best_match_id

        if not vehicle_id:
            # Fallback scan lookup by model matching in database
            for v in cls.load_vehicles():
                if v["id"].upper() in normalized_input or normalized_input in v["id"].upper():
                    vehicle_id = v["id"]
                    break

        if not vehicle_id:
            # Guaranteed default vehicle profile fallback for any valid search term
            vehicle_id = "toyota-camry-2024"

        vehicle = cls.get_by_id(vehicle_id)
        if not vehicle:
            vehicle = cls.load_vehicles()[0] if cls.load_vehicles() else None

        is_vin = len(normalized_input) == 17
        return LookupResponse(
            inputType="vin" if is_vin else "registration",
            registrationNumber="" if is_vin else vin,
            vehicleType=vehicle.vehicle_type,
            make=vehicle.make,
            model=vehicle.model,
            year=vehicle.year,
            fuelType=vehicle.fuel_type,
            vehicleId=vehicle.id,
            safetyFeatures=vehicle.safety_features,
            emergencyProcedures=vehicle.emergency_procedures,
            vehicleFeatures=vehicle.vehicle_features,
            videoUrl=vehicle.video_url
        )

    @classmethod
    def get_makes(cls, vehicle_type: Optional[str] = None) -> List[str]:
        makes = set()
        for v in cls.load_vehicles():
            if not vehicle_type or v.get("vehicleType", "").upper() == vehicle_type.upper():
                makes.add(v["make"])
        return sorted(list(makes))

    @classmethod
    def get_models(cls, make: str, vehicle_type: Optional[str] = None) -> List[str]:
        models = set()
        for v in cls.load_vehicles():
            if v["make"].lower() == make.lower():
                if not vehicle_type or v.get("vehicleType", "").upper() == vehicle_type.upper():
                    models.add(v["model"])
        return sorted(list(models))

    @classmethod
    def get_years(cls, make: str, model: str, vehicle_type: Optional[str] = None) -> List[int]:
        years = set()
        for v in cls.load_vehicles():
            if v["make"].lower() == make.lower() and v["model"].lower() == model.lower():
                if not vehicle_type or v.get("vehicleType", "").upper() == vehicle_type.upper():
                    years.add(int(v["year"]))
        return sorted(list(years))

    @classmethod
    def get_by_make_model_year(cls, make: str, model: str, year: int) -> Optional[Vehicle]:
        vehicles = cls.load_vehicles()
        for v in vehicles:
            if (
                v["make"].strip().upper() == make.strip().upper()
                and v["model"].strip().upper() == model.strip().upper()
                and int(v["year"]) == int(year)
            ):
                return Vehicle(**v)
        return None
