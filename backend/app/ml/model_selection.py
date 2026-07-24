"""
model_selection.py
====================
Implements the "choose automatically, deploy only ONE" requirement.

Ranking method
--------------
Each metric is min-max normalized across candidates (so units don't matter),
then combined with config.SELECTION_WEIGHTS:

    score = w_f1 * f1_norm
          + w_latency * (1 - latency_norm)      # lower latency is better
          + w_memory * (1 - memory_norm)        # lower memory is better
          + w_model_size * (1 - size_norm)      # smaller model is better
          + w_mobile_bonus * (1 if in {LR, LightGBM, small XGBoost} else 0)

The mobile bonus operationalizes the brief's explicit preference for
Logistic Regression / LightGBM / small XGBoost as the deployed model,
without hard-forcing the choice if, say, Random Forest were dramatically
more accurate and still cheap enough to run on-device.

The winner is exported to both joblib (for the Python/FastAPI backend) and
ONNX (for fast, dependency-light on-device inference in the mobile app).
"""
from __future__ import annotations

import json
import logging

import joblib
import numpy as np

from app.ml import config

logger = logging.getLogger(__name__)


def _normalize(values: dict) -> dict:
    arr = np.array(list(values.values()), dtype=float)
    lo, hi = arr.min(), arr.max()
    if hi - lo < 1e-12:
        return {k: 0.5 for k in values}
    return {k: (v - lo) / (hi - lo) for k, v in values.items()}


def select_best_model(evaluation_report: dict) -> str:
    w = config.SELECTION_WEIGHTS
    f1 = {k: v["f1"] for k, v in evaluation_report.items()}
    latency = {k: v["inference_latency_ms"] for k, v in evaluation_report.items()}
    memory = {k: v["memory_kb"] for k, v in evaluation_report.items()}
    size = {k: v["model_size_kb"] for k, v in evaluation_report.items()}

    f1_n, lat_n, mem_n, size_n = map(_normalize, (f1, latency, memory, size))

    scores = {}
    for name in evaluation_report:
        mobile_bonus = 1.0 if evaluation_report[name].get("mobile_friendly") else 0.0
        scores[name] = (
            w.f1 * f1_n[name]
            + w.latency * (1 - lat_n[name])
            + w.memory * (1 - mem_n[name])
            + w.model_size * (1 - size_n[name])
            + w.mobile_bonus * mobile_bonus
        )

    ranked_all = sorted(scores.items(), key=lambda kv: kv[1], reverse=True)
    logger.info("Full comparison ranking (best first, all candidates): %s", ranked_all)

    # The brief is explicit: only Logistic Regression / LightGBM / small
    # XGBoost are eligible for on-device DEPLOYMENT. Random Forest, SVM,
    # Decision Tree and the MLP are trained and scored purely for
    # comparison (per "Multiple algorithms may be trained only for
    # comparison... deploy ONLY ONE best lightweight model").
    deployable = [kv for kv in ranked_all if kv[0] in config.MOBILE_FRIENDLY_MODELS]
    if not deployable:
        logger.warning("No mobile-friendly candidate available; falling back to full ranking.")
        deployable = ranked_all

    best_name = deployable[0][0]
    logger.info("SELECTED for deployment (mobile-eligible pool): %s (score=%.4f)", best_name, deployable[0][1])
    return best_name, scores


def select_consensus_pool(evaluation_report: dict, k_of_m: tuple[int, int] = (2, 3)) -> list[str]:
    """Selects the pool of models used for N-of-M voting consensus (research
    report §2/§6: 'a 2-of-3 vote across the three mobile-friendly models').

    Unlike select_best_model (which picks ONE deployable winner), this picks
    every mobile-friendly candidate -- all of them are already trained during
    the normal comparison pass, so this costs nothing extra to compute. The
    k parameter (default 2-of-3) is threaded through to the consensus
    predictor at inference time, not decided here; this function's job is
    just "which models go in the pool."
    """
    k, m = k_of_m
    pool = [name for name in evaluation_report if name in config.MOBILE_FRIENDLY_MODELS]
    if len(pool) < m:
        logger.warning(
            "Requested an %d-of-%d consensus pool but only %d mobile-friendly "
            "models are available (%s); using all of them with k adjusted down.",
            k, m, len(pool), pool,
        )
        m = len(pool)
        k = min(k, m)
    # Rank the pool by the same weighted score used for single-model
    # selection, then keep the top `m` -- this way a 2-of-3 vote is always
    # taken across the *strongest* mobile-friendly candidates, not an
    # arbitrary subset, even if more than 3 mobile-friendly models exist.
    _, scores = select_best_model(evaluation_report)
    ranked_pool = sorted(pool, key=lambda n: scores[n], reverse=True)[:m]
    logger.info("Consensus pool (top %d mobile-friendly by score): %s (k=%d)", m, ranked_pool, k)
    return ranked_pool


def export_consensus(pool_names: list[str], trained_models: dict, preprocessor,
                      feature_columns: list[str], k: int, path=None):
    """Exports the whole consensus pool as one joblib bundle so
    ConsensusPredictorJoblib (predict.py) can load and vote across them.

    Deliberately joblib-only for now: exporting N separate ONNX graphs and
    loading N onnxruntime sessions on-device is a real option (each model is
    already small -- see model_size_kb in evaluation_report.json -- so the
    combined footprint is still mobile-friendly) but wiring that up on the
    Kotlin/Swift/JS side is exactly the kind of platform-specific follow-up
    the project README already flags for the single-model ONNX path, so it's
    left as a documented next step rather than guessed at here.
    """
    import json
    bundle = {
        "pool_names": pool_names,
        "k": k,
        "m": len(pool_names),
        "models": {name: trained_models[name].estimator for name in pool_names},
        "preprocessor": preprocessor,
        "feature_columns": feature_columns,
    }
    out_path = path or (config.MODELS_DIR / "vqr_crash_consensus.joblib")
    joblib.dump(bundle, out_path)
    logger.info("Saved %d-of-%d consensus bundle (%s) to %s", k, len(pool_names), pool_names, out_path)

    meta_path = config.MODELS_DIR / "vqr_crash_consensus_meta.json"
    with open(meta_path, "w") as f:
        json.dump({
            "pool_names": pool_names, "k": k, "m": len(pool_names),
            "feature_columns": feature_columns,
        }, f, indent=2)
    return out_path


def export_winner(name: str, trained_models: dict, preprocessor, feature_columns: list[str]):
    estimator = trained_models[name].estimator

    joblib.dump({
        "model": estimator,
        "preprocessor": preprocessor,
        "feature_columns": feature_columns,
        "model_name": name,
    }, config.FINAL_MODEL_JOBLIB)
    logger.info("Saved joblib bundle: %s", config.FINAL_MODEL_JOBLIB)

    meta = {
        "model_name": name,
        "feature_columns": feature_columns,
        "n_features": len(feature_columns),
    }
    with open(config.FINAL_MODEL_META, "w") as f:
        json.dump(meta, f, indent=2)

    # ONNX export for lightweight on-device inference (no sklearn/joblib
    # runtime needed in the mobile app -- just onnxruntime). skl2onnx has no
    # native converter for LightGBM/XGBoost boosters, so those go through
    # onnxmltools instead; plain sklearn estimators use skl2onnx directly.
    n_features = len(feature_columns)
    try:
        if name == "lightgbm":
            from onnxmltools import convert_lightgbm
            from onnxmltools.convert.common.data_types import FloatTensorType
            onnx_model = convert_lightgbm(estimator, initial_types=[("input", FloatTensorType([None, n_features]))])
        elif name == "xgboost_small":
            from onnxmltools import convert_xgboost
            from onnxmltools.convert.common.data_types import FloatTensorType
            onnx_model = convert_xgboost(estimator, initial_types=[("input", FloatTensorType([None, n_features]))])
        else:
            from skl2onnx import to_onnx
            onnx_model = to_onnx(estimator, np.zeros((1, n_features), dtype=np.float32))
        with open(config.FINAL_MODEL_ONNX, "wb") as f:
            f.write(onnx_model.SerializeToString())
        logger.info("Saved ONNX model: %s", config.FINAL_MODEL_ONNX)
    except Exception as exc:  # noqa: BLE001
        logger.warning("ONNX export failed for %s (%s); joblib bundle is still usable "
                        "from the FastAPI backend.", name, exc)
