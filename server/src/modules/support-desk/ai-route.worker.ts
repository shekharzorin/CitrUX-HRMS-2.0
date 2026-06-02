import { Worker, Job } from 'bullmq';
import { connection } from '../../queues/index';
import { runAiRoute } from './ai-routing.service';
import logger from '../../utils/logger';

// Consumes supportQueue 'ai-route' jobs. Imported by index.ts to instantiate.
export const aiRouteWorker = new Worker(
    'supportQueue',
    async (job: Job) => {
        if (job.name === 'ai-route') await runAiRoute(job.data.ticketId);
        else logger.warn(`[AiRouteWorker] unknown job: ${job.name}`);
    },
    // Dedicated blocking connection (BullMQ requirement — workers must not share
    // the connection used by queues/other workers for BRPOPLPUSH).
    { connection: connection.duplicate(), lockDuration: 60000 },
);

aiRouteWorker.on('ready', () => logger.info('[AiRouteWorker] ready'));

aiRouteWorker.on('failed', (job, err) => {
    logger.error(`[AiRouteWorker] job ${job?.id} failed: ${err.message}`);
});
