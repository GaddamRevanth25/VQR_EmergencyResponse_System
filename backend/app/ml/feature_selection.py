"""
feature_selection.py
=====================
Runs the full automatic feature-selection battery requested:
    1. Variance threshold
    2. Correlation analysis (drop one of any pair with |r| > CORR_THRESHOLD)
    3. Mutual information with the label
    4. Random Forest feature importance
    5. Recursive Feature Elimination (RFE)
    6. Permutation importance

Produces:
    outputs/feature_importance.csv
    outputs/feature_correlation.png
    outputs/selected_features.json
    outputs/selected_features.csv (the reduced dataset)

A feature is kept in the final selection if it survives the variance +
correlation pruning AND ranks in the top-K by a combined importance score
(mean of normalized RF importance, MI, and permutation importance).
"""
from __future__ import annotations

import json
import logging

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.feature_selection import (
    VarianceThreshold, mutual_info_classif, RFE,
)
from sklearn.inspection import permutation_importance
from sklearn.impute import SimpleImputer

from app.ml import config
from app.ml.preprocessing import get_feature_columns, load_master_dataset

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)

VARIANCE_THRESHOLD = 1e-4
CORR_THRESHOLD = 0.95
TOP_K = 20


def run_feature_selection(df: pd.DataFrame | None = None) -> dict:
    df = df if df is not None else load_master_dataset()
    feature_cols = get_feature_columns(df)
    X_raw = df.reindex(columns=feature_cols)
    y = df[config.LABEL_COLUMN].to_numpy()

    imputer = SimpleImputer(strategy="median", keep_empty_features=True)
    X_imp = imputer.fit_transform(X_raw)
    X_df = pd.DataFrame(X_imp, columns=feature_cols)

    # 1. Variance threshold -------------------------------------------------
    vt = VarianceThreshold(threshold=VARIANCE_THRESHOLD)
    vt.fit(X_df)
    kept_after_variance = list(np.array(feature_cols)[vt.get_support()])
    logger.info("Variance threshold kept %d/%d features", len(kept_after_variance), len(feature_cols))

    # 2. Correlation analysis -------------------------------------------------
    corr = X_df[kept_after_variance].corr().abs()
    fig, ax = plt.subplots(figsize=(12, 10))
    im = ax.imshow(corr, cmap="coolwarm", vmin=-1, vmax=1)
    ax.set_xticks(range(len(kept_after_variance)))
    ax.set_yticks(range(len(kept_after_variance)))
    ax.set_xticklabels(kept_after_variance, rotation=90, fontsize=6)
    ax.set_yticklabels(kept_after_variance, fontsize=6)
    fig.colorbar(im, ax=ax, shrink=0.8)
    ax.set_title("Feature correlation matrix")
    fig.tight_layout()
    fig.savefig(config.FEATURE_CORRELATION_PNG, dpi=150)
    plt.close(fig)

    to_drop = set()
    cols = kept_after_variance
    for i in range(len(cols)):
        for j in range(i + 1, len(cols)):
            if cols[j] in to_drop or cols[i] in to_drop:
                continue
            if corr.iloc[i, j] > CORR_THRESHOLD:
                to_drop.add(cols[j])
    kept_after_corr = [c for c in kept_after_variance if c not in to_drop]
    logger.info("Correlation pruning dropped %d redundant features", len(to_drop))

    X_pruned = X_df[kept_after_corr]

    # 3. Mutual information ---------------------------------------------------
    mi = mutual_info_classif(X_pruned, y, random_state=config.RANDOM_STATE)
    mi_scores = dict(zip(kept_after_corr, mi))

    # 4. Random Forest importance ---------------------------------------------
    rf = RandomForestClassifier(n_estimators=200, random_state=config.RANDOM_STATE, n_jobs=-1)
    rf.fit(X_pruned, y)
    rf_scores = dict(zip(kept_after_corr, rf.feature_importances_))

    # 5. Recursive Feature Elimination -----------------------------------------
    n_rfe = min(TOP_K, len(kept_after_corr))
    rfe = RFE(
        estimator=RandomForestClassifier(n_estimators=100, random_state=config.RANDOM_STATE, n_jobs=-1),
        n_features_to_select=n_rfe,
    )
    rfe.fit(X_pruned, y)
    rfe_selected = set(np.array(kept_after_corr)[rfe.get_support()])

    # 6. Permutation importance -------------------------------------------------
    perm = permutation_importance(rf, X_pruned, y, n_repeats=10, random_state=config.RANDOM_STATE, n_jobs=-1)
    perm_scores = dict(zip(kept_after_corr, perm.importances_mean))

    # Combine into one report --------------------------------------------------
    def _norm(d: dict) -> dict:
        vals = np.array(list(d.values()), dtype=float)
        vals = np.clip(vals, 0, None)
        rng = vals.max() - vals.min()
        if rng < 1e-12:
            return {k: 0.0 for k in d}
        return {k: (v - vals.min()) / rng for k, v in d.items()}

    mi_n, rf_n, perm_n = _norm(mi_scores), _norm(rf_scores), _norm(perm_scores)
    combined = {
        c: float(np.mean([mi_n[c], rf_n[c], perm_n[c]]))
        for c in kept_after_corr
    }

    report = pd.DataFrame({
        "feature": kept_after_corr,
        "mutual_information": [mi_scores[c] for c in kept_after_corr],
        "rf_importance": [rf_scores[c] for c in kept_after_corr],
        "permutation_importance": [perm_scores[c] for c in kept_after_corr],
        "in_rfe_top_k": [c in rfe_selected for c in kept_after_corr],
        "combined_score": [combined[c] for c in kept_after_corr],
    }).sort_values("combined_score", ascending=False).reset_index(drop=True)

    report.to_csv(config.FEATURE_IMPORTANCE_CSV, index=False)

    final_selection = report.head(min(TOP_K, len(report))).feature.tolist()
    # Always keep sensor-availability flags regardless of score -- they are
    # structural, not merely statistical, signals for missing-sensor handling.
    for flag in ["has_accel", "has_gyro", "has_gps", "has_magnetometer"]:
        if flag in feature_cols and flag not in final_selection:
            final_selection.append(flag)

    with open(config.SELECTED_FEATURES_JSON, "w") as f:
        json.dump({"selected_features": final_selection}, f, indent=2)

    selected_df = df[["window_id"] + final_selection + [config.LABEL_COLUMN, "dataset_source"]]
    selected_df.to_csv(config.SELECTED_FEATURES_CSV, index=False)

    logger.info("Final selected features (%d): %s", len(final_selection), final_selection)
    return {"selected_features": final_selection, "report": report}


if __name__ == "__main__":
    run_feature_selection()
