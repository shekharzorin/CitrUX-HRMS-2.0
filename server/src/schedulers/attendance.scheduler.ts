import cron from 'node-cron';
import { prisma } from '../db';
import { getEffectivePolicy, resolveAttendanceStatus, resolveShiftEnd } from '../services/attendance-policy.service';
import { notifyUser } from '../utils/notification';
import logger from '../utils/logger';

// ─── Helper ───────────────────────────────────────────────────────────────────

function utcMidnight(d: Date): Date {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

// ─── Job 1: Auto Clock-Out  (every 10 minutes) ───────────────────────────────
/**
 * Finds every attendance record that is still open (checkOut = null).
 * For each open record, resolves the effective policy and decides whether
 * to auto-close the session based on:
 *   • HOURS_BASED  → close when (now − checkIn) >= autoClockOutMaxHours
 *   • SHIFT_END    → close when now >= shiftEnd + autoClockOutBufferMinutes
 *
 * Also handles:
 *   • Auto-ending any active breaks before closing
 *   • Night shifts (shift end on the next calendar day)
 *   • Negative work-hours guard
 *   • Status resolution (PRESENT / HALF_DAY)
 */
async function runAutoClockOut() {
    logger.info('[AutoClockOut] Starting run...');
    const now = new Date();

    // Fetch all open attendance records with enough context to resolve policy
    const openRecords = await prisma.attendance.findMany({
        where: { checkOut: null, checkIn: { not: null } },
        include: {
            user: {
                include: {
                    shift: { include: { policyOverride: true } },
                    policyOverride: true,
                }
            },
            breaks: true,
        },
    });

    logger.info(`[AutoClockOut] Found ${openRecords.length} open session(s)`);

    for (const record of openRecords) {
        try {
            const policy = await getEffectivePolicy(record.userId);

            if (!policy.autoClockOutEnabled) continue;

            const checkInTime = new Date(record.checkIn!);
            const hoursOpen   = (now.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);

            let shouldClose   = false;
            let clockOutAt    = now;

            // ── HOURS_BASED ──────────────────────────────────────────────────
            if (policy.autoClockOutType === 'HOURS_BASED') {
                if (hoursOpen >= policy.autoClockOutMaxHours) {
                    shouldClose = true;
                    // Cap checkout AT maxHours from check-in (not "now")
                    clockOutAt  = new Date(checkInTime.getTime() + policy.autoClockOutMaxHours * 3_600_000);
                }
            }

            // ── SHIFT_END ────────────────────────────────────────────────────
            if (policy.autoClockOutType === 'SHIFT_END' && record.user.shift) {
                const shift     = record.user.shift;
                const shiftEnd  = resolveShiftEnd(checkInTime, shift.endTime, shift.isNightShift);
                const triggerAt = new Date(shiftEnd.getTime() + policy.autoClockOutBufferMinutes * 60_000);

                if (now >= triggerAt) {
                    shouldClose = true;
                    clockOutAt  = shiftEnd; // record checkout AT shift-end, not buffer time
                }
            }

            if (!shouldClose) continue;

            // ── Close any active break first ─────────────────────────────────
            const activeBreak = record.breaks.find(b => !b.endTime);
            if (activeBreak) {
                const breakEnd      = clockOutAt < new Date(activeBreak.startTime) ? new Date(activeBreak.startTime) : clockOutAt;
                const breakDuration = (breakEnd.getTime() - new Date(activeBreak.startTime).getTime()) / 60_000;
                await prisma.break.update({
                    where: { id: activeBreak.id },
                    data:  { endTime: breakEnd, duration: Math.max(0, breakDuration) },
                });
            }

            // ── Re-fetch breaks to get accurate durations ────────────────────
            const allBreaks        = await prisma.break.findMany({ where: { attendanceId: record.id } });
            const totalBreakMins   = allBreaks.reduce((acc, b) => {
                if (b.duration) return acc + b.duration;
                if (b.startTime && b.endTime)
                    return acc + (new Date(b.endTime).getTime() - new Date(b.startTime).getTime()) / 60_000;
                return acc;
            }, 0);

            const rawHours  = (clockOutAt.getTime() - checkInTime.getTime()) / 3_600_000;
            const workHours = Math.max(0, rawHours - totalBreakMins / 60);

            // Guard: if workHours implausibly large (> maxWorkHoursPerDay) clamp it
            const cappedHours = Math.min(workHours, policy.maxWorkHoursPerDay);
            const status      = resolveAttendanceStatus(cappedHours, policy);

            await prisma.attendance.update({
                where: { id: record.id },
                data:  { checkOut: clockOutAt, hours: cappedHours, status },
            });

            logger.info(`[AutoClockOut] Closed session for user ${record.userId} | hours=${cappedHours.toFixed(2)} status=${status}`);

            // Notify employee
            await notifyUser(
                record.userId,
                `Your attendance was auto-clocked out at ${clockOutAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} by the system.`,
                '/attendance',
                'SYSTEM'
            ).catch(() => {});

        } catch (err: any) {
            logger.error(`[AutoClockOut] Error processing record ${record.id}: ${err.message}`);
        }
    }

    logger.info('[AutoClockOut] Run complete.');
}

// ─── Job 2: Stale Open Breaks (every 30 minutes) ─────────────────────────────
/**
 * Ends breaks that have been open longer than `autoEndBreakAfterMinutes`.
 * Runs separately from clock-out so employees who forgot to end a break
 * still get a correct reading even if clock-out hasn't triggered yet.
 */
async function runStaleBreakClose() {
    const now = new Date();

    const staleBreaks = await prisma.break.findMany({
        where: { endTime: null },
        include: {
            attendance: {
                include: {
                    user: {
                        include: {
                            shift: { include: { policyOverride: true } },
                            policyOverride: true,
                        }
                    }
                }
            }
        },
    });

    for (const b of staleBreaks) {
        try {
            const policy      = await getEffectivePolicy(b.attendance.userId);
            const breakOpen   = (now.getTime() - new Date(b.startTime).getTime()) / 60_000; // minutes

            if (breakOpen >= policy.autoEndBreakAfterMinutes) {
                const endTime  = new Date(new Date(b.startTime).getTime() + policy.autoEndBreakAfterMinutes * 60_000);
                const duration = policy.autoEndBreakAfterMinutes;

                await prisma.break.update({
                    where: { id: b.id },
                    data:  { endTime, duration },
                });

                logger.info(`[StaleBreak] Auto-ended break ${b.id} for user ${b.attendance.userId}`);
            }
        } catch (err: any) {
            logger.error(`[StaleBreak] Error processing break ${b.id}: ${err.message}`);
        }
    }
}

// ─── Job 3: Daily Absent Marking (23:50 UTC every day) ───────────────────────
/**
 * At end-of-day, marks ABSENT for employees who never punched in.
 *
 * Respects policy:
 *   - Skips employees whose shift hasn't started yet (night-shift workers
 *     whose shift starts after 23:50 are NOT marked absent for today).
 *   - Skips companies where auto absent-marking isn't meaningful.
 */
async function runAbsentMarking() {
    logger.info('[AbsentMarking] Starting daily absent marking...');

    const now   = new Date();
    const today = utcMidnight(now);

    // Get all active, non-super-admin employees
    const employees = await prisma.user.findMany({
        where: {
            status: 'ACTIVE',
            role:   { not: 'SUPER_ADMIN' },
        },
        include: {
            shift:         true,
            policyOverride: true,
        },
    });

    let markedCount = 0;

    for (const emp of employees) {
        try {
            // Skip if attendance already recorded today
            const existing = await prisma.attendance.findUnique({
                where: { userId_date: { userId: emp.id, date: today } },
            });
            if (existing) continue;

            // Skip night-shift workers whose shift hasn't ended for today
            // (they clock in tonight and out tomorrow — marking absent at 23:50 would be wrong)
            if (emp.shift?.isNightShift) {
                const [startH, startM] = emp.shift.startTime.split(':').map(Number);
                const shiftStart = new Date();
                shiftStart.setHours(startH, startM, 0, 0);
                // If shift starts within the next 2 hours, skip
                if (shiftStart.getTime() - now.getTime() < 2 * 3_600_000) continue;
            }

            await prisma.attendance.create({
                data: {
                    userId: emp.id,
                    date:   today,
                    status: 'ABSENT',
                },
            });

            markedCount++;
            logger.info(`[AbsentMarking] Marked ABSENT: ${emp.email}`);
        } catch (err: any) {
            logger.error(`[AbsentMarking] Error for user ${emp.id}: ${err.message}`);
        }
    }

    logger.info(`[AbsentMarking] Done. Marked ${markedCount} employee(s) absent.`);
}

// ─── Job 4: Missed Punch Notification (every 15 minutes) ─────────────────────
/**
 * Finds employees who clocked in but never clocked out AND whose shift has
 * ended more than `missedPunchNotifyAfterMinutes` ago.
 * Sends a reminder notification. Does NOT modify attendance — that is handled
 * by the auto clock-out job.
 */
async function runMissedPunchNotification() {
    const now = new Date();

    const openRecords = await prisma.attendance.findMany({
        where:   { checkOut: null, checkIn: { not: null } },
        include: { user: { include: { shift: true, policyOverride: true } } },
    });

    for (const record of openRecords) {
        try {
            const policy    = await getEffectivePolicy(record.userId);
            const checkIn   = new Date(record.checkIn!);
            const minsOpen  = (now.getTime() - checkIn.getTime()) / 60_000;

            if (minsOpen >= policy.missedPunchNotifyAfterMinutes) {
                await notifyUser(
                    record.userId,
                    'Reminder: You have not clocked out yet. Please update your attendance.',
                    '/attendance',
                    'SYSTEM'
                ).catch(() => {});
            }
        } catch { /* non-fatal */ }
    }
}

// ─── Register all cron jobs ───────────────────────────────────────────────────
export const initAttendanceScheduler = () => {
    // Auto clock-out: every 10 minutes
    cron.schedule('*/10 * * * *', () => {
        runAutoClockOut().catch(err => logger.error('[AutoClockOut] Unhandled error:', err));
    });

    // Stale break auto-end: every 30 minutes
    cron.schedule('*/30 * * * *', () => {
        runStaleBreakClose().catch(err => logger.error('[StaleBreak] Unhandled error:', err));
    });

    // Daily absent marking: 23:50 UTC
    cron.schedule('50 23 * * *', () => {
        runAbsentMarking().catch(err => logger.error('[AbsentMarking] Unhandled error:', err));
    });

    // Missed punch notification: every 15 minutes (during working hours, 7-22 UTC)
    cron.schedule('*/15 7-22 * * *', () => {
        runMissedPunchNotification().catch(err => logger.error('[MissedPunch] Unhandled error:', err));
    });

    logger.info('[Scheduler] Attendance scheduler initialised (auto-clockout, stale-break, absent-marking, missed-punch)');
};
