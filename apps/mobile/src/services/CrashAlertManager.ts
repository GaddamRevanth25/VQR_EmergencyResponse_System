/**
 * CrashAlertManager
 * ==================
 * Handles confirmed crash events:
 * - Sends SOS to backend API
 * - Caches events offline for retry
 * - Manages the alert lifecycle
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const OFFLINE_CACHE_KEY = 'vqr_offline_crash_events';
const MAX_RETRIES = 5;
const RETRY_INTERVALS = [5000, 10000, 30000, 60000, 120000]; // exponential backoff

interface CrashPayload {
  confidence: number;
  latitude?: number;
  longitude?: number;
  sensorFeatures: number[];
  sensorSnapshot: { accel: any[]; gyro: any[] };
}

interface CachedCrashEvent {
  id: string;
  payload: CrashPayload;
  timestamp: number;
  retryCount: number;
}

class CrashAlertManagerClass {
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private isSyncing = false;

  /**
   * Send SOS to the backend. If offline, cache for later retry.
   */
  async sendSOS(
    apiUrl: string,
    authToken: string,
    payload: CrashPayload,
  ): Promise<{ success: boolean; sessionId?: string; error?: string }> {
    try {
      const url = `${apiUrl}/api/v1/sos/trigger`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          latitude: payload.latitude,
          longitude: payload.longitude,
          confidenceScore: payload.confidence,
          sensorFeatures: payload.sensorFeatures,
          sensorSnapshot: payload.sensorSnapshot,
        }),
      });

      if (!response.ok) {
        throw new Error(`SOS trigger failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('[CrashAlertManager] SOS sent successfully:', data.sosSessionId);
      return { success: true, sessionId: data.sosSessionId };
    } catch (error: any) {
      console.error('[CrashAlertManager] SOS send failed, caching for retry:', error.message);

      // Cache for offline retry
      await this.cacheEvent(payload);

      // Start retry loop
      this.scheduleRetry(apiUrl, authToken);

      return { success: false, error: error.message };
    }
  }

  /**
   * Try to sync any cached offline crash events.
   */
  async syncOfflineEvents(apiUrl: string, authToken: string): Promise<void> {
    if (this.isSyncing) return;
    this.isSyncing = true;

    try {
      const cached = await this.getCachedEvents();
      if (cached.length === 0) {
        this.isSyncing = false;
        return;
      }

      console.log(`[CrashAlertManager] Syncing ${cached.length} offline events...`);

      const remaining: CachedCrashEvent[] = [];

      for (const event of cached) {
        try {
          const url = `${apiUrl}/api/v1/sos/trigger`;
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`,
            },
            body: JSON.stringify({
              latitude: event.payload.latitude,
              longitude: event.payload.longitude,
              confidenceScore: event.payload.confidence,
              sensorFeatures: event.payload.sensorFeatures,
              sensorSnapshot: event.payload.sensorSnapshot,
              metadata: {
                offlineCached: true,
                originalTimestamp: new Date(event.timestamp).toISOString(),
                retryCount: event.retryCount,
              },
            }),
          });

          if (response.ok) {
            console.log(`[CrashAlertManager] Synced offline event ${event.id}`);
          } else {
            throw new Error(`Status ${response.status}`);
          }
        } catch (e) {
          event.retryCount++;
          if (event.retryCount < MAX_RETRIES) {
            remaining.push(event);
          } else {
            console.warn(`[CrashAlertManager] Dropping event ${event.id} after ${MAX_RETRIES} retries`);
          }
        }
      }

      await AsyncStorage.setItem(OFFLINE_CACHE_KEY, JSON.stringify(remaining));

      if (remaining.length > 0) {
        this.scheduleRetry(apiUrl, authToken);
      }
    } catch (error) {
      console.error('[CrashAlertManager] Sync failed:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  // ── Private Helpers ────────────────────────────────────────────

  private async cacheEvent(payload: CrashPayload): Promise<void> {
    const cached = await this.getCachedEvents();
    const event: CachedCrashEvent = {
      id: `crash_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      payload,
      timestamp: Date.now(),
      retryCount: 0,
    };
    cached.push(event);
    await AsyncStorage.setItem(OFFLINE_CACHE_KEY, JSON.stringify(cached));
  }

  private async getCachedEvents(): Promise<CachedCrashEvent[]> {
    try {
      const raw = await AsyncStorage.getItem(OFFLINE_CACHE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private scheduleRetry(apiUrl: string, authToken: string): void {
    if (this.retryTimer) return; // already scheduled

    const retryDelay = RETRY_INTERVALS[0];
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.syncOfflineEvents(apiUrl, authToken);
    }, retryDelay);
  }
}

export const CrashAlertManager = new CrashAlertManagerClass();
