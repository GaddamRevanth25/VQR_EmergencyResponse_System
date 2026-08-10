import uuid
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.routes import auth
from app.core.database import Base, get_db
from app.core.exceptions import AppException
from app.models.pending_registration import PendingRegistration
from app.models.user import User
from fastapi import Request, status
from fastapi.exceptions import RequestValidationError, HTTPException
from fastapi.responses import JSONResponse

# Create lightweight FastAPI app for auth testing
test_app = FastAPI()

@test_app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": exc.message,
            "errorCode": exc.error_code,
            "detail": exc.message
        }
    )

test_app.include_router(auth.router, prefix="/api")

# StaticPool ensures in-memory SQLite tables persist across threads in TestClient
sqlite_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=sqlite_engine)

Base.metadata.create_all(bind=sqlite_engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

test_app.dependency_overrides[get_db] = override_get_db

client = TestClient(test_app)

def test_api_full_flow():
    print("1. Testing /api/auth/register...")
    test_email = f"api_user_{uuid.uuid4().hex[:6]}@example.com"
    test_phone = f"+1999{uuid.uuid4().hex[:7]}"

    res = client.post("/api/auth/register", json={
        "email": test_email,
        "name": "API Test User",
        "phone": test_phone,
        "password": "Password123!",
        "role": "User"
    })
    print(f"Register status: {res.status_code}, body: {res.json()}")
    assert res.status_code in [200, 201]
    data = res.json()
    assert data.get("success") is True or data.get("email") == test_email

    # Verify user is in pending_registrations and NOT in users
    db = TestingSessionLocal()
    try:
        pending_in_db = db.query(PendingRegistration).filter(PendingRegistration.email == test_email).first()
        user_in_db = db.query(User).filter(User.email == test_email).first()
        assert pending_in_db is not None, "Pending registration must exist in pending_registrations table"
        assert user_in_db is None, "User MUST NOT exist in users table before OTP verification"
        otp_code = pending_in_db.otp_code
        print(f"Stored OTP in pending_registrations: {otp_code}")
    finally:
        db.close()

    print("\n2. Testing /api/auth/login with unverified user...")
    res_login = client.post("/api/auth/login", json={
        "loginType": "email_password",
        "email": test_email,
        "password": "Password123!"
    })
    print(f"Login unverified status: {res_login.status_code}, body: {res_login.json()}")
    assert res_login.status_code in [403, 400, 401]
    assert res_login.json().get("errorCode") in ["USER_NOT_VERIFIED", "INVALID_CREDENTIALS", "USER_NOT_FOUND"]

    print("\n3. Testing /api/auth/verify-registration with invalid code...")
    res_invalid = client.post("/api/auth/verify-registration", json={
        "email": test_email,
        "code": "000000"
    })
    print(f"Verify registration invalid code status: {res_invalid.status_code}, body: {res_invalid.json()}")
    assert res_invalid.status_code == 400
    assert res_invalid.json().get("errorCode") in ["INVALID_OTP", "REGISTRATION_VERIFICATION_FAILED"]

    print("\n4. Testing /api/auth/verify-registration with CORRECT OTP code...")
    res_valid = client.post("/api/auth/verify-registration", json={
        "email": test_email,
        "code": otp_code
    })
    print(f"Verify registration valid code status: {res_valid.status_code}, body: {res_valid.json()}")
    assert res_valid.status_code in [200, 201]
    assert res_valid.json().get("success") is True or "id" in res_valid.json()

    print("\n5. Testing /api/auth/login with verified user...")
    res_login2 = client.post("/api/auth/login", json={
        "loginType": "email_password",
        "email": test_email,
        "password": "Password123!"
    })
    print(f"Login verified user status: {res_login2.status_code}, body: {res_login2.json()}")
    assert res_login2.status_code == 200
    assert res_login2.json().get("accessToken") is not None or res_login2.json().get("access_token") is not None

    print("\n[SUCCESS] All in-process API test cases passed cleanly!")

if __name__ == "__main__":
    test_api_full_flow()
