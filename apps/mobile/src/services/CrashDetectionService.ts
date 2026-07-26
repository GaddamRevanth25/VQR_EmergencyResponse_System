/**
 * CrashDetectionService
 * ======================
 * Continuous background crash detection using device sensors.
 *
 * Architecture:
 * - Subscribes to Accelerometer + Gyroscope at high frequency
 * - Maintains a 5-second circular buffer of sensor readings
 * - Every 500ms, computes 22 statistical features from the buffer
 * - Local pre-filter: if accel magnitude < MAGNITUDE_THRESHOLD, skip inference
 * - When magnitude exceeds threshold, sends features to backend for ONNX inference
 * - Debouncing: requires 2 consecutive positive detections to confirm crash
 *
 * Background execution:
 * - Uses expo-task-manager with expo-location background location tracking
 *   to keep the process alive when the app is backgrounded
 * - On Android: creates a foreground service notification
 * - On iOS: uses significant location changes to wake the app
 */

import { Accelerometer, Gyroscope } from 'expo-sensors';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Constants ──────────────────────────────────────────────────────

const BACKGROUND_LOCATION_TASK = 'VQR_CRASH_DETECTION_BG_TASK';

/** Sensor sampling interval in ms (100Hz = 10ms, 50Hz = 20ms) */
const SENSOR_INTERVAL_MS = 20; // 50Hz

/** Size of sliding window in seconds */
const WINDOW_SECONDS = 5;

/** Inference interval in ms */
const INFERENCE_INTERVAL_MS = 500;

/** Accelerometer magnitude threshold to trigger inference (in g-force) */
const MAGNITUDE_THRESHOLD = 3.0;

/** Crash confidence threshold (probability from model) */
const CONFIDENCE_THRESHOLD = 0.85;

/** Number of consecutive positive detections required */
const REQUIRED_CONSECUTIVE_DETECTIONS = 2;

/** Adaptive sampling: variance threshold below which we reduce frequency */
const STATIONARY_VARIANCE_THRESHOLD = 0.01;

/** Reduced sampling interval when stationary (ms) */
const STATIONARY_INTERVAL_MS = 100; // 10Hz when stationary

// ── Types ──────────────────────────────────────────────────────────

interface SensorReading {
  x: number;
  y: number;
  z: number;
  timestamp: number;
}

interface CrashDetectionState {
  isActive: boolean;
  isProcessing: boolean;
  lastInferenceTime: number;
  consecutiveDetections: number;
  serviceStatus: 'idle' | 'starting' | 'running' | 'error' | 'stopped';
  errorMessage?: string;
  confidenceBaseline: number;
  lastLocation: { latitude: number; longitude: number } | null;
}

type CrashCallback = (crashData: {
  confidence: number;
  latitude?: number;
  longitude?: number;
  sensorFeatures: number[];
  sensorSnapshot: { accel: SensorReading[]; gyro: SensorReading[] };
}) => void;

// ── Service Singleton ──────────────────────────────────────────────

class CrashDetectionServiceClass {
  private accelBuffer: SensorReading[] = [];
  private gyroBuffer: SensorReading[] = [];
  private maxBufferSize: number;
  private accelSubscription: any = null;
  private gyroSubscription: any = null;
  private inferenceTimer: ReturnType<typeof setInterval> | null = null;
  private onCrashDetected: CrashCallback | null = null;
  private apiUrl: string = '';
  private authToken: string = '';

  public state: CrashDetectionState = {
    isActive: false,
    isProcessing: false,
    lastInferenceTime: 0,
    consecutiveDetections: 0,
    serviceStatus: 'idle',
    confidenceBaseline: 0,
    lastLocation: null,
  };

  private stateListeners: Set<(state: CrashDetectionState) => void> = new Set();

  constructor() {
    // Calculate buffer size based on sensor frequency and window duration
    this.maxBufferSize = Math.ceil((WINDOW_SECONDS * 1000) / SENSOR_INTERVAL_MS);
  }

  // ── Public API ─────────────────────────────────────────────────

  /**
   * Start crash detection with continuous sensor monitoring.
   */
  async start(
    apiUrl: string,
    authToken: string,
    onCrashDetected: CrashCallback,
  ): Promise<void> {
    if (this.state.isActive) {
      console.log('[CrashDetection] Already active');
      return;
    }

    this.apiUrl = apiUrl;
    this.authToken = authToken;
    this.onCrashDetected = onCrashDetected;

    this.updateState({ serviceStatus: 'starting' });

    try {
      // 1. Request sensor permissions (accelerometer/gyroscope are auto-granted on most devices)
      // 2. Request location permissions for GPS coordinates
      const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
      if (fgStatus !== 'granted') {
        throw new Error('Location permission is required for crash detection.');
      }

      const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
      if (bgStatus !== 'granted') {
        console.warn('[CrashDetection] Background location not granted — crash detection will pause when backgrounded.');
      }

      // 3. Get initial location
      try {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        this.state.lastLocation = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        };
      } catch (e) {
        console.warn('[CrashDetection] Could not get initial location:', e);
      }

      // 4. Start background location tracking (keeps the service alive)
      if (bgStatus === 'granted') {
        await this.startBackgroundLocationTracking();
      }

      // 5. Start sensor subscriptions
      this.startSensorSubscriptions();

      // 6. Start inference loop
      this.startInferenceLoop();

      // 7. Persist state
      await AsyncStorage.setItem('vqr_crash_detection_active', 'true');

      this.updateState({
        isActive: true,
        serviceStatus: 'running',
        consecutiveDetections: 0,
      });

      console.log('[CrashDetection] Service started successfully');
    } catch (error: any) {
      this.updateState({
        serviceStatus: 'error',
        errorMessage: error.message,
      });
      throw error;
    }
  }

  /**
   * Stop crash detection and clean up all subscriptions.
   */
  async stop(): Promise<void> {
    console.log('[CrashDetection] Stopping service...');

    // Stop sensor subscriptions
    this.accelSubscription?.remove();
    this.gyroSubscription?.remove();
    this.accelSubscription = null;
    this.gyroSubscription = null;

    // Stop inference loop
    if (this.inferenceTimer) {
      clearInterval(this.inferenceTimer);
      this.inferenceTimer = null;
    }

    // Stop background location tracking
    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
      if (isRegistered) {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      }
    } catch (e) {
      console.warn('[CrashDetection] Error stopping background location:', e);
    }

    // Clear buffers
    this.accelBuffer = [];
    this.gyroBuffer = [];

    // Persist state
    await AsyncStorage.setItem('vqr_crash_detection_active', 'false');

    this.updateState({
      isActive: false,
      isProcessing: false,
      serviceStatus: 'stopped',
      consecutiveDetections: 0,
    });

    console.log('[CrashDetection] Service stopped');
  }

  private crashCallbacks: Set<CrashCallback> = new Set();

  registerCrashCallback(cb: CrashCallback): () => void {
    this.crashCallbacks.add(cb);
    return () => {
      this.crashCallbacks.delete(cb);
    };
  }

  /**
   * Simulate a vehicle crash event programmatically for testing purposes.
   * Feeds fake high G-force statistical readings into the model's callback pipeline.
   */
  simulateCrash(confidence: number = 0.95): boolean {
    if (!this.state.isActive) {
      console.log('[CrashDetection] Cannot simulate crash – Crash Detection service is currently OFF');
      return false;
    }
    console.log('[CrashDetection] 🚨 Programmatic crash simulation triggered');
    const crashPayload = {
      confidence,
      latitude: this.state.lastLocation?.latitude || 17.5209,
      longitude: this.state.lastLocation?.longitude || 78.5075,
      sensorFeatures: [
        0.1, 0.2, 9.8,  // Accelerometer mean
        0.05, 0.05, 0.1, // Accelerometer std
        0.2, 0.3, 10.0, // Accelerometer max
        0.0, 0.1, 9.6,  // Accelerometer min
        0.0, 0.0, 0.0,  // Gyroscope mean
        0.01, 0.01, 0.01, // Gyroscope std
        0.05, 0.05, 0.05, // Gyroscope max
        5.8             // Accelerometer magnitude (high-g simulation)
      ],
      sensorSnapshot: {
        accel: [],
        gyro: []
      }
    };

    if (this.onCrashDetected) {
      this.onCrashDetected(crashPayload);
    }
    this.crashCallbacks.forEach(cb => cb(crashPayload));
    return true;
  }

  /**
   * Subscribe to state changes.
   */
  onStateChange(listener: (state: CrashDetectionState) => void): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  // ── Private: Sensor Management ─────────────────────────────────

  private startSensorSubscriptions(): void {
    // Configure accelerometer
    Accelerometer.setUpdateInterval(SENSOR_INTERVAL_MS);
    this.accelSubscription = Accelerometer.addListener((data: any) => {
      this.accelBuffer.push({
        x: data.x,
        y: data.y,
        z: data.z,
        timestamp: Date.now(),
      });

      // Trim buffer to window size
      while (this.accelBuffer.length > this.maxBufferSize) {
        this.accelBuffer.shift();
      }
    });

    // Configure gyroscope
    Gyroscope.setUpdateInterval(SENSOR_INTERVAL_MS);
    this.gyroSubscription = Gyroscope.addListener((data: any) => {
      this.gyroBuffer.push({
        x: data.x,
        y: data.y,
        z: data.z,
        timestamp: Date.now(),
      });

      while (this.gyroBuffer.length > this.maxBufferSize) {
        this.gyroBuffer.shift();
      }
    });
  }

  private startInferenceLoop(): void {
    this.inferenceTimer = setInterval(() => {
      this.runInference();
    }, INFERENCE_INTERVAL_MS);
  }

  // ── Private: Inference Pipeline ────────────────────────────────

  private async runInference(): Promise<void> {
    if (this.state.isProcessing) return;
    if (this.accelBuffer.length < 10 || this.gyroBuffer.length < 10) return;

    // Compute the 22 statistical features from the sensor buffer
    const features = this.computeFeatures();
    if (!features) return;

    // Local pre-filter: check accelerometer magnitude
    const accelMagnitude = features[21]; // last feature = accel magnitude
    if (accelMagnitude < MAGNITUDE_THRESHOLD) {
      // Device is not experiencing high acceleration — skip inference

      // Adaptive sampling: reduce sensor frequency when stationary
      const accelVariance = features[3] * features[3] + features[4] * features[4] + features[5] * features[5];
      if (accelVariance < STATIONARY_VARIANCE_THRESHOLD) {
        Accelerometer.setUpdateInterval(STATIONARY_INTERVAL_MS);
        Gyroscope.setUpdateInterval(STATIONARY_INTERVAL_MS);
      } else {
        Accelerometer.setUpdateInterval(SENSOR_INTERVAL_MS);
        Gyroscope.setUpdateInterval(SENSOR_INTERVAL_MS);
      }

      // Reset consecutive detections
      this.state.consecutiveDetections = 0;
      return;
    }

    // Ensure high frequency during potential crash
    Accelerometer.setUpdateInterval(SENSOR_INTERVAL_MS);
    Gyroscope.setUpdateInterval(SENSOR_INTERVAL_MS);

    this.updateState({ isProcessing: true });

    try {
      // Send features to backend for ONNX inference
      const response = await this.callBackendInference(features);

      this.updateState({
        lastInferenceTime: Date.now(),
        confidenceBaseline: response.probability,
      });

      if (response.isCrash && response.probability >= CONFIDENCE_THRESHOLD) {
        this.state.consecutiveDetections++;
        console.log(
          `[CrashDetection] Positive detection #${this.state.consecutiveDetections} ` +
          `(confidence: ${(response.probability * 100).toFixed(1)}%)`
        );

        if (this.state.consecutiveDetections >= REQUIRED_CONSECUTIVE_DETECTIONS) {
          // CRASH CONFIRMED
          console.log('[CrashDetection] 🚨 CRASH CONFIRMED — triggering alert');

          // Get latest location
          try {
            const loc = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.High,
            });
            this.state.lastLocation = {
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
            };
          } catch (e) {
            console.warn('[CrashDetection] Could not refresh location:', e);
          }

          // Notify callback
          this.onCrashDetected?.({
            confidence: response.probability,
            latitude: this.state.lastLocation?.latitude,
            longitude: this.state.lastLocation?.longitude,
            sensorFeatures: features,
            sensorSnapshot: {
              accel: [...this.accelBuffer.slice(-50)],
              gyro: [...this.gyroBuffer.slice(-50)],
            },
          });

          // Reset after triggering
          this.state.consecutiveDetections = 0;
        }
      } else {
        this.state.consecutiveDetections = 0;
      }
    } catch (error: any) {
      console.error('[CrashDetection] Inference error:', error.message);

      // If network fails, do local threshold-based fallback detection
      if (accelMagnitude > 6.0) {
        console.log('[CrashDetection] 🚨 OFFLINE CRASH DETECTED (accel magnitude > 6g)');
        this.state.consecutiveDetections++;

        if (this.state.consecutiveDetections >= REQUIRED_CONSECUTIVE_DETECTIONS) {
          try {
            const loc = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.High,
            });
            this.state.lastLocation = {
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
            };
          } catch (e) { /* ignore */ }

          this.onCrashDetected?.({
            confidence: 0.9, // default offline confidence
            latitude: this.state.lastLocation?.latitude,
            longitude: this.state.lastLocation?.longitude,
            sensorFeatures: features,
            sensorSnapshot: {
              accel: [...this.accelBuffer.slice(-50)],
              gyro: [...this.gyroBuffer.slice(-50)],
            },
          });
          this.state.consecutiveDetections = 0;
        }
      }
    } finally {
      this.updateState({ isProcessing: false });
    }
  }

  // ── Private: Feature Extraction ────────────────────────────────

  /**
   * Compute the 22 statistical features from the sensor buffer:
   * [accel_x_mean, accel_y_mean, accel_z_mean,
   *  accel_x_std, accel_y_std, accel_z_std,
   *  accel_x_max, accel_y_max, accel_z_max,
   *  accel_x_min, accel_y_min, accel_z_min,
   *  gyro_x_mean, gyro_y_mean, gyro_z_mean,
   *  gyro_x_std, gyro_y_std, gyro_z_std,
   *  gyro_x_max, gyro_y_max, gyro_z_max,
   *  accel_magnitude]
   */
  private computeFeatures(): number[] | null {
    const accel = this.accelBuffer;
    const gyro = this.gyroBuffer;

    if (accel.length < 10 || gyro.length < 10) return null;

    const accelX = accel.map(r => r.x);
    const accelY = accel.map(r => r.y);
    const accelZ = accel.map(r => r.z);
    const gyroX = gyro.map(r => r.x);
    const gyroY = gyro.map(r => r.y);
    const gyroZ = gyro.map(r => r.z);

    const mean = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length;
    const std = (arr: number[], m: number) =>
      Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);

    const axMean = mean(accelX);
    const ayMean = mean(accelY);
    const azMean = mean(accelZ);

    const gxMean = mean(gyroX);
    const gyMean = mean(gyroY);
    const gzMean = mean(gyroZ);

    // Compute accelerometer magnitude: sqrt(mean_x² + mean_y² + mean_z²)
    // Using RMS of all samples for more robust magnitude
    const magnitudes = accel.map(r => Math.sqrt(r.x ** 2 + r.y ** 2 + r.z ** 2));
    const accelMagnitude = Math.max(...magnitudes);

    return [
      axMean, ayMean, azMean,                                         // 0-2: accel mean
      std(accelX, axMean), std(accelY, ayMean), std(accelZ, azMean),  // 3-5: accel std
      Math.max(...accelX), Math.max(...accelY), Math.max(...accelZ),  // 6-8: accel max
      Math.min(...accelX), Math.min(...accelY), Math.min(...accelZ),  // 9-11: accel min
      gxMean, gyMean, gzMean,                                         // 12-14: gyro mean
      std(gyroX, gxMean), std(gyroY, gyMean), std(gyroZ, gzMean),    // 15-17: gyro std
      Math.max(...gyroX), Math.max(...gyroY), Math.max(...gyroZ),    // 18-20: gyro max
      accelMagnitude,                                                  // 21: accel magnitude
    ];
  }

  // ── Private: Backend API ───────────────────────────────────────

  private async callBackendInference(features: number[]): Promise<{
    label: number;
    probability: number;
    isCrash: boolean;
  }> {
    const url = `${this.apiUrl}/api/v1/crash/detect`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.authToken}`,
      },
      body: JSON.stringify({ features }),
    });

    if (!response.ok) {
      throw new Error(`Backend inference failed: ${response.status}`);
    }

    return response.json();
  }

  // ── Private: Background Location ───────────────────────────────

  private async startBackgroundLocationTracking(): Promise<void> {
    try {
      await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 10000,        // Update every 10 seconds
        distanceInterval: 10,        // Or every 10 meters
        deferredUpdatesInterval: 10000,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: 'VQR Crash Detection Active',
          notificationBody: 'Monitoring vehicle motion for crash events',
          notificationColor: '#2563eb',
        },
      });
      console.log('[CrashDetection] Background location tracking started');
    } catch (error) {
      console.warn('[CrashDetection] Failed to start background location:', error);
    }
  }

  // ── Private: State Management ──────────────────────────────────

  private updateState(partial: Partial<CrashDetectionState>): void {
    Object.assign(this.state, partial);
    this.stateListeners.forEach(listener => listener({ ...this.state }));
  }
}

// ── Background Task Definition ──────────────────────────────────

TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }: { data: any; error: any }) => {
  if (error) {
    console.error('[CrashDetection] Background task error:', error);
    return;
  }

  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    if (locations && locations.length > 0) {
      const latest = locations[locations.length - 1];
      // Update the service's last known location
      CrashDetectionService.state.lastLocation = {
        latitude: latest.coords.latitude,
        longitude: latest.coords.longitude,
      };
    }
  }
});

// ── Module Export (Singleton) ────────────────────────────────────

export const CrashDetectionService = new CrashDetectionServiceClass();
export type { CrashDetectionState, CrashCallback };
