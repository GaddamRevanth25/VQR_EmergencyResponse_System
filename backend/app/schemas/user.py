from pydantic import BaseModel, EmailStr, ConfigDict, model_validator
from pydantic.alias_generators import to_camel
from typing import Optional, Literal
from datetime import datetime

class UserBase(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True
    )
    email: EmailStr
    name: str
    phone: str
    role: Optional[str] = "Users"
    blood_group: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_relation: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True
    )
    login_type: Literal["email_password", "phone_otp", "biometric"] = "email_password"
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    phone: Optional[str] = None
    otp: Optional[str] = None
    biometric_token: Optional[str] = None
    device_id: Optional[str] = None

    @model_validator(mode="after")
    def validate_login_credentials(self) -> 'UserLogin':
        if self.login_type == "email_password":
            if not self.email or not self.password:
                raise ValueError("Email and password are required for email_password login.")
        elif self.login_type == "phone_otp":
            if not self.phone or not self.otp:
                raise ValueError("Phone number and OTP are required for phone_otp login.")
        elif self.login_type == "biometric":
            if not self.biometric_token or not self.device_id:
                raise ValueError("Biometric token and device ID are required for biometric login.")
        return self


class UserResponse(UserBase):
    id: str
    created_at: datetime

class Token(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True
    )
    access_token: Optional[str] = None
    token_type: str = "bearer"
    user: Optional[UserResponse] = None
    requires_2fa: Optional[bool] = False
    temp_token: Optional[str] = None

class TokenData(BaseModel):
    email: Optional[str] = None

class BiometricRegister(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True
    )
    email: EmailStr
    biometric_public_key: str

class EmailConfirm(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True
    )
    email: EmailStr
    code: str

class OTPRequest(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True
    )
    phone: str

class Verify2FA(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True
    )
    email: EmailStr
    code: str
    temp_token: str

class Toggle2FA(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True
    )
    enabled: bool

class ResendEmailRequest(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True
    )
    email: EmailStr

class Resend2FARequest(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True
    )
    email: EmailStr
    temp_token: str




