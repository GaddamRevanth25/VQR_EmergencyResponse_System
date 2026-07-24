"""
communication_manager.py
==========================
Detects connectivity state and switches between ONLINE and OFFLINE sync
behavior. Per the brief: "Prediction model remains local. Only
synchronization changes." -- this module never touches the model or the
decision logic, only what happens to an already-decided alert.

`is_online()` is injected as a callable so this module stays testable
without a real network stack: the FastAPI/mobile integration layer passes
in the platform's actual connectivity check (e.g. React Native's NetInfo,
or a simple socket/HTTP HEAD probe on the backend side).
"""
from __future__ import annotations

import logging
import time
from dataclasses import dataclass
from typing import Callable, Optional

from app.ml.offline_queue import OfflineQueue, QueuedAlert

logger = logging.getLogger(__name__)


@dataclass
class BackendConfig:
    """Configuration the backend can push down (thresholds, model version),
    fetched only while online."""
    model_version: str = "unknown"
    severity_thresholds_overridden: Optional[dict] = None


class CommunicationManager:
    def __init__(
        self,
        is_online: Callable[[], bool],
        upload_fn: Callable[[dict], bool],
        fetch_config_fn: Optional[Callable[[], BackendConfig]] = None,
        queue: Optional[OfflineQueue] = None,
        retry_backoff_s: float = 5.0,
        max_attempts: int = 8,
    ):
        self.is_online = is_online
        self.upload_fn = upload_fn
        self.fetch_config_fn = fetch_config_fn
        self.queue = queue or OfflineQueue()
        self.retry_backoff_s = retry_backoff_s
        self.max_attempts = max_attempts
        self._mode = "unknown"

    def current_mode(self) -> str:
        mode = "online" if self.is_online() else "offline"
        if mode != self._mode:
            logger.info("Connectivity change: %s -> %s", self._mode, mode)
        self._mode = mode
        return mode

    def submit_alert(self, alert: QueuedAlert):
        """Always queue first (so an alert is never lost even if the
        subsequent upload attempt throws), then try to sync immediately if
        online."""
        alert_id = self.queue.enqueue(alert)
        if self.current_mode() == "online":
            self._try_sync_one(alert_id, alert)
        return alert_id

    def _try_sync_one(self, alert_id: str, alert: QueuedAlert) -> bool:
        try:
            ok = self.upload_fn({"id": alert_id, **alert.__dict__})
        except Exception as exc:  # noqa: BLE001
            logger.warning("Upload failed for alert %s: %s", alert_id, exc)
            ok = False

        if ok:
            self.queue.mark_synced(alert_id)
            logger.info("Synced alert %s", alert_id)
        else:
            self.queue.mark_attempt_failed(alert_id)
        return ok

    def sync_pending(self):
        """Call whenever connectivity is (re)established -- drains the
        offline queue, respecting a max retry count per alert so a
        permanently malformed payload can't loop forever."""
        if self.current_mode() != "online":
            logger.debug("sync_pending called while offline; no-op.")
            return

        for item in self.queue.pending():
            if item["sync_attempts"] >= self.max_attempts:
                logger.error("Alert %s exceeded max sync attempts; leaving queued for manual review.", item["id"])
                continue
            alert = QueuedAlert(**item["payload"])
            self._try_sync_one(item["id"], alert)
            time.sleep(0)  # yield point; real backoff would be scheduled, not blocking, on-device

    def refresh_backend_config(self) -> Optional[BackendConfig]:
        if self.current_mode() == "online" and self.fetch_config_fn:
            try:
                return self.fetch_config_fn()
            except Exception as exc:  # noqa: BLE001
                logger.warning("Failed to refresh backend config: %s", exc)
        return None
