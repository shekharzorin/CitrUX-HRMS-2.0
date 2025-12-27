import cron from 'node-cron';
import { prisma } from '../db';

/**
 * Leave Scheduler
 * Runs on the 1st of every month at midnight to credit monthly leave balances.
 */
export const initLeaveScheduler = () => {
    // Run at 00:00 on day 1 of every month
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
};
