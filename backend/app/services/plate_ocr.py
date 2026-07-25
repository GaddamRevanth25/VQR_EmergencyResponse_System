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


class PlateOCR:

    def __init__(self):
        self._reader = None

    @property
    def reader(self):
        if self._reader is None:
            logger.info("Loading PaddleOCR...")
            from paddleocr import PaddleOCR
            self._reader = PaddleOCR(lang="en", device="cpu", show_log=False)
            logger.info("PaddleOCR Loaded.")
        return self._reader

    def read_plate(self, plate_image):

        if plate_image is None:
            return None, 0

        if plate_image.size == 0:
            return None, 0

        plate = add_padding(plate_image)

        # plate = preprocess_plate(plate)

        result = self.reader.ocr(
            plate,
            cls=False
        )

        if result is None:
            return None, 0

        if len(result) == 0:
            return None, 0

        print("\nRAW OCR RESULT:")
        print(result)

        texts = []
        confidences = []

        for line in result:

            if line is None:
                continue

            for item in line:

                text = item[1][0]
                confidence = float(item[1][1])

                texts.append(text)
                confidences.append(confidence)

        if not texts:
            return None, 0

        # Join all OCR fragments
        combined_text = "".join(texts)

        print("Combined OCR :", combined_text)

        cleaned = clean_plate_text(combined_text)

        if cleaned is None:
            return None, 0

        average_confidence = sum(confidences) / len(confidences)

        logger.info(
            f"OCR Result : {cleaned} ({average_confidence:.2f})"
        )

        return cleaned, average_confidence


plate_ocr_service = PlateOCR()