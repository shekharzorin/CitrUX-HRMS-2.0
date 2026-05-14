import { Response } from 'express';
import { prisma } from '../db';
import { AuthRequest } from '../middlewares/auth.middleware';
import { getTenantScope } from '../middlewares/tenant.middleware';

// ─── Create ───────────────────────────────────────────────────────────────────
export const createShift = async (req: AuthRequest, res: Response) => {
    try {
        const companyId = req.user!.companyId;
        const { name, startTime, endTime, graceTime, isNightShift, isDefault } = req.body;

        if (!name || !startTime || !endTime) {
            return res.status(400).json({ message: 'name, startTime and endTime are required' });
        }

        // If marking as default, clear existing default for this company first
        if (isDefault && companyId) {
            await prisma.shift.updateMany({
                where: { companyId, isDefault: true },
                data: { isDefault: false },
            });
        }

        const shift = await prisma.shift.create({
            data: {
                name,
                startTime,
                endTime,
                graceTime:    graceTime    ?? 15,
                isNightShift: isNightShift ?? false,
                isDefault:    isDefault    ?? false,
                companyId:    companyId    ?? null,
            },
        });

        res.status(201).json(shift);
    } catch (error) {
        console.error('createShift error:', error);
        res.status(500).json({ message: 'Error creating shift' });
    }
};

// ─── List (company-scoped) ────────────────────────────────────────────────────
export const getShifts = async (req: AuthRequest, res: Response) => {
    try {
        const scope = getTenantScope(req);

        const shifts = await prisma.shift.findMany({
            where: scope.companyId ? { companyId: scope.companyId } : {},
            include: {
                policyOverride: true,
                _count: { select: { users: true } },
            },
            orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
        });

        res.json(shifts);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching shifts' });
    }
};

// ─── Get single ───────────────────────────────────────────────────────────────
export const getShift = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const shift = await prisma.shift.findUnique({
            where: { id },
            include: {
                policyOverride: true,
                users: { select: { id: true, email: true, profile: { select: { firstName: true, lastName: true } } } },
                _count: { select: { users: true } },
            },
        });

        if (!shift) return res.status(404).json({ message: 'Shift not found' });

        // Tenant guard
        if (shift.companyId && shift.companyId !== req.user!.companyId && req.user!.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ message: 'Cross-company access blocked' });
        }

        res.json(shift);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching shift' });
    }
};

// ─── Update ───────────────────────────────────────────────────────────────────
export const updateShift = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const companyId = req.user!.companyId;

        const existing = await prisma.shift.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ message: 'Shift not found' });

        if (existing.companyId && existing.companyId !== companyId && req.user!.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ message: 'Cross-company access blocked' });
        }

        const { name, startTime, endTime, graceTime, isNightShift, isDefault } = req.body;

        // Clear old default if setting a new one
        if (isDefault && companyId) {
            await prisma.shift.updateMany({
                where: { companyId, isDefault: true, id: { not: id } },
                data: { isDefault: false },
            });
        }

        const shift = await prisma.shift.update({
            where: { id },
            data: {
                ...(name        !== undefined && { name }),
                ...(startTime   !== undefined && { startTime }),
                ...(endTime     !== undefined && { endTime }),
                ...(graceTime   !== undefined && { graceTime }),
                ...(isNightShift !== undefined && { isNightShift }),
                ...(isDefault   !== undefined && { isDefault }),
            },
        });

        res.json(shift);
    } catch (error) {
        res.status(500).json({ message: 'Error updating shift' });
    }
};

// ─── Delete ───────────────────────────────────────────────────────────────────
export const deleteShift = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const companyId = req.user!.companyId;

        const existing = await prisma.shift.findUnique({
            where: { id },
            include: { _count: { select: { users: true } } },
        });
        if (!existing) return res.status(404).json({ message: 'Shift not found' });

        if (existing.companyId && existing.companyId !== companyId && req.user!.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ message: 'Cross-company access blocked' });
        }

        if (existing._count.users > 0) {
            return res.status(400).json({
                message: `Cannot delete shift — ${existing._count.users} employee(s) are assigned to it. Reassign them first.`,
            });
        }

        await prisma.shift.delete({ where: { id } });
        res.json({ message: 'Shift deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting shift' });
    }
};

// ─── Assign shift to a single user ───────────────────────────────────────────
export const assignShift = async (req: AuthRequest, res: Response) => {
    try {
        const { userId, shiftId } = req.body;
        if (!userId) return res.status(400).json({ message: 'userId is required' });

        const targetUser = await prisma.user.findUnique({ where: { id: userId } });
        if (!targetUser) return res.status(404).json({ message: 'User not found' });

        if (targetUser.companyId !== req.user!.companyId && req.user!.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ message: 'Cross-company access blocked' });
        }

        if (shiftId) {
            const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
            if (!shift) return res.status(404).json({ message: 'Shift not found' });
        }

        const user = await prisma.user.update({
            where: { id: userId },
            data: { shiftId: shiftId ?? null },
            select: { id: true, email: true, shiftId: true },
        });

        res.json({ message: 'Shift assigned', user });
    } catch (error) {
        res.status(500).json({ message: 'Error assigning shift' });
    }
};

// ─── Bulk assign a shift to multiple users ────────────────────────────────────
export const bulkAssignShift = async (req: AuthRequest, res: Response) => {
    try {
        const { userIds, shiftId } = req.body;
        if (!Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({ message: 'userIds must be a non-empty array' });
        }

        const companyId = req.user!.companyId;

        // Verify all users belong to the same company (or super admin)
        if (req.user!.role !== 'SUPER_ADMIN' && companyId) {
            const foreignCount = await prisma.user.count({
                where: { id: { in: userIds }, companyId: { not: companyId } },
            });
            if (foreignCount > 0) {
                return res.status(403).json({ message: 'Some users belong to a different company' });
            }
        }

        if (shiftId) {
            const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
            if (!shift) return res.status(404).json({ message: 'Shift not found' });
        }

        const result = await prisma.user.updateMany({
            where: { id: { in: userIds } },
            data: { shiftId: shiftId ?? null },
        });

        res.json({ message: `Shift updated for ${result.count} employee(s)`, count: result.count });
    } catch (error) {
        res.status(500).json({ message: 'Error bulk-assigning shift' });
    }
};

// ─── List users assigned to a shift ──────────────────────────────────────────
export const getShiftUsers = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        const shift = await prisma.shift.findUnique({ where: { id } });
        if (!shift) return res.status(404).json({ message: 'Shift not found' });
        if (!assertSameCompany(shift.companyId, req, res)) return;

        const users = await prisma.user.findMany({
            where: { shiftId: id },
            select: {
                id: true,
                email: true,
                employeeId: true,
                profile: { select: { firstName: true, lastName: true, designation: true } },
            },
            orderBy: { email: 'asc' },
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching shift users' });
    }
};
