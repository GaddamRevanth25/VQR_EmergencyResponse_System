"""
validation.py
==============
Shared validation checks used at both training time (on the master dataset)
and inference time (on a single live feature row), so the same rules that
clean the training data also guard against garbage input in production.
"""
from __future__ import annotations

import logging
from typing import Dict, List

import numpy as np
import pandas as pd

from app.ml import config

logger = logging.getLogger(__name__)

# Physically plausible ranges (used to catch sensor glitches / unit errors,
# not to enforce anything statistical about the label distribution).
PLAUSIBLE_RANGES = {
    "acc_max": (0, 200),          # m/s^2; free-fall-plus-impact can spike hard
    "gyro_max": (0, 50),          # rad/s
    "gps_max_speed": (0, 60),     # m/s (~216 km/h) -- generous upper bound for a bicycle/vehicle
}


def validate_dataframe(df: pd.DataFrame) -> Dict[str, list]:
    """Runs the "data validation" step of the SSE-style pipeline: duplicate
    check, missing-value summary, and out-of-range flags. Returns a report
    dict; does not mutate df (cleaning decisions stay in preprocessing.py)."""
    report: Dict[str, list] = {}

    dup_ids = df["window_id"][df["window_id"].duplicated()].tolist()
    if dup_ids:
        report["duplicate_window_ids"] = dup_ids
        logger.warning("Found %d duplicate window_id(s)", len(dup_ids))

    missing_summary = df.isna().mean().round(4).to_dict()
    report["missing_fraction_per_column"] = {k: v for k, v in missing_summary.items() if v > 0}

    out_of_range = {}
    for col, (lo, hi) in PLAUSIBLE_RANGES.items():
        if col not in df.columns:
            continue
        mask = df[col].notna() & ((df[col] < lo) | (df[col] > hi))
        if mask.any():
            out_of_range[col] = int(mask.sum())
    if out_of_range:
        report["out_of_range_counts"] = out_of_range
        logger.warning("Out-of-range values detected: %s", out_of_range)

    return report


def validate_live_row(row: Dict[str, float]) -> List[str]:
    """Lightweight inference-time guardrail: flags (does not silently
    'fix') a live feature row that looks physically implausible, e.g. a
    sensor stuck reporting a constant value or a unit-conversion bug on a
    new phone model. Returns a list of warning strings (empty = clean)."""
    warnings: List[str] = []
    for col, (lo, hi) in PLAUSIBLE_RANGES.items():
        val = row.get(col)
        if val is None or (isinstance(val, float) and np.isnan(val)):
            continue
        if val < lo or val > hi:
            warnings.append(f"{col}={val} outside plausible range [{lo}, {hi}]")
    return warnings
