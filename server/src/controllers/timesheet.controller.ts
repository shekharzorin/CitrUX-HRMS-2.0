import { Request, Response } from 'express';
import { prisma } from '../db';
import { userSafeSelect } from '../utils/safe-select';
import { AuditService } from '../services/audit.service';
import { startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';

import { AuthRequest } from '../middlewares/auth.middleware';
import { getTenantScope, assertSameCompany } from '../middlewares/tenant.middleware';
import { safeString, requireString } from '../utils/requestUtils';

// Get or Create Timesheet for a specific week
export const getMyTimesheet = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const date = safeString(req.query.date); // optional date to focus on, defaults to today

        const focusDate = date ? new Date(date as string) : new Date();
        const weekStart = startOfWeek(focusDate, { weekStartsOn: 1 }); // Monday
        const weekEnd = endOfWeek(focusDate, { weekStartsOn: 1 });

        // Find existing timesheet
        let timesheet = await prisma.timesheet.findFirst({
            where: {
                userId,
                startDate: {
                    gte: weekStart,
                    lte: weekStart // Should be exact match logically if we always use startOfWeek, but allows small drift protection
                }
            },
            include: {
                entries: {
                    include: { task: true }
                }
            }
        });

        // If not found, create a draft
        if (!timesheet) {
            timesheet = await prisma.timesheet.create({
                data: {
                    userId,
                    startDate: weekStart,
                    endDate: weekEnd,
                    status: 'DRAFT'
                },
                include: {
                    entries: {
                        include: { task: true }
                    }
                }
            });
        }

        res.json(timesheet);
    } catch (error) {
        console.error("Get Timesheet Error:", error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

export const saveTimesheet = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const { id, entries } = req.body;

        // Verify ownership
        const timesheet = await prisma.timesheet.findUnique({
            where: { id }
        });

        if (!timesheet || timesheet.userId !== userId) {
            return res.status(403).json({ message: 'Access Denied' });
        }

        // Upsert entries
        for (const entry of entries) {
            if (entry.id) {
                // Update
                await prisma.timesheetEntry.update({
                    where: { id: entry.id },
                    data: {
                        taskName: entry.taskName,
                        project: entry.project,
                        mon: parseFloat(entry.mon || 0),
                        tue: parseFloat(entry.tue || 0),
                        wed: parseFloat(entry.wed || 0),
                        thu: parseFloat(entry.thu || 0),
                        fri: parseFloat(entry.fri || 0),
                        sat: parseFloat(entry.sat || 0),
                        sun: parseFloat(entry.sun || 0),
                        total: parseFloat(entry.total || 0),
                        taskId: entry.taskId || undefined // Link if provided
                    }
                });
            } else {
                // Create New Entry
                await prisma.timesheetEntry.create({
                    data: {
                        timesheetId: id,
                        taskName: entry.taskName,
                        project: entry.project,
                        mon: parseFloat(entry.mon || 0),
                        tue: parseFloat(entry.tue || 0),
                        wed: parseFloat(entry.wed || 0),
                        thu: parseFloat(entry.thu || 0),
                        fri: parseFloat(entry.fri || 0),
                        sat: parseFloat(entry.sat || 0),
                        sun: parseFloat(entry.sun || 0),
                        total: parseFloat(entry.total || 0),
                        taskId: entry.taskId || undefined
                    }
                });
            }
        }

        // Handle deletions if necessary - simplistic approach: client sends all current valid entries, server logic? 
        // For now, let's assume 'entries' contains only Updated/New ones. 
        // If user deleted a row in UI, we should expose a delete endpoint or handle it here via a diff.
        // Let's implement a separate delete-entry endpoint for individual row removal to keep this simple.

        // Refetch to return full updated object
        const updatedSheet = await prisma.timesheet.findUnique({
            where: { id },
            include: { entries: true }
        });

        res.json(updatedSheet);

    } catch (error) {
        console.error("Save Timesheet Error:", error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

export const submitTimesheet = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const { id } = req.body;

        const timesheet = await prisma.timesheet.findUnique({ where: { id } });
        if (!timesheet || timesheet.userId !== userId) return res.status(403).json({ message: 'Forbidden' });

        const updated = await prisma.timesheet.update({
            where: { id },
            data: { status: 'SUBMITTED' }
        });

        res.json(updated);
    } catch (err) {
        res.status(500).json({ message: 'Error submitting' });
    }
};

export const deleteEntry = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const id = requireString(req.params.id); // Entry ID

        const entry = await prisma.timesheetEntry.findUnique({
            where: { id },
            include: { timesheet: true }
        });

        if (!entry || (entry as any).timesheet.userId !== userId) {
            return res.status(403).json({ message: 'Access Denied' });
        }

        await prisma.timesheetEntry.delete({ where: { id } });
        res.json({ message: 'Entry deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

export const getPendingTimesheets = async (req: AuthRequest, res: Response) => {
    try {
        const scope = getTenantScope(req);
        const timesheets = await prisma.timesheet.findMany({
            where: { 
                status: 'SUBMITTED',
                user: {
                    ...scope
                }
            },
            include: {
                user: { select: userSafeSelect },
                entries: true
            },
            orderBy: { startDate: 'desc' }
        });
        res.json(timesheets);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching pending timesheets' });
    }
};

export const approveTimesheet = async (req: AuthRequest, res: Response) => {
    try {
        const { id, status, comment } = req.body; // status: APPROVED or REJECTED

        const timesheet = await prisma.timesheet.findUnique({
            where: { id },
            include: { user: { select: userSafeSelect } }
        });

        if (!timesheet) return res.status(404).json({ message: 'Timesheet not found' });
        if (!assertSameCompany(timesheet.user.companyId, req, res)) return;

        const updated = await prisma.timesheet.update({
            where: { id },
            data: { status }
        });
        await AuditService.log(req.user!.userId, status, 'TIMESHEET', id, { status, comment: comment ?? null });

        // Optionally create notification for user
        await prisma.notification.create({
            data: {
                userId: updated.userId,
                message: `Your timesheet for ${updated.startDate.toLocaleDateString()} has been ${status}. ${comment || ''}`
            }
        });

        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: 'Error approving timesheet' });
    }
};
