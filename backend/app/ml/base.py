"""
base.py
========
Matches the VQR architecture doc's ML layer pattern exactly: every model
(vehicle classifier, crash classifier, ...) implements this one interface,
so the FastAPI routes never need to know or care whether they're talking
to a mock or a live model. Mirrors how `VehicleClassifier` /
`MockVehicleClassifier` are described to share `BaseClassifier` in
`backend/app/ml/`.

Drop this file (and crash_classifier.py) directly into backend/app/ml/
alongside your existing vehicle_classifier.py -- they're written to the
same contract.
"""
from __future__ import annotations

import abc
from typing import Any, Dict


class BaseClassifier(abc.ABC):
    """Every classifier in the VQR ML layer -- vehicle recognition, crash
    detection, whatever comes next -- implements this same three-method
    contract so `ML_MODE=mock|live` can swap implementations without
    touching route handlers or the Alert/Dispatch services."""

    #: set by subclasses; surfaced at GET /api/ml/status
    model_name: str = "base"
    is_live: bool = False

    @abc.abstractmethod
    def load(self) -> None:
        """Lazy-load weights/artifacts. Called once, on first use, per the
        doc's 'Model weights loaded lazily on first call' requirement --
        NOT in __init__, so app startup stays fast even with a live model."""

    @abc.abstractmethod
    def predict(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Input/output shapes are classifier-specific (see
        crash_classifier.py for the crash detector's contract) but every
        implementation returns a plain JSON-serializable dict, matching the
        doc's Pydantic-schema-first API contract."""

    def status(self) -> Dict[str, Any]:
        return {"model_name": self.model_name, "is_live": self.is_live}
