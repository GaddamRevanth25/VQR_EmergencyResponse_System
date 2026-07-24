"""
dataset_adapters/base.py
=========================
Every dataset gets its own adapter. An adapter's only job is:

    raw dataset (whatever shape/format it is in)
        -> a DataFrame with columns drawn ONLY from config.ALL_MASTER_COLUMNS

This is the enforcement point for "do not merge raw datasets": adapters never
see each other's raw files, and the loader only ever concatenates already
schema-conformant DataFrames.
"""
from __future__ import annotations

import abc
import logging

import pandas as pd

from app.ml import config

logger = logging.getLogger(__name__)


class BaseDatasetAdapter(abc.ABC):
    #: short machine-readable name, stored in the `dataset_source` column
    name: str = "base"

    @abc.abstractmethod
    def is_available(self) -> bool:
        """Return True if this dataset's raw files exist on disk."""

    @abc.abstractmethod
    def load(self) -> pd.DataFrame:
        """Return a DataFrame already conformant to config.ALL_MASTER_COLUMNS."""

    def load_conformant(self) -> pd.DataFrame:
        """Public entry point: loads, then hard-enforces the schema so a bug
        in one adapter can never leak stray columns into the master dataset."""
        df = self.load()
        missing = [c for c in config.ALL_MASTER_COLUMNS if c not in df.columns]
        for col in missing:
            df[col] = pd.NA
        extra = [c for c in df.columns if c not in config.ALL_MASTER_COLUMNS]
        if extra:
            logger.warning("%s adapter produced non-schema columns, dropping: %s", self.name, extra)
        df = df[config.ALL_MASTER_COLUMNS]
        df["dataset_source"] = self.name
        logger.info("%s adapter produced %d rows", self.name, len(df))
        return df
