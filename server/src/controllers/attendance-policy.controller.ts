import { Response } from 'express';
import { prisma } from '../db';
import { AuthRequest } from '../middlewares/auth.middleware';
import {
    getEffectivePolicy,
    getEffectivePolicyForCompany,
    PLATFORM_DEFAULT_POLICY,
} from '../services/attendance-policy.service';

// ─── Company Policy ───────────────────────────────────────────────────────────

/**
 * GET /api/attendance-policy
 * Returns the stored company policy (raw DB record, not merged with defaults).
 * ADMIN / HR only.
 */
export const getPolicy = async (req: AuthRequest, res: Response) => {
    try {
        const companyId = req.user!.companyId;
        if (!companyId) return res.status(400).json({ message: 'Company context required' });

        const policy = await prisma.attendancePolicy.findUnique({ where: { companyId } });
        res.json(policy ?? null);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch policy' });
    }
};

/**
 * PUT /api/attendance-policy
 * Upserts the company attendance policy.
 * ADMIN only.
 */
export const upsertPolicy = async (req: AuthRequest, res: Response) => {
    try {
        const companyId = req.user!.companyId;
        if (!companyId) return res.status(400).json({ message: 'Company context required' });

        const allowedFields = [
            'graceMinutes', 'halfDayThresholdHours', 'fullDayHours', 'maxWorkHoursPerDay', 'allowMultipleSessions',
            'autoClockOutEnabled', 'autoClockOutType', 'autoClockOutBufferMinutes', 'autoClockOutMaxHours',
            'allowBreaks', 'maxBreaksPerDay', 'maxTotalBreakMinutes', 'autoEndBreakOnCheckout', 'autoEndBreakAfterMinutes',
            'missedPunchAutoResolve', 'missedPunchAction', 'missedPunchNotifyAfterMinutes',
            'markLateAfterMinutes', 'lateCountThresholdForHalfDay', 'absentIfNoPunchInAfterHours',
            'allowEmployeeAdjustment', 'maxPastDaysForAdjustment', 'requireApproval',
            'requireGeoFence', 'allowedRadiusMeters',
        ];

        // Only keep fields that are explicitly in the allowed list
        const data: Record<string, any> = {};
        for (const field of allowedFields) {
            if (field in req.body) data[field] = req.body[field];
        }

        // Validate enums
        if (data.autoClockOutType && !['SHIFT_END', 'HOURS_BASED'].includes(data.autoClockOutType)) {
            return res.status(400).json({ message: 'Invalid autoClockOutType. Must be SHIFT_END or HOURS_BASED' });
        }
        if (data.missedPunchAction && !['AUTO_CHECKOUT', 'MARK_HALF_DAY', 'MARK_ABSENT'].includes(data.missedPunchAction)) {
            return res.status(400).json({ message: 'Invalid missedPunchAction' });
        }

        const policy = await prisma.attendancePolicy.upsert({
            where: { companyId },
            update: data,
            create: { companyId, ...data },
        });

        res.json(policy);
    } catch (error) {
        console.error('Policy upsert error:', error);
        res.status(500).json({ message: 'Failed to save policy' });
    }
};

/**
 * GET /api/attendance-policy/effective
 * Returns the fully-merged effective policy for the requesting user.
 * All roles.
 */
export const getEffectivePolicyForUser = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const policy = await getEffectivePolicy(userId);
        res.json(policy);
    } catch (error) {
        res.status(500).json({ message: 'Failed to resolve effective policy' });
    }
};

/**
 * GET /api/attendance-policy/effective-company
 * Returns company policy merged with platform defaults.
 * ADMIN / HR only.
 */
export const getEffectivePolicyForCompanyHandler = async (req: AuthRequest, res: Response) => {
    try {
        const companyId = req.user!.companyId;
        if (!companyId) return res.status(400).json({ message: 'Company context required' });

        const policy = await getEffectivePolicyForCompany(companyId);
        res.json(policy);
    } catch (error) {
        res.status(500).json({ message: 'Failed to resolve company policy' });
    }
};

/**
 * GET /api/attendance-policy/defaults
 * Returns the platform-level defaults. Useful for populating the settings UI.
 * All roles.
 */
export const getPlatformDefaults = async (_req: AuthRequest, res: Response) => {
    res.json(PLATFORM_DEFAULT_POLICY);
};

// ─── Shift Policy Overrides ───────────────────────────────────────────────────

/**
 * GET /api/attendance-policy/shifts/:shiftId/override
 */
export const getShiftOverride = async (req: AuthRequest, res: Response) => {
    try {
        const { shiftId } = req.params;
        const override = await prisma.shiftPolicyOverride.findUnique({ where: { shiftId } });
        res.json(override ?? null);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch shift override' });
    }
};

/**
 * PUT /api/attendance-policy/shifts/:shiftId/override
 */
export const upsertShiftOverride = async (req: AuthRequest, res: Response) => {
    try {
        const { shiftId } = req.params;

        // Verify shift belongs to this company
        const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
        if (!shift) return res.status(404).json({ message: 'Shift not found' });
        if (shift.companyId && shift.companyId !== req.user!.companyId && req.user!.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ message: 'Cross-company access blocked' });
        }

        const allowedFields = [
            'graceMinutes', 'halfDayThresholdHours', 'fullDayHours', 'maxWorkHoursPerDay',
            'autoClockOutEnabled', 'autoClockOutBufferMinutes', 'autoClockOutMaxHours',
            'allowBreaks', 'maxBreaksPerDay', 'maxTotalBreakMinutes',
        ];

        const data: Record<string, any> = {};
        for (const field of allowedFields) {
            if (field in req.body) data[field] = req.body[field] ?? null; // allow explicit nulls to clear overrides
        }

        const override = await prisma.shiftPolicyOverride.upsert({
            where: { shiftId },
            update: data,
            create: { shiftId, ...data },
        });

        res.json(override);
    } catch (error) {
        res.status(500).json({ message: 'Failed to save shift override' });
    }
};

/**
 * DELETE /api/attendance-policy/shifts/:shiftId/override
 */
export const deleteShiftOverride = async (req: AuthRequest, res: Response) => {
    try {
        const { shiftId } = req.params;
        await prisma.shiftPolicyOverride.deleteMany({ where: { shiftId } });
        res.json({ message: 'Shift override removed' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete shift override' });
    }
};

// ─── User Policy Overrides ────────────────────────────────────────────────────

/**
 * GET /api/attendance-policy/users/:userId/override
 * ADMIN / HR only.
 */
export const getUserOverride = async (req: AuthRequest, res: Response) => {
    try {
        const { userId } = req.params;
        const override = await prisma.userPolicyOverride.findUnique({ where: { userId } });
        res.json(override ?? null);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch user override' });
    }
};

/**
 * PUT /api/attendance-policy/users/:userId/override
 * ADMIN / HR only.
 */
export const upsertUserOverride = async (req: AuthRequest, res: Response) => {
    try {
        const { userId } = req.params;

        const targetUser = await prisma.user.findUnique({ where: { id: userId } });
        if (!targetUser) return res.status(404).json({ message: 'User not found' });
        if (targetUser.companyId !== req.user!.companyId && req.user!.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ message: 'Cross-company access blocked' });
        }

        const allowedFields = [
            'graceMinutes', 'halfDayThresholdHours', 'fullDayHours', 'maxWorkHoursPerDay',
            'requireGeoFence', 'allowedRadiusMeters',
        ];

        const data: Record<string, any> = {};
        for (const field of allowedFields) {
            if (field in req.body) data[field] = req.body[field] ?? null;
        }

        const override = await prisma.userPolicyOverride.upsert({
            where: { userId },
            update: data,
            create: { userId, ...data },
        });

        res.json(override);
    } catch (error) {
        res.status(500).json({ message: 'Failed to save user override' });
    }
};

/**
 * DELETE /api/attendance-policy/users/:userId/override
 */
export const deleteUserOverride = async (req: AuthRequest, res: Response) => {
    try {
        const { userId } = req.params;
        await prisma.userPolicyOverride.deleteMany({ where: { userId } });
        res.json({ message: 'User override removed' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete user override' });
    }
};
