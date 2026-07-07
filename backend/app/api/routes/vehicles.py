from fastapi import APIRouter, HTTPException
from typing import List
from ...schemas.vehicle import Vehicle
from ...services.vehicle_service import VehicleService

router = APIRouter(prefix="/vehicles", tags=["vehicles"])

@router.get("", response_model=List[Vehicle])
def list_vehicles():
    return VehicleService.get_all()

@router.get("/{vehicle_id}", response_model=Vehicle)
def get_vehicle(vehicle_id: str):
    vehicle = VehicleService.get_by_id(vehicle_id)
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return vehicle
