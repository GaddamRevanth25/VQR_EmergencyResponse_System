"""
dataset_adapters/uah_driveset_adapter.py
=========================================
Adapter for the UAH-DriveSet naturalistic driving dataset (Romera, Bergasa &
Arroyo, IEEE ITSC 2016 -- http://www.robesafe.uah.es/personal/eduardo.romera/uah-driveset/).

Why this dataset (research report §3.1 / §8)
---------------------------------------------
6 drivers/vehicles, 3 driving styles (normal, drowsy, aggressive) on 2 road
types (motorway, secondary), 500+ minutes of real accelerometer (10 Hz) and
GPS (1 Hz) data. This is the highest-priority addition identified in the
research report: it directly supplies the "limited normal driving
behaviour / no braking, sharp turns, lane changes" negatives the project's
own README flags as missing, using the SAME "negative/behavioral-diversity
source only" pattern already established by cyclist_adapter.py.

Important dataset limitation (documented, not hidden -- same policy as
cyclist_adapter.py)
---------------------------------------------------------------------------
UAH-DriveSet has NO crash labels. Every session here is real driving, none
of it a collision. This adapter must never be used as a source of positive
crash labels -- only as label=0 negative windows, exactly like the existing
cyclist adapter.

Expected raw layout (per the dataset's published documentation -- CONFIRM
against your actual download before relying on this, per the research
report's honesty note about unverified specifics)
---------------------------------------------------------------------------
The public download is organized as one folder per driver/route/behavior
session, e.g.:
    D1/20151110175712-16km-D1-NORMAL1-SECONDARY/
        RAW_ACCELEROMETERS.txt
        RAW_GPS.txt
        ...
`RAW_ACCELEROMETERS.txt` (space-separated, no header) columns are documented
as: timestamp(s), boolean_flag(reliable accel), acc_x, acc_y, acc_z,
acc_x_KF, acc_y_KF, acc_z_KF (Kalman-filtered), roll, pitch, yaw.
`RAW_GPS.txt` columns: timestamp(s), speed(km/h), latitude, longitude,
altitude, vertical_accuracy, horizontal_accuracy, course, difcourse.

The session folder name encodes both driver and behavior label
(NORMAL/DROWSY/AGGRESSIVE) and road type (MOTORWAY/SECONDARY) -- this
adapter parses that from the folder name rather than requiring you to
supply it separately, so no manual relabeling step is needed after download.

TODO before first real run: confirm the exact column order and delimiter
against your actual downloaded files (this dataset has had minor format
revisions over the years) and adjust ACC_COLS/GPS_COLS below if needed --
follow the same "read raw, then verify column count against what's parsed"
sanity check cyclist_adapter.py already does.
"""
from __future__ import annotations

import logging
import re
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd

from app.ml import config
from app.ml.dataset_adapters.base import BaseDatasetAdapter
from app.ml.feature_engineering import extract_axis_stats, sliding_windows

logger = logging.getLogger(__name__)

# Column layouts per UAH-DriveSet's published documentation -- see module
# docstring TODO. KF = Kalman-filtered, preferred over raw where available
# since it's closer to what cyclist_adapter/smartphone_fall_adapter already
# hand the model (denoised signal).
ACC_COLS = ["ts", "reliable", "acc_x", "acc_y", "acc_z",
            "acc_x_kf", "acc_y_kf", "acc_z_kf", "roll", "pitch", "yaw"]
GPS_COLS = ["ts", "speed_kmh", "lat", "lon", "altitude",
            "vert_acc", "horiz_acc", "course", "difcourse"]

SESSION_NAME_RE = re.compile(
    r"(?P<driver>D\d+).*?-(?P<behavior>NORMAL\d*|DROWSY\d*|AGGRESSIVE\d*)-"
    r"(?P<road>MOTORWAY|SECONDARY)", re.IGNORECASE,
)


class UAHDriveSetAdapter(BaseDatasetAdapter):
    name = "uah_driveset_normal"

    def __init__(self, root: Optional[Path] = None):
        self.root = root or (config.DATA_RAW_DIR / "uah_driveset")

    def is_available(self) -> bool:
        return self.root.exists() and any(self.root.rglob("RAW_ACCELEROMETERS.txt"))

    @staticmethod
    def _read_space_separated(path: Path, cols: list[str]) -> Optional[pd.DataFrame]:
        """Same defensive-read pattern as cyclist_adapter._read_sensor_csv:
        read as strings, pad/truncate to len(cols) so a format drift in one
        file can't silently misalign columns."""
        if path is None or not path.exists():
            return None
        raw = pd.read_csv(path, sep=r"\s+", header=None, dtype=str, engine="python")
        n = min(len(cols), raw.shape[1])
        raw = raw.iloc[:, :n]
        raw.columns = cols[:n]
        for missing_col in cols[n:]:
            raw[missing_col] = pd.NA
        for c in raw.columns:
            raw[c] = pd.to_numeric(raw[c], errors="coerce")
        return raw

    def _find_sessions(self):
        for acc_path in sorted(self.root.rglob("RAW_ACCELEROMETERS.txt")):
            session_folder = acc_path.parent
            gps_path = session_folder / "RAW_GPS.txt"
            yield session_folder, acc_path, gps_path if gps_path.exists() else None

    def load(self) -> pd.DataFrame:
        rows = []
        window_size = int(config.WINDOW_SECONDS * config.ASSUMED_IMU_HZ)
        step = max(int(window_size * (1 - config.WINDOW_OVERLAP)), 1)

        for session_folder, acc_path, gps_path in self._find_sessions():
            acc_df = self._read_space_separated(acc_path, ACC_COLS)
            gps_df = self._read_space_separated(gps_path, GPS_COLS) if gps_path else None
            if acc_df is None or acc_df.empty:
                continue

            m = SESSION_NAME_RE.search(session_folder.name)
            behavior = m.group("behavior").upper() if m else "UNKNOWN"
            # Kept for future use (e.g. stratifying leave-one-dataset-out by
            # behavior rather than just by dataset_source) -- not written to
            # the master schema today since COMMON_FEATURE_SCHEMA has no
            # driving-style column, matching the "do not merge raw datasets /
            # only schema columns survive" rule in base.py.
            logger.debug("Session %s parsed behavior=%s", session_folder.name, behavior)

            # UAH-DriveSet accelerometer is natively ~10 Hz, not the 50 Hz
            # ASSUMED_IMU_HZ your other adapters assume. Rather than
            # resampling (which would fabricate samples that were never
            # measured), this windows at the dataset's OWN native rate and
            # records that rate honestly in sampling_rate_hz -- your
            # feature_engineering.extract_axis_stats functions operate on
            # sample counts, not wall-clock time, so this is safe, but it
            # does mean each window covers the same ~2s of real time with
            # fewer raw samples than your other sources. Worth an ablation
            # (report §9) to check this doesn't bias feature distributions.
            # Measured from the file's own timestamp column rather than
            # assumed -- same fix applied to road_safety_adapter.py after
            # discovering (against real downloaded data) that a hardcoded
            # rate assumption silently produces wrong-duration windows if
            # the real rate differs even slightly. UAH-DriveSet's documented
            # nominal rate is 10 Hz; this falls back to that only if the
            # timestamp column is degenerate (e.g. all-duplicate).
            ts = acc_df["ts"].to_numpy()
            diffs = np.diff(ts)
            diffs = diffs[diffs > 0]
            native_hz = float(1.0 / np.median(diffs)) if diffs.size else 10.0
            native_window = max(int(config.WINDOW_SECONDS * native_hz), 4)
            native_step = max(int(native_window * (1 - config.WINDOW_OVERLAP)), 1)

            G_TO_MPS2 = 9.80665
            acc_x = (acc_df["acc_x_kf"].fillna(acc_df["acc_x"]).to_numpy()) * G_TO_MPS2
            acc_y = (acc_df["acc_y_kf"].fillna(acc_df["acc_y"]).to_numpy()) * G_TO_MPS2
            acc_z = (acc_df["acc_z_kf"].fillna(acc_df["acc_z"]).to_numpy()) * G_TO_MPS2
            acc_mag = np.sqrt(acc_x ** 2 + acc_y ** 2 + acc_z ** 2)
            n_acc = len(acc_mag)
            has_gps = gps_df is not None and not gps_df.empty

            session_id = session_folder.name.replace(" ", "_")
            for w_idx, (start, end) in enumerate(sliding_windows(n_acc, native_window, native_step)):
                acc_feats = extract_axis_stats(acc_mag[start:end], prefix="acc")
                gyro_feats = extract_axis_stats(np.array([]), prefix="gyro")  # no gyro in this dataset

                gps_feats = {
                    "gps_max_speed": np.nan, "gps_mean_speed": np.nan,
                    "gps_speed_drop": np.nan, "gps_distance": np.nan,
                    "gps_heading_change": np.nan,
                }
                if has_gps:
                    i0 = int(start / n_acc * len(gps_df))
                    i1 = max(int(end / n_acc * len(gps_df)), i0 + 2)
                    i1 = min(i1, len(gps_df))
                    seg = gps_df.iloc[i0:i1]
                    if len(seg) >= 2:
                        speeds = seg["speed_kmh"].to_numpy(dtype=float) / 3.6  # km/h -> m/s, matches gps_max_speed's implied units elsewhere
                        gps_feats["gps_max_speed"] = float(np.nanmax(speeds))
                        gps_feats["gps_mean_speed"] = float(np.nanmean(speeds))
                        gps_feats["gps_speed_drop"] = float(speeds[0] - np.nanmin(speeds))
                        # distance/heading_change left NaN here deliberately:
                        # doing it properly needs the same haversine/bearing
                        # helpers cyclist_adapter.py already has -- reuse
                        # those directly rather than duplicating once this
                        # adapter is validated against real downloaded data.

                row = {
                    "window_id": f"uah_{session_id}_w{w_idx}",
                    **acc_feats,
                    **gyro_feats,
                    "lin_acc_max": np.nan,
                    **gps_feats,
                    "sampling_rate_hz": native_hz,
                    "window_size_s": config.WINDOW_SECONDS,
                    "has_accel": True,
                    "has_gyro": False,
                    "has_gps": has_gps,
                    "has_magnetometer": False,
                    "label": 0,  # documented assumption: UAH-DriveSet has no crash labels
                }
                rows.append(row)

        if not rows:
            logger.warning("UAHDriveSetAdapter found no usable sessions under %s", self.root)
            return pd.DataFrame(columns=config.ALL_MASTER_COLUMNS)

        return pd.DataFrame(rows)
