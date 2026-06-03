import { Queue } from 'bullmq';
import { connection } from './index';

// Async work for the Support Desk (Phase 1: AI routing/categorization).
export const supportQueue = new Queue('supportQueue', { connection });

/**
 * Enqueue AI routing for a ticket. Idempotent per ticket (jobId dedupes
 * re-enqueues), bounded retries with backoff. Fire-and-forget from the caller —
 * must never block ticket creation.
 */
export function enqueueAiRoute(ticketId: string, opts: { force?: boolean } = {}) {
    return supportQueue.add(
        'ai-route',
        { ticketId },
        {
            // Auto-categorize on create dedupes by jobId; manual reprocess forces a
            // fresh run (auto id) so a retained failed/old job can't block it.
            ...(opts.force ? {} : { jobId: `ai-route-${ticketId}` }), // BullMQ forbids ':' in custom ids
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
            removeOnComplete: true,
            removeOnFail: 50,
        },
    );
}
