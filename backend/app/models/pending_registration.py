import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Integer
from ..core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class PendingRegistration(Base):
    __tablename__ = "pending_registrations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(100), unique=True, index=True, nullable=False)
    phone = Column(String(20), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), default="User")
    blood_group = Column(String(10), nullable=True)
    emergency_contact_name = Column(String(100), nullable=True)
    emergency_contact_phone = Column(String(20), nullable=True)
    emergency_contact_relation = Column(String(50), nullable=True)
    
    verification_type = Column(String(20), default="email")  # "email" or "phone"
    otp_code = Column(String(100), nullable=False)
    expiry_time = Column(DateTime, nullable=False)
    attempt_count = Column(Integer, default=0)
    max_attempts = Column(Integer, default=5)
    last_resend_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
