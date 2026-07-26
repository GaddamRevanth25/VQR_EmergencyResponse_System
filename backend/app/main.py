from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError, HTTPException
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import logging
import os
from sqlalchemy import text

from .api.routes import vehicles, scan, alerts, auth, sos, crash
from .core.database import engine, Base
from .core.exceptions import AppException

# Ensure models are imported so Base metadata is populated
from .models.user import User  # noqa: F401
from .models.pending_registration import PendingRegistration  # noqa: F401
from .models.two_factor_session import TwoFactorSession  # noqa: F401
from .models.crash_event import CrashEvent  # noqa: F401
from .models.sos_session import SOSSession  # noqa: F401

# Create all database tables on startup (no-op if they already exist)
Base.metadata.create_all(bind=engine)

# Auto-migrate / sync schema columns for existing tables
def _auto_migrate_schema():
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE users DROP COLUMN IF EXISTS emergency_contact_email;"))
            user_columns = [
                ("biometric_public_key", "TEXT"),
                ("is_verified", "BOOLEAN DEFAULT FALSE"),
                ("email_verified", "BOOLEAN DEFAULT FALSE"),
                ("phone_verified", "BOOLEAN DEFAULT FALSE"),
                ("two_factor_enabled", "BOOLEAN DEFAULT FALSE"),
                ("verification_code", "VARCHAR(6)"),
                ("verification_code_expires", "TIMESTAMP"),
                ("otp_code", "VARCHAR(6)"),
                ("otp_code_expires", "TIMESTAMP"),
                ("created_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"),
            ]
            for col_name, col_def in user_columns:
                conn.execute(text(f"ALTER TABLE users ADD COLUMN IF NOT EXISTS {col_name} {col_def};"))
            conn.commit()
    except Exception as exc:
        logging.getLogger("uvicorn.error").warning(f"Auto-migration warning: {exc}")

_auto_migrate_schema()


app = FastAPI(
    title="VQR Emergency Response API",
    description="Backend API for scanning emergency vehicle QR codes and triggering alert notifications",
    version="1.0.0",
)

# Configure CORS – allow all origins for development flexibility
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger = logging.getLogger("uvicorn.error")

# Centralized Exception Handler for Custom Domain Exceptions
@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": exc.message,
            "errorCode": exc.error_code,
            "detail": exc.message,
            "data": exc.data
        }
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    if errors:
        first_err = errors[0]
        loc = first_err.get("loc", [])
        field = str(loc[-1]) if loc else "field"
        msg = first_err.get("msg", "Invalid input value.")
        if msg.startswith("Value error, "):
            msg = msg.replace("Value error, ", "")
        
        if first_err.get("type") == "missing":
            user_msg = f"Please fill out the required '{field}' field."
        elif "email" in field.lower() or "email" in msg.lower():
            user_msg = "Please enter a valid email address."
        else:
            user_msg = msg
    else:
        user_msg = "Invalid input details provided. Please check your entries."
        
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "success": False,
            "message": user_msg,
            "errorCode": "VALIDATION_ERROR",
            "detail": user_msg
        }
    )

@app.exception_handler(HTTPException)
async def custom_http_exception_handler(request: Request, exc: HTTPException):
    # Provide consistent envelope if detail is string or dict
    msg = exc.detail if isinstance(exc.detail, str) else "Request failed."
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": msg,
            "errorCode": "HTTP_ERROR",
            "detail": exc.detail
        }
    )

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled Exception on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "message": "Something went wrong on our server. Please try again.",
            "errorCode": "INTERNAL_SERVER_ERROR",
            "detail": "Something went wrong on our server. Please try again."
        }
    )

app.include_router(auth.router, prefix="/api")
app.include_router(vehicles.router, prefix="/api")
app.include_router(scan.router, prefix="/api")
app.include_router(alerts.router, prefix="/api")
app.include_router(sos.router, prefix="/api")
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
