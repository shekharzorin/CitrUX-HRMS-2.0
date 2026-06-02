import { z } from 'zod';

const visibility = z.enum(['PUBLIC', 'INTERNAL', 'RESTRICTED']);

export const createQueueSchema = z.object({
    name: z.string().min(1, 'Queue name is required'),
    description: z.string().optional(),
    icon: z.string().optional(),
    color: z.string().optional(),
    defaultAssigneeId: z.string().min(1).nullable().optional(),
    visibility: visibility.optional(),
    sortOrder: z.coerce.number().int().optional(),
    isActive: z.boolean().optional(),
    // AccessRole ids granted access when visibility = RESTRICTED
    roleIds: z.array(z.string().min(1)).optional(),
}).passthrough();

export const updateQueueSchema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().nullable().optional(),
    icon: z.string().nullable().optional(),
    color: z.string().nullable().optional(),
    defaultAssigneeId: z.string().min(1).nullable().optional(),
    visibility: visibility.optional(),
    sortOrder: z.coerce.number().int().optional(),
    isActive: z.boolean().optional(),
    roleIds: z.array(z.string().min(1)).optional(),
}).passthrough();
