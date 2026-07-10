from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from ...schemas.vehicle import Vehicle, LookupRequest, LookupResponse
from ...services.vehicle_service import VehicleService

router = APIRouter(tags=["vehicles"])

# Makes, Models, Years Cascading REST API
@router.get("/makes", response_model=List[str])
def get_makes(vehicle_type: Optional[str] = Query(None, alias="vehicleType")):
    return VehicleService.get_makes(vehicle_type)

@router.get("/makes/{make}/models", response_model=List[str])
def get_models(make: str, vehicle_type: Optional[str] = Query(None, alias="vehicleType")):
    return VehicleService.get_models(make, vehicle_type)

@router.get("/makes/{make}/models/{model}/years", response_model=List[int])
def get_years(make: str, model: str, vehicle_type: Optional[str] = Query(None, alias="vehicleType")):
    return VehicleService.get_years(make, model, vehicle_type)

# Vehicles Root Endpoints
@router.get("/vehicles", response_model=List[Vehicle])
def list_vehicles():
    return VehicleService.get_all()

@router.post("/vehicles/lookup", response_model=LookupResponse)
def lookup_vehicle(request: LookupRequest):
    result = VehicleService.lookup(request.vin, request.country)
    if not result:
        raise HTTPException(status_code=404, detail="Vehicle not found in passenger database")
    return result

@router.get("/vehicles/lookup/dropdown", response_model=Vehicle)
def lookup_by_dropdown(
    make: str = Query(...),
    model: str = Query(...),
    year: int = Query(...)
):
    vehicle = VehicleService.get_by_make_model_year(make, model, year)
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found for specified Make, Model, and Year")
    return vehicle

@router.get("/vehicles/{vehicle_id}", response_model=Vehicle)
def get_vehicle(vehicle_id: str):
    vehicle = VehicleService.get_by_id(vehicle_id)
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return vehicle
