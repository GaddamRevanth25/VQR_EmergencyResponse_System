# VQR Emergency Response System

## Machine Learning Module Architecture

Version: 1.0

---

# Objective

Develop a lightweight crash detection and severity classification system that operates both online and offline while supporting missing sensors and minimizing false positives.

---

# ML Pipeline

Sensor Collection
↓

Sensor Validation
↓

Feature Engineering
↓

Crash Detection
↓

Severity Classification
↓

Decision Engine
↓

Communication Manager
↓

Backend API

---

# Components

## Sensor Manager

Responsible for collecting sensor data.

Inputs

- Accelerometer
- Gyroscope (Optional)
- GPS (Optional)
- Vehicle Speed
- Timestamp

---

## Validation Layer

Checks

- Missing sensors
- Invalid values
- Duplicate timestamps
- Sampling rate
- Noise

---

## Feature Engineering

Generates

- Mean
- Standard Deviation
- Maximum
- Minimum
- RMS
- Peak G
- Jerk
- Energy
- Speed Drop

---

## Crash Detection

Detects

Crash

or

No Crash

---

## Severity Classification

Outputs

- Low
- Medium
- High
- Critical

---

## Decision Engine

Determines

- False Positive
- Countdown
- Dispatch Required
- Offline Queue
- Retry

---

## Communication Layer

Supports

Internet

SMS

Offline Queue

Retry

---

## Future Work

Image Damage Assessment

Vehicle Telemetry

OBD-II Integration

Satellite Messaging