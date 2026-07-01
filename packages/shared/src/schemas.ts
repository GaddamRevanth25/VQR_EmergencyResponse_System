import { z } from 'zod';

export const SafetyGuidelineSchema = z.object({
  title: z.string(),
  description: z.string(),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
});

export const VehicleFeatureSchema = z.object({
  category: z.string(),
  items: z.array(z.string()),
});

export const VehicleSchema = z.object({
  id: z.string(),
  make: z.string(),
  model: z.string(),
  year: z.number(),
  safetyGuidelines: z.array(SafetyGuidelineSchema),
  features: z.array(VehicleFeatureSchema),
  videoUrl: z.string(),
  thumbnailUrl: z.string(),
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
