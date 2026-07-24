"""
config.py
=========
Single source of truth for paths, sensor schema, window parameters and
model-selection thresholds used across the VQR ML subsystem.

Design decision
---------------
Every other module imports its constants from here instead of hard-coding
them. This is what lets `model_training.py`, `feature_engineering.py`, and
the mobile-facing `sensor_manager.py` all agree on the same feature schema
without importing each other.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import List


# --------------------------------------------------------------------------- #
# Paths
# --------------------------------------------------------------------------- #
BASE_DIR = Path(__file__).resolve().parents[2]          # .../vqr_ml
DATA_RAW_DIR = BASE_DIR / "data" / "raw"
DATA_PROCESSED_DIR = BASE_DIR / "data" / "processed"
OUTPUTS_DIR = BASE_DIR / "outputs"
MODELS_DIR = BASE_DIR / "models"

for _d in (DATA_PROCESSED_DIR, OUTPUTS_DIR, MODELS_DIR):
    _d.mkdir(parents=True, exist_ok=True)

MASTER_DATASET_PATH = DATA_PROCESSED_DIR / "master_dataset.csv"
SELECTED_FEATURES_JSON = OUTPUTS_DIR / "selected_features.json"
SELECTED_FEATURES_CSV = OUTPUTS_DIR / "selected_features.csv"
FEATURE_IMPORTANCE_CSV = OUTPUTS_DIR / "feature_importance.csv"
FEATURE_CORRELATION_PNG = OUTPUTS_DIR / "feature_correlation.png"
EVALUATION_REPORT_JSON = OUTPUTS_DIR / "evaluation_report.json"
CONFUSION_MATRIX_DIR = OUTPUTS_DIR / "confusion_matrices"
ROC_CURVE_DIR = OUTPUTS_DIR / "roc_curves"
CONFUSION_MATRIX_DIR.mkdir(exist_ok=True)
ROC_CURVE_DIR.mkdir(exist_ok=True)

FINAL_MODEL_JOBLIB = MODELS_DIR / "vqr_crash_model.joblib"
FINAL_MODEL_ONNX = MODELS_DIR / "vqr_crash_model.onnx"
FINAL_MODEL_META = MODELS_DIR / "vqr_crash_model_meta.json"

OFFLINE_QUEUE_DB = BASE_DIR / "data" / "offline_queue.sqlite3"

# --------------------------------------------------------------------------- #
# Sliding window parameters
# --------------------------------------------------------------------------- #
# Cyclist raw IMU is sampled at roughly 50 Hz (~20ms between rows observed in
# the uploaded data). A 2-second window with 50% overlap is a standard choice
# for fall/crash detection literature (SisFall, MobiAct) and is small enough
# to keep on-device inference latency low.
#
# Literature-review update (systematic review, Part 1 §1.3): more recent
# window-sizing studies suggest this could be tuned further -- a hierarchical
# wavelet/adaptive-pooling study (PMC8512095) found 3s + combined accel+gyro
# performed best, and MECKD (arXiv 2510.03601, 2025) used an asymmetric
# ~2s-pre-impact + ~1.2-1.4s-post-impact window on FallAllD/SisFall. Neither
# is applied here by default: changing WINDOW_SECONDS invalidates the
# already-selected feature set (outputs/selected_features.json) and the
# already-exported models, so this is left as a deliberate, opt-in experiment
# (change the constant, re-run the full train_pipeline, and compare
# outputs/leave_one_dataset_out_report.json against the current baseline)
# rather than a silent default change.
WINDOW_SECONDS = 2.0
WINDOW_OVERLAP = 0.5
ASSUMED_IMU_HZ = 50

# --------------------------------------------------------------------------- #
# Common feature schema
# --------------------------------------------------------------------------- #
# These are the columns every dataset adapter must be able to populate
# (NaN where a sensor/statistic is unavailable for that source). Anything
# outside this list is dataset-specific and gets dropped before the master
# dataset is written, per the "do not merge raw datasets" requirement.
ACCEL_STAT_SUFFIXES = [
    "mean", "std", "max", "min", "median", "var", "rms", "energy",
    "entropy", "sma", "iqr", "kurtosis", "skewness", "peak_count",
    "zero_crossing",
]
GYRO_STAT_SUFFIXES = ACCEL_STAT_SUFFIXES.copy()

COMMON_FEATURE_SCHEMA: List[str] = (
    [f"acc_{s}" for s in ACCEL_STAT_SUFFIXES]
    + [f"gyro_{s}" for s in GYRO_STAT_SUFFIXES]
    + [
        "lin_acc_max",          # post/linear-acceleration peak (fall dataset specific, NaN elsewhere)
        "gps_max_speed",
        "gps_mean_speed",
        "gps_speed_drop",
        "gps_distance",
        "gps_heading_change",
    ]
)

METADATA_COLUMNS = [
    "dataset_source",   # which adapter produced the row
    "sampling_rate_hz",
    "window_size_s",
    "has_accel",
    "has_gyro",
    "has_gps",
    "has_magnetometer",
]

LABEL_COLUMN = "label"          # 1 = crash/fall, 0 = normal activity
ID_COLUMNS = ["window_id"]

ALL_MASTER_COLUMNS = (
    ID_COLUMNS + COMMON_FEATURE_SCHEMA + METADATA_COLUMNS + [LABEL_COLUMN]
)

# --------------------------------------------------------------------------- #
# Model selection
# --------------------------------------------------------------------------- #
MOBILE_FRIENDLY_MODELS = {"logistic_regression", "lightgbm", "xgboost_small"}

@dataclass
class SelectionWeights:
    """Weights used to rank candidate models (higher = more important)."""
    f1: float = 0.5
    latency: float = 0.2
    memory: float = 0.15
    model_size: float = 0.1
    mobile_bonus: float = 0.05   # extra credit for LR/LightGBM/small-XGB


SELECTION_WEIGHTS = SelectionWeights()

RANDOM_STATE = 42
TEST_SIZE = 0.2
