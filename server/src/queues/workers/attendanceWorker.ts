import { Worker, Job } from 'bullmq';
import { connection } from '../index';
import { prisma } from '../../db';
import { getEffectivePolicy, resolveAttendanceStatus, resolveShiftEnd } from '../../services/attendance-policy.service';
import { notifyUser } from '../../utils/notification';
import logger from '../../utils/logger';

function utcMidnight(d: Date): Date {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

async function runAutoClockOut() {
    logger.info('[AutoClockOut] Starting run...');
    const now = new Date();

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

    for (const record of openRecords) {
        try {
            const policy = await getEffectivePolicy(record.userId);
            if (!policy.autoClockOutEnabled) continue;

            const checkInTime = new Date(record.checkIn!);
            const hoursOpen   = (now.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);

            let shouldClose   = false;
            let clockOutAt    = now;

            if (policy.autoClockOutType === 'HOURS_BASED') {
                if (hoursOpen >= policy.autoClockOutMaxHours) {
                    shouldClose = true;
                    clockOutAt  = new Date(checkInTime.getTime() + policy.autoClockOutMaxHours * 3_600_000);
                }
            }

            if (policy.autoClockOutType === 'SHIFT_END' && record.user.shift) {
                const shift     = record.user.shift;
                const shiftEnd  = resolveShiftEnd(checkInTime, shift.endTime, shift.isNightShift);
                const triggerAt = new Date(shiftEnd.getTime() + policy.autoClockOutBufferMinutes * 60_000);

                if (now >= triggerAt) {
                    shouldClose = true;
                    clockOutAt  = shiftEnd;
                }
            }

            if (!shouldClose) continue;

            const activeBreak = record.breaks.find((b: { endTime: Date | null; id: string; startTime: Date; duration: number | null; attendanceId: string }) => !b.endTime);
            if (activeBreak) {
                const breakEnd      = clockOutAt < new Date(activeBreak.startTime) ? new Date(activeBreak.startTime) : clockOutAt;
                const breakDuration = (breakEnd.getTime() - new Date(activeBreak.startTime).getTime()) / 60_000;
                await prisma.break.update({
                    where: { id: activeBreak.id },
                    data:  { endTime: breakEnd, duration: Math.max(0, breakDuration) },
                });
            }

            const allBreaks        = await prisma.break.findMany({ where: { attendanceId: record.id } });
            const totalBreakMins   = allBreaks.reduce((acc: number, b: { duration: number | null; startTime: Date; endTime: Date | null }) => {
                if (b.duration) return acc + b.duration;
                if (b.startTime && b.endTime)
                    return acc + (new Date(b.endTime).getTime() - new Date(b.startTime).getTime()) / 60_000;
                return acc;
            }, 0);

            const rawHours  = (clockOutAt.getTime() - checkInTime.getTime()) / 3_600_000;
            const workHours = Math.max(0, rawHours - totalBreakMins / 60);

            const cappedHours = Math.min(workHours, policy.maxWorkHoursPerDay);
            const status      = resolveAttendanceStatus(cappedHours, policy);

            await prisma.attendance.update({
                where: { id: record.id },
                data:  { checkOut: clockOutAt, hours: cappedHours, status },
            });

            logger.info(`[AutoClockOut] Closed session for user ${record.userId}`);
            await notifyUser(record.userId, `Your attendance was auto-clocked out at ${clockOutAt.toLocaleTimeString()} by the system.`, '/attendance', 'SYSTEM').catch(() => {});

        } catch (err: any) {
            logger.error(`[AutoClockOut] Error processing record ${record.id}: ${err.message}`);
        }
    }
}

async function runStaleBreakClose() {
    const now = new Date();
    const staleBreaks = await prisma.break.findMany({
        where: { endTime: null },
        include: { attendance: { include: { user: { include: { shift: { include: { policyOverride: true } }, policyOverride: true } } } } },
    });

    for (const b of staleBreaks) {
        try {
            const policy      = await getEffectivePolicy(b.attendance.userId);
            const breakOpen   = (now.getTime() - new Date(b.startTime).getTime()) / 60_000;
            if (breakOpen >= policy.autoEndBreakAfterMinutes) {
                const endTime  = new Date(new Date(b.startTime).getTime() + policy.autoEndBreakAfterMinutes * 60_000);
                await prisma.break.update({
                    where: { id: b.id },
                    data:  { endTime, duration: policy.autoEndBreakAfterMinutes },
                });
            }
        } catch (err: any) {
            logger.error(`[StaleBreak] Error processing break ${b.id}: ${err.message}`);
        }
    }
}

async function runAbsentMarking() {
    const now   = new Date();
    const today = utcMidnight(now);
    const employees = await prisma.user.findMany({
        where: { status: 'ACTIVE', role: { not: 'SUPER_ADMIN' } },
        include: { shift: true, policyOverride: true },
    });

    for (const emp of employees) {
        try {
            const existing = await prisma.attendance.findUnique({
                where: { userId_date: { userId: emp.id, date: today } },
            });
            if (existing) continue;

            if (emp.shift?.isNightShift) {
                const [startH, startM] = emp.shift.startTime.split(':').map(Number);
                const shiftStart = new Date();
                shiftStart.setHours(startH, startM, 0, 0);
                if (shiftStart.getTime() - now.getTime() < 2 * 3_600_000) continue;
            }

            await prisma.attendance.create({
                data: { userId: emp.id, date: today, status: 'ABSENT' },
            });
        } catch (err: any) {
            logger.error(`[AbsentMarking] Error for user ${emp.id}: ${err.message}`);
        }
    }
}

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
        } catch {}
    }
}

// System maintenance: archive audit logs older than 90 days so the table
// doesn't grow unbounded. Migrated from the retired node-cron CronService.
async function runAuditLogCleanup() {
    logger.info('[AuditLogCleanup] Starting run...');
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const deleted = await prisma.auditLog.deleteMany({
        where: { createdAt: { lt: ninetyDaysAgo } }
    });
    logger.info(`[AuditLogCleanup] Archived ${deleted.count} old audit logs.`);
}

export const attendanceWorker = new Worker('attendanceQueue', async (job: Job) => {
    logger.info(`[AttendanceWorker] Processing job ${job.name}`);
    switch (job.name) {
        case 'auto-clock-out':
            await runAutoClockOut();
            break;
        case 'stale-break-close':
            await runStaleBreakClose();
            break;
        case 'absent-marking':
            await runAbsentMarking();
            break;
        case 'missed-punch-notification':
            await runMissedPunchNotification();
            break;
        case 'audit-log-cleanup':
            await runAuditLogCleanup();
            break;
        default:
            logger.warn(`[AttendanceWorker] Unknown job name: ${job.name}`);
    }
}, { connection, lockDuration: 30000 }); // lockDuration ensures only one instance processes this

attendanceWorker.on('failed', (job, err) => {
    logger.error(`[AttendanceWorker] Job ${job?.id} failed: ${err.message}`);
});
