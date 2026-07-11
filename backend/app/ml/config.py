"""
Configuration for the VQR ML Module
"""

# ==========================
# Sensor Configuration
# ==========================

WINDOW_SIZE = 5              # seconds
SAMPLING_RATE = 50           # Hz
WINDOW_SAMPLES = WINDOW_SIZE * SAMPLING_RATE

# ==========================
# Detection Thresholds
# ==========================

CRASH_THRESHOLD_G = 4.0
CONFIDENCE_THRESHOLD = 0.85

# ==========================
# Communication
# ==========================

MAX_RETRY_COUNT = 5
RETRY_INTERVAL = 30          # seconds

# ==========================
# Model Paths
# ==========================

CRASH_MODEL = "../../ml_models/crash_detector.onnx"
SEVERITY_MODEL = "../../ml_models/severity_classifier.onnx"

# ==========================
# Logging
# ==========================

ENABLE_LOGGING = True