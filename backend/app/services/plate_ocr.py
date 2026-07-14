import logging
import os

# Disable MKLDNN (OneDNN) to prevent runtime crash in CPU inference
os.environ["FLAGS_use_mkldnn"] = "0"

from paddleocr import PaddleOCR

from .plate_utils import (
    preprocess_plate,
    add_padding,
    clean_plate_text
)

logger = logging.getLogger("uvicorn.error")

logger.info("Loading PaddleOCR...")

ocr_reader = PaddleOCR(
    use_angle_cls=False,
    lang="en",
    use_gpu=False,
    show_log=False
)

logger.info("PaddleOCR Loaded.")


class PlateOCR:

    def __init__(self):
        self.reader = ocr_reader

    def read_plate(self, plate_image):

        if plate_image is None:
            return None, 0

        if plate_image.size == 0:
            return None, 0

        plate = add_padding(plate_image)

        plate = preprocess_plate(plate)

        result = self.reader.ocr(
            plate,
            cls=False
        )

        if result is None:
            return None, 0

        if len(result) == 0:
            return None, 0

        best_text = None
        best_confidence = 0

        for line in result:

            if line is None:
                continue

            for item in line:

                text = item[1][0]
                confidence = float(item[1][1])

                cleaned = clean_plate_text(text)

                if cleaned is None:
                    continue

                if confidence > best_confidence:
                    best_confidence = confidence
                    best_text = cleaned

        if best_text is None:
            return None, 0

        logger.info(
            f"OCR Result : {best_text} ({best_confidence:.2f})"
        )

        return best_text, best_confidence


plate_ocr_service = PlateOCR()