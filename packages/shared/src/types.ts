import { z } from 'zod';
import { SafetyGuidelineSchema, VehicleFeatureSchema, VehicleSchema, ScanRequestSchema, AlertRequestSchema } from './schemas';

export type SafetyGuideline = z.infer<typeof SafetyGuidelineSchema>;
export type VehicleFeature = z.infer<typeof VehicleFeatureSchema>;
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
