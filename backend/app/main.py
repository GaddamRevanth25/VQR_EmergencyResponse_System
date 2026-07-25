from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api.routes import vehicles, scan, alerts, auth, crash
from .core.database import engine, Base
from .models.user import User  # noqa: F401 – ensure model is registered with Base
from .models.crash_event import CrashEvent  # noqa: F401
from .models.sos_session import SOSSession  # noqa: F401

# Create all database tables on startup (no-op if they already exist)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="VQR Emergency Response API",
    description="Backend API for scanning emergency vehicle QR codes and triggering alert notifications",
    version="1.0.0",
)

# Configure CORS – allow all origins for development flexibility
# (the mobile app auto-detects the dev machine's LAN IP, which varies per network)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi.staticfiles import StaticFiles
import os

app.include_router(auth.router, prefix="/api")
app.include_router(vehicles.router, prefix="/api")
app.include_router(scan.router, prefix="/api")
app.include_router(alerts.router, prefix="/api")
app.include_router(crash.router, prefix="/api")

# Mount public static files directory
public_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "public")
if os.path.exists(public_dir):
    app.mount("/public", StaticFiles(directory=public_dir), name="public")

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "VQR Emergency Response System",
        "documentation": "/docs"
    }

