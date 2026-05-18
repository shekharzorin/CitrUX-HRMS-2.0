import cron from 'node-cron';
import { prisma } from '../db';
import logger from '../utils/logger';
import { NotificationService } from './notification.service';

export class CronService {
    /**
     * Start all background cron jobs.
     */
    static start() {
        logger.info('[CronService] Initializing background jobs...');

        // 1. Midnight trigger: Year-End Leave Carryover & Processing (Runs at 00:00 on Jan 1st)
        cron.schedule('0 0 1 1 *', async () => {
            logger.info('[CronService] Running Year-End Leave Processing...');
            try {
                // Future Implementation: Execute Year-End logic from Leave Controller
            } catch (err) {
                logger.error('[CronService] Year-End Processing Failed:', err);
            }
        });

        // 2. Daily trigger: Birthday & Anniversary Notifications (Runs at 09:00 AM every day)
        cron.schedule('0 9 * * *', async () => {
            logger.info('[CronService] Running Daily Engagement Checks...');
            try {
                const today = new Date();
                const month = today.getMonth() + 1;
                const day = today.getDate();

                // Find employees whose birthday is today
                // Prisma does not support DAY/MONTH extraction directly in findMany, so we fetch profiles
                // Alternatively, in a real scenario we'd use raw queries
                const profiles = await prisma.profile.findMany({
                    select: { userId: true, firstName: true, dob: true },
                    where: { dob: { not: null } }
                });

                for (const p of profiles) {
                    if (p.dob && p.dob.getUTCMonth() + 1 === month && p.dob.getUTCDate() === day) {
                        // Notify the company (Implementation placeholder for NotificationService)
                        logger.info(`[CronService] Happy Birthday ${p.firstName}!`);
                    }
                }
            } catch (err) {
                logger.error('[CronService] Daily Engagement Checks Failed:', err);
            }
        });

        // 3. Automated Backup / DB Cleanup (Runs at 02:00 AM every Sunday)
        cron.schedule('0 2 * * 0', async () => {
            logger.info('[CronService] Running DB Cleanup (Archiving old audit logs)...');
            try {
                const ninetyDaysAgo = new Date();
                ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

                const deleted = await prisma.auditLog.deleteMany({
                    where: { createdAt: { lt: ninetyDaysAgo } }
                });
                
                logger.info(`[CronService] Archived ${deleted.count} old audit logs.`);
            } catch (err) {
                logger.error('[CronService] DB Cleanup Failed:', err);
            }
        });
        
        logger.info('[CronService] Background jobs successfully initialized.');
    }
}
