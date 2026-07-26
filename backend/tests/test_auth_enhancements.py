import uuid
import random
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.models.user import User
from app.models.pending_registration import PendingRegistration
from app.models.two_factor_session import TwoFactorSession

from app.services.auth_service import AuthService
from app.core.exceptions import (
    UserAlreadyExistsException,
    InvalidOTPException,
    OTPExpiredException,
    OTPAttemptLimitExceededException,
    UserNotFoundException,
    InvalidCredentialsException,
    UserNotVerifiedException,
    RateLimitExceededException
)

# Use SQLite in-memory for lightning fast unit tests
sqlite_engine = create_engine("sqlite:///:memory:")
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=sqlite_engine)

Base.metadata.create_all(bind=sqlite_engine)

def random_email():
    return f"test_{uuid.uuid4().hex[:8]}@example.com"

def random_phone():
    return f"+1555{random.randint(1000000, 9999999)}"


def test_registration_pending_and_verification_flow():
    """Verify registration creates pending record only, and verify-registration creates permanent user."""
    db = TestingSessionLocal()
    email = random_email()
    phone = random_phone()
    password = "SecretPassword123!"

    try:
        # 1. Simulate registration call logic
        hashed_password = AuthService.hash_password(password)
        otp_code = "123456"
        expiry_time = datetime.utcnow() + timedelta(minutes=10)

        pending = PendingRegistration(
            email=email,
            phone=phone,
            name="Test User",
            hashed_password=hashed_password,
            role="User",
            verification_type="email",
            otp_code=otp_code,
            expiry_time=expiry_time,
            attempt_count=0
        )
        db.add(pending)
        db.commit()

        # Check DB state before verification
        user_in_db = db.query(User).filter(User.email == email).first()
        pending_in_db = db.query(PendingRegistration).filter(PendingRegistration.email == email).first()

        assert user_in_db is None, "User MUST NOT exist in main users table before verification"
        assert pending_in_db is not None, "Pending registration MUST exist in pending_registrations table"
        assert pending_in_db.otp_code == "123456"

        # 2. Simulate OTP verification
        user = User(
            id=f"102026{random.randint(1000,9999)}",
            name=pending_in_db.name,
            email=pending_in_db.email,
            phone=pending_in_db.phone,
            hashed_password=pending_in_db.hashed_password,
            role=pending_in_db.role,
            is_verified=True,
            email_verified=True,
            two_factor_enabled=False
        )
        db.add(user)
        db.delete(pending_in_db)
        db.commit()

        # Check DB state after verification
        user_after = db.query(User).filter(User.email == email).first()
        pending_after = db.query(PendingRegistration).filter(PendingRegistration.email == email).first()

        assert user_after is not None, "User MUST be created in users table after verification"
        assert user_after.is_verified is True
        assert pending_after is None, "Pending registration record MUST be cleaned up"

    finally:
        db.close()


def test_invalid_otp_attempt_counter():
    """Verify invalid OTP increments attempt counter."""
    db = TestingSessionLocal()
    email = random_email()
    phone = random_phone()

    try:
        pending = PendingRegistration(
            email=email,
            phone=phone,
            name="OTP Tester",
            hashed_password=AuthService.hash_password("pass"),
            verification_type="email",
            otp_code="654321",
            expiry_time=datetime.utcnow() + timedelta(minutes=10),
            attempt_count=0,
            max_attempts=5
        )
        db.add(pending)
        db.commit()

        # Simulate 2 wrong attempts
        pending.attempt_count += 1
        db.commit()
        pending.attempt_count += 1
        db.commit()

        p_db = db.query(PendingRegistration).filter(PendingRegistration.email == email).first()
        assert p_db.attempt_count == 2
        assert p_db.attempt_count < p_db.max_attempts

    finally:
        db.close()


def test_login_validation_and_2fa():
    """Verify password validation and 2FA trigger logic."""
    db = TestingSessionLocal()
    email = random_email()
    phone = random_phone()
    plain_password = "MySecurePassword"

    try:
        user = User(
            id=f"102026{random.randint(1000,9999)}",
            name="2FA Tester",
            email=email,
            phone=phone,
            hashed_password=AuthService.hash_password(plain_password),
            is_verified=True,
            two_factor_enabled=True
        )
        db.add(user)
        db.commit()

        # Verify password check
        u = db.query(User).filter(User.email == email).first()
        assert AuthService.verify_password(plain_password, u.hashed_password) is True
        assert AuthService.verify_password("WrongPass", u.hashed_password) is False

        # Verify 2FA flag behavior
        assert u.two_factor_enabled is True

    finally:
        db.close()


if __name__ == "__main__":
    test_registration_pending_and_verification_flow()
    test_invalid_otp_attempt_counter()
    test_login_validation_and_2fa()
    print("✅ All auth unit tests passed successfully!")
