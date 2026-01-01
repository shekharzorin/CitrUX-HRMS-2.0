import cron from 'node-cron';
import { prisma } from '../db';
import { sendEmail, escalationTemplate } from '../utils/email.util';
import { notifyUser, notifyRole } from '../utils/notification';

/**
 * Leave Scheduler
 * Runs on the 1st of every month at midnight to credit monthly leave balances.
 */
export const initLeaveScheduler = () => {
    // 1. Monthly Leave Credit (Day 1 of Month)
    cron.schedule('0 0 1 * *', async () => {
        console.log('[Scheduler] Running Monthly Leave Credit...');
        try {
            const leaveTypes = await prisma.leaveType.findMany();
            const activeEmployees = await prisma.user.findMany({
                where: { status: 'ACTIVE' }
            });

            for (const employee of activeEmployees) {
                for (const leaveType of leaveTypes) {
                    const monthlyCredit = leaveType.daysPerYear / 12;

                    // Upsert leave balance
                    await prisma.leaveBalance.upsert({
                        where: {
                            userId_leaveTypeId: {
                                userId: employee.id,
                                leaveTypeId: leaveType.id
                            }
                        },
                        update: {
                            balance: { increment: monthlyCredit }
                        },
                        create: {
                            userId: employee.id,
                            leaveTypeId: leaveType.id,
                            balance: monthlyCredit
                        }
                    });
                }
            }
            console.log('[Scheduler] Monthly Leave Credit Completed.');
        } catch (error) {
            console.error('[Scheduler] Error in Leave Credit:', error);
        }
    });

    // 2. Daily Leave Escalation (Every Midnight)
    cron.schedule('0 0 * * *', async () => {
        console.log('[Scheduler] Running Leave Escalation Check...');
        try {
            const threeDaysAgo = new Date();
            threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

            // Find requests pending > 3 days
            // @ts-ignore
            const staleRequests = await prisma.leaveRequest.findMany({
                where: {
                    status: 'PENDING',
                    createdAt: { lt: threeDaysAgo }
                },
                include: {
                    user: {
                        include: {
                            profile: true,
                            manager: { include: { manager: true } } // Get Manager's Manager (Level 2)
                        }
                    },
                    leaveType: true
                }
            });

            if (staleRequests.length === 0) {
                console.log('[Scheduler] No stale requests found.');
                return;
            }

            console.log(`[Scheduler] Found ${staleRequests.length} stale requests. Escalating...`);

            for (const req of staleRequests) {
                const employeeName = req.user.profile ? `${req.user.profile.firstName} ${req.user.profile.lastName}` : 'Employee';
                const days = req.days;
                const reason = req.reason;
                // @ts-ignore
                const manager = req.user.manager;

                // Level 1: Manager (Already notified on apply)
                // Level 2: Manager's Manager
                if (manager && manager.managerId) {
                    // Escalate to Level 2
                    const level2Manager = manager.manager;
                    if (level2Manager && level2Manager.email) {
                        const msg = `ESCALATION: Leave Request from ${employeeName} pending > 3 days.`;
                        await notifyUser(level2Manager.id, msg);
                        await sendEmail(
                            level2Manager.email,
                            `Escalation: Action Required for ${employeeName}`,
                            escalationTemplate(employeeName, days, reason, 'Level 2 (Reporting Manager unavailable)')
                        ).catch(e => console.error('Failed Level 2 email', e));
                    }
                } else {
                    // No Level 2 -> Escalate to HR/Admin
                    const msg = `ESCALATION: Leave Request from ${employeeName} pending > 3 days (No Level 2 Manager).`;
                    await notifyRole(['HR', 'ADMIN'], msg);
                    // Note: Emailing all admins could be spammy, but strictly per requirement
                    // finding admins again... or reuse utility if we extract it.
                    // For now, simpler to just rely on in-app for Admins or re-fetch.
                    // @ts-ignore
                    const admins = await prisma.user.findMany({
                        where: { role: { in: ['HR', 'ADMIN'] } },
                        select: { email: true }
                    });

                    for (const admin of admins) {
                        if (admin.email) {
                            sendEmail(
                                admin.email,
                                `Escalation: Action Required for ${employeeName}`,
                                escalationTemplate(employeeName, days, reason, 'HR/Admin (Final Escalation)')
                            ).catch(e => console.error('Failed Admin escalation email', e));
                        }
                    }
                }
            }

        } catch (error) {
            console.error('[Scheduler] Error in Escalation:', error);
        }
    });
};
