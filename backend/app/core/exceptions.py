from typing import Any, Optional
from fastapi import status

class AppException(Exception):
    """Base application exception with error code and HTTP status code."""
    def __init__(
        self,
        message: str,
        error_code: str = "INTERNAL_ERROR",
        status_code: int = status.HTTP_400_BAD_REQUEST,
        data: Optional[Any] = None
    ):
        super().__init__(message)
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        self.data = data or {}

# ── Registration Exceptions ──

class UserAlreadyExistsException(AppException):
    def __init__(self, message: str = "An account with this email or phone number is already registered."):
        super().__init__(message=message, error_code="USER_ALREADY_EXISTS", status_code=status.HTTP_400_BAD_REQUEST)

class EmailAlreadyVerifiedException(AppException):
    def __init__(self, message: str = "Your email address is already verified."):
        super().__init__(message=message, error_code="EMAIL_ALREADY_VERIFIED", status_code=status.HTTP_400_BAD_REQUEST)

class PhoneAlreadyVerifiedException(AppException):
    def __init__(self, message: str = "Your phone number is already verified."):
        super().__init__(message=message, error_code="PHONE_ALREADY_VERIFIED", status_code=status.HTTP_400_BAD_REQUEST)

class InvalidOTPException(AppException):
    def __init__(self, message: str = "Invalid verification code. Please check and try again."):
        super().__init__(message=message, error_code="INVALID_OTP", status_code=status.HTTP_400_BAD_REQUEST)

class OTPExpiredException(AppException):
    def __init__(self, message: str = "Verification code has expired. Please request a new code."):
        super().__init__(message=message, error_code="OTP_EXPIRED", status_code=status.HTTP_400_BAD_REQUEST)

class OTPAttemptLimitExceededException(AppException):
    def __init__(self, message: str = "Too many failed attempts. Please request a new verification code."):
        super().__init__(message=message, error_code="OTP_ATTEMPT_LIMIT_EXCEEDED", status_code=status.HTTP_429_TOO_MANY_REQUESTS)

class RegistrationVerificationFailedException(AppException):
    def __init__(self, message: str = "Registration verification failed."):
        super().__init__(message=message, error_code="REGISTRATION_VERIFICATION_FAILED", status_code=status.HTTP_400_BAD_REQUEST)

# ── Login Exceptions ──

class UserNotFoundException(AppException):
    def __init__(self, message: str = "User account not found."):
        super().__init__(message=message, error_code="USER_NOT_FOUND", status_code=status.HTTP_404_NOT_FOUND)

class InvalidCredentialsException(AppException):
    def __init__(self, message: str = "Incorrect credentials. Please check and try again."):
        super().__init__(message=message, error_code="INVALID_CREDENTIALS", status_code=status.HTTP_401_UNAUTHORIZED)

class UserNotVerifiedException(AppException):
    def __init__(self, message: str = "Account registration is not verified yet. Please complete verification."):
        super().__init__(message=message, error_code="USER_NOT_VERIFIED", status_code=status.HTTP_403_FORBIDDEN)

class AccountLockedException(AppException):
    def __init__(self, message: str = "Your account has been locked due to security concerns. Please contact support."):
        super().__init__(message=message, error_code="ACCOUNT_LOCKED", status_code=status.HTTP_403_FORBIDDEN)

class TwoFactorRequiredException(AppException):
    def __init__(self, message: str = "Two-factor authentication is required."):
        super().__init__(message=message, error_code="TWO_FACTOR_REQUIRED", status_code=status.HTTP_200_OK)

class TwoFactorVerificationFailedException(AppException):
    def __init__(self, message: str = "Invalid or expired 2FA verification code."):
        super().__init__(message=message, error_code="TWO_FACTOR_VERIFICATION_FAILED", status_code=status.HTTP_400_BAD_REQUEST)

class RateLimitExceededException(AppException):
    def __init__(self, message: str = "Please wait a moment before requesting another code."):
        super().__init__(message=message, error_code="RATE_LIMIT_EXCEEDED", status_code=status.HTTP_429_TOO_MANY_REQUESTS)
