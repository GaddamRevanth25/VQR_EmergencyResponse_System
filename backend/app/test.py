import cv2

from services.plate_ocr import plate_ocr_service

# Change this path to your cropped plate image
plate = cv2.imread("test_images/image.jpeg")

text, confidence = plate_ocr_service.read_plate(plate)

print("OCR :", text)
print("Confidence :", confidence)