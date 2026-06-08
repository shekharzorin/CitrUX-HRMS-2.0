import { z } from 'zod';

export const createSourceSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    type: z.string().min(1, 'Type is required'),
    configuration: z.record(z.string(), z.any()).optional(),
    isActive: z.boolean().optional(),
    priority: z.coerce.number().int().optional(),
}).passthrough();

export const updateSourceSchema = z.object({
    name: z.string().min(1).optional(),
    configuration: z.record(z.string(), z.any()).optional(),
    isActive: z.boolean().optional(),
    priority: z.coerce.number().int().optional(),
}).passthrough();
