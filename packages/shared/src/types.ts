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
  UserLoginSchema,
  UserRegisterSchema,
  ConfirmEmailSchema,
  RequestOtpSchema,
  Verify2faSchema,
  ResendVerificationEmailSchema,
  Resend2faCodeSchema,
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

export type UserLoginPayload = z.infer<typeof UserLoginSchema>;
export type UserRegisterPayload = z.infer<typeof UserRegisterSchema>;
export type ConfirmEmailPayload = z.infer<typeof ConfirmEmailSchema>;
export type RequestOtpPayload = z.infer<typeof RequestOtpSchema>;
export type Verify2faPayload = z.infer<typeof Verify2faSchema>;
export type ResendVerificationEmailPayload = z.infer<typeof ResendVerificationEmailSchema>;
export type Resend2faCodePayload = z.infer<typeof Resend2faCodeSchema>;

export interface AlertResponse {
  success: boolean;
  alertId: string;
  status: 'SENT' | 'FAILED';
  timestamp: string;
}

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  bloodGroup?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  createdAt: string;
}

export interface TokenResponse {
  accessToken?: string;
  tokenType: string;
  user?: UserResponse;
  requires2fa?: boolean;
  tempToken?: string;
}

// ── Crash Detection & SOS Types ────────────────────────────────────

export interface CrashDetectRequest {
  features: number[];  // exactly 22 floats
}

export interface CrashDetectResponse {
  label: number;
  probability: number;
  isCrash: boolean;
}

export interface SOSTriggerRequest {
  latitude?: number;
  longitude?: number;
  speedEstimate?: number;
  confidenceScore: number;
  sensorFeatures?: number[];
  sensorSnapshot?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface SOSTriggerResponse {
  sosSessionId: string;
  crashEventId: string;
  status: string;
  message: string;
}

export interface SOSStatusResponse {
  sessionId: string;
  crashEventId: string;
  userId: string;
  status: string;
  latitude?: number;
  longitude?: number;
  confidenceScore?: number;
  createdAt?: string;
  resolvedAt?: string;
}

export interface SOSResolveRequest {
  status: 'RESOLVED' | 'FALSE_ALARM' | 'CANCELLED';
  notes?: string;
}

export interface SOSResolveResponse {
  sessionId: string;
  status: string;
  resolvedAt?: string;
  message: string;
}

export interface CrashEvent {
  id: string;
  userId: string;
  userName?: string;
  userPhone?: string;
  latitude?: number;
  longitude?: number;
  speedEstimate?: number;
  confidenceScore: number;
  status: string;
  createdAt?: string;
  resolvedAt?: string;
  sensorFeatures?: number[];
}

