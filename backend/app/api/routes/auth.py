import random
import logging
from datetime import datetime, timedelta
from typing import Any
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from ...core.database import get_db
from ...models.user import User
from ...models.pending_registration import PendingRegistration
from ...models.two_factor_session import TwoFactorSession

from ...schemas.user import (
    UserCreate, UserLogin, UserResponse, Token, BiometricRegister,
    EmailConfirm, OTPRequest, Verify2FA, Toggle2FA, ResendEmailRequest, Resend2FARequest,
    SendVerificationRequest, VerifyRegistrationRequest, ResendOTPRequest, StandardApiResponse
)
from ...services.auth_service import AuthService
from ...services.notification_service import NotificationService
from ...core.exceptions import (
    UserAlreadyExistsException,
    EmailAlreadyVerifiedException,
    PhoneAlreadyVerifiedException,
    InvalidOTPException,
    OTPExpiredException,
    OTPAttemptLimitExceededException,
    RegistrationVerificationFailedException,
    UserNotFoundException,
    InvalidCredentialsException,
    UserNotVerifiedException,
    TwoFactorVerificationFailedException,
    RateLimitExceededException,
    AppException
)
from ..deps import get_current_user

logger = logging.getLogger("uvicorn.error")

router = APIRouter(prefix="/auth", tags=["authentication"])


def generate_user_id(db: Session) -> str:
    """Generate custom user ID (Format: 10 + current_year + 4-digit sequence)."""
    current_year = datetime.utcnow().year
    prefix = f"10{current_year}"
    
    last_user = db.query(User).filter(
        User.id.like(f"{prefix}%")
    ).order_by(User.id.desc()).first()
    
    if last_user:
        try:
            last_seq = int(last_user.id[len(prefix):])
            next_seq = last_seq + 1
        except ValueError:
            next_seq = 1
    else:
        next_seq = 1
        
    return f"{prefix}{next_seq:04d}"


# ── REGISTRATION ENDPOINTS ───────────────────────────────────────────

@router.post("/register")
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    """Initiate registration. Pending user details are saved to pending_registrations table
    and NOT main users table until OTP is verified."""
    email_clean = user_in.email.strip().lower()
    phone_clean = user_in.phone.strip()

    # Check if user already exists in main users table
    existing_user_email = db.query(User).filter(User.email.ilike(email_clean)).first()
    if existing_user_email:
        if existing_user_email.is_verified:
            raise UserAlreadyExistsException("An account with this email address is already registered.")
        else:
            # Unverified account in main users table from legacy version -> remove it so new flow can take over
            db.delete(existing_user_email)
            db.commit()

    existing_user_phone = db.query(User).filter(User.phone == phone_clean).first()
    if existing_user_phone:
        if existing_user_phone.is_verified:
            raise UserAlreadyExistsException("An account with this phone number is already registered.")
        else:
            db.delete(existing_user_phone)
            db.commit()

    # Rate limiting check on pending registrations (60s resend cooldown)
    existing_pending = db.query(PendingRegistration).filter(
        or_(PendingRegistration.email.ilike(email_clean), PendingRegistration.phone == phone_clean)
    ).first()

    now = datetime.utcnow()
    if existing_pending and existing_pending.last_resend_at:
        seconds_since_last = (now - existing_pending.last_resend_at).total_seconds()
        if seconds_since_last < 60:
            raise RateLimitExceededException(
                f"Verification code recently sent. Please wait {int(60 - seconds_since_last)} seconds before requesting another."
            )

    otp_code = f"{random.randint(100000, 999999)}"
    hashed_password = AuthService.hash_password(user_in.password)
    expiry_time = now + timedelta(minutes=10)
    verif_type = user_in.verification_type or "email"

    if existing_pending:
        existing_pending.name = user_in.name
        existing_pending.email = email_clean
        existing_pending.phone = phone_clean
        existing_pending.hashed_password = hashed_password
        existing_pending.role = user_in.role or "User"
        existing_pending.blood_group = user_in.blood_group
        existing_pending.emergency_contact_name = user_in.emergency_contact_name
        existing_pending.emergency_contact_phone = user_in.emergency_contact_phone
        existing_pending.emergency_contact_relation = user_in.emergency_contact_relation
        existing_pending.verification_type = verif_type
        existing_pending.otp_code = otp_code
        existing_pending.expiry_time = expiry_time
        existing_pending.attempt_count = 0
        existing_pending.last_resend_at = now
        pending_reg = existing_pending
    else:
        pending_reg = PendingRegistration(
            email=email_clean,
            phone=phone_clean,
            name=user_in.name,
            hashed_password=hashed_password,
            role=user_in.role or "User",
            blood_group=user_in.blood_group,
            emergency_contact_name=user_in.emergency_contact_name,
            emergency_contact_phone=user_in.emergency_contact_phone,
            emergency_contact_relation=user_in.emergency_contact_relation,
            verification_type=verif_type,
            otp_code=otp_code,
            expiry_time=expiry_time,
            attempt_count=0,
            last_resend_at=now
        )
        db.add(pending_reg)

    db.commit()
    db.refresh(pending_reg)

    # Send verification notification
    try:
        if verif_type == "phone":
            NotificationService.send_sms_otp(phone_clean, otp_code)
        else:
            NotificationService.send_registration_success_acknowledgment(email_clean, user_in.name, otp_code)
    except Exception as e:
        logger.error(f"Failed to dispatch registration verification notification: {e}")

    # Return structure compatible with both StandardApiResponse and UserResponse consumers
    return {
        "success": True,
        "message": "Registration initiated. Verification OTP sent.",
        "data": {
            "email": email_clean,
            "phone": phone_clean,
            "verificationType": verif_type
        },
        "id": pending_reg.id,
        "email": email_clean,
        "name": user_in.name,
        "phone": phone_clean,
        "role": user_in.role or "User",
        "createdAt": pending_reg.created_at
    }


@router.post("/send-verification", response_model=StandardApiResponse)
def send_verification(req: SendVerificationRequest, db: Session = Depends(get_db)):
    """Send or resend verification OTP for pending registration."""
    identifier = (req.email or req.phone or "").strip().lower()
    if not identifier:
        raise RegistrationVerificationFailedException("Email or phone number is required.")

    pending = db.query(PendingRegistration).filter(
        or_(PendingRegistration.email.ilike(identifier), PendingRegistration.phone == identifier)
    ).first()

    if not pending:
        raise RegistrationVerificationFailedException("No pending registration found for this email or phone number.")

    now = datetime.utcnow()
    if pending.last_resend_at:
        seconds_since_last = (now - pending.last_resend_at).total_seconds()
        if seconds_since_last < 60:
            raise RateLimitExceededException(
                f"Verification code was recently sent. Please wait {int(60 - seconds_since_last)} seconds."
            )

    otp_code = f"{random.randint(100000, 999999)}"
    pending.otp_code = otp_code
    pending.expiry_time = now + timedelta(minutes=10)
    pending.attempt_count = 0
    pending.last_resend_at = now
    db.commit()

    try:
        if req.verification_type == "phone" or pending.verification_type == "phone":
            NotificationService.send_sms_otp(pending.phone, otp_code)
        else:
            NotificationService.send_registration_success_acknowledgment(pending.email, pending.name, otp_code)
    except Exception as e:
        logger.error(f"Failed to resend registration verification code: {e}")

    return StandardApiResponse(
        success=True,
        message="Verification code sent successfully.",
        data={"email": pending.email, "phone": pending.phone}
    )


@router.post("/verify-registration")
def verify_registration(req: VerifyRegistrationRequest, db: Session = Depends(get_db)):
    """Verify pending registration OTP. Upon successful verification, creates the permanent user record."""
    identifier = (req.email or req.phone or "").strip().lower()
    code = req.code.strip()

    if not identifier or not code:
        raise RegistrationVerificationFailedException("Identifier (email/phone) and verification code are required.")

    pending = db.query(PendingRegistration).filter(
        or_(PendingRegistration.email.ilike(identifier), PendingRegistration.phone == identifier)
    ).first()

    if not pending:
        raise RegistrationVerificationFailedException("No pending registration found or verification already completed.")

    # Check attempt count limit (max 5)
    if pending.attempt_count >= pending.max_attempts:
        db.delete(pending)
        db.commit()
        raise OTPAttemptLimitExceededException("Maximum OTP retry attempts exceeded. Please register again.")

    # Check expiration
    if datetime.utcnow() > pending.expiry_time:
        db.delete(pending)
        db.commit()
        raise OTPExpiredException("Verification code has expired. Please request a new verification code.")

    # Check code match (support DB code and Twilio Verify code)
    from ...services.twilio_service import TwilioService
    is_code_valid = (pending.otp_code == code) or TwilioService.verify_otp(pending.phone, code) or TwilioService.verify_otp(pending.email, code)
    if not is_code_valid:
        pending.attempt_count += 1
        db.commit()
        raise InvalidOTPException(f"Invalid verification code. {pending.max_attempts - pending.attempt_count} attempts remaining.")

    # OTP is valid! Create permanent user in users table
    custom_id = generate_user_id(db)
    user = User(
        id=custom_id,
        name=pending.name,
        email=pending.email,
        phone=pending.phone,
        hashed_password=pending.hashed_password,
        role=pending.role,
        blood_group=pending.blood_group,
        emergency_contact_name=pending.emergency_contact_name,
        emergency_contact_phone=pending.emergency_contact_phone,
        emergency_contact_relation=pending.emergency_contact_relation,
        is_verified=True,
        email_verified=(pending.verification_type == "email"),
        phone_verified=(pending.verification_type == "phone"),
        two_factor_enabled=False
    )
    db.add(user)
    db.delete(pending)
    db.commit()
    db.refresh(user)

    access_token = AuthService.create_access_token(subject=user.email)

    return {
        "success": True,
        "message": "Registration verified and account created successfully.",
        "data": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role
        },
        # Backward compatibility for direct response consumers
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "phone": user.phone,
        "role": user.role,
        "createdAt": user.created_at,
        "accessToken": access_token
    }


# ── LOGIN ENDPOINTS ──────────────────────────────────────────────────

@router.post("/login", response_model=Token)
def login(login_in: UserLogin, db: Session = Depends(get_db)):
    """Authenticate user credentials, enforce registration verification, and process 2FA."""
    user = None

    if login_in.login_type == "email_password":
        email_clean = (login_in.email or "").strip().lower()
        user = db.query(User).filter(User.email.ilike(email_clean)).first()
        if not user or not AuthService.verify_password(login_in.password or "", user.hashed_password):
            raise InvalidCredentialsException("Incorrect email or password.")
            
    elif login_in.login_type == "phone_otp":
        phone_clean = (login_in.phone or "").strip()
        user = db.query(User).filter(User.phone == phone_clean).first()
        if not user:
            raise InvalidCredentialsException("User with this phone number does not exist.")
        from ...services.twilio_service import TwilioService
        is_otp_valid = (user.otp_code and user.otp_code == login_in.otp) or TwilioService.verify_otp(phone_clean, login_in.otp)
        if not is_otp_valid:
            raise InvalidOTPException("Incorrect OTP code. Please check and try again.")
        if not user.otp_code_expires or user.otp_code_expires < datetime.utcnow():
            raise OTPExpiredException("OTP code has expired. Please request a new OTP.")
        user.otp_code = None
        user.otp_code_expires = None
        db.commit()
        
    elif login_in.login_type == "biometric":
        email_clean = (login_in.email or "").strip().lower()
        user = db.query(User).filter(User.email.ilike(email_clean)).first()
        if not user:
            raise UserNotFoundException("User not found.")
        if not user.biometric_public_key:
            raise InvalidCredentialsException("Biometric login is not enrolled for this account.")
        if not login_in.biometric_token:
            raise InvalidCredentialsException("Invalid or missing biometric token.")
        
        try:
            parts = login_in.biometric_token.split(":")
            if len(parts) != 2:
                raise ValueError("Invalid token format.")
            timestamp_str, signature = parts
            timestamp = int(timestamp_str)
            server_now = int(datetime.utcnow().timestamp() * 1000)
            if abs(server_now - timestamp) > 5 * 60 * 1000:
                raise InvalidCredentialsException("Biometric token has expired.")
            import hmac
            import hashlib
            expected_signature = hmac.new(
                user.biometric_public_key.encode("utf-8"),
                timestamp_str.encode("utf-8"),
                hashlib.sha256
            ).hexdigest()
            if not hmac.compare_digest(signature, expected_signature):
                raise InvalidCredentialsException("Biometric signature verification failed.")
        except Exception as e:
            raise InvalidCredentialsException(f"Biometric authentication failed: {str(e)}")
    else:
        raise InvalidCredentialsException("Unsupported login type.")

    # Validate verification status
    if not user.is_verified:
        raise UserNotVerifiedException("Your account is not verified yet. Please complete verification before logging in.")

    # Process Two-Factor Authentication (2FA) if enabled
    if user.two_factor_enabled:
        two_fa_code = f"{random.randint(100000, 999999)}"
        temp_token = AuthService.create_access_token(
            subject=f"temp_2fa:{user.email}",
            expires_delta=timedelta(minutes=5)
        )
        now = datetime.utcnow()
        expiry = now + timedelta(minutes=5)

        # Clear existing 2FA sessions for this user
        db.query(TwoFactorSession).filter(TwoFactorSession.user_id == user.id).delete()

        session_2fa = TwoFactorSession(
            user_id=user.id,
            email=user.email,
            otp_code=two_fa_code,
            expiry_time=expiry,
            attempt_count=0,
            temp_token=temp_token,
            created_at=now
        )
        db.add(session_2fa)
        
        # Also store on user model for legacy compatibility
        user.otp_code = two_fa_code
        user.otp_code_expires = expiry
        db.commit()

        try:
            NotificationService.send_2fa_code(user.email, user.phone, two_fa_code)
        except Exception as e:
            logger.error(f"Failed to send 2FA code: {e}")

        return Token(
            requires_2fa=True,
            requires2fa=True,
            temp_token=temp_token,
            user=user
        )

    # 2FA not enabled: complete login
    try:
        NotificationService.send_email_login_alert(user.email)
    except Exception:
        pass

    access_token = AuthService.create_access_token(subject=user.email)
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=user
    )


@router.post("/verify-2fa", response_model=Token)
def verify_2fa(verify_in: Verify2FA, db: Session = Depends(get_db)):
    """Verify 2FA verification code and return access token."""
    subject = AuthService.decode_access_token(verify_in.temp_token)
    if not subject or not subject.startswith("temp_2fa:"):
        raise TwoFactorVerificationFailedException("Invalid or expired temporary session token.")

    email_from_token = subject.split("temp_2fa:")[1]
    user = db.query(User).filter(User.email.ilike(email_from_token)).first()
    if not user:
        raise UserNotFoundException("User account not found.")

    is_biometric = ":" in verify_in.code
    if is_biometric:
        if not user.biometric_public_key:
            raise InvalidCredentialsException("Biometric login is not enrolled for this account.")
        try:
            parts = verify_in.code.split(":")
            if len(parts) != 2:
                raise ValueError("Invalid biometric token format.")
            timestamp_str, signature = parts
            timestamp = int(timestamp_str)
            server_now = int(datetime.utcnow().timestamp() * 1000)
            if abs(server_now - timestamp) > 5 * 60 * 1000:
                raise InvalidCredentialsException("Biometric token has expired.")
            import hmac
            import hashlib
            expected_signature = hmac.new(
                user.biometric_public_key.encode("utf-8"),
                timestamp_str.encode("utf-8"),
                hashlib.sha256
            ).hexdigest()
            if not hmac.compare_digest(signature, expected_signature):
                raise InvalidCredentialsException("Biometric signature verification failed.")
        except Exception as e:
            raise TwoFactorVerificationFailedException(f"Biometric 2FA verification failed: {str(e)}")
    else:
        # Check TwoFactorSession table first
        session_2fa = db.query(TwoFactorSession).filter(
            TwoFactorSession.temp_token == verify_in.temp_token
        ).first()

        code_to_check = session_2fa.otp_code if session_2fa else user.otp_code
        expiry_to_check = session_2fa.expiry_time if session_2fa else user.otp_code_expires

        if session_2fa:
            if session_2fa.attempt_count >= session_2fa.max_attempts:
                db.delete(session_2fa)
                db.commit()
                raise OTPAttemptLimitExceededException("Maximum 2FA verification attempts exceeded. Please login again.")
            session_2fa.attempt_count += 1
            db.commit()

        if not expiry_to_check or datetime.utcnow() > expiry_to_check:
            if session_2fa:
                db.delete(session_2fa)
                db.commit()
            raise OTPExpiredException("2FA verification code has expired.")

        from ...services.twilio_service import TwilioService
        submitted_code = verify_in.code.strip()
        is_valid_code = (code_to_check and code_to_check == submitted_code) or TwilioService.verify_otp(user.phone or user.email, submitted_code)
        if not is_valid_code:
            raise InvalidOTPException("Invalid 2FA verification code.")

        if session_2fa:
            db.delete(session_2fa)

    # Clear 2FA OTP on user object
    user.otp_code = None
    user.otp_code_expires = None
    db.commit()
    db.refresh(user)

    try:
        NotificationService.send_email_login_alert(user.email)
    except Exception:
        pass

    access_token = AuthService.create_access_token(subject=user.email)
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=user
    )


@router.post("/resend-otp", response_model=StandardApiResponse)
def resend_otp(req: ResendOTPRequest, db: Session = Depends(get_db)):
    """Resend OTP for pending registration or active 2FA session."""
    if req.type == "2fa" and req.temp_token:
        subject = AuthService.decode_access_token(req.temp_token)
        if not subject or not subject.startswith("temp_2fa:"):
            raise TwoFactorVerificationFailedException("Invalid or expired session token.")
        email_from_token = subject.split("temp_2fa:")[1]
        user = db.query(User).filter(User.email.ilike(email_from_token)).first()
        if not user:
            raise UserNotFoundException("User not found.")

        otp_code = f"{random.randint(100000, 999999)}"
        expiry = datetime.utcnow() + timedelta(minutes=5)

        session_2fa = db.query(TwoFactorSession).filter(TwoFactorSession.user_id == user.id).first()
        if session_2fa:
            session_2fa.otp_code = otp_code
            session_2fa.expiry_time = expiry
            session_2fa.attempt_count = 0
        user.otp_code = otp_code
        user.otp_code_expires = expiry
        db.commit()

        try:
            NotificationService.send_2fa_code(user.email, user.phone, otp_code)
        except Exception as e:
            logger.error(f"Failed to resend 2FA code: {e}")

        return StandardApiResponse(
            success=True,
            message="2FA verification code resent successfully.",
            data={"email": user.email}
        )
    else:
        # Pending registration OTP resend
        identifier = (req.email or req.phone or "").strip().lower()
        pending = db.query(PendingRegistration).filter(
            or_(PendingRegistration.email.ilike(identifier), PendingRegistration.phone == identifier)
        ).first()

        if not pending:
            raise RegistrationVerificationFailedException("No pending registration found for this email/phone.")

        now = datetime.utcnow()
        if pending.last_resend_at:
            seconds_since_last = (now - pending.last_resend_at).total_seconds()
            if seconds_since_last < 60:
                raise RateLimitExceededException(f"Please wait {int(60 - seconds_since_last)} seconds before requesting another code.")

        otp_code = f"{random.randint(100000, 999999)}"
        pending.otp_code = otp_code
        pending.expiry_time = now + timedelta(minutes=10)
        pending.attempt_count = 0
        pending.last_resend_at = now
        db.commit()

        try:
            if pending.verification_type == "phone":
                NotificationService.send_sms_otp(pending.phone, otp_code)
            else:
                NotificationService.send_registration_success_acknowledgment(pending.email, pending.name, otp_code)
        except Exception as e:
            logger.error(f"Failed to resend OTP: {e}")

        return StandardApiResponse(
            success=True,
            message="Verification OTP resent successfully.",
            data={"email": pending.email, "phone": pending.phone}
        )


# ── LEGACY & SUPPORT ENDPOINTS (Full Backward Compatibility) ────────

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/register-biometric", response_model=UserResponse)
def register_biometric(biometric_in: BiometricRegister, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == biometric_in.email).first()
    if not user:
        raise UserNotFoundException("User not found.")
    user.biometric_public_key = biometric_in.biometric_public_key
    db.commit()
    db.refresh(user)
    return user


@router.post("/confirm-email")
def confirm_email(confirm_in: EmailConfirm, db: Session = Depends(get_db)):
    """Legacy confirm email endpoint; routes to verify-registration if user in pending_registrations."""
    email_clean = confirm_in.email.strip().lower()
    
    # First check pending_registrations
    pending = db.query(PendingRegistration).filter(PendingRegistration.email.ilike(email_clean)).first()
    if pending:
        req = VerifyRegistrationRequest(email=email_clean, code=confirm_in.code)
        return verify_registration(req, db)

    user = db.query(User).filter(User.email.ilike(email_clean)).first()
    if not user:
        raise UserNotFoundException("User account not found.")
    if user.is_verified:
        return user
    if user.verification_code != confirm_in.code and user.otp_code != confirm_in.code:
        raise InvalidOTPException("Invalid verification code.")
    if user.verification_code_expires and user.verification_code_expires < datetime.utcnow():
        raise OTPExpiredException("Verification code has expired. Please request a new code.")
    
    user.is_verified = True
    user.email_verified = True
    user.verification_code = None
    user.verification_code_expires = None
    db.commit()
    db.refresh(user)
    return user


@router.post("/request-otp")
def request_otp(otp_req: OTPRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.phone == otp_req.phone).first()
    if not user:
        raise UserNotFoundException("User with this phone number does not exist.")
    
    otp_code = f"{random.randint(100000, 999999)}"
    user.otp_code = otp_code
    user.otp_code_expires = datetime.utcnow() + timedelta(minutes=5)
    db.commit()
    
    try:
        NotificationService.send_sms_otp(user.phone, otp_code)
    except Exception as e:
        logger.error(f"Failed to send SMS OTP: {e}")
        
    return {"status": "success", "message": "OTP sent successfully."}


@router.post("/toggle-2fa", response_model=UserResponse)
def toggle_2fa(toggle_in: Toggle2FA, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    current_user.two_factor_enabled = toggle_in.enabled
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/resend-verification-email")
def resend_verification_email(resend_in: ResendEmailRequest, db: Session = Depends(get_db)):
    email_clean = resend_in.email.strip().lower()
    
    pending = db.query(PendingRegistration).filter(PendingRegistration.email.ilike(email_clean)).first()
    if pending:
        req = SendVerificationRequest(email=email_clean, verification_type="email")
        return send_verification(req, db)

    user = db.query(User).filter(User.email.ilike(email_clean)).first()
    if not user:
        raise UserNotFoundException("User account not found.")
    if user.is_verified:
        raise EmailAlreadyVerifiedException("Your email is already verified. You can log in directly.")
        
    verification_code = f"{random.randint(100000, 999999)}"
    user.verification_code = verification_code
    user.verification_code_expires = datetime.utcnow() + timedelta(minutes=10)
    db.commit()
    
    try:
        NotificationService.send_registration_success_acknowledgment(user.email, user.name, verification_code)
    except Exception as e:
        logger.error(f"Failed to resend registration/verification email: {e}")
        
    return {"status": "success", "message": "Verification email resent successfully."}


@router.post("/resend-2fa-code")
def resend_2fa_code(resend_in: Resend2FARequest, db: Session = Depends(get_db)):
    req = ResendOTPRequest(email=resend_in.email, temp_token=resend_in.temp_token, type="2fa")
    return resend_otp(req, db)
