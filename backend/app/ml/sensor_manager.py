"""
sensor_manager.py
==================
Runs on-device. Responsible for:

1. Detecting which sensors are actually available right now (permission
   denied, hardware absent, or a stream that stopped producing data).
2. Computing the exact same statistical features as feature_engineering.py
   over a live rolling buffer.
3. Building a feature row that matches the model's expected schema even
   when some sensors are missing -- this is what prevents "no crashes
   because a sensor is unavailable" (a hard requirement in the brief).

This module has zero training-time dependencies (no sklearn) so it can be
ported to on-device Python (e.g. Chaquopy/BeeWare) or transliterated to
Kotlin/Swift with the same logic.
"""
from __future__ import annotations

import logging
import time
from collections import deque
from dataclasses import dataclass, field
from typing import Deque, Dict, Optional

import numpy as np

from app.ml.feature_engineering import extract_axis_stats, signal_magnitude_vector

logger = logging.getLogger(__name__)


@dataclass
class SensorAvailability:
    has_accel: bool = False
    has_gyro: bool = False
    has_gps: bool = False
    has_magnetometer: bool = False
    last_update_ts: Dict[str, float] = field(default_factory=dict)

    STALE_AFTER_S = 3.0  # a sensor that hasn't reported in 3s is treated as unavailable

    def mark(self, sensor: str, ts: Optional[float] = None):
        self.last_update_ts[sensor] = ts if ts is not None else time.time()

    def is_live(self, sensor: str) -> bool:
        last = self.last_update_ts.get(sensor)
        if last is None:
            return False
        return (time.time() - last) <= self.STALE_AFTER_S

    def snapshot(self) -> Dict[str, bool]:
        return {
            "has_accel": self.is_live("accel"),
            "has_gyro": self.is_live("gyro"),
            "has_gps": self.is_live("gps"),
            "has_magnetometer": self.is_live("magnetometer"),
        }


class RollingWindowBuffer:
    """Fixed-size rolling buffer per axis, used to build the sliding window
    that feature_engineering.py's stat functions expect."""

    def __init__(self, maxlen: int):
        self.maxlen = maxlen
        self.x: Deque[float] = deque(maxlen=maxlen)
        self.y: Deque[float] = deque(maxlen=maxlen)
        self.z: Deque[float] = deque(maxlen=maxlen)

    def push(self, x: float, y: float, z: float):
        self.x.append(x); self.y.append(y); self.z.append(z)

    def is_full(self) -> bool:
        return len(self.x) == self.maxlen

    def magnitude(self) -> np.ndarray:
        if not self.x:
            return np.array([])
        return signal_magnitude_vector(list(self.x), list(self.y), list(self.z))


class SensorManager:
    """Owns the rolling buffers for every sensor and produces one feature
    row per completed window, using NaN placeholders for whatever sensor is
    currently unavailable (imputed downstream by the saved preprocessor --
    the exact same strategy used at training time, so there's no train/serve
    skew for the missing-sensor case)."""

    def __init__(self, window_size: int, feature_columns: list[str]):
        self.window_size = window_size
        self.feature_columns = feature_columns
        self.accel_buf = RollingWindowBuffer(window_size)
        self.gyro_buf = RollingWindowBuffer(window_size)
        self.availability = SensorAvailability()
        self.last_gps: Optional[dict] = None
        self.gps_history: Deque[dict] = deque(maxlen=50)

    def push_accel(self, x: float, y: float, z: float):
        self.accel_buf.push(x, y, z)
        self.availability.mark("accel")

    def push_gyro(self, x: float, y: float, z: float):
        self.gyro_buf.push(x, y, z)
        self.availability.mark("gyro")

    def push_magnetometer(self, x: float, y: float, z: float):
        self.availability.mark("magnetometer")

    def push_gps(self, lat: float, lon: float, speed: float, ts: float):
        self.last_gps = {"lat": lat, "lon": lon, "speed": speed, "ts": ts}
        self.gps_history.append(self.last_gps)
        self.availability.mark("gps", ts)

    def _gps_features(self) -> dict:
        feats = {"gps_max_speed": np.nan, "gps_mean_speed": np.nan,
                 "gps_speed_drop": np.nan, "gps_distance": np.nan,
                 "gps_heading_change": np.nan}
        if not self.availability.is_live("gps") or len(self.gps_history) < 2:
            return feats
        speeds = [p["speed"] for p in self.gps_history]
        feats["gps_max_speed"] = float(np.max(speeds))
        feats["gps_mean_speed"] = float(np.mean(speeds))
        feats["gps_speed_drop"] = float(speeds[0] - min(speeds))
        return feats

    def build_feature_row(self) -> Optional[Dict[str, float]]:
        """Returns None if not enough accel data has accumulated yet (a
        crash cannot be evaluated from an empty/partial window)."""
        avail = self.availability.snapshot()

        if not avail["has_accel"] or not self.accel_buf.is_full():
            return None  # accel is the one sensor we cannot function without

        acc_feats = extract_axis_stats(self.accel_buf.magnitude(), prefix="acc")

        if avail["has_gyro"] and self.gyro_buf.is_full():
            gyro_feats = extract_axis_stats(self.gyro_buf.magnitude(), prefix="gyro")
        else:
            gyro_feats = extract_axis_stats(np.array([]), prefix="gyro")
            logger.info("Gyroscope unavailable -- proceeding with accel-only features.")

        gps_feats = self._gps_features()

        row = {**acc_feats, **gyro_feats, **gps_feats, "lin_acc_max": np.nan, **avail}
        return {col: row.get(col, np.nan) for col in self.feature_columns}
