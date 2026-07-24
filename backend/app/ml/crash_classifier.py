"""
crash_classifier.py
=====================
The `BaseClassifier`-conformant entry point for the crash/fall detector,
mirroring `vehicle_classifier.py` + `MockVehicleClassifier` exactly so the
same `ML_MODE=mock|live` switch and route-handler code path works for both
models.

Live implementation wraps everything already built in ml_service.py /
predict.py / decision_engine.py / severity_classifier.py -- this file adds
no new detection logic, it's purely the adapter to the doc's expected
interface shape.

Expected route usage (backend/app/api/routes/alerts.py):

    from app.ml.crash_classifier import get_crash_classifier
    classifier = get_crash_classifier()   # picks mock/live from ML_MODE

    @router.post("/api/alerts/crash")
    def post_crash_alert(payload: CrashAlertRequest):
        result = classifier.predict(payload.dict())
        ...pass result to Dispatch Router...
"""
from __future__ import annotations

import logging
import os
import random
from typing import Any, Dict

from app.ml.base import BaseClassifier
from app.ml.decision_engine import DecisionEngine
from app.ml.predict import PredictorJoblib
from app.ml.severity_classifier import Severity

logger = logging.getLogger(__name__)


class CrashClassifier(BaseClassifier):
    """Live implementation. Input payload matches the doc's expected
    sensor-snapshot shape (POST /api/alerts/crash body):

        {
          "vehicleId": "toyota-camry-2024" | None,
          "feature_row": {...},   # pre-computed on-device, OR
          "sensor_window": {...}, # raw accel/gyro/gps samples (future: compute here)
          "battery_low": bool,
          "vehicle_context": "stopped_at_signal" | "riding" | None,
        }

    Output matches the doc's { severity, confidence } shape, extended with
    the fields the Alert Service / Dispatch Router need.
    """

    model_name = "vqr_crash_xgboost"
    is_live = True

    def __init__(self):
        self._predictor = None
        self._decision_engine = None

    def load(self) -> None:
        if self._predictor is None:
            self._predictor = PredictorJoblib()
            self._decision_engine = DecisionEngine()
            logger.info("CrashClassifier loaded model=%s", self._predictor.model_name)

    def predict(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        self.load()
        feature_row = payload.get("feature_row")
        if feature_row is None:
            raise ValueError(
                "CrashClassifier.predict expects a pre-computed 'feature_row' "
                "(built on-device by sensor_manager.py). Raw sensor-window "
                "aggregation server-side is not yet implemented -- see README."
            )

        probability = self._predictor.predict_proba(feature_row)
        result = self._decision_engine.decide(
            probability,
            feature_row,
            battery_low=payload.get("battery_low", False),
            vehicle_context=payload.get("vehicle_context"),
        )

        return {
            "should_alert": result.should_alert,
            "severity": result.severity.value if result.severity else None,
            "confidence": result.probability,
            "reasons": result.reasons,
            "cancel_window_seconds": result.cancel_grace_period_s,
            "vehicle_id": payload.get("vehicleId"),
        }


class MockCrashClassifier(BaseClassifier):
    """Deterministic stub for ML_MODE=mock -- lets the FastAPI routes,
    Alert Service, and Dispatch Router be developed/tested end-to-end
    without loading the real model, exactly like MockVehicleClassifier."""

    model_name = "mock_crash_classifier"
    is_live = False

    def load(self) -> None:
        pass  # nothing to load

    def predict(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        # Deterministic-ish: hash the vehicleId (or lack thereof) into a
        # repeatable pseudo-probability, same spirit as the doc's
        # "deterministic hash-based match" for MockVehicleClassifier.
        seed_key = str(payload.get("vehicleId", "unknown"))
        rng = random.Random(seed_key)
        probability = rng.uniform(0.3, 0.95)
        should_alert = probability >= 0.5
        severity = None
        if should_alert:
            severity = rng.choice([Severity.LOW, Severity.MEDIUM, Severity.HIGH]).value

        return {
            "should_alert": should_alert,
            "severity": severity,
            "confidence": probability,
            "reasons": ["mock classifier -- ML_MODE=mock"],
            "cancel_window_seconds": 30.0,
            "vehicle_id": payload.get("vehicleId"),
        }


_classifier_instance: BaseClassifier | None = None


def get_crash_classifier() -> BaseClassifier:
    """Singleton accessor, mirroring how the doc describes weights being
    loaded lazily on first use and reused across requests."""
    global _classifier_instance
    if _classifier_instance is None:
        mode = os.environ.get("ML_MODE", "mock").lower()
        _classifier_instance = MockCrashClassifier() if mode == "mock" else CrashClassifier()
        logger.info("Initialized crash classifier in %s mode", mode)
    return _classifier_instance
