import { z } from 'zod';

// Minimal employee-facing create payload. Fields arrive as multipart text parts
// (alongside file uploads), so everything is a string here.
export const createTicketSchema = z.object({
    subject: z.string().min(1, 'Subject is required'),
    description: z.string().min(1, 'Description is required'),
    supportDepartmentId: z.string().min(1, 'A support queue is required'),
    categoryId: z.string().min(1).nullable().optional(),
}).passthrough();

export const createCategorySchema = z.object({
    name: z.string().min(1, 'Category name is required'),
    description: z.string().optional(),
}).passthrough();

export const updateCategorySchema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().nullable().optional(),
    isActive: z.boolean().optional(),
}).passthrough();

export const createCommentSchema = z.object({
    body: z.string().min(1, 'Comment body is required'),
    visibility: z.enum(['PUBLIC', 'INTERNAL', 'ADMIN_ONLY']).optional(),
}).passthrough();

export const changeStatusSchema = z.object({
    status: z.enum(['OPEN', 'IN_PROGRESS', 'ON_HOLD', 'RESOLVED', 'CLOSED', 'REOPENED']),
    note: z.string().optional(),
}).passthrough();

export const assignSchema = z.object({
    assigneeId: z.string().min(1, 'assigneeId is required'),
    reason: z.string().optional(),
}).passthrough();
