"""
preprocessing.py
================
Turns the master dataset into a model-ready (X, y) pair.

Missing-sensor philosophy
--------------------------
Rather than dropping rows/columns whenever a sensor is unavailable (which
would make the deployed model brittle exactly when it matters -- e.g. an
older phone with no gyroscope), we:

1. Keep `has_*` boolean flags as first-class features so the model can learn
   sensor-dependent decision boundaries.
2. Median-impute missing numeric features per training fold (fit on train,
   applied to val/test -- no leakage).
3. Prefer tree-based models (LightGBM/XGBoost/RandomForest) in the final
   comparison specifically because they tolerate NaNs/imputed placeholders
   better than distance-based models; this is reflected in model_training.py.

This module exposes both a fit_transform (training time) and a transform
(inference time, using a saved imputer/scaler) path.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import List, Tuple

import numpy as np
import pandas as pd
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler

from app.ml import config

logger = logging.getLogger(__name__)


@dataclass
class Preprocessor:
    feature_columns: List[str]
    imputer: SimpleImputer
    scaler: StandardScaler

    def transform(self, df: pd.DataFrame) -> np.ndarray:
        X = df.reindex(columns=self.feature_columns)
        X_imputed = self.imputer.transform(X)
        X_scaled = self.scaler.transform(X_imputed)
        return X_scaled


def get_feature_columns(df: pd.DataFrame) -> List[str]:
    """Numeric feature columns model may use: the common schema stats plus
    the boolean sensor-availability flags (cast to int)."""
    flags = ["has_accel", "has_gyro", "has_gps", "has_magnetometer"]
    cols = [c for c in config.COMMON_FEATURE_SCHEMA if c in df.columns] + flags
    return cols


def load_master_dataset() -> pd.DataFrame:
    df = pd.read_csv(config.MASTER_DATASET_PATH)
    for flag in ["has_accel", "has_gyro", "has_gps", "has_magnetometer"]:
        df[flag] = df[flag].astype(int)
    return df


def fit_preprocessor(train_df: pd.DataFrame) -> Tuple[Preprocessor, np.ndarray]:
    feature_cols = get_feature_columns(train_df)
    X = train_df.reindex(columns=feature_cols)

    imputer = SimpleImputer(strategy="median", keep_empty_features=True)
    X_imputed = imputer.fit_transform(X)

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_imputed)

    pre = Preprocessor(feature_columns=feature_cols, imputer=imputer, scaler=scaler)
    return pre, X_scaled


def batch_holdout_split(df: pd.DataFrame, test_size: float = config.TEST_SIZE,
                         random_state: int = config.RANDOM_STATE):
    """Split by dataset_source-aware stratified sampling on the label, so the
    train/test split doesn't accidentally put an entire dataset source only
    in test (which would silently test on an unseen distribution)."""
    from sklearn.model_selection import train_test_split

    train_idx, test_idx = train_test_split(
        df.index,
        test_size=test_size,
        random_state=random_state,
        stratify=df[["dataset_source", config.LABEL_COLUMN]],
    )
    return df.loc[train_idx].reset_index(drop=True), df.loc[test_idx].reset_index(drop=True)
