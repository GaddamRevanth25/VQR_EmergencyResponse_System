import logging
import cv2

from .plate_detector import plate_detector_service
from .plate_ocr import plate_ocr_service
from .plate_utils import (
    resize_image,
    is_valid_plate
)

logger = logging.getLogger("uvicorn.error")


class PlateOCRService:

    def __init__(self):
        self.detector = plate_detector_service
        self.ocr = plate_ocr_service

    def detect_and_recognize_plate(self, image):

        if image is None:
            logger.warning("Input image is None.")
            return None

        # Resize for faster CPU inference
        image = resize_image(image)

        detections = self.detector.detect(image)

        if len(detections) == 0:
            logger.info("No license plate detected.")
            return None

        logger.info(f"Detected {len(detections)} possible plate(s).")

        best_plate = None
        best_score = 0

        for detection in detections:

            x1, y1, x2, y2 = detection["bbox"]

            confidence = detection["confidence"]
            pad_x = int((x2 - x1) * 0.15)
            pad_y = int((y2 - y1) * 0.25)

            x1 = max(0, x1 - pad_x)
            y1 = max(0, y1 - pad_y)

            x2 = min(image.shape[1], x2 + pad_x)
            y2 = min(image.shape[0], y2 + pad_y)

            plate_crop = image[y1:y2, x1:x2]

            if plate_crop.size == 0:
                continue
            cv2.imwrite("debug_plate.jpg", plate_crop)
            
            text, ocr_confidence = self.ocr.read_plate(
                plate_crop
            )

            if text is None:
                continue

            score = confidence * ocr_confidence

            logger.info(
                f"{text} | Detector={confidence:.2f} | OCR={ocr_confidence:.2f}"
            )

            if score > best_score:
                best_score = score
                best_plate = text

        if best_plate is None:
            logger.info("Plate detected but OCR failed.")
            return None

        if is_valid_plate(best_plate):
            logger.info(f"Valid Plate : {best_plate}")
            return best_plate

        logger.info(
            f"Returning cleaned OCR result : {best_plate}"
        )

        return best_plate


_plate_service = PlateOCRService()


def detect_and_recognize_plate(image):
    """
    This is the function your scan.py already imports.
    """
    return _plate_service.detect_and_recognize_plate(image)