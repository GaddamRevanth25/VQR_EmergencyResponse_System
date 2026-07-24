"""
offline_queue.py
==================
On-device durable queue for alerts generated while offline. Backed by
SQLite (built into every Android/iOS Python runtime, no extra dependency)
so queued alerts survive an app restart or phone reboot between the crash
and the next successful sync.

Deduplication: a hash of (window_id, rounded timestamp) prevents the same
physical event from being queued twice if the detection pipeline is ever
re-triggered on overlapping windows (a real edge case given 50% window
overlap in feature_engineering.py).
"""
from __future__ import annotations

import hashlib
import json
import logging
import sqlite3
import time
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import List, Optional

from app.ml import config

logger = logging.getLogger(__name__)

_SCHEMA = """
CREATE TABLE IF NOT EXISTS alert_queue (
    id TEXT PRIMARY KEY,
    created_at REAL NOT NULL,
    payload TEXT NOT NULL,
    synced INTEGER NOT NULL DEFAULT 0,
    sync_attempts INTEGER NOT NULL DEFAULT 0,
    last_attempt_at REAL
);
"""


@dataclass
class QueuedAlert:
    window_id: str
    severity: str
    probability: float
    lat: Optional[float]
    lon: Optional[float]
    timestamp: float
    sensor_snapshot: dict
    # Per the VQR doc's "Persistent Vehicle Context" design principle: the
    # most recently scanned/selected vehicle ID, cached on-device, so a
    # crash alert automatically carries make/model safety context without
    # an extra round trip.
    vehicle_id: Optional[str] = None


def _alert_id(alert: QueuedAlert) -> str:
    key = f"{alert.window_id}:{round(alert.timestamp, 1)}"
    return hashlib.sha256(key.encode()).hexdigest()[:24]


class OfflineQueue:
    def __init__(self, db_path: Optional[Path] = None):
        self.db_path = db_path or config.OFFLINE_QUEUE_DB
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(self.db_path)
        self._conn.execute(_SCHEMA)
        self._conn.commit()

    def enqueue(self, alert: QueuedAlert) -> str:
        alert_id = _alert_id(alert)
        try:
            self._conn.execute(
                "INSERT INTO alert_queue (id, created_at, payload) VALUES (?, ?, ?)",
                (alert_id, time.time(), json.dumps(asdict(alert))),
            )
            self._conn.commit()
            logger.info("Queued offline alert %s (severity=%s)", alert_id, alert.severity)
        except sqlite3.IntegrityError:
            logger.info("Duplicate alert %s ignored (already queued)", alert_id)
        return alert_id

    def pending(self) -> List[dict]:
        cur = self._conn.execute(
            "SELECT id, payload, sync_attempts FROM alert_queue WHERE synced = 0 ORDER BY created_at ASC"
        )
        return [{"id": r[0], "payload": json.loads(r[1]), "sync_attempts": r[2]} for r in cur.fetchall()]

    def mark_synced(self, alert_id: str):
        self._conn.execute("UPDATE alert_queue SET synced = 1 WHERE id = ?", (alert_id,))
        self._conn.commit()

    def mark_attempt_failed(self, alert_id: str):
        self._conn.execute(
            "UPDATE alert_queue SET sync_attempts = sync_attempts + 1, last_attempt_at = ? WHERE id = ?",
            (time.time(), alert_id),
        )
        self._conn.commit()

    def close(self):
        self._conn.close()
