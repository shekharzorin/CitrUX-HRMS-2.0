import { prisma } from '../db';

// ─── Platform-level defaults (the absolute fallback) ─────────────────────────
export const PLATFORM_DEFAULT_POLICY = {
    // General
    graceMinutes:                  10,
    halfDayThresholdHours:         4.0,
    fullDayHours:                  8.0,
    maxWorkHoursPerDay:            12.0,
    allowMultipleSessions:         false,

    // Auto Clock-Out
    autoClockOutEnabled:           true,
    autoClockOutType:              'SHIFT_END' as 'SHIFT_END' | 'HOURS_BASED',
    autoClockOutBufferMinutes:     30,
    autoClockOutMaxHours:          12.0,

    // Break Policy
    allowBreaks:                   true,
    maxBreaksPerDay:               3,
    maxTotalBreakMinutes:          60,
    autoEndBreakOnCheckout:        true,
    autoEndBreakAfterMinutes:      60,

    // Missed Punch
    missedPunchAutoResolve:        false,
    missedPunchAction:             'MARK_ABSENT' as 'AUTO_CHECKOUT' | 'MARK_HALF_DAY' | 'MARK_ABSENT',
    missedPunchNotifyAfterMinutes: 60,

    // Late & Penalty
    markLateAfterMinutes:          15,
    lateCountThresholdForHalfDay:  3,
    absentIfNoPunchInAfterHours:   6.0,

    // Approval
    allowEmployeeAdjustment:       true,
    maxPastDaysForAdjustment:      7,
    requireApproval:               true,

    // Security
    requireGeoFence:               false,
    allowedRadiusMeters:           100,
};

export type EffectivePolicy = typeof PLATFORM_DEFAULT_POLICY;

// Strip null/undefined keys from a DB record so they don't wipe real values on merge
function stripNulls(obj: Record<string, any>): Partial<EffectivePolicy> {
    return Object.fromEntries(
        Object.entries(obj).filter(([, v]) => v !== null && v !== undefined)
    ) as Partial<EffectivePolicy>;
}

/**
 * getEffectivePolicy
 *
 * Priority (highest wins):
 *   UserPolicyOverride → ShiftPolicyOverride → CompanyAttendancePolicy → PLATFORM_DEFAULT
 *
 * Result is a fully-resolved flat policy object — callers never need to know
 * which layer provided a value.
 */
export async function getEffectivePolicy(userId: string): Promise<EffectivePolicy> {
    // Single query: user + shift + shift override + company policy + user override
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            shift: {
                include: { policyOverride: true }
            },
            policyOverride: true,
        }
    });

    // Layer 1: platform defaults
    let policy: EffectivePolicy = { ...PLATFORM_DEFAULT_POLICY };

    // Layer 2: company policy
    if (user?.companyId) {
        const companyPolicy = await prisma.attendancePolicy.findUnique({
            where: { companyId: user.companyId }
        });
        if (companyPolicy) {
            const { id, companyId, createdAt, updatedAt, ...fields } = companyPolicy as any;
            policy = { ...policy, ...stripNulls(fields) };
        }
    }

    // Layer 3: shift-level overrides
    if (user?.shift?.policyOverride) {
        const { id, shiftId, updatedAt, ...fields } = user.shift.policyOverride as any;
        policy = { ...policy, ...stripNulls(fields) };
    }

    // Layer 4: user-level overrides (most granular)
    if (user?.policyOverride) {
        const { id, userId: _uid, updatedAt, ...fields } = user.policyOverride as any;
        policy = { ...policy, ...stripNulls(fields) };
    }

    return policy;
}

/**
 * getEffectivePolicyForCompany
 * Used by admin-facing endpoints — resolves company policy merged over platform defaults.
 */
export async function getEffectivePolicyForCompany(companyId: string): Promise<EffectivePolicy> {
    let policy: EffectivePolicy = { ...PLATFORM_DEFAULT_POLICY };

    const companyPolicy = await prisma.attendancePolicy.findUnique({
        where: { companyId }
    });
    if (companyPolicy) {
        const { id, companyId: _cid, createdAt, updatedAt, ...fields } = companyPolicy as any;
        policy = { ...policy, ...stripNulls(fields) };
    }

    return policy;
}

/**
 * Determine the status of a completed attendance record based on hours worked and policy.
 */
export function resolveAttendanceStatus(
    workHours: number,
    policy: EffectivePolicy
): 'PRESENT' | 'HALF_DAY' | 'ABSENT' {
    if (workHours >= policy.halfDayThresholdHours) return 'PRESENT';
    if (workHours > 0) return 'HALF_DAY';
    return 'ABSENT';
}

/**
 * Compute shift-end DateTime for a given check-in time, accounting for night shifts.
 */
export function resolveShiftEnd(
    checkInTime: Date,
    shiftEndTime: string,   // "HH:MM"
    isNightShift: boolean
): Date {
    const [endHour, endMin] = shiftEndTime.split(':').map(Number);
    const shiftEnd = new Date(checkInTime);
    shiftEnd.setHours(endHour, endMin, 0, 0);

    // If night shift and end is earlier than check-in clock time → end is next day
    if (isNightShift && shiftEnd <= checkInTime) {
        shiftEnd.setDate(shiftEnd.getDate() + 1);
    }

    return shiftEnd;
}
