import { Queue } from 'bullmq';
import { connection } from './index';
import logger from '../utils/logger';

export const attendanceQueue = new Queue('attendanceQueue', { connection });
export const payslipQueue = new Queue('payslipQueue', { connection });
export const leaveQueue = new Queue('leaveQueue', { connection });

export async function initSchedulers() {
    logger.info('[Scheduler] Initializing BullMQ repeatable jobs...');

    // Remove existing repeatable jobs if we want to ensure clean state
    const existingAttendanceJobs = await attendanceQueue.getRepeatableJobs();
    for (const job of existingAttendanceJobs) {
        await attendanceQueue.removeRepeatableByKey(job.key);
    }
    const existingLeaveJobs = await leaveQueue.getRepeatableJobs();
    for (const job of existingLeaveJobs) {
        await leaveQueue.removeRepeatableByKey(job.key);
    }
    
    // Auto clock-out: every 10 minutes
    await attendanceQueue.add('auto-clock-out', {}, {
        repeat: { pattern: '*/10 * * * *' }
    });

    // Stale break auto-end: every 30 minutes
    await attendanceQueue.add('stale-break-close', {}, {
        repeat: { pattern: '*/30 * * * *' }
    });

    // Daily absent marking: 23:50 UTC
    await attendanceQueue.add('absent-marking', {}, {
        repeat: { pattern: '50 23 * * *' }
    });

    // Missed punch notification: every 15 minutes (during working hours, 7-22 UTC)
    await attendanceQueue.add('missed-punch-notification', {}, {
        repeat: { pattern: '*/15 7-22 * * *' }
    });

    // System maintenance: archive audit logs older than 90 days (Sundays 02:00 UTC).
    // Migrated from the retired node-cron CronService so the table doesn't grow unbounded.
    await attendanceQueue.add('audit-log-cleanup', {}, {
        repeat: { pattern: '0 2 * * 0' }
    });

    // Monthly leave credit: 00:00 on the 1st of every month. Only credits
    // companies whose admin set Company.leaveAccrualMode = MONTHLY. The worker
    // has a Redis idempotency guard so it cannot double-credit within a month.
    await leaveQueue.add('monthly-leave-credit', {}, {
        repeat: { pattern: '0 0 1 * *' }
    });

    // Annual leave credit: 00:00 on Jan 1. Only credits companies set to
    // Company.leaveAccrualMode = ANNUAL (full daysPerYear).
    await leaveQueue.add('annual-leave-credit', {}, {
        repeat: { pattern: '0 0 1 1 *' }
    });

    // Daily leave-request escalation: 00:00 every day.
    await leaveQueue.add('leave-escalation', {}, {
        repeat: { pattern: '0 0 * * *' }
    });

    // Payslip generation (Runs at 00:00 on the 1st of every month)
    // Here we'd add logic to enqueue a generate-payslip job per user, 
    // but typically we can schedule one master job that fetches users and enqueues individual jobs
    await payslipQueue.add('master-payslip-trigger', {}, {
        repeat: { pattern: '0 0 1 * *' }
    });
    
    logger.info('[Scheduler] BullMQ repeatable jobs scheduled successfully.');
}
