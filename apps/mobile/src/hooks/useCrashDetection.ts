/**
 * useCrashDetection Hook
 * =======================
 * React hook wrapping the CrashDetectionService lifecycle.
 * Provides reactive state and start/stop controls.
 */



import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert, Vibration, Platform, AppState, type AppStateStatus } from 'react-native';
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
  /** Visual countdown value remaining */
  countdown: number;
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
  const [countdown, setCountdown] = useState(30);

  const autoSOSTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const appState = useRef(AppState.currentState);

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

  const clearTimers = useCallback(() => {
    if (autoSOSTimer.current) {
      clearTimeout(autoSOSTimer.current);
      autoSOSTimer.current = null;
    }
    if (countdownInterval.current) {
      clearInterval(countdownInterval.current);
      countdownInterval.current = null;
    }
  }, []);

  const startCountdown = useCallback((startValue: number) => {
    setCountdown(startValue);
    if (countdownInterval.current) {
      clearInterval(countdownInterval.current);
    }
    countdownInterval.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          if (countdownInterval.current) {
            clearInterval(countdownInterval.current);
            countdownInterval.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const handleCrashDetected = useCallback(async (data: {
    confidence: number;
    latitude?: number;
    longitude?: number;
    sensorFeatures: number[];
    sensorSnapshot: any;
  }) => {
    console.log("======================================================================");
    console.log("🚨🚨🚨 VQR CRASH DETECTION PIPELINE ACTIVE 🚨🚨🚨");
    console.log("======================================================================");
    console.log(`- Alert Timestamp: ${new Date().toLocaleTimeString()}`);
    console.log(`- Model Confidence: ${(data.confidence * 100).toFixed(1)}%`);
    console.log(`- GPS Latitude: ${data.latitude || 'Unavailable'}`);
    console.log(`- GPS Longitude: ${data.longitude || 'Unavailable'}`);
    console.log(`- Statistical Features Matrix (22 items):`, JSON.stringify(data.sensorFeatures));
    console.log("----------------------------------------------------------------------");
    console.log("ACTIONS UNDERTAKEN:");
    console.log("• Stopped background hardware sensor polling");
    console.log("• Initiated SOS vibration motor feedback pattern");
    console.log("• Saved pending crash context state to AsyncStorage for recovery");
    console.log("• Rendered full-screen overlays with 30s confirmation countdown");
    console.log("======================================================================");

    clearTimers();

    // 1. Immediately pause sensor subscriptions to prevent overlapping notifications
    try {
      await CrashDetectionService.stop();
    } catch (e) {
      console.warn('[useCrashDetection] Error pausing crash service:', e);
    }

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
    startCountdown(30);

    // 2. Persist state for app termination / background resume protection
    try {
      await AsyncStorage.setItem('@vqr_pending_crash_timestamp', Date.now().toString());
      await AsyncStorage.setItem('@vqr_pending_crash_data', JSON.stringify(crash));
    } catch (e) {
      console.warn('[useCrashDetection] Failed to persist pending crash state:', e);
    }

    // 3. Auto-send SOS after 30 seconds if user doesn't respond
    autoSOSTimer.current = setTimeout(async () => {
      console.log("======================================================================");
      console.log("🚨🚨🚨 CRASH CONFIRMATION TIMEOUT EXPIRED (30s) 🚨🚨🚨");
      console.log("======================================================================");
      console.log("• Auto-dispatching emergency alert payload to VQR API Gateway...");
      console.log("======================================================================");
      clearTimers();
      
      try {
        await AsyncStorage.removeItem('@vqr_pending_crash_timestamp');
        await AsyncStorage.removeItem('@vqr_pending_crash_data');
      } catch (e) {}

      const res = await CrashAlertManager.sendSOS(apiUrl, authToken, crash);
      setCrashDetected(false);
      setCrashData(null);

      // Resume crash detection service
      try {
        await CrashDetectionService.start(apiUrl, authToken, handleCrashDetected);
      } catch (e) {
        console.error('[useCrashDetection] Failed to restart crash detection service:', e);
      }

      if (res.success) {
        const contactMsg = res.contactName ? `Alert sent to emergency services and your contact, ${res.contactName} (${res.contactPhone || ''}).` : 'No response detected. Emergency contacts have been notified with your location.';
        Alert.alert(
          'SOS Dispatch Alerted',
          res.message || contactMsg,
        );
      } else {
        Alert.alert(
          'SOS Cached',
          'Could not reach the server. Your SOS alert has been saved offline and will be dispatched as soon as connection is restored.',
        );
      }
    }, 30000);
  }, [apiUrl, authToken, clearTimers, startCountdown]);

  // Register crash callback on mount so simulated or sensor crash events always trigger UI
  useEffect(() => {
    const unregister = CrashDetectionService.registerCrashCallback((data: any) => {
      handleCrashDetected(data);
    });
    return unregister;
  }, [handleCrashDetected]);

  const checkPendingCrashState = useCallback(async () => {
    try {
      const storedTimeStr = await AsyncStorage.getItem('@vqr_pending_crash_timestamp');
      if (!storedTimeStr) return;

      const storedTime = parseInt(storedTimeStr, 10);
      const elapsed = Date.now() - storedTime;
      const elapsedSeconds = Math.floor(elapsed / 1000);

      // Load payload
      const cachedDataRaw = await AsyncStorage.getItem('@vqr_pending_crash_data');
      const data = cachedDataRaw ? JSON.parse(cachedDataRaw) : crashData;

      if (elapsedSeconds >= 30) {
        console.log(`[useCrashDetection] Auto-trigger timeout exceeded in background (${elapsedSeconds}s). Dispatched SOS automatically.`);
        clearTimers();
        await AsyncStorage.removeItem('@vqr_pending_crash_timestamp');
        await AsyncStorage.removeItem('@vqr_pending_crash_data');
        
        if (data) {
          await CrashAlertManager.sendSOS(apiUrl, authToken, data);
        }
        setCrashDetected(false);
        setCrashData(null);

        // Resume service
        try {
          await CrashDetectionService.start(apiUrl, authToken, handleCrashDetected);
        } catch (e) {}

        Alert.alert(
          'SOS Auto-Sent',
          'No response detected. Emergency contacts have been notified with your location.',
        );
      } else {
        const remainingSeconds = 30 - elapsedSeconds;
        console.log(`[useCrashDetection] Resuming countdown with ${remainingSeconds}s remaining.`);
        
        clearTimers();
        startCountdown(remainingSeconds);

        autoSOSTimer.current = setTimeout(async () => {
          console.log('[useCrashDetection] Auto-sending SOS (remaining timeout)...');
          clearTimers();
          await AsyncStorage.removeItem('@vqr_pending_crash_timestamp');
          await AsyncStorage.removeItem('@vqr_pending_crash_data');
          
          if (data) {
            await CrashAlertManager.sendSOS(apiUrl, authToken, data);
          }
          setCrashDetected(false);
          setCrashData(null);

          try {
            await CrashDetectionService.start(apiUrl, authToken, handleCrashDetected);
          } catch (e) {}

          Alert.alert(
            'SOS Auto-Sent',
            'No response detected. Emergency contacts have been notified with your location.',
          );
        }, remainingSeconds * 1000);
      }
    } catch (e) {
      console.warn('[useCrashDetection] Failed to check pending crash state:', e);
    }
  }, [apiUrl, authToken, crashData, clearTimers, startCountdown, handleCrashDetected]);

  // AppState listener to handle backgrounding countdown recovery
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        console.log('[useCrashDetection] App active: checking for pending crash timers...');
        await checkPendingCrashState();
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [checkPendingCrashState]);

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
    clearTimers();
    try {
      await AsyncStorage.removeItem('@vqr_pending_crash_timestamp');
      await AsyncStorage.removeItem('@vqr_pending_crash_data');
    } catch (e) {}
  }, [clearTimers]);

  const dismissCrashAlert = useCallback(async () => {
    console.log("======================================================================");
    console.log("✓✓✓ CRASH ALERT CANCELLED BY USER ('I'M OK') ✓✓✓");
    console.log("======================================================================");
    console.log("• Removed pending crash details from AsyncStorage");
    console.log("• Silenced emergency vibration feedback");
    console.log("• Resumed background accelerometer and gyroscope model polling loop");
    console.log("======================================================================");

    clearTimers();
    try {
      await AsyncStorage.removeItem('@vqr_pending_crash_timestamp');
      await AsyncStorage.removeItem('@vqr_pending_crash_data');
    } catch (e) {}

    setCrashDetected(false);
    setCrashData(null);

    // Cancel vibration
    if (Platform.OS !== 'web') {
      Vibration.cancel();
    }

    // Resume crash detection service
    try {
      await CrashDetectionService.start(apiUrl, authToken, handleCrashDetected);
    } catch (error: any) {
      console.error('[useCrashDetection] Failed to resume crash detection service:', error);
    }
  }, [apiUrl, authToken, handleCrashDetected, clearTimers]);

  const confirmSOS = useCallback(async () => {
    console.log("======================================================================");
    console.log("🆘🆘🆘 SOS DISPATCH FORCE-TRIGGERED BY USER 🆘🆘🆘");
    console.log("======================================================================");
    console.log("• Bypassing remaining countdown duration");
    console.log("• Dispatching immediate emergency payload to VQR API Gateway...");
    console.log("======================================================================");

    clearTimers();
    try {
      await AsyncStorage.removeItem('@vqr_pending_crash_timestamp');
      await AsyncStorage.removeItem('@vqr_pending_crash_data');
    } catch (e) {}

    if (crashData) {
      const result = await CrashAlertManager.sendSOS(apiUrl, authToken, crashData);
      if (result.success) {
        const contactMsg = result.contactName ? `Alert sent to emergency services and your contact, ${result.contactName} (${result.contactPhone || ''}).` : 'Emergency contacts have been notified with your location. Help is on the way.';
        Alert.alert(
          'SOS Dispatch Alerted',
          result.message || contactMsg,
        );
      } else {
        Alert.alert(
          'SOS Cached',
          'Could not reach the server. Your SOS alert has been saved offline and will be dispatched as soon as connection is restored.',
        );
      }
    }

    setCrashDetected(false);
    setCrashData(null);

    if (Platform.OS !== 'web') {
      Vibration.cancel();
    }

    // Resume crash detection service
    try {
      await CrashDetectionService.start(apiUrl, authToken, handleCrashDetected);
    } catch (error: any) {
      console.error('[useCrashDetection] Failed to resume crash detection service:', error);
    }
  }, [crashData, apiUrl, authToken, handleCrashDetected, clearTimers]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  return {
    isActive: state.isActive,
    serviceStatus: state.serviceStatus,
    lastInferenceTime: state.lastInferenceTime,
    confidenceBaseline: state.confidenceBaseline,
    errorMessage: state.errorMessage,
    crashDetected,
    countdown,
    crashData,
    startDetection,
    stopDetection,
    dismissCrashAlert,
    confirmSOS,
  };
}
