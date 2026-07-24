"""
model_training.py
==================
Trains every candidate algorithm requested for comparison:
    Logistic Regression, Decision Tree, Random Forest, SVM, LightGBM,
    XGBoost, and a small MLP.

Only ONE of these gets deployed (see model_selection.py) -- this module's
job is purely to produce comparable, fairly-trained candidates.
"""
from __future__ import annotations

import logging
import time
from dataclasses import dataclass
from typing import Any, Dict

import numpy as np
from lightgbm import LGBMClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.neural_network import MLPClassifier
from sklearn.svm import SVC
from sklearn.tree import DecisionTreeClassifier
from xgboost import XGBClassifier

from app.ml import config

logger = logging.getLogger(__name__)


@dataclass
class TrainedModel:
    name: str
    estimator: Any
    train_time_s: float
    mobile_friendly: bool


def build_candidate_models() -> Dict[str, Any]:
    """Each estimator is deliberately kept small/regularized -- this is a
    mobile crash-detection model, not a Kaggle leaderboard entry. Depth and
    tree counts are capped so the eventual winner is realistically small
    enough to ship on-device."""
    return {
        "logistic_regression": LogisticRegression(
            max_iter=2000, C=1.0, class_weight="balanced", random_state=config.RANDOM_STATE,
        ),
        "decision_tree": DecisionTreeClassifier(
            max_depth=6, class_weight="balanced", random_state=config.RANDOM_STATE,
        ),
        "random_forest": RandomForestClassifier(
            n_estimators=100, max_depth=8, class_weight="balanced",
            random_state=config.RANDOM_STATE, n_jobs=-1,
        ),
        "svm": SVC(
            kernel="rbf", C=1.0, class_weight="balanced", probability=True,
            random_state=config.RANDOM_STATE,
        ),
        "lightgbm": LGBMClassifier(
            n_estimators=150, max_depth=6, num_leaves=31, learning_rate=0.1,
            class_weight="balanced", random_state=config.RANDOM_STATE, verbosity=-1,
        ),
        "xgboost_small": XGBClassifier(
            n_estimators=100, max_depth=4, learning_rate=0.1,
            eval_metric="logloss", random_state=config.RANDOM_STATE,
            n_jobs=-1, verbosity=0,
        ),
        "small_mlp": MLPClassifier(
            hidden_layer_sizes=(16, 8), max_iter=500, random_state=config.RANDOM_STATE,
        ),
    }


def train_all(X_train: np.ndarray, y_train: np.ndarray) -> Dict[str, TrainedModel]:
    trained = {}
    for name, model in build_candidate_models().items():
        t0 = time.perf_counter()
        model.fit(X_train, y_train)
        elapsed = time.perf_counter() - t0
        trained[name] = TrainedModel(
            name=name,
            estimator=model,
            train_time_s=elapsed,
            mobile_friendly=name in config.MOBILE_FRIENDLY_MODELS,
        )
        logger.info("Trained %-20s in %.2fs", name, elapsed)
    return trained
