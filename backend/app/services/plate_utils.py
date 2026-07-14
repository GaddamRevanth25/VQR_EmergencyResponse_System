import cv2
import re
import numpy as np

# --------------------------------------------------------
# Indian Vehicle Registration Pattern
# Examples:
# TS09AB1234
# AP31X5678
# MH12DE1433
# --------------------------------------------------------

INDIAN_PLATE_REGEX = re.compile(
    r"^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{3,4}$"
)


# --------------------------------------------------------
# Resize image while preserving aspect ratio
# --------------------------------------------------------

def resize_image(image, max_side=960):
    """
    Resize image to speed up YOLO inference.
    Does nothing if image is already smaller.
    """

    h, w = image.shape[:2]

    longest = max(h, w)

    if longest <= max_side:
        return image

    scale = max_side / longest

    new_w = int(w * scale)
    new_h = int(h * scale)

    resized = cv2.resize(
        image,
        (new_w, new_h),
        interpolation=cv2.INTER_AREA
    )

    return resized


# --------------------------------------------------------
# Add padding around cropped plate
# --------------------------------------------------------

def add_padding(image, percent=0.08):
    """
    Adds white padding around the cropped plate.
    Helps OCR accuracy.
    """

    h, w = image.shape[:2]

    pad_x = int(w * percent)
    pad_y = int(h * percent)

    return cv2.copyMakeBorder(
        image,
        pad_y,
        pad_y,
        pad_x,
        pad_x,
        cv2.BORDER_CONSTANT,
        value=(255, 255, 255)
    )


# --------------------------------------------------------
# OCR preprocessing
# --------------------------------------------------------

def preprocess_plate(image):

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    h, w = gray.shape

    TARGET_WIDTH = 800

    if w < TARGET_WIDTH:
        scale = TARGET_WIDTH / w

        gray = cv2.resize(
            gray,
            None,
            fx=scale,
            fy=scale,
            interpolation=cv2.INTER_CUBIC
        )

    gray = cv2.GaussianBlur(gray, (3,3), 0)

    gray = cv2.threshold(
        gray,
        0,
        255,
        cv2.THRESH_BINARY + cv2.THRESH_OTSU
    )[1]

    return gray


# --------------------------------------------------------
# Clean OCR output
# --------------------------------------------------------

def clean_plate_text(text):
    """
    Remove unwanted characters from OCR output.
    """

    if text is None:
        return None

    text = text.upper()

    text = re.sub(r"[^A-Z0-9]", "", text)

    text = text.replace(" ", "")

    # Common OCR mistakes
    # text = text.replace("O", "0")
    # text = text.replace("I", "1")

    if len(text) < 6:
        return None

    return text


# --------------------------------------------------------
# Validate registration number
# --------------------------------------------------------

def is_valid_plate(text):

    if text is None:
        return False

    return bool(INDIAN_PLATE_REGEX.match(text))