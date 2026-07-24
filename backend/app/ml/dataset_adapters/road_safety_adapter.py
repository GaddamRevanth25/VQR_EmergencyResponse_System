"""
dataset_adapters/road_safety_adapter.py
=========================================
Adapter for the "Harnessing Smartphone Sensors for Enhanced Road Safety: A
Comprehensive Dataset and Review" dataset (Khandakar et al., arXiv:2411.07315,
Nature Scientific Data 2024/2025).

VERIFIED against real downloaded data (2026-07-23)
-----------------------------------------------------
Unlike the first draft of this adapter, this version was written and tested
against the actual "Road Data.zip" export, not just the paper's description.
Confirmed real layout:

    data/raw/road_safety/
        Driving Behaviour/
            1. Aggressive/   Accelerometer.csv  Gyroscope.csv  Magnetometer.csv
                              Location.csv  Metadata.csv  (+ Gravity/Orientation/
                              TotalAcceleration/*Uncalibrated -- not used here)
            2. Aggressive/ ...
            3. Standard/ ...
            5. Slow/ ...
        Road Anomalies/
            1. Bump/ ...
            10. Pothole/ ...

Confirmed real columns (differs from the pre-download draft in two ways,
noted below):
    Accelerometer.csv / Gyroscope.csv / Magnetometer.csv:
        time, seconds_elapsed, z, y, x        <- z/y/x order, not x/y/z, but
                                                  read by NAME so order doesn't
                                                  matter
    Location.csv:
        time, seconds_elapsed, bearingAccuracy, speedAccuracy,
        verticalAccuracy, horizontalAccuracy, speed, bearing, altitude,
        longitude, latitude
    Metadata.csv:
        version, device name, recording epoch time, recording time,
        recording timezone, platform, appVersion, device id, sensors,
        sampleRateMs

Two things the pre-download draft got wrong, fixed here:
1. Sampling rate is ~100 Hz (confirmed via seconds_elapsed diffs on a real
   session: mean interval 0.01001s +/- 0.000014s), NOT the ASSUMED_IMU_HZ=50
   this project's other adapters use. This adapter measures the ACTUAL rate
   per-session from seconds_elapsed rather than assuming a constant, and
   records the true value in sampling_rate_hz -- windowing is done in real
   time (config.WINDOW_SECONDS seconds), not a fixed sample count, so a
   session with slightly different timing still produces correct-duration
   windows.
2. Folder naming is "N. Bump" / "N. Pothole" / "N. Aggressive" / "N. Standard"
   / "N. Slow" (a leading number + period), which the label-keyword matcher
   already handled correctly (substring match on the lowercased folder name),
   so no change needed there -- confirmed working, not just assumed.

Important dataset limitation (documented, not hidden -- same policy as
cyclist_adapter.py / uah_driveset_adapter.py)
---------------------------------------------------------------------------
No crash labels here. Bump/pothole/aggressive/standard/slow are all hard
NEGATIVES (label=0) for a vehicle-crash detector. Per the research report's
gap analysis, this dataset fills the "braking/pothole/speed-breaker/sharp-
turn negatives" gap, not the "real crash" gap -- that gap is addressed
separately by vzcrash_adapter.py.
"""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd

from app.ml import config
from app.ml.dataset_adapters.base import BaseDatasetAdapter
from app.ml.feature_engineering import extract_axis_stats, sliding_windows

logger = logging.getLogger(__name__)

# Folder-name keyword -> anomaly/behavior type. All of these are NEGATIVES
# (label=0) for the crash classifier -- see module docstring. Confirmed
# against the real folder names ("1. Bump", "10. Pothole", "1. Aggressive",
# "3. Standard", "5. Slow").
LABEL_KEYWORDS = ["bump", "pothole", "aggressive", "standard", "slow"]

EARTH_RADIUS_M = 6_371_000.0


def _haversine_m(lat1, lon1, lat2, lon2) -> float:
    lat1, lon1, lat2, lon2 = map(np.radians, (lat1, lon1, lat2, lon2))
    dlat, dlon = lat2 - lat1, lon2 - lon1
    a = np.sin(dlat / 2) ** 2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon / 2) ** 2
    return float(2 * EARTH_RADIUS_M * np.arcsin(np.sqrt(a)))


def _bearing_deg(lat1, lon1, lat2, lon2) -> float:
    lat1, lon1, lat2, lon2 = map(np.radians, (lat1, lon1, lat2, lon2))
    dlon = lon2 - lon1
    x = np.sin(dlon) * np.cos(lat2)
    y = np.cos(lat1) * np.sin(lat2) - np.sin(lat1) * np.cos(lat2) * np.cos(dlon)
    return float((np.degrees(np.arctan2(x, y)) + 360) % 360)


class RoadSafetyAdapter(BaseDatasetAdapter):
    name = "road_safety_normal"

    def __init__(self, root: Optional[Path] = None):
        self.root = root or (config.DATA_RAW_DIR / "road_safety")

    def is_available(self) -> bool:
        return self.root.exists() and any(self.root.rglob("Accelerometer.csv"))

    @staticmethod
    def _read_sensor(path: Path, value_cols: list[str]) -> Optional[pd.DataFrame]:
        if not path.exists():
            return None
        df = pd.read_csv(path)
        df.columns = [c.strip() for c in df.columns]
        needed = ["seconds_elapsed"] + value_cols
        missing = [c for c in needed if c not in df.columns]
        if missing:
            logger.warning("%s missing expected columns %s (found %s)", path, missing, list(df.columns))
            return None
        return df[needed]

    def _find_sessions(self):
        for acc_path in sorted(self.root.rglob("Accelerometer.csv")):
            folder = acc_path.parent
            yield folder

    @staticmethod
    def _folder_label_type(folder: Path) -> str:
        name_lower = folder.name.lower()
        for kw in LABEL_KEYWORDS:
            if kw in name_lower:
                return kw
        return "unknown"

    @staticmethod
    def _native_hz(seconds_elapsed: np.ndarray) -> float:
        """Measures the real sampling rate from timestamps rather than
        assuming one -- see module docstring point 1."""
        diffs = np.diff(seconds_elapsed)
        diffs = diffs[diffs > 0]
        if diffs.size == 0:
            return config.ASSUMED_IMU_HZ
        return float(1.0 / np.median(diffs))

    def load(self) -> pd.DataFrame:
        rows = []
        session_count = 0

        for folder in self._find_sessions():
            session_count += 1
            acc = self._read_sensor(folder / "Accelerometer.csv", ["x", "y", "z"])
            gyro = self._read_sensor(folder / "Gyroscope.csv", ["x", "y", "z"])
            mag = self._read_sensor(folder / "Magnetometer.csv", ["x", "y", "z"])
            gps = self._read_sensor(folder / "Location.csv", ["speed", "latitude", "longitude", "bearing"])
            if acc is None or acc.empty:
                continue

            native_hz = self._native_hz(acc["seconds_elapsed"].to_numpy())
            window_size = max(int(config.WINDOW_SECONDS * native_hz), 4)
            step = max(int(window_size * (1 - config.WINDOW_OVERLAP)), 1)

            acc_mag = np.sqrt(acc["x"] ** 2 + acc["y"] ** 2 + acc["z"] ** 2).to_numpy()
            n_acc = len(acc_mag)
            has_gyro = gyro is not None and not gyro.empty
            has_mag = mag is not None and not mag.empty
            has_gps = gps is not None and not gps.empty
            gyro_mag = (
                np.sqrt(gyro["x"] ** 2 + gyro["y"] ** 2 + gyro["z"] ** 2).to_numpy()
                if has_gyro else None
            )

            label_type = self._folder_label_type(folder)
            session_id = folder.name.replace(" ", "_").replace(".", "")

            for w_idx, (start, end) in enumerate(sliding_windows(n_acc, window_size, step)):
                acc_feats = extract_axis_stats(acc_mag[start:end], prefix="acc")

                if has_gyro:
                    g0 = int(start / n_acc * len(gyro_mag))
                    g1 = int(end / n_acc * len(gyro_mag))
                    gyro_feats = extract_axis_stats(gyro_mag[g0:g1], prefix="gyro")
                else:
                    gyro_feats = extract_axis_stats(np.array([]), prefix="gyro")

                gps_feats = {
                    "gps_max_speed": np.nan, "gps_mean_speed": np.nan,
                    "gps_speed_drop": np.nan, "gps_distance": np.nan,
                    "gps_heading_change": np.nan,
                }
                if has_gps:
                    i0 = int(start / n_acc * len(gps))
                    i1 = max(int(end / n_acc * len(gps)), i0 + 2)
                    i1 = min(i1, len(gps))
                    seg = gps.iloc[i0:i1]
                    if len(seg) >= 2:
                        speeds = seg["speed"].to_numpy(dtype=float)  # Sensor Logger app: speed already in m/s
                        gps_feats["gps_max_speed"] = float(np.nanmax(speeds))
                        gps_feats["gps_mean_speed"] = float(np.nanmean(speeds))
                        gps_feats["gps_speed_drop"] = float(speeds[0] - np.nanmin(speeds))
                        lats, lons = seg["latitude"].to_numpy(), seg["longitude"].to_numpy()
                        dist = sum(
                            _haversine_m(lats[i], lons[i], lats[i + 1], lons[i + 1])
                            for i in range(len(lats) - 1)
                        )
                        gps_feats["gps_distance"] = dist
                        b_start = _bearing_deg(lats[0], lons[0], lats[1], lons[1])
                        b_end = _bearing_deg(lats[-2], lons[-2], lats[-1], lons[-1])
                        heading_change = abs(b_end - b_start)
                        gps_feats["gps_heading_change"] = min(heading_change, 360 - heading_change)

                row = {
                    "window_id": f"roadsafety_{label_type}_{session_id}_w{w_idx}",
                    **acc_feats,
                    **gyro_feats,
                    "lin_acc_max": np.nan,
                    **gps_feats,
                    "sampling_rate_hz": native_hz,
                    "window_size_s": config.WINDOW_SECONDS,
                    "has_accel": True,
                    "has_gyro": has_gyro,
                    "has_gps": has_gps,
                    "has_magnetometer": has_mag,
                    "label": 0,  # documented assumption: bump/pothole/driving-style are hard negatives, not crashes
                }
                rows.append(row)

        if not rows:
            logger.warning("RoadSafetyAdapter found no usable sessions under %s", self.root)
            return pd.DataFrame(columns=config.ALL_MASTER_COLUMNS)

        logger.info("RoadSafetyAdapter processed %d sessions under %s", session_count, self.root)
        return pd.DataFrame(rows)
