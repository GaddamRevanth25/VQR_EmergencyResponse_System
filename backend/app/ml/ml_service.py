"""
ml_service.py
===============
Top-level façade the FastAPI backend (or a direct in-process caller) talks
to. This is the one class the rest of the VQR application should import --
everything else in app/ml is an implementation detail behind it.

Typical FastAPI usage:

    from app.ml.ml_service import MLService
    service = MLService()

    @app.post("/sensor-event")
    def sensor_event(evt: SensorEvent):
        service.ingest(evt.sensor_type, evt.values, evt.timestamp)
        result = service.step()
        if result and result.should_alert:
            ...create emergency alert using result.severity...

Threading/async note: this class holds mutable rolling buffers and is NOT
thread-safe by itself -- in a FastAPI deployment, run one MLService instance
per active device/session (e.g. keyed by device_id in a dict), not one
shared global instance across all users.
"""
from __future__ import annotations

import logging
from typing import Callable, Optional

from app.ml import config
from app.ml.communication_manager import BackendConfig, CommunicationManager
from app.ml.decision_engine import DecisionEngine, DecisionResult
from app.ml.offline_queue import OfflineQueue, QueuedAlert
from app.ml.predict import PredictorJoblib
from app.ml.sensor_manager import SensorManager

logger = logging.getLogger(__name__)


class MLService:
    def __init__(
        self,
        is_online: Optional[Callable[[], bool]] = None,
        upload_fn: Optional[Callable[[dict], bool]] = None,
    ):
        self.predictor = PredictorJoblib()
        window_size = int(config.WINDOW_SECONDS * config.ASSUMED_IMU_HZ)
        self.sensor_manager = SensorManager(window_size, self.predictor.feature_columns)
        self.decision_engine = DecisionEngine()

        self.comms: Optional[CommunicationManager] = None
        if is_online is not None and upload_fn is not None:
            self.comms = CommunicationManager(
                is_online=is_online, upload_fn=upload_fn, queue=OfflineQueue(),
            )

    # -- sensor ingestion ----------------------------------------------------
    def ingest_accel(self, x: float, y: float, z: float):
        self.sensor_manager.push_accel(x, y, z)

    def ingest_gyro(self, x: float, y: float, z: float):
        self.sensor_manager.push_gyro(x, y, z)

    def ingest_magnetometer(self, x: float, y: float, z: float):
        self.sensor_manager.push_magnetometer(x, y, z)

    def ingest_gps(self, lat: float, lon: float, speed: float, ts: float):
        self.sensor_manager.push_gps(lat, lon, speed, ts)

    # -- main loop -------------------------------------------------------------
    def step(
        self,
        battery_low: bool = False,
        vehicle_context: Optional[str] = None,
        vehicle_id: Optional[str] = None,
    ) -> Optional[DecisionResult]:
        """Call this once per new window (e.g. every `step` samples, or on a
        fixed timer). Returns None if there isn't enough buffered data yet
        for a decision -- this is normal at startup, not an error.

        `vehicle_id` should be the most recently scanned/selected vehicle
        (cached on-device per the VQR doc's Persistent Vehicle Context
        principle) so any resulting alert carries make/model safety
        context automatically."""
        feature_row = self.sensor_manager.build_feature_row()
        if feature_row is None:
            return None

        probability = self.predictor.predict_proba(feature_row)
        result = self.decision_engine.decide(
            probability, feature_row, battery_low=battery_low, vehicle_context=vehicle_context,
        )

        if result.should_alert and self.comms is not None:
            gps = self.sensor_manager.last_gps or {}
            alert = QueuedAlert(
                window_id=f"live_{int(gps.get('ts', 0))}",
                severity=result.severity.value if result.severity else "unknown",
                probability=probability,
                lat=gps.get("lat"), lon=gps.get("lon"),
                timestamp=gps.get("ts", 0.0),
                sensor_snapshot=feature_row,
                vehicle_id=vehicle_id,
            )
            self.comms.submit_alert(alert)

        return result

    def sync_now(self):
        if self.comms is not None:
            self.comms.sync_pending()

    def refresh_backend_config(self) -> Optional[BackendConfig]:
        if self.comms is not None:
            return self.comms.refresh_backend_config()
        return None
