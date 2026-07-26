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

      let msg = 'An unexpected error occurred. Please try again.';
      try {
        const errData = JSON.parse(responseBody);
        if (typeof errData.detail === 'string') {
          msg = errData.detail;
        } else if (Array.isArray(errData.detail) && errData.detail.length > 0) {
          const firstErr = errData.detail[0];
          msg = typeof firstErr === 'string' ? firstErr : (firstErr.msg || firstErr.message || msg);
          if (msg.startsWith('Value error, ')) {
            msg = msg.replace('Value error, ', '');
          }
        } else if (typeof errData.message === 'string') {
          msg = errData.message;
        }
      } catch (e) {
        if (res.status === 404) msg = 'Requested resource not found.';
        else if (res.status === 500) msg = 'Server error occurred. Please try again later.';
        else if (res.status === 401) msg = 'Session expired or unauthorized. Please log in again.';
        else if (res.status === 403) msg = 'Access denied.';
      }

      const error = new Error(msg);
      (error as any).status = res.status;
      (error as any).responseBody = responseBody;
      throw error;
    }

    console.log(`=== API REQUEST SUCCESS ===`);
    console.log(`- URL: ${url}`);
    console.log(`- Status: ${res.status}`);
    console.log(`===========================`);
    return res;
  } catch (err: any) {
    if (err.status) {
      throw err;
    }

    console.error("=== API REQUEST FAILED (NETWORK ERROR) ===");
    console.error(`- Full Request URL: ${url}`);
    console.error(`- Error Name: ${err.name || 'Error'}`);
    console.error(`- Error Message: ${err.message || err}`);
    console.error(`- Error Stack: ${err.stack || 'Not available'}`);
    console.error("=========================================");

    const msg = "Unable to connect to the server. Please check your network connection or try again later.";
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
      const res = await this._post('/api/auth/login', payload);
      const is2FA = Boolean(res.requires2fa || res.requires2Fa || res.requires_2fa);
      const tempToken = res.tempToken || res.temp_token;
      const accessToken = res.accessToken || res.access_token;
      return {
        ...res,
        requires2fa: is2FA,
        requires2Fa: is2FA,
        requires_2fa: is2FA,
        tempToken,
        accessToken,
      };
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
      const res = await this._post('/api/auth/verify-2fa', payload);
      const accessToken = res.accessToken || res.access_token;
      return {
        ...res,
        accessToken,
      };
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
