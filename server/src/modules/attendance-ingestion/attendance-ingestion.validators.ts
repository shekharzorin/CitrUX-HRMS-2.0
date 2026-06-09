import { z } from 'zod';

export const gpsCheckinSchema = z.object({
    eventType: z.enum(['CHECK_IN', 'CHECK_OUT']),
    lat: z.coerce.number().min(-90).max(90),
    lng: z.coerce.number().min(-180).max(180),
    accuracy: z.coerce.number().nonnegative().optional(),
}).passthrough();

export const manualSchema = z.object({
    userId: z.string().min(1, 'Employee is required'),
    sourceId: z.string().min(1).nullable().optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
    checkIn: z.string().regex(/^\d{1,2}:\d{2}$/, 'Check-in must be HH:mm'),
    checkOut: z.string().regex(/^\d{1,2}:\d{2}$/, 'Check-out must be HH:mm').optional().or(z.literal('')),
    note: z.string().optional(),
}).passthrough();
