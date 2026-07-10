import type { Vehicle, ScanResult, AlertRequest, AlertResponse, LookupResponse } from './types';

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

    async lookupVehicle(vin: string, country?: string): Promise<LookupResponse> {
      const res = await fetch(`${cleanUrl}/api/vehicles/lookup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ vin, country }),
      });
      if (!res.ok) {
        throw new Error('Vehicle not found for specified VIN/plate');
      }
      return res.json();
    },

    async lookupByDropdown(make: string, model: string, year: number): Promise<Vehicle> {
      const res = await fetch(`${cleanUrl}/api/vehicles/lookup/dropdown?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}&year=${year}`);
      if (!res.ok) {
        throw new Error('Vehicle not found for specified make, model, and year');
      }
      return res.json();
    },

    async getMakes(vehicleType?: string): Promise<string[]> {
      const url = vehicleType 
        ? `${cleanUrl}/api/makes?vehicleType=${encodeURIComponent(vehicleType)}` 
        : `${cleanUrl}/api/makes`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error('Failed to fetch makes list');
      }
      return res.json();
    },

    async getModels(make: string, vehicleType?: string): Promise<string[]> {
      const url = vehicleType
        ? `${cleanUrl}/api/makes/${encodeURIComponent(make)}/models?vehicleType=${encodeURIComponent(vehicleType)}`
        : `${cleanUrl}/api/makes/${encodeURIComponent(make)}/models`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to fetch models for make: ${make}`);
      }
      return res.json();
    },

    async getYears(make: string, model: string, vehicleType?: string): Promise<number[]> {
      const url = vehicleType
        ? `${cleanUrl}/api/makes/${encodeURIComponent(make)}/models/${encodeURIComponent(model)}/years?vehicleType=${encodeURIComponent(vehicleType)}`
        : `${cleanUrl}/api/makes/${encodeURIComponent(make)}/models/${encodeURIComponent(model)}/years`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to fetch years for ${make} ${model}`);
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
