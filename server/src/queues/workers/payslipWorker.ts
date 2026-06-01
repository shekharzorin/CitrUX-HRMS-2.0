import { Worker, Job } from 'bullmq';
import { connection } from '../index';
import logger from '../../utils/logger';
import { PayrollService } from '../../services/payroll.service';
import { NotificationService } from '../../services/notification.service';
import { prisma } from '../../db';
import { payslipQueue } from '../scheduler';

export const payslipWorker = new Worker('payslipQueue', async (job: Job) => {
    logger.info(`[PayslipWorker] Processing job ${job.name}`);
    
    if (job.name === 'master-payslip-trigger') {
        const today = new Date();
        const prevMonth = today.getMonth() === 0 ? 12 : today.getMonth();
        const year = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();
        
        const employees = await prisma.user.findMany({
            where: { status: 'ACTIVE', role: { not: 'SUPER_ADMIN' } }
        });
        
        for (const emp of employees) {
            await payslipQueue.add('generate-payslip', { userId: emp.id, month: prevMonth, year });
        }
        logger.info(`[PayslipWorker] Enqueued ${employees.length} payslip generation jobs for ${prevMonth}/${year}`);
    } else if (job.name === 'generate-payslip') {
        const { userId, month, year } = job.data;
        try {
            await PayrollService.generatePayslip(userId, month, year);
            await NotificationService.notify(userId, `Your payslip for ${month}/${year} is ready.`, 'INFO', '/payroll');
            logger.info(`[PayslipWorker] Generated payslip for ${userId} (${month}/${year})`);
        } catch (error: any) {
            logger.error(`[PayslipWorker] Failed to generate payslip for ${userId}: ${error.message}`);
            throw error;
        }
    }
}, { connection, lockDuration: 30000 });

payslipWorker.on('failed', (job, err) => {
    logger.error(`[PayslipWorker] Job ${job?.id} failed: ${err.message}`);
});
