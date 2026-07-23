import { z } from 'zod';
import {
  SafetyFeatureSchema,
  EmergencyProcedureSchema,
  VehicleFeatureItemSchema,
  VehicleFeatureGroupSchema,
  VehicleSchema,
  LookupRequestSchema,
  LookupResponseSchema,
  RegistrationLookupResponseSchema,
  ScanRequestSchema,
  AlertRequestSchema,
  MLPredictionSchema,
  ScanResultSchema,
} from './schemas';

export type SafetyFeature = z.infer<typeof SafetyFeatureSchema>;
export type EmergencyProcedure = z.infer<typeof EmergencyProcedureSchema>;
export type VehicleFeatureItem = z.infer<typeof VehicleFeatureItemSchema>;
export type VehicleFeatureGroup = z.infer<typeof VehicleFeatureGroupSchema>;
export type Vehicle = z.infer<typeof VehicleSchema>;
export type LookupRequest = z.infer<typeof LookupRequestSchema>;
export type LookupResponse = z.infer<typeof LookupResponseSchema>;
export type RegistrationLookupResponse = z.infer<typeof RegistrationLookupResponseSchema>;

export type ScanRequest = z.infer<typeof ScanRequestSchema>;
export type AlertRequest = z.infer<typeof AlertRequestSchema>;
export type MLPrediction = z.infer<typeof MLPredictionSchema>;
export type ScanResult = z.infer<typeof ScanResultSchema>;

export interface AlertResponse {
  success: boolean;
  alertId: string;
  status: 'SENT' | 'FAILED';
  timestamp: string;
}
