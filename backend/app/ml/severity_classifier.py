"""
severity_classifier.py
========================
The crash/fall model answers "did something happen?". This module answers
"how serious does it look?" -- a lightweight, explainable, rule-based layer
on top of the model's probability and the raw feature row, used to decide
alert urgency (e.g. auto-call emergency services vs. just notify).

Kept rule-based (not a second ML model) deliberately: severity triage needs
to be auditable and instantly explainable to a human reviewing an incident,
and it only has to run once per positive detection, so latency isn't a
constraint here the way it is for the primary detector.
"""
from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Dict


class Severity(str, Enum):
    """Matches the VQR architecture doc's Crash Severity Classifier output
    schema exactly: { severity: low/medium/high/critical, confidence }.
    Note there is no "none" level here -- a "no crash" result means the
    decision engine simply doesn't call this classifier at all (see
    decision_engine.py's `probability < DECISION_THRESHOLD` early return),
    matching the doc's flow where severity is only scored *after* a crash
    has already been detected/reported."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class SeverityResult:
    severity: Severity
    confidence: float
    reasons: list[str]


# Thresholds are intentionally centralized here so they can be tuned from a
# backend-pushed config (see communication_manager.py) without a model retrain.
CRITICAL_IMPACT_ACC_MAX = 35.0    # m/s^2 magnitude -- severe impact + rollover-scale forces
HIGH_IMPACT_ACC_MAX = 25.0        # calibrated against SisFall-style crash literature
MODERATE_IMPACT_ACC_MAX = 15.0
SIGNIFICANT_SPEED_DROP = 3.0      # m/s drop within one window suggests sudden stop
SEVERE_SPEED_DROP = 8.0           # large sudden stop, consistent with a high-speed impact


def classify_severity(model_probability: float, feature_row: Dict[str, float]) -> SeverityResult:
    """Only ever called once the decision engine has already decided
    `should_alert=True` -- there is no "not a crash" branch here by design
    (see the Severity enum docstring)."""
    reasons = [f"model probability={model_probability:.2f}"]
    acc_max = feature_row.get("acc_max", None)
    speed_drop = feature_row.get("gps_speed_drop", None)

    acc_max_valid = acc_max is not None and acc_max == acc_max
    speed_drop_valid = speed_drop is not None and speed_drop == speed_drop

    critical_impact = acc_max_valid and acc_max >= CRITICAL_IMPACT_ACC_MAX
    high_impact = acc_max_valid and acc_max >= HIGH_IMPACT_ACC_MAX
    moderate_impact = acc_max_valid and acc_max >= MODERATE_IMPACT_ACC_MAX
    severe_stop = speed_drop_valid and speed_drop >= SEVERE_SPEED_DROP
    sudden_stop = speed_drop_valid and speed_drop >= SIGNIFICANT_SPEED_DROP

    if acc_max_valid:
        reasons.append(f"acc_max={acc_max:.1f}")
    if speed_drop_valid:
        reasons.append(f"gps_speed_drop={speed_drop:.1f} m/s")

    if critical_impact and severe_stop:
        severity = Severity.CRITICAL
    elif high_impact and sudden_stop:
        severity = Severity.HIGH
    elif high_impact or (moderate_impact and sudden_stop):
        severity = Severity.MEDIUM
    elif moderate_impact:
        severity = Severity.LOW
    else:
        severity = Severity.LOW
        reasons.append("model flagged event but impact signature is weak -- likely low severity or false positive")

    return SeverityResult(severity=severity, confidence=model_probability, reasons=reasons)
