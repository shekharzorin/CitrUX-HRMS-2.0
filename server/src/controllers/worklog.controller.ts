import { Response } from 'express';
import { prisma } from '../db';
import { AuthRequest } from '../middlewares/auth.middleware';

// ─── GET /worklogs ─────────────────────────────────────────────────────────
// Returns all work logs for the current user, latest first.
export const getMyWorkLogs = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;

        const logs = await prisma.workLog.findMany({
            where: { userId },
            orderBy: { date: 'desc' },
            take: 60 // last ~2 months
        });

        res.json(logs);
    } catch (error) {
        console.error('[WorkLog] getMyWorkLogs:', error);
        res.status(500).json({ message: 'Error fetching work logs' });
    }
};

// ─── POST /worklogs ─────────────────────────────────────────────────────────
export const createWorkLog = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const { date, hoursWorked, breakTime, description } = req.body;

        if (!date || hoursWorked === undefined || !description) {
            return res.status(400).json({ message: 'date, hoursWorked, and description are required' });
        }

        const hours = parseFloat(hoursWorked);
        if (isNaN(hours) || hours < 0 || hours > 24) {
            return res.status(400).json({ message: 'hoursWorked must be between 0 and 24' });
        }

        // Parse date as UTC midnight to avoid timezone drift
        const [year, month, day] = (date as string).split('-').map(Number);
        const logDate = new Date(Date.UTC(year, month - 1, day));

        // Upsert: one log per user per date
        const log = await prisma.workLog.upsert({
            where: { userId_date: { userId, date: logDate } },
            create: {
                userId,
                date: logDate,
                hoursWorked: hours,
                breakTime: parseFloat(breakTime) || 0,
                description,
                companyId: req.user!.companyId // Multi-tenant fix
            },
            update: {
                hoursWorked: hours,
                breakTime: parseFloat(breakTime) || 0,
                description
            }
        });

        res.status(201).json(log);
    } catch (error) {
        console.error('[WorkLog] createWorkLog:', error);
        res.status(500).json({ message: 'Error creating work log' });
    }
};

// ─── PUT /worklogs/:id ──────────────────────────────────────────────────────
export const updateWorkLog = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const { id } = req.params;
        const { hoursWorked, breakTime, description } = req.body;

        const existing = await prisma.workLog.findUnique({ where: { id } });
        if (!existing || existing.userId !== userId) {
            return res.status(404).json({ message: 'Work log not found' });
        }

        const hours = parseFloat(hoursWorked);
        if (isNaN(hours) || hours < 0 || hours > 24) {
            return res.status(400).json({ message: 'hoursWorked must be between 0 and 24' });
        }

        const updated = await prisma.workLog.update({
            where: { id },
            data: {
                hoursWorked: hours,
                breakTime: parseFloat(breakTime) || 0,
                description
            }
        });

        res.json(updated);
    } catch (error) {
        console.error('[WorkLog] updateWorkLog:', error);
        res.status(500).json({ message: 'Error updating work log' });
    }
};

// ─── DELETE /worklogs/:id ───────────────────────────────────────────────────
export const deleteWorkLog = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const { id } = req.params;

        const existing = await prisma.workLog.findUnique({ where: { id } });
        if (!existing || existing.userId !== userId) {
            return res.status(404).json({ message: 'Work log not found' });
        }

        await prisma.workLog.delete({ where: { id } });
        res.json({ message: 'Work log deleted' });
    } catch (error) {
        console.error('[WorkLog] deleteWorkLog:', error);
        res.status(500).json({ message: 'Error deleting work log' });
    }
};
