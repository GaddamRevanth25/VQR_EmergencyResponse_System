import { z } from 'zod';
import {
  SafetyGuidelineSchema,
  FeatureGroupSchema,
  VehicleSchema,
  ScanRequestSchema,
  AlertRequestSchema,
  MLPredictionSchema,
  ScanResultSchema,
} from './schemas';

export type SafetyGuideline = z.infer<typeof SafetyGuidelineSchema>;
export type FeatureGroup = z.infer<typeof FeatureGroupSchema>;
export type Vehicle = z.infer<typeof VehicleSchema>;
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
