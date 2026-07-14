import cv2

from services.plate_detector import plate_detector_service
from services.plate_ocr import plate_ocr_service

image = cv2.imread("test_images/image.jpeg")

detections = plate_detector_service.detect(image)

print("Detections:", detections)

for detection in detections:
    x1, y1, x2, y2 = detection["bbox"]

    plate = image[y1:y2, x1:x2]

    text, confidence = plate_ocr_service.read_plate(plate)

    print("--------------------------------")
    print("Plate :", text)
    print("Confidence :", confidence)