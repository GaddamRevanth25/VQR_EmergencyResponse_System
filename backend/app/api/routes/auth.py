import random
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ...core.database import get_db
from ...models.user import User
from ...schemas.user import (
    UserCreate, UserLogin, UserResponse, Token, BiometricRegister,
    EmailConfirm, OTPRequest, Verify2FA, Toggle2FA, ResendEmailRequest, Resend2FARequest
)
from ...services.auth_service import AuthService
from ...services.notification_service import NotificationService
from ..deps import get_current_user

router = APIRouter(prefix="/auth", tags=["authentication"])

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists by email or phone
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    existing_phone = db.query(User).filter(User.phone == user_in.phone).first()
    
    if existing_phone and (not existing_user or existing_user.id != existing_phone.id):
        if existing_phone.is_verified:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A user with this phone number already exists."
            )
        else:
            # Clean up the unverified user with the duplicate phone number to free it up
            db.delete(existing_phone)
            db.commit()
    
    hashed_password = AuthService.hash_password(user_in.password)
    verification_code = f"{random.randint(100000, 999999)}"
    verification_expires = datetime.utcnow() + timedelta(minutes=10)

    if existing_user:
        if existing_user.is_verified:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A user with this email address already exists."
            )
        else:
            # Update the existing unverified user with new details and a fresh verification code
            existing_user.name = user_in.name
            existing_user.phone = user_in.phone
            existing_user.hashed_password = hashed_password
            existing_user.role = user_in.role
            existing_user.blood_group = user_in.blood_group
            existing_user.emergency_contact_name = user_in.emergency_contact_name
            existing_user.emergency_contact_phone = user_in.emergency_contact_phone
            existing_user.emergency_contact_relation = user_in.emergency_contact_relation
            existing_user.verification_code = verification_code
            existing_user.verification_code_expires = verification_expires
            
            db.commit()
            db.refresh(existing_user)
            user = existing_user
    else:
        # Generate custom user ID (Format: 10 + current_year + 4-digit sequence)
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
            
        custom_id = f"{prefix}{next_seq:04d}"
        
        user = User(
            id=custom_id,
            name=user_in.name,
            email=user_in.email,
            phone=user_in.phone,
            hashed_password=hashed_password,
            role=user_in.role,
            blood_group=user_in.blood_group,
            emergency_contact_name=user_in.emergency_contact_name,
            emergency_contact_phone=user_in.emergency_contact_phone,
            emergency_contact_relation=user_in.emergency_contact_relation,
            is_verified=False,
            verification_code=verification_code,
            verification_code_expires=verification_expires
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    
    # Send verification email with registration success acknowledgment
    try:
        NotificationService.send_registration_success_acknowledgment(user.email, user.name, verification_code)
    except Exception as e:
        import logging
        logging.getLogger("uvicorn.error").error(f"Failed to send registration/verification email: {e}")
        
    return user

@router.post("/login", response_model=Token)
def login(login_in: UserLogin, db: Session = Depends(get_db)):
    if login_in.login_type == "email_password":
        user = db.query(User).filter(User.email == login_in.email).first()
        if not user or not AuthService.verify_password(login_in.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Incorrect email or password."
            )
    elif login_in.login_type == "phone_otp":
        user = db.query(User).filter(User.phone == login_in.phone).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this phone number does not exist."
            )
        # Verify OTP code
        if not user.otp_code or user.otp_code != login_in.otp:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Incorrect OTP."
            )
        if not user.otp_code_expires or user.otp_code_expires < datetime.utcnow():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="OTP has expired."
            )
        # Clear OTP after successful use
        user.otp_code = None
        user.otp_code_expires = None
        db.commit()
    elif login_in.login_type == "biometric":
        if not login_in.email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email is required for biometric authentication."
            )
        user = db.query(User).filter(User.email == login_in.email).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User not found."
            )
        if not user.biometric_public_key:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Biometric login is not enrolled for this account."
            )
        if not login_in.biometric_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or missing biometric token."
            )
        
        # Verify HMAC-SHA256 signature
        try:
            parts = login_in.biometric_token.split(":")
            if len(parts) != 2:
                raise ValueError("Invalid token format.")
            timestamp_str, signature = parts
            timestamp = int(timestamp_str)
            
            # Check for replay attack (5-minute expiration window)
            server_now = int(datetime.utcnow().timestamp() * 1000)
            if abs(server_now - timestamp) > 5 * 60 * 1000:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Biometric token has expired (time desync or replay attempt)."
                )
            
            import hmac
            import hashlib
            expected_signature = hmac.new(
                user.biometric_public_key.encode("utf-8"),
                timestamp_str.encode("utf-8"),
                hashlib.sha256
            ).hexdigest()
            
            if not hmac.compare_digest(signature, expected_signature):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Biometric signature verification failed."
                )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Biometric authentication failed: {str(e)}"
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported login type."
        )

    # Check email confirmation/verification status
    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email address has not been confirmed yet."
        )

    # Check 2FA
    if user.two_factor_enabled:
        two_fa_code = f"{random.randint(100000, 999999)}"
        user.otp_code = two_fa_code
        user.otp_code_expires = datetime.utcnow() + timedelta(minutes=5)
        db.commit()
        
        try:
            NotificationService.send_2fa_code(user.email, user.phone, two_fa_code)
        except Exception:
            pass
            
        temp_token = AuthService.create_access_token(
            subject=f"temp_2fa:{user.email}",
            expires_delta=timedelta(minutes=5)
        )
        return Token(requires_2fa=True, temp_token=temp_token)

    # Send login alert email
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

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/register-biometric", response_model=UserResponse)
def register_biometric(biometric_in: BiometricRegister, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == biometric_in.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found."
        )
    user.biometric_public_key = biometric_in.biometric_public_key
    db.commit()
    db.refresh(user)
    return user

@router.post("/confirm-email", response_model=UserResponse)
def confirm_email(confirm_in: EmailConfirm, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == confirm_in.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    if user.is_verified:
        return user
    if user.verification_code != confirm_in.code:
        raise HTTPException(status_code=400, detail="Invalid verification code.")
    if not user.verification_code_expires or user.verification_code_expires < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Verification code has expired.")
    
    user.is_verified = True
    user.verification_code = None
    user.verification_code_expires = None
    db.commit()
    db.refresh(user)
    return user

@router.post("/request-otp")
def request_otp(otp_req: OTPRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.phone == otp_req.phone).first()
    if not user:
        raise HTTPException(status_code=404, detail="User with this phone number does not exist.")
    
    otp_code = f"{random.randint(100000, 999999)}"
    user.otp_code = otp_code
    user.otp_code_expires = datetime.utcnow() + timedelta(minutes=5)
    db.commit()
    
    try:
        NotificationService.send_sms_otp(user.phone, otp_code)
    except Exception as e:
        import logging
        logging.getLogger("uvicorn.error").error(f"Failed to send SMS OTP: {e}")
        
    return {"status": "success", "message": "OTP sent successfully."}

@router.post("/verify-2fa", response_model=Token)
def verify_2fa(verify_in: Verify2FA, db: Session = Depends(get_db)):
    # Verify temporary token
    subject = AuthService.decode_access_token(verify_in.temp_token)
    if not subject or not subject.startswith("temp_2fa:"):
        raise HTTPException(status_code=401, detail="Invalid or expired temporary session token.")
    
    email_from_token = subject.split("temp_2fa:")[1]
    if email_from_token != verify_in.email:
        raise HTTPException(status_code=401, detail="Token mismatch.")
        
    user = db.query(User).filter(User.email == verify_in.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
        
    is_biometric = ":" in verify_in.code
    if is_biometric:
        if not user.biometric_public_key:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Biometric login is not enrolled for this account."
            )
        try:
            parts = verify_in.code.split(":")
            if len(parts) != 2:
                raise ValueError("Invalid biometric token format.")
            timestamp_str, signature = parts
            timestamp = int(timestamp_str)
            
            # Check for replay attack (5-minute expiration window)
            server_now = int(datetime.utcnow().timestamp() * 1000)
            if abs(server_now - timestamp) > 5 * 60 * 1000:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Biometric token has expired (time desync or replay attempt)."
                )
            
            import hmac
            import hashlib
            expected_signature = hmac.new(
                user.biometric_public_key.encode("utf-8"),
                timestamp_str.encode("utf-8"),
                hashlib.sha256
            ).hexdigest()
            
            if not hmac.compare_digest(signature, expected_signature):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Biometric signature verification failed."
                )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Biometric 2FA verification failed: {str(e)}"
            )
    else:
        if user.otp_code != verify_in.code:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid 2FA code.")
            
        if not user.otp_code_expires or user.otp_code_expires < datetime.utcnow():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="2FA code has expired.")
        
    # Clear 2FA OTP
    user.otp_code = None
    user.otp_code_expires = None
    db.commit()
    db.refresh(user)
    
    # Send login alert
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

@router.post("/toggle-2fa", response_model=UserResponse)
def toggle_2fa(toggle_in: Toggle2FA, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    current_user.two_factor_enabled = toggle_in.enabled
    db.commit()
    db.refresh(current_user)
    return current_user

@router.post("/resend-verification-email")
def resend_verification_email(resend_in: ResendEmailRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == resend_in.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    if user.is_verified:
        raise HTTPException(status_code=400, detail="Email is already verified.")
        
    verification_code = f"{random.randint(100000, 999999)}"
    user.verification_code = verification_code
    user.verification_code_expires = datetime.utcnow() + timedelta(minutes=10)
    db.commit()
    
    try:
        NotificationService.send_registration_success_acknowledgment(user.email, user.name, verification_code)
    except Exception as e:
        import logging
        logging.getLogger("uvicorn.error").error(f"Failed to resend registration/verification email: {e}")
        
    return {"status": "success", "message": "Verification email resent successfully."}

@router.post("/resend-2fa-code")
def resend_2fa_code(resend_in: Resend2FARequest, db: Session = Depends(get_db)):
    # Verify temporary token
    subject = AuthService.decode_access_token(resend_in.temp_token)
    if not subject or not subject.startswith("temp_2fa:"):
        raise HTTPException(status_code=401, detail="Invalid or expired temporary session token.")
    
    email_from_token = subject.split("temp_2fa:")[1]
    if email_from_token != resend_in.email:
        raise HTTPException(status_code=401, detail="Token mismatch.")
        
    user = db.query(User).filter(User.email == resend_in.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
        
    otp_code = f"{random.randint(100000, 999999)}"
    user.otp_code = otp_code
    user.otp_code_expires = datetime.utcnow() + timedelta(minutes=5)
    db.commit()
    
    try:
        NotificationService.send_2fa_code(user.email, user.phone, otp_code)
    except Exception as e:
        import logging
        logging.getLogger("uvicorn.error").error(f"Failed to resend 2FA code: {e}")
        
    return {"status": "success", "message": "2FA verification code resent successfully."}



