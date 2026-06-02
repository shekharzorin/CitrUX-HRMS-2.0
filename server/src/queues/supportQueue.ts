import { Queue } from 'bullmq';
import { connection } from './index';

// Async work for the Support Desk (Phase 1: AI routing/categorization).
export const supportQueue = new Queue('supportQueue', { connection });

/**
 * Enqueue AI routing for a ticket. Idempotent per ticket (jobId dedupes
 * re-enqueues), bounded retries with backoff. Fire-and-forget from the caller —
 * must never block ticket creation.
 */
export function enqueueAiRoute(ticketId: string) {
    return supportQueue.add(
        'ai-route',
        { ticketId },
        {
            jobId: `ai-route-${ticketId}`, // BullMQ forbids ':' in custom job ids
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
            removeOnComplete: true,
            removeOnFail: 50,
        },
    );
}
