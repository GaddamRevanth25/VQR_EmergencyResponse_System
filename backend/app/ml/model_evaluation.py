"""
model_evaluation.py
====================
Evaluates every trained candidate on the held-out test set across the
criteria the project cares about: Accuracy, Precision, Recall, F1, ROC-AUC,
per-sample inference latency, resident memory footprint, serialized model
size, and a coarse battery-cost estimate derived from latency + model size
(mobile CPUs draw roughly proportional current to active compute time, so
latency is the dominant proxy; model size matters for load-time/cold-start
battery cost, which is why both are folded in).

Produces:
    outputs/evaluation_report.json
    outputs/confusion_matrices/<model>.png
    outputs/roc_curves/<model>.png
"""
from __future__ import annotations

import io
import json
import logging
import pickle
import time
import tracemalloc
from typing import Any, Dict

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from sklearn.metrics import (
    accuracy_score, confusion_matrix, f1_score, precision_score,
    recall_score, roc_auc_score, roc_curve,
)

from app.ml import config

logger = logging.getLogger(__name__)

N_LATENCY_TRIALS = 200


def _measure_single_sample_latency_ms(estimator: Any, X_sample: np.ndarray) -> float:
    x = X_sample[:1]
    # warm-up (JIT/cache effects shouldn't count against the model)
    for _ in range(5):
        estimator.predict(x)
    t0 = time.perf_counter()
    for _ in range(N_LATENCY_TRIALS):
        estimator.predict(x)
    elapsed = time.perf_counter() - t0
    return (elapsed / N_LATENCY_TRIALS) * 1000.0


def _measure_memory_kb(estimator: Any, X_sample: np.ndarray) -> float:
    tracemalloc.start()
    estimator.predict(X_sample[:1])
    _, peak = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    return peak / 1024.0


def _model_size_kb(estimator: Any) -> float:
    buf = io.BytesIO()
    pickle.dump(estimator, buf)
    return len(buf.getvalue()) / 1024.0


def _battery_score(latency_ms: float, size_kb: float) -> float:
    """Lower is better. Simple linear proxy: active-compute time dominates,
    cold-load size contributes a smaller weighted term."""
    return latency_ms * 0.8 + (size_kb / 1000.0) * 0.2


def evaluate_model(name: str, estimator: Any, X_test: np.ndarray, y_test: np.ndarray) -> Dict[str, float]:
    y_pred = estimator.predict(X_test)
    try:
        y_proba = estimator.predict_proba(X_test)[:, 1]
    except Exception:
        y_proba = y_pred

    metrics = {
        "accuracy": accuracy_score(y_test, y_pred),
        "precision": precision_score(y_test, y_pred, zero_division=0),
        "recall": recall_score(y_test, y_pred, zero_division=0),
        "f1": f1_score(y_test, y_pred, zero_division=0),
        "roc_auc": roc_auc_score(y_test, y_proba) if len(set(y_test)) > 1 else float("nan"),
        "inference_latency_ms": _measure_single_sample_latency_ms(estimator, X_test),
        "memory_kb": _measure_memory_kb(estimator, X_test),
        "model_size_kb": _model_size_kb(estimator),
    }
    metrics["battery_score"] = _battery_score(metrics["inference_latency_ms"], metrics["model_size_kb"])

    # Confusion matrix plot
    cm = confusion_matrix(y_test, y_pred)
    fig, ax = plt.subplots(figsize=(4, 4))
    im = ax.imshow(cm, cmap="Blues")
    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            ax.text(j, i, str(cm[i, j]), ha="center", va="center",
                    color="white" if cm[i, j] > cm.max() / 2 else "black")
    ax.set_xlabel("Predicted")
    ax.set_ylabel("Actual")
    ax.set_xticks([0, 1]); ax.set_yticks([0, 1])
    ax.set_title(f"Confusion matrix: {name}")
    fig.tight_layout()
    fig.savefig(config.CONFUSION_MATRIX_DIR / f"{name}.png", dpi=150)
    plt.close(fig)

    # ROC curve plot
    if len(set(y_test)) > 1:
        fpr, tpr, _ = roc_curve(y_test, y_proba)
        fig, ax = plt.subplots(figsize=(4, 4))
        ax.plot(fpr, tpr, label=f"AUC={metrics['roc_auc']:.3f}")
        ax.plot([0, 1], [0, 1], "--", color="gray")
        ax.set_xlabel("False Positive Rate")
        ax.set_ylabel("True Positive Rate")
        ax.set_title(f"ROC: {name}")
        ax.legend()
        fig.tight_layout()
        fig.savefig(config.ROC_CURVE_DIR / f"{name}.png", dpi=150)
        plt.close(fig)

    return metrics


def evaluate_all(trained_models: dict, X_test: np.ndarray, y_test: np.ndarray) -> Dict[str, dict]:
    report = {}
    for name, tm in trained_models.items():
        logger.info("Evaluating %s ...", name)
        metrics = evaluate_model(name, tm.estimator, X_test, y_test)
        metrics["train_time_s"] = tm.train_time_s
        metrics["mobile_friendly"] = tm.mobile_friendly
        report[name] = metrics

    with open(config.EVALUATION_REPORT_JSON, "w") as f:
        json.dump(report, f, indent=2, default=float)
    logger.info("Wrote evaluation report to %s", config.EVALUATION_REPORT_JSON)
    return report


LEAVE_ONE_OUT_REPORT_JSON = config.OUTPUTS_DIR / "leave_one_dataset_out_report.json"


def evaluate_leave_one_dataset_out(master_df, model_names: list[str] | None = None) -> Dict[str, dict]:
    """Research report §2/§9: the single most important addition given the
    project's current situation. A random train/test split (batch_holdout_split)
    only tells you whether the model can separate the *sources currently in
    the master dataset* -- it does not tell you whether the model has learned
    a crash/fall-shaped signal that generalizes, versus just learning to tell
    two specific corpora apart.

    For each dataset_source present in master_df: train on every OTHER
    source, test entirely on the held-out one, and report metrics *per held-
    out source*. A held-out source with only one label value (e.g. the
    cyclist data, which is 100% label=0) can't produce precision/recall/F1/
    ROC-AUC in the usual sense -- for those we report the false-positive
    rate instead (fraction of that source's windows the model wrongly
    flagged as a crash/fall), which is exactly the number the report's §9
    "false-positive analysis" asks for.

    This reuses the existing feature-selection/preprocessing/training code
    unchanged -- it's a new evaluation mode, not a new pipeline.
    """
    from app.ml.model_training import build_candidate_models
    from app.ml.preprocessing import fit_preprocessor, get_feature_columns

    sources = sorted(master_df["dataset_source"].unique())
    if len(sources) < 2:
        logger.warning(
            "Leave-one-dataset-out needs at least 2 distinct dataset_source "
            "values; found %s. Add another adapter (see research report §3/§8: "
            "UAH-DriveSet, Smartphone Sensors Road Safety dataset) before this "
            "evaluation mode is meaningful.", sources,
        )
        return {}

    candidates = build_candidate_models()
    if model_names:
        candidates = {k: v for k, v in candidates.items() if k in model_names}

    results: Dict[str, dict] = {}
    for held_out_source in sources:
        train_df = master_df[master_df["dataset_source"] != held_out_source].reset_index(drop=True)
        test_df = master_df[master_df["dataset_source"] == held_out_source].reset_index(drop=True)

        feature_cols = get_feature_columns(train_df)
        preprocessor, X_train = fit_preprocessor(train_df[feature_cols + [config.LABEL_COLUMN]])
        X_test = preprocessor.transform(test_df)
        y_train = train_df[config.LABEL_COLUMN].to_numpy()
        y_test = test_df[config.LABEL_COLUMN].to_numpy()

        if len(set(y_train)) < 2:
            # With only two dataset sources today (smartphone_fall = 100%
            # label 1, cyclist_normal = 100% label 0), holding either one out
            # leaves a single-class training set -- no model can be fit at
            # all, let alone evaluated. This isn't a bug to paper over: it's
            # the concrete, measurable version of the report's §2/§5 finding
            # that a second real dataset source is needed before
            # leave-one-dataset-out becomes meaningful. Record why, don't crash.
            results[held_out_source] = {
                "n_test_windows": int(len(test_df)),
                "test_label_distribution": {str(k): int(v) for k, v in test_df[config.LABEL_COLUMN].value_counts().items()},
                "per_model": {},
                "skipped_reason": (
                    f"Training set (all sources except '{held_out_source}') contains "
                    f"only one label class ({set(y_train)}) -- no model can be fit. "
                    "Add a third dataset_source with mixed labels (e.g. UAH-DriveSet "
                    "or the Smartphone Sensors Road Safety dataset, per report §3/§8) "
                    "for this held-out source to produce a meaningful result."
                ),
            }
            logger.warning("Leave-one-out held-out=%s: SKIPPED (%s)",
                            held_out_source, results[held_out_source]["skipped_reason"])
            continue

        per_model = {}
        for name, model in candidates.items():
            model.fit(X_train, y_train)
            y_pred = model.predict(X_test)

            if len(set(y_test)) > 1:
                metrics = {
                    "accuracy": accuracy_score(y_test, y_pred),
                    "precision": precision_score(y_test, y_pred, zero_division=0),
                    "recall": recall_score(y_test, y_pred, zero_division=0),
                    "f1": f1_score(y_test, y_pred, zero_division=0),
                }
            else:
                # Single-class held-out source (e.g. cyclist_normal is 100%
                # label=0): precision/recall/F1 aren't meaningful the usual
                # way. Report false-positive rate instead -- this is the
                # exact number the report's false-positive-analysis section
                # is asking for.
                only_label = int(y_test[0])
                if only_label == 0:
                    metrics = {"false_positive_rate": float(np.mean(y_pred == 1))}
                else:
                    metrics = {"false_negative_rate": float(np.mean(y_pred == 0))}
            per_model[name] = metrics

        results[held_out_source] = {
            "n_test_windows": int(len(test_df)),
            "test_label_distribution": {str(k): int(v) for k, v in test_df[config.LABEL_COLUMN].value_counts().items()},
            "per_model": per_model,
        }
        logger.info("Leave-one-out held-out=%s: %s", held_out_source, per_model)

    with open(LEAVE_ONE_OUT_REPORT_JSON, "w") as f:
        json.dump(results, f, indent=2, default=float)
    logger.info("Wrote leave-one-dataset-out report to %s", LEAVE_ONE_OUT_REPORT_JSON)
    return results
