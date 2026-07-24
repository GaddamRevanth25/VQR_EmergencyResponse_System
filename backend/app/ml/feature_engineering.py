"""
feature_engineering.py
=======================
Sliding-window statistical feature extraction.

This module is deliberately signal-agnostic: it takes a 1-D numpy array
(a single accelerometer axis, a gyroscope axis, or a magnitude signal) and
returns the standard statistical feature set used across the whole project
(mean, std, max, min, median, variance, RMS, energy, entropy, SMA-component,
IQR, kurtosis, skewness, peak count, zero-crossing count).

Both dataset adapters call into this module so the feature *definitions*
never drift between datasets -- only which raw signals are available differs.
"""
from __future__ import annotations

import logging
from typing import Dict, Iterable, Sequence

import numpy as np
from scipy.stats import kurtosis, skew

logger = logging.getLogger(__name__)


def _safe(fn, *args, default: float = np.nan, **kwargs) -> float:
    """Run a numpy/scipy stat function, returning `default` on any failure
    (e.g. empty arrays, all-NaN windows, zero variance for skew/kurtosis)."""
    try:
        val = fn(*args, **kwargs)
        if val is None or (isinstance(val, float) and np.isnan(val)):
            return default
        return float(val)
    except Exception as exc:  # noqa: BLE001 - we want *any* failure to degrade gracefully
        logger.debug("stat fn %s failed: %s", getattr(fn, "__name__", fn), exc)
        return default


def signal_entropy(x: np.ndarray, bins: int = 16) -> float:
    """Shannon entropy of the signal's amplitude histogram. A crash/fall event
    typically produces a low-entropy, high-magnitude spike whereas walking
    is more uniformly distributed -- this is a genuinely discriminative
    feature, not just a placeholder."""
    if x.size == 0 or np.all(np.isnan(x)):
        return np.nan
    x = x[~np.isnan(x)]
    if x.size < 2:
        return np.nan
    hist, _ = np.histogram(x, bins=bins, density=True)
    hist = hist[hist > 0]
    if hist.size == 0:
        return np.nan
    probs = hist / hist.sum()
    return float(-np.sum(probs * np.log2(probs)))


def zero_crossing_count(x: np.ndarray) -> float:
    x = x[~np.isnan(x)]
    if x.size < 2:
        return np.nan
    centered = x - np.mean(x)
    signs = np.sign(centered)
    signs[signs == 0] = 1
    return float(np.sum(np.abs(np.diff(signs)) > 0))


def peak_count(x: np.ndarray, threshold_std: float = 1.5) -> float:
    """Count of local maxima that exceed mean + threshold_std * std -- a
    proxy for impact spikes within the window."""
    x = x[~np.isnan(x)]
    if x.size < 3:
        return np.nan
    thresh = np.mean(x) + threshold_std * np.std(x)
    is_peak = (x[1:-1] > x[:-2]) & (x[1:-1] > x[2:]) & (x[1:-1] > thresh)
    return float(np.sum(is_peak))


def extract_axis_stats(x: Sequence[float], prefix: str) -> Dict[str, float]:
    """Compute the full statistical feature set for one axis/magnitude signal.

    Parameters
    ----------
    x : 1-D array-like
        Raw samples within a single sliding window.
    prefix : str
        e.g. "acc" or "gyro" -- used to build output keys like "acc_mean".
    """
    x = np.asarray(x, dtype=float)
    x_clean = x[~np.isnan(x)]

    feats = {
        f"{prefix}_mean": _safe(np.mean, x_clean),
        f"{prefix}_std": _safe(np.std, x_clean),
        f"{prefix}_max": _safe(np.max, x_clean) if x_clean.size else np.nan,
        f"{prefix}_min": _safe(np.min, x_clean) if x_clean.size else np.nan,
        f"{prefix}_median": _safe(np.median, x_clean),
        f"{prefix}_var": _safe(np.var, x_clean),
        f"{prefix}_rms": _safe(lambda a: np.sqrt(np.mean(np.square(a))), x_clean),
        f"{prefix}_energy": _safe(lambda a: np.sum(np.square(a)), x_clean),
        f"{prefix}_entropy": signal_entropy(x),
        f"{prefix}_sma": _safe(lambda a: np.sum(np.abs(a)) / max(len(a), 1), x_clean),
        f"{prefix}_iqr": _safe(lambda a: np.percentile(a, 75) - np.percentile(a, 25), x_clean),
        f"{prefix}_kurtosis": _safe(kurtosis, x_clean, default=np.nan) if x_clean.size > 3 else np.nan,
        f"{prefix}_skewness": _safe(skew, x_clean, default=np.nan) if x_clean.size > 3 else np.nan,
        f"{prefix}_peak_count": peak_count(x),
        f"{prefix}_zero_crossing": zero_crossing_count(x),
    }
    return feats


def signal_magnitude_vector(*axes: Sequence[float]) -> np.ndarray:
    """sqrt(x^2 + y^2 + z^2 + ...) combining however many axes are available.
    This is what lets us compute a single 'acc_*' feature set whether the
    device exposes 1, 2 or 3 accelerometer axes (see missing-sensor handling
    in sensor_manager.py)."""
    arrs = [np.asarray(a, dtype=float) for a in axes]
    stacked = np.vstack(arrs)
    return np.sqrt(np.nansum(np.square(stacked), axis=0))


def sliding_windows(n_rows: int, window_size: int, step: int) -> Iterable[tuple[int, int]]:
    """Yield (start, end) index pairs of non-overlapping-by-`step` windows."""
    if window_size <= 0 or n_rows < window_size:
        return
    start = 0
    while start + window_size <= n_rows:
        yield start, start + window_size
        start += step
