import type {
  Vehicle,
  ScanResult,
  AlertRequest,
  AlertResponse,
  LookupResponse,
  RegistrationLookupResponse,
  UserLoginPayload,
  UserRegisterPayload,
  ConfirmEmailPayload,
  RequestOtpPayload,
  Verify2faPayload,
  ResendVerificationEmailPayload,
  Resend2faCodePayload,
  TokenResponse,
  UserResponse,
  CrashDetectResponse,
  SOSTriggerRequest,
  SOSTriggerResponse,
  SOSStatusResponse,
  SOSResolveRequest,
  SOSResolveResponse,
  CrashEvent,
} from './types';

// Helper to log network requests and responses, with developer-friendly diagnostics
async function fetchWithLogging(url: string, options: RequestInit = {}): Promise<Response> {
  const method = options.method || 'GET';
  const requestBody = options.body;
  const headers = options.headers || {};
  const baseURL = url.split('/api')[0] || '';

  // Log complete request details (Task 2)
  console.log("=== API REQUEST START ===");
  console.log(`- Full Request URL: ${url}`);
  console.log(`- HTTP Method: ${method}`);
  console.log(`- Headers:`, JSON.stringify(headers));
  console.log(`- Request Body:`, requestBody ? (typeof requestBody === 'string' ? requestBody : JSON.stringify(requestBody)) : 'None');
  console.log(`- Configuration: Fetch Client, Timeout: None (Default), Base URL: ${baseURL}`);
  console.log("=========================");

  try {
    const res = await fetch(url, options);

    if (!res.ok) {
      let responseBody = '';
      try {
        responseBody = await res.clone().text();
      } catch (e) {}

      console.error("=== API REQUEST FAILED (HTTP ERROR) ===");
      console.error(`- Full Request URL: ${url}`);
      console.error(`- Response Status: ${res.status}`);
      console.error(`- Response Body: ${responseBody}`);
      console.error("======================================");

      let msg = `Request failed with status ${res.status}`;
      try {
        const errData = JSON.parse(responseBody);
        msg = errData.detail || errData.message || msg;
      } catch (e) {}

      // Detailed user-facing error formatting (Task 8)
      const isDev = !!((globalThis as any).__DEV__ || (globalThis as any).process?.env?.NODE_ENV !== 'production');
      if (isDev) {
        msg = `${msg}\n\n[DEBUG INFO]\n• HTTP Status Code: ${res.status}\n• Response Body: ${responseBody}\n• Axios error.code: HTTP_ERROR_${res.status}\n• Axios error.message: Request failed with status code ${res.status}\n• Axios response.data: ${responseBody}\n• Stack trace: ${new Error().stack || 'Not available'}`;
      }

      const error = new Error(msg);
      (error as any).status = res.status;
      throw error;
    }

    console.log(`=== API REQUEST SUCCESS ===`);
    console.log(`- URL: ${url}`);
    console.log(`- Status: ${res.status}`);
    console.log(`===========================`);
    return res;
  } catch (err: any) {
    if (err.message && err.message.includes('[DEBUG INFO]')) {
      throw err;
    }

    console.error("=== API REQUEST FAILED (NETWORK ERROR) ===");
    console.error(`- Full Request URL: ${url}`);
    console.error(`- Error Name: ${err.name || 'Error'}`);
    console.error(`- Error Message: ${err.message || err}`);
    console.error(`- Error Stack: ${err.stack || 'Not available'}`);
    console.error("=========================================");

    let msg = `Network connection failed (Unable to connect to server at ${url}). Please ensure the backend is running and reachable on your network.`;
    const isDev = !!((globalThis as any).__DEV__ || (globalThis as any).process?.env?.NODE_ENV !== 'production');
    if (isDev) {
      msg = `${msg}\n\n[DEBUG INFO]\n• HTTP Status Code: Connection Refused / Network Error\n• Response Body: N/A\n• Axios error.code: ERR_NETWORK\n• Axios error.message: ${err.message || err}\n• Axios response.data: N/A\n• Stack trace: ${err.stack || 'Not available'}`;
    }
    throw new Error(msg);
  }
}

export function createApiClient(baseUrl: string) {
  const cleanUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

  console.log(`[API Client] Initialized with baseUrl: "${cleanUrl}"`);

  return {
    async listVehicles(): Promise<Vehicle[]> {
      const res = await fetchWithLogging(`${cleanUrl}/api/vehicles`);
      return res.json() as any;
    },

    async getVehicle(id: string): Promise<Vehicle> {
      const res = await fetchWithLogging(`${cleanUrl}/api/vehicles/${id}`);
      return res.json() as any;
    },

    async lookupVehicle(vin: string, country?: string): Promise<LookupResponse> {
      const res = await fetchWithLogging(`${cleanUrl}/api/vehicles/lookup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ vin, country }),
      });
      return res.json() as any;
    },

    async lookupRegistration(registrationNumber: string): Promise<RegistrationLookupResponse> {
      const res = await fetchWithLogging(`${cleanUrl}/api/vehicles/registration/lookup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ registrationNumber }),
      });
      return res.json() as any;
    },

    async lookupByDropdown(make: string, model: string, year: number): Promise<Vehicle> {
      const res = await fetchWithLogging(`${cleanUrl}/api/vehicles/lookup/dropdown?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}&year=${year}`);
      return res.json() as any;
    },

    async getMakes(vehicleType?: string): Promise<string[]> {
      const url = vehicleType 
        ? `${cleanUrl}/api/makes?vehicleType=${encodeURIComponent(vehicleType)}` 
        : `${cleanUrl}/api/makes`;
      const res = await fetchWithLogging(url);
      return res.json() as any;
    },

    async getModels(make: string, vehicleType?: string): Promise<string[]> {
      const url = vehicleType
        ? `${cleanUrl}/api/makes/${encodeURIComponent(make)}/models?vehicleType=${encodeURIComponent(vehicleType)}`
        : `${cleanUrl}/api/makes/${encodeURIComponent(make)}/models`;
      const res = await fetchWithLogging(url);
      return res.json() as any;
    },

    async getYears(make: string, model: string, vehicleType?: string): Promise<number[]> {
      const url = vehicleType
        ? `${cleanUrl}/api/makes/${encodeURIComponent(make)}/models/${encodeURIComponent(model)}/years?vehicleType=${encodeURIComponent(vehicleType)}`
        : `${cleanUrl}/api/makes/${encodeURIComponent(make)}/models/${encodeURIComponent(model)}/years`;
      const res = await fetchWithLogging(url);
      return res.json() as any;
    },

    async scanVehicle(
      qrData: string,
      coords?: { latitude?: number; longitude?: number; scannedBy?: string }
    ): Promise<ScanResult> {
      const res = await fetchWithLogging(`${cleanUrl}/api/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ qrData, ...coords }),
      });
      return res.json() as any;
    },

    async scanPlateImage(fileBlob: Blob): Promise<ScanResult> {
      const isRNFile = typeof fileBlob === 'object' && fileBlob !== null && 'uri' in (fileBlob as any);

      if (isRNFile) {
        return new Promise((resolve, reject) => {
          const xhr = new (globalThis as any).XMLHttpRequest();
          xhr.open('POST', `${cleanUrl}/api/scan/plate`);

          const formData = new FormData();
          formData.append('file', fileBlob as any);

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                resolve(JSON.parse(xhr.responseText));
              } catch (e) {
                resolve(xhr.responseText as any);
              }
            } else {
              const error = new Error(`License plate scanning failed with status ${xhr.status}`);
              (error as any).status = xhr.status;
              reject(error);
            }
          };

          xhr.onerror = () => {
            reject(new Error('License plate scanning failed due to network error'));
          };

          xhr.send(formData);
        });
      }

      const formData = new FormData();
      formData.append('file', fileBlob, 'plate.jpg');

      const res = await fetchWithLogging(`${cleanUrl}/api/scan/plate`, {
        method: 'POST',
        body: formData,
      });
      return res.json() as any;
    },

    async _post(path: string, body: any, token?: string) {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetchWithLogging(`${cleanUrl}${path}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      return res.json() as any;
    },

    async triggerAlert(payload: AlertRequest): Promise<AlertResponse> {
      return this._post('/api/alerts', payload);
    },

    async register(payload: UserRegisterPayload): Promise<UserResponse> {
      return this._post('/api/auth/register', payload);
    },

    async login(payload: UserLoginPayload): Promise<TokenResponse> {
      return this._post('/api/auth/login', payload);
    },

    async confirmEmail(payload: ConfirmEmailPayload): Promise<UserResponse> {
      return this._post('/api/auth/confirm-email', payload);
    },

    async registerBiometric(payload: { email: string; biometricPublicKey: string }): Promise<UserResponse> {
      return this._post('/api/auth/register-biometric', payload);
    },

    async requestOtp(payload: RequestOtpPayload): Promise<{ status: string; message: string }> {
      return this._post('/api/auth/request-otp', payload);
    },

    async verify2fa(payload: Verify2faPayload): Promise<TokenResponse> {
      return this._post('/api/auth/verify-2fa', payload);
    },

    async resendVerificationEmail(payload: ResendVerificationEmailPayload): Promise<{ status: string; message: string }> {
      return this._post('/api/auth/resend-verification-email', payload);
    },

    async resend2faCode(payload: Resend2faCodePayload): Promise<{ status: string; message: string }> {
      return this._post('/api/auth/resend-2fa-code', payload);
    },

    async toggle2fa(payload: { enabled: boolean }, token: string): Promise<UserResponse> {
      return this._post('/api/auth/toggle-2fa', payload, token);
    },

    async triggerManualSOS(latitude?: number, longitude?: number, token?: string): Promise<{ success: boolean; message: string; contactName: string; contactPhone: string }> {
      return this._post('/api/sos/trigger', { latitude, longitude }, token);
    },

    // ── Crash Detection & SOS ──────────────────────────────────────

    async detectCrash(features: number[], token: string): Promise<CrashDetectResponse> {
      return this._post('/api/v1/crash/detect', { features }, token);
    },

    async triggerSOS(payload: SOSTriggerRequest, token: string): Promise<SOSTriggerResponse> {
      return this._post('/api/v1/sos/trigger', payload, token);
    },

    async getSOSStatus(sessionId: string, token: string): Promise<SOSStatusResponse> {
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${token}`,
      };
      const res = await fetchWithLogging(`${cleanUrl}/api/v1/sos/${sessionId}/status`, { headers });
      return res.json() as any;
    },

    async resolveSOSSession(sessionId: string, payload: SOSResolveRequest, token: string): Promise<SOSResolveResponse> {
      return this._post(`/api/v1/sos/${sessionId}/resolve`, payload, token);
    },

    async getCrashEvents(token: string, limit: number = 50): Promise<CrashEvent[]> {
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${token}`,
      };
      const res = await fetchWithLogging(`${cleanUrl}/api/v1/sos/events?limit=${limit}`, { headers });
      return res.json() as any;
    },

    getCrashEventsStreamUrl(): string {
      return `${cleanUrl}/api/v1/sos/events/stream`;
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
