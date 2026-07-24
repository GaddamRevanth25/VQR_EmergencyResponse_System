"""
train_pipeline.py
==================
End-to-end orchestration: build dataset -> select features -> preprocess ->
train all candidates -> evaluate -> select + export the single winning model.

Run with:  python -m app.ml.train_pipeline
"""
from __future__ import annotations

import logging

from app.ml import config
from app.ml.dataset_loader import build_master_dataset
from app.ml.feature_selection import run_feature_selection
from app.ml.model_evaluation import evaluate_all, evaluate_leave_one_dataset_out
from app.ml.model_selection import export_consensus, export_winner, select_best_model, select_consensus_pool
from app.ml.model_training import train_all
from app.ml.preprocessing import batch_holdout_split, fit_preprocessor

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)


def main(run_leave_one_out: bool = True, run_consensus_export: bool = True):
    logger.info("=== Step 1/6: building master dataset ===")
    master = build_master_dataset()

    logger.info("=== Step 2/6: feature selection ===")
    fs_result = run_feature_selection(master)
    selected_features = fs_result["selected_features"]

    logger.info("=== Step 3/6: preprocessing + split ===")
    train_df, test_df = batch_holdout_split(master)
    preprocessor, X_train = fit_preprocessor(train_df[selected_features + [config.LABEL_COLUMN, "dataset_source"]])
    X_test = preprocessor.transform(test_df)
    y_train = train_df[config.LABEL_COLUMN].to_numpy()
    y_test = test_df[config.LABEL_COLUMN].to_numpy()

    logger.info("=== Step 4/6: training + evaluating all candidates ===")
    trained = train_all(X_train, y_train)
    report = evaluate_all(trained, X_test, y_test)

    logger.info("=== Step 5/6: selecting + exporting the deployed model ===")
    best_name, scores = select_best_model(report)
    export_winner(best_name, trained, preprocessor, preprocessor.feature_columns)

    consensus_bundle_path = None
    if run_consensus_export:
        logger.info("=== Step 5b/6: 2-of-3 consensus pool (research report §2/§6) ===")
        pool = select_consensus_pool(report, k_of_m=(2, 3))
        consensus_bundle_path = export_consensus(
            pool, trained, preprocessor, preprocessor.feature_columns, k=2,
        )

    loo_report = None
    if run_leave_one_out:
        logger.info("=== Step 6/6: leave-one-dataset-out evaluation (research report §2/§9) ===")
        loo_report = evaluate_leave_one_dataset_out(master, model_names=list(config.MOBILE_FRIENDLY_MODELS))

    logger.info("Pipeline complete. Deployed single model: %s. Consensus bundle: %s",
                best_name, consensus_bundle_path)
    return best_name, report, scores, loo_report


if __name__ == "__main__":
    main()
