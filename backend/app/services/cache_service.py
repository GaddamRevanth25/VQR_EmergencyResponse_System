import os
import json
import time
import threading
from typing import Optional

# Path to the cache file: backend/app/data/vehicleCache.json
CACHE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
CACHE_PATH = os.path.join(CACHE_DIR, "vehicleCache.json")

# Configurable TTL (default 24 hours / 86400 seconds)
TTL_SECONDS = int(os.getenv("VEHICLE_CACHE_TTL_SECONDS", 86400))

# Threading lock for multi-threaded safety in FastAPI
_cache_lock = threading.Lock()

class VehicleCacheService:
    @staticmethod
    def _normalize_key(registration_number: str) -> str:
        """
        Normalize the registration number cache key:
        Trim, uppercase, remove all spaces, and remove hyphens.
        """
        if not registration_number:
            return ""
        return registration_number.strip().replace(" ", "").replace("-", "").upper()

    @classmethod
    def _load_cache_file(cls) -> dict:
        """
        Loads cache dictionary from file. Returns empty dict if file does not exist or is corrupt.
        Assumes caller holds the _cache_lock.
        """
        if not os.path.exists(CACHE_PATH):
            return {}
        try:
            with open(CACHE_PATH, "r") as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            return {}

    @classmethod
    def _save_cache_file(cls, cache_data: dict) -> None:
        """
        Saves cache dictionary to file. Creates parent directories if missing.
        Assumes caller holds the _cache_lock.
        """
        os.makedirs(CACHE_DIR, exist_ok=True)
        try:
            with open(CACHE_PATH, "w") as f:
                json.dump(cache_data, f, indent=2)
        except IOError as e:
            print(f"Error saving vehicle cache file: {e}")

    @classmethod
    def get(cls, registration_number: str) -> Optional[dict]:
        """
        Retrieves a valid cache entry. Returns None if missing or expired.
        """
        norm_key = cls._normalize_key(registration_number)
        if not norm_key:
            return None

        with _cache_lock:
            cache = cls._load_cache_file()
            entry = cache.get(norm_key)
            if not entry:
                return None

            fetched_at_ms = entry.get("fetchedAt", 0)
            ttl_seconds = entry.get("ttl", TTL_SECONDS)
            current_time_ms = int(time.time() * 1000)

            # Check if expired: fetchedAt + (ttl * 1000) < current_time
            if fetched_at_ms + (ttl_seconds * 1000) < current_time_ms:
                return None  # Expired

            return entry.get("data")

    @classmethod
    def set(cls, registration_number: str, data: dict) -> None:
        """
        Saves vehicle data to cache. Cleans up stale entries older than 7 days (604800 seconds).
        """
        norm_key = cls._normalize_key(registration_number)
        if not norm_key:
            return

        current_time_ms = int(time.time() * 1000)

        with _cache_lock:
            cache = cls._load_cache_file()

            # Prepare new cache entry
            cache[norm_key] = {
                "data": data,
                "fetchedAt": current_time_ms,
                "ttl": TTL_SECONDS
            }

            # Cleanup routine: purge expired entries older than 7 days past expiry
            cleaned_cache = {}
            for k, entry in cache.items():
                fetched_at = entry.get("fetchedAt", 0)
                ttl = entry.get("ttl", TTL_SECONDS)
                # Max age to keep: fetchedAt + ttl + 7 days
                max_keep_age_ms = fetched_at + (ttl + 7 * 86400) * 1000
                if current_time_ms <= max_keep_age_ms:
                    cleaned_cache[k] = entry

            cls._save_cache_file(cleaned_cache)

    @classmethod
    def clear(cls) -> None:
        """
        Resets/clears the entire cache file. Useful for testing.
        """
        with _cache_lock:
            if os.path.exists(CACHE_PATH):
                try:
                    os.remove(CACHE_PATH)
                except OSError:
                    pass
