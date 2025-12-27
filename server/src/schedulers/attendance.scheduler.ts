import cron from 'node-cron';
import { prisma } from '../db';

/**
 * Attendance Scheduler
 * Runs daily at 11:50 PM to mark employees as ABSENT if they haven't punched in.
 */
export const initAttendanceScheduler = () => {
    // Run every day at 23:50 (11:50 PM)
    cron.schedule('50 23 * * *', async () => {
        console.log('[Scheduler] Running Daily Attendance Check...');
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // 1. Get all active employees
            const activeEmployees = await prisma.user.findMany({
                where: {
                    status: 'ACTIVE',
                    role: { not: 'SUPER_ADMIN' } // Usually super admins don't need attendance
                }
            });

            for (const employee of activeEmployees) {
                // 2. Check if there's an attendance record for today
                const attendance = await prisma.attendance.findUnique({
                    where: {
                        userId_date: {
                            userId: employee.id,
                            date: today
                        }
                    }
                });

                // 3. If no record, mark as ABSENT
                if (!attendance) {
                    await prisma.attendance.create({
                        data: {
                            userId: employee.id,
                            date: today,
                            status: 'ABSENT'
                        }
                    });
                    console.log(`[Scheduler] Marked User ${employee.email} as ABSENT for ${today.toDateString()}`);
                }
            }
            console.log('[Scheduler] Daily Attendance Check Completed.');
        } catch (error) {
            console.error('[Scheduler] Error in Attendance Check:', error);
        }
    });
};
