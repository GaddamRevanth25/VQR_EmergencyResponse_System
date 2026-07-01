import { z } from 'zod';
import { VehicleSchema, ScanRequestSchema, AlertRequestSchema } from './schemas';

export type VehicleType = 'AMBULANCE' | 'FIRE_TRUCK' | 'POLICE' | 'RESCUE' | 'OTHER';
export type Vehicle = z.infer<typeof VehicleSchema>;
export type ScanRequest = z.infer<typeof ScanRequestSchema>;
export type AlertRequest = z.infer<typeof AlertRequestSchema>;

export interface ScanResponse {
  success: boolean;
  vehicle?: Vehicle;
  message: string;
  timestamp: string;
}

export interface AlertResponse {
  success: boolean;
  alertId: string;
  status: 'SENT' | 'FAILED';
  timestamp: string;
}
