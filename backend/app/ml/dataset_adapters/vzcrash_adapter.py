"""
dataset_adapters/vzcrash_adapter.py
=====================================
Adapter for VZCrash (Bianconcini et al., "VZCrash: A Large-Scale IMU Dataset
of Ego-Vehicle Crashes", arXiv:2606.06074, accepted ITSC 2026 --
huggingface.co/datasets/vzc-research-chapter/VZCrash).

Why this dataset (research report §3.5/§10, literature review Part 1/2)
---------------------------------------------------------------------------
This is the single highest-priority addition identified across both the
original research report and its follow-up systematic literature review:
the ONLY reviewed source with verified REAL vehicle crashes -- not falls
used as a proxy, not simulated events, not report-level (location/injury-
count) data. >31,000 human-reviewed, 3-way-consensus-labelled crash events,
~190,000 total events, 100 Hz accelerometer (g) + gyroscope (deg/s), 1 Hz
GPS speed (km/h), 16s window per event, captured by 73,010 real commercial
vehicles. This is the dataset that finally lets `smartphone_fall` be
evaluated in the leave-one-dataset-out mode (model_evaluation.py) -- every
other source in this project is 100% negative, so without a real positive
source, holding out `smartphone_fall` leaves a single-class training set
with nothing to fit (see the "skipped_reason" this project already logs for
exactly that case).

ACCESS REQUIREMENTS -- read this before running
---------------------------------------------------------------------------
VZCrash is a GATED dataset. Before this adapter will work you must:
  1. Have a Hugging Face account.
  2. Visit https://huggingface.co/datasets/vzc-research-chapter/VZCrash and
     accept the dataset's access conditions (this is a manual, one-time,
     human step -- there is no way to script around it, nor should there be).
  3. Authenticate locally, either:
       huggingface-cli login
     or by setting an environment variable before running the pipeline:
       PowerShell:  $env:HF_TOKEN = "hf_xxx..."
       cmd.exe:     set HF_TOKEN=hf_xxx...
     This adapter reads `HF_TOKEN` from the environment (falling back to
     your local huggingface-cli cache if already logged in) -- it never
     hardcodes a token and does nothing at all until you've completed step 2.
  4. `pip install datasets` (added to requirements.txt).

Honesty about what is/isn't verified
---------------------------------------------------------------------------
I could not download or inspect this dataset directly -- my sandboxed
environment has no network route to huggingface.co (confirmed: attempting
`load_dataset("vzc-research-chapter/VZCrash")` here raises a connection
error, not an auth error). Everything below the "confirmed from the dataset
card" line is inferred from the dataset's public README
(https://huggingface.co/datasets/vzc-research-chapter/VZCrash) rather than
verified against the actual parquet files, because the exact per-column
names for the accelerometer/gyroscope/speed ARRAYS are not published on the
card in machine-readable form.

Confirmed from the dataset card (README, 2026-07-23):
  - Format: parquet, ~7.74 GB total, "Time-series" modality.
  - 100 Hz tri-axial accelerometer in **g** (NOT m/s^2 -- see unit
    conversion below), 100 Hz tri-axial gyroscope in **deg/s**, 1 Hz GPS
    speed in **km/h**. Each event covers a 16-second window.
  - Label column values (a per-event category): '0' = crash, '1' =
    near_miss, '2' = normal_driving. Labels are the result of 3-reviewer
    consensus with dashcam access, i.e. genuinely human-verified, not
    self-reported or heuristically assigned.
  - `gyro_is_hd` boolean column: indicates whether that event's gyroscope
    has standard (1 deg/s) or high-definition (0.001 deg/s) resolution --
    this is real per-event metadata, kept as a passthrough note in logs but
    not written to the master schema (no matching column exists there).
  - `vehiclesize` column: Light/Medium/Heavy/Unknown -- same treatment.

NOT confirmed (inferred, auto-detected defensively at runtime instead of
hardcoded): the literal column names for the accelerometer-x/y/z,
gyroscope-x/y/z and gps-speed array fields. `_find_array_column()` below
searches the dataset's actual `features` schema for plausible names and
logs exactly what it matched (or didn't) -- READ THAT LOG on first run and
adjust `ACCEL_CANDIDATES` / `GYRO_CANDIDATES` / `SPEED_CANDIDATES` below if
it guesses wrong. This is the same "auto-detect + log + let a human correct
it" pattern this project's research report itself recommended over silently
assuming a schema.

Label mapping to this project's binary label
---------------------------------------------------------------------------
    '0' crash          -> label = 1  (positive)
    '1' near_miss       -> label = 0  (hard negative: an event that REQUIRED
                           an evasive maneuver but did not result in impact --
                           the VZCrash paper itself uses near-misses as
                           negatives in its own benchmark, for the same
                           reason: near-misses are exactly the events that
                           make a naive threshold detector fire, so they are
                           the most informative negatives available)
    '2' normal_driving -> label = 0  (ordinary negative)

Unit conversion
---------------------------------------------------------------------------
VZCrash accelerometer values are in g (1g = 9.80665 m/s^2). This project's
other raw-signal adapters (cyclist_adapter.py, uah_driveset_adapter.py,
road_safety_adapter.py) read phone accelerometer values that are already in
m/s^2 (Android SensorManager convention). To keep acc_* feature magnitudes
comparable ACROSS dataset_source values (mean/std/energy/RMS are NOT scale-
invariant, unlike kurtosis/skewness/entropy), this adapter multiplies
VZCrash's accelerometer by 9.80665 before computing features. Gyroscope
units (deg/s) are left as-is -- this project's other sources' gyroscope
units were never independently confirmed either (see the research report's
own honesty notes on this), so no correction is applied there; if you
later confirm a mismatch, note it here rather than silently rescaling.

Windowing
---------------------------------------------------------------------------
Each VZCrash event already IS a fixed 16s telemetry snippet (not a
continuous multi-hour session like the other adapters). This adapter slides
config.WINDOW_SECONDS (default 2s) windows across each event's own ~1600-
sample sequence at the event's native 100 Hz, exactly like this project's
other adapters slide windows across a continuous session -- so a single
16s crash event produces multiple (overlapping) 2s windows, all inheriting
that event's label. This means a positive event contributes several
positive windows, some of which may sit at the quiet start/end of the 16s
clip rather than the impact itself; that's a real, known source of label
noise for THIS adapter specifically (the other datasets don't have this
issue since their positive/negative windows come from separately-labelled
continuous sessions) -- worth an ablation (crop to the event's peak-
acceleration sub-window only) once this is running end-to-end, per the
report's §9 ablation-study recommendation.
"""
from __future__ import annotations

import logging
import os
from typing import Optional

import numpy as np
import pandas as pd

from app.ml import config
from app.ml.dataset_adapters.base import BaseDatasetAdapter
from app.ml.feature_engineering import extract_axis_stats, sliding_windows

logger = logging.getLogger(__name__)

HF_DATASET_ID = "vzc-research-chapter/VZCrash"
G_TO_MPS2 = 9.80665

# Candidate column-name substrings, tried in order, case-insensitive. These
# are best-effort guesses (see module docstring "NOT confirmed" section) --
# _find_array_column logs exactly which one matched, or that none did.
ACCEL_CANDIDATES = {
    "x": ["accel_x", "acceleration_x", "acc_x", "ax"],
    "y": ["accel_y", "acceleration_y", "acc_y", "ay"],
    "z": ["accel_z", "acceleration_z", "acc_z", "az"],
}
GYRO_CANDIDATES = {
    "x": ["gyro_x", "gyroscope_x", "gx"],
    "y": ["gyro_y", "gyroscope_y", "gy"],
    "z": ["gyro_z", "gyroscope_z", "gz"],
}
SPEED_CANDIDATES = ["speed", "gps_speed", "speed_kmh", "gps_speed_kmh"]
LABEL_CANDIDATES = ["label", "category", "class", "event_type"]

LABEL_VALUE_TO_PROJECT_LABEL = {
    0: 1, "0": 1, "crash": 1,          # crash -> positive
    1: 0, "1": 0, "near_miss": 0,      # near-miss -> hard negative
    2: 0, "2": 0, "normal_driving": 0,  # normal driving -> negative
}


def _find_array_column(available_columns: list[str], candidates: list[str]) -> Optional[str]:
    lower_map = {c.lower(): c for c in available_columns}
    for cand in candidates:
        if cand.lower() in lower_map:
            return lower_map[cand.lower()]
    # fallback: substring match
    for col_lower, col_orig in lower_map.items():
        if any(cand.lower() in col_lower for cand in candidates):
            return col_orig
    return None


class VZCrashAdapter(BaseDatasetAdapter):
    name = "vzcrash"

    def __init__(self, split: str = "train"):
        self.split = split
        self._ds = None  # lazy-loaded, so importing this module never touches the network

    def is_available(self) -> bool:
        """Available only if (a) the `datasets` library is installed AND
        (b) either HF_TOKEN is set or a local huggingface-cli login exists.
        Does NOT attempt a network call here -- that only happens in load(),
        so a missing/unauthenticated setup is skipped exactly like any other
        REJECTED adapter, with an actionable log message, not a crash."""
        try:
            import datasets  # noqa: F401
        except ImportError:
            logger.info(
                "REJECTED [vzcrash]: `datasets` package not installed. "
                "Run: pip install datasets"
            )
            return False

        token = os.environ.get("HF_TOKEN")
        if token:
            return True

        # Check for a local huggingface-cli login cache without a network call.
        try:
            from huggingface_hub import HfFolder
            cached_token = HfFolder.get_token()
        except Exception:
            cached_token = None

        if cached_token:
            return True

        logger.info(
            "REJECTED [vzcrash]: no Hugging Face credentials found. Accept the "
            "dataset terms at https://huggingface.co/datasets/%s, then either "
            "set the HF_TOKEN environment variable or run `huggingface-cli login`.",
            HF_DATASET_ID,
        )
        return False

    def load(self) -> pd.DataFrame:
        from datasets import load_dataset

        token = os.environ.get("HF_TOKEN")  # None is fine -- load_dataset falls back to cached login
        logger.info("Loading %s (split=%s) from Hugging Face -- this downloads "
                    "up to ~7.74 GB on first run and is cached locally afterward.",
                    HF_DATASET_ID, self.split)
        ds = load_dataset(HF_DATASET_ID, split=self.split, token=token)

        available_columns = list(ds.features.keys())
        logger.info("VZCrash actual columns found: %s", available_columns)

        accel_cols = {ax: _find_array_column(available_columns, cands) for ax, cands in ACCEL_CANDIDATES.items()}
        gyro_cols = {ax: _find_array_column(available_columns, cands) for ax, cands in GYRO_CANDIDATES.items()}
        speed_col = _find_array_column(available_columns, SPEED_CANDIDATES)
        label_col = _find_array_column(available_columns, LABEL_CANDIDATES)

        logger.info("Column auto-detection result: accel=%s gyro=%s speed=%s label=%s",
                    accel_cols, gyro_cols, speed_col, label_col)

        if not all(accel_cols.values()) or label_col is None:
            raise RuntimeError(
                "VZCrashAdapter could not confidently identify the accelerometer "
                "x/y/z columns and/or the label column from the dataset's actual "
                "schema (see the 'VZCrash actual columns found' log line above for "
                "what's really there). This adapter's column-name guesses (see "
                "ACCEL_CANDIDATES / LABEL_CANDIDATES in vzcrash_adapter.py) were "
                "written from the dataset CARD, not the real files (my sandboxed "
                "environment can't reach huggingface.co to verify them). Open the "
                "log output above, find the real column names, and update those "
                "candidate lists -- this is a one-line fix once you can see the "
                "actual schema locally."
            )

        native_hz = 100.0  # confirmed on the dataset card; not per-event-measurable without seconds_elapsed
        window_size = max(int(config.WINDOW_SECONDS * native_hz), 4)
        step = max(int(window_size * (1 - config.WINDOW_OVERLAP)), 1)

        rows = []
        n_events = len(ds)
        for event_idx in range(n_events):
            example = ds[event_idx]
            try:
                acc_x = np.asarray(example[accel_cols["x"]], dtype=float) * G_TO_MPS2
                acc_y = np.asarray(example[accel_cols["y"]], dtype=float) * G_TO_MPS2
                acc_z = np.asarray(example[accel_cols["z"]], dtype=float) * G_TO_MPS2
            except Exception as exc:  # noqa: BLE001
                logger.warning("Event %d: could not read accelerometer arrays (%s); skipping", event_idx, exc)
                continue
            acc_mag = np.sqrt(acc_x ** 2 + acc_y ** 2 + acc_z ** 2)
            n_acc = len(acc_mag)

            has_gyro = all(gyro_cols.values())
            gyro_mag = None
            if has_gyro:
                try:
                    gx = np.asarray(example[gyro_cols["x"]], dtype=float)
                    gy = np.asarray(example[gyro_cols["y"]], dtype=float)
                    gz = np.asarray(example[gyro_cols["z"]], dtype=float)
                    gyro_mag = np.sqrt(gx ** 2 + gy ** 2 + gz ** 2)
                except Exception:
                    has_gyro = False

            has_gps = speed_col is not None
            speeds_kmh = None
            if has_gps:
                try:
                    speeds_kmh = np.asarray(example[speed_col], dtype=float)
                except Exception:
                    has_gps = False

            raw_label = example[label_col]
            project_label = LABEL_VALUE_TO_PROJECT_LABEL.get(raw_label)
            if project_label is None:
                logger.warning("Event %d: unrecognized label value %r; skipping", event_idx, raw_label)
                continue

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
                if has_gps and speeds_kmh is not None and len(speeds_kmh) >= 2:
                    i0 = int(start / n_acc * len(speeds_kmh))
                    i1 = max(int(end / n_acc * len(speeds_kmh)), i0 + 1)
                    i1 = min(i1, len(speeds_kmh))
                    seg = speeds_kmh[i0:i1] / 3.6  # km/h -> m/s, matches other adapters' units
                    if seg.size:
                        gps_feats["gps_max_speed"] = float(np.nanmax(seg))
                        gps_feats["gps_mean_speed"] = float(np.nanmean(seg))
                        gps_feats["gps_speed_drop"] = float(seg[0] - np.nanmin(seg))
                        # distance/heading_change need lat/lon, which VZCrash's
                        # card does not mention providing (GPS-derived SPEED
                        # only) -- left NaN, handled uniformly by the existing
                        # missing-sensor imputation.

                row = {
                    "window_id": f"vzcrash_event{event_idx}_w{w_idx}",
                    **acc_feats,
                    **gyro_feats,
                    "lin_acc_max": np.nan,
                    **gps_feats,
                    "sampling_rate_hz": native_hz,
                    "window_size_s": config.WINDOW_SECONDS,
                    "has_accel": True,
                    "has_gyro": has_gyro,
                    "has_gps": has_gps,
                    "has_magnetometer": False,
                    "label": project_label,
                }
                rows.append(row)

            if event_idx > 0 and event_idx % 5000 == 0:
                logger.info("VZCrashAdapter processed %d/%d events...", event_idx, n_events)

        if not rows:
            logger.warning("VZCrashAdapter produced no usable windows.")
            return pd.DataFrame(columns=config.ALL_MASTER_COLUMNS)

        df = pd.DataFrame(rows)
        n_pos = int((df["label"] == 1).sum())
        logger.info("VZCrashAdapter produced %d windows from %d events (%d positive-label windows, %.1f%%)",
                    len(df), n_events, n_pos, 100.0 * n_pos / max(len(df), 1))
        return df
