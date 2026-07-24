"""
dataset_adapters/smartphone_fall_adapter.py
=============================================
Adapter for the "Smartphone Human Fall" dataset (Train.csv / Test.csv),
which already ships pre-engineered features per activity instance:

    acc_max, gyro_max, acc_kurtosis, gyro_kurtosis, acc_skewness,
    gyro_skewness, lin_max, post_gyro_max, post_lin_max, label, fall

Per the project instructions ("already contains engineered features, reuse
them where possible, do NOT recompute unnecessary features") this adapter
does NOT go back to raw signal -- it maps the existing columns directly onto
the common schema and fills every feature this dataset cannot provide with
NaN (handled uniformly downstream by preprocessing.py's missing-sensor logic).

Label semantics: `fall` column is already binary (1 = fall event: FKL/BSC/
FOL/SDL, 0 = ADL: walking/jogging/stairs/sitting/etc.) so it is reused as-is.
"""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd

from app.ml import config
from app.ml.dataset_adapters.base import BaseDatasetAdapter

logger = logging.getLogger(__name__)


class SmartphoneFallAdapter(BaseDatasetAdapter):
    name = "smartphone_fall"

    def __init__(self, root: Optional[Path] = None):
        self.root = root or (config.DATA_RAW_DIR / "smartphone_fall")

    def is_available(self) -> bool:
        return (self.root / "Train.csv").exists()

    def load(self) -> pd.DataFrame:
        frames = []
        for fname in ("Train.csv", "Test.csv"):
            fpath = self.root / fname
            if fpath.exists():
                df = pd.read_csv(fpath)
                df["_split"] = fname.replace(".csv", "").lower()
                frames.append(df)
        if not frames:
            logger.warning("SmartphoneFallAdapter: no Train/Test.csv under %s", self.root)
            return pd.DataFrame(columns=config.ALL_MASTER_COLUMNS)

        raw = pd.concat(frames, ignore_index=True)

        out = pd.DataFrame()
        out["window_id"] = [f"smartphone_{i}" for i in raw.index]
        out["acc_max"] = raw["acc_max"]
        out["gyro_max"] = raw["gyro_max"]
        out["acc_kurtosis"] = raw["acc_kurtosis"]
        out["gyro_kurtosis"] = raw["gyro_kurtosis"]
        out["acc_skewness"] = raw["acc_skewness"]
        out["gyro_skewness"] = raw["gyro_skewness"]
        out["lin_acc_max"] = raw["lin_max"]

        # Columns this dataset cannot provide (no raw signal available):
        for col in config.COMMON_FEATURE_SCHEMA:
            if col not in out.columns:
                out[col] = np.nan

        out["sampling_rate_hz"] = np.nan  # not documented by dataset source
        out["window_size_s"] = np.nan
        out["has_accel"] = True
        out["has_gyro"] = True
        out["has_gps"] = False
        out["has_magnetometer"] = False
        out["label"] = raw["fall"].astype(int)
        return out
