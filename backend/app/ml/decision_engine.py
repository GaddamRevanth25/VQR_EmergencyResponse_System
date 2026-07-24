"""
decision_engine.py
====================
Sits between the raw model probability and "create an alert, yes/no".
This is where the edge cases enumerated in the brief get handled -- not by
special-casing the ML model, but by wrapping it with explicit, auditable
rules. Keeping this separate from predict.py means the model can be
retrained/replaced without touching this logic, and vice versa.

Edge cases handled here:
  - Vehicle stopped at a signal / low-speed context suppressing false
    positives from potholes & speed breakers (checked via GPS speed).
  - Duplicate/overlapping window suppression (debounce window).
  - User-cancel grace period.
  - Low battery -> degrade to a cheaper decision path (skip severity
    sub-classification, just alert).
  - Missing GPS -> proceed on accel/gyro alone with reduced confidence label.
"""
from __future__ import annotations

import logging
import time
from dataclasses import dataclass
from typing import Dict, Optional

from app.ml.severity_classifier import Severity, SeverityResult, classify_severity
from app.ml.validation import validate_live_row

logger = logging.getLogger(__name__)

DECISION_THRESHOLD = 0.5
DEBOUNCE_SECONDS = 8.0          # suppress duplicate alerts from overlapping windows
LOW_SPEED_SUPPRESSION_MPS = 0.5  # near-zero speed strongly suggests a stop, not a crash
# Matches the VQR architecture doc's explicit "30-second cancellation window"
# (Crash Alert Overlay / Phase 6 detection pipeline).
USER_CANCEL_GRACE_SECONDS = 30.0


@dataclass
class DecisionResult:
    should_alert: bool
    severity: Optional[Severity]
    probability: float
    reasons: list[str]
    cancel_grace_period_s: float = 0.0


class DecisionEngine:
    def __init__(self, require_consecutive: int = 1):
        """`require_consecutive`: literature review Part 1 §1.6 (Rodegast et
        al., "On using machine learning algorithms for motorcycle collision
        detection", Discover Applied Sciences 2024) found that requiring N
        consecutive positive window classifications -- not just one -- was
        an effective, essentially-free false-positive filter, used alongside
        (not instead of) the model itself. Defaults to 1, i.e. today's
        existing behavior (fire on the first positive window) -- this is an
        OPT-IN stricter mode, not a silent behavior change. Try
        `DecisionEngine(require_consecutive=3)` and compare false-positive
        rates on outputs/leave_one_dataset_out_report.json before and after;
        the right value depends on your window stride (config.WINDOW_OVERLAP)
        since consecutive overlapping windows already share most of their
        samples, so 3 consecutive 50%-overlap 2s windows only requires ~3s of
        sustained signal, not 6s.
        """
        self._last_alert_ts: float = 0.0
        self.require_consecutive = max(1, require_consecutive)
        self._consecutive_positive_count = 0

    def decide(
        self,
        probability: float,
        feature_row: Dict[str, float],
        battery_low: bool = False,
        vehicle_context: Optional[str] = None,  # "stopped_at_signal", "riding", None
    ) -> DecisionResult:
        reasons = []
        now = time.time()

        warnings = validate_live_row(feature_row)
        if warnings:
            reasons.extend(warnings)

        if probability < DECISION_THRESHOLD:
            self._consecutive_positive_count = 0
            return DecisionResult(False, None, probability, reasons + ["below decision threshold"])

        # Temporal consensus gate (literature review §1.6): a single positive
        # window isn't enough when require_consecutive > 1 -- this counts
        # consecutive positive-probability windows and only lets the decision
        # proceed once the streak reaches the configured length. A window
        # that drops below threshold resets the streak (handled above).
        self._consecutive_positive_count += 1
        if self._consecutive_positive_count < self.require_consecutive:
            reasons.append(
                f"awaiting temporal consensus: {self._consecutive_positive_count}/"
                f"{self.require_consecutive} consecutive positive windows"
            )
            return DecisionResult(False, None, probability, reasons)

        # Debounce: overlapping 50%-stride windows can both fire on the same
        # physical event.
        if now - self._last_alert_ts < DEBOUNCE_SECONDS:
            reasons.append("suppressed: within debounce window of a previous alert")
            return DecisionResult(False, None, probability, reasons)

        # Vehicle stopped at a signal / low GPS speed at time of "impact" is
        # a classic false-positive source (phone dropped while stationary,
        # hard braking with no actual crash).
        gps_speed = feature_row.get("gps_max_speed")
        if vehicle_context == "stopped_at_signal" or (
            gps_speed is not None and gps_speed == gps_speed and gps_speed < LOW_SPEED_SUPPRESSION_MPS
        ):
            reasons.append("low/zero speed context -- treated as likely false positive, downgraded to LOW")
            self._last_alert_ts = now
            self._consecutive_positive_count = 0
            return DecisionResult(True, Severity.LOW, probability, reasons, USER_CANCEL_GRACE_SECONDS)

        if battery_low:
            reasons.append("battery low -- skipping severity sub-classification to save power")
            self._last_alert_ts = now
            self._consecutive_positive_count = 0
            return DecisionResult(True, Severity.MEDIUM, probability, reasons, USER_CANCEL_GRACE_SECONDS)

        severity_result: SeverityResult = classify_severity(probability, feature_row)
        reasons.extend(severity_result.reasons)
        self._last_alert_ts = now
        self._consecutive_positive_count = 0

        return DecisionResult(
            should_alert=True,
            severity=severity_result.severity,
            probability=probability,
            reasons=reasons,
            cancel_grace_period_s=USER_CANCEL_GRACE_SECONDS,
        )
