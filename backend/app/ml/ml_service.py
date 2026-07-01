import os
import time
import logging
from typing import Optional, List

logger = logging.getLogger("uvicorn.error")

class MLService:
    _instance = None

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(MLService, cls).__new__(cls, *args, **kwargs)
            cls._instance._model_loaded = False
            cls._instance._model = None
        return cls._instance

    def load_model(self):
        if self._model_loaded:
            return

        logger.info("MLService: Lazy loading model weights on first scan call...")

        # Locate weights directory
        weights_dir = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
            "ml_models"
        )
        os.makedirs(weights_dir, exist_ok=True)

        # Simulate loading latency
        time.sleep(0.8)

        self._model = "MOCK_ONNX_MODEL_SESSION_LOADED"
        self._model_loaded = True
        logger.info("MLService: Model weights loaded successfully.")

    def predict_vehicle(self, image_bytes: Optional[bytes] = None) -> dict:
        """
        Isolated vehicle prediction engine.
        Ensures lazy loading of model weights is triggered upon invocation.
        """
        self.load_model()

        # Swappable live/mock prediction interface:
        # Returns simulated predictions for scanning/classification flow
        return {
            "predicted_class": "toyota-camry-2024",
            "confidence": 0.945,
            "bounding_box": [45.0, 60.0, 420.0, 380.0]
        }

ml_service = MLService()
