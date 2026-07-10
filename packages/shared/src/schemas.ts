import { z } from 'zod';

export const SafetyFeatureSchema = z.object({
  title: z.string(),
  description: z.string(),
  location: z.string(),
  icon: z.string(),
  priority: z.string(),
});

export const EmergencyProcedureSchema = z.object({
  scenario: z.string(),
  dos: z.array(z.string()),
  donts: z.array(z.string()),
  videoTimestamp: z.string().optional(),
});

export const VehicleFeatureItemSchema = z.object({
  name: z.string(),
  location: z.string(),
  icon: z.string(),
});

export const VehicleFeatureGroupSchema = z.object({
  category: z.string(),
  items: z.array(VehicleFeatureItemSchema),
});

export const VehicleSchema = z.object({
  id: z.string(),
  vehicleType: z.string(),
  make: z.string(),
  model: z.string(),
  year: z.number(),
  fuelType: z.string(),
  safetyFeatures: z.array(SafetyFeatureSchema),
  emergencyProcedures: z.array(EmergencyProcedureSchema),
  vehicleFeatures: z.array(VehicleFeatureGroupSchema),
  videoUrl: z.string(),
  thumbnailUrl: z.string(),
});

export const LookupRequestSchema = z.object({
  vin: z.string(),
  country: z.string().optional(),
});

export const LookupResponseSchema = z.object({
  inputType: z.string(),
  registrationNumber: z.string(),
  vehicleType: z.string(),
  make: z.string(),
  model: z.string(),
  year: z.number(),
  fuelType: z.string(),
  vehicleId: z.string(),
  safetyFeatures: z.array(SafetyFeatureSchema),
  emergencyProcedures: z.array(EmergencyProcedureSchema),
  vehicleFeatures: z.array(VehicleFeatureGroupSchema),
  videoUrl: z.string(),
});

export const ScanRequestSchema = z.object({
  qrData: z.string(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  scannedBy: z.string().optional(),
});

export const AlertRequestSchema = z.object({
  vehicleId: z.string(),
  severity: z.enum(['INFO', 'WARNING', 'CRITICAL']),
  message: z.string(),
  latitude: z.number(),
  longitude: z.number(),
});

export const MLPredictionSchema = z.object({
  predictedClass: z.string(),
  confidence: z.number(),
  boundingBox: z.array(z.number()).optional(),
});

export const ScanResultSchema = z.object({
  success: z.boolean(),
  vehicle: VehicleSchema.optional(),
  message: z.string(),
  prediction: MLPredictionSchema.optional(),
  timestamp: z.string(),
});
