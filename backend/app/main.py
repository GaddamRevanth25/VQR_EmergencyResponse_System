from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api.routes import vehicles, scan, alerts

app = FastAPI(
    title="VQR Emergency Response API",
    description="Backend API for scanning emergency vehicle QR codes and triggering alert notifications",
    version="1.0.0",
)

# Enable CORS for frontend applications
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(vehicles.router, prefix="/api")
app.include_router(scan.router, prefix="/api")
app.include_router(alerts.router, prefix="/api")

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "VQR Emergency Response System",
        "documentation": "/docs"
    }
