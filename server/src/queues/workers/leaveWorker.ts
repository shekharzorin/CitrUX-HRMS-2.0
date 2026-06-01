import { Worker, Job } from 'bullmq';
import { connection, cacheConnection } from '../index';
import { prisma } from '../../db';
import { sendEmail, escalationTemplate } from '../../utils/email.util';
import { notifyUser, notifyRole } from '../../utils/notification';
import logger from '../../utils/logger';

/**
 * Credits leave balances for companies whose admin opted into the given accrual
 * mode (set per-company via Company.leaveAccrualMode). Companies left on the
 * default MANUAL mode are never auto-credited.
 *
 *   MONTHLY → credit daysPerYear/12 each month
 *   ANNUAL  → credit the full daysPerYear once a year (Jan 1)
 *
 * A Redis guard makes each run idempotent for its period so a retry or a second
 * instance cannot double-credit.
 */
export async function creditLeaveForMode(mode: 'MONTHLY' | 'ANNUAL') {
    const now = new Date();
    const period = mode === 'MONTHLY'
        ? `${now.getUTCFullYear()}-${now.getUTCMonth() + 1}`
        : `${now.getUTCFullYear()}`;
    const guardKey = `leave-credit:${mode}:${period}`;
    // SET NX EX — only the first run for this period proceeds.
    const acquired = await cacheConnection.set(guardKey, '1', 'EX', 60 * 60 * 24 * 40, 'NX');
    if (acquired !== 'OK') {
        logger.info(`[LeaveCredit] Already credited for ${guardKey}, skipping.`);
        return;
    }

    try {
        const companies = await prisma.company.findMany({
            where: { leaveAccrualMode: mode },
            select: { id: true },
        });
        if (companies.length === 0) {
            logger.info(`[LeaveCredit] No companies on ${mode} accrual.`);
            return;
        }
        const companyIds = companies.map((c) => c.id);
        const fraction = mode === 'MONTHLY' ? 1 / 12 : 1;

        const leaveTypes = await prisma.leaveType.findMany({ where: { companyId: { in: companyIds } } });
        const employees = await prisma.user.findMany({
            where: { status: 'ACTIVE', companyId: { in: companyIds } },
            select: { id: true, companyId: true },
        });

        let credited = 0;
        for (const employee of employees) {
            const types = leaveTypes.filter((lt) => lt.companyId === employee.companyId);
            for (const leaveType of types) {
                const amount = leaveType.daysPerYear * fraction;
                await prisma.leaveBalance.upsert({
                    where: { userId_leaveTypeId: { userId: employee.id, leaveTypeId: leaveType.id } },
                    update: { balance: { increment: amount } },
                    create: { userId: employee.id, leaveTypeId: leaveType.id, balance: amount },
                });
                credited++;
            }
        }
        logger.info(`[LeaveCredit] ${mode} credit completed for ${companyIds.length} company(ies), ${credited} balance update(s).`);
    } catch (error) {
        // Release the guard so the next scheduled run can retry.
        await cacheConnection.del(guardKey);
        throw error;
    }
}

/**
 * Daily Leave Escalation — escalates leave requests pending > 3 days to the
 * manager's manager (Level 2), or to HR/ADMIN if there's no Level 2.
 */
export async function runLeaveEscalation() {
    logger.info('[LeaveEscalation] Running Leave Escalation Check...');
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const staleRequests = await prisma.leaveRequest.findMany({
        where: { status: 'PENDING', createdAt: { lt: threeDaysAgo } },
        include: {
            user: {
                include: {
                    profile: true,
                    manager: { include: { manager: true } },
                },
            },
            leaveType: true,
        },
    });

    if (staleRequests.length === 0) {
        logger.info('[LeaveEscalation] No stale requests found.');
        return;
    }

    logger.info(`[LeaveEscalation] Found ${staleRequests.length} stale request(s). Escalating...`);

    for (const req of staleRequests) {
        try {
            const employeeName = req.user.profile
                ? `${req.user.profile.firstName} ${req.user.profile.lastName}`
                : 'Employee';
            const days = req.days;
            const reason = req.reason || '';
            const manager = (req.user as any).manager;

            if (manager && manager.managerId) {
                const level2Manager = manager.manager;
                if (level2Manager && level2Manager.email) {
                    await notifyUser(
                        level2Manager.id,
                        `ESCALATION: Leave Request from ${employeeName} pending > 3 days.`,
                        '/manager/leaves',
                        'TASK'
                    );
                    await sendEmail(
                        level2Manager.email,
                        `Escalation: Action Required for ${employeeName}`,
                        escalationTemplate(employeeName, days, reason, 'Level 2 (Reporting Manager unavailable)')
                    ).catch((e) => logger.error('[LeaveEscalation] Failed Level 2 email', e));
                }
            } else {
                await notifyRole(
                    ['HR', 'ADMIN'] as any,
                    `ESCALATION: Leave Request from ${employeeName} pending > 3 days (No Level 2 Manager).`,
                    '/manager/leaves',
                    'TASK'
                );
                const admins = await prisma.user.findMany({
                    where: { role: { in: ['HR', 'ADMIN'] } },
                    select: { email: true },
                });
                for (const admin of admins) {
                    if (admin.email) {
                        sendEmail(
                            admin.email,
                            `Escalation: Action Required for ${employeeName}`,
                            escalationTemplate(employeeName, days, reason, 'HR/Admin (Final Escalation)')
                        ).catch((e) => logger.error('[LeaveEscalation] Failed Admin escalation email', e));
                    }
                }
            }
        } catch (err: any) {
            logger.error(`[LeaveEscalation] Error processing request ${req.id}: ${err.message}`);
        }
    }
}

export const leaveWorker = new Worker(
    'leaveQueue',
    async (job: Job) => {
        logger.info(`[LeaveWorker] Processing job ${job.name}`);
        switch (job.name) {
            case 'monthly-leave-credit':
                await creditLeaveForMode('MONTHLY');
                break;
            case 'annual-leave-credit':
                await creditLeaveForMode('ANNUAL');
                break;
            case 'leave-escalation':
                await runLeaveEscalation();
                break;
            default:
                logger.warn(`[LeaveWorker] Unknown job name: ${job.name}`);
        }
    },
    { connection, lockDuration: 60000 }
);

leaveWorker.on('failed', (job, err) => {
    logger.error(`[LeaveWorker] Job ${job?.id} failed: ${err.message}`);
});
