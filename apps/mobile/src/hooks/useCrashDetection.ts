/**
 * useCrashDetection Hook
 * =======================
 * React hook wrapping the CrashDetectionService lifecycle.
 * Provides reactive state and start/stop controls.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert, Vibration, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CrashDetectionService, type CrashDetectionState } from '@/services/CrashDetectionService';
import { CrashAlertManager } from '@/services/CrashAlertManager';

interface UseCrashDetectionReturn {
  /** Whether the service is currently active */
  isActive: boolean;
  /** Detailed service status */
  serviceStatus: CrashDetectionState['serviceStatus'];
  /** Last inference timestamp */
  lastInferenceTime: number;
  /** Model confidence from last inference */
  confidenceBaseline: number;
  /** Current error message if any */
  errorMessage?: string;
  /** Whether a crash has been detected and alert is showing */
  crashDetected: boolean;
  /** Crash data if detected */
  crashData: CrashData | null;
  /** Start crash detection */
  startDetection: () => Promise<void>;
  /** Stop crash detection */
  stopDetection: () => Promise<void>;
  /** Dismiss crash alert (user pressed "I'm OK") */
  dismissCrashAlert: () => void;
  /** Confirm SOS (user pressed "Send SOS NOW") */
  confirmSOS: () => Promise<void>;
}

interface CrashData {
  confidence: number;
  latitude?: number;
  longitude?: number;
  sensorFeatures: number[];
  sensorSnapshot: any;
  timestamp: number;
}

export function useCrashDetection(
  apiUrl: string,
  authToken: string,
): UseCrashDetectionReturn {
  const [state, setState] = useState<CrashDetectionState>(CrashDetectionService.state);
  const [crashDetected, setCrashDetected] = useState(false);
  const [crashData, setCrashData] = useState<CrashData | null>(null);
  const autoSOSTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Subscribe to service state changes
  useEffect(() => {
    const unsubscribe = CrashDetectionService.onStateChange((newState) => {
      setState({ ...newState });
    });
    return unsubscribe;
  }, []);

  // Sync offline events on mount if there's a token
  useEffect(() => {
    if (authToken && apiUrl) {
      CrashAlertManager.syncOfflineEvents(apiUrl, authToken);
    }
  }, [apiUrl, authToken]);

  const handleCrashDetected = useCallback((data: {
    confidence: number;
    latitude?: number;
    longitude?: number;
    sensorFeatures: number[];
    sensorSnapshot: any;
  }) => {
    console.log('[useCrashDetection] 🚨 Crash detected! Showing alert...');

    // Vibration pattern: long-short-long (SOS-like)
    if (Platform.OS !== 'web') {
      Vibration.vibrate([0, 1000, 200, 1000, 200, 1000], false);
    }

    const crash: CrashData = {
      ...data,
      timestamp: Date.now(),
    };

    setCrashData(crash);
    setCrashDetected(true);

    // Auto-send SOS after 30 seconds if user doesn't respond
    autoSOSTimer.current = setTimeout(async () => {
      console.log('[useCrashDetection] Auto-sending SOS (30s timeout)...');
      await CrashAlertManager.sendSOS(apiUrl, authToken, data);
      setCrashDetected(false);
      setCrashData(null);
      Alert.alert(
        'SOS Auto-Sent',
        'No response detected. Emergency contacts have been notified with your location.',
      );
    }, 30000);
  }, [apiUrl, authToken]);

  const startDetection = useCallback(async () => {
    try {
      await CrashDetectionService.start(apiUrl, authToken, handleCrashDetected);
    } catch (error: any) {
      Alert.alert(
        'Crash Detection Error',
        error.message || 'Failed to start crash detection service.',
      );
    }
  }, [apiUrl, authToken, handleCrashDetected]);

  const stopDetection = useCallback(async () => {
    await CrashDetectionService.stop();
    setCrashDetected(false);
    setCrashData(null);
    if (autoSOSTimer.current) {
      clearTimeout(autoSOSTimer.current);
      autoSOSTimer.current = null;
    }
  }, []);

  const dismissCrashAlert = useCallback(() => {
    console.log('[useCrashDetection] User dismissed crash alert (I\'m OK)');

    if (autoSOSTimer.current) {
      clearTimeout(autoSOSTimer.current);
      autoSOSTimer.current = null;
    }

    setCrashDetected(false);
    setCrashData(null);

    // Cancel vibration
    if (Platform.OS !== 'web') {
      Vibration.cancel();
    }
  }, []);

  const confirmSOS = useCallback(async () => {
    console.log('[useCrashDetection] User confirmed SOS');

    if (autoSOSTimer.current) {
      clearTimeout(autoSOSTimer.current);
      autoSOSTimer.current = null;
    }

    if (crashData) {
      const result = await CrashAlertManager.sendSOS(apiUrl, authToken, crashData);
      if (result.success) {
        Alert.alert(
          'SOS Sent',
          'Emergency contacts have been notified with your location. Help is on the way.',
        );
      } else {
        Alert.alert(
          'SOS Cached',
          'Could not reach the server. Your SOS has been saved and will be sent as soon as connection is restored.',
        );
      }
    }

    setCrashDetected(false);
    setCrashData(null);

    if (Platform.OS !== 'web') {
      Vibration.cancel();
    }
  }, [crashData, apiUrl, authToken]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoSOSTimer.current) {
        clearTimeout(autoSOSTimer.current);
      }
    };
  }, []);

  return {
    isActive: state.isActive,
    serviceStatus: state.serviceStatus,
    lastInferenceTime: state.lastInferenceTime,
    confidenceBaseline: state.confidenceBaseline,
    errorMessage: state.errorMessage,
    crashDetected,
    crashData,
    startDetection,
    stopDetection,
    dismissCrashAlert,
    confirmSOS,
  };
}
