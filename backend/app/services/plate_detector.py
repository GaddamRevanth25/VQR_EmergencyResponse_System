import os
import cv2
import torch
import logging

from ultralytics import YOLO

logger = logging.getLogger("uvicorn.error")

# -------------------------------------------------------
# CPU Optimizations
# -------------------------------------------------------

torch.set_num_threads(os.cpu_count())

cv2.setUseOptimized(True)
cv2.setNumThreads(0)

# -------------------------------------------------------
# Locate YOLO model
# -------------------------------------------------------

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

MODEL_PATH = os.path.join(
    BASE_DIR,
    "ml_models",
    "license_plate_detector.pt"
)

if not os.path.exists(MODEL_PATH):
    raise FileNotFoundError(
        f"YOLO model not found:\n{MODEL_PATH}"
    )

logger.info("Loading License Plate Detector...")

plate_detector = YOLO(MODEL_PATH)

logger.info("License Plate Detector Loaded.")


class PlateDetector:

    def __init__(self):
        self.model = plate_detector

    def detect(self, image):

        results = self.model.predict(
            source=image,
            imgsz=640,
            conf=0.45,
            iou=0.45,
            device="cpu",
            verbose=False
        )

        detections = []

        if not results:
            return detections

        result = results[0]

        if result.boxes is None:
            return detections

        for box in result.boxes:

            x1, y1, x2, y2 = map(
                int,
                box.xyxy[0]
            )

            confidence = float(box.conf[0])

            detections.append({
                "bbox": (
                    x1,
                    y1,
                    x2,
                    y2
                ),
                "confidence": confidence
            })

        detections.sort(
            key=lambda x: x["confidence"],
            reverse=True
        )

        return detections


plate_detector_service = PlateDetector()