"""
Crash Detection Service
========================
Server-side ONNX inference for the VQR crash detection model.

Model spec (from inspection):
  Input:  'input'         — float32 [N, 22]
  Output: 'label'         — int64   [N]        (0 = no crash, 1 = crash)
          'probabilities'  — float32 [N, 2]    ([no_crash_prob, crash_prob])
"""

import os
import logging
from typing import List

import numpy as np

logger = logging.getLogger("uvicorn.error")


class CrashDetectionService:
    """Singleton ONNX inference service for vehicle crash detection."""

    _instance = None

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super().__new__(cls, *args, **kwargs)
            cls._instance._session = None
            cls._instance._loaded = False
        return cls._instance

    def _load_model(self):
        """Lazy-load the ONNX model on first inference call."""
        if self._loaded:
            return

        import onnxruntime as ort

        model_path = os.path.join(
            os.path.dirname(os.path.dirname(__file__)),
            "ml_models",
            "vqr_crash_model.onnx",
        )

        if not os.path.exists(model_path):
            logger.error(f"CrashDetectionService: Model not found at {model_path}")
            raise FileNotFoundError(f"ONNX model not found: {model_path}")

        logger.info(f"CrashDetectionService: Loading ONNX model from {model_path}")
        self._session = ort.InferenceSession(
            model_path,
            providers=["CPUExecutionProvider"],
        )
        self._loaded = True
        logger.info("CrashDetectionService: Model loaded successfully.")

    def predict(self, features: List[float]) -> dict:
        """
        Run crash inference on a 22-element sensor feature vector.

        Args:
            features: List of 22 floats — statistical summaries of a sensor window:
                [accel_x_mean, accel_y_mean, accel_z_mean,
                 accel_x_std,  accel_y_std,  accel_z_std,
                 accel_x_max,  accel_y_max,  accel_z_max,
                 accel_x_min,  accel_y_min,  accel_z_min,
                 gyro_x_mean,  gyro_y_mean,  gyro_z_mean,
                 gyro_x_std,   gyro_y_std,   gyro_z_std,
                 gyro_x_max,   gyro_y_max,   gyro_z_max,
                 accel_magnitude]

        Returns:
            dict with keys: label (int), probability (float), is_crash (bool)
        """
        if len(features) != 22:
            raise ValueError(f"Expected 22 features, got {len(features)}")

        self._load_model()

        input_array = np.array([features], dtype=np.float32)  # shape [1, 22]

        results = self._session.run(
            ["label", "probabilities"],
            {"input": input_array},
        )

        label = int(results[0][0])
        probabilities = results[1][0]  # [no_crash_prob, crash_prob]
        crash_probability = float(probabilities[1])

        return {
            "label": label,
            "probability": crash_probability,
            "is_crash": label == 1,
        }


# Module-level singleton
crash_detection_service = CrashDetectionService()
