"""
dataset_loader.py
==================
Discovers which dataset adapters have data available, loads each one
independently (schema-conformant), concatenates them into master_dataset.csv,
and logs an acceptance/rejection decision per dataset.

This is the "automatically determine whether each dataset is useful" step:
an adapter is accepted if it produces at least MIN_ROWS rows AND contributes
at least one non-null value for some feature beyond pure metadata; otherwise
it is rejected and excluded from the master dataset.
"""
from __future__ import annotations

import logging

import pandas as pd

from app.ml import config
from app.ml.dataset_adapters.cyclist_adapter import CyclistAdapter
from app.ml.dataset_adapters.smartphone_fall_adapter import SmartphoneFallAdapter
from app.ml.dataset_adapters.uah_driveset_adapter import UAHDriveSetAdapter
from app.ml.dataset_adapters.road_safety_adapter import RoadSafetyAdapter
from app.ml.dataset_adapters.vzcrash_adapter import VZCrashAdapter

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)

MIN_ROWS = 10

ALL_ADAPTERS = [
    SmartphoneFallAdapter(),
    CyclistAdapter(),
    # Research report §3/§8 priority additions: registered here so they're
    # picked up automatically the moment their raw data exists under
    # data/raw/uah_driveset/ or data/raw/road_safety/ -- until then,
    # is_available() returns False and build_master_dataset() skips them
    # exactly like any other REJECTED adapter, with no code change needed
    # once you download the data.
    UAHDriveSetAdapter(),
    RoadSafetyAdapter(),
    # The literature review's #1 priority: VZCrash (real, human-verified
    # crash labels). Gated on Hugging Face -- see vzcrash_adapter.py's module
    # docstring for the one-time access request + login you need to do
    # before this adapter's is_available() returns True.
    VZCrashAdapter(),
]


def build_master_dataset(adapters=None, save: bool = True) -> pd.DataFrame:
    adapters = adapters or ALL_ADAPTERS
    accepted_frames = []

    for adapter in adapters:
        if not adapter.is_available():
            logger.warning("REJECTED [%s]: raw files not found", adapter.name)
            continue

        df = adapter.load_conformant()
        feature_cols = config.COMMON_FEATURE_SCHEMA
        non_null_feature_count = df[feature_cols].notna().any(axis=1).sum()

        if len(df) < MIN_ROWS or non_null_feature_count == 0:
            logger.warning(
                "REJECTED [%s]: %d rows, %d with usable features (insufficient signal)",
                adapter.name, len(df), non_null_feature_count,
            )
            continue

        logger.info(
            "ACCEPTED [%s]: %d rows, %d with at least one usable feature",
            adapter.name, len(df), non_null_feature_count,
        )
        accepted_frames.append(df)

    if not accepted_frames:
        raise RuntimeError("No datasets were accepted -- cannot build master dataset.")

    master = pd.concat(accepted_frames, ignore_index=True)
    master = master.drop_duplicates(subset=["window_id"])

    if save:
        config.MASTER_DATASET_PATH.parent.mkdir(parents=True, exist_ok=True)
        master.to_csv(config.MASTER_DATASET_PATH, index=False)
        logger.info("Wrote master dataset: %s (%d rows, %d cols)",
                    config.MASTER_DATASET_PATH, *master.shape)

    return master


if __name__ == "__main__":
    build_master_dataset()
