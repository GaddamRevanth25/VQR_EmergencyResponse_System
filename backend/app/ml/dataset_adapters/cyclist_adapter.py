"""
dataset_adapters/cyclist_adapter.py
====================================
Adapter for the "Cyclist Accident Prevention" raw-IMU dataset
(Route/Lap folders each containing accelerometer, gyroscope, magnetometer
and GPS CSVs with NO header row).

Important dataset limitation (documented, not hidden)
-------------------------------------------------------
This dataset contains only *normal riding* telemetry -- there are no
labelled crash events anywhere in the files. It is therefore used purely
as an additional source of NEGATIVE (label=0, "no crash") windows, engineered
with the exact same statistics as the fall dataset's positive windows. This
adapter must never be used as a source of positive/crash labels.

Column layout discovered by inspection (no header in source files):
    accelerometer: timestamp_ns; sensor_type(1); x; y; z; magnitude
    gyroscope:     timestamp_ns; sensor_type(3); x; y; z
    magnetometer:  timestamp_ns; sensor_type(2); x; y; z
    gps:           "GPS"; lat; lon; speed_mps; timestamp_ms_epoch; (3 empty)

Clock caveat: accelerometer/gyroscope/magnetometer timestamps are device
uptime in nanoseconds while GPS timestamps are Unix epoch milliseconds --
two different clocks. Exact cross-sensor alignment by absolute time is not
possible from these files alone, so GPS features are aligned to each IMU
window by *proportional position* within the session (assumes roughly
constant relative sampling rate across the ride, which held true in the
inspected files). This is a documented approximation, not a bug.
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

ACC_COLS = ["ts", "type", "x", "y", "z", "mag"]
GYRO_COLS = ["ts", "type", "x", "y", "z"]
GPS_COLS = ["tag", "lat", "lon", "speed", "ts_ms", "e1", "e2", "e3"]

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


class CyclistAdapter(BaseDatasetAdapter):
    name = "cyclist_normal"

    def __init__(self, root: Optional[Path] = None):
        self.root = root or (config.DATA_RAW_DIR / "cyclist")

    def is_available(self) -> bool:
        return self.root.exists() and any(self.root.rglob("*accelerometer*.csv"))

    # -- session discovery -------------------------------------------------
    def _find_sessions(self):
        """Each accelerometer file defines a session; sibling gyro/mag/gps
        files are located by swapping the sensor keyword in the filename."""
        for acc_path in sorted(self.root.rglob("*accelerometer*.csv")):
            folder = acc_path.parent
            stem = acc_path.name
            gyro_path = folder / stem.replace("accelerometer", "gyroscope")
            mag_path = folder / stem.replace("accelerometer", "magnetometer")
            # GPS filenames don't share the trailing _<lap>.csv.csv quirk seen
            # in one folder, so match by prefix before "_accelerometer".
            prefix = stem.split("_accelerometer")[0]
            gps_candidates = list(folder.glob(f"{prefix}_GPS*.csv"))
            gps_path = gps_candidates[0] if gps_candidates else None
            yield acc_path, gyro_path, mag_path, gps_path

    @staticmethod
    def _read_sensor_csv(path: Path, cols: list[str]) -> Optional[pd.DataFrame]:
        """Robust reader for the headerless, trailing-semicolon CSVs: reads
        raw rows as strings and pads/truncates to len(cols), independent of
        how many trailing empty fields a given file happens to have."""
        if path is None or not path.exists():
            return None
        with open(path, "r", errors="ignore") as fh:
            first_line = fh.readline()
        # Discovered inconsistency across routes: "First route" files use ';'
        # while "Second route" / some "Third route" files use ',' as the
        # field delimiter. Auto-detect rather than assuming one convention.
        sep = ";" if first_line.count(";") >= first_line.count(",") else ","
        raw = pd.read_csv(path, sep=sep, header=None, dtype=str, engine="python")
        n = min(len(cols), raw.shape[1])
        raw = raw.iloc[:, :n]
        raw.columns = cols[:n]
        for missing_col in cols[n:]:
            raw[missing_col] = pd.NA
        df = raw.copy()
        for c in df.columns:
            if c != "tag":
                df[c] = pd.to_numeric(df[c], errors="coerce")
        return df

    def _gps_window_features(self, gps_df: Optional[pd.DataFrame], frac_start: float, frac_end: float) -> dict:
        feats = {
            "gps_max_speed": np.nan, "gps_mean_speed": np.nan,
            "gps_speed_drop": np.nan, "gps_distance": np.nan,
            "gps_heading_change": np.nan,
        }
        if gps_df is None or gps_df.empty:
            return feats
        n = len(gps_df)
        i0, i1 = int(frac_start * n), max(int(frac_end * n), int(frac_start * n) + 2)
        i1 = min(i1, n)
        seg = gps_df.iloc[i0:i1]
        if len(seg) < 2:
            return feats
        speeds = seg["speed"].to_numpy(dtype=float)
        feats["gps_max_speed"] = float(np.nanmax(speeds)) if speeds.size else np.nan
        feats["gps_mean_speed"] = float(np.nanmean(speeds)) if speeds.size else np.nan
        feats["gps_speed_drop"] = float(speeds[0] - np.nanmin(speeds)) if speeds.size else np.nan

        lats, lons = seg["lat"].to_numpy(), seg["lon"].to_numpy()
        dist = sum(
            _haversine_m(lats[i], lons[i], lats[i + 1], lons[i + 1])
            for i in range(len(lats) - 1)
        )
        feats["gps_distance"] = dist

        b_start = _bearing_deg(lats[0], lons[0], lats[1], lons[1])
        b_end = _bearing_deg(lats[-2], lons[-2], lats[-1], lons[-1])
        heading_change = abs(b_end - b_start)
        feats["gps_heading_change"] = min(heading_change, 360 - heading_change)
        return feats

    def load(self) -> pd.DataFrame:
        rows = []
        window_size = int(config.WINDOW_SECONDS * config.ASSUMED_IMU_HZ)
        step = max(int(window_size * (1 - config.WINDOW_OVERLAP)), 1)

        for acc_path, gyro_path, mag_path, gps_path in self._find_sessions():
            acc_df = self._read_sensor_csv(acc_path, ACC_COLS)
            gyro_df = self._read_sensor_csv(gyro_path, GYRO_COLS)
            mag_df = self._read_sensor_csv(mag_path, GYRO_COLS)  # same layout as gyro
            gps_df = self._read_sensor_csv(gps_path, GPS_COLS) if gps_path else None

            if acc_df is None or acc_df.empty:
                continue

            acc_mag = np.sqrt(acc_df["x"] ** 2 + acc_df["y"] ** 2 + acc_df["z"] ** 2).to_numpy()
            gyro_mag = (
                np.sqrt(gyro_df["x"] ** 2 + gyro_df["y"] ** 2 + gyro_df["z"] ** 2).to_numpy()
                if gyro_df is not None and not gyro_df.empty else None
            )
            n_acc = len(acc_mag)
            has_gyro = gyro_mag is not None
            has_mag = mag_df is not None and not mag_df.empty
            has_gps = gps_df is not None and not gps_df.empty

            # Folder path disambiguates sessions: the same filename stem
            # (e.g. BS_Route1_accelerometer_1) recurs across different
            # route/lap folders, so include the relative folder in the id.
            rel_folder = acc_path.parent.relative_to(self.root).as_posix().replace("/", "_").replace(" ", "")
            session_id = f"{rel_folder}_{acc_path.stem}"
            for w_idx, (start, end) in enumerate(sliding_windows(n_acc, window_size, step)):
                acc_feats = extract_axis_stats(acc_mag[start:end], prefix="acc")

                if has_gyro:
                    g_start = int(start / n_acc * len(gyro_mag))
                    g_end = int(end / n_acc * len(gyro_mag))
                    gyro_feats = extract_axis_stats(gyro_mag[g_start:g_end], prefix="gyro")
                else:
                    gyro_feats = extract_axis_stats(np.array([]), prefix="gyro")

                gps_feats = self._gps_window_features(gps_df, start / n_acc, end / n_acc) if has_gps else {
                    "gps_max_speed": np.nan, "gps_mean_speed": np.nan,
                    "gps_speed_drop": np.nan, "gps_distance": np.nan,
                    "gps_heading_change": np.nan,
                }

                row = {
                    "window_id": f"{session_id}_w{w_idx}",
                    **acc_feats,
                    **gyro_feats,
                    "lin_acc_max": np.nan,  # not derivable without a gravity model; left NaN
                    **gps_feats,
                    "sampling_rate_hz": config.ASSUMED_IMU_HZ,
                    "window_size_s": config.WINDOW_SECONDS,
                    "has_accel": True,
                    "has_gyro": has_gyro,
                    "has_gps": has_gps,
                    "has_magnetometer": has_mag,
                    "label": 0,  # documented assumption: no crash events in this dataset
                }
                rows.append(row)

        if not rows:
            logger.warning("CyclistAdapter found no usable sessions under %s", self.root)
            return pd.DataFrame(columns=config.ALL_MASTER_COLUMNS)

        return pd.DataFrame(rows)
