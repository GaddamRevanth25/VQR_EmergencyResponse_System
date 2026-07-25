import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean
from ..core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String(14), primary_key=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    phone = Column(String(20), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), default="User")
    blood_group = Column(String(10), nullable=True)
    emergency_contact_name = Column(String(100), nullable=True)
    emergency_contact_phone = Column(String(20), nullable=True)
    emergency_contact_relation = Column(String(50), nullable=True)
    emergency_contact_email = Column(String(100), nullable=True)
    biometric_public_key = Column(String, nullable=True)
    
    # Advanced Auth & 2FA fields
    is_verified = Column(Boolean, default=False)
    two_factor_enabled = Column(Boolean, default=False)
    verification_code = Column(String(6), nullable=True)
    verification_code_expires = Column(DateTime, nullable=True)
    otp_code = Column(String(6), nullable=True)
    otp_code_expires = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)



