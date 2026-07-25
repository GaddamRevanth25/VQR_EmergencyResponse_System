"""
predict.py
===========
Single entry point for running the deployed model on a feature row. Used by
both the FastAPI backend (online scoring / re-validation) and, via
onnxruntime instead of joblib, the on-device mobile inference path.

Two backends are supported:
  - joblib (`PredictorJoblib`): used server-side where sklearn is available.
  - onnxruntime (`PredictorONNX`): used on-device; no sklearn dependency,
    much smaller runtime footprint, matches the model exported by
    model_selection.py.

Both expose the same `.predict_proba(feature_row: dict) -> float` interface
so decision_engine.py doesn't need to know which backend is in use.
"""
from __future__ import annotations

import logging
from typing import Dict, Protocol

import numpy as np

from app.ml import config

logger = logging.getLogger(__name__)


class Predictor(Protocol):
    feature_columns: list[str]

    def predict_proba(self, feature_row: Dict[str, float]) -> float: ...


class PredictorJoblib:
    def __init__(self, bundle_path=None):
        import joblib
        bundle = joblib.load(bundle_path or config.FINAL_MODEL_JOBLIB)
        self.model = bundle["model"]
        self.preprocessor = bundle["preprocessor"]
        self.feature_columns = bundle["feature_columns"]
        self.model_name = bundle["model_name"]

    def predict_proba(self, feature_row: Dict[str, float]) -> float:
        import pandas as pd
        row_df = pd.DataFrame([feature_row]).reindex(columns=self.feature_columns)
        X = self.preprocessor.transform(row_df)
        try:
            return float(self.model.predict_proba(X)[0, 1])
        except AttributeError:
            return float(self.model.predict(X)[0])


class PredictorONNX:
    """On-device inference path. Requires only `onnxruntime` + `numpy` --
    deliberately no sklearn/pandas dependency so it stays lightweight on
    mobile. NOTE: imputation/scaling must be replicated here using the
    stats saved in vqr_crash_model_meta.json (see notes in crash_service.py);
    this class assumes the caller passes an already-imputed, already-scaled
    row for maximum portability across platforms."""

    def __init__(self, onnx_path=None, feature_columns=None):
        import onnxruntime as ort
        self.session = ort.InferenceSession(str(onnx_path or config.FINAL_MODEL_ONNX))
        self.feature_columns = feature_columns
        self.input_name = self.session.get_inputs()[0].name

    def predict_proba(self, ordered_values: list[float]) -> float:
        x = np.array([ordered_values], dtype=np.float32)
        outputs = self.session.run(None, {self.input_name: x})
        # sklearn-onnx/onnxmltools classifiers typically return
        # [labels, probabilities] -- probabilities is a list of dicts or an array.
        proba_out = outputs[1]
        if isinstance(proba_out, list):
            return float(proba_out[0][1])
        return float(np.asarray(proba_out)[0, 1])


class ConsensusPredictorJoblib:
    """N-of-M voting consensus across the mobile-friendly model pool
    (research report §2/§6): fires only when at least k of the m models in
    the pool independently classify the window as positive. This is cheap
    given the existing pipeline -- all m models are already trained during
    the normal 7-model comparison pass in model_training.py; this class only
    changes how their outputs are combined at inference time.

    Same `.predict_proba(feature_row) -> float` interface as PredictorJoblib
    so decision_engine.py doesn't need to know whether it's talking to a
    single model or a consensus pool. `predict_proba` here returns the vote
    FRACTION (votes_for / m), not a calibrated probability from any one
    model -- decision_engine.py's existing threshold-on-probability logic
    still applies unchanged if the threshold is interpreted as "fraction of
    pool voting positive" (e.g. 0.5 for a 2-of-3 rule), but see
    `predict_consensus` below for the exact integer k-of-m rule actually used.

    Falls back gracefully: if only one model is available in the bundle
    (e.g. this ran against a dataset where fewer than 3 mobile-friendly
    models trained successfully), it behaves like a single-model predictor.
    """

    def __init__(self, bundle_path=None):
        import joblib
        bundle = joblib.load(bundle_path or (config.MODELS_DIR / "vqr_crash_consensus.joblib"))
        self.models: Dict[str, object] = bundle["models"]
        self.pool_names: list[str] = bundle["pool_names"]
        self.k: int = bundle["k"]
        self.m: int = bundle["m"]
        self.preprocessor = bundle["preprocessor"]
        self.feature_columns = bundle["feature_columns"]

    def per_model_votes(self, feature_row: Dict[str, float]) -> Dict[str, int]:
        """Returns each pool model's binary vote (1 = crash) for one window --
        exposed separately from predict_proba so decision_engine.py or an
        incident report can show *which* models agreed/disagreed, matching
        the "instantly auditable to a human reviewer" design goal already
        stated for the rule-based layers in the README."""
        import pandas as pd
        row_df = pd.DataFrame([feature_row]).reindex(columns=self.feature_columns)
        X = self.preprocessor.transform(row_df)
        votes = {}
        for name, estimator in self.models.items():
            try:
                proba = float(estimator.predict_proba(X)[0, 1])
                votes[name] = int(proba >= 0.5)
            except AttributeError:
                votes[name] = int(estimator.predict(X)[0])
        return votes

    def predict_proba(self, feature_row: Dict[str, float]) -> float:
        votes = self.per_model_votes(feature_row)
        return sum(votes.values()) / len(votes)

    def predict_consensus(self, feature_row: Dict[str, float]) -> tuple[bool, Dict[str, int]]:
        """The actual N-of-M decision: True iff at least k of m models voted
        positive. Use this (not a threshold on predict_proba) when you want
        the exact integer-vote rule rather than a fraction comparison."""
        votes = self.per_model_votes(feature_row)
        fired = sum(votes.values()) >= self.k
        return fired, votes


def load_default_predictor() -> PredictorJoblib:
    return PredictorJoblib()


def load_default_consensus_predictor() -> ConsensusPredictorJoblib:
    return ConsensusPredictorJoblib()
