import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Integer
from ..core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class TwoFactorSession(Base):
    __tablename__ = "two_factor_sessions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(14), index=True, nullable=False)
    email = Column(String(100), index=True, nullable=False)
    otp_code = Column(String(100), nullable=False)
    expiry_time = Column(DateTime, nullable=False)
    attempt_count = Column(Integer, default=0)
    max_attempts = Column(Integer, default=5)
    temp_token = Column(String(255), unique=True, index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
