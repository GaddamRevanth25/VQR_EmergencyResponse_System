"""
Validation utilities for sensor data.
"""

from typing import Dict, Tuple


def validate_sensor_packet(packet: Dict) -> Tuple[bool, str]:
    """
    Validate incoming sensor packet.

    Returns:
        (True, "Valid")
        (False, "Reason")
    """

    required_fields = [
        "timestamp",
        "accelerometer"
    ]

    for field in required_fields:
        if field not in packet:
            return False, f"Missing field: {field}"

    return True, "Valid"