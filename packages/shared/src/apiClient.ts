import type { Vehicle, ScanResult, AlertRequest, AlertResponse } from './types';

export function createApiClient(baseUrl: string) {
  const cleanUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

  return {
    async listVehicles(): Promise<Vehicle[]> {
      const res = await fetch(`${cleanUrl}/api/vehicles`);
      if (!res.ok) {
        throw new Error('Failed to fetch vehicles list');
      }
      return res.json();
    },

    async getVehicle(id: string): Promise<Vehicle> {
      const res = await fetch(`${cleanUrl}/api/vehicles/${id}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch vehicle with ID: ${id}`);
      }
      return res.json();
    },

    async scanVehicle(
      qrData: string,
      coords?: { latitude?: number; longitude?: number; scannedBy?: string }
    ): Promise<ScanResult> {
      const res = await fetch(`${cleanUrl}/api/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ qrData, ...coords }),
      });
      if (!res.ok) {
        throw new Error('QR Code scan action failed');
      }
      return res.json();
    },

    async triggerAlert(alertRequest: AlertRequest): Promise<AlertResponse> {
      const res = await fetch(`${cleanUrl}/api/alerts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(alertRequest),
      });
      if (!res.ok) {
        throw new Error('Alert dispatch failed');
      }
      return res.json();
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
