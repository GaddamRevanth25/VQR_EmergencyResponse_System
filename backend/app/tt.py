from ultralytics import YOLO

model = YOLO(r"D:\VQR\VQR_EmergencyResponse_System\backend\app\ml_models\license_plate_detector.pt")

print("Task:", model.task)
print("Classes:", model.names)