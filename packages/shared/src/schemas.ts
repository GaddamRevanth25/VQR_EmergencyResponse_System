import { z } from 'zod';

export const VehicleTypeSchema = z.enum(['AMBULANCE', 'FIRE_TRUCK', 'POLICE', 'RESCUE', 'OTHER']);

export const VehicleSchema = z.object({
  id: z.string(),
  licensePlate: z.string(),
  type: VehicleTypeSchema,
  status: z.enum(['AVAILABLE', 'ACTIVE', 'MAINTENANCE']),
  qrCode: z.string(),
  ownerDepartment: z.string(),
  contactNumber: z.string(),
  updatedAt: z.string(),
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
